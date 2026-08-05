#!/usr/bin/env bash
# Retired 2026-08-01. Kept as a fail-closed tombstone for callers outside package.json.

set -euo pipefail

printf '%s\n' \
  'scripts/worktree-sync.sh is retired.' \
  'Use the single shared checkout and the repository branch contract: Greenhouse develop; Globe main.' \
  'Do not enumerate, create, sync, clean or remove worktrees.' >&2
exit 2
