#!/usr/bin/env bash
#
# HubSpot Greenhouse Integration — Cloud Run Deployment (TASK-574).
#
# Absorbed 2026-04-24 from cesargrowth11/hubspot-bigquery. Replaces the
# legacy in-sibling deploy.sh which used a local .env.yaml injection model.
# This script runs from the greenhouse-eo monorepo and follows the pattern
# established by services/ops-worker and services/commercial-cost-worker.
#
# Region preserved: us-central1 (NOT us-east4). The public Cloud Run URL
# `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app` contains
# the `-uc.` regional suffix and MUST NOT change — TASK-574 Acceptance
# Criteria: "sin cambio de URL pública para el consumidor Vercel".
#
set -euo pipefail

# Usage:
#   ENV=staging    bash services/hubspot_greenhouse_integration/deploy.sh
#   ENV=production bash services/hubspot_greenhouse_integration/deploy.sh
#
# ENV is REQUIRED — no silent default.

if [ -z "${ENV:-}" ]; then
  echo "ERROR: ENV must be set explicitly — 'staging' or 'production'."
  echo "       Usage: ENV=staging bash services/hubspot_greenhouse_integration/deploy.sh"
  exit 1
fi

if [ "${ENV}" != "staging" ] && [ "${ENV}" != "production" ]; then
  echo "ERROR: ENV must be 'staging' or 'production', got '${ENV}'."
  exit 1
fi

PROJECT_ID="efeonce-group"
# Region locked to us-central1 — see comment at top of file.
REGION="us-central1"
SERVICE_NAME="hubspot-greenhouse-integration"
SERVICE_ACCOUNT="greenhouse-portal@${PROJECT_ID}.iam.gserviceaccount.com"

# Cloud Run sizing — matches the sibling deploy defaults:
#   min=0 keeps cost low (service is proxy to HubSpot, cold-start tolerated).
#   max=3 bounds concurrency against HubSpot API rate limits per portal.
#   cpu=1 / memory=1Gi / timeout=300s is sufficient for the Flask proxy.
#   concurrency=40 is the default — multiple inflight HTTP requests fine.
MIN_INSTANCES="0"
MAX_INSTANCES="3"
MEMORY="1Gi"
CPU="1"
TIMEOUT="300"
CONCURRENCY="40"

# Secrets that this service reads at runtime. All three live in Secret
# Manager project efeonce-group and are consumed via env injection at
# Cloud Run boot time.
HUBSPOT_ACCESS_TOKEN_SECRET_NAME="${HUBSPOT_ACCESS_TOKEN_SECRET_NAME:-hubspot-access-token}"
GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_NAME="${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_NAME:-greenhouse-integration-api-token}"
HUBSPOT_APP_CLIENT_SECRET_SECRET_NAME="${HUBSPOT_APP_CLIENT_SECRET_SECRET_NAME:-hubspot-app-client-secret}"

# Non-secret env. Sourced from deploy-time defaults with optional override
# via environment variables for staging/production-specific tweaks.
if [ "${ENV}" = "production" ]; then
  DEFAULT_GREENHOUSE_BASE_URL="https://greenhouse.efeoncepro.com"
  echo "=== PRODUCTION deployment ==="
else
  # Staging currently targets the same Vercel domain as production because
  # the webhook sync-capabilities endpoint is environment-agnostic. Override
  # via env GREENHOUSE_BASE_URL if staging gets its own domain later.
  DEFAULT_GREENHOUSE_BASE_URL="https://greenhouse.efeoncepro.com"
  echo "=== STAGING deployment ==="
fi

GREENHOUSE_BASE_URL="${GREENHOUSE_BASE_URL:-${DEFAULT_GREENHOUSE_BASE_URL}}"
HUBSPOT_BUSINESS_LINE_PROP="${HUBSPOT_BUSINESS_LINE_PROP:-linea_de_servicio}"
HUBSPOT_SERVICE_MODULE_PROP="${HUBSPOT_SERVICE_MODULE_PROP:-servicios_especificos}"
HUBSPOT_TIMEOUT_SECONDS="${HUBSPOT_TIMEOUT_SECONDS:-30}"
HUBSPOT_WEBHOOK_MAX_AGE_MS="${HUBSPOT_WEBHOOK_MAX_AGE_MS:-300000}"

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

  # Idempotent: gcloud returns success even if the binding already exists.
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
    args: ['build', '-t', '${IMAGE}', '-f', 'services/hubspot_greenhouse_integration/Dockerfile', '.']
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
MAX_POLLS=90  # 15 minutes max (Python image + pip install can be slow).

while [ "${BUILD_STATUS}" != "SUCCESS" ] \
   && [ "${BUILD_STATUS}" != "FAILURE" ] \
   && [ "${BUILD_STATUS}" != "TIMEOUT" ] \
   && [ "${BUILD_STATUS}" != "CANCELLED" ]; do
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

