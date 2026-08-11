#!/usr/bin/env bash
#
# TASK-1378 — ClamAV Malware Scanner: deploy a Cloud Run.
#
set -euo pipefail

# Usage:
#   ENV=staging    bash services/clamav/deploy.sh
#   ENV=production bash services/clamav/deploy.sh
#
# ENV es OBLIGATORIO — no hay default silencioso. A diferencia de los demás
# workers, este servicio no lee secretos ni toca PostgreSQL: sólo recibe bytes y
# devuelve un veredicto. El switch de ENV existe para nombrar el servicio y
# dejar explícito a qué runtime de Vercel se va a cablear el endpoint.

if [ -z "${ENV:-}" ]; then
  echo "ERROR: ENV debe declararse explícitamente — 'staging' o 'production'."
  echo "       Uso: ENV=staging bash services/clamav/deploy.sh"
  exit 1
fi

if [ "${ENV}" != "staging" ] && [ "${ENV}" != "production" ]; then
  echo "ERROR: ENV debe ser 'staging' o 'production', llegó '${ENV}'."
  exit 1
fi

PROJECT_ID="efeonce-group"
REGION="us-east4"
SERVICE_ACCOUNT="greenhouse-portal@${PROJECT_ID}.iam.gserviceaccount.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${ENV}" = "production" ]; then
  SERVICE_NAME="clamav"
  echo "=== PRODUCTION deployment ==="
else
  SERVICE_NAME="clamav-staging"
  echo "=== STAGING deployment ==="
fi

# Cloud Run — por qué estos números:
#   min=1        clamd tarda 20-40 s en cargar la base de firmas. Escalar a cero
#                haría que el primer CV del día pague ese cold start y el submit
#                público expire. Es el costo deliberado de la task (≈USD 19-25/mes).
#   max=3        el flujo es de baja frecuencia; el techo evita sorpresas de gasto.
#   memory=2Gi   la base de firmas es residente (~1,2-1,5 GiB) + margen de scan.
#   cpu=1        el scan de un PDF es de milisegundos una vez cargada la base.
#   concurrency  clamd serializa por instancia; 4 alcanza y evita contención.
#   timeout=120  muy por encima del timeout del adapter (10 s por defecto).
#
# Costo: cada servicio con min=1 son ≈USD 19/mes. Staging y producción a la vez
# son ≈USD 38/mes, no 19 — staging existe para el gate de EICAR, no para quedarse
# prendido. Al terminar la verificación, bajarlo:
#   gcloud run services delete clamav-staging --region us-east4
#   # o dejarlo frío:  MIN_INSTANCES=0 ENV=staging bash services/clamav/deploy.sh
# Con min=0 el primer scan paga 30-60 s de carga de firmas y el adapter corta a
# los 10 s: el veredicto sería `scanner_timeout`. Sirve para tenerlo desplegado
# sin gasto, NO para verificar contra él.
MIN_INSTANCES="${MIN_INSTANCES:-1}"
MAX_INSTANCES="3"
MEMORY="2Gi"
CPU="1"
TIMEOUT="120"
CONCURRENCY="4"

echo "=== Building ${SERVICE_NAME} image via Cloud Build ==="
echo "    Contexto: ${SCRIPT_DIR} (NO la raíz del repo — este servicio no comparte código con el portal)"

IMAGE="gcr.io/${PROJECT_ID}/clamav"

# El build hornea la base de firmas en la imagen; tarda varios minutos y pesa.
#
# `--async` + poll y no streaming: en GitHub Actions el deployer no es
# Viewer/Owner del bucket de logs por defecto, así que `gcloud builds submit`
# síncrono sale con exit 1 ("can only stream logs if you are Viewer/Owner")
# aunque el build esté corriendo bien. El estado del build es la verdad, no la
# capacidad de leer sus logs.
BUILD_ID="$(gcloud builds submit "${SCRIPT_DIR}" \
  --project="${PROJECT_ID}" \
  --tag="${IMAGE}" \
  --timeout=1800s \
  --async \
  --format='value(id)' \
  --quiet)"

if [ -z "${BUILD_ID}" ]; then
  echo "ERROR: Cloud Build no devolvió un id de build."
  exit 1
fi

echo "    Build ${BUILD_ID} en curso (hornear las firmas toma varios minutos)..."

BUILD_DEADLINE=$((SECONDS + 1800))

while [ ${SECONDS} -lt ${BUILD_DEADLINE} ]; do
  BUILD_STATUS="$(gcloud builds describe "${BUILD_ID}" \
    --project="${PROJECT_ID}" \
    --format='value(status)' 2>/dev/null || echo 'UNKNOWN')"

  case "${BUILD_STATUS}" in
    SUCCESS)
      echo "    Build ${BUILD_ID}: SUCCESS"
      break
      ;;
    FAILURE | TIMEOUT | CANCELLED | EXPIRED)
      echo "ERROR: build ${BUILD_ID} terminó en ${BUILD_STATUS}."
      echo "       Logs: https://console.cloud.google.com/cloud-build/builds/${BUILD_ID}?project=${PROJECT_ID}"
      exit 1
      ;;
  esac

  sleep 15
done

