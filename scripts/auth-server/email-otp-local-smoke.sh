#!/usr/bin/env bash
# TASK-2067. Disposable loopback PostgreSQL only; never loads .env or cloud credentials.
set -euo pipefail
OTP_PG_BIN="${AUTH_OTP_PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
OTP_TEMP_DIR="$(mktemp -d /tmp/auth-otp-smoke.XXXXXX)"
OTP_LOCAL_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
cleanup() {
  "$OTP_PG_BIN/pg_ctl" -D "$OTP_TEMP_DIR/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$OTP_TEMP_DIR"
}
trap cleanup EXIT INT TERM
"$OTP_PG_BIN/initdb" -D "$OTP_TEMP_DIR/data" -A trust --no-locale >"$OTP_TEMP_DIR/init.log"
"$OTP_PG_BIN/pg_ctl" -D "$OTP_TEMP_DIR/data" -l "$OTP_TEMP_DIR/server.log" -o "-h 127.0.0.1 -p $OTP_LOCAL_PORT" start >/dev/null
"$OTP_PG_BIN/createdb" -h 127.0.0.1 -p "$OTP_LOCAL_PORT" auth_otp_local
AUTH_OTP_LOCAL_POSTGRES_URL="postgresql://127.0.0.1:$OTP_LOCAL_PORT/auth_otp_local"
export AUTH_OTP_LOCAL_POSTGRES_URL
pnpm exec vitest run src/lib/auth-server/email-otp/postgres-store.test.ts
