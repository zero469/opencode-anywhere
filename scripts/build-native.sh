#!/bin/bash
set -e

cd "$(dirname "$0")/.."

API_DIR="src/app/api"
BACKUP_DIR=".api-backup"

if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$BACKUP_DIR"
fi

cleanup() {
  if [ -d "$BACKUP_DIR" ]; then
    mv "$BACKUP_DIR" "$API_DIR"
  fi
}
trap cleanup EXIT

BUILD_TARGET=native npm run build

npx cap sync
