# TASK-1378 — ClamAV + shim HTTP para el escaneo de firmas de assets de candidato.
#
# Build:  gcloud builds submit services/clamav (contexto = ESTE directorio,
#         no la raíz del repo: el servicio no comparte código con el portal)
# Deploy: bash services/clamav/deploy.sh
#
# A diferencia de los otros servicios Cloud Run del repo, este NO bundlea
# `src/lib` — no comparte código con el portal. El contrato entre ambos es HTTP
# y lo define `src/lib/storage/asset-scan/clamav-http.ts`, no este Dockerfile.
# Por eso no necesita pnpm, esbuild, el token de AXIS ni los shims de Next.

# syntax=docker/dockerfile:1.7

# ── Etapa 1: hornear la base de firmas ────────────────────────────────────────
# Sin esto, la primera instancia arranca descargando ~250 MB antes de que clamd
# quede listo — el startup probe de Cloud Run expira y el servicio nunca sube.
# Horneada, la instancia arranca en decenas de segundos y `freshclam -d` la pone
# al día en caliente.
FROM alpine:3.21 AS signatures

RUN apk add --no-cache clamav clamav-daemon freshclam ca-certificates

COPY freshclam.conf /etc/clamav/freshclam.conf

RUN mkdir -p /var/lib/clamav \
    && freshclam --stdout --config-file=/etc/clamav/freshclam.conf \
    && ls -la /var/lib/clamav

# ── Etapa 2: runtime ──────────────────────────────────────────────────────────
FROM alpine:3.21 AS runner

# clamav-libunrar habilita el scan dentro de RAR; nodejs corre el shim.
RUN apk add --no-cache clamav clamav-daemon freshclam clamav-libunrar nodejs ca-certificates tzdata \
    && mkdir -p /run/clamav /var/lib/clamav /app \
    && chown -R clamav:clamav /run/clamav /var/lib/clamav

COPY --from=signatures --chown=clamav:clamav /var/lib/clamav/ /var/lib/clamav/
COPY clamd.conf /etc/clamav/clamd.conf
COPY freshclam.conf /etc/clamav/freshclam.conf
COPY server.mjs /app/server.mjs
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV CLAMD_SOCKET=/run/clamav/clamd.sock
ENV CLAMAV_DB_DIR=/var/lib/clamav

EXPOSE 8080

# root en el arranque para poder chown /run/clamav; clamd baja a `clamav` por
# su propia config (User clamav). El shim no toca disco fuera de /var/lib/clamav.
CMD ["/usr/local/bin/entrypoint.sh"]
