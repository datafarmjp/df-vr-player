#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${DF_RELEASE_SYNC_ENV_FILE:-$HOME/.config/df-release-sync.env}"
PRODUCT="DF_VRPlayer"
VERSION="$(node -p "require('$ROOT_DIR/package.json').version")"
TAG="v$VERSION"
DMG_PATH="$ROOT_DIR/release/DF VR Player-$VERSION-arm64.dmg"
JSON_DIR="$ROOT_DIR/release/$PRODUCT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

node "$ROOT_DIR/scripts/generate-release-json.mjs"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DF_RELEASE_SYNC_HOST:?DF_RELEASE_SYNC_HOST is required}"
: "${DF_RELEASE_SYNC_USER:?DF_RELEASE_SYNC_USER is required}"
: "${DF_RELEASE_SYNC_REMOTE_PATH:?DF_RELEASE_SYNC_REMOTE_PATH is required}"

PORT="${DF_RELEASE_SYNC_PORT:-22}"
REMOTE_BASE="${DF_RELEASE_SYNC_REMOTE_PATH%/}"
REMOTE_DIR="$REMOTE_BASE/$PRODUCT"
BATCH_FILE="$(mktemp /private/tmp/df-vr-player-release-sync.XXXXXX)"

cleanup() {
  rm -f "$BATCH_FILE"
}
trap cleanup EXIT

{
  printf -- '-mkdir "%s"\n' "$REMOTE_BASE"
  printf -- '-mkdir "%s"\n' "$REMOTE_DIR"
  printf 'cd "%s"\n' "$REMOTE_DIR"
  printf 'put "%s" "latest.json"\n' "$JSON_DIR/latest.json"
  printf 'put "%s" "%s.json"\n' "$JSON_DIR/$TAG.json" "$TAG"
  if [[ -f "$DMG_PATH" ]]; then
    printf 'put "%s" "%s"\n' "$DMG_PATH" "$(basename "$DMG_PATH")"
  else
    echo "Warning: DMG not found, skipping: $DMG_PATH" >&2
  fi
  printf 'bye\n'
} > "$BATCH_FILE"

sftp -P "$PORT" -b "$BATCH_FILE" "$DF_RELEASE_SYNC_USER@$DF_RELEASE_SYNC_HOST"

