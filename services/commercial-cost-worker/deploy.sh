#!/usr/bin/env bash
#
# Commercial Cost Worker — Cloud Run Deployment
#
set -euo pipefail

# Usage:
#   ENV=staging    bash services/commercial-cost-worker/deploy.sh
#   ENV=production bash services/commercial-cost-worker/deploy.sh
#
# ENV is REQUIRED — there is no silent default. Like ops-worker, this deploy
# currently targets a single canonical Cloud Run service name. The environment
# switch exists to select the secret contract deliberately when the workflow
# runs from develop/main or when an operator invokes it manually.

if [ -z "${ENV:-}" ]; then
  echo "ERROR: ENV must be set explicitly — 'staging' or 'production'."
  echo "       Usage: ENV=staging bash services/commercial-cost-worker/deploy.sh"
  exit 1
fi

if [ "${ENV}" != "staging" ] && [ "${ENV}" != "production" ]; then
  echo "ERROR: ENV must be 'staging' or 'production', got '${ENV}'."
  exit 1
fi

PROJECT_ID="efeonce-group"
REGION="us-east4"
SERVICE_NAME="commercial-cost-worker"
SERVICE_ACCOUNT="greenhouse-portal@${PROJECT_ID}.iam.gserviceaccount.com"

# Cloud Run settings — start conservative until role/reprice/feedback lanes land.
# Rationale:
#   - min=0 keeps cost low while the worker is mostly cron/manual.
#   - max=2 and concurrency=1 serialize heavy bundle runs and reduce accidental
#     overlap until the wider program proves end-to-end idempotency at scale.
#   - cpu=2 / memory=2Gi / timeout=900s leaves headroom for multi-period
#     materialization plus downstream cost attribution / client economics refresh.
MIN_INSTANCES="0"
MAX_INSTANCES="2"
MEMORY="2Gi"
CPU="2"
TIMEOUT="900"
CONCURRENCY="1"
SCHEDULER_TZ="America/Santiago"

if [ "${ENV}" = "production" ]; then
  DEFAULT_NEXTAUTH_SECRET_REF="greenhouse-nextauth-secret-production:latest"
  DEFAULT_PG_PASSWORD_REF="greenhouse-pg-dev-app-password:latest"
  DEFAULT_PG_INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
  echo "=== PRODUCTION deployment ==="
else
  DEFAULT_NEXTAUTH_SECRET_REF="greenhouse-nextauth-secret-staging:latest"
  DEFAULT_PG_PASSWORD_REF="greenhouse-pg-dev-app-password:latest"
  DEFAULT_PG_INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
  echo "=== STAGING deployment ==="
fi

NEXTAUTH_SECRET_REF="${NEXTAUTH_SECRET_REF:-${DEFAULT_NEXTAUTH_SECRET_REF}}"
PG_PASSWORD_REF="${PG_PASSWORD_REF:-${DEFAULT_PG_PASSWORD_REF}}"
PG_INSTANCE="${PG_INSTANCE:-${DEFAULT_PG_INSTANCE}}"

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

echo "=== Building ${SERVICE_NAME} image via Cloud Build ==="

IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

