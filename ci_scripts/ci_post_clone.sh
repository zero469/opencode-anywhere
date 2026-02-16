#!/bin/bash
set -e

echo "=== Xcode Cloud Post-Clone Script ==="
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"
echo "Current directory: $(pwd)"

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Installing Node.js..."
brew install node

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

echo "Installing npm dependencies..."
npm ci

echo "Building web assets and syncing to iOS..."
npm run build:native

echo "Verifying node_modules/@capacitor..."
ls -la node_modules/@capacitor/

echo "=== Post-Clone Complete ==="
