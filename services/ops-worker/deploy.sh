#!/usr/bin/env bash
#
# Ops Worker — Cloud Run Deployment
#
# Usage:
#   cd /path/to/greenhouse-eo
#   bash services/ops-worker/deploy.sh
#
# Prerequisites:
#   - gcloud CLI authenticated with efeonce-group project
#   - Docker installed (for local build) or gcloud builds submit
#
# The script deploys the service and creates Cloud Scheduler jobs.
# Re-running is safe — all commands are idempotent.

set -euo pipefail

# ─── Environment ─────────────────────────────────────────────────────────────
# Usage:
#   ENV=staging    bash services/ops-worker/deploy.sh
#   ENV=production bash services/ops-worker/deploy.sh
#
# ENV is REQUIRED — there is no silent default. The ops-worker is a SINGLE
# Cloud Run service intentionally shared by both staging and production
# (same DB, same scheduler jobs, same runtime revision). This is the canonical
# topology, not a temporary shortcut. ENV only selects which NEXTAUTH /
# RESEND secret refs get mounted, so a wrong ENV silently swaps credentials
# on a live shared service. Forcing the caller to be explicit is hygiene —
# the GitHub Actions workflow derives ENV from the branch (develop→staging,
# main→production) and local operators must type it.

if [ -z "${ENV:-}" ]; then
  echo "ERROR: ENV must be set explicitly — 'staging' or 'production'."
  echo "       ops-worker is a shared service; silent defaults are unsafe."
  echo "       Usage: ENV=staging bash services/ops-worker/deploy.sh"
  exit 1
fi

if [ "${ENV}" != "staging" ] && [ "${ENV}" != "production" ]; then
  echo "ERROR: ENV must be 'staging' or 'production', got '${ENV}'."
  exit 1
fi

# ─── Configuration ───────────────────────────────────────────────────────────

PROJECT_ID="efeonce-group"
REGION="us-east4"
SERVICE_NAME="ops-worker"
SERVICE_ACCOUNT="greenhouse-portal@${PROJECT_ID}.iam.gserviceaccount.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "${SCRIPT_DIR}/../_shared/gcloud-secret-iam.sh"

# Cloud Run settings — enterprise tier (TASK-379 Slice 3)
# Rationale:
#   - min=0 lets the service scale to zero between bursts (cost control).
#   - max=5 allows horizontal fan-out under backlog pressure.
#   - cpu=2/memory=2Gi gives headroom for concurrent reactive batches.
#   - concurrency=4 permits multi-batch processing per instance; multi-instance
#     safety is provided by refresh_queue SELECT ... FOR UPDATE SKIP LOCKED and
#     outbox_reactive_log's INSERT ... ON CONFLICT DO NOTHING idempotency key.
#   - timeout=540s (9 min) covers worst-case materialization runs.
MIN_INSTANCES="0"
MAX_INSTANCES="5"
MEMORY="2Gi"
CPU="2"
# TIMEOUT=3600s (60 min, Cloud Run máximo): el AI Visibility Grader async
# (/growth/grader/drain, TASK-1234) ejecuta un run `full`/`internal_audit`
# multi-provider de forma secuencial (hasta ~16 prompts × 4 providers × ~35s ≈ 37
# min con Gemini 3 ≈ 56s/call) DENTRO del request Cloud Run — el timeout del request
# es el límite duro real (el attempt-deadline del scheduler que se rinde NO mata el
# request en vuelo). El resto de handlers (reactive/outbox/finance) terminan en
# segundos; subir el techo no cambia su comportamiento, sólo deja correr al grader.
TIMEOUT="3600"
CONCURRENCY="4"
REACTIVE_BATCH_SIZE="500"
DEFAULT_EMAIL_FROM="Efeonce Greenhouse <greenhouse@efeoncepro.com>"
HUBSPOT_SERVICE_NAME="hubspot-greenhouse-integration"
HUBSPOT_SERVICE_REGION="us-central1"
DEFAULT_GLOBE_API_BASE_URL="https://globe-api-internal-a6odmgzpvq-tl.a.run.app"
DEFAULT_GLOBE_GCP_PROJECT="efeonce-globe"
DEFAULT_GLOBE_GCP_SERVICE_ACCOUNT_EMAIL="greenhouse-globe-caller@efeonce-globe.iam.gserviceaccount.com"

# Cloud Scheduler timezone
SCHEDULER_TZ="America/Santiago"

# Environment-specific defaults (overridable)
if [ "${ENV}" = "production" ]; then
  DEFAULT_NEXTAUTH_SECRET_REF="greenhouse-nextauth-secret-production:latest"
  # Production currently shares the canonical Cloud SQL instance and app password
  # with the rest of the portal runtime. Keep the contract overrideable so the
  # script can move to dedicated prod infrastructure without another refactor.
  DEFAULT_PG_PASSWORD_REF="greenhouse-pg-dev-app-password:latest"
  DEFAULT_PG_INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
  DEFAULT_RESEND_API_KEY_SECRET_REF="greenhouse-resend-api-key-production"
  DEFAULT_GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF="greenhouse-integration-api-token"
  DEFAULT_NUBOX_BEARER_TOKEN_SECRET_REF="greenhouse-nubox-bearer-token-production"
  DEFAULT_NUBOX_X_API_KEY_SECRET_REF="greenhouse-nubox-x-api-key-production"
  DEFAULT_AZURE_AD_CLIENT_SECRET_REF="greenhouse-azure-ad-client-secret-production:latest"
  echo "=== PRODUCTION deployment ==="
else
  DEFAULT_NEXTAUTH_SECRET_REF="greenhouse-nextauth-secret-staging:latest"
  DEFAULT_PG_PASSWORD_REF="greenhouse-pg-dev-app-password:latest"
  DEFAULT_PG_INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
  DEFAULT_RESEND_API_KEY_SECRET_REF="greenhouse-resend-api-key-staging"
  DEFAULT_GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF="greenhouse-integration-api-token"
  DEFAULT_NUBOX_BEARER_TOKEN_SECRET_REF="greenhouse-nubox-bearer-token-staging"
  DEFAULT_NUBOX_X_API_KEY_SECRET_REF="greenhouse-nubox-x-api-key-staging"
  DEFAULT_AZURE_AD_CLIENT_SECRET_REF="greenhouse-azure-ad-client-secret-staging:latest"
  echo "=== STAGING deployment ==="
fi

# ops-worker is a shared runtime for staging and production. Its identity smoke
# must probe the public production domain: staging is protected by Vercel SSO
# and would turn every successful staging deploy into a false Sentry failure.
DEFAULT_GREENHOUSE_PORTAL_BASE_URL="https://greenhouse.efeoncepro.com"

NEXTAUTH_SECRET_REF="${NEXTAUTH_SECRET_REF:-${DEFAULT_NEXTAUTH_SECRET_REF}}"
PG_PASSWORD_REF="${PG_PASSWORD_REF:-${DEFAULT_PG_PASSWORD_REF}}"
PG_INSTANCE="${PG_INSTANCE:-${DEFAULT_PG_INSTANCE}}"
RESEND_API_KEY_SECRET_REF="${RESEND_API_KEY_SECRET_REF:-${DEFAULT_RESEND_API_KEY_SECRET_REF}}"
GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF="${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF:-${DEFAULT_GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF}}"
NUBOX_API_BASE_URL="${NUBOX_API_BASE_URL:-https://api.pyme.nubox.com/nbxpymapi-environment-pyme/v1}"
NUBOX_BEARER_TOKEN_SECRET_REF="${NUBOX_BEARER_TOKEN_SECRET_REF:-${DEFAULT_NUBOX_BEARER_TOKEN_SECRET_REF}}"
NUBOX_X_API_KEY_SECRET_REF="${NUBOX_X_API_KEY_SECRET_REF:-${DEFAULT_NUBOX_X_API_KEY_SECRET_REF}}"
EMAIL_FROM="${EMAIL_FROM:-${DEFAULT_EMAIL_FROM}}"
HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL="${HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL:-$(gcloud run services describe "${HUBSPOT_SERVICE_NAME}" --project="${PROJECT_ID}" --region="${HUBSPOT_SERVICE_REGION}" --format='value(status.url)')}"
GREENHOUSE_PORTAL_BASE_URL="${GREENHOUSE_PORTAL_BASE_URL:-${DEFAULT_GREENHOUSE_PORTAL_BASE_URL}}"
AZURE_AD_CLIENT_ID="${AZURE_AD_CLIENT_ID:-3626642f-0451-4eb2-8c29-d2211ab3176c}"
AZURE_AD_CLIENT_SECRET_REF="${AZURE_AD_CLIENT_SECRET_REF:-${DEFAULT_AZURE_AD_CLIENT_SECRET_REF}}"
GLOBE_API_BASE_URL="${GLOBE_API_BASE_URL:-${DEFAULT_GLOBE_API_BASE_URL}}"
GLOBE_API_AUDIENCE="${GLOBE_API_AUDIENCE:-${GLOBE_API_BASE_URL}}"
GLOBE_GCP_PROJECT="${GLOBE_GCP_PROJECT:-${DEFAULT_GLOBE_GCP_PROJECT}}"
GLOBE_GCP_SERVICE_ACCOUNT_EMAIL="${GLOBE_GCP_SERVICE_ACCOUNT_EMAIL:-${DEFAULT_GLOBE_GCP_SERVICE_ACCOUNT_EMAIL}}"

require_non_empty() {
  local name="$1"
  local value="$2"

  if [ -z "${value}" ]; then
    echo "ERROR: ${name} must be set for ops-worker deploy."
    exit 1
  fi
}

require_non_empty "NUBOX_API_BASE_URL" "${NUBOX_API_BASE_URL}"
require_non_empty "NUBOX_BEARER_TOKEN_SECRET_REF" "${NUBOX_BEARER_TOKEN_SECRET_REF}"
require_non_empty "NUBOX_X_API_KEY_SECRET_REF" "${NUBOX_X_API_KEY_SECRET_REF}"
require_non_empty "GREENHOUSE_PORTAL_BASE_URL" "${GREENHOUSE_PORTAL_BASE_URL}"
require_non_empty "AZURE_AD_CLIENT_ID" "${AZURE_AD_CLIENT_ID}"
require_non_empty "AZURE_AD_CLIENT_SECRET_REF" "${AZURE_AD_CLIENT_SECRET_REF}"
require_non_empty "GLOBE_API_BASE_URL" "${GLOBE_API_BASE_URL}"
require_non_empty "GLOBE_API_AUDIENCE" "${GLOBE_API_AUDIENCE}"
require_non_empty "GLOBE_GCP_PROJECT" "${GLOBE_GCP_PROJECT}"
require_non_empty "GLOBE_GCP_SERVICE_ACCOUNT_EMAIL" "${GLOBE_GCP_SERVICE_ACCOUNT_EMAIL}"

# ─── Build & Deploy to Cloud Run ─────────────────────────────────────────────

echo "=== Building ${SERVICE_NAME} image via Cloud Build ==="

# Build using Cloud Build with inline config (--source --dockerfile is not supported;
# --config and --tag are mutually exclusive, so we use inline cloudbuild.yaml)
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Submit build in async mode and poll for status. gcloud builds submit
# normally streams logs in real-time, but the deployer SA cannot read
# Cloud Build's default GCS logs bucket (requires project Viewer/Owner).
# Async + poll avoids the log-streaming dependency entirely.
BUILD_ID=$(gcloud builds submit . \
  --project="${PROJECT_ID}" \
  --async \
  --format='value(id)' \
  --config=/dev/stdin <<CLOUDBUILD_EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: bash
    secretEnv:
      - AXIS_PACKAGES_READ_TOKEN
    args:
      - -ceu
      - |
        trap 'rm -f .npmrc' EXIT
        umask 077
        printf '%s\n' \
          '@efeoncepro:registry=https://npm.pkg.github.com' \
          "//npm.pkg.github.com/:_authToken=\$\${AXIS_PACKAGES_READ_TOKEN}" > .npmrc
        DOCKER_BUILDKIT=1 docker build \
          --secret id=axis_npmrc,src=.npmrc \
          -t '${IMAGE}' \
          -f 'services/ops-worker/Dockerfile' \
          .
images:
  - '${IMAGE}'
availableSecrets:
  secretManager:
    - versionName: projects/efeonce-group/secrets/axis-packages-read-token/versions/latest
      env: AXIS_PACKAGES_READ_TOKEN
options:
  logging: CLOUD_LOGGING_ONLY
CLOUDBUILD_EOF
)

if [ -z "${BUILD_ID}" ]; then
  echo "ERROR: Cloud Build submit failed — no build ID returned."
  exit 1
fi

echo "=== Build submitted: ${BUILD_ID} — polling for completion ==="

BUILD_STATUS=""
POLL_COUNT=0
MAX_POLLS=60  # 60 × 10s = 10 min max wait

while [ "${BUILD_STATUS}" != "SUCCESS" ] && [ "${BUILD_STATUS}" != "FAILURE" ] && [ "${BUILD_STATUS}" != "TIMEOUT" ] && [ "${BUILD_STATUS}" != "CANCELLED" ]; do
  POLL_COUNT=$((POLL_COUNT + 1))
  if [ "${POLL_COUNT}" -gt "${MAX_POLLS}" ]; then
    echo "ERROR: Build ${BUILD_ID} did not complete within $((MAX_POLLS * 10))s."
    exit 1
  fi
  sleep 10
  BUILD_STATUS=$(gcloud builds describe "${BUILD_ID}" \
    --project="${PROJECT_ID}" \
    --format='value(status)' 2>/dev/null || echo "UNKNOWN")
  echo "  poll ${POLL_COUNT}/${MAX_POLLS}: status=${BUILD_STATUS}"
done

if [ "${BUILD_STATUS}" != "SUCCESS" ]; then
  echo "ERROR: Cloud Build ${BUILD_ID} finished with status ${BUILD_STATUS}."
  echo "       Logs: https://console.cloud.google.com/cloud-build/builds/${BUILD_ID}?project=${PROJECT_ID}"
  exit 1
fi

echo "=== Build ${BUILD_ID} succeeded ==="

echo "=== Deploying ${SERVICE_NAME} to Cloud Run (${REGION}) ==="

# Environment variables (non-sensitive)
ENV_VARS="NODE_ENV=production"
ENV_VARS="${ENV_VARS},GCP_PROJECT=${PROJECT_ID}"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=${PG_INSTANCE}"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_DATABASE=greenhouse_app"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_USER=greenhouse_app"
# TASK-1391 — flag del pipeline de render (multi-runtime; SoT Cloud Run = deploy.sh; ledger:
# docs/operations/FEATURE_FLAG_STATE_LEDGER.md). El dispatcher lo lee; OFF ⇒ skip logueado.
# 🚩 ON desde 2026-07-12 (autorizado por el operador). ⚠️ El ops-worker es un servicio ÚNICO
# (staging y production comparten revisión): prenderlo acá habilita el DISPATCHER, no el enqueue.
# La puerta real de producción sigue siendo Vercel PROD, que NO tiene la var (nadie encola desde
# prod) + el entitlement per-ORG `proposal_studio_v1`. Ledger: FEATURE_FLAG_STATE_LEDGER.md
ENV_VARS="${ENV_VARS},ARTIFACT_RENDER_JOBS_ENABLED=${ARTIFACT_RENDER_JOBS_ENABLED:-true}"
ENV_VARS="${ENV_VARS},REACTIVE_BATCH_SIZE=${REACTIVE_BATCH_SIZE}"
ENV_VARS="${ENV_VARS},EMAIL_FROM=${EMAIL_FROM}"
ENV_VARS="${ENV_VARS},GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF=${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF}"
ENV_VARS="${ENV_VARS},HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL=${HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL}"
ENV_VARS="${ENV_VARS},NUBOX_API_BASE_URL=${NUBOX_API_BASE_URL}"
ENV_VARS="${ENV_VARS},NUBOX_BEARER_TOKEN_SECRET_REF=${NUBOX_BEARER_TOKEN_SECRET_REF}"
ENV_VARS="${ENV_VARS},NUBOX_X_API_KEY_SECRET_REF=${NUBOX_X_API_KEY_SECRET_REF}"
ENV_VARS="${ENV_VARS},GREENHOUSE_PORTAL_BASE_URL=${GREENHOUSE_PORTAL_BASE_URL}"
ENV_VARS="${ENV_VARS},AZURE_AD_CLIENT_ID=${AZURE_AD_CLIENT_ID}"
ENV_VARS="${ENV_VARS},GLOBE_API_BASE_URL=${GLOBE_API_BASE_URL}"
ENV_VARS="${ENV_VARS},GLOBE_API_AUDIENCE=${GLOBE_API_AUDIENCE}"
ENV_VARS="${ENV_VARS},GLOBE_GCP_PROJECT=${GLOBE_GCP_PROJECT}"
ENV_VARS="${ENV_VARS},GLOBE_GCP_SERVICE_ACCOUNT_EMAIL=${GLOBE_GCP_SERVICE_ACCOUNT_EMAIL}"

