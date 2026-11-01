#!/usr/bin/env bash
# TASK-1833. Disposable loopback PostgreSQL only; no .env, cloud credentials, or real subjects.
set -euo pipefail
RECOVERY_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RECOVERY_REPO_ROOT"
RECOVERY_PG_BIN="${AUTH_RECOVERY_PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
RECOVERY_TEMP_DIR="$(mktemp -d /tmp/auth-recovery-smoke.XXXXXX)"
RECOVERY_LOCAL_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
cleanup() {
  "$RECOVERY_PG_BIN/pg_ctl" -D "$RECOVERY_TEMP_DIR/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$RECOVERY_TEMP_DIR"
}
trap cleanup EXIT INT TERM
"$RECOVERY_PG_BIN/initdb" -D "$RECOVERY_TEMP_DIR/data" -A trust --no-locale >"$RECOVERY_TEMP_DIR/init.log"
"$RECOVERY_PG_BIN/pg_ctl" -D "$RECOVERY_TEMP_DIR/data" -l "$RECOVERY_TEMP_DIR/server.log" -o "-h 127.0.0.1 -p $RECOVERY_LOCAL_PORT" start >/dev/null
"$RECOVERY_PG_BIN/createdb" -h 127.0.0.1 -p "$RECOVERY_LOCAL_PORT" auth_revoke_local
"$RECOVERY_PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$RECOVERY_LOCAL_PORT" -d auth_revoke_local <<'SQL'
CREATE ROLE greenhouse_ops;
CREATE ROLE greenhouse_runtime;
CREATE ROLE greenhouse_app LOGIN;
CREATE ROLE greenhouse_migrator_user;
CREATE SCHEMA greenhouse_auth;
CREATE SCHEMA greenhouse_core;
GRANT USAGE ON SCHEMA greenhouse_auth, greenhouse_core TO greenhouse_app, greenhouse_runtime;
CREATE TABLE greenhouse_core.identity_profile_source_links (link_id text PRIMARY KEY);
INSERT INTO greenhouse_core.identity_profile_source_links(link_id) VALUES ('link-synthetic');
SQL
for RECOVERY_MIGRATION in \
  migrations/20260904184837565_task-1830-auth-person-session-magic-link.sql \
  migrations/20260904202029472_task-1830-auth-passkey-credentials.sql \
  migrations/20260904205119719_task-1830-auth-totp-step-up.sql; do
  sed '/^-- Down Migration/,$d' "$RECOVERY_MIGRATION" |
    "$RECOVERY_PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$RECOVERY_LOCAL_PORT" -d auth_revoke_local
done
"$RECOVERY_PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$RECOVERY_LOCAL_PORT" -d auth_revoke_local <<'SQL'
ALTER TABLE greenhouse_auth.person_auth_attempts
  ADD CONSTRAINT local_reject_recovery_audit CHECK (reason_code <> 'local_audit_failure');
SQL
AUTH_REVOKE_LOCAL_POSTGRES_URL="postgresql://127.0.0.1:$RECOVERY_LOCAL_PORT/auth_revoke_local"
export AUTH_REVOKE_LOCAL_POSTGRES_URL
pnpm exec vitest run src/lib/auth-server/persons/recovery.postgres.test.ts --reporter=dot
