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

# ─── Build & Deploy to Cloud Run ─────────────────────────────────────────────

echo "=== Building and deploying ${SERVICE_NAME} to Cloud Run (${REGION}) ==="

# Build from repo root using the Dockerfile in services/ops-worker/
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --source=. \
  --dockerfile=services/ops-worker/Dockerfile \
  --service-account="${SERVICE_ACCOUNT}" \
  --memory="${MEMORY}" \
  --cpu="${CPU}" \
  --timeout="${TIMEOUT}" \
  --max-instances="${MAX_INSTANCES}" \
  --concurrency="${CONCURRENCY}" \
  --no-allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --quiet

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(status.url)")

echo "=== Service deployed at: ${SERVICE_URL} ==="

# ─── Health Check ────────────────────────────────────────────────────────────

echo "=== Running health check ==="

HEALTH_TOKEN=$(gcloud auth print-identity-token --audiences="${SERVICE_URL}")

curl -s -H "Authorization: Bearer ${HEALTH_TOKEN}" "${SERVICE_URL}/health" | python3 -m json.tool || true

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
  --headers="Content-Type=application/json" \
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
  --headers="Content-Type=application/json" \
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
  --headers="Content-Type=application/json" \
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
echo "  1. Verify health: curl -H \"Authorization: Bearer \$(gcloud auth print-identity-token --audiences=${SERVICE_URL})\" ${SERVICE_URL}/health"
echo "  2. Run once manually to confirm:"
echo "     curl -X POST -H \"Authorization: Bearer \$(gcloud auth print-identity-token --audiences=${SERVICE_URL})\" ${SERVICE_URL}/reactive/process"
echo "  3. After dual-run verification, remove the 3 cron entries from vercel.json:"
echo "     - api/cron/outbox-react"
echo "     - api/cron/outbox-react-delivery"
echo "     - api/cron/projection-recovery"