# TASK-742 + TASK-870 — `AZURE_AD_CLIENT_ID` requerido por `/smoke/identity-auth-providers`
# (probe `azure_authorize_endpoint`) en `server.ts`. Es un public GUID, NO un secreto
# (no es el client_secret). Sin esto el smoke cron emite Sentry burst "AZURE_AD_CLIENT_ID
# unset" cada 5min → preflight check `sentry_critical_issues` bloquea production release
# orchestrator. Override en CI/local: `AZURE_AD_CLIENT_ID=<other-guid> bash deploy.sh`.
AZURE_AD_CLIENT_ID="${AZURE_AD_CLIENT_ID:-3626642f-0451-4eb2-8c29-d2211ab3176c}"
ENV_VARS="${ENV_VARS},AZURE_AD_CLIENT_ID=${AZURE_AD_CLIENT_ID}"

# TASK-870 — `GREENHOUSE_PORTAL_BASE_URL` requerido por `/smoke/identity-auth-providers`
# (probe `portal_auth_health` que pingea `${portalUrl}/api/auth/health`). Default a la
# production custom domain (única sin Vercel SSO Protection per CLAUDE.md "Vercel
# Deployment Protection"). Si apunta a `dev-greenhouse.efeoncepro.com` (staging) o a
# cualquier `.vercel.app` URL, Vercel SSO intercepta con 401 → smoke fail → Sentry burst.
# Override staging: `GREENHOUSE_PORTAL_BASE_URL=https://dev-greenhouse.efeoncepro.com bash deploy.sh`.
GREENHOUSE_PORTAL_BASE_URL="${GREENHOUSE_PORTAL_BASE_URL:-https://greenhouse.efeoncepro.com}"
ENV_VARS="${ENV_VARS},GREENHOUSE_PORTAL_BASE_URL=${GREENHOUSE_PORTAL_BASE_URL}"

# TASK-638 — Reliability AI Observer kill-switch.
# Declarativo en deploy.sh para que `--set-env-vars` (destructivo) NO lo
# borre en cada redeploy. Default true en staging, configurable via env.
# Para apagar: `RELIABILITY_AI_OBSERVER_ENABLED=false bash deploy.sh`.
RELIABILITY_AI_OBSERVER_ENABLED="${RELIABILITY_AI_OBSERVER_ENABLED:-true}"
ENV_VARS="${ENV_VARS},RELIABILITY_AI_OBSERVER_ENABLED=${RELIABILITY_AI_OBSERVER_ENABLED}"

# TASK-769 — Cloud Cost FinOps AI kill-switch.
# Deterministic cost alerts run even when this is false. AI interpretation is
# opt-in because every Gemini call costs tokens. Enable explicitly with:
# `CLOUD_COST_AI_COPILOT_ENABLED=true ENV=staging bash services/ops-worker/deploy.sh`.
CLOUD_COST_AI_COPILOT_ENABLED="${CLOUD_COST_AI_COPILOT_ENABLED:-false}"
ENV_VARS="${ENV_VARS},CLOUD_COST_AI_COPILOT_ENABLED=${CLOUD_COST_AI_COPILOT_ENABLED}"

# TASK-356 / EPIC-011 — Hiring handoff downstream bridges.
# Declarativo en deploy.sh porque `--set-env-vars` es destructivo: el Reliability
# AI Observer corre en este worker y evalua `hiring.internal_hire_awaiting_onboarding`
# con este flag. Vercel tambien lo consume para la UI/API de Hiring Activation.
# Rollback (<5min): `gcloud run services update ops-worker --update-env-vars HIRING_HANDOFF_BRIDGES_ENABLED=false`.
HIRING_HANDOFF_BRIDGES_ENABLED="${HIRING_HANDOFF_BRIDGES_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_HANDOFF_BRIDGES_ENABLED=${HIRING_HANDOFF_BRIDGES_ENABLED}"

# TASK-990 / TASK-995 / TASK-1210 — Finance multi-currency MXN + CLF activación.
# El ops-worker corre el Nubox sync (/nubox/sync, /nubox/quotes-hot-sync) que
# materializa income; estos flags gatean el plano nativo MXN + la proyección CLF.
# Declarativo acá para que `--set-env-vars` (destructivo) NO los borre en cada
# redeploy. Activados en producción 2026-06-22 (release develop→main, sign-off CEO).
# Rollback (<5min): `FINANCE_CORE_MXN_ENABLED=false ... bash services/ops-worker/deploy.sh`.
FINANCE_CORE_MXN_ENABLED="${FINANCE_CORE_MXN_ENABLED:-true}"
ENV_VARS="${ENV_VARS},FINANCE_CORE_MXN_ENABLED=${FINANCE_CORE_MXN_ENABLED}"
NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED="${NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED:-true}"
ENV_VARS="${ENV_VARS},NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED=${NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED}"
FINANCE_MXN_PAYMENT_ORDERS_ENABLED="${FINANCE_MXN_PAYMENT_ORDERS_ENABLED:-true}"
ENV_VARS="${ENV_VARS},FINANCE_MXN_PAYMENT_ORDERS_ENABLED=${FINANCE_MXN_PAYMENT_ORDERS_ENABLED}"
FINANCE_MULTI_CURRENCY_REPORTING_ENABLED="${FINANCE_MULTI_CURRENCY_REPORTING_ENABLED:-true}"
ENV_VARS="${ENV_VARS},FINANCE_MULTI_CURRENCY_REPORTING_ENABLED=${FINANCE_MULTI_CURRENCY_REPORTING_ENABLED}"
FINANCE_CORE_CLF_INDEXED_ENABLED="${FINANCE_CORE_CLF_INDEXED_ENABLED:-true}"
ENV_VARS="${ENV_VARS},FINANCE_CORE_CLF_INDEXED_ENABLED=${FINANCE_CORE_CLF_INDEXED_ENABLED}"
FINANCE_CLF_INCOME_PROJECTION_ENABLED="${FINANCE_CLF_INCOME_PROJECTION_ENABLED:-true}"
ENV_VARS="${ENV_VARS},FINANCE_CLF_INCOME_PROJECTION_ENABLED=${FINANCE_CLF_INCOME_PROJECTION_ENABLED}"
FINANCE_CLF_OBLIGATIONS_ENABLED="${FINANCE_CLF_OBLIGATIONS_ENABLED:-true}"
ENV_VARS="${ENV_VARS},FINANCE_CLF_OBLIGATIONS_ENABLED=${FINANCE_CLF_OBLIGATIONS_ENABLED}"
FINANCE_CLF_REPORTING_ENABLED="${FINANCE_CLF_REPORTING_ENABLED:-true}"
ENV_VARS="${ENV_VARS},FINANCE_CLF_REPORTING_ENABLED=${FINANCE_CLF_REPORTING_ENABLED}"

# TASK-916 — RpA V2 writeback (Flip A). Cuando true, el consumer reactivo
# `notion_rpa_writeback` hace PATCH a la propiedad Notion `[GH] RpA v2` (separada
# de la formula legacy `RpA` — coexistencia Strangler; NO toca el bono, que sigue
# leyendo `rpa_avg` legacy via `BONUS_USE_RPA_V2` separado). Default false.
# Declarativo acá para que `--set-env-vars` (destructivo) NO lo borre en cada
# redeploy — mismo patron que NOTION_TOKEN (leccion TASK-912). Activado 2026-05-21
# por override de dueno (Efeonce + Sky simultaneo) sobre el stop-gate "Efeonce
# primero" del ADR Strangler; ver Handoff. Apagar para rollback (<5min):
# `NOTION_RPA_WRITEBACK_ENABLED=false ENV=<env> bash services/ops-worker/deploy.sh`
# o `gcloud run services update ops-worker --update-env-vars NOTION_RPA_WRITEBACK_ENABLED=false`.
NOTION_RPA_WRITEBACK_ENABLED="${NOTION_RPA_WRITEBACK_ENABLED:-true}"
ENV_VARS="${ENV_VARS},NOTION_RPA_WRITEBACK_ENABLED=${NOTION_RPA_WRITEBACK_ENABLED}"

# TASK-921 (M0) — captura de cambios de fecha limite (task_due_date_changes).
# Gatea el consumer reactivo notion_due_date_change_capture (reusa el evento
# notion.task.page_change_signal de TASK-912). SHADOW: solo puebla la tabla de
# captura; NO toca el bono. Declarativo acá para que --set-env-vars (destructivo)
# NO lo borre en cada redeploy. Activado por etapas 2026-05-24 (staging via push
# develop; produccion en el proximo release develop->main limpio). Rollback (<5min):
# `NOTION_DUE_DATE_CAPTURE_ENABLED=false ENV=<env> bash services/ops-worker/deploy.sh`.
NOTION_DUE_DATE_CAPTURE_ENABLED="${NOTION_DUE_DATE_CAPTURE_ENABLED:-true}"
ENV_VARS="${ENV_VARS},NOTION_DUE_DATE_CAPTURE_ENABLED=${NOTION_DUE_DATE_CAPTURE_ENABLED}"

# TASK-922 (M2) — computo shadow de atraso imputable (task_attributable_lateness_shadow).
# Gatea el consumer reactivo notion_attributable_lateness_compute (reusa
# notion.task.status_transitioned). SHADOW: solo puebla la tabla shadow que NADIE
# lee; NO toca el bono (el cutover M3 es task futura gated, separado). Declarativo
# para que --set-env-vars no lo borre. Activado por etapas 2026-05-24. Rollback (<5min):
# `ATTRIBUTABLE_LATENESS_OTD_ENABLED=false ENV=<env> bash services/ops-worker/deploy.sh`.
ATTRIBUTABLE_LATENESS_OTD_ENABLED="${ATTRIBUTABLE_LATENESS_OTD_ENABLED:-true}"
ENV_VARS="${ENV_VARS},ATTRIBUTABLE_LATENESS_OTD_ENABLED=${ATTRIBUTABLE_LATENESS_OTD_ENABLED}"

# CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED (TASK-977): habilita la liquidación al banco de
# contractor payables vía el safety-net reactivo `record-payment-from-order` (rama aditiva;
# el path de nómina NO cambia). Declarativo acá para que `--set-env-vars` (destructivo) NO lo
# borre. Activado 2026-05-31 (prod + staging) con finance sign-off del operador. Rollback (<5min):
# `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED=false ENV=<env> bash services/ops-worker/deploy.sh`
# o `gcloud run services update ops-worker --update-env-vars CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED=false`.
CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED="${CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED:-true}"
ENV_VARS="${ENV_VARS},CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED=${CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED}"

# TASK-1094 — auto-ingest de Knowledge por webhook Notion. El consumer reactivo
# `knowledge_notion_ingest` re-fetchea la página cambiada y la re-ingiere/deprecia.
# NOTION_KNOWLEDGE_TOKEN_SECRET_REF = nombre del secret del token de la integración
# "Greenhouse KNOW" (scoped al teamspace de conocimiento), resuelto en runtime vía
# resolveSecretByRef (accessor binding del SA garantizado abajo). NOTION_KNOWLEDGE_WEBHOOK_ENABLED
# gatea el path. Declarativo acá para que `--set-env-vars` (destructivo) NO los borre en cada
# redeploy (misma lección que NOTION_TOKEN / TASK-912). Activado 2026-06-13 (prod). Rollback (<5min):
# `gcloud run services update ops-worker --update-env-vars NOTION_KNOWLEDGE_WEBHOOK_ENABLED=false`.
NOTION_KNOWLEDGE_TOKEN_SECRET_REF="${NOTION_KNOWLEDGE_TOKEN_SECRET_REF:-notion-integration-token-greenhouse-knowledge}"
NOTION_KNOWLEDGE_WEBHOOK_ENABLED="${NOTION_KNOWLEDGE_WEBHOOK_ENABLED:-true}"
ENV_VARS="${ENV_VARS},NOTION_KNOWLEDGE_TOKEN_SECRET_REF=${NOTION_KNOWLEDGE_TOKEN_SECRET_REF}"
ENV_VARS="${ENV_VARS},NOTION_KNOWLEDGE_WEBHOOK_ENABLED=${NOTION_KNOWLEDGE_WEBHOOK_ENABLED}"
ensure_secret_accessor_binding "${NOTION_KNOWLEDGE_TOKEN_SECRET_REF}:latest"

# TASK-1375 — Email de respaldo del ebook lead magnet. La projection reactiva
# `growth_ebook_delivery_from_submission` corre SÓLO acá (la drena `ops-reactive-growth`),
# NO en Vercel: gatear esto en Vercel no hace nada. Flujo crítico — la success card del form
# le promete el email al usuario, así que OFF en prod = promesa incumplida.
# Declarativo acá para que `--set-env-vars` (destructivo) NO lo borre en cada redeploy:
# prenderlo sólo con `gcloud run services update --update-env-vars` sobrevive hasta el
# siguiente deploy y después falla EN SILENCIO. Pasó el 2026-07-10: se prendió en la revisión
# 00470 y la 00473 lo borró; el consumer reactivo registró `skip: flag OFF` y el email nunca
# salió, mientras la success card decía "te lo enviamos a tu correo".
# Rollback (<5min): `gcloud run services update ops-worker --update-env-vars GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED=false`.
GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED="${GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED=${GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED}"

# TASK-1689 — Emails transaccionales del ciclo de Hiring. Los 4 consumers reactivos
# (hiring_application_created_emails / hiring_assessment_assigned_email /
# hiring_stage_changed_email / hiring_application_decided_email, lane
# ops-reactive-notifications) leen el flag SOLO acá — prenderlo en Vercel no hace nada.
# Default OFF hasta ejercicio end-to-end en staging + revisión humana de Talent del copy
# (especialmente hiring_decision_rejected, pausable aparte en email_type_config).
# Declarativo acá para que `--set-env-vars` (destructivo) NO lo borre en cada redeploy.
# Prendido 2026-08-12 (rollout autorizado por el operador tras la revisión de copy; ejercicio E2E
# en staging en la misma sesión). Rollback (<5min):
# `gcloud run services update ops-worker --update-env-vars HIRING_LIFECYCLE_EMAILS_ENABLED=false`.
HIRING_LIFECYCLE_EMAILS_ENABLED="${HIRING_LIFECYCLE_EMAILS_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_LIFECYCLE_EMAILS_ENABLED=${HIRING_LIFECYCLE_EMAILS_ENABLED}"

# TASK-1762 — Cierre de vacante por capacidad: ejecución del run y su correo de «sin selección».
# El reconciler y el consumer del correo corren SOLO acá (lane ops-reactive-notifications):
# prenderlos en Vercel no hace absolutamente nada, y dejaría la UI prometiendo un cierre que
# nunca se ejecuta.
#
# Default OFF los dos, y por razones distintas:
#
# - HIRING_OPENING_CAPACITY_CLOSURE_ENABLED gobierna que el reconciler ejecute el run. Con él en
#   false se pueden configurar políticas y ver previews, pero nadie cambia de estado.
# - HIRING_CAPACITY_FILLED_EMAIL_ENABLED gobierna SÓLO el correo. Es un segundo freno sobre el
#   primero: un cierre manda N correos de golpe (las vacantes vivas tienen 36 y 14 personas), y
#   un correo emitido no se retira. Poder cerrar sin notificar —para un canary— exige que los dos
#   flags sean independientes.
#
# El kill-switch por tipo en `email_type_config` es la TERCERA capa y es la que permite pausar
# este correo sin silenciar el de decisión individual (`hiring_decision_rejected`).
#
# Declarativo acá para que `--set-env-vars` (destructivo) NO los borre en cada redeploy.
# Rollback (<5min): `gcloud run services update ops-worker --update-env-vars <FLAG>=false`.
#
# ⚠️ 2026-08-27 — AMBOS PASAN A `true` POR AUTORIZACIÓN EXPLÍCITA DEL CEO, como override del gate
#   que el ledger declaraba (sign-off de Talent/Privacidad + TASK-1764 + canary con destinatarios
#   allowlisted). Qué pasó de verdad al momento del flip: NO salió ningún correo, porque el envío
#   seguía doblemente frenado por debajo — las vacantes vivas tienen 0 `selected`, así que la
#   capacidad nunca se llena y el `confirm` se niega correctamente; y el tipo de correo
#   `hiring_decision_not_selected` sigue `enabled=FALSE` por seed en PG (ese seed NO se tocó, y es
#   la tercera capa: `resolveEmailTypeConfig` es fail-open, así que la fila es lo que sostiene el
#   freno).
#   Lo que este override NO resuelve: TASK-1764. Sin ella, el tipo nuevo cae al perfil de footer
#   legacy **en silencio** cuando el correo efectivamente salga. Antes de habilitar el tipo en
#   `email_type_config`, cerrar TASK-1764 o aceptar ese footer a sabiendas.
HIRING_OPENING_CAPACITY_CLOSURE_ENABLED="${HIRING_OPENING_CAPACITY_CLOSURE_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_OPENING_CAPACITY_CLOSURE_ENABLED=${HIRING_OPENING_CAPACITY_CLOSURE_ENABLED}"
HIRING_CAPACITY_FILLED_EMAIL_ENABLED="${HIRING_CAPACITY_FILLED_EMAIL_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_CAPACITY_FILLED_EMAIL_ENABLED=${HIRING_CAPACITY_FILLED_EMAIL_ENABLED}"

# TASK-1746 — Cutover de links de assessment al exchange fragment→sesión HttpOnly.
# Este sender corre sólo en ops-worker. Default OFF hasta aplicar migración, verificar routes
# live, confirmar Resend click_tracking=false por API/readback y completar smoke del href.
# No prender en Vercel: no tiene efecto. Rollback: volver a false y redeploy del worker.
HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED="${HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED:-false}"
ENV_VARS="${ENV_VARS},HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED=${HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED}"

