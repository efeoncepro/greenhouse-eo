#!/usr/bin/env bash
#
# Efeonce Auth Server — Cloud Run Deployment (TASK-1828, EPIC-044)
#
# Usage:
#   ENV=staging    bash services/auth-server/deploy.sh
#   ENV=production bash services/auth-server/deploy.sh
#
# Prerequisites:
#   - gcloud CLI authenticated with efeonce-group project
#   - Cloud KMS key `auth-server-es256` (HSM) + SA `auth-server@` (TASK-1828 Slice 0)
#
# Topology: ONE Cloud Run service (`auth-server`, us-east4) publicado como segundo host
# del front door del gateway MCP (`auth.efeonce.org`). Igual que ops-worker, staging y
# production comparten servicio y base; ENV sólo selecciona secretos y el mínimo de
# instancias. El servicio nace con AUTH_SERVER_ENABLED=false (readyz 503, JWKS 404).
#
# Ingress/auth: `--ingress=internal-and-cloud-load-balancing` + `--allow-unauthenticated`
# — el ALB no emite tokens IAM hacia un serverless NEG; la app valida `Host`.
#
# Env vars: `--set-env-vars` es DESTRUCTIVO. Toda variable del servicio se declara acá;
# un `--update-env-vars` a mano desaparece en el siguiente deploy (ledger de flags:
# docs/operations/FEATURE_FLAG_STATE_LEDGER.md).

set -euo pipefail

if [ -z "${ENV:-}" ]; then
  echo "ERROR: ENV must be set explicitly — 'staging' or 'production'."
  echo "       Usage: ENV=staging bash services/auth-server/deploy.sh"
  exit 1
fi

if [ "${ENV}" != "staging" ] && [ "${ENV}" != "production" ]; then
  echo "ERROR: ENV must be 'staging' or 'production', got '${ENV}'."
  exit 1
fi

# ─── Configuration ───────────────────────────────────────────────────────────

PROJECT_ID="efeonce-group"
REGION="us-east4"
SERVICE_NAME="${SERVICE_NAME:-auth-server}"
SERVICE_ACCOUNT="auth-server@${PROJECT_ID}.iam.gserviceaccount.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "${SCRIPT_DIR}/../_shared/gcloud-secret-iam.sh"

# Cloud Run settings (ADR EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1):
#   - production: min=1 (un login con arranque en frío se siente mal); staging: min=0.
#   - cpu=1/512Mi: emisión de tokens es liviana; la firma la hace KMS.
#   - concurrency=80, timeout=30s: requests cortos (OAuth, JWKS, health).
if [ "${ENV}" = "production" ]; then
  DEFAULT_MIN_INSTANCES="1"
else
  DEFAULT_MIN_INSTANCES="0"
fi
MIN_INSTANCES="${MIN_INSTANCES:-${DEFAULT_MIN_INSTANCES}}"
MAX_INSTANCES="${MAX_INSTANCES:-5}"
MEMORY="${MEMORY:-512Mi}"
CPU="${CPU:-1}"
TIMEOUT="${TIMEOUT:-30}"
CONCURRENCY="${CONCURRENCY:-80}"

DEFAULT_PG_PASSWORD_REF="greenhouse-pg-dev-app-password:latest"
DEFAULT_PG_INSTANCE="efeonce-group:us-east4:greenhouse-pg-dev"
PG_PASSWORD_REF="${PG_PASSWORD_REF:-${DEFAULT_PG_PASSWORD_REF}}"
PG_INSTANCE="${PG_INSTANCE:-${DEFAULT_PG_INSTANCE}}"

AUTH_SERVER_ISSUER="${AUTH_SERVER_ISSUER:-https://auth.efeonce.org}"
AUTH_SERVER_ALLOWED_HOSTS="${AUTH_SERVER_ALLOWED_HOSTS:-auth.efeonce.org}"
AUTH_SERVER_KMS_KEY="${AUTH_SERVER_KMS_KEY:-projects/${PROJECT_ID}/locations/${REGION}/keyRings/auth-server/cryptoKeys/auth-server-es256}"

echo "=== ${ENV^^} deployment of ${SERVICE_NAME} (${REGION}) ==="

# ─── Preflight: KMS key + SA exist (Slice 0) ────────────────────────────────

if ! gcloud kms keys describe "${AUTH_SERVER_KMS_KEY}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "ERROR: KMS key '${AUTH_SERVER_KMS_KEY}' not found. Run TASK-1828 Slice 0 first."
  exit 1
fi

