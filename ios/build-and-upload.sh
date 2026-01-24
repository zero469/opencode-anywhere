#!/bin/bash
set -e

cd "$(dirname "$0")"

SCHEME="App"
PROJECT="App/App.xcodeproj"
ARCHIVE_PATH="build/App.xcarchive"
EXPORT_OPTIONS="ExportOptions.plist"

echo "🧹 Cleaning build folder..."
rm -rf build

echo "📦 Building and archiving..."
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination "generic/platform=iOS" \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates

echo "🚀 Exporting and uploading to App Store Connect..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates

echo "✅ Done! Check App Store Connect for the build."