# TASK-1723 — Banco de Talento person-first. El reconciliador es read/write sólo
# sobre la proyección minimizada, idempotente y sin contacto al candidato. El
# scheduler puede permanecer activo: este flag es el kill switch sin consultas.
# Activado para el rollout interno read-only autorizado 2026-08-16. Rollback:
# `gcloud run services update ops-worker --update-env-vars HIRING_TALENT_POOL_PROJECTION_ENABLED=false`.
HIRING_TALENT_POOL_PROJECTION_ENABLED="${HIRING_TALENT_POOL_PROJECTION_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_TALENT_POOL_PROJECTION_ENABLED=${HIRING_TALENT_POOL_PROJECTION_ENABLED}"

# TASK-1724 — Candidate self-service for the Talent Pool. The reactive
# `hiring.talent_pool.consent_requested` consumer runs in this shared worker,
# not in Vercel, so the flag must be declared here or a later `--set-env-vars`
# deploy would silently remove it. The CEO authorized the production rollout
# on 2026-08-16; rollback is `HIRING_TALENT_POOL_SELF_SERVICE_ENABLED=false`.
HIRING_TALENT_POOL_SELF_SERVICE_ENABLED="${HIRING_TALENT_POOL_SELF_SERVICE_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_TALENT_POOL_SELF_SERVICE_ENABLED=${HIRING_TALENT_POOL_SELF_SERVICE_ENABLED}"

# TASK-1718 — Proyección minimizada/redactada de CV por application exacta.
# La materialización vive en este worker; el reader App API y las tools MCP tienen
# flags propios. Activado para uso interno read-only autorizado por el operador el
# 2026-08-18. No habilita ranking, decisiones, stage moves, tests ni email.
# Rollback (<5 min):
# `gcloud run services update ops-worker --region=us-east4 --update-env-vars HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED=false`.
HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED="${HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED=${HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED}"
HIRING_EVALUATION_DOSSIER_AI_ENABLED="${HIRING_EVALUATION_DOSSIER_AI_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_EVALUATION_DOSSIER_AI_ENABLED=${HIRING_EVALUATION_DOSSIER_AI_ENABLED}"
HIRING_EVALUATION_DOSSIER_AI_AUTO_PROPOSE_ENABLED="${HIRING_EVALUATION_DOSSIER_AI_AUTO_PROPOSE_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_EVALUATION_DOSSIER_AI_AUTO_PROPOSE_ENABLED=${HIRING_EVALUATION_DOSSIER_AI_AUTO_PROPOSE_ENABLED}"

# TASK-1734 — Run asíncrono de scoring IA por assessment (ADR
# GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1, D6). Este deploy.sh es el SoT de los
# flags cuyo runtime owner es el ops-worker: la proyección reactiva
# (hiring_assessment_ai_scoring_run_enqueue) y el drain POST /assessment-ai/drain-scoring-runs
# los leen SOLO acá — prenderlos en Vercel no hace nada. TASK-1742 abre por defecto únicamente
# `global_provisional`: sus propuestas son operator-only y nunca entran al score efectivo.
# `exception_canary` y `calibrated_batch` permanecen fail-closed por evidence digest; el drain
# además exige el master HIRING_ASSESSMENT_AI_ENABLED en ESTE runtime. Rollback SIEMPRE por
# estos flags + commands de run (confirm OFF →
# enqueue OFF → drain/cancel/reconcile → cola manual), nunca "apagando el master".
HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED="${HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED=${HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED}"
HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED="${HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED:-false}"
ENV_VARS="${ENV_VARS},HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED=${HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED}"
HIRING_ASSESSMENT_AI_RUN_MODE="${HIRING_ASSESSMENT_AI_RUN_MODE:-global_provisional}"
ENV_VARS="${ENV_VARS},HIRING_ASSESSMENT_AI_RUN_MODE=${HIRING_ASSESSMENT_AI_RUN_MODE}"
HIRING_ASSESSMENT_AI_RUN_CONCURRENCY="${HIRING_ASSESSMENT_AI_RUN_CONCURRENCY:-1}"
ENV_VARS="${ENV_VARS},HIRING_ASSESSMENT_AI_RUN_CONCURRENCY=${HIRING_ASSESSMENT_AI_RUN_CONCURRENCY}"
HIRING_ASSESSMENT_AI_DAILY_PROVIDER_ATTEMPT_CAP="${HIRING_ASSESSMENT_AI_DAILY_PROVIDER_ATTEMPT_CAP:-1000}"
ENV_VARS="${ENV_VARS},HIRING_ASSESSMENT_AI_DAILY_PROVIDER_ATTEMPT_CAP=${HIRING_ASSESSMENT_AI_DAILY_PROVIDER_ATTEMPT_CAP}"
# TASK-1734 Slice 6 — el master del scorer también se declara acá (segundo gate del drain
# en ESTE runtime; sin declararlo, un flip out-of-band moriría en el próximo deploy). En
# Vercel el master YA está ON (2026-07-16); TASK-1742 lo abre acá solo para el carril
# provisional, con concurrencia inicial 1 y cap diario explícito.
HIRING_ASSESSMENT_AI_ENABLED="${HIRING_ASSESSMENT_AI_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_ASSESSMENT_AI_ENABLED=${HIRING_ASSESSMENT_AI_ENABLED}"

# TASK-1719 Slice 4/5 — Asignación automática del test al entrar a la etapa configurada
# (ADR GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1). Lo lee SOLO el consumer
# reactivo `hiring_stage_changed_candidate_comms` en ESTE runtime: prenderlo en Vercel no
# hace absolutamente nada. Declarado con default OFF para que `--set-env-vars` (destructivo)
# no lo borre en cada redeploy.
#
# Con el flag OFF el consumer NO deja de existir: sigue mandando el correo genérico de
# avance de etapa exactamente como antes. El flag gobierna SÓLO si además asigna el test.
# Por eso apagarlo es un rollback seguro — nunca deja al candidato sin comunicación.
#
# NO prenderlo hasta que: la policy exista `enabled` en la opening del canary, el backlog
# del consumer nuevo esté drenado (su handler key nuevo barre el histórico en la primera
# corrida) y el cancel/recovery del Slice 3 esté verificado. Rollback (<5min):
# `gcloud run services update ops-worker --update-env-vars HIRING_STAGE_TEST_ASSIGNMENT_ENABLED=false`
# + dejar las policies en `disabled`. NUNCA borrar assessments ni audit para revertir.
# PRENDIDO 2026-08-18 con las TRES precondiciones cumplidas y verificadas:
#   1. backlog del consumer drenado — 23 eventos procesados el 17-ago 13:54Z (22 `stale` por la
#      ventana de 24 h + 1 no-op), CERO correos enviados;
#   2. policy `enabled` en la opening del canary EO-OPN-0009 — reconfigurada a `on_stage_entry`
#      (`shortlisted`, cap 3/60 min) y habilitada por command canónico, policy_version=2;
#   3. cancel/recovery del Slice 3 verificado — `cancel.live.test.ts` 5/5 contra PG real.
# El default vive acá porque `--set-env-vars` es destructivo: un flip aplicado sólo con
# `--update-env-vars` se evapora en el próximo deploy del worker, en silencio.
HIRING_STAGE_TEST_ASSIGNMENT_ENABLED="${HIRING_STAGE_TEST_ASSIGNMENT_ENABLED:-true}"
ENV_VARS="${ENV_VARS},HIRING_STAGE_TEST_ASSIGNMENT_ENABLED=${HIRING_STAGE_TEST_ASSIGNMENT_ENABLED}"

# Buzón interno de People para el aviso de postulación nueva (configurable; default en código).
HIRING_INTERNAL_NOTIFICATIONS_EMAIL="${HIRING_INTERNAL_NOTIFICATIONS_EMAIL:-people@efeoncepro.com}"
ENV_VARS="${ENV_VARS},HIRING_INTERNAL_NOTIFICATIONS_EMAIL=${HIRING_INTERNAL_NOTIFICATIONS_EMAIL}"

if [ -n "${RESEND_API_KEY_SECRET_REF}" ]; then
  ENV_VARS="${ENV_VARS},RESEND_API_KEY_SECRET_REF=${RESEND_API_KEY_SECRET_REF}"
else
  echo "WARN: RESEND_API_KEY_SECRET_REF is not set; ops-worker will skip outbound email delivery."
fi

# TASK-1234 — AI Visibility Grader async worker (/growth/grader/drain via Cloud Scheduler).
# El ops-worker es un servicio Cloud Run COMPARTIDO staging+prod, y el backend es UNA sola
# instancia Postgres (greenhouse-pg-dev) + un solo schema greenhouse_growth compartido por ambos
# entornos (no hay instancia/DB prod separada — el comentario previo "schema no migrado en prod"
# era stale). Por eso, tras la directiva del operador (TASK-1321, 2026-07-02: "todo activo en
# prod"), el bloque `production` ESPEJA a `staging`: el grader stack completo queda ON en ambos
# (GRADER + OpenAI/Anthropic/Perplexity/Gemini + brand-intelligence + probes + lead-handoff +
# report-email), de modo que el drain ejecuta runs `full` reales sin regresión de comportamiento
# entre entornos (lo único que difiere son los *_SECRET_REF, que sí se ramifican por ENV). Gemini
# quedó ON tras desbloquearse el hold de billing de Vertex (ISSUE-113, verificado en vivo
# 2026-07-02). Los *_API_KEY_SECRET_REF se declaran siempre para que el worker resuelva las API
# keys server-side (resolveSecret); Gemini usa Vertex via WIF (sin secret, GCP_PROJECT + IAM).
# Declarativo para que --set-env-vars (destructivo) NO los borre en cada redeploy. Revert por-flag
# (<5 min): pasar el env var explícito =false al deploy (p.ej. GROWTH_AI_VISIBILITY_GRADER_ENABLED=false).
if [ "${ENV}" = "staging" ]; then
  DEFAULT_GROWTH_GRADER_ENABLED="true"
  DEFAULT_GROWTH_OPENAI_ENABLED="true"
  DEFAULT_GROWTH_ANTHROPIC_ENABLED="true"
  DEFAULT_GROWTH_PERPLEXITY_ENABLED="true"
  DEFAULT_GROWTH_GEMINI_ENABLED="true"
  # TASK-1229/1230 — Motor Growth Forms en vivo en staging (operador 2026-06-25).
  DEFAULT_FORMS_DISPATCH_ENABLED="true"
  DEFAULT_FORMS_HUBSPOT_ENABLED="true"
  # TASK-1242 — HubSpot lead handoff: el WRITE (executeLeadHandoff) corre en este worker.
  # Staging ON (operador 2026-06-25, smoke). Prod OFF (gated por EPIC-020 + sign-off).
  DEFAULT_GROWTH_LEAD_HANDOFF_ENABLED="true"
  # TASK-1250 — Email de entrega del informe: el WRITE (dispatchAiVisibilityReportEmail) corre
  # en este worker. Staging ON (operador 2026-06-27, rollout). Prod OFF (gated por EPIC-020 + sign-off legal/from-address).
  DEFAULT_GROWTH_REPORT_EMAIL_ENABLED="true"
  # TASK-1279 — Cross-sell operador: el WRITE (executeOperatorReportSend → email + Lead HubSpot)
  # corre en este worker (reactive consumer growth_ai_visibility_operator_send, lane ops-reactive-growth).
  # REABILITADO 2026-07-04 (TASK-1333, decisión explícita del operador "prende todos"): el gate original
  # (falso-0 para marcas no-agencia) quedó cerrado con EPIC-021 (motor brand-aware live, ISSUE-110 resuelto)
  # → el diagnóstico ya es brand-aware. CATEGORY_GUARD ON (abajo) protege al cross-sell de enviar sobre
  # categoría no resuelta. Consent gate server-side + dedup HubSpot siguen intactos.
  DEFAULT_GROWTH_OPERATOR_SEND_ENABLED="true"
  # TASK-1265 — Google AI Overviews / AI Mode provider (DataForSEO). El run async del grader
  # ejecuta en este worker, así que el flag + creds DataForSEO deben vivir acá (no sólo en
  # Vercel) para que los 3 endpoints (public/client-portal/operator) midan AI Overviews.
  # Staging ON (operador 2026-06-28, smoke real verde). Prod OFF (gated por EPIC-020 +
  # sign-off + rotación del password DataForSEO expuesto en provisión).
  DEFAULT_GROWTH_GOOGLE_AIO_ENABLED="true"
  # TASK-1266 — Site Readiness Probe Layer: el probe gatherer corre dentro de
  # executeClaimedGraderRun → en el path async ejecuta en ESTE worker, así que el flag
  # debe vivir acá (no sólo en Vercel). Staging ON (rollout 2026-06-28). Prod OFF
  # (gated por EPIC-020 + release control plane). AGENTIC requiere PROBES ON (gating en código).
  DEFAULT_GROWTH_PROBES_ENABLED="true"
  DEFAULT_GROWTH_AGENTIC_READINESS_ENABLED="true"
  # TASK-1267 — Entity Infrastructure Probes (eje `entity`: Google Knowledge Graph + Wikidata +
  # Reddit-UGC). Mismo razonamiento DUAL-LOCATION que PROBES: el gatherer corre en este worker en
  # el path async. Staging ON (rollout 2026-06-28). Prod OFF (gated EPIC-020). Requiere PROBES ON
  # (gating en código). La KG api key se resuelve server-side (resolveSecret); sin ella el KG probe
  # degrada honesto `not_configured` (Wikidata/Reddit no requieren auth).
  DEFAULT_GROWTH_ENTITY_PROBES_ENABLED="true"
  # TASK-1270 — Re-grade recurrente AEO. Staging ON tras rollout develop
  # (2026-06-29); prod OFF gated por EPIC-020/release control.
  DEFAULT_GROWTH_REGRADE_ENABLED="true"
  DEFAULT_GROWTH_REGRADE_SCHEDULER_PAUSED="false"
  # TASK-1288 — Brand Intelligence (lectura grounded compartida) ON. CATEGORY_GUARD REABILITADO
  # 2026-07-04 (TASK-1333, decisión del operador): con EPIC-021 (resolución brand-aware grounded live)
  # la cobertura de categoría subió, y su beneficiario (cross-sell OPERATOR_SEND) quedó ON → el guard
  # protege calidad (bloquea runs con categoría no resuelta → confirmación humana en vez de diagnóstico
  # basura). ⚠️ RIESGO RESIDUAL: una marca cuya categoría no resuelva ni con el grounded read queda
  # bloqueada (`aeo_category_unresolved`); revert = flag a false. Señal: growth.ai_visibility.profile_category_unresolved.
  DEFAULT_GROWTH_BRAND_INTELLIGENCE_ENABLED="true"
  DEFAULT_GROWTH_CATEGORY_GUARD_ENABLED="true"
  # TASK-1290 — prompts por arquetipo + autoría LLM ON en staging (rollout 2026-06-29). El run usa
  # el baseline del arquetipo del perfil (o el set autorado active) en vez del pack agencia; agencia
  # = v1 bit-for-bit. La autoría LLM es manual (command), no auto-run. Prod OFF (gated EPIC-021/
  # release control + eval TASK-1292).
  DEFAULT_GROWTH_ARCHETYPE_PROMPTS_ENABLED="true"
  DEFAULT_GROWTH_PROMPT_AUTHORING_ENABLED="true"
  # TASK-1267 — KG api key publicada en Secret Manager (key restringida a kgsearch.googleapis.com,
  # 2026-06-28). Staging la wirea; el worker la resuelve server-side (resolveSecret) + el conditional
  # de abajo appendea el ref + bindea secretAccessor.
  DEFAULT_GOOGLE_KG_KEY_SECRET_REF="greenhouse-google-knowledge-graph-api-key"
else
  # PRODUCTION — espeja staging (TASK-1321, directiva operador 2026-07-02 "todo activo en prod").
  # Backend compartido (misma DB + ops-worker), así que producción corre el grader stack completo
  # igual que staging. 2026-07-04 (TASK-1333, decisión del operador "hagamos todo lo necesario"):
  # OPERATOR_SEND y CATEGORY_GUARD pasan a ON también en prod (antes era el único delta OFF) — el gate
  # brand-aware quedó cerrado con EPIC-021. Gemini ON (billing Vertex desbloqueado, ISSUE-113 2026-07-02).
  DEFAULT_GROWTH_GRADER_ENABLED="true"
  DEFAULT_GROWTH_OPENAI_ENABLED="true"
  DEFAULT_GROWTH_ANTHROPIC_ENABLED="true"
  DEFAULT_GROWTH_PERPLEXITY_ENABLED="true"
  DEFAULT_GROWTH_GEMINI_ENABLED="true"
  DEFAULT_FORMS_DISPATCH_ENABLED="true"
  DEFAULT_FORMS_HUBSPOT_ENABLED="true"
  DEFAULT_GROWTH_LEAD_HANDOFF_ENABLED="true"
  DEFAULT_GROWTH_REPORT_EMAIL_ENABLED="true"
  DEFAULT_GROWTH_OPERATOR_SEND_ENABLED="true"
  DEFAULT_GROWTH_GOOGLE_AIO_ENABLED="true"
  DEFAULT_GROWTH_PROBES_ENABLED="true"
  DEFAULT_GROWTH_AGENTIC_READINESS_ENABLED="true"
  DEFAULT_GROWTH_ENTITY_PROBES_ENABLED="true"
  DEFAULT_GROWTH_REGRADE_ENABLED="true"
  DEFAULT_GROWTH_REGRADE_SCHEDULER_PAUSED="false"
  DEFAULT_GROWTH_BRAND_INTELLIGENCE_ENABLED="true"
  DEFAULT_GROWTH_CATEGORY_GUARD_ENABLED="true"
  DEFAULT_GROWTH_ARCHETYPE_PROMPTS_ENABLED="true"
  DEFAULT_GROWTH_PROMPT_AUTHORING_ENABLED="true"
  DEFAULT_GOOGLE_KG_KEY_SECRET_REF="greenhouse-google-knowledge-graph-api-key"
