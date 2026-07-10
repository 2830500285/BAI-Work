#!/bin/bash
set -euo pipefail

# Deprecated compatibility wrapper.
# Current product iteration builds Mac Intel/x64 artifacts only.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-win|--skip-linux)
      echo "release-all-mac.sh: ignoring legacy $1; current release builds Mac Intel/x64 only." >&2
      shift
      ;;
    --skip-mac)
      echo "release-all-mac.sh: --skip-mac is not supported; current release builds Mac Intel/x64 only." >&2
      exit 1
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

echo "release-all-mac.sh is deprecated; building Mac Intel/x64 assets only." >&2
exec "${ROOT}/scripts/release-mac.sh" "${ARGS[@]}"
