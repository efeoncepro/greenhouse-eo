#!/usr/bin/env bash
# artifact-worker — deploy del Cloud Run JOB (TASK-1391).
#
# PRIMER Cloud Run Job del ecosistema (frontera autorizada 2026-07-12, excepción documentada
# EPIC-027). A diferencia de los services (`gcloud run deploy`), un Job no expone HTTP y se
# ejecuta por invocación (`jobs run` / Jobs API) — una ejecución = un artefacto.
#
# ⚠️ Este archivo es el SoT de las env vars del Job en Cloud Run (regla del repo):
# `--set-env-vars` es DESTRUCTIVO — toda var agregada out-of-band desaparece en el próximo
# deploy. El flag ARTIFACT_RENDER_JOBS_ENABLED vive DECLARADO acá (default false) y su fila en
# docs/operations/FEATURE_FLAG_STATE_LEDGER.md.
#
# Uso: ENV=staging bash services/artifact-worker/deploy.sh
#      (production se habilita sólo tras staging smoke + sign-off — ver runbook)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# shellcheck source=../_shared/gcloud-secret-iam.sh
source "${REPO_ROOT}/services/_shared/gcloud-secret-iam.sh"

PROJECT_ID="${PROJECT_ID:-efeonce-group}"
REGION="${REGION:-us-east4}"
JOB_NAME="artifact-worker"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-greenhouse-portal@efeonce-group.iam.gserviceaccount.com}"

# El render de un deck de 25 láminas midió 6,2 s / RSS node ~260 MB en local (Slice 0).
# Envelope inicial holgado; se ajusta con datos de staging, no a ojo.
MEMORY="${MEMORY:-2Gi}"
CPU="${CPU:-2}"
TASK_TIMEOUT="${TASK_TIMEOUT:-900}"
# El retry es del DOMINIO (proposal_render_jobs.attempts), no de Cloud Run: 0 reintentos acá
# para que ninguna re-ejecución ocurra fuera del contrato del job record.
MAX_RETRIES="${MAX_RETRIES:-0}"

ENV="${ENV:-}"

if [[ "${ENV}" != "staging" && "${ENV}" != "production" ]]; then
  echo "ENV es requerido: staging | production" >&2
  exit 1
fi

if [[ "${ENV}" == "production" ]]; then
  STORAGE_ENV="prod"
else
  STORAGE_ENV="staging"
fi

PG_PASSWORD_REF="${PG_PASSWORD_REF:-greenhouse-pg-dev-app-password:latest}"
PG_INSTANCE="${PG_INSTANCE:-efeonce-group:us-east4:greenhouse-pg-dev}"

GIT_SHA="$(git -C "${REPO_ROOT}" rev-parse HEAD)"
IMAGE="us-east4-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${JOB_NAME}:${GIT_SHA}"

echo "── artifact-worker deploy ── ENV=${ENV} SHA=${GIT_SHA:0:9}"

# ── Build (Cloud Build async + poll — patrón ops-worker: sin log-streaming del SA) ──────────

BUILD_ID="$(gcloud builds submit "${REPO_ROOT}" \
  --project="${PROJECT_ID}" \
  --config=/dev/stdin \
  --async \
  --format='value(id)' <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${IMAGE}', '-f', 'services/artifact-worker/Dockerfile', '.']
images: ['${IMAGE}']
options:
  machineType: 'E2_HIGHCPU_8'
EOF
)"

echo "build: ${BUILD_ID} (poll…)"

while true; do
  STATUS="$(gcloud builds describe "${BUILD_ID}" --project="${PROJECT_ID}" --format='value(status)')"

  case "${STATUS}" in
    SUCCESS) echo "build OK"; break ;;
    FAILURE | CANCELLED | TIMEOUT | EXPIRED) echo "build ${STATUS}" >&2; exit 1 ;;
    *) sleep 15 ;;
  esac
done

# ── Env vars DECLARATIVAS (SoT — no agregar vars out-of-band) ────────────────────────────────

ENV_VARS="NODE_ENV=production"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=${PG_INSTANCE}"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_DATABASE=greenhouse_app"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_USER=greenhouse_app"
ENV_VARS="${ENV_VARS},GREENHOUSE_STORAGE_ENV=${STORAGE_ENV}"
ENV_VARS="${ENV_VARS},GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"
# 🚩 Flag del pipeline de render (ledger: FEATURE_FLAG_STATE_LEDGER.md). Default OFF:
# el Job invocado con el flag apagado registra skip y sale 0 — no renderiza.
ENV_VARS="${ENV_VARS},ARTIFACT_RENDER_JOBS_ENABLED=${ARTIFACT_RENDER_JOBS_ENABLED:-false}"

SECRETS="GREENHOUSE_POSTGRES_PASSWORD=${PG_PASSWORD_REF}"

SENTRY_DSN_SECRET_NAME="${SENTRY_DSN_SECRET_NAME:-greenhouse-sentry-dsn}"

if gcloud secrets describe "${SENTRY_DSN_SECRET_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  SECRETS="${SECRETS},SENTRY_DSN=${SENTRY_DSN_SECRET_NAME}:latest"
  ensure_secret_accessor_binding "${SENTRY_DSN_SECRET_NAME}:latest"
fi

ensure_secret_accessor_binding "${PG_PASSWORD_REF}"

# ── Deploy del Job ───────────────────────────────────────────────────────────────────────────

gcloud run jobs deploy "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${IMAGE}" \
  --service-account="${SERVICE_ACCOUNT}" \
  --memory="${MEMORY}" \
  --cpu="${CPU}" \
  --task-timeout="${TASK_TIMEOUT}" \
  --max-retries="${MAX_RETRIES}" \
  --tasks=1 \
  --parallelism=1 \
  --set-env-vars="${ENV_VARS}" \
  --set-secrets="${SECRETS}" \
  --labels="git-sha=${GIT_SHA:0:40},managed-by=deploy-sh"

# El dispatcher (ops-worker, misma SA) invoca la Jobs API: run.invoker sobre el Job.
gcloud run jobs add-iam-policy-binding "${JOB_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" >/dev/null

# ── Verificación fail-loud: la imagen desplegada ES este SHA ────────────────────────────────

DEPLOYED_SHA="$(gcloud run jobs describe "${JOB_NAME}" --project="${PROJECT_ID}" --region="${REGION}" \
  --format='value(metadata.labels.git-sha)')"

if [[ "${DEPLOYED_SHA}" != "${GIT_SHA:0:40}" ]]; then
  echo "❌ SHA desplegado (${DEPLOYED_SHA}) ≠ esperado (${GIT_SHA:0:40})" >&2
  exit 1
fi

echo "✓ artifact-worker desplegado (${ENV}, flag=${ARTIFACT_RENDER_JOBS_ENABLED:-false})"
echo "  Ejecución manual de smoke:"
echo "  gcloud run jobs execute ${JOB_NAME} --project=${PROJECT_ID} --region=${REGION} \\"
echo "    --update-env-vars=RENDER_JOB_ID=<id> --wait"
