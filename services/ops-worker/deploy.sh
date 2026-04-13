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
#   bash services/ops-worker/deploy.sh              # defaults to staging
#   ENV=production bash services/ops-worker/deploy.sh

ENV="${ENV:-staging}"

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

# Cloud Scheduler timezone
SCHEDULER_TZ="America/Santiago"

# Environment-specific secrets (Secret Manager references)
if [ "${ENV}" = "production" ]; then
  NEXTAUTH_SECRET_REF="greenhouse-nextauth-secret-production:latest"
  PG_PASSWORD_REF="greenhouse-pg-prod-app-password:latest"
  PG_INSTANCE="efeonce-group:us-east4:greenhouse-pg-prod"
  echo "=== PRODUCTION deployment ==="
else
  NEXTAUTH_SECRET_REF="greenhouse-nextauth-secret-staging:latest"
  PG_PASSWORD_REF="greenhouse-pg-dev-app-password:latest"
  PG_INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
  echo "=== STAGING deployment ==="
fi

# ─── Build & Deploy to Cloud Run ─────────────────────────────────────────────

echo "=== Building ${SERVICE_NAME} image via Cloud Build ==="

# Build using Cloud Build with inline config (--source --dockerfile is not supported;
# --config and --tag are mutually exclusive, so we use inline cloudbuild.yaml)
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

if ! gcloud builds submit . \
  --project="${PROJECT_ID}" \
  --config=/dev/stdin <<CLOUDBUILD_EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${IMAGE}', '-f', 'services/ops-worker/Dockerfile', '.']
images:
  - '${IMAGE}'
CLOUDBUILD_EOF
then
  echo "ERROR: Cloud Build failed — aborting deployment."
  exit 1
fi

echo "=== Deploying ${SERVICE_NAME} to Cloud Run (${REGION}) ==="

# Environment variables (non-sensitive)
ENV_VARS="NODE_ENV=production"
ENV_VARS="${ENV_VARS},GCP_PROJECT=${PROJECT_ID}"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=${PG_INSTANCE}"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_DATABASE=greenhouse_app"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_USER=greenhouse_app"
ENV_VARS="${ENV_VARS},REACTIVE_BATCH_SIZE=${REACTIVE_BATCH_SIZE}"

# Secrets from Secret Manager (mounted as env vars)
SECRETS="NEXTAUTH_SECRET=${NEXTAUTH_SECRET_REF}"
SECRETS="${SECRETS},GREENHOUSE_POSTGRES_PASSWORD=${PG_PASSWORD_REF}"

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

echo "=== Running health check ==="

# Use gcloud proxy to reach the authenticated service without impersonation
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

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Next steps:"
echo "  1. Verify health:  gcloud run services proxy ${SERVICE_NAME} --port=9092 & sleep 3 && curl -s http://localhost:9092/health"
echo "  2. Run a lane manually:  gcloud scheduler jobs run ops-reactive-finance --project=${PROJECT_ID} --location=${REGION}"
echo "  3. Check queue depth:  gcloud run services proxy ${SERVICE_NAME} --port=9092 & sleep 3 && curl -s 'http://localhost:9092/reactive/queue-depth?domain=finance'"
echo "  4. Check logs:  gcloud logging read 'resource.labels.service_name=\"${SERVICE_NAME}\"' --project=${PROJECT_ID} --limit=10"
echo "  5. Active scheduler jobs (TASK-379 Slice 3): ops-reactive-{organization,finance,people,notifications,delivery,cost-intelligence,recover}"
