#!/usr/bin/env bash
#
# ICO Batch Worker — Cloud Run Deployment
#
# Usage:
#   cd /path/to/greenhouse-eo
#   bash services/ico-batch/deploy.sh
#
# Prerequisites:
#   - gcloud CLI authenticated with efeonce-group project (or running inside
#     the ICO Batch Deploy GitHub Actions workflow, which authenticates via
#     Workload Identity Federation).
#
# The script deploys the service and creates/updates Cloud Scheduler jobs.
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

# ─── Build via Cloud Build ───────────────────────────────────────────────────
# `gcloud run deploy --source=.` does not accept `--dockerfile=`. We build the
# image explicitly with Cloud Build using an inline cloudbuild.yaml that
# points at services/ico-batch/Dockerfile, then deploy with --image=.

echo "=== Building ${SERVICE_NAME} image via Cloud Build ==="

IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

BUILD_ID=$(gcloud builds submit . \
  --project="${PROJECT_ID}" \
  --async \
  --format='value(id)' \
  --config=/dev/stdin <<CLOUDBUILD_EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${IMAGE}', '-f', 'services/ico-batch/Dockerfile', '.']
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

# ─── Deploy to Cloud Run ─────────────────────────────────────────────────────
# Do NOT set --set-env-vars here: Cloud Run preserves existing env vars and
# secret bindings across revisions when the flag is not specified. The ICO
# worker already has NEXTAUTH_SECRET, GCP_PROJECT, GREENHOUSE_POSTGRES_*,
# GOOGLE_APPLICATION_* from its original deployment (TASK-241); keep them.

echo "=== Deploying ${SERVICE_NAME} to Cloud Run (${REGION}) ==="

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
  --quiet

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(status.url)")

echo "=== Service deployed at: ${SERVICE_URL} ==="

# ─── Revision readiness ──────────────────────────────────────────────────────
# Replaces the previous `curl /health` check. The old pattern relied on
# `gcloud auth print-identity-token --audiences=...` which only works for
# service-account identities, not for user accounts running the script
# locally. Cloud Run already routes traffic only to healthy revisions, so
# a successful deploy implies the container passed its startup probe.

READY="$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.conditions[0].status)')"

REVISION="$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.latestReadyRevisionName)')"

echo "=== Ready revision: ${REVISION} (service ready=${READY}) ==="

# ─── Runtime SA invoker binding ──────────────────────────────────────────────
# Cloud Scheduler jobs authenticate to Cloud Run with an OIDC token signed
# for the greenhouse-portal SA. That SA must hold roles/run.invoker on the
# service, otherwise the scheduler returns HTTP 401 and Cloud Run logs
# "The request was not authenticated". Idempotent — re-applying is a no-op.

echo "=== Ensuring ${SERVICE_ACCOUNT} has roles/run.invoker ==="

gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" \
  --quiet >/dev/null

# ─── Cloud Scheduler Jobs ────────────────────────────────────────────────────

echo "=== Creating/updating Cloud Scheduler jobs ==="

# Helper: create or update an http scheduler job idempotently.
upsert_scheduler_job() {
  local JOB_NAME="$1"
  local SCHEDULE="$2"
  local URI="$3"
  local BODY="$4"
  local DEADLINE="$5"

  gcloud scheduler jobs create http "${JOB_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --schedule="${SCHEDULE}" \
    --time-zone="${SCHEDULER_TZ}" \
    --uri="${URI}" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body="${BODY}" \
    --oidc-service-account-email="${SERVICE_ACCOUNT}" \
    --oidc-token-audience="${SERVICE_URL}" \
    --attempt-deadline="${DEADLINE}" \
    --max-retry-attempts=1 \
    --quiet 2>/dev/null || \
  gcloud scheduler jobs update http "${JOB_NAME}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --schedule="${SCHEDULE}" \
    --time-zone="${SCHEDULER_TZ}" \
    --uri="${URI}" \
    --update-headers="Content-Type=application/json" \
    --message-body="${BODY}" \
    --oidc-service-account-email="${SERVICE_ACCOUNT}" \
    --oidc-token-audience="${SERVICE_URL}" \
    --attempt-deadline="${DEADLINE}" \
    --max-retry-attempts=1 \
    --quiet
}

# Job 1: ICO Materialization — daily 3:15 AM Santiago
upsert_scheduler_job "ico-materialize-daily"             "15 3 * * *" "${SERVICE_URL}/ico/materialize"             '{"monthsBack":3}' "900s"
echo "  -> ico-materialize-daily: 3:15 AM ${SCHEDULER_TZ}"

# Job 2: ICO LLM Enrichment — daily 3:45 AM Santiago
upsert_scheduler_job "ico-llm-enrich-daily"              "45 3 * * *" "${SERVICE_URL}/ico/llm-enrich"              '{"monthsBack":1}' "600s"
echo "  -> ico-llm-enrich-daily: 3:45 AM ${SCHEDULER_TZ}"

# Job 3: Finance Signal Materialization — daily 4:00 AM Santiago (TASK-245)
upsert_scheduler_job "finance-materialize-signals-daily" "0 4 * * *"  "${SERVICE_URL}/finance/materialize-signals" '{"monthsBack":1}' "600s"
echo "  -> finance-materialize-signals-daily: 4:00 AM ${SCHEDULER_TZ}"

# Job 4: Finance LLM Enrichment — daily 4:30 AM Santiago (TASK-245)
upsert_scheduler_job "finance-llm-enrich-daily"          "30 4 * * *" "${SERVICE_URL}/finance/llm-enrich"          '{"monthsBack":1}' "600s"
echo "  -> finance-llm-enrich-daily: 4:30 AM ${SCHEDULER_TZ}"

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo "=== Deployment complete ==="
echo "Service:    ${SERVICE_URL}"
echo "Revision:   ${REVISION}"
echo "Ready:      ${READY}"
echo "Region:     ${REGION}"
echo "Memory:     ${MEMORY}"
echo "CPU:        ${CPU}"
echo "Timeout:    ${TIMEOUT}s"
echo "Auth:       IAM (no-allow-unauthenticated) + greenhouse-portal invoker"
echo ""
echo "Scheduler jobs:"
echo "  ico-materialize-daily             → 3:15 AM ${SCHEDULER_TZ} → POST /ico/materialize"
echo "  ico-llm-enrich-daily              → 3:45 AM ${SCHEDULER_TZ} → POST /ico/llm-enrich"
echo "  finance-materialize-signals-daily → 4:00 AM ${SCHEDULER_TZ} → POST /finance/materialize-signals"
echo "  finance-llm-enrich-daily          → 4:30 AM ${SCHEDULER_TZ} → POST /finance/llm-enrich"
echo ""
echo "Manual invocation (impersonation required for user accounts):"
echo "  gcloud scheduler jobs run finance-materialize-signals-daily \\"
echo "    --project=${PROJECT_ID} --location=${REGION}"
