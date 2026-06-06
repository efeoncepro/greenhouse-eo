#!/usr/bin/env bash
#
# Shared Secret Manager IAM helpers for Cloud Run deploy scripts.
#
# Callers must define:
#   PROJECT_ID      GCP project id
#   SERVICE_ACCOUNT Runtime service account email that needs secret access

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

secret_accessor_binding_exists() {
  local secret_name="$1"
  local member="serviceAccount:${SERVICE_ACCOUNT}"

  gcloud secrets get-iam-policy "${secret_name}" \
    --project="${PROJECT_ID}" \
    --flatten='bindings[].members' \
    --filter="bindings.role=roles/secretmanager.secretAccessor AND bindings.members=${member}" \
    --format='value(bindings.members)' \
    --quiet 2>/dev/null | grep -Fxq "${member}"
}

ensure_secret_accessor_binding() {
  local ref="$1"

  if [ -z "${ref}" ]; then
    return 0
  fi

  local secret_name
  secret_name="$(extract_secret_name "${ref}")"

  echo "=== Ensuring ${SERVICE_ACCOUNT} can access secret ${secret_name} ==="

  if secret_accessor_binding_exists "${secret_name}"; then
    echo "  IAM binding already present."
    return 0
  fi

  local attempt=1
  local max_attempts="${GREENHOUSE_SECRET_IAM_MAX_ATTEMPTS:-6}"
  local output
  local status

  while [ "${attempt}" -le "${max_attempts}" ]; do
    set +e
    output="$(gcloud secrets add-iam-policy-binding "${secret_name}" \
      --project="${PROJECT_ID}" \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="roles/secretmanager.secretAccessor" \
      --quiet 2>&1)"
    status=$?
    set -e

    if [ "${status}" -eq 0 ]; then
      return 0
    fi

    if ! printf '%s' "${output}" | grep -Eqi 'concurrent policy changes|Status code: 409|ABORTED'; then
      printf '%s\n' "${output}" >&2
      return "${status}"
    fi

    if secret_accessor_binding_exists "${secret_name}"; then
      echo "  IAM binding became visible after concurrent update."
      return 0
    fi

    if [ "${attempt}" -eq "${max_attempts}" ]; then
      printf '%s\n' "${output}" >&2
      echo "ERROR: Could not grant Secret Manager access for ${secret_name} after ${max_attempts} attempts." >&2
      return "${status}"
    fi

    local backoff=$((2 ** (attempt - 1)))
    if [ "${backoff}" -gt 20 ]; then
      backoff=20
    fi
    local jitter=$((RANDOM % 3))
    local sleep_seconds=$((backoff + jitter))

    echo "  Secret IAM policy changed concurrently; retry ${attempt}/${max_attempts} in ${sleep_seconds}s."
    sleep "${sleep_seconds}"
    attempt=$((attempt + 1))
  done
}