if [ "${BUILD_STATUS:-}" != "SUCCESS" ]; then
  echo "ERROR: build ${BUILD_ID} no terminó dentro de 1800 s (último estado: ${BUILD_STATUS:-desconocido})."
  exit 1
fi

# TASK-849/851 — GIT_SHA para la detección de drift del watchdog de release.
EXPECTED_SHA="${EXPECTED_SHA:-${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}}"

ENV_VARS="GIT_SHA=${EXPECTED_SHA}"
ENV_VARS="${ENV_VARS},CLAMAV_SIGNATURE_STALE_HOURS=${CLAMAV_SIGNATURE_STALE_HOURS:-168}"

echo "=== Deploying ${SERVICE_NAME} to Cloud Run (${REGION}) ==="

# Startup probe HTTP contra /ready — NO es cosmético, es load-bearing.
#
# Cloud Run da CPU plena sólo hasta que el startup probe pasa. El shim abre el
# puerto en ~1 s, así que con el probe TCP por defecto el boost se corta ahí y
# clamd queda cargando 3,6 M de firmas con CPU throttled a casi cero: nunca
# termina, /health responde `clamd: down` para siempre y el servicio queda
# inservible aunque Cloud Run lo reporte Ready=True (detectado live 2026-08-11;
# el síntoma se confunde con falta de memoria y NO lo es — con 4 GiB pasaba igual).
# El probe contra /ready mantiene el boost hasta que clamd contesta PONG.
#
# Ingress: DEFAULT (all), NO 'internal'.
#
# Vercel sale por internet pública, así que un Cloud Run con ingress restringido
# a la VPC sería inalcanzable desde el route handler que sube el CV. La postura correcta
# —y la que ya usan ico-batch y commercial-cost-worker— es exponer el endpoint
# pero cerrarlo con IAM: --no-allow-unauthenticated + roles/run.invoker sólo para
# greenhouse-portal@. El adapter presenta un ID token OIDC.
# NUNCA --allow-unauthenticated: el servicio recibiría bytes de cualquiera.
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${IMAGE}" \
  --service-account="${SERVICE_ACCOUNT}" \
  --memory="${MEMORY}" \
  --cpu="${CPU}" \
  --timeout="${TIMEOUT}" \
  --min-instances="${MIN_INSTANCES}" \
  --max-instances="${MAX_INSTANCES}" \
  --concurrency="${CONCURRENCY}" \
  --ingress=all \
  --no-allow-unauthenticated \
  --cpu-boost \
  --startup-probe="httpGet.path=/ready,initialDelaySeconds=10,periodSeconds=10,failureThreshold=30,timeoutSeconds=5" \
  --set-env-vars="${ENV_VARS}" \
  --quiet

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(status.url)")

READY="$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.conditions[0].status)')"

REVISION="$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.latestReadyRevisionName)')"

echo "=== Service deployed at: ${SERVICE_URL} ==="
echo "=== Ready revision: ${REVISION} (service ready=${READY}) ==="

# Guardrail duro: si alguien alguna vez despliega esto con acceso público, los
# bytes de cualquiera llegan al scanner. Abortar ruidosamente.
if gcloud run services get-iam-policy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format=json | grep -q '"allUsers"'; then
  echo "ERROR: ${SERVICE_NAME} tiene allUsers en su IAM policy. El scanner NUNCA debe ser público."
  echo "       Remediar: gcloud run services remove-iam-policy-binding ${SERVICE_NAME} --member=allUsers --role=roles/run.invoker --region=${REGION}"
  exit 1
fi

echo "=== Ensuring ${SERVICE_ACCOUNT} has roles/run.invoker ==="
gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" \
  --quiet >/dev/null

if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "=== Skipping health check (CI mode) ==="
else
  echo "=== Running health check (via authenticated proxy) ==="

  HEALTH_PORT=19094
  gcloud run services proxy "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --port="${HEALTH_PORT}" &
  PROXY_PID=$!

  HEALTH_OK=false
  # clamd carga la base de firmas: dar margen real, no 15 s.
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 6
    if curl -sf "http://localhost:${HEALTH_PORT}/health" | python3 -m json.tool 2>/dev/null; then
      HEALTH_OK=true
      break
    fi
    echo "  health check intento ${i}/10 — clamd puede seguir cargando firmas..."
  done

  kill "${PROXY_PID}" 2>/dev/null || true
  wait "${PROXY_PID}" 2>/dev/null || true

  if [ "${HEALTH_OK}" != "true" ]; then
    echo "ERROR: health check falló. NO cablear ASSET_MALWARE_SCAN_ENDPOINT todavía —"
    echo "       con el flag ON y el servicio caído, el veredicto es 'error' y se"
    echo "       bloquean TODAS las subidas de CV (fail-closed, por diseño)."
    exit 1
  fi
fi

echo ""
echo "=== Próximo paso (NO automático) ==="
echo "  1. Verificar EICAR contra el servicio antes de prender nada."
echo "  2. vercel env add ASSET_MALWARE_SCAN_ENDPOINT  → ${SERVICE_URL}"
echo "  3. vercel env add ASSET_MALWARE_SCAN_ENABLED   → true"
echo "  4. Redeploy de Vercel (las env vars no se toman en caliente)."
echo "  5. Actualizar docs/operations/FEATURE_FLAG_STATE_LEDGER.md con runtime + fecha + evidencia."