fi
GROWTH_AI_VISIBILITY_GRADER_ENABLED="${GROWTH_AI_VISIBILITY_GRADER_ENABLED:-${DEFAULT_GROWTH_GRADER_ENABLED}}"
GROWTH_AI_VISIBILITY_OPENAI_ENABLED="${GROWTH_AI_VISIBILITY_OPENAI_ENABLED:-${DEFAULT_GROWTH_OPENAI_ENABLED}}"
GROWTH_AI_VISIBILITY_ANTHROPIC_ENABLED="${GROWTH_AI_VISIBILITY_ANTHROPIC_ENABLED:-${DEFAULT_GROWTH_ANTHROPIC_ENABLED}}"
GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED="${GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED:-${DEFAULT_GROWTH_PERPLEXITY_ENABLED}}"
GROWTH_AI_VISIBILITY_GEMINI_ENABLED="${GROWTH_AI_VISIBILITY_GEMINI_ENABLED:-${DEFAULT_GROWTH_GEMINI_ENABLED}}"
# TASK-1333 — Extracción de prosa (sentiment + categoryAssociations + messageDrift + brandRank).
# DUAL-LOCATION: el run async del grader ejecuta en ESTE worker, así que sin el flag acá la
# extracción queda OFF aunque Vercel la tenga ON → toda categoría/sentiment sale `unknown`
# (root cause TASK-1333: los 12 runs previos con category_associations vacío). Se persiste ON
# para espejar el grader-stack completo (directiva "todo activo en prod" 2026-07-02). Cost-bearing
# (1 call/finding/run) — respeta el cost-cap del router. Requiere ANTHROPIC secret (ya presente).
GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED="${GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED:-true}"
GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED="${GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED:-${DEFAULT_GROWTH_LEAD_HANDOFF_ENABLED}}"
GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED="${GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED:-${DEFAULT_GROWTH_REPORT_EMAIL_ENABLED}}"
GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED="${GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED:-${DEFAULT_GROWTH_OPERATOR_SEND_ENABLED}}"
GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED="${GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED:-${DEFAULT_GROWTH_GOOGLE_AIO_ENABLED}}"
GROWTH_AI_VISIBILITY_PROBES_ENABLED="${GROWTH_AI_VISIBILITY_PROBES_ENABLED:-${DEFAULT_GROWTH_PROBES_ENABLED}}"
GROWTH_AI_VISIBILITY_AGENTIC_READINESS_ENABLED="${GROWTH_AI_VISIBILITY_AGENTIC_READINESS_ENABLED:-${DEFAULT_GROWTH_AGENTIC_READINESS_ENABLED}}"
GROWTH_AI_VISIBILITY_ENTITY_PROBES_ENABLED="${GROWTH_AI_VISIBILITY_ENTITY_PROBES_ENABLED:-${DEFAULT_GROWTH_ENTITY_PROBES_ENABLED}}"
# TASK-1778 — Endurecimiento de RED del probe fetcher (ISSUE-164): redirect containment por
# salto (familia + subdominios descendientes del sujeto) + guarda DNS. ON desde el cutover
# 2026-08-27 (worker ÚNICO compartido staging+prod: este default cubre el path async de ambos,
# que es la cadena viva del intake público). Evidencia pre-flip: 7 dominios reales de cartera
# en strict (6 ok; bancochile ya fallaba igual con la red vieja — Imperva, caso TASK-1281).
# Rollback <5 min: default a false + `gcloud run services update --update-env-vars ...=false`
# (los deploy.sh usan --set-env-vars destructivo: cambiar SIEMPRE ambos). El resto del
# endurecimiento (stream cap + truncated + robots obedecido) NO lleva flag. DUAL-LOCATION:
# también se lee en Vercel (staging env ON; prod se prende con el release que lleve el código).
GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED="${GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED:-true}"
GROWTH_AI_VISIBILITY_REGRADE_ENABLED="${GROWTH_AI_VISIBILITY_REGRADE_ENABLED:-${DEFAULT_GROWTH_REGRADE_ENABLED}}"
GROWTH_AI_VISIBILITY_REGRADE_BATCH_SIZE="${GROWTH_AI_VISIBILITY_REGRADE_BATCH_SIZE:-5}"
GROWTH_AI_VISIBILITY_REGRADE_MONTHLY_BUDGET_USD="${GROWTH_AI_VISIBILITY_REGRADE_MONTHLY_BUDGET_USD:-50}"
GROWTH_AI_VISIBILITY_REGRADE_SCHEDULER_PAUSED="${GROWTH_AI_VISIBILITY_REGRADE_SCHEDULER_PAUSED:-${DEFAULT_GROWTH_REGRADE_SCHEDULER_PAUSED}}"
GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED="${GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED:-${DEFAULT_GROWTH_BRAND_INTELLIGENCE_ENABLED}}"
GROWTH_AI_VISIBILITY_CATEGORY_GUARD_ENABLED="${GROWTH_AI_VISIBILITY_CATEGORY_GUARD_ENABLED:-${DEFAULT_GROWTH_CATEGORY_GUARD_ENABLED}}"
# TASK-1696 — Gate de presupuesto AEO per-org, en DOS etapas. `ENABLED` computa y registra lo que
# HABRÍA pasado (shadow); `ENFORCED`, subordinado, bloquea. Ambos default OFF: el camino público
# del lead magnet comparte el motor del grader, así que un tope mal calibrado no degrada un
# tablero, corta captación — y el tope correcto es la SALIDA de un ciclo mensual de shadow, no un
# supuesto de hoy.
#
# ⚠️ DUAL-LOCATION: el run async del grader y el re-grade recurrente ejecutan en ESTE worker,
# así que sin los flags acá el gate queda muerto en la mitad async aunque Vercel los tenga ON.
# Declarativo para que --set-env-vars (destructivo) NO los borre en cada redeploy.
# Rollback (<5 min): `false` acá + `gcloud run services update ops-worker --update-env-vars ...=false`.
GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED="${GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED:-false}"
GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED="${GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED:-false}"
# Knobs de tope por tier (NO son flags; override sin deploy, mismo criterio que los
# GROWTH_SEO_*_MONTHLY_BUDGET_USD). Nacen holgados a propósito: en shadow tienen que dejar pasar
# todo para que `wouldBlock` mida la realidad y no la restricción.
GROWTH_AI_VISIBILITY_CONTRACTED_MONTHLY_BUDGET_USD="${GROWTH_AI_VISIBILITY_CONTRACTED_MONTHLY_BUDGET_USD:-60}"
GROWTH_AI_VISIBILITY_PILOT_MONTHLY_BUDGET_USD="${GROWTH_AI_VISIBILITY_PILOT_MONTHLY_BUDGET_USD:-10}"
GROWTH_AI_VISIBILITY_TRIAL_MONTHLY_BUDGET_USD="${GROWTH_AI_VISIBILITY_TRIAL_MONTHLY_BUDGET_USD:-3}"
GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED="${GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED:-${DEFAULT_GROWTH_ARCHETYPE_PROMPTS_ENABLED}}"
GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED="${GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED:-${DEFAULT_GROWTH_PROMPT_AUTHORING_ENABLED}}"
# TASK-1267 — KG api key (eje entity). Opcional: sólo se appendea + bindea si viene poblada
# (mismo patrón que DATAFORSEO_API_LOGIN), para que un --set-env-vars destructivo no deje un
# secret ref vacío y para no referenciar un secret inexistente. Sin ella → KG probe degrada
# honesto `not_configured` (Wikidata/Reddit corren igual, no requieren auth).
GOOGLE_KNOWLEDGE_GRAPH_API_KEY_SECRET_REF="${GOOGLE_KNOWLEDGE_GRAPH_API_KEY_SECRET_REF:-${DEFAULT_GOOGLE_KG_KEY_SECRET_REF}}"
OPENAI_API_KEY_SECRET_REF="${OPENAI_API_KEY_SECRET_REF:-greenhouse-openai-api-key}"
ANTHROPIC_API_KEY_SECRET_REF="${ANTHROPIC_API_KEY_SECRET_REF:-greenhouse-anthropic-api-key}"
# ISSUE-113 / smoke TASK-1321 (2026-07-02): el flag PERPLEXITY_ENABLED estaba ON pero su secret
# ref NUNCA se cableó acá → el worker resolvía `missing_secret` y saltaba el provider (el grader
# quedaba con 1 solo provider → informe `insufficient_data`). El secret existe en Secret Manager;
# acá lo declaramos + appendeamos + bindeamos igual que OpenAI/Anthropic (el flag gatea el uso).
PERPLEXITY_API_KEY_SECRET_REF="${PERPLEXITY_API_KEY_SECRET_REF:-greenhouse-perplexity-api-key}"
# TASK-1265 — DataForSEO (fuente SERP/AI Mode del provider google_ai_overview). El password
# se resuelve server-side via secret ref; el login es config no-secreta que el CI inyecta
# desde la GH Actions variable DATAFORSEO_API_LOGIN (ops-worker-deploy.yml). Sin login, el
# adapter degrada limpio (missing_secret) — por eso sólo se appendea cuando viene poblado
# (evita que un --set-env-vars destructivo deje DATAFORSEO_API_LOGIN="" en el worker).
DATAFORSEO_API_PASSWORD_SECRET_REF="${DATAFORSEO_API_PASSWORD_SECRET_REF:-greenhouse-dataforseo-api-password}"
DATAFORSEO_API_LOGIN="${DATAFORSEO_API_LOGIN:-}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_GRADER_ENABLED=${GROWTH_AI_VISIBILITY_GRADER_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_OPENAI_ENABLED=${GROWTH_AI_VISIBILITY_OPENAI_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_ANTHROPIC_ENABLED=${GROWTH_AI_VISIBILITY_ANTHROPIC_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED=${GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_GEMINI_ENABLED=${GROWTH_AI_VISIBILITY_GEMINI_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED=${GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED=${GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED=${GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED=${GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=${GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_PROBES_ENABLED=${GROWTH_AI_VISIBILITY_PROBES_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_AGENTIC_READINESS_ENABLED=${GROWTH_AI_VISIBILITY_AGENTIC_READINESS_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_ENTITY_PROBES_ENABLED=${GROWTH_AI_VISIBILITY_ENTITY_PROBES_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED=${GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_REGRADE_ENABLED=${GROWTH_AI_VISIBILITY_REGRADE_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED=${GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_CATEGORY_GUARD_ENABLED=${GROWTH_AI_VISIBILITY_CATEGORY_GUARD_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED=${GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED=${GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_CONTRACTED_MONTHLY_BUDGET_USD=${GROWTH_AI_VISIBILITY_CONTRACTED_MONTHLY_BUDGET_USD}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_PILOT_MONTHLY_BUDGET_USD=${GROWTH_AI_VISIBILITY_PILOT_MONTHLY_BUDGET_USD}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_TRIAL_MONTHLY_BUDGET_USD=${GROWTH_AI_VISIBILITY_TRIAL_MONTHLY_BUDGET_USD}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED=${GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED=${GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_REGRADE_BATCH_SIZE=${GROWTH_AI_VISIBILITY_REGRADE_BATCH_SIZE}"
ENV_VARS="${ENV_VARS},GROWTH_AI_VISIBILITY_REGRADE_MONTHLY_BUDGET_USD=${GROWTH_AI_VISIBILITY_REGRADE_MONTHLY_BUDGET_USD}"
if [ -n "${GOOGLE_KNOWLEDGE_GRAPH_API_KEY_SECRET_REF}" ]; then
  ENV_VARS="${ENV_VARS},GOOGLE_KNOWLEDGE_GRAPH_API_KEY_SECRET_REF=${GOOGLE_KNOWLEDGE_GRAPH_API_KEY_SECRET_REF}"
  ensure_secret_accessor_binding "${GOOGLE_KNOWLEDGE_GRAPH_API_KEY_SECRET_REF}"
fi
ENV_VARS="${ENV_VARS},DATAFORSEO_API_PASSWORD_SECRET_REF=${DATAFORSEO_API_PASSWORD_SECRET_REF}"
if [ -n "${DATAFORSEO_API_LOGIN}" ]; then
  ENV_VARS="${ENV_VARS},DATAFORSEO_API_LOGIN=${DATAFORSEO_API_LOGIN}"
fi
ensure_secret_accessor_binding "${DATAFORSEO_API_PASSWORD_SECRET_REF}:latest"
# TASK-1229/1230 — Motor Growth Forms: dispatcher + adapter HubSpot Forms secure-submit.
# Staging ON (forms en vivo en develop); prod OFF (gated por TASK-1232 primer form real +
# sign-off). Gate prod-safe: con OFF el handler/adapter no-opean (cero queries/writes).
GROWTH_FORMS_DISPATCH_ENABLED="${GROWTH_FORMS_DISPATCH_ENABLED:-${DEFAULT_FORMS_DISPATCH_ENABLED}}"
GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED="${GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED:-${DEFAULT_FORMS_HUBSPOT_ENABLED}}"
ENV_VARS="${ENV_VARS},GROWTH_FORMS_DISPATCH_ENABLED=${GROWTH_FORMS_DISPATCH_ENABLED}"
ENV_VARS="${ENV_VARS},GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED=${GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED}"
# TASK-1302 — Search Console DENTRO del ops-worker.
#
# El materializer GSC es el PRIMER consumer del reader de Search Console en este runtime:
# hasta TASK-1302 ese reader sólo corría en rutas Vercel, así que el worker nunca tuvo ni el
# flag ni la config OAuth. Sin esto, `readSearchConsoleAnalytics` resuelve `disabled` y el
# batch degrada TODAS las orgs **en silencio** — exactamente la bug class de ISSUE-113
# (flag ON + secret ref nunca cableado ⇒ provider saltado sin ruido).
#
# El flag va a `true` porque acá gatea la LECTURA de una conexión ya existente y verificada;
# quien decide si el módulo corre es `GROWTH_SEO_ENABLED` (abajo). El client id es un
# identificador OAuth público que el CI inyecta como GH secret (mismo patrón que
# DATAFORSEO_API_LOGIN) y sólo se appendea si viene poblado, para que un `--set-env-vars`
# destructivo no deje la var vacía. El client SECRET nunca viaja acá: sale de Secret Manager.
GROWTH_SEARCH_CONSOLE_ENABLED="${GROWTH_SEARCH_CONSOLE_ENABLED:-true}"
GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID="${GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID:-}"
GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF="${GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF:-greenhouse-search-console-oauth-client-secret}"
ENV_VARS="${ENV_VARS},GROWTH_SEARCH_CONSOLE_ENABLED=${GROWTH_SEARCH_CONSOLE_ENABLED}"
ENV_VARS="${ENV_VARS},GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF=${GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF}"
if [ -n "${GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID}" ]; then
  ENV_VARS="${ENV_VARS},GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID=${GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID}"
fi
ensure_secret_accessor_binding "${GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF}:latest"

# TASK-1302 — Módulo SEO (materialización diaria GSC).
#
# **ON desde el rollout 2026-08-05** (autorizado por el operador). Declarativo acá y no sólo
# vía `gcloud run services update`, porque `--set-env-vars` es destructivo: aplicarlo sólo en
# vivo lo borraría en el próximo deploy, en silencio.
# ⚠️ Lo lee el ops-worker, NO Vercel: prenderlo sólo en Vercel deja el materializer muerto
# (CLAUDE.md §Feature Flag State Ledger — prender un flag es multi-runtime).
#
# Alcance real de tenerlo ON: el batch itera SÓLO las orgs con conexión GSC `active`, lee
# datos gratuitos de Google (cero costo de proveedor) y escribe en `seo_gsc_daily`, tabla que
# hoy no consume ningún cliente (TASK-1306/1308 aún no existen). Degrada honesto por org.
# Rollback (<5 min): `GROWTH_SEO_ENABLED=false` acá + redeploy, o pausar el scheduler.
GROWTH_SEO_ENABLED="${GROWTH_SEO_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_ENABLED=${GROWTH_SEO_ENABLED}"