if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "ERROR: runtime service account '${SERVICE_ACCOUNT}' not found. Run TASK-1828 Slice 0 first."
  exit 1
fi

# ─── Build (Cloud Build, inline config, async + poll) ───────────────────────

IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

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
          -f 'services/auth-server/Dockerfile' \
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

# ─── Env vars (declarativas — SoT del runtime) ──────────────────────────────

ENV_VARS="NODE_ENV=production"
ENV_VARS="${ENV_VARS},GCP_PROJECT=${PROJECT_ID}"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=${PG_INSTANCE}"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_DATABASE=greenhouse_app"
ENV_VARS="${ENV_VARS},GREENHOUSE_POSTGRES_USER=greenhouse_app"
# TASK-1828 — flag maestro del emisor. OFF ⇒ /readyz 503 y JWKS 404; el LB no enruta
# tráfico útil. Ledger: docs/operations/FEATURE_FLAG_STATE_LEDGER.md (runtime auth-server).
ENV_VARS="${ENV_VARS},AUTH_SERVER_ENABLED=${AUTH_SERVER_ENABLED:-false}"
ENV_VARS="${ENV_VARS},AUTH_SERVER_ISSUER=${AUTH_SERVER_ISSUER}"
ENV_VARS="${ENV_VARS},AUTH_SERVER_ALLOWED_HOSTS=${AUTH_SERVER_ALLOWED_HOSTS}"
ENV_VARS="${ENV_VARS},AUTH_SERVER_KMS_KEY=${AUTH_SERVER_KMS_KEY}"
ENV_VARS="${ENV_VARS},SENTRY_ENVIRONMENT=${ENV}"

# ─── Secrets (Secret Manager → env) ─────────────────────────────────────────

SECRETS="GREENHOUSE_POSTGRES_PASSWORD=${PG_PASSWORD_REF}"
ensure_secret_accessor_binding "${PG_PASSWORD_REF}"

SENTRY_DSN_SECRET_NAME="${SENTRY_DSN_SECRET_NAME:-greenhouse-sentry-dsn}"

if gcloud secrets describe "${SENTRY_DSN_SECRET_NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  SECRETS="${SECRETS},SENTRY_DSN=${SENTRY_DSN_SECRET_NAME}:latest"
  ensure_secret_accessor_binding "${SENTRY_DSN_SECRET_NAME}:latest"
  echo "  Sentry DSN: mounted from secret '${SENTRY_DSN_SECRET_NAME}'"
else
  echo "  Sentry DSN: secret '${SENTRY_DSN_SECRET_NAME}' not found — observability degraded (captureWithDomain no-op)."
fi

# ─── GIT_SHA (TASK-849/851 drift detection) ─────────────────────────────────

EXPECTED_SHA="${EXPECTED_SHA:-${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}}"
GIT_SHA="${EXPECTED_SHA}"
ENV_VARS="${ENV_VARS},GIT_SHA=${GIT_SHA}"

# ─── Deploy ─────────────────────────────────────────────────────────────────

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
  --ingress=internal-and-cloud-load-balancing \
  --allow-unauthenticated \
  --set-env-vars="${ENV_VARS}" \
  --update-secrets="${SECRETS}" \
  --quiet

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format="value(status.url)")

echo "=== Service deployed at: ${SERVICE_URL} (reachable only through the gateway front door) ==="

if [ "${EXPECTED_SHA}" != "unknown" ]; then
  echo "=== Verifying revision GIT_SHA matches EXPECTED_SHA=${EXPECTED_SHA} ==="

  REVISION_NAME="$(gcloud run services describe "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format='value(status.latestReadyRevisionName)')"

  DEPLOYED_SHA="$(gcloud run revisions describe "${REVISION_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format=json | python3 -c 'import json, sys; data = json.load(sys.stdin); print(next((env.get("value", "") for c in (data.get("spec", {}).get("containers", []) or []) for env in (c.get("env") or []) if env.get("name") == "GIT_SHA"), ""))')"

  if [ "${DEPLOYED_SHA}" != "${EXPECTED_SHA}" ]; then
    echo "ERROR: revision ${REVISION_NAME} serves GIT_SHA=${DEPLOYED_SHA:-none}, expected ${EXPECTED_SHA}."
    exit 1
  fi

  echo "  revision ${REVISION_NAME} serves GIT_SHA=${DEPLOYED_SHA} ✓"
fi

echo "=== Done. AUTH_SERVER_ENABLED=${AUTH_SERVER_ENABLED:-false} ==="