BUILD_ID=$(gcloud builds submit . \
  --project="${PROJECT_ID}" \
  --async \
  --format='value(id)' \
  --config=/dev/stdin <<CLOUDBUILD_EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${IMAGE}', '-f', 'services/commercial-cost-worker/Dockerfile', '.']
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
MAX_POLLS=60

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

ENV_VARS="NODE_ENV=production"
ENV_VARS="${ENV_VARS},COMMERCIAL_COST_WORKER_ENV=${ENV}"
ENV_VARS="${ENV_VARS},GCP_PROJECT=${PROJECT_ID}"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=${PG_INSTANCE}"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_DATABASE=greenhouse_app"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_USER=greenhouse_app"

SECRETS="NEXTAUTH_SECRET=$(normalize_secret_ref_for_cloud_run "${NEXTAUTH_SECRET_REF}")"
SECRETS="${SECRETS},GREENHOUSE_POSTGRES_PASSWORD=$(normalize_secret_ref_for_cloud_run "${PG_PASSWORD_REF}")"

ensure_secret_accessor_binding "${NEXTAUTH_SECRET_REF}"
ensure_secret_accessor_binding "${PG_PASSWORD_REF}"

# TASK-844 — SENTRY_DSN for cross-runtime observability (optional).
# Mismo patrón que ops-worker. Sin DSN, captureWithDomain degrada graceful no-op.
SENTRY_DSN_SECRET_NAME="${SENTRY_DSN_SECRET_NAME:-greenhouse-sentry-dsn}"

if gcloud secrets describe "${SENTRY_DSN_SECRET_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  SECRETS="${SECRETS},SENTRY_DSN=${SENTRY_DSN_SECRET_NAME}:latest"
  ensure_secret_accessor_binding "${SENTRY_DSN_SECRET_NAME}:latest"
  echo "  Sentry DSN: mounted from secret '${SENTRY_DSN_SECRET_NAME}'"
else
  echo "  Sentry DSN: secret '${SENTRY_DSN_SECRET_NAME}' not found — observability degraded."
fi

echo "=== Deploying ${SERVICE_NAME} to Cloud Run (${REGION}) ==="

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

READY="$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.conditions[0].status)')"

REVISION="$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.latestReadyRevisionName)')"

echo "=== Ready revision: ${REVISION} (service ready=${READY}) ==="

echo "=== Ensuring ${SERVICE_ACCOUNT} has roles/run.invoker ==="
gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" \
  --quiet >/dev/null

if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "=== Skipping health check (CI mode — workflow handles this separately) ==="
else
  echo "=== Running health check ==="

  HEALTH_PORT=19093
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
    echo "WARN: health check failed after 5 attempts — verify the service manually."
  fi
fi

echo "=== Creating Cloud Scheduler jobs ==="

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
    --attempt-deadline="${TIMEOUT}s" \
    --max-retry-attempts=1 \
    --quiet 2>/dev/null || \
  gcloud scheduler jobs update http "${job_name}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --schedule="${schedule}" \
    --time-zone="${SCHEDULER_TZ}" \
    --uri="${SERVICE_URL}${uri_path}" \
    --update-headers="Content-Type=application/json" \
    --message-body="${body}" \
    --oidc-service-account-email="${SERVICE_ACCOUNT}" \
    --oidc-token-audience="${SERVICE_URL}" \
    --attempt-deadline="${TIMEOUT}s" \
    --max-retry-attempts=1 \
    --quiet
}

upsert_scheduler_job \
  "commercial-cost-materialize-daily" \
  "0 5 * * *" \
  "/cost-basis/materialize" \
  '{"scope":"bundle","monthsBack":1}'
echo "  -> commercial-cost-materialize-daily: 5:00 AM ${SCHEDULER_TZ}"

# TASK-482 — Margin Feedback Loop batch run. Fires 10 minutes after the
# cost-basis bundle so attributed cost is already fresh; materializes
# quotation + contract profitability snapshots and emits calibration
# signals via commercial.margin_feedback.batch_completed.
upsert_scheduler_job \
  "margin-feedback-materialize-daily" \
  "10 5 * * *" \
  "/margin-feedback/materialize" \
  '{"monthsBack":1}'
echo "  -> margin-feedback-materialize-daily: 5:10 AM ${SCHEDULER_TZ}"

echo ""
echo "=== Deployment complete ==="
echo "Service:    ${SERVICE_URL}"
echo "Revision:   ${REVISION}"
echo "Ready:      ${READY}"
echo "Region:     ${REGION}"
echo "Memory:     ${MEMORY}"
echo "CPU:        ${CPU}"
echo "Timeout:    ${TIMEOUT}s"
echo "Scheduler:  commercial-cost-materialize-daily -> POST /cost-basis/materialize"
echo "            margin-feedback-materialize-daily -> POST /margin-feedback/materialize"
