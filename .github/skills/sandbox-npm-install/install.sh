#!/usr/bin/env bash
set -euo pipefail

# Sandbox npm Install Script — Dual-Platform Approach
#
# Injects Linux ARM64 platform packages into the user's existing node_modules
# and copies the esbuild binary to ext4 (to avoid virtiofs SIGILL crash).
# The user's macOS packages are preserved — both platforms coexist.
#
# Only esbuild's Go binary crashes on virtiofs; rollup and lightningcss (Rust) work fine.
# ESBUILD_BINARY_PATH env var tells esbuild to use the ext4 copy instead.

WS="/Users/geektrainer/repos/vatsim-flight-scheduler"
ESBUILD_BIN_DIR="/home/agent/esbuild-bin-dir"
TEMP_DIR="/home/agent/linux-deps-temp"
INSTALL_PLAYWRIGHT="${1:-false}"

echo "=== Sandbox npm Install (Dual-Platform) ==="

# Step 1: Ensure workspace has node_modules
if [ ! -d "$WS/node_modules" ] && [ ! -L "$WS/node_modules" ]; then
  echo "✗ No node_modules found. Run 'npm install' on your local machine first."
  exit 1
fi

# If node_modules is a symlink from a previous mirror approach, restore it
if [ -L "$WS/node_modules" ]; then
  LINK_TARGET=$(readlink "$WS/node_modules")
  echo "→ Found symlinked node_modules → $LINK_TARGET"
  echo "→ Converting symlink to real directory..."
  rm "$WS/node_modules"
  cp -a "$LINK_TARGET" "$WS/node_modules"
fi

# Step 2: Install Linux platform packages to a temp dir, then copy into workspace
echo "→ Installing Linux ARM64 platform packages..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
cp "$WS/package.json" "$WS/package-lock.json" "$TEMP_DIR/"
cd "$TEMP_DIR"
npm ci --ignore-scripts 2>/dev/null

# Auto-discover and copy Linux ARM64 platform packages not in workspace
COPIED=0
while IFS= read -r pkg; do
  if [ ! -d "$WS/node_modules/$pkg" ]; then
    # Ensure parent scope directory exists for scoped packages (@org/pkg)
    mkdir -p "$WS/node_modules/$(dirname "$pkg")"
    cp -a "$TEMP_DIR/node_modules/$pkg" "$WS/node_modules/$pkg"
    echo "  + $pkg"
    COPIED=$((COPIED + 1))
  fi
done < <(find "$TEMP_DIR/node_modules" -maxdepth 3 -name "package.json" -path "*linux*arm64*" -exec dirname {} \; | sed "s|$TEMP_DIR/node_modules/||")

echo "→ $COPIED Linux ARM64 package(s) added"

# Step 3: Copy esbuild binary to ext4 (avoids virtiofs SIGILL crash)
echo "→ Copying esbuild binary to ext4..."
mkdir -p "$ESBUILD_BIN_DIR"
ESBUILD_SRC="$WS/node_modules/@esbuild/linux-arm64/bin/esbuild"
if [ -f "$ESBUILD_SRC" ]; then
  # Use temp file + mv to handle "Text file busy" (binary may be in use)
  cp "$ESBUILD_SRC" "$ESBUILD_BIN_DIR/esbuild.tmp"
  chmod +x "$ESBUILD_BIN_DIR/esbuild.tmp"
  mv -f "$ESBUILD_BIN_DIR/esbuild.tmp" "$ESBUILD_BIN_DIR/esbuild"
else
  echo "✗ esbuild linux-arm64 binary not found at $ESBUILD_SRC"
  exit 1
fi

# Export for current shell and write to profile for future shells
export ESBUILD_BINARY_PATH="$ESBUILD_BIN_DIR/esbuild"
grep -q "ESBUILD_BINARY_PATH" ~/.bashrc 2>/dev/null || \
  echo "export ESBUILD_BINARY_PATH=$ESBUILD_BIN_DIR/esbuild" >> ~/.bashrc

# Step 4: Verify native binaries
echo "→ Verifying native binaries..."
cd "$WS"
FAIL=0
node -e "require('esbuild').transform('const x: number = 1',{loader:'ts'}).then(()=>console.log('  ✓ esbuild OK')).catch(e=>{console.log('  ✗ esbuild FAIL:',e.message);process.exit(1)})" || FAIL=1
node -e "import('rollup').then(()=>console.log('  ✓ rollup OK')).catch(e=>{console.log('  ✗ rollup FAIL:',e.message);process.exit(1)})" || FAIL=1
node -e "try{require('lightningcss');console.log('  ✓ lightningcss OK')}catch(e){console.log('  ✗ lightningcss FAIL:',e.message);process.exit(1)}" || FAIL=1
node -e "import('vite').then(()=>console.log('  ✓ vite OK')).catch(e=>{console.log('  ✗ vite FAIL:',e.message);process.exit(1)})" || FAIL=1

if [ "$FAIL" -ne 0 ]; then
  echo "✗ Binary verification failed. Try running the script again."
  exit 1
fi

# Step 5: Clean up temp dir
rm -rf "$TEMP_DIR"

# Step 6: Optionally install Playwright
if [ "$INSTALL_PLAYWRIGHT" = "--playwright" ] || [ "$INSTALL_PLAYWRIGHT" = "true" ]; then
  echo "→ Installing Playwright browsers..."
  npx playwright install --with-deps chromium
fi

echo ""
echo "=== ✓ Sandbox npm install complete ==="
echo ""
echo "All commands run from: $WS"
echo "ESBUILD_BINARY_PATH=$ESBUILD_BIN_DIR/esbuild"
echo ""
echo "Run tests:   npm test"
echo "Run E2E:     npx playwright test"
echo "Dev server:  npm run dev"
echo ""
echo "Your macOS node_modules is preserved — no reinstall needed on either side."
