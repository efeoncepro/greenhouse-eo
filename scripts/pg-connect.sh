#!/usr/bin/env bash
#
# pg-connect.sh — Conecta a Cloud SQL PostgreSQL automáticamente
#
# Uso:
#   ./scripts/pg-connect.sh              # Levanta proxy + verifica conexión (proxy persiste)
#   ./scripts/pg-connect.sh --migrate    # Levanta proxy + ejecuta migraciones (proxy muere al salir)
#   ./scripts/pg-connect.sh --status     # Levanta proxy + muestra estado de migraciones (idem)
#   ./scripts/pg-connect.sh --shell      # Levanta proxy + abre psql interactivo (idem)
#
# Resuelve automáticamente:
#   1. Preflight de red (ping DF-1200 a Cloud SQL) — detecta PMTUD blackhole antes de colgar 30s
#   2. Verifica que gcloud ADC estén vigentes, si no las renueva
#   3. Mata cualquier proxy anterior en el puerto
#   4. Levanta Cloud SQL Proxy y ESPERA el mensaje "ready for new connections"
#   5. Conecta con el usuario que corresponde según la operación
#   6. Si cualquier paso falla, un trap limpia el proxy que el script spawn
#
# Taxonomía de errores (prefijos en stderr):
#   [ADC]     credenciales GCP expiradas o ausentes
#   [PROXY]   cloud-sql-proxy binary missing, no arrancó o murió
#   [NETWORK] TCP llega pero handshake TLS falla (típico PMTUD en redes corporativas)
#   [SQL]     conexión + TLS OK pero auth/query PostgreSQL falló
#   [CONFIG]  .env.local o variables requeridas ausentes
#
# Escape hatches:
#   GREENHOUSE_SKIP_PREFLIGHT=true  salta el preflight ICMP (útil si tu red bloquea ICMP pero TCP funciona)
#   CLOUD_SQL_PROXY_BIN=/path       override del binario cloud-sql-proxy
#
set -euo pipefail

# ── Config ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"
INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
INSTANCE_IP="34.86.135.144"
PORT=15432
DATABASE="greenhouse_app"
CLOUD_SQL_PROXY="${CLOUD_SQL_PROXY_BIN:-$(which cloud-sql-proxy 2>/dev/null || echo "$HOME/google-cloud-sdk/bin/cloud-sql-proxy")}"
PROXY_LOG="/tmp/gh-sql-proxy-$$.log"
PROXY_PID=""
KEEP_PROXY=false

# ── Helpers ─────────────────────────────────────────────────
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }
dim()   { printf "\033[2m%s\033[0m\n" "$*"; }

print_proxy_tail() {
  [ -f "$PROXY_LOG" ] || return 0
  red "--- proxy log (tail -20) ---" >&2
  tail -20 "$PROXY_LOG" >&2
}

die_adc()     { red "[ADC] $*" >&2; exit 1; }
die_proxy()   { red "[PROXY] $*" >&2; print_proxy_tail; exit 1; }
die_network() { red "[NETWORK] $*" >&2; exit 1; }
die_sql()     { red "[SQL] $*" >&2; print_proxy_tail; exit 1; }
die_config()  { red "[CONFIG] $*" >&2; exit 1; }

read_env() {
  local key="$1"
  grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | sed 's/^[^=]*=//' | tr -d '"'
}