# TASK-1661 — Captura de datos de mercado por keyword (DataForSEO Labs `keyword_overview`).
#
# 🔴 **OFF por defecto, y esto NO es simetría con el flag de arriba.** `GROWTH_SEO_ENABLED` gatea
# lecturas y batches ya presupuestados; éste habilita una corrida que le PAGA AL PROVEEDOR por
# cada fila devuelta. Nace apagado y se enciende por organización, con el dry-run visto antes.
#
# Costo medido del alcance V1 (set monitoreado, 2026-08-13): 31 keywords = 1 llamada =
# USD 0.012 (task setup) + 31 × USD 0.00012 = ~USD 0.016 por corrida. El techo por target son
# 200 keywords, que siguen siendo una sola llamada (~USD 0.036).
#
# ⚠️ Lo lee el ops-worker, NO Vercel: el fetch es async. Declararlo acá y no sólo con
# `gcloud run services update` es obligatorio — `--set-env-vars` es destructivo y lo borraría
# en el próximo deploy, en silencio (CLAUDE.md §Feature Flag State Ledger).
#
# Es SUBORDINADO: con `GROWTH_SEO_ENABLED=false` la captura no corre aunque éste esté ON.
# Rollback (<5 min): volver a `false` acá + redeploy — deja de gastar de inmediato y los datos
# ya capturados quedan (la tabla es append-only).
# **ON desde 2026-08-13** (autorización del operador: "termina lo que falte"). Dry-run y corrida
# real acotada ejecutados y verificados ese mismo día (ledger atribuido; ver TASK-1661 §Cierre).
# Alcance efectivo: orgs con assignment vigente Y keywords en el set — hoy sólo Berel (~USD 0.016/mes).
GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED="${GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED=${GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED}"

# TASK-1775 — Foto de dominio mensual (DataForSEO Labs `domain_rank_overview` sobre el target
# y sus competidores declarados).
#
# 🔴 **OFF por defecto.** Habilita una corrida que le PAGA AL PROVEEDOR por cada sujeto
# (~USD 0.0121 por dominio: task setup 0.012 + 1 fila 0.00012). Nace apagado y sólo se
# enciende tras el smoke real con UN sujeto + autorización del operador (TASK-1775 Slice 6).
#
# ⚠️ Lo lee SOLO el ops-worker (la captura vive acá; en Vercel es inerte). Declararlo acá y
# no sólo con `gcloud run services update` es obligatorio — `--set-env-vars` es destructivo
# y lo borraría en el próximo deploy, en silencio (CLAUDE.md §Feature Flag State Ledger).
#
# Es SUBORDINADO: con `GROWTH_SEO_ENABLED=false` la captura no corre aunque éste esté ON.
# Rollback (<5 min): volver a `false` acá + `--update-env-vars` — deja de gastar de inmediato
# y las filas capturadas quedan (la tabla es append-only).
# **ON desde 2026-08-27** (autorización del operador; dry-run + corrida real + re-corrida a
# USD 0 verificados el mismo día; scheduler despausado tras el smoke).
GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED="${GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED=${GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED}"

# TASK-1776 — Visibilidad de mercado por sujeto-página (`ranked_keywords` sobre el dominio del
# target + competidores; primitives on-demand relevant_pages/subdomains).
#
# 🔴 **OFF por defecto.** Cada sujeto cuesta task setup + hasta `GROWTH_SEO_URL_VISIBILITY_ROW_LIMIT`
# filas (default 100 → ~USD 0.024/sujeto). Nace apagado y sólo se enciende tras el smoke real
# con los cuatro subject_kind + autorización del operador (TASK-1776 Slice 6).
#
# ⚠️ Lo lee SOLO el ops-worker (en Vercel es inerte). Declararlo acá es obligatorio —
# `--set-env-vars` es destructivo y lo borraría en el próximo deploy, en silencio.
# Es SUBORDINADO a `GROWTH_SEO_ENABLED`. Rollback (<5 min): `false` acá + `--update-env-vars`.
# **ON desde 2026-08-27** (autorización del operador; dry-run + corrida real con los cuatro
# subject_kind + enriquecimiento de mercado a costo 0 + re-corrida a USD 0 verificados;
# scheduler despausado tras el smoke).
GROWTH_SEO_URL_VISIBILITY_ENABLED="${GROWTH_SEO_URL_VISIBILITY_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_URL_VISIBILITY_ENABLED=${GROWTH_SEO_URL_VISIBILITY_ENABLED}"

# TASK-1805 — Selector de metodología ETV de DataForSEO (NO es un flag booleano: vocabulario
# cerrado `legacy_static_v1|improved_layout_clickstream_v2`). Gobierna QUÉ fórmula piden las
# siete requests Labs que consumen ETV (foto de dominio, histórico, bulk, ranked_keywords,
# relevant_pages, subdomains y el prospecto en Vercel) y se persiste por fila como provenance.
#
# 🔴 Debe valer LO MISMO en Vercel y en el ops-worker: la señal `seo.etv_methodology.drift`
# compara lo configurado con lo que cada runtime pidió de verdad. Un valor fuera del vocabulario
# hace fallar CERRADO toda captura ETV (mejor que comprar la fórmula equivocada en silencio).
# Desde 2026-11-01T00:00:00Z `legacy_static_v1` también falla cerrado: el proveedor ya no lo
# sirve. CUTOVER TASK-1806 (2026-09-03, aprobado por el operador): improved_layout_clickstream_v2
# tras el shadow exact_ab del 2026-09-03 (calibración GSC 49 % vs 321 % legacy; Jaccard 1,0;
# historia continua; rebaseline versionado). Legacy sólo vuelve como rollback ANTES del corte.
GROWTH_SEO_ETV_METHODOLOGY_VERSION="${GROWTH_SEO_ETV_METHODOLOGY_VERSION:-improved_layout_clickstream_v2}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_ETV_METHODOLOGY_VERSION=${GROWTH_SEO_ETV_METHODOLOGY_VERSION}"

# Selector de LECTURA (readers/API/MCP): separado porque el cutover es writer-primero,
# reader-después. El worker no sirve lecturas, pero declararlo acá mantiene un solo contrato.
GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION="${GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION:-improved_layout_clickstream_v2}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION=${GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION}"

# TASK-1662 — Cobertura de keywords de competidores declarados (keyword gap competitivo,
# DataForSEO Labs `domain_intersection`, 2 llamadas por competidor por ciclo mensual).
#
# Este flag se lee SOLO acá (en Vercel es inerte) y este archivo es su SoT declarativo —
# `--set-env-vars` es destructivo y lo borraría en el próximo deploy.
# Es SUBORDINADO a `GROWTH_SEO_ENABLED`. Rollback (<5 min): `false` acá + `--update-env-vars`.
# **ON desde 2026-08-28** (autorización plena del operador; secuencia verificada ese día:
# competidor real declarado con autoría —Berel MX → comex.com.mx, evidencia
# BEREL_SEO_DIAGNOSTIC_2026-08-25— + dry-run USD 0,144 estimado + primera corrida real
# USD 0,1076 con Δ EXACTO en el ledger, 697 filas de cobertura + 640 de mercado gratis).
# Efectivo con el primer deploy del worker que incluya el endpoint (post-release); el
# scheduler queda PAUSADO hasta entonces (ver abajo). Costo ~USD 0,11-0,15/competidor/ciclo.
GROWTH_SEO_COMPETITOR_GAP_ENABLED="${GROWTH_SEO_COMPETITOR_GAP_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_COMPETITOR_GAP_ENABLED=${GROWTH_SEO_COMPETITOR_GAP_ENABLED}"

# TASK-1700 — Cola priorizada de trabajo SEO (materializador del aggregate append-only).
#
# 🔴 **OFF por defecto, y por una razón distinta a la de sus hermanos**: este flag NO
# compromete gasto de proveedor (la cola lee tablas ya pagadas). Lo que compromete es la
# AUTORIDAD DE ORDEN — con la cola encendida el operador ve un orden que manda otra cosa que
# la que mandaba ayer, y aparecen filas de orígenes que antes no estaban en esa lista. Por eso
# el flip se AVISA antes, aunque no cueste un centavo.
#
# ⚠️ DUAL-RUNTIME: acá gatea el MATERIALIZADOR (sin esto no se escribe ningún snapshot y los
# lanes de Vercel servirían una cola permanentemente vacía sin poder explicar por qué); en
# Vercel gatea el reader, los lanes, la tool MCP y el cutover del consumer. Prenderlo en un
# solo runtime deja la capacidad coja de forma distinta en cada dirección.
#
# Este archivo es el SoT declarativo del lado worker (`--set-env-vars` es DESTRUCTIVO: aplicar
# también en vivo con `--update-env-vars` para efecto inmediato, o el próximo deploy lo borra
# en silencio). Es SUBORDINADO a `GROWTH_SEO_ENABLED`.
# Rollback (<5 min): `false` acá + `--update-env-vars` + pausar el scheduler.
#
# 🟢 ON desde 2026-08-29 (release develop→main, autorización explícita del operador: "prendelo,
# este producto está en desarrollo ahora mismo"). Se prende ACÁ, en el SoT declarativo, y NO con
# un `gcloud run services update --update-env-vars` suelto: `--set-env-vars` es DESTRUCTIVO y el
# próximo deploy del worker habría borrado la var en silencio — el modo de falla exacto del caso
# `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` (revisión 00470 prendida, 00473 la borró, el consumer
# registró `skip: flag OFF` y el ledger siguió diciendo ON). Prendido en el SoT, el flag sobrevive
# a cualquier deploy por construcción.
#
# ⚠️ El scheduler `ops-seo-work-queue-materialize` sigue PAUSADO: prender el flag habilita el
# materializador, no lo agenda. Despausarlo es una decisión aparte y exige la corrida shadow
# verificada que este mismo bloque pide.
GROWTH_SEO_WORK_QUEUE_ENABLED="${GROWTH_SEO_WORK_QUEUE_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_WORK_QUEUE_ENABLED=${GROWTH_SEO_WORK_QUEUE_ENABLED}"

# TASK-1670 — Hallazgos de SITIO en el site audit (crawlers de IA, borde/WAF, JSON-LD, sitemap).
#
# 🔴 **OFF, y NO se prende hasta que `TASK-1671` esté desplegada.** No es cautela genérica: los
# hallazgos son del DOMINIO (un robots.txt no pertenece a ninguna página) y la superficie actual
# cuenta "páginas afectadas" y ORDENA por ese número. Con el flag ON antes de 1671, un bloqueo de
# crawlers de IA se rotularía "1 página afectada" —falso— y además se hundiría dentro de su propio
# tier, debajo de 400 imágenes sin alt. Se cambiaría un punto ciego por un dato mal contado.
#
# ⚠️ **Runtime ÚNICO: este worker.** El único lector es el collect del site audit; en Vercel es
# inerte (los hallazgos ya escritos se sirven por el reader canónico sin consultar el flag). Este
# archivo es su SoT declarativo — `--set-env-vars` es DESTRUCTIVO, así que prenderlo sólo con un
# `gcloud run services update --update-env-vars` suelto lo borraría en el próximo deploy, en
# silencio (modo de falla del caso `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`).
#
# NO compromete gasto de proveedor: son 4-5 fetches propios al sitio del cliente por run, con
# presupuesto de tiempo duro. Cero llamadas a DataForSEO.
#
# Es SUBORDINADO a `GROWTH_SEO_ENABLED`. Rollback (<10 min): `false` acá + `--update-env-vars`.
# Los hallazgos ya escritos quedan: la tabla es append-only por diseño.
GROWTH_SEO_SITE_FINDINGS_ENABLED="${GROWTH_SEO_SITE_FINDINGS_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_SITE_FINDINGS_ENABLED=${GROWTH_SEO_SITE_FINDINGS_ENABLED}"

# TASK-1699 — Persistencia del top-N del SERP que el rank capture YA paga (costo marginal
# CERO: cero llamadas nuevas, cero cambio de depth/flags). Gatea la ESCRITURA dentro del
# batch diario `ops-seo-rank-capture` — sin scheduler nuevo.
#
# 🔴 ON declarativo desde el nacimiento, A DIFERENCIA de sus hermanos de gasto: cada día
# con este flag apagado en el worker es un día de serie PERDIDO PARA SIEMPRE (el SERP de
# ayer no se recompra; ~620 observaciones de mercado/día se disuelven). Efectivo con el
# primer deploy del worker que incluya el código (post-release develop→main). La LECTURA
# se gatea con la misma var en Vercel (agregar con el release). Este archivo es el SoT
# declarativo del lado worker. Es SUBORDINADO a `GROWTH_SEO_ENABLED`.
# Rollback (<5 min): `false` acá + `--update-env-vars` — la captura de rank NO se afecta.
GROWTH_SEO_SERP_TOP_RESULTS_ENABLED="${GROWTH_SEO_SERP_TOP_RESULTS_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_SERP_TOP_RESULTS_ENABLED=${GROWTH_SEO_SERP_TOP_RESULTS_ENABLED}"

# TASK-1777 — Drill-down nominal del perfil de enlaces (paso post-batch del snapshot semanal
# de TASK-1304; SIN scheduler nuevo — reusa `ops-seo-backlink-capture` 0 7 * * 1).
#
# 🔴 **OFF por defecto.** Habilita gasto CONDICIONAL: el pase sólo compra detalle donde el
# predicado `shouldDrillDownBacklinks` ve movimiento (o primera vez); un target estable
# registra `skipped_no_movement` a costo cero. Se enciende sólo tras el smoke real
# (target con movimiento gasta ~USD 0.05-0.10; target estable gasta USD 0) + autorización.
#
# ⚠️ Lo lee SOLO el ops-worker. Declararlo acá es obligatorio (`--set-env-vars` destructivo).
# Es SUBORDINADO a `GROWTH_SEO_ENABLED`. Rollback (<5 min): `false` + `--update-env-vars` —
# el batch semanal vuelve a su comportamiento actual sin tocar el cron ni redeployar.
# **ON desde 2026-08-27** (autorización del operador; smoke live verificado el mismo día:
# drill-down sobre los snapshots del 2026-08-24 con first_time, re-corrida a USD 0).
GROWTH_SEO_BACKLINK_DETAIL_ENABLED="${GROWTH_SEO_BACKLINK_DETAIL_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_BACKLINK_DETAIL_ENABLED=${GROWTH_SEO_BACKLINK_DETAIL_ENABLED}"

# TASK-1664 — keyword discovery (DataForSEO Labs Live: seed expansion + enrichment).
# 🔴 Prenderlo habilita corridas que GASTAN (cada request y cada fila cuestan) — pero SOLO
# corridas encoladas explícitamente por un operador/agente con entitlement: no existe enqueue
# automático, así que flag ON + cola vacía = costo cero.
# Lo leen DOS runtimes (Vercel gatea enqueue/lanes; este worker gatea el drain).
# **ON desde 2026-08-14** (autorización del operador tras el smoke live verificado de la task:
# corrida real USD 0.0132 ≤ estimado, idempotencia USD 0, cero auto-track).
# Rollback (<5 min): `false` acá + redeploy + pausar el scheduler; los facts append-only quedan.
GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED="${GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED:-true}"
ENV_VARS="${ENV_VARS},GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED=${GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED}"
ENV_VARS="${ENV_VARS},OPENAI_API_KEY_SECRET_REF=${OPENAI_API_KEY_SECRET_REF}"
ENV_VARS="${ENV_VARS},ANTHROPIC_API_KEY_SECRET_REF=${ANTHROPIC_API_KEY_SECRET_REF}"
ENV_VARS="${ENV_VARS},PERPLEXITY_API_KEY_SECRET_REF=${PERPLEXITY_API_KEY_SECRET_REF}"
ensure_secret_accessor_binding "${OPENAI_API_KEY_SECRET_REF}:latest"
ensure_secret_accessor_binding "${ANTHROPIC_API_KEY_SECRET_REF}:latest"
ensure_secret_accessor_binding "${PERPLEXITY_API_KEY_SECRET_REF}:latest"
# TASK-1230 — el adapter resuelve el token HubSpot via resolveSecretByRef('hubspot-access-token').
ensure_secret_accessor_binding "hubspot-access-token:latest"

# Secrets from Secret Manager (mounted as env vars)
SECRETS="NEXTAUTH_SECRET=${NEXTAUTH_SECRET_REF}"
SECRETS="${SECRETS},GREENHOUSE_POSTGRES_PASSWORD=${PG_PASSWORD_REF}"
SECRETS="${SECRETS},AZURE_AD_CLIENT_SECRET=$(normalize_secret_ref_for_cloud_run "${AZURE_AD_CLIENT_SECRET_REF}")"

if [ -n "${RESEND_API_KEY_SECRET_REF}" ]; then
  SECRETS="${SECRETS},RESEND_API_KEY=$(normalize_secret_ref_for_cloud_run "${RESEND_API_KEY_SECRET_REF}")"
fi

# TASK-844 — SENTRY_DSN for cross-runtime observability.
# Optional: if the secret `greenhouse-sentry-dsn` exists in Secret Manager, mount
# it. If not, the canonical helper `initSentryForService` (services/_shared/
# sentry-init.ts) degrades gracefully — captureWithDomain becomes no-op and
# emits a startup warn. ISSUE-074 fix doesn't depend on this — the underlying
# crash was @sentry/nextjs shape mismatch in Cloud Run runtime, fixed by Slice 1
# (use @sentry/node directly). DSN provisioning enables real per-domain incident
# capture in Sentry; without it, errors still hit Cloud Logging stderr.
SENTRY_DSN_SECRET_NAME="${SENTRY_DSN_SECRET_NAME:-greenhouse-sentry-dsn}"

if gcloud secrets describe "${SENTRY_DSN_SECRET_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  SECRETS="${SECRETS},SENTRY_DSN=${SENTRY_DSN_SECRET_NAME}:latest"
  ensure_secret_accessor_binding "${SENTRY_DSN_SECRET_NAME}:latest"
  echo "  Sentry DSN: mounted from secret '${SENTRY_DSN_SECRET_NAME}'"
