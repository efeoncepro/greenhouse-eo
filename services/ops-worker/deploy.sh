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

# Cloud Run settings
MEMORY="1Gi"
CPU="1"
TIMEOUT="300"          # 5 minutes max (reactive events are fast)
MAX_INSTANCES="2"
CONCURRENCY="1"        # One request at a time (serialized event processing)

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

# Job 1: Reactive event processing — all domains (every 5 minutes)
# Replaces: vercel.json cron "api/cron/outbox-react" schedule "*/5 * * * *"
gcloud scheduler jobs create http "ops-reactive-process" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="*/5 * * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/reactive/process" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"batchSize":50}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="300s" \
  --max-retry-attempts=1 \
  --quiet 2>/dev/null || \
gcloud scheduler jobs update http "ops-reactive-process" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="*/5 * * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/reactive/process" \
  --http-method=POST \
  --update-headers="Content-Type=application/json" \
  --message-body='{"batchSize":50}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="300s" \
  --max-retry-attempts=1 \
  --quiet

echo "  -> ops-reactive-process: */5 * * * * (every 5 min, all domains)"

# Job 2: Reactive event processing — delivery domain (every 5 minutes, offset by 2 min)
# Replaces: vercel.json cron "api/cron/outbox-react-delivery" schedule "*/5 * * * *"
gcloud scheduler jobs create http "ops-reactive-process-delivery" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="2-59/5 * * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/reactive/process-domain" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"domain":"delivery","batchSize":50}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="300s" \
  --max-retry-attempts=1 \
  --quiet 2>/dev/null || \
gcloud scheduler jobs update http "ops-reactive-process-delivery" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="2-59/5 * * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/reactive/process-domain" \
  --http-method=POST \
  --update-headers="Content-Type=application/json" \
  --message-body='{"domain":"delivery","batchSize":50}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="300s" \
  --max-retry-attempts=1 \
  --quiet

echo "  -> ops-reactive-process-delivery: 2-59/5 * * * * (every 5 min offset +2, delivery domain)"

# Job 3: Projection recovery (every 15 minutes)
# Replaces: vercel.json cron "api/cron/projection-recovery" schedule "*/15 * * * *"
gcloud scheduler jobs create http "ops-reactive-recover" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="*/15 * * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/reactive/recover" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"batchSize":10,"staleMinutes":30}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="300s" \
  --max-retry-attempts=1 \
  --quiet 2>/dev/null || \
gcloud scheduler jobs update http "ops-reactive-recover" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="*/15 * * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/reactive/recover" \
  --http-method=POST \
  --update-headers="Content-Type=application/json" \
  --message-body='{"batchSize":10,"staleMinutes":30}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="300s" \
  --max-retry-attempts=1 \
  --quiet

echo "  -> ops-reactive-recover: */15 * * * * (every 15 min, projection recovery)"

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Next steps:"
echo "  1. Verify health:  gcloud run services proxy ${SERVICE_NAME} --port=9092 & sleep 3 && curl -s http://localhost:9092/health"
echo "  2. Run once manually:  gcloud scheduler jobs run ops-reactive-process --project=${PROJECT_ID} --location=${REGION}"
echo "  3. Check logs:  gcloud logging read 'resource.labels.service_name=\"${SERVICE_NAME}\"' --project=${PROJECT_ID} --limit=10"
echo "  4. After dual-run verification, remove the 3 cron entries from vercel.json:"
echo "     - api/cron/outbox-react"
echo "     - api/cron/outbox-react-delivery"
echo "     - api/cron/projection-recovery"