# Ensure all three secrets are accessible before deploying. Idempotent.
ensure_secret_accessor_binding "${HUBSPOT_ACCESS_TOKEN_SECRET_NAME}"
ensure_secret_accessor_binding "${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_NAME}"
ensure_secret_accessor_binding "${HUBSPOT_APP_CLIENT_SECRET_SECRET_NAME}"

# Assemble env + secret flags.
ENV_VARS="PYTHONUNBUFFERED=1"
ENV_VARS="${ENV_VARS},HUBSPOT_GREENHOUSE_INTEGRATION_ENV=${ENV}"
ENV_VARS="${ENV_VARS},GREENHOUSE_BASE_URL=${GREENHOUSE_BASE_URL}"
ENV_VARS="${ENV_VARS},HUBSPOT_GREENHOUSE_BUSINESS_LINE_PROP=${HUBSPOT_BUSINESS_LINE_PROP}"
ENV_VARS="${ENV_VARS},HUBSPOT_GREENHOUSE_SERVICE_MODULE_PROP=${HUBSPOT_SERVICE_MODULE_PROP}"
ENV_VARS="${ENV_VARS},HUBSPOT_GREENHOUSE_INTEGRATION_TIMEOUT_SECONDS=${HUBSPOT_TIMEOUT_SECONDS}"
ENV_VARS="${ENV_VARS},HUBSPOT_GREENHOUSE_WEBHOOK_MAX_AGE_MS=${HUBSPOT_WEBHOOK_MAX_AGE_MS}"

SECRETS="HUBSPOT_ACCESS_TOKEN=$(normalize_secret_ref_for_cloud_run "${HUBSPOT_ACCESS_TOKEN_SECRET_NAME}")"
SECRETS="${SECRETS},GREENHOUSE_INTEGRATION_API_TOKEN=$(normalize_secret_ref_for_cloud_run "${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_NAME}")"
SECRETS="${SECRETS},HUBSPOT_APP_CLIENT_SECRET=$(normalize_secret_ref_for_cloud_run "${HUBSPOT_APP_CLIENT_SECRET_SECRET_NAME}")"

echo "=== Deploying ${SERVICE_NAME} to Cloud Run (${REGION}) ==="

# --allow-unauthenticated preserved from the sibling deploy. The service
# enforces auth at the application layer (Bearer token for mutation routes,
# HMAC signature for /webhooks/hubspot). This matches current production
# behaviour and avoids breaking Vercel runtime's anonymous calls into
# unauthenticated read routes during this cutover. Follow-up governance task
# can harden this separately without coupling to TASK-574.
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${IMAGE}" \
  --service-account="${SERVICE_ACCOUNT}" \
  --memory="${MEMORY}" \
  --cpu="${CPU}" \
  --timeout="${TIMEOUT}" \
  --concurrency="${CONCURRENCY}" \
  --min-instances="${MIN_INSTANCES}" \
  --max-instances="${MAX_INSTANCES}" \
  --allow-unauthenticated \
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

if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "=== Skipping in-script smoke (CI workflow runs smoke separately) ==="
else
  echo "=== Running smoke: GET /health + GET /contract ==="

  SMOKE_OK="false"
  for i in 1 2 3 4 5; do
    sleep 3
    HEALTH_CODE=$(curl -s -o /dev/null -w '%{http_code}' "${SERVICE_URL}/health" || true)
    CONTRACT_CODE=$(curl -s -o /dev/null -w '%{http_code}' "${SERVICE_URL}/contract" || true)
    if [ "${HEALTH_CODE}" = "200" ] && [ "${CONTRACT_CODE}" = "200" ]; then
      SMOKE_OK="true"
      echo "  smoke OK (attempt ${i}): /health=${HEALTH_CODE} /contract=${CONTRACT_CODE}"
      break
    fi
    echo "  smoke attempt ${i}/5: /health=${HEALTH_CODE} /contract=${CONTRACT_CODE} — retrying..."
  done

  if [ "${SMOKE_OK}" = "false" ]; then
    echo "WARN: smoke failed after 5 attempts — verify the service manually."
    echo "      curl ${SERVICE_URL}/health"
    echo "      curl ${SERVICE_URL}/contract"
  fi
fi

echo ""
echo "=== Deployment complete ==="
echo "Service:    ${SERVICE_URL}"
echo "Revision:   ${REVISION}"
echo "Ready:      ${READY}"
echo "Region:     ${REGION}"
echo "Memory:     ${MEMORY}"
echo "CPU:        ${CPU}"
echo "Timeout:    ${TIMEOUT}s"
echo "Routes:     23 HTTP routes (see services/hubspot_greenhouse_integration/README.md)"
