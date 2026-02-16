#!/usr/bin/env bash
set -ex

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

echo "=== Xcode Cloud Post-Clone Script ==="
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"
echo "Current directory: $(pwd)"

cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "Changed to: $(pwd)"

echo "Installing Node.js 22..."
brew install node@22 || true
brew link --overwrite node@22 || true

export PATH="/usr/local/opt/node@22/bin:/opt/homebrew/opt/node@22/bin:$PATH"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

npm config set maxsockets 3

echo "Installing npm dependencies..."
npm ci

echo "Building web assets for native..."
npm run build:native

echo "Syncing to iOS..."
npx cap sync ios

echo "=== Verifying Installation ==="
ls -la node_modules/@capacitor/

echo "=== Post-Clone Complete ==="
