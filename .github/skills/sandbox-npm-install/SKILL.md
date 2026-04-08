---
name: sandbox-npm-install
description: 'Install npm packages in the Docker Sandbox (Copilot) environment. Use this skill whenever you need to install, reinstall, or update node_modules in the container. Native binaries crash on virtiofs, so packages must be installed on local ext4 and symlinked.'
---

# Sandbox npm Install

## When to Use

Use this skill whenever:
- You need to install npm packages for the first time in a new sandbox session
- `package.json` or `package-lock.json` has changed and you need to reinstall
- You encounter native binary crashes (esbuild, lightningcss, rollup) with errors like `SIGILL`, `SIGSEGV`, `mmap`, or `unaligned sysNoHugePageOS`
- The `node_modules` directory is missing or corrupted

## Background

The Docker Sandbox workspace is mounted via **virtiofs** (file sync between macOS host and Linux VM). Native Go and Rust binaries (esbuild, lightningcss, rollup) crash with mmap alignment failures when executed from virtiofs on aarch64. The fix is to install on the sandbox's local ext4 filesystem and symlink back.

## Installation

Run the bundled install script from the workspace root:

```bash
bash .github/skills/sandbox-npm-install/install.sh
```

To also install Playwright browsers for E2E testing:

```bash
bash .github/skills/sandbox-npm-install/install.sh --playwright
```

The script performs these steps automatically:
1. Checks for existing `node_modules` (user must `npm install` on macOS first)
2. Installs Linux ARM64 platform packages to a temp dir on ext4
3. Copies Linux packages INTO the existing node_modules (preserves macOS packages)
4. Copies the esbuild binary to ext4 at `/home/agent/esbuild-bin-dir/esbuild`
5. Sets `ESBUILD_BINARY_PATH` env var (persisted to `~/.bashrc`)
6. Verifies all native binaries (esbuild, rollup, lightningcss, vite)
7. Optionally installs Playwright browsers

If verification fails, run the script again — crashes can be intermittent.

## How It Works

**Key insight**: Only esbuild's Go binary crashes on virtiofs. Rollup and lightningcss (Rust/napi) work fine.

The dual-platform approach:
- Platform packages have different scoped names (`@esbuild/darwin-arm64` vs `@esbuild/linux-arm64`) — they coexist without conflicts
- The script adds Linux packages alongside the existing macOS packages
- `ESBUILD_BINARY_PATH` env var tells esbuild to use a copy on ext4 instead of the virtiofs binary
- `vite.config.ts` has `getSymlinkAllowPaths()` that detects symlinked node_modules and adds the target to Vite's `server.fs.allow`

**Neither side needs to reinstall** — macOS finds darwin packages, Linux finds linux packages.

## Post-Install: Running Commands

**All commands run from the original workspace** (no mirror needed):

```bash
# Unit tests
npm test

# E2E tests
npx playwright test --project=chromium

# TypeScript check
npx svelte-check --tsconfig ./tsconfig.json

# Dev server
npm run dev
```

Ensure `ESBUILD_BINARY_PATH` is set in your shell (the install script adds it to `~/.bashrc`):
```bash
export ESBUILD_BINARY_PATH=/home/agent/esbuild-bin-dir/esbuild
```

## Important Notes

- `/home/agent/esbuild-bin-dir/` is **sandbox-local** and NOT synced to the macOS host
- The user's macOS packages are preserved — `npm install` on macOS won't remove the Linux packages
- If the user runs `npm ci` on macOS, it WILL remove Linux packages — re-run the install script
- After any `package.json` or `package-lock.json` change, re-run the install script
- Do NOT run `npm ci` or `npm install` directly in the sandbox — it will crash during esbuild postinstall