# ── Cleanup ────────────────────────────────────────────────
# Se dispara en cualquier exit code + SIGINT + SIGTERM.
# Para el modo default ("connect"), main() marca KEEP_PROXY=true al final
# y disown el PID, de modo que el proxy persiste después de que el script salga.
cleanup() {
  [ "$KEEP_PROXY" = "true" ] && return 0
  if [ -n "$PROXY_PID" ] && kill -0 "$PROXY_PID" 2>/dev/null; then
    kill "$PROXY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

# ── Pre-flight checks ──────────────────────────────────────
[ -f "$ENV_FILE" ] || die_config ".env.local no encontrado en $PROJECT_ROOT"
[ -x "$CLOUD_SQL_PROXY" ] || die_proxy "cloud-sql-proxy no encontrado. Instala con: gcloud components install cloud-sql-proxy"

# ── Resolve credentials per operation ──────────────────────
resolve_user() {
  local op="${1:-connect}"
  case "$op" in
    migrate|status|--migrate|--status)
      echo "$(read_env GREENHOUSE_POSTGRES_OPS_USER):$(read_env GREENHOUSE_POSTGRES_OPS_PASSWORD)"
      ;;
    shell|--shell)
      echo "$(read_env GREENHOUSE_POSTGRES_ADMIN_USER):$(read_env GREENHOUSE_POSTGRES_ADMIN_PASSWORD)"
      ;;
    *)
      echo "$(read_env GREENHOUSE_POSTGRES_OPS_USER):$(read_env GREENHOUSE_POSTGRES_OPS_PASSWORD)"
      ;;
  esac
}

# ── Step 0: Network preflight ──────────────────────────────
# ICMP DF-1200 a $INSTANCE_IP. Si falla el DF grande pero pasa el chico,
# es un PMTUD blackhole — típico en redes corporativas sin MSS clamping
# en puertos no-HTTP/HTTPS. Cloud SQL usa 3307, que no tiene ese clamping.
network_preflight() {
  if [ "${GREENHOUSE_SKIP_PREFLIGHT:-false}" = "true" ]; then
    dim "Preflight de red: saltado (GREENHOUSE_SKIP_PREFLIGHT=true)"
    return 0
  fi

  # Testing escape hatch — fuerza fallo de preflight para verificar el error path
  if [ "${GREENHOUSE_FORCE_PREFLIGHT_FAIL:-false}" = "true" ]; then
    die_network "Preflight forzado a fallar (GREENHOUSE_FORCE_PREFLIGHT_FAIL=true).
Este camino se usa para verificar que el script reporta [NETWORK] rápido.
Desactiva con: unset GREENHOUSE_FORCE_PREFLIGHT_FAIL"
  fi

  blue "Preflight de red (ping DF-1200 a $INSTANCE_IP)..."

  if ping -c 2 -D -s 1200 -W 1500 "$INSTANCE_IP" >/dev/null 2>&1; then
    dim "Red OK (paquetes DF > 1200B llegan a Cloud SQL)."
    return 0
  fi

  # DF grande falló. Probar DF chico para diferenciar "sin ruta" de "blackhole MTU".
  if ping -c 2 -D -s 500 -W 1500 "$INSTANCE_IP" >/dev/null 2>&1; then
    die_network "Tu red local bloquea paquetes DF > 1000B hacia Cloud SQL ($INSTANCE_IP).
Cloud SQL usa puerto 3307 — la mayoría de firewalls/VPN corporativos solo hacen
MSS clamping en 80/443, así que en 3307 los segmentos full-size se droppean
silenciosamente y el handshake TLS se cuelga hasta timeout (30s).

Acciones posibles:
  1. Cambia de red (hotspot del celular) y reintenta.
  2. MSS clamp local (requiere sudo):
       sudo route add -host $INSTANCE_IP -mtu 900
     (al terminar: sudo route delete $INSTANCE_IP)
  3. Ejecuta desde Cloud Shell o un jump host GCE en us-east4.

Si tu red bloquea ICMP pero TCP 3307 sí funciona, salta este check con:
  GREENHOUSE_SKIP_PREFLIGHT=true pnpm pg:connect:<op>"
  else
    die_network "No hay ruta ICMP a $INSTANCE_IP. Verifica VPN / conexión a internet.
Si tu red bloquea ICMP pero TCP funciona, salta este check con:
  GREENHOUSE_SKIP_PREFLIGHT=true pnpm pg:connect:<op>"
  fi
}

