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
TIMEOUT="540"
CONCURRENCY="4"
REACTIVE_BATCH_SIZE="500"
DEFAULT_EMAIL_FROM="Efeonce Greenhouse <greenhouse@efeoncepro.com>"
HUBSPOT_SERVICE_NAME="hubspot-greenhouse-integration"
HUBSPOT_SERVICE_REGION="us-central1"

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
  echo "=== PRODUCTION deployment ==="
else
  DEFAULT_NEXTAUTH_SECRET_REF="greenhouse-nextauth-secret-staging:latest"
  DEFAULT_PG_PASSWORD_REF="greenhouse-pg-dev-app-password:latest"
  DEFAULT_PG_INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
  DEFAULT_RESEND_API_KEY_SECRET_REF="greenhouse-resend-api-key-staging"
  DEFAULT_GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF="greenhouse-integration-api-token"
  echo "=== STAGING deployment ==="
fi

NEXTAUTH_SECRET_REF="${NEXTAUTH_SECRET_REF:-${DEFAULT_NEXTAUTH_SECRET_REF}}"
PG_PASSWORD_REF="${PG_PASSWORD_REF:-${DEFAULT_PG_PASSWORD_REF}}"
PG_INSTANCE="${PG_INSTANCE:-${DEFAULT_PG_INSTANCE}}"
RESEND_API_KEY_SECRET_REF="${RESEND_API_KEY_SECRET_REF:-${DEFAULT_RESEND_API_KEY_SECRET_REF}}"
GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF="${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF:-${DEFAULT_GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF}}"
EMAIL_FROM="${EMAIL_FROM:-${DEFAULT_EMAIL_FROM}}"
HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL="${HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL:-$(gcloud run services describe "${HUBSPOT_SERVICE_NAME}" --project="${PROJECT_ID}" --region="${HUBSPOT_SERVICE_REGION}" --format='value(status.url)')}"

# ─── Secret access helpers ───────────────────────────────────────────────────

extract_secret_name() {
  local ref="$1"
  local normalized="${ref%%:latest}"

  if [[ "${normalized}" == projects/*/secrets/*/versions/* ]]; then
    normalized="${normalized#projects/}"
    normalized="${normalized#*/secrets/}"
    normalized="${normalized%%/versions/*}"
  fi

  printf '%s' "${normalized}"
}

normalize_secret_ref_for_cloud_run() {
  local ref="$1"
  local normalized="${ref}"

  if [[ "${normalized}" == projects/*/secrets/*/versions/* ]]; then
    printf '%s' "${normalized}"
    return 0
  fi

  if [[ "${normalized}" == *:* ]]; then
    printf '%s' "${normalized}"
    return 0
  fi

  printf '%s:latest' "${normalized}"
}

ensure_secret_accessor_binding() {
  local ref="$1"

  if [ -z "${ref}" ]; then
    return 0
  fi

  local secret_name
  secret_name="$(extract_secret_name "${ref}")"

  echo "=== Ensuring ${SERVICE_ACCOUNT} can access secret ${secret_name} ==="
  gcloud secrets add-iam-policy-binding "${secret_name}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null
}

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
    args: ['build', '-t', '${IMAGE}', '-f', 'services/ops-worker/Dockerfile', '.']
images:
  - '${IMAGE}'
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
ENV_VARS="${ENV_VARS},REACTIVE_BATCH_SIZE=${REACTIVE_BATCH_SIZE}"
ENV_VARS="${ENV_VARS},EMAIL_FROM=${EMAIL_FROM}"
ENV_VARS="${ENV_VARS},GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF=${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF}"
ENV_VARS="${ENV_VARS},HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL=${HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL}"

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

if [ -n "${RESEND_API_KEY_SECRET_REF}" ]; then
  ENV_VARS="${ENV_VARS},RESEND_API_KEY_SECRET_REF=${RESEND_API_KEY_SECRET_REF}"
else
  echo "WARN: RESEND_API_KEY_SECRET_REF is not set; ops-worker will skip outbound email delivery."
fi

# Secrets from Secret Manager (mounted as env vars)
SECRETS="NEXTAUTH_SECRET=${NEXTAUTH_SECRET_REF}"
SECRETS="${SECRETS},GREENHOUSE_POSTGRES_PASSWORD=${PG_PASSWORD_REF}"

if [ -n "${RESEND_API_KEY_SECRET_REF}" ]; then
  SECRETS="${SECRETS},RESEND_API_KEY=$(normalize_secret_ref_for_cloud_run "${RESEND_API_KEY_SECRET_REF}")"
fi

ensure_secret_accessor_binding "${NEXTAUTH_SECRET_REF}"
ensure_secret_accessor_binding "${PG_PASSWORD_REF}"

if [ -n "${RESEND_API_KEY_SECRET_REF}" ]; then
  ensure_secret_accessor_binding "${RESEND_API_KEY_SECRET_REF}"
fi

ensure_secret_accessor_binding "${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF}"

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
# Args: job_name, schedule, path, message_body
upsert_scheduler_job() {
  local job_name="$1"
  local schedule="$2"
  local uri_path="$3"
  local body="$4"

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
}

# Cleanup: remove legacy "all domains" jobs replaced by per-domain lanes (TASK-379 Slice 3).
echo "  -> cleaning up legacy scheduler jobs (if present)..."
delete_scheduler_job "ops-reactive-process"
delete_scheduler_job "ops-reactive-process-delivery"

# ─── Per-domain reactive lanes (TASK-379 Slice 3) ───────────────────────────
# Each domain gets its own Cloud Scheduler job hitting POST /reactive/process-domain
# so domains drain independently and multi-instance workers can fan out safely
# via refresh_queue SKIP LOCKED. Offsets spread the load across the minute.

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
  "ops-finance-ledger-health" \
  "30 5 * * *" \
  "/finance/ledger-health-check" \
  '{}'
echo "  -> ops-finance-ledger-health: 30 5 * * * America/Santiago (daily 05:30, drift probe + Sentry alert, TASK-702)"

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
