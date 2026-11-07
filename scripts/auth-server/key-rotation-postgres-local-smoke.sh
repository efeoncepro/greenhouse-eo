#!/usr/bin/env bash
# TASK-1833: private disposable PostgreSQL; no cloud connection or credentials.
set -euo pipefail
ROTATION_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROTATION_REPO_ROOT"
ROTATION_PG_BIN="${AUTH_ROTATION_PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
ROTATION_TEMP_DIR="$(mktemp -d /tmp/auth-rotation-smoke.XXXXXX)"
chmod 0700 "$ROTATION_TEMP_DIR"
ROTATION_LOCAL_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
cleanup() {
  "$ROTATION_PG_BIN/pg_ctl" -D "$ROTATION_TEMP_DIR/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$ROTATION_TEMP_DIR"
}
trap cleanup EXIT INT TERM
"$ROTATION_PG_BIN/initdb" -D "$ROTATION_TEMP_DIR/data" -A trust --no-locale >"$ROTATION_TEMP_DIR/init.log"
"$ROTATION_PG_BIN/pg_ctl" -D "$ROTATION_TEMP_DIR/data" -l "$ROTATION_TEMP_DIR/server.log" \
  -o "-h '' -k $ROTATION_TEMP_DIR -p $ROTATION_LOCAL_PORT" start >/dev/null
"$ROTATION_PG_BIN/createdb" -h "$ROTATION_TEMP_DIR" -p "$ROTATION_LOCAL_PORT" auth_rotation_local
"$ROTATION_PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$ROTATION_TEMP_DIR" \
  -p "$ROTATION_LOCAL_PORT" -d auth_rotation_local <<'SQL'
CREATE ROLE greenhouse_ops;
CREATE ROLE greenhouse_runtime;
CREATE ROLE greenhouse_app LOGIN;
CREATE ROLE greenhouse_migrator_user;
SQL
for ROTATION_MIGRATION in \
  migrations/20260904111156246_task-1828-greenhouse-auth-schema.sql \
  migrations/20260904130826694_task-1829-auth-oauth-tables.sql \
  migrations/20261029092236733_task-1833-auth-key-maintenance.sql; do
  sed '/^-- Down Migration/,$d' "$ROTATION_MIGRATION" |
    "$ROTATION_PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$ROTATION_TEMP_DIR" \
      -p "$ROTATION_LOCAL_PORT" -d auth_rotation_local
done
"$ROTATION_PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$ROTATION_TEMP_DIR" \
  -p "$ROTATION_LOCAL_PORT" -d auth_rotation_local <<'SQL'
CREATE ROLE auth_key_maintenance LOGIN;
GRANT greenhouse_auth_key_maintenance TO auth_key_maintenance;
SQL
AUTH_ROTATION_LOCAL_POSTGRES_SOCKET="$ROTATION_TEMP_DIR"
AUTH_ROTATION_LOCAL_POSTGRES_PORT="$ROTATION_LOCAL_PORT"
export AUTH_ROTATION_LOCAL_POSTGRES_SOCKET AUTH_ROTATION_LOCAL_POSTGRES_PORT
pnpm exec vitest run src/lib/auth-server/maintenance/key-rotation.postgres.test.ts --reporter=dot