else
  echo "  Sentry DSN: secret '${SENTRY_DSN_SECRET_NAME}' not found — observability degraded (captureWithDomain no-op)."
  echo "  Fix: gcloud secrets create ${SENTRY_DSN_SECRET_NAME} --project=${PROJECT_ID} --replication-policy=automatic"
  echo "       echo -n '<DSN_VALUE>' | gcloud secrets versions add ${SENTRY_DSN_SECRET_NAME} --project=${PROJECT_ID} --data-file=-"
fi

# TASK-912 — NOTION_TOKEN para el re-fetch del consumer reactivo
# `notion-status-transition-capture` (productivo Efeonce/Sky). Es el token de la
# integración Notion "Greenhouse PRD" (dueña de la suscripción webhook → acceso
# garantizado a las páginas suscritas). Desde la activación productiva del
# webhook, este secreto es contrato duro del ops-worker: `deploy.sh` usa
# `--set-env-vars`/`--update-secrets` de forma declarativa, así que permitir un
# deploy sin `NOTION_TOKEN` reintroduce el incidente Sentry
# "NOTION_TOKEN not configured" en el siguiente redeploy.
# NOTA: el consumer DEMO usa su propio token (NOTION_METRICS_DEMO_TOKEN_SECRET_REF),
# este es exclusivo del path productivo.
NOTION_TOKEN_SECRET_NAME="${NOTION_TOKEN_SECRET_NAME:-notion-integration-token-greenhouse-prd}"

if ! gcloud secrets describe "${NOTION_TOKEN_SECRET_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "ERROR: Notion token secret '${NOTION_TOKEN_SECRET_NAME}' not found."
  echo "       ops-worker cannot process productive Notion status transitions without NOTION_TOKEN."
  exit 1
fi

SECRETS="${SECRETS},NOTION_TOKEN=${NOTION_TOKEN_SECRET_NAME}:latest"
ensure_secret_accessor_binding "${NOTION_TOKEN_SECRET_NAME}:latest"
echo "  Notion token (status-transition re-fetch): mounted from '${NOTION_TOKEN_SECRET_NAME}'"

# TASK-844 — HUBSPOT_ACCESS_TOKEN for hubspot_services_intake reactive consumer.
# Required by `src/lib/hubspot/list-services-for-company.ts` (canonical helper
# que evita el bridge bug TASK-813) cuando el reactive consumer corre en
# ops-worker y necesita batch read de service properties desde HubSpot API
# directamente. Sin este secret, la projection falla con "HubSpot access token
# not found" — no es un crash sino un retry hasta dead_letter, pero bloquea el
# sync end-to-end webhook → PG core.services. Detectado durante smoke test live
# del cierre ISSUE-074 (commit 3180123e).
HUBSPOT_ACCESS_TOKEN_SECRET_NAME="${HUBSPOT_ACCESS_TOKEN_SECRET_NAME:-hubspot-access-token}"

if gcloud secrets describe "${HUBSPOT_ACCESS_TOKEN_SECRET_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  SECRETS="${SECRETS},HUBSPOT_ACCESS_TOKEN=${HUBSPOT_ACCESS_TOKEN_SECRET_NAME}:latest"
  ensure_secret_accessor_binding "${HUBSPOT_ACCESS_TOKEN_SECRET_NAME}:latest"
  echo "  HubSpot access token: mounted from secret '${HUBSPOT_ACCESS_TOKEN_SECRET_NAME}'"
else
  echo "  HubSpot access token: secret '${HUBSPOT_ACCESS_TOKEN_SECRET_NAME}' not found — hubspot_services_intake projection will fail."
fi

# TASK-913 — NOTION_METRICS_DEMO_TOKEN_SECRET_REF para writeback demo projection.
# Required por `src/lib/notion-metrics/notion-demo-client.ts` cuando el reactive
# consumer `notion-rpa-writeback-demo` invoca PATCH /v1/pages/{id} sobre el
# teamspace Demo Greenhouse. Sin este env var configurado, el resolver degrada
# honest via `NotionDemoClientUnavailableError` (skip silente, no Sentry spam,
# no attempt_count burn) y reliability signal `writeback_lag_demo` alerta.
#
# Defense in depth canonical: el token físicamente separado del productive
# NOTION_TOKEN — permisos SOLO sobre teamspace Demo Greenhouse, NUNCA accesible
# a databases Efeonce/Sky productivos.
#
# Pre-wired desde Slice 4 closing 2026-05-19. Activation depende de operator
# uploading version al secret `notion-integration-token-greenhouse-metrics-demo`
# (ver runbook docs/operations/runbooks/rpa-v2-demo-activation.md).
NOTION_METRICS_DEMO_TOKEN_SECRET_REF="${NOTION_METRICS_DEMO_TOKEN_SECRET_REF:-notion-integration-token-greenhouse-metrics-demo}"
ENV_VARS="${ENV_VARS},NOTION_METRICS_DEMO_TOKEN_SECRET_REF=${NOTION_METRICS_DEMO_TOKEN_SECRET_REF}"

if gcloud secrets describe "${NOTION_METRICS_DEMO_TOKEN_SECRET_REF}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  ensure_secret_accessor_binding "${NOTION_METRICS_DEMO_TOKEN_SECRET_REF}:latest"
  echo "  Notion metrics demo token: secret '${NOTION_METRICS_DEMO_TOKEN_SECRET_REF}' exists; IAM binding ensured."
else
  echo "  Notion metrics demo token: secret '${NOTION_METRICS_DEMO_TOKEN_SECRET_REF}' not found — writeback demo will degrade honest until operator uploads version."
fi

ensure_secret_accessor_binding "${NEXTAUTH_SECRET_REF}"
ensure_secret_accessor_binding "${PG_PASSWORD_REF}"
ensure_secret_accessor_binding "${AZURE_AD_CLIENT_SECRET_REF}"

if [ -n "${RESEND_API_KEY_SECRET_REF}" ]; then
  ensure_secret_accessor_binding "${RESEND_API_KEY_SECRET_REF}"
fi

ensure_secret_accessor_binding "${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF}"
ensure_secret_accessor_binding "${NUBOX_BEARER_TOKEN_SECRET_REF}"
ensure_secret_accessor_binding "${NUBOX_X_API_KEY_SECRET_REF}"

# TASK-849 — GIT_SHA env var for production-release-watchdog drift detection.
# TASK-851 — Aceptar EXPECTED_SHA env var del orchestrator workflow para
# release controlado: el orchestrator pasa el SHA target a deployar y
# post-deploy verificamos que la revision Cloud Run efectivamente recibio
# ese SHA (mismatch = bug en Cloud Build cache, deploy transient o tag drift).
#
# Resolucion en orden:
#   1. $EXPECTED_SHA (orchestrator workflow TASK-851)
#   2. $GITHUB_SHA (auto en GitHub Actions runner para push/dispatch directo)
#   3. git rev-parse HEAD (fallback local)
#   4. 'unknown' (sin git context — watchdog reporta degraded honestamente)
EXPECTED_SHA="${EXPECTED_SHA:-${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}}"
GIT_SHA="${EXPECTED_SHA}"
ENV_VARS="${ENV_VARS},GIT_SHA=${GIT_SHA}"

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
  --no-allow-unauthenticated \
  --set-env-vars="${ENV_VARS}" \
  --update-secrets="${SECRETS}" \
  --quiet

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(status.url)")

echo "=== Service deployed at: ${SERVICE_URL} ==="

