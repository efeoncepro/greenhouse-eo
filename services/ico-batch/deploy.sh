#!/usr/bin/env bash
#
# ICO Batch Worker — Cloud Run Deployment
#
# Usage:
#   cd /path/to/greenhouse-eo
#   bash services/ico-batch/deploy.sh
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
SERVICE_NAME="ico-batch-worker"
SERVICE_ACCOUNT="greenhouse-portal@${PROJECT_ID}.iam.gserviceaccount.com"

# Cloud Run settings
MEMORY="2Gi"
CPU="2"
TIMEOUT="900"          # 15 minutes max
MAX_INSTANCES="2"
CONCURRENCY="1"        # One request at a time (heavy batch processing)

# Cloud Scheduler timezone
SCHEDULER_TZ="America/Santiago"

# ─── Build & Deploy to Cloud Run ─────────────────────────────────────────────

echo "=== Building and deploying ${SERVICE_NAME} to Cloud Run (${REGION}) ==="

# Build from repo root using the Dockerfile in services/ico-batch/
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --source=. \
  --dockerfile=services/ico-batch/Dockerfile \
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

# Job 1: ICO Materialization (daily at 3:15 AM Santiago = ~6:15 AM UTC)
gcloud scheduler jobs create http "ico-materialize-daily" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="15 3 * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/ico/materialize" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"monthsBack":3}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="900s" \
  --max-retry-attempts=1 \
  --quiet 2>/dev/null || \
gcloud scheduler jobs update http "ico-materialize-daily" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="15 3 * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/ico/materialize" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"monthsBack":3}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="900s" \
  --max-retry-attempts=1 \
  --quiet

echo "  -> ico-materialize-daily: 3:15 AM ${SCHEDULER_TZ}"

# Job 2: LLM Enrichment (daily at 3:45 AM Santiago, 30 min after materialization)
gcloud scheduler jobs create http "ico-llm-enrich-daily" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="45 3 * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/ico/llm-enrich" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"monthsBack":1}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="600s" \
  --max-retry-attempts=1 \
  --quiet 2>/dev/null || \
gcloud scheduler jobs update http "ico-llm-enrich-daily" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="45 3 * * *" \
  --time-zone="${SCHEDULER_TZ}" \
  --uri="${SERVICE_URL}/ico/llm-enrich" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"monthsBack":1}' \
  --oidc-service-account-email="${SERVICE_ACCOUNT}" \
  --oidc-token-audience="${SERVICE_URL}" \
  --attempt-deadline="600s" \
  --max-retry-attempts=1 \
  --quiet

echo "  -> ico-llm-enrich-daily: 3:45 AM ${SCHEDULER_TZ}"

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "=== Deployment complete ==="
echo "Service:    ${SERVICE_URL}"
echo "Region:     ${REGION}"
echo "Memory:     ${MEMORY}"
echo "CPU:        ${CPU}"
echo "Timeout:    ${TIMEOUT}s"
echo "Auth:       IAM (no-allow-unauthenticated)"
echo ""
echo "Scheduler jobs:"
echo "  ico-materialize-daily  → 3:15 AM ${SCHEDULER_TZ} → POST /ico/materialize"
echo "  ico-llm-enrich-daily   → 3:45 AM ${SCHEDULER_TZ} → POST /ico/llm-enrich"
echo ""
echo "Manual invocation:"
echo "  TOKEN=\$(gcloud auth print-identity-token --audiences=${SERVICE_URL})"
echo "  curl -X POST -H \"Authorization: Bearer \$TOKEN\" -H 'Content-Type: application/json' \\"
echo "    -d '{\"year\":2026,\"month\":4}' ${SERVICE_URL}/ico/llm-enrich"
