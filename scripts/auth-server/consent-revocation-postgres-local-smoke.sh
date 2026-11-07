#!/usr/bin/env bash
# TASK-1833. Disposable loopback PostgreSQL only; no cloud credentials or real subjects.
set -euo pipefail
CONSENT_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$CONSENT_REPO_ROOT"
CONSENT_PG_BIN="${AUTH_CONSENT_PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
CONSENT_TEMP_DIR="$(mktemp -d /tmp/auth-consent-smoke.XXXXXX)"
chmod 0700 "$CONSENT_TEMP_DIR"
CONSENT_LOCAL_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
cleanup() {
  "$CONSENT_PG_BIN/pg_ctl" -D "$CONSENT_TEMP_DIR/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$CONSENT_TEMP_DIR"
}
trap cleanup EXIT INT TERM
"$CONSENT_PG_BIN/initdb" -D "$CONSENT_TEMP_DIR/data" -A trust --no-locale >"$CONSENT_TEMP_DIR/init.log"
# Trust authentication is confined to a Unix socket in this private directory.
# TCP loopback would allow another local OS user to claim the cluster superuser.
"$CONSENT_PG_BIN/pg_ctl" -D "$CONSENT_TEMP_DIR/data" -l "$CONSENT_TEMP_DIR/server.log" -o "-h '' -k $CONSENT_TEMP_DIR -p $CONSENT_LOCAL_PORT" start >/dev/null
"$CONSENT_PG_BIN/createdb" -h "$CONSENT_TEMP_DIR" -p "$CONSENT_LOCAL_PORT" auth_consent_local
"$CONSENT_PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$CONSENT_TEMP_DIR" -p "$CONSENT_LOCAL_PORT" -d auth_consent_local <<'SQL'
CREATE ROLE greenhouse_ops;
CREATE ROLE greenhouse_runtime;
CREATE ROLE greenhouse_app LOGIN;
CREATE ROLE greenhouse_migrator_user;
SQL
for CONSENT_MIGRATION in \
  migrations/20260904111156246_task-1828-greenhouse-auth-schema.sql \
  migrations/20260904130826694_task-1829-auth-oauth-tables.sql; do
  sed '/^-- Down Migration/,$d' "$CONSENT_MIGRATION" |
    "$CONSENT_PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$CONSENT_TEMP_DIR" -p "$CONSENT_LOCAL_PORT" -d auth_consent_local
done
"$CONSENT_PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$CONSENT_TEMP_DIR" -p "$CONSENT_LOCAL_PORT" -d auth_consent_local <<'SQL'
ALTER TABLE greenhouse_auth.refresh_tokens
  ADD CONSTRAINT local_reject_consent_revoke CHECK (revoke_reason IS DISTINCT FROM 'consent_revoked:local_failure');
ALTER TABLE greenhouse_auth.access_tokens
  ADD CONSTRAINT local_reject_access_revoke CHECK (revoke_reason IS DISTINCT FROM 'consent_revoked:access_failure');
SQL
AUTH_CONSENT_LOCAL_POSTGRES_SOCKET="$CONSENT_TEMP_DIR"
AUTH_CONSENT_LOCAL_POSTGRES_PORT="$CONSENT_LOCAL_PORT"
export AUTH_CONSENT_LOCAL_POSTGRES_SOCKET AUTH_CONSENT_LOCAL_POSTGRES_PORT
pnpm exec vitest run src/lib/auth-server/oauth/consent-revocation.postgres.test.ts --reporter=dot
