#!/bin/bash

set -euo pipefail

PROJECT_ID="efeonce-group"
REGION="us-central1"
SERVICE_NAME="hubspot-greenhouse-integration"
HUBSPOT_SECRET_NAME="${HUBSPOT_ACCESS_TOKEN_SECRET_NAME:-hubspot-access-token}"
GREENHOUSE_SECRET_NAME="${GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_NAME:-greenhouse-integration-api-token}"
HUBSPOT_WEBHOOK_SECRET_NAME="${HUBSPOT_APP_CLIENT_SECRET_SECRET_NAME:-hubspot-app-client-secret}"
SOURCE_DIR="services/hubspot_greenhouse_integration"
TMP_ENV_FILE=""
ENV_FLAG=""
SECRET_FLAGS=()
HAVE_HUBSPOT_SECRET="false"
HAVE_GREENHOUSE_SECRET="false"
HAVE_HUBSPOT_WEBHOOK_SECRET="false"
PYTHON_BIN="${PYTHON_BIN:-python3}"
ENV_SOURCE_FILE=".env.yaml"

cleanup() {
  if [[ -n "${TMP_ENV_FILE}" && -f "${TMP_ENV_FILE}" ]]; then
    rm -f "${TMP_ENV_FILE}"
  fi
}

trap cleanup EXIT

echo "Deploying ${SERVICE_NAME}..."
echo ""

gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com --quiet >/dev/null

if gcloud secrets describe "${HUBSPOT_SECRET_NAME}" >/dev/null 2>&1; then
  echo "Using Secret Manager secret ${HUBSPOT_SECRET_NAME} for HUBSPOT_ACCESS_TOKEN"
  SECRET_FLAGS+=("--set-secrets=HUBSPOT_ACCESS_TOKEN=${HUBSPOT_SECRET_NAME}:latest")
  HAVE_HUBSPOT_SECRET="true"
else
  echo "Secret ${HUBSPOT_SECRET_NAME} was not found; falling back to HUBSPOT_ACCESS_TOKEN from .env.yaml"
fi

if gcloud secrets describe "${GREENHOUSE_SECRET_NAME}" >/dev/null 2>&1; then
  echo "Using Secret Manager secret ${GREENHOUSE_SECRET_NAME} for GREENHOUSE_INTEGRATION_API_TOKEN"
  SECRET_FLAGS+=("--set-secrets=GREENHOUSE_INTEGRATION_API_TOKEN=${GREENHOUSE_SECRET_NAME}:latest")
  HAVE_GREENHOUSE_SECRET="true"
fi

if gcloud secrets describe "${HUBSPOT_WEBHOOK_SECRET_NAME}" >/dev/null 2>&1; then
  echo "Using Secret Manager secret ${HUBSPOT_WEBHOOK_SECRET_NAME} for HUBSPOT_APP_CLIENT_SECRET"
  SECRET_FLAGS+=("--set-secrets=HUBSPOT_APP_CLIENT_SECRET=${HUBSPOT_WEBHOOK_SECRET_NAME}:latest")
  HAVE_HUBSPOT_WEBHOOK_SECRET="true"
fi

if [[ ! -f "${ENV_SOURCE_FILE}" && -f ".env.example.yaml" ]]; then
  ENV_SOURCE_FILE=".env.example.yaml"
fi

TMP_ENV_FILE="$(mktemp)"
HAVE_HUBSPOT_SECRET="${HAVE_HUBSPOT_SECRET}" \
HAVE_GREENHOUSE_SECRET="${HAVE_GREENHOUSE_SECRET}" \
HAVE_HUBSPOT_WEBHOOK_SECRET="${HAVE_HUBSPOT_WEBHOOK_SECRET}" \
ENV_SOURCE_FILE="${ENV_SOURCE_FILE}" \
"${PYTHON_BIN}" - <<'PY' > "${TMP_ENV_FILE}"
from pathlib import Path
import os

env = {}
env_source_file = Path(os.environ.get("ENV_SOURCE_FILE", ".env.yaml"))
for raw_line in env_source_file.read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or ":" not in line:
        continue
    key, value = line.split(":", 1)
    env[key.strip()] = value.strip().strip('"').strip("'")

secret_presence = {
    "HUBSPOT_ACCESS_TOKEN": os.environ.get("HAVE_HUBSPOT_SECRET") == "true",
    "GREENHOUSE_INTEGRATION_API_TOKEN": os.environ.get("HAVE_GREENHOUSE_SECRET") == "true",
    "HUBSPOT_APP_CLIENT_SECRET": os.environ.get("HAVE_HUBSPOT_WEBHOOK_SECRET") == "true",
}

for key in (
    "GREENHOUSE_BASE_URL",
    "HUBSPOT_GREENHOUSE_BUSINESS_LINE_PROP",
    "HUBSPOT_GREENHOUSE_SERVICE_MODULE_PROP",
    "HUBSPOT_ACCESS_TOKEN",
    "GREENHOUSE_INTEGRATION_API_TOKEN",
    "HUBSPOT_APP_CLIENT_SECRET",
):
    if secret_presence.get(key):
        continue
    value = env.get(key)
    if value:
        print(f"{key}: \"{value}\"")
PY
ENV_FLAG="--env-vars-file=${TMP_ENV_FILE}"

DEPLOY_ARGS=(
  "--source=${SOURCE_DIR}"
  "--region=${REGION}"
  "--allow-unauthenticated"
  "--memory=512Mi"
  "--timeout=300"
  "--cpu=1"
  "--min-instances=0"
  "--max-instances=3"
)

if [[ ${#SECRET_FLAGS[@]} -gt 0 ]]; then
  DEPLOY_ARGS+=("${SECRET_FLAGS[@]}")
fi

if [[ -n "${ENV_FLAG}" ]]; then
  DEPLOY_ARGS+=("${ENV_FLAG}")
fi

gcloud run deploy "${SERVICE_NAME}" "${DEPLOY_ARGS[@]}"

SERVICE_URL="$(
  gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --format='value(status.url)'
)"

echo ""
echo "Cloud Run service deployed: ${SERVICE_URL}"
