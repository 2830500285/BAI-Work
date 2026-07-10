#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# release.sh - macOS GitHub Release wrapper
#
# Default behavior builds Mac Intel/x64 artifacts and creates a draft GitHub release
# with the next version tag. The legacy --all flag is kept as a Mac-only alias.
#
#   bash ./scripts/release-mac.sh              # or bash ./scripts/release.sh
#   bash ./scripts/release.sh --r2
#
# =============================================================================

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${1:-}" == "--all" ]]; then
  shift
  echo "release.sh --all is deprecated; building Mac Intel/x64 assets only." >&2
fi

exec "${ROOT}/scripts/release-mac.sh" "$@"
