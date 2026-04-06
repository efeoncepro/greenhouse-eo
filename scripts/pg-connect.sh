#!/usr/bin/env bash
#
# pg-connect.sh — Conecta a Cloud SQL PostgreSQL automáticamente
#
# Uso:
#   ./scripts/pg-connect.sh              # Levanta proxy + verifica conexión
#   ./scripts/pg-connect.sh --migrate    # Levanta proxy + ejecuta migraciones
#   ./scripts/pg-connect.sh --status     # Levanta proxy + muestra estado de migraciones
#   ./scripts/pg-connect.sh --shell      # Levanta proxy + abre psql interactivo
#
# Resuelve automáticamente:
#   1. Verifica que gcloud ADC estén vigentes, si no las renueva
#   2. Mata cualquier proxy anterior en el puerto
#   3. Levanta Cloud SQL Proxy en el puerto correcto
#   4. Conecta con el usuario que corresponde según la operación
#
set -euo pipefail

# ── Config ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"
INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
PORT=15432
DATABASE="greenhouse_app"
CLOUD_SQL_PROXY="${CLOUD_SQL_PROXY_BIN:-$(which cloud-sql-proxy 2>/dev/null || echo "$HOME/google-cloud-sdk/bin/cloud-sql-proxy")}"

# ── Helpers ─────────────────────────────────────────────────
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }
dim()   { printf "\033[2m%s\033[0m\n" "$*"; }

die() { red "ERROR: $*" >&2; exit 1; }

read_env() {
  local key="$1"
  grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | sed 's/^[^=]*=//' | tr -d '"'
}

# ── Pre-flight checks ──────────────────────────────────────
[ -f "$ENV_FILE" ] || die ".env.local no encontrado en $PROJECT_ROOT"
[ -x "$CLOUD_SQL_PROXY" ] || die "cloud-sql-proxy no encontrado. Instálalo o setea CLOUD_SQL_PROXY_BIN"

# ── Resolve credentials per operation ──────────────────────
resolve_user() {
  local op="${1:-connect}"
  case "$op" in
    migrate|status)
      echo "$(read_env GREENHOUSE_POSTGRES_OPS_USER):$(read_env GREENHOUSE_POSTGRES_OPS_PASSWORD)"
      ;;
    shell)
      echo "$(read_env GREENHOUSE_POSTGRES_ADMIN_USER):$(read_env GREENHOUSE_POSTGRES_ADMIN_PASSWORD)"
      ;;
    *)
      echo "$(read_env GREENHOUSE_POSTGRES_OPS_USER):$(read_env GREENHOUSE_POSTGRES_OPS_PASSWORD)"
      ;;
  esac
}

# ── Step 1: Verify GCP ADC ─────────────────────────────────
verify_adc() {
  blue "Verificando credenciales GCP..."

  if ! gcloud auth application-default print-access-token &>/dev/null; then
    red "ADC expiradas. Renovando..."
    gcloud auth application-default login --quiet 2>&1 || die "No se pudo renovar ADC. Ejecuta: gcloud auth application-default login"
    green "ADC renovadas."
  else
    dim "ADC vigentes."
  fi
}

# ── Step 2: Start Cloud SQL Proxy ──────────────────────────
start_proxy() {
  blue "Iniciando Cloud SQL Proxy en puerto $PORT..."

  # Kill any existing proxy on this port
  lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  sleep 1

  "$CLOUD_SQL_PROXY" "$INSTANCE" --port "$PORT" &>/dev/null &
  PROXY_PID=$!
  sleep 3

  if ! kill -0 "$PROXY_PID" 2>/dev/null; then
    die "Cloud SQL Proxy no pudo iniciar. Verifica las ADC."
  fi

  dim "Proxy PID: $PROXY_PID"
}

# ── Step 3: Test connection ────────────────────────────────
test_connection() {
  local creds
  creds=$(resolve_user "${1:-connect}")
  local user="${creds%%:*}"
  local pass="${creds#*:}"

  blue "Probando conexión como $user..."

  local result
  result=$(PGPASSWORD="$pass" node -e "
    const { Client } = require('pg');
    const c = new Client({ host: '127.0.0.1', port: $PORT, database: '$DATABASE', user: '$user', password: '$pass', ssl: false });
    c.connect()
      .then(() => c.query('SELECT current_user, current_database()'))
      .then(r => { console.log(JSON.stringify(r.rows[0])); c.end() })
      .catch(e => { console.error('FAIL:' + e.message); process.exit(1) })
  " 2>&1) || die "Conexión fallida: $result"

  green "Conectado: $result"
}

# ── Step 4: Execute operation ──────────────────────────────
execute_operation() {
  local op="${1:-connect}"

  case "$op" in
    --migrate)
      blue "Ejecutando migraciones..."
      cd "$PROJECT_ROOT"
      pnpm migrate:up
      green "Migraciones aplicadas exitosamente."
      ;;
    --status)
      blue "Estado de migraciones..."
      cd "$PROJECT_ROOT"
      pnpm migrate:status
      ;;
    --shell)
      local creds
      creds=$(resolve_user shell)
      local user="${creds%%:*}"
      local pass="${creds#*:}"
      blue "Abriendo shell PostgreSQL como $user..."
      PGPASSWORD="$pass" psql -h 127.0.0.1 -p "$PORT" -U "$user" -d "$DATABASE" 2>/dev/null || \
        PGPASSWORD="$pass" node -e "
          const readline = require('readline');
          const { Client } = require('pg');
          const c = new Client({ host: '127.0.0.1', port: $PORT, database: '$DATABASE', user: '$user', password: '$pass', ssl: false });
          c.connect().then(() => {
            console.log('Conectado. Escribe SQL (Ctrl+D para salir):');
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '$DATABASE=> ' });
            rl.prompt();
            rl.on('line', async (line) => {
              if (!line.trim()) { rl.prompt(); return; }
              try { const r = await c.query(line); console.table(r.rows); } catch(e) { console.error(e.message); }
              rl.prompt();
            });
            rl.on('close', () => { c.end(); process.exit(0); });
          }).catch(e => { console.error(e.message); process.exit(1); });
        "
      ;;
    *)
      green "Conexión verificada. Proxy activo en localhost:$PORT"
      dim "Usa --migrate, --status, o --shell para operar."
      ;;
  esac
}

# ── Main ───────────────────────────────────────────────────
main() {
  local op="${1:-connect}"

  echo ""
  blue "═══ Greenhouse PostgreSQL Connect ═══"
  echo ""

  verify_adc
  start_proxy
  test_connection "$op"
  execute_operation "$op"

  echo ""
  dim "Proxy sigue activo en localhost:$PORT (PID: $PROXY_PID)"
  dim "Para detener: kill $PROXY_PID"
}

main "$@"
