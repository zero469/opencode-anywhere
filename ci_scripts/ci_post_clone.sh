#!/bin/bash
set -e

echo "=== Xcode Cloud Post-Clone Script ==="

cd "$CI_PRIMARY_REPOSITORY_PATH"

# 安装 Node.js (使用 Homebrew)
echo "Installing Node.js..."
brew install node

# 安装依赖
echo "Installing npm dependencies..."
npm ci

# 构建 Web 资源并同步到 iOS
echo "Building web assets..."
npm run build:native

echo "=== Post-Clone Complete ==="
