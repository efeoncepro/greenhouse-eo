#!/bin/bash
# TASK-2073: macOS network-denied sandbox + Node filesystem read allowlist, no write/child permission.
set -euo pipefail
cd -- "$(dirname -- "$0")/../../.."
bridge_dir="$PWD/scripts/experiments/operational-account-bridge"
bridge_permissions=(--permission "--allow-fs-read=$bridge_dir")
bridge_read_paths=(
  src/lib/services/service-sync.ts
  migrations/20260601194051024_task-987-session-route-groups-lifecycle-fix.sql
  src/lib/tenant/identity-store.ts
  src/lib/space-notion/space-notion-store.ts
  src/lib/account-360/facet-cache.ts
  src/lib/service-attribution/materialize.ts
  src/lib/commercial/party/commands/instantiate-client-for-party.ts
  src/lib/client-lifecycle/commands/provision-client-from-wizard.ts
)
for bridge_path in "${bridge_read_paths[@]}"; do
  bridge_permissions+=("--allow-fs-read=$PWD/$bridge_path")
done
case "${1:-test}" in
  test) bridge_command=("$bridge_dir/prototype.test.mjs") ;;
  evaluate) bridge_command=("$bridge_dir/evaluate.mjs") ;;
  *) echo 'Usage: bash scripts/experiments/operational-account-bridge/run-local.sh [test|evaluate]' >&2; exit 2 ;;
esac
exec /usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)' node "${bridge_permissions[@]}" "${bridge_command[@]}"