# ── Step 1: Verify GCP ADC ─────────────────────────────────
verify_adc() {
  blue "Verificando credenciales GCP..."

  if ! gcloud auth application-default print-access-token &>/dev/null; then
    red "ADC expiradas. Renovando..."
    gcloud auth application-default login --quiet 2>&1 || die_adc "No se pudo renovar ADC. Ejecuta manualmente: gcloud auth application-default login"
    green "ADC renovadas."
  else
    dim "ADC vigentes."
  fi
}

# ── Step 2: Start Cloud SQL Proxy ──────────────────────────
# Arranca el proxy y ESPERA que emita "ready for new connections" en su log.
# Reemplaza el `sleep 3` fijo por un poll — más rápido en happy path (1-2s),
# más determinista en redes lentas (hasta 10s).
start_proxy() {
  blue "Iniciando Cloud SQL Proxy en puerto $PORT..."

  lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  sleep 1

  : > "$PROXY_LOG"

  "$CLOUD_SQL_PROXY" "$INSTANCE" --port "$PORT" > "$PROXY_LOG" 2>&1 &
  PROXY_PID=$!

  local ready=false
  local i
  for i in $(seq 1 20); do
    if ! kill -0 "$PROXY_PID" 2>/dev/null; then
      die_proxy "Cloud SQL Proxy murió durante el arranque (en ${i}×0.5s). Verifica ADC y conectividad a cloudsql.googleapis.com."
    fi
    if grep -q "ready for new connections" "$PROXY_LOG" 2>/dev/null; then
      ready=true
      break
    fi
    sleep 0.5
  done

  if [ "$ready" != "true" ]; then
    die_proxy "Cloud SQL Proxy no reportó 'ready for new connections' en 10s."
  fi

  dim "Proxy listo (PID: $PROXY_PID, log: $PROXY_LOG)"
}

# ── Step 3: Test connection ────────────────────────────────
# Si la query falla y el log del proxy muestra "handshake failed", clasificamos
# como [NETWORK] (path MTU / middlebox). Cualquier otra falla es [SQL].
test_connection() {
  local creds
  creds=$(resolve_user "${1:-connect}")
  local user="${creds%%:*}"
  local pass="${creds#*:}"

  [ -n "$user" ] || die_config "GREENHOUSE_POSTGRES_OPS_USER (o ADMIN_USER para --shell) no está en $ENV_FILE"
  [ -n "$pass" ] || die_config "password para $user no está en $ENV_FILE"

  blue "Probando conexión como $user..."

  local result
  result=$(PGPASSWORD="$pass" node -e "
    const { Client } = require('pg');
    const c = new Client({ host: '127.0.0.1', port: $PORT, database: '$DATABASE', user: '$user', password: '$pass', ssl: false, connectionTimeoutMillis: 10000 });
    c.connect()
      .then(() => c.query('SELECT current_user, current_database()'))
      .then(r => { console.log(JSON.stringify(r.rows[0])); c.end() })
      .catch(e => { console.error('FAIL:' + e.message); process.exit(1) })
  " 2>&1) || {
    if grep -qE "handshake failed|TLS handshake|context deadline exceeded" "$PROXY_LOG" 2>/dev/null; then
      die_network "TCP al proxy llega pero Cloud SQL no completa el TLS handshake dentro del timeout.
Esto suele ser PMTUD blackhole. Detalle pg: $result"
    fi
    die_sql "Conexión fallida como $user: $result"
  }

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

  network_preflight
  verify_adc
  start_proxy
  test_connection "$op"
  execute_operation "$op"

  # Modo default "connect": dejar el proxy vivo para uso manual posterior.
  # Modos --migrate/--status/--shell: one-shot, el trap limpia el proxy al salir.
  case "$op" in
    --migrate|--status|--shell)
      : # trap se encarga de limpiar
      ;;
    *)
      KEEP_PROXY=true
      disown "$PROXY_PID" 2>/dev/null || true
      echo ""
      dim "Proxy sigue activo en localhost:$PORT (PID: $PROXY_PID)"
      dim "Log del proxy: $PROXY_LOG"
      dim "Para detener: kill $PROXY_PID"
      ;;
  esac
}

main "$@"
