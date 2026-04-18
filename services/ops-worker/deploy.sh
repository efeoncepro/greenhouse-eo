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
  echo "=== PRODUCTION deployment ==="
else
  DEFAULT_NEXTAUTH_SECRET_REF="greenhouse-nextauth-secret-staging:latest"
  DEFAULT_PG_PASSWORD_REF="greenhouse-pg-dev-app-password:latest"
  DEFAULT_PG_INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
  DEFAULT_RESEND_API_KEY_SECRET_REF="greenhouse-resend-api-key-staging"
  echo "=== STAGING deployment ==="
fi

NEXTAUTH_SECRET_REF="${NEXTAUTH_SECRET_REF:-${DEFAULT_NEXTAUTH_SECRET_REF}}"
PG_PASSWORD_REF="${PG_PASSWORD_REF:-${DEFAULT_PG_PASSWORD_REF}}"
PG_INSTANCE="${PG_INSTANCE:-${DEFAULT_PG_INSTANCE}}"
RESEND_API_KEY_SECRET_REF="${RESEND_API_KEY_SECRET_REF:-${DEFAULT_RESEND_API_KEY_SECRET_REF}}"
EMAIL_FROM="${EMAIL_FROM:-${DEFAULT_EMAIL_FROM}}"

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
  "ops-quotation-lifecycle" \
  "0 7 * * *" \
  "/quotation-lifecycle/sweep" \
  '{}'
echo "  -> ops-quotation-lifecycle: 0 7 * * * (daily quote expiration + renewal_due sweep, TASK-351)"

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Next steps:"
echo "  1. Verify health:  gcloud run services proxy ${SERVICE_NAME} --port=9092 & sleep 3 && curl -s http://localhost:9092/health"
echo "  2. Run a lane manually:  gcloud scheduler jobs run ops-reactive-finance --project=${PROJECT_ID} --location=${REGION}"
echo "  3. Check queue depth:  gcloud run services proxy ${SERVICE_NAME} --port=9092 & sleep 3 && curl -s 'http://localhost:9092/reactive/queue-depth?domain=finance'"
echo "  4. Check logs:  gcloud logging read 'resource.labels.service_name=\"${SERVICE_NAME}\"' --project=${PROJECT_ID} --limit=10"
echo "  5. Active scheduler jobs: ops-reactive-{organization,finance,people,notifications,delivery,cost-intelligence,recover} + ops-nexa-weekly-digest"
