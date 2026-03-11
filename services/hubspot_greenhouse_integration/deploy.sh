#!/bin/bash

set -euo pipefail

PROJECT_ID="efeonce-group"
REGION="us-central1"
SERVICE_NAME="hubspot-greenhouse-integration"
HUBSPOT_SECRET_NAME="${HUBSPOT_ACCESS_TOKEN_SECRET_NAME:-hubspot-access-token}"
SOURCE_DIR="services/hubspot_greenhouse_integration"
TMP_ENV_FILE=""
ENV_FLAG=""
SECRET_FLAG=""

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
  SECRET_FLAG="--set-secrets=HUBSPOT_ACCESS_TOKEN=${HUBSPOT_SECRET_NAME}:latest"
else
  echo "Secret ${HUBSPOT_SECRET_NAME} was not found; falling back to HUBSPOT_ACCESS_TOKEN from .env.yaml"
  TMP_ENV_FILE="$(mktemp)"
  python - <<'PY' > "${TMP_ENV_FILE}"
from pathlib import Path

env = {}
for raw_line in Path(".env.yaml").read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or ":" not in line:
        continue
    key, value = line.split(":", 1)
    env[key.strip()] = value.strip().strip('"').strip("'")

for key in (
    "HUBSPOT_ACCESS_TOKEN",
    "HUBSPOT_GREENHOUSE_BUSINESS_LINE_PROP",
    "HUBSPOT_GREENHOUSE_SERVICE_MODULE_PROP",
):
    value = env.get(key)
    if value:
        print(f"{key}: \"{value}\"")
PY
  ENV_FLAG="--env-vars-file=${TMP_ENV_FILE}"
fi

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

if [[ -n "${SECRET_FLAG}" ]]; then
  DEPLOY_ARGS+=("${SECRET_FLAG}")
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
