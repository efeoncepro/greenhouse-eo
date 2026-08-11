#!/bin/sh
#
# TASK-1378 — Arranque del contenedor ClamAV en Cloud Run.
#
# Tres procesos, en este orden y por esta razón:
#   1. freshclam -d  → mantiene la base de firmas fresca. Sin esto el scanner
#                      envejece en silencio y da falsa confianza, que es peor
#                      que no tener antivirus (nadie lo sabe).
#   2. clamd         → carga la base (20-40 s). El shim responde /ready 503
#                      hasta que contesta PONG, así el startup probe espera.
#   3. node shim     → PID 1 efectivo (exec), para que Cloud Run reciba SIGTERM.
#
set -eu

CLAMAV_DB_DIR="${CLAMAV_DB_DIR:-/var/lib/clamav}"

mkdir -p /run/clamav "${CLAMAV_DB_DIR}"
chown -R clamav:clamav /run/clamav "${CLAMAV_DB_DIR}" 2>/dev/null || true

# La imagen ya trae una base horneada en build. Si por lo que sea faltara,
# bajarla ahora en primer plano es preferible a arrancar clamd sin firmas.
#
# `find` y no `ls *.cvd *.cld`: con dos globs, ls falla si CUALQUIERA no matchea.
# La base horneada trae sólo .cvd, así que el chequeo daba siempre negativo y
# re-descargaba 112 MB en cada arranque (detectado live 2026-08-11).
if ! find "${CLAMAV_DB_DIR}" -maxdepth 1 \( -name '*.cvd' -o -name '*.cld' \) -print -quit | grep -q .; then
  echo '{"event":"freshclam_bootstrap","reason":"no_signature_db_in_image"}'
  freshclam --quiet || echo '{"event":"freshclam_bootstrap_failed"}'
fi

# Daemon de actualización. Que falle no debe tumbar el contenedor: el shim
# reporta /health degraded por vejez de firmas y eso es visible aguas arriba.
freshclam -d --quiet &

clamd &

exec node /app/server.mjs
