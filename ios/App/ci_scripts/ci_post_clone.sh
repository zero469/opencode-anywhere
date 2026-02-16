#!/usr/bin/env bash
set -ex  # Exit on error + print commands

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

echo "=== Xcode Cloud Post-Clone Script ==="
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"
echo "CI_WORKSPACE: $CI_WORKSPACE"
echo "Current directory: $(pwd)"

cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "Changed to: $(pwd)"

echo "Installing Node.js..."
brew install node@20 || true
brew link --overwrite node@20 || true

# Verify node is available
export PATH="/usr/local/opt/node@20/bin:/opt/homebrew/opt/node@20/bin:$PATH"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

npm config set maxsockets 3

echo "Installing npm dependencies..."
npm ci

echo "Building web assets..."
npm run build

echo "Syncing to iOS..."
npx cap sync ios

echo "=== Verifying Installation ==="
echo "Checking node_modules/@capacitor..."
ls -la node_modules/@capacitor/

echo "Checking ios/App/Podfile.lock existence..."
ls -la ios/App/Podfile.lock || echo "No Podfile.lock found"

echo "Checking CapApp-SPM Package.swift dependencies..."
ls -la node_modules/@capacitor/app/ || echo "capacitor/app not found"
ls -la node_modules/@capacitor/keyboard/ || echo "capacitor/keyboard not found"

echo "=== Post-Clone Complete ==="