# TASK-851 — Verify GIT_SHA env var matches EXPECTED_SHA on deployed revision.
# Defensa-in-depth contra Cloud Build cache mismatch, transient deploy issues o
# tag drift entre workflow trigger y revision serving. Mismatch = exit 1 fail-loud.
# Skipea cuando EXPECTED_SHA='unknown' (no git context).
if [ "${EXPECTED_SHA}" != "unknown" ]; then
  echo "=== Verifying revision GIT_SHA matches EXPECTED_SHA=${EXPECTED_SHA} ==="

  REVISION_NAME="$(gcloud run services describe "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format='value(status.latestReadyRevisionName)')"

  REVISION_GIT_SHA="$(gcloud run revisions describe "${REVISION_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format=json | python3 -c "
import json, sys
data = json.load(sys.stdin)
containers = (data.get('spec', {}) or {}).get('containers', []) or (data.get('spec', {}).get('template', {}) or {}).get('spec', {}).get('containers', [])
for c in containers:
    for env in (c.get('env') or []):
        if env.get('name') == 'GIT_SHA':
            print(env.get('value', ''))
            sys.exit(0)
print('')
" 2>/dev/null || echo "")"

  if [ -z "${REVISION_GIT_SHA}" ]; then
    echo "ERROR: revision ${REVISION_NAME} no expone GIT_SHA env var. Verify deploy applied --set-env-vars correctamente."
    exit 1
  fi

  if [ "${REVISION_GIT_SHA}" != "${EXPECTED_SHA}" ]; then
    echo "ERROR: GIT_SHA mismatch — esperado=${EXPECTED_SHA}, revision serving=${REVISION_GIT_SHA}."
    echo "       Causas comunes: Cloud Build cache stale, tag drift, deploy aborted mid-flight."
    echo "       Re-run el workflow con cache invalidation o investigar Cloud Build logs:"
    echo "       https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
    exit 1
  fi

  echo "✓ GIT_SHA verified: revision ${REVISION_NAME} expone GIT_SHA=${EXPECTED_SHA}"
fi

# ─── IAM: Grant Invoker role to SA (idempotent) ─────────────────────────────

echo "=== Ensuring ${SERVICE_ACCOUNT} has roles/run.invoker ==="
gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" \
  --quiet

# ─── Health Check ────────────────────────────────────────────────────────────
# In CI (GitHub Actions), skip the proxy-based health check. The proxy requires
# an interactive gcloud component install and spawns a background process that
# blocks the shell from exiting, causing the workflow step to hang until timeout.
# The workflow has its own "Verify deployment health" step that handles this.

if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "=== Skipping health check (CI mode — workflow handles this separately) ==="
else
  echo "=== Running health check ==="

  HEALTH_PORT=19092
  gcloud run services proxy "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --port="${HEALTH_PORT}" &
  PROXY_PID=$!

  HEALTH_OK=false
  for i in 1 2 3 4 5; do
    sleep 3
    if curl -sf "http://localhost:${HEALTH_PORT}/health" | python3 -m json.tool 2>/dev/null; then
      HEALTH_OK=true
      break
    fi
    echo "  health check attempt ${i}/5 — retrying..."
  done

  kill "${PROXY_PID}" 2>/dev/null || true
  wait "${PROXY_PID}" 2>/dev/null || true

  if [ "${HEALTH_OK}" = "false" ]; then
    echo "WARN: health check failed after 5 attempts — service may need manual verification"
  fi
fi

# ─── Cloud Scheduler Jobs ────────────────────────────────────────────────────

echo "=== Creating Cloud Scheduler jobs ==="

# Helper: delete a scheduler job if it exists (idempotent, never fails the script).
delete_scheduler_job() {
  local job_name="$1"
  gcloud scheduler jobs delete "${job_name}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --quiet 2>/dev/null || true
}

# Helper: create-or-update a Cloud Scheduler HTTP job with OIDC auth.
# Args: job_name, schedule, path, message_body, [paused]
upsert_scheduler_job() {
  local job_name="$1"
  local schedule="$2"
  local uri_path="$3"
  local body="$4"
  local paused="${5:-false}"

  gcloud scheduler jobs create http "${job_name}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --schedule="${schedule}" \
    --time-zone="${SCHEDULER_TZ}" \
    --uri="${SERVICE_URL}${uri_path}" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body="${body}" \
    --oidc-service-account-email="${SERVICE_ACCOUNT}" \
    --oidc-token-audience="${SERVICE_URL}" \
    --attempt-deadline="540s" \
    --max-retry-attempts=1 \
    --quiet 2>/dev/null || \
  gcloud scheduler jobs update http "${job_name}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --schedule="${schedule}" \
    --time-zone="${SCHEDULER_TZ}" \
    --uri="${SERVICE_URL}${uri_path}" \
    --http-method=POST \
    --update-headers="Content-Type=application/json" \
    --message-body="${body}" \
    --oidc-service-account-email="${SERVICE_ACCOUNT}" \
    --oidc-token-audience="${SERVICE_URL}" \
    --attempt-deadline="540s" \
    --max-retry-attempts=1 \
    --quiet

  if [ "${paused}" = "true" ]; then
    gcloud scheduler jobs pause "${job_name}" \
      --project="${PROJECT_ID}" \
      --location="${REGION}" \
      --quiet
  else
    gcloud scheduler jobs resume "${job_name}" \
      --project="${PROJECT_ID}" \
      --location="${REGION}" \
      --quiet 2>/dev/null || true
  fi
}

# Cleanup: remove legacy "all domains" jobs replaced by per-domain lanes (TASK-379 Slice 3).
echo "  -> cleaning up legacy scheduler jobs (if present)..."
delete_scheduler_job "ops-reactive-process"
delete_scheduler_job "ops-reactive-process-delivery"

# ─── Per-domain reactive lanes (TASK-379 Slice 3) ───────────────────────────
# Each domain gets its own Cloud Scheduler job hitting POST /reactive/process-domain
# so domains drain independently and multi-instance workers can fan out safely
# via refresh_queue SKIP LOCKED. Offsets spread the load across the minute.

# TASK-1391 — dispatcher del artifact-worker (Cloud Run Job). Flag OFF ⇒ el endpoint
# hace skip logueado; el scheduler puede quedar creado sin costo de render.
upsert_scheduler_job \
  "ops-artifact-render-dispatch" \
  "*/2 * * * *" \
  "/artifact-render/dispatch" \
  '{}'
echo "  -> ops-artifact-render-dispatch: */2 * * * * (TASK-1391 render queue)"

# TASK-1521 — Freshness is a renewable lease, independent from semantic
# workspace/member revisions. Five-minute cadence leaves a seven-minute
# failure budget inside the reconciler's 12-minute fail-closed snapshot TTL.
upsert_scheduler_job \
  "ops-globe-tenancy-reconcile" \
  "*/5 * * * *" \
  "/globe/tenancy/reconcile" \
  '{}'
echo "  -> ops-globe-tenancy-reconcile: */5 * * * * (Greenhouse → Globe full-workspace tenancy V2)"

# TASK-1723 — Incremental safety-net over the canonical Hiring sources. The
# handler is idempotent and flag-gated; five minutes bounds projection staleness
# without introducing another event store or mutating source aggregates.
upsert_scheduler_job \
  "ops-hiring-talent-pool-reconcile" \
  "*/5 * * * *" \
  "/hiring/talent-pool/reconcile" \
  '{}'
echo "  -> ops-hiring-talent-pool-reconcile: */5 * * * * (Talent Pool projection, TASK-1723)"

# TASK-1734 Slice 6 — drain del run de scoring IA de assessments (ADR D4, pieza 2).
# El job nace PAUSADO mientras HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED=false: el flip
# del flag en ESTE archivo (SoT, rollout gated a señal del operador) lo resume en el
# mismo deploy. Defensa doble: el handler además hace skip logueado con el flag OFF
# (y exige también el master HIRING_ASSESSMENT_AI_ENABLED en este runtime).
# Runbook: docs/operations/runbooks/assessment-ai-scoring-rollout.md
ASSESSMENT_AI_DRAIN_PAUSED="true"
if [ "${HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED}" = "true" ]; then
  ASSESSMENT_AI_DRAIN_PAUSED="false"
fi
upsert_scheduler_job \
  "ops-assessment-ai-drain" \
  "*/2 * * * *" \
  "/assessment-ai/drain-scoring-runs" \
  '{}' \
  "${ASSESSMENT_AI_DRAIN_PAUSED}"
echo "  -> ops-assessment-ai-drain: */2 * * * * (assessment AI scoring drain, TASK-1734; paused=${ASSESSMENT_AI_DRAIN_PAUSED})"

upsert_scheduler_job \
  "ops-reactive-organization" \
  "*/5 * * * *" \
  "/reactive/process-domain" \
  '{"domain":"organization","batchSize":500}'
echo "  -> ops-reactive-organization: */5 * * * * (organization domain)"

upsert_scheduler_job \
  "ops-reactive-finance" \
  "*/5 * * * *" \
  "/reactive/process-domain" \
  '{"domain":"finance","batchSize":500}'
echo "  -> ops-reactive-finance: */5 * * * * (finance domain)"

upsert_scheduler_job \
  "ops-reactive-people" \
  "2-59/5 * * * *" \
  "/reactive/process-domain" \
  '{"domain":"people","batchSize":500}'
echo "  -> ops-reactive-people: 2-59/5 * * * * (people domain, +2 min offset)"

upsert_scheduler_job \
  "ops-reactive-notifications" \
  "*/2 * * * *" \
  "/reactive/process-domain" \
  '{"domain":"notifications","batchSize":500}'
echo "  -> ops-reactive-notifications: */2 * * * * (notifications domain, high cadence)"

upsert_scheduler_job \
  "ops-reactive-delivery" \
  "*/5 * * * *" \
  "/reactive/process-domain" \
  '{"domain":"delivery","batchSize":500}'
echo "  -> ops-reactive-delivery: */5 * * * * (delivery domain)"

upsert_scheduler_job \
  "ops-reactive-cost-intelligence" \
  "*/10 * * * *" \
  "/reactive/process-domain" \
  '{"domain":"cost_intelligence","batchSize":500}'
echo "  -> ops-reactive-cost-intelligence: */10 * * * * (cost_intelligence domain)"

# TASK-1251 — Growth domain lane. Drena `growth.forms.submission_accepted` (grader-form)
# → enqueue grader run + materialize lead (proyección growth_grader_run_from_submission).
# Sin este job, los submissions del grader convergente NO encolarían run (rollout dep del
# flag GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED; default OFF = sin tráfico hasta el flip).
upsert_scheduler_job \
  "ops-reactive-growth" \
  "*/5 * * * *" \
  "/reactive/process-domain" \
  '{"domain":"growth","batchSize":500}'
echo "  -> ops-reactive-growth: */5 * * * * (growth domain, TASK-1251)"

# ─── Outbox publisher (TASK-773) ─────────────────────────────────────────────
# Migración desde Vercel cron /api/cron/outbox-publish (que solo corre en
# producción) a Cloud Scheduler (que corre por proyecto GCP, igual en staging
# y prod). Cierra clase de bugs invisibles donde flujos write-then-projection
# de Finance funcionan en producción pero quedan colgados en staging.
#
# Cron */2 min: más frecuente que el original */5 para mejor SLA. Costo
# negligible (< 1s CPU por run cuando no hay events). State machine:
# pending → publishing → published/failed/dead_letter (max 5 retries).
upsert_scheduler_job \
  "ops-outbox-publish" \
  "*/2 * * * *" \
  "/outbox/publish-batch" \
  '{"batchSize":500,"maxRetries":5}'
echo "  -> ops-outbox-publish: */2 * * * * (outbox PG → BQ raw publisher, TASK-773)"

# AI Visibility Grader async drain — TASK-1234.
#
# El endpoint admin encola un run `pending`; este job lo reclama (claim atómico
# FOR UPDATE SKIP LOCKED, sin doble ejecución) y lo ejecuta vía el primitive,
# persistiendo cada observación incrementalmente, además de recuperar runs
# huérfanos en `running`. batchSize=1: un run por invocación (los runs full son
# largos; el request Cloud Run lo sostiene hasta el TIMEOUT=3600s). El
# attempt-deadline del scheduler (540s) que se rinde NO mata el request en vuelo
# — el run termina y el siguiente ciclo simplemente no encuentra pending.
#
# Cron */5 min: SLA de arranque ≤5 min para un run encolado (los runs duran
# minutos, no segundos). Gated: con los flags GROWTH_AI_VISIBILITY_* OFF (default)
# cada adapter resuelve skip limpio; cero llamadas, cero costo.
upsert_scheduler_job \
  "ops-growth-grader-drain" \
  "*/5 * * * *" \
  "/growth/grader/drain" \
  '{"batchSize":1}'
echo "  -> ops-growth-grader-drain: */5 * * * * (AI Visibility Grader async execution, TASK-1234)"

# AI Visibility recurring re-grade — TASK-1270.
#
# Staging activo tras rollout develop; production queda OFF/paused por default.
# El handler gatea por GROWTH_AI_VISIBILITY_REGRADE_ENABLED + opt-in por perfil
# + budget mensual, por lo que un job activo sin perfiles due es no-op.
upsert_scheduler_job \
  "ops-growth-grader-regrade" \
  "0 8 * * *" \
  "/growth/grader/regrade" \
  '{"batchSize":5}' \
  "${GROWTH_AI_VISIBILITY_REGRADE_SCHEDULER_PAUSED}"
echo "  -> ops-growth-grader-regrade: 0 8 * * * (paused=${GROWTH_AI_VISIBILITY_REGRADE_SCHEDULER_PAUSED}, AI Visibility recurring re-grade, TASK-1270)"

# Growth Forms dispatch — TASK-1229.
#
# Cron */2 min: entrega async de submissions aceptadas del motor Growth Forms
# (delivery SLA ≤2 min, mismo cadence que el outbox publisher). Gated: con
# GROWTH_FORMS_DISPATCH_ENABLED OFF (default) el handler hace no-op (cero queries).
# El adapter en 1229 es fake/echo; el HubSpot real es TASK-1230.
upsert_scheduler_job \
  "ops-growth-forms-dispatch" \
  "*/2 * * * *" \
  "/growth/forms/dispatch" \
  '{}'
echo "  -> ops-growth-forms-dispatch: */2 * * * * (Growth Forms delivery, TASK-1229)"

# SEO — materialización diaria de Google Search Console (TASK-1302).
#
# Cron 0 9 * * * America/Santiago: una vez al día, tras la madrugada, para capturar
# AYER (GSC no publica el día en curso). Convierte el read-through de GSC en una serie
# propia que sobrevive la ventana de 16 meses de Google, y es idempotente por
# `capture_date`: el re-run corrige el consolidado tardío (~48h) sin duplicar.
#
# ACTIVO desde el rollout 2026-08-05. Nació pausado por diseño; se despausa acá y no a mano
# porque `upsert_scheduler_job` re-aplica el estado en CADA deploy: dejarlo con `true` y
# despausarlo out-of-band lo volvería a pausar en el siguiente deploy, en silencio (misma
# trampa que un env var aplicado sólo en vivo).
# Precondiciones ya cumplidas: migración aplicada, handler desplegado, GROWTH_SEO_ENABLED=true
# y config OAuth de Search Console cableada en ESTE servicio (arriba).
# Rollback (<5 min): `gcloud scheduler jobs pause ops-seo-gsc-snapshot` + poner el 5º arg en
# "true" acá para que el pause sobreviva al próximo deploy.
upsert_scheduler_job \
  "ops-seo-gsc-snapshot" \
  "0 9 * * *" \
  "/seo/gsc/snapshot-batch" \
  '{}' \
  "false"
echo "  -> ops-seo-gsc-snapshot: 0 9 * * * ACTIVO (materialización GSC diaria, TASK-1302)"

# Rank capture diario — TASK-1303.
#
# Cron 0 5 * * * America/Santiago: captura la posición EXACTA (DataForSEO SERP, familia
# `serp`) de las keywords vigentes de cada target activo con assignment `seo_v1`. La
# madrugada da un capture_date consistente para toda la serie del día.
#
# ACTIVO desde 2026-08-06 (autorización del operador). Nació pausado por diseño y se
# despausó ACÁ (no a mano) tras el smoke real E2E del mismo día: captura Berel 8/8 con
# costo real USD 0.03, gate + spend fence verificados, re-run idempotente USD 0, mirror
# BQ con las 8 filas y signal honesto. Evidencia: runbook
# docs/manual-de-uso/growth/operar-captura-rankings-seo.md §Verificacion ejecutada.
# El blast radius real lo controla el assignment per-org (Berel primero, §11): el batch
# solo itera orgs con `module_assignments.seo_v1` vigente.
# Rollback (<5 min): volver el 5º arg a "true" + redeploy (el estado se re-aplica en
# CADA deploy; pausar out-of-band se revierte solo en el siguiente deploy, en silencio).
upsert_scheduler_job \
  "ops-seo-rank-capture" \
  "0 5 * * *" \
  "/seo/rank/capture-batch" \
  '{}' \
  "false"
echo "  -> ops-seo-rank-capture: 0 5 * * * ACTIVO (rank capture diario, TASK-1303 — despausado 2026-08-06 tras smoke E2E)"

# Site audit OnPage (2 fases desacopladas) + backlink snapshot — TASK-1304.
#
# OnPage es task-based ASYNC: `enqueue` (lunes 06:00 CLT) crea el crawl y persiste
# `provider_task_id` con status=running; `collect` (cada 30 min) poll-ea idempotente
# (claim FOR UPDATE SKIP LOCKED) y materializa runs + findings cuando la task termina.
# Backlinks es live: snapshot semanal (lunes 07:00 CLT) idempotente por capture_date.
#
# Nacieron PAUSADOS y se despausaron ACÁ el 2026-08-06 (autorización del operador,
# "termina todo lo que falte") tras el smoke E2E real (crawl + backlinks con dinero real,
# exactly-once verificado) y la verificación de los 3 handlers vía HTTP en el worker
# desplegado. Re-pausar = 5º arg a "true" + redeploy (el estado se re-aplica en CADA deploy).
upsert_scheduler_job \
  "ops-seo-audit-enqueue" \
  "0 6 * * 1" \
  "/seo/audit/enqueue-batch" \
  '{}' \
  "false"
echo "  -> ops-seo-audit-enqueue: 0 6 * * 1 ACTIVO (site audit enqueue semanal, TASK-1304 — despausado 2026-08-06)"

upsert_scheduler_job \
  "ops-seo-audit-collect" \
  "*/30 * * * *" \
  "/seo/audit/collect" \
  '{}' \
  "false"
echo "  -> ops-seo-audit-collect: */30 * * * * ACTIVO (site audit poll idempotente, TASK-1304 — despausado 2026-08-06)"

upsert_scheduler_job \
  "ops-seo-backlink-capture" \
  "0 7 * * 1" \
  "/seo/backlinks/capture-batch" \
  '{}' \
  "false"
echo "  -> ops-seo-backlink-capture: 0 7 * * 1 ACTIVO (backlink snapshot semanal, TASK-1304 — despausado 2026-08-06)"

# Datos de mercado por keyword — TASK-1661.
#
# ⚠️ MENSUAL, no diario ni semanal. DataForSEO refresca las métricas de keyword UNA VEZ AL MES
# siguiendo el ciclo de Google Ads; un cron más frecuente pagaría varias veces por el mismo
# número. Día 15 porque el proveedor documenta que "a mitad de mes ya hay data fresca del mes
# anterior": correr el día 1 traería el ciclo viejo al mismo precio.
#
# 🔴 NACE PAUSADO y además el flag `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED` nace en `false`:
# son DOS frenos independientes, porque esta corrida GASTA. Despausar sin prender el flag no
# gasta (el command devuelve `disabled`); prender el flag sin despausar tampoco.
# Antes de despausar: correr el dry-run (`{"dryRun": true}`), mirar el costo estimado y tener
# la autorización del operador. Costo medido del alcance V1: ~USD 0.016 (31 keywords, Berel).
upsert_scheduler_job \
  "ops-seo-keyword-market-data" \
  "0 8 15 * *" \
  "/seo/keyword-market-data/capture-batch" \
  '{}' \
  "false"
echo "  -> ops-seo-keyword-market-data: 0 8 15 * * ACTIVO (captura mensual de mercado, TASK-1661 — despausado 2026-08-13 tras dry-run + corrida real verificada + autorización del operador)"

# Foto de dominio — TASK-1775.
#
# ⚠️ MENSUAL: las bases Labs del proveedor se refrescan por ciclo (~mensual); un cron más
# frecuente pagaría varias veces por el mismo número. Día 16 y no 15 a propósito: misma
# frescura mid-month que documenta el proveedor, sin apilar gasto de proveedor en la misma
# fecha que `ops-seo-keyword-market-data`.
#
# 🔴 NACE PAUSADO y además el flag `GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED` nace en `false`:
# son DOS frenos independientes, porque esta corrida GASTA (patrón TASK-1661). Antes de
# despausar: correr el dry-run (`{"dryRun": true}`), mirar el costo estimado y tener la
# autorización del operador (TASK-1775 Slice 6).
upsert_scheduler_job \
  "ops-seo-domain-overview" \
  "0 9 16 * *" \
  "/seo/domain-overview/capture-batch" \
  '{}' \
  "false"
echo "  -> ops-seo-domain-overview: 0 9 16 * * ACTIVO (foto de dominio mensual, TASK-1775 — despausado 2026-08-27 tras dry-run + corrida real + re-corrida USD 0 + autorización del operador)"

# Visibilidad por sujeto-página — TASK-1776.
#
# ⚠️ MENSUAL (las bases Labs se refrescan por ciclo). Día 17 a propósito: no apilar gasto de
# proveedor con keyword-market-data (día 15) ni con la foto de dominio (día 16).
#
# 🔴 NACE PAUSADO y el flag `GROWTH_SEO_URL_VISIBILITY_ENABLED` nace en `false`: dos frenos
# independientes (patrón TASK-1661/1775). Antes de despausar: dry-run (`{"dryRun": true}`),
# smoke real con los cuatro subject_kind y autorización del operador.
upsert_scheduler_job \
  "ops-seo-url-visibility" \
  "0 9 17 * *" \
  "/seo/url-visibility/capture-batch" \
  '{}' \
  "false"
echo "  -> ops-seo-url-visibility: 0 9 17 * * ACTIVO (visibilidad por sujeto-página mensual, TASK-1776 — despausado 2026-08-27 tras smoke con los cuatro subject_kind + autorización del operador)"

# TASK-1662 — cobertura mensual de keywords de competidores declarados (keyword gap).
# Día 18: cadencia mensual en día propio para no apilar gasto con los jobs SEO de los
# días 15/16/17 (mercado / foto de dominio / visibilidad por sujeto).
#
# 🔴 PAUSADO hasta el primer deploy del worker que incluya `/seo/competitor-coverage/
# capture-batch` (post-release develop→main): despausarlo antes haría que Cloud Scheduler
# golpee un 404 en la revisión vigente. La secuencia de verificación YA corrió el
# 2026-08-28 con autorización plena (dry-run + primera corrida real USD 0,1076 verificada
# en el ledger, un competidor de una org), así que al despausar sólo falta confirmar que
# el endpoint responde en la revisión activa. El payload vacío usa el default
# `maxCompetitors=1` (V1: un competidor a la vez).
# 🟢 DESPAUSADO 2026-08-29 con autorización explícita del operador. La condición que faltaba
# —"confirmar que el endpoint responde en la revisión activa"— quedó verificada con la MISMA
# identidad OIDC que usa Cloud Scheduler: `POST {"dryRun":true}` → HTTP 200,
# `ok:true status:completed providerCostUsd:0`, shape válido y cero gasto.
#
# ⚠️ `eligible: 0` en las primeras corridas NO es un defecto: el competidor capturado el
# 2026-08-28 está dentro de su ventana de frescura, así que no hay elegibles hasta que venza.
# Leerlo como "el job no funciona" sería el error.
#
# Despausado en el SoT Y en vivo: `upsert_scheduler_job` hace `pause`/`resume` EXPLÍCITO en cada
# deploy, así que un resume out-of-band se revierte solo en el próximo.
upsert_scheduler_job \
  "ops-seo-competitor-coverage" \
  "0 9 18 * *" \
  "/seo/competitor-coverage/capture-batch" \
  '{}' \
  "false"
echo "  -> ops-seo-competitor-coverage: 0 9 18 * * ACTIVO (cobertura de competidores mensual, TASK-1662 — despausado 2026-08-29 tras dry-run verificado en la revisión activa + autorización del operador)"

# TASK-1664 — drain de corridas de keyword discovery (Labs Live, bajo demanda del operador).
# Cada 10 minutos alcanza de sobra: el enqueue es humano/agente (no hay cadencia diaria en V1)
# y una corrida pendiente se procesa en el siguiente tick.
#
# Nació PAUSADO con el flag en `false` (dos frenos, patrón TASK-1661); ambos liberados el
# 2026-08-14 tras el smoke live verificado + autorización del operador. El drain con cola
# vacía es no-op (cero llamadas, cero costo): el gasto sólo ocurre cuando alguien encola una
# corrida, que ya pasó preview + gate de entitlement.
#
# Cadencia */2 (bajada de */10 el 2026-08-28, autorización del operador): `Descubrir` es un
# workbench INTERACTIVO — el operador encola y espera mirando "En cola". Con */10 la espera media
# era 5 min y el peor caso 10, cuando la corrida en sí tarda segundos (1 llamada al proveedor). El
# */10 no compraba nada: el drain con cola vacía es no-op, así que correrlo 5× más seguido no gasta
# ni un centavo más — es el mismo razonamiento por el que `ops-outbox-publish` ya usa */2.
# Seguro a esta cadencia porque el claim es un UPDATE condicional (`WHERE status='pending'`
# ... RETURNING): un segundo worker matchea cero filas y responde `busy` sin tocar al proveedor.
upsert_scheduler_job \
  "ops-seo-keyword-discovery-drain" \
  "*/2 * * * *" \
  "/seo/keyword-discovery/drain" \
  '{}' \
  "false"
echo "  -> ops-seo-keyword-discovery-drain: */2 * * * * ACTIVO (keyword discovery, TASK-1664 — despausado 2026-08-14; cadencia bajada de */10 a */2 el 2026-08-28)"

# TASK-1700 — Cola priorizada de trabajo SEO. Cadencia DIARIA a las 10:00, DESPUÉS de
# `ops-seo-gsc-snapshot` (0 9): el plan del día se calcula cuando ya llegó la demanda medida
# del día, no antes — con el orden invertido el plan de hoy se armaría con los datos de ayer.
#
# 🔴 NACE PAUSADO. Es el TERCER freno independiente, además del flag del worker y el de
# Vercel: la cola cambia de dueño el orden que el operador ve en pantalla, así que se despausa
# recién tras la corrida shadow verificada sobre un target y el aviso al operador de SEO.
#
# El cron NO manda `force`: si el snapshot vigente es reciente, reusarlo ES la respuesta
# correcta — mismos insumos, cero writes.
# 🟢 DESPAUSADO 2026-08-29 tras la corrida shadow verificada + autorización del operador.
#
# Evidencia de la shadow (invocación directa del endpoint con la MISMA identidad OIDC que usa
# el scheduler, no una aproximación con curl anónimo): `status=succeeded`, `eligible=2`,
# `materialized=1`, `reused=1`, `failed=0`. Inspección fila por fila del target
# `seot-efeonce-own-brand` (105 items): `staleness=fresh`, 5 de 6 orígenes `ok` y
# `competitor_gap` declarado `degraded` sin arrastrar a los demás, verbos coherentes con su
# origen, y **55 en banda 2 y 50 en banda 3, 0 de 105 con `priority_score`** (medido sobre la página completa; una lectura previa de 8 filas se reportó como «todas banda 2» y era una vista parcial) — que es la degradación
# honesta, no una falla: hay demanda medida pero la curva de CTR del sitio no es utilizable, y
# la cola se NIEGA a fabricar un número. Leer ese `null` como 0 invertiría el significado.
#
# 🔴 Se despausa acá, en el SoT, y NO sólo con `gcloud scheduler jobs resume`:
# `upsert_scheduler_job` ejecuta `pause`/`resume` EXPLÍCITO en cada deploy según este 5.º
# argumento, así que un resume out-of-band lo revierte el próximo deploy — mismo modo de falla
# que un `--update-env-vars` suelto sobre un flag.
#
# VENTANA CERRADA 2026-08-29 (release 64bdd105c): `main` y `develop` declaran ambos `"false"`,
# verificado leyendo el 5.º argumento en las DOS ramas, no el comentario. Un deploy desde
# cualquiera de las dos lo deja ACTIVO. Se conserva la nota porque el mecanismo sigue vigente:
# hay UN solo `ops-worker` y UN solo juego de jobs de Cloud Scheduler (staging y producción los
# comparten), así que si alguna vez las ramas divergen en este argumento, el deploy que corra el
# árbol equivocado pausa el job en silencio. La verdad es este argumento, nunca el comentario.
upsert_scheduler_job \
  "ops-seo-work-queue-materialize" \
  "0 10 * * *" \
  "/seo/work-queue/materialize-batch" \
  '{}' \
  "false"
echo "  -> ops-seo-work-queue-materialize: 0 10 * * * ACTIVO (cola priorizada, TASK-1700 — despausado 2026-08-29 tras corrida shadow verificada + autorización del operador)"

# Email deliverability monitor — TASK-775 Slice 2.
#
# Cron 0 */6 * * * America/Santiago: 4 runs/día. Cómputa bounce/complaint rate
# de los últimos 7 días sobre `greenhouse_notifications.email_deliveries` y
# emite outbox events `email.deliverability.alert` si excede thresholds Gmail
# (2% bounces, 0.1% complaints).
#
# Razón Cloud Scheduler: el cron Vercel original NUNCA disparaba alerts en
# staging porque Vercel custom env no ejecuta crons. Cloud Scheduler corre por
# proyecto GCP, igual en staging y prod.
upsert_scheduler_job \
  "ops-email-deliverability-monitor" \
  "0 */6 * * *" \
  "/email-deliverability-monitor" \
  '{}'
echo "  -> ops-email-deliverability-monitor: 0 */6 * * * (bounce/complaint monitor, TASK-775)"

# Nubox sync crons — TASK-775 Slice 3.
#
# 3 jobs migrados del Vercel cron lane:
#   - ops-nubox-balance-sync (cada 4h): rebajá balance_nubox en PG income/expenses
#     desde BQ conformed, emite outbox events de divergence. Lightweight.
#   - ops-nubox-sync (07:30 daily): 3-fase Nubox API → BQ raw → conformed → PG.
#     Heavy — corre en horario de baja demanda.
#   - ops-nubox-quotes-hot-sync (cada 15min): quotes hot path para periods activos.
#
# Razón Cloud Scheduler: balances Nubox en staging quedaban stale para QA porque
# Vercel custom env no ejecuta crons. Cloud Scheduler corre por proyecto GCP.
upsert_scheduler_job \
  "ops-nubox-balance-sync" \
  "0 */4 * * *" \
  "/nubox/balance-sync" \
  '{}'
echo "  -> ops-nubox-balance-sync: 0 */4 * * * (Nubox balances → PG + divergence outbox, TASK-775)"

upsert_scheduler_job \
  "ops-nubox-sync" \
  "30 7 * * *" \
  "/nubox/sync" \
  '{}'
echo "  -> ops-nubox-sync: 30 7 * * * (3-fase Nubox API → BQ raw → conformed → PG, TASK-775)"

upsert_scheduler_job \
  "ops-nubox-quotes-hot-sync" \
  "*/15 * * * *" \
  "/nubox/quotes-hot-sync" \
  '{}'
echo "  -> ops-nubox-quotes-hot-sync: */15 * * * * (Nubox quotes hot path, TASK-775)"

# ─── TASK-775 Slice 7 mass migration (12 crons) ─────────────────────────────
#
# Migración bulk de los crons restantes del Vercel cron lane: webhook-dispatch,
# email-delivery-retry, entra-*, hubspot-*, sync-conformed-recovery, recon-auto-match.
#
# Razón unificada: todos son async-critical (alimentan o consumen pipelines downstream
# que QA y staging necesitan probar). Vercel custom env NO ejecuta crons → flow
# downstream se rompe silenciosamente. Cloud Scheduler corre por proyecto GCP, igual
# en cualquier env.

upsert_scheduler_job \
  "ops-webhook-dispatch" \
  "*/2 * * * *" \
  "/webhook-dispatch" \
  '{}'
echo "  -> ops-webhook-dispatch: */2 * * * * (outbound webhooks, TASK-775)"

upsert_scheduler_job \
  "ops-email-delivery-retry" \
  "*/5 * * * *" \
  "/email-delivery-retry" \
  '{}'
echo "  -> ops-email-delivery-retry: */5 * * * * (failed email retry, TASK-775)"

upsert_scheduler_job \
  "ops-hiring-assessment-public-access-retention" \
  "17 4 * * *" \
  "/hiring/assessment/public-access-retention" \
  '{}'
echo "  -> ops-hiring-assessment-public-access-retention: 17 4 * * * (24h public access retention, TASK-1746)"

upsert_scheduler_job \
  "ops-entra-profile-sync" \
  "0 8 * * *" \
  "/entra/profile-sync" \
  '{}'
echo "  -> ops-entra-profile-sync: 0 8 * * * (Entra users + manager sync, TASK-775)"

upsert_scheduler_job \
  "ops-entra-webhook-renew" \
  "0 6 */2 * *" \
  "/entra/webhook-renew" \
  '{}'
echo "  -> ops-entra-webhook-renew: 0 6 */2 * * (Entra webhook subscription renew, TASK-775)"

upsert_scheduler_job \
  "ops-hubspot-quotes-sync" \
  "0 */6 * * *" \
  "/hubspot/quotes-sync" \
  '{}'
echo "  -> ops-hubspot-quotes-sync: 0 */6 * * * (HubSpot quotes sync, TASK-775)"

upsert_scheduler_job \
  "ops-hubspot-company-lifecycle-sync" \
  "0 */6 * * *" \
  "/hubspot/company-lifecycle-sync" \
  '{}'
echo "  -> ops-hubspot-company-lifecycle-sync: 0 */6 * * * (HubSpot lifecycle sync, TASK-775)"

upsert_scheduler_job \
  "ops-hubspot-companies-sync" \
  "*/10 * * * *" \
  "/hubspot/companies-sync" \
  '{}'
echo "  -> ops-hubspot-companies-sync: */10 * * * * (HubSpot companies incremental, TASK-775)"

upsert_scheduler_job \
  "ops-hubspot-companies-sync-full" \
  "0 3 * * *" \
  "/hubspot/companies-sync" \
  '{"fullResync":true}'
echo "  -> ops-hubspot-companies-sync-full: 0 3 * * * (HubSpot companies daily full resync, TASK-775)"

upsert_scheduler_job \
  "ops-hubspot-deals-sync" \
  "0 */4 * * *" \
  "/hubspot/deals-sync" \
  '{}'
echo "  -> ops-hubspot-deals-sync: 0 */4 * * * (HubSpot deals sync, TASK-775)"

upsert_scheduler_job \
  "ops-hubspot-products-sync" \
  "0 8 * * *" \
  "/hubspot/products-sync" \
  '{}'
echo "  -> ops-hubspot-products-sync: 0 8 * * * (HubSpot products sync, TASK-775)"

upsert_scheduler_job \
  "ops-hubspot-services-sync" \
  "0 6 * * *" \
  "/hubspot/services-sync" \
  '{}'
echo "  -> ops-hubspot-services-sync: 0 6 * * * (HubSpot p_services 0-162 safety-net, TASK-813)"

upsert_scheduler_job \
  "ops-notion-conformed-recovery" \
  "*/30 * * * *" \
  "/notion-conformed/recovery" \
  '{}'
echo "  -> ops-notion-conformed-recovery: */30 * * * * (Notion sync recovery retries, TASK-775)"

upsert_scheduler_job \
  "ops-reconciliation-auto-match" \
  "45 7 * * *" \
  "/reconciliation/auto-match" \
  '{}'
echo "  -> ops-reconciliation-auto-match: 45 7 * * * (continuous bank statement auto-match, TASK-775)"

# ICO member sync — TASK-775 Slice 9.
#
# Async-critical: alimenta /people/[id]/ico (métricas RPA, OTD, FTR, throughput)
# que QA y operadores usan en staging para validar el motor ICO. Si queda stale
# en staging, QA cree que el motor está roto.
upsert_scheduler_job \
  "ops-ico-member-sync" \
  "30 10 * * *" \
  "/ico/member-sync" \
  '{}'
echo "  -> ops-ico-member-sync: 30 10 * * * (ICO member metrics BQ → PG, TASK-775)"

upsert_scheduler_job \
  "ops-otd-writeback" \
  "0 11 * * *" \
  "/otd/writeback" \
  '{}'
echo "  -> ops-otd-writeback: 0 11 * * * (OTD bucket freeze-aware → Notion [GH] OTD, TASK-927; gated NOTION_OTD_WRITEBACK_ENABLED default OFF)"

# Global projection recovery — unchanged lane.
upsert_scheduler_job \
  "ops-reactive-recover" \
  "*/15 * * * *" \
  "/reactive/recover" \
  '{"batchSize":10,"staleMinutes":30}'
echo "  -> ops-reactive-recover: */15 * * * * (projection recovery)"

upsert_scheduler_job \
  "ops-nexa-weekly-digest" \
  "0 7 * * 1" \
  "/nexa/weekly-digest" \
  '{"limit":8}'
echo "  -> ops-nexa-weekly-digest: 0 7 * * 1 (weekly Nexa executive digest)"

upsert_scheduler_job \
  "ops-product-catalog-drift-detect" \
  "0 3 * * *" \
  "/product-catalog/drift-detect" \
  '{}'
echo "  -> ops-product-catalog-drift-detect: 0 3 * * * (nightly HubSpot product drift detect, TASK-548)"

upsert_scheduler_job \
  "ops-product-catalog-reconcile-v2" \
  "0 6 * * 1" \
  "/product-catalog/reconcile-v2" \
  '{}'
echo "  -> ops-product-catalog-reconcile-v2: 0 6 * * 1 (weekly Mon 06:00 Santiago, v2 drift classifier + Slack alert, TASK-605)"

# ─── Finance daily probes (TASK-702 Slice 7) ────────────────────────────────
# Cloud Run is the canonical home for finance crons:
#   - Vercel cron timeout 800s vs Cloud Run 60min — rematerialize loops 7 days
#     × N accounts which is fine here, tight on Vercel.
#   - Rolling balance rematerialization MUST seed from the last persisted
#     closing row (`seedMode=explicit` in code), not from historical OTB, so the
#     daily job cannot rewrite bank history while refreshing the trailing range.
#   - Cloud Scheduler retry exponencial nativo + co-located con Cloud SQL.
#   - Reliability signal via captureMessageWithDomain('finance') feeds the
#     incident lane of the dashboard, no extra Sentry project required.

upsert_scheduler_job \
  "ops-finance-rematerialize-balances" \
  "0 5 * * *" \
  "/finance/rematerialize-balances" \
  '{"lookbackDays":7}'
echo "  -> ops-finance-rematerialize-balances: 0 5 * * * America/Santiago (daily 05:00, last 7 days, TASK-702)"

upsert_scheduler_job \
  "ops-finance-fx-drift-remediate" \
  "15 5 * * *" \
  "/finance/account-balances/fx-drift/remediate" \
  '{"triggeredBy":"cloud_scheduler","dryRun":false,"policy":"known_bug_class_restatement","windowDays":90,"maxRows":25,"maxAccounts":10,"maxAbsDriftClp":"5000000"}'
echo "  -> ops-finance-fx-drift-remediate: 15 5 * * * America/Santiago (daily 05:15, bounded account_balances FX drift remediation, TASK-842)"

upsert_scheduler_job \
  "ops-finance-ledger-health" \
  "30 5 * * *" \
  "/finance/ledger-health-check" \
  '{}'
echo "  -> ops-finance-ledger-health: 30 5 * * * America/Santiago (daily 05:30, drift probe + Sentry alert, TASK-702)"

upsert_scheduler_job \
  "ops-finance-dte-emission-retry" \
  "*/15 * * * *" \
  "/finance/dte-emission-retry" \
  '{"batchSize":5}'
echo "  -> ops-finance-dte-emission-retry: */15 * * * * America/Santiago (queued DTE emission retry, TASK-1194)"

upsert_scheduler_job \
  "ops-quotation-lifecycle" \
  "0 7 * * *" \
  "/quotation-lifecycle/sweep" \
  '{}'
echo "  -> ops-quotation-lifecycle: 0 7 * * * (daily quote expiration + renewal_due sweep, TASK-351)"

# TASK-638 — Reliability AI Observer.
# Hourly Gemini watcher over RCP overview. Conservative cadence (1h) because
# every call costs Vertex AI tokens regardless of fingerprint dedup. Activate
# only after RELIABILITY_AI_OBSERVER_ENABLED=true is set on the service.
upsert_scheduler_job \
  "ops-reliability-ai-watch" \
  "0 */1 * * *" \
  "/reliability-ai-watch" \
  '{"triggeredBy":"cloud_scheduler"}'
echo "  -> ops-reliability-ai-watch: 0 */1 * * * (Reliability AI Observer, TASK-638 — gated by RELIABILITY_AI_OBSERVER_ENABLED)"

# TASK-769 — Cloud Cost Intelligence.
# Runs deterministic Billing Export alert sweep first, then optional AI FinOps
# copilot if CLOUD_COST_AI_COPILOT_ENABLED=true. Six-hour cadence is enough for
# Billing Export latency while still catching same-day drift after materialize.
upsert_scheduler_job \
  "ops-cloud-cost-ai-watch" \
  "15 */6 * * *" \
  "/cloud-cost-ai-watch" \
  '{"triggeredBy":"cloud_scheduler"}'
echo "  -> ops-cloud-cost-ai-watch: 15 */6 * * * (Cloud Cost Intelligence, TASK-769 — AI gated by CLOUD_COST_AI_COPILOT_ENABLED)"

# Notion BQ raw → conformed → PG cycle. Replaces the historically-flaky Vercel
# `/api/cron/sync-conformed` (20 7 * * *) with a Cloud Scheduler + Cloud Run
# path that has built-in retry semantics and longer timeout. The Vercel cron
# stays available as a manual / smoke-test fallback. Schedule mirrors the
# previous one (07:20 UTC = 04:20 Santiago) so handoff is timing-equivalent.
upsert_scheduler_job \
  "ops-notion-conformed-sync" \
  "20 7 * * *" \
  "/notion-conformed/sync" \
  '{"executionSource":"scheduled_primary"}'
echo "  -> ops-notion-conformed-sync: 20 7 * * * (Notion daily BQ + PG sync, replaces Vercel /api/cron/sync-conformed)"

# TASK-742 Capa 6 — Identity auth providers smoke lane.
# Hits the portal /api/auth/health, Microsoft OIDC discovery, and runs an
# in-process JWT roundtrip every 5 minutes. Persists smoke_lane_runs row that
# the Reliability subsystem 'Identity Auth Providers' rolls up. Fires Sentry
# domain=identity when any probe fails.
upsert_scheduler_job \
  "ops-identity-auth-smoke" \
  "*/5 * * * *" \
  "/smoke/identity-auth-providers" \
  '{"triggeredBy":"cloud_scheduler"}'
echo "  -> ops-identity-auth-smoke: */5 * * * * (TASK-742 — auth providers synthetic monitor)"

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Next steps:"
echo "  1. Verify health:  gcloud run services proxy ${SERVICE_NAME} --port=9092 & sleep 3 && curl -s http://localhost:9092/health"
echo "  2. Run a lane manually:  gcloud scheduler jobs run ops-reactive-finance --project=${PROJECT_ID} --location=${REGION}"
echo "  3. Check queue depth:  gcloud run services proxy ${SERVICE_NAME} --port=9092 & sleep 3 && curl -s 'http://localhost:9092/reactive/queue-depth?domain=finance'"
echo "  4. Check logs:  gcloud logging read 'resource.labels.service_name=\"${SERVICE_NAME}\"' --project=${PROJECT_ID} --limit=10"
echo "  5. Active scheduler jobs: ops-reactive-{organization,finance,people,notifications,delivery,cost-intelligence,recover} + ops-nexa-weekly-digest + ops-reliability-ai-watch + ops-cloud-cost-ai-watch"
