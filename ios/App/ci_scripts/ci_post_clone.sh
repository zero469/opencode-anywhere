#!/usr/bin/env bash
set -x

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

echo "=== Xcode Cloud Post-Clone Script ==="

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Installing Node.js..."
brew install node@20
brew link node@20

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

npm config set maxsockets 3

echo "Installing npm dependencies..."
npm ci

echo "Building web assets..."
npm run build

echo "Syncing to iOS..."
npx cap sync ios

echo "Verifying node_modules/@capacitor..."
ls -la node_modules/@capacitor/

echo "=== Post-Clone Complete ==="
