#!/usr/bin/env bash
set -euo pipefail

# virtiofs-npm-install — Dual-Platform npm Setup for Docker Sandbox
#
# Solves native binary crashes (esbuild, rollup, lightningcss, etc.) when
# a Docker sandbox mounts the workspace via virtiofs. Injects the sandbox's
# platform packages into the host's existing node_modules so both platforms
# coexist — neither side needs to reinstall.
#
# Usage:
#   bash install.sh [--playwright]
#
# Requirements:
#   - node_modules must already exist (run `npm install` on host first)
#   - Must be run from the project root (or pass --workspace <path>)
#
# How it works:
#   1. Detects sandbox architecture (arm64/x64)
#   2. Installs deps in a temp dir on native ext4 (--ignore-scripts)
#   3. Auto-discovers platform-specific packages and copies them into workspace
#   4. Copies the esbuild binary to ext4 (only Go binaries crash on virtiofs)
#   5. Sets ESBUILD_BINARY_PATH so esbuild uses the ext4 copy
#
# Why only esbuild needs special handling:
#   Rust/napi binaries (rollup, lightningcss, tailwind oxide) work fine on
#   virtiofs. Only esbuild's Go binary crashes (SIGILL in mmap'd memory).
#   The ESBUILD_BINARY_PATH env var tells esbuild to use a different binary.

# --- Configuration ---
SANDBOX_HOME="${SANDBOX_HOME:-/home/agent}"
ESBUILD_BIN_DIR="$SANDBOX_HOME/esbuild-bin-dir"
TEMP_DIR="$SANDBOX_HOME/virtiofs-npm-temp"

# --- Parse arguments ---
INSTALL_PLAYWRIGHT=false
WS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --playwright) INSTALL_PLAYWRIGHT=true; shift ;;
    --workspace)  WS="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Auto-detect workspace from git root or current directory
if [ -z "$WS" ]; then
  WS="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

# Detect sandbox architecture
ARCH="$(uname -m)"
case "$ARCH" in
  aarch64|arm64) PLATFORM_PATTERN="linux*arm64" ;;
  x86_64)        PLATFORM_PATTERN="linux*x64"   ;;
  *)             PLATFORM_PATTERN="linux*$ARCH"  ;;
esac

echo "=== virtiofs-npm-install ==="
echo "Workspace: $WS"
echo "Platform:  linux-$ARCH"
echo ""

# --- Step 1: Validate workspace ---
if [ ! -d "$WS/node_modules" ] && [ ! -L "$WS/node_modules" ]; then
  echo "✗ No node_modules found. Run 'npm install' on your host machine first."
  exit 1
fi

# If node_modules is a symlink (e.g. from a previous approach), restore it
if [ -L "$WS/node_modules" ]; then
  LINK_TARGET=$(readlink "$WS/node_modules")
  echo "→ Converting symlinked node_modules to real directory..."
  rm "$WS/node_modules"
  cp -a "$LINK_TARGET" "$WS/node_modules"
fi

# --- Step 2: Install platform packages to temp dir on ext4 ---
echo "→ Installing platform packages on native filesystem..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy lockfile for deterministic install; fall back to package.json only
cp "$WS/package.json" "$TEMP_DIR/"
for lockfile in package-lock.json yarn.lock pnpm-lock.yaml; do
  [ -f "$WS/$lockfile" ] && cp "$WS/$lockfile" "$TEMP_DIR/"
done

cd "$TEMP_DIR"
npm ci --ignore-scripts 2>/dev/null

# --- Step 3: Auto-discover and copy platform packages ---
echo "→ Discovering platform-specific packages..."
COPIED=0
while IFS= read -r pkg; do
  if [ ! -d "$WS/node_modules/$pkg" ]; then
    mkdir -p "$WS/node_modules/$(dirname "$pkg")"
    cp -a "$TEMP_DIR/node_modules/$pkg" "$WS/node_modules/$pkg"
    echo "  + $pkg"
    COPIED=$((COPIED + 1))
  fi
done < <(find "$TEMP_DIR/node_modules" -maxdepth 3 -name "package.json" -path "*${PLATFORM_PATTERN}*" -exec dirname {} \; | sed "s|$TEMP_DIR/node_modules/||")

echo "→ $COPIED platform package(s) added"

# --- Step 4: Copy esbuild binary to ext4 ---
# esbuild's Go binary is the only one that crashes on virtiofs (SIGILL).
# ESBUILD_BINARY_PATH env var tells esbuild to use this copy instead.
ESBUILD_SRC=$(find "$WS/node_modules/@esbuild" -name "esbuild" -type f -executable 2>/dev/null | head -1)
if [ -n "$ESBUILD_SRC" ]; then
  echo "→ Copying esbuild binary to ext4..."
  mkdir -p "$ESBUILD_BIN_DIR"
  cp "$ESBUILD_SRC" "$ESBUILD_BIN_DIR/esbuild.tmp"
  chmod +x "$ESBUILD_BIN_DIR/esbuild.tmp"
  mv -f "$ESBUILD_BIN_DIR/esbuild.tmp" "$ESBUILD_BIN_DIR/esbuild"

  export ESBUILD_BINARY_PATH="$ESBUILD_BIN_DIR/esbuild"
  grep -q "ESBUILD_BINARY_PATH" ~/.bashrc 2>/dev/null || \
    echo "export ESBUILD_BINARY_PATH=$ESBUILD_BIN_DIR/esbuild" >> ~/.bashrc
  echo "  ESBUILD_BINARY_PATH=$ESBUILD_BIN_DIR/esbuild"
else
  echo "→ esbuild not found in node_modules (skipping — not all projects use it)"
fi

# --- Step 5: Verify key binaries ---
echo "→ Verifying native binaries..."
cd "$WS"
FAIL=0
for mod in esbuild rollup vite; do
  if [ -d "$WS/node_modules/$mod" ]; then
    node -e "
      const m = require.resolve('$mod', { paths: ['$WS/node_modules'] });
      const p = /esbuild/.test('$mod')
        ? require('$mod').transform('const x:number=1',{loader:'ts'})
        : import('$mod');
      p.then(() => console.log('  ✓ $mod OK'))
       .catch(e => { console.log('  ✗ $mod FAIL:', e.message); process.exit(1); });
    " || FAIL=1
  fi
done
# lightningcss uses require, not import
if [ -d "$WS/node_modules/lightningcss" ]; then
  node -e "try{require('lightningcss');console.log('  ✓ lightningcss OK')}catch(e){console.log('  ✗ lightningcss FAIL:',e.message);process.exit(1)}" || FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "✗ Binary verification failed. Try running the script again."
  exit 1
fi

# --- Step 6: Clean up ---
rm -rf "$TEMP_DIR"

# --- Step 7: Optionally install Playwright ---
if [ "$INSTALL_PLAYWRIGHT" = true ]; then
  echo "→ Installing Playwright browsers..."
  npx playwright install --with-deps chromium
fi

echo ""
echo "=== ✓ Setup complete ==="
echo ""
echo "All commands run from: $WS"
[ -n "${ESBUILD_BINARY_PATH:-}" ] && echo "ESBUILD_BINARY_PATH=$ESBUILD_BINARY_PATH"
echo ""
echo "Host node_modules preserved — no reinstall needed on either side."
