#!/usr/bin/env bash
#
# gcloud-auth-preflight.sh — keeps gcloud CLI auth and ADC aligned.
#
# Why this exists:
#   Google Cloud has two local auth planes that can drift:
#     1. gcloud CLI credentials (`gcloud auth print-access-token`)
#     2. Application Default Credentials (`gcloud auth application-default print-access-token`)
#
# Cloud SQL tooling, bq, Secret Manager and Node SDKs do not all consume the
# same plane. When either plane is expired, renew both so agents do not fix only
# ADC and leave the next verification broken.

set -euo pipefail

PROJECT_ID="${GREENHOUSE_GCLOUD_PROJECT:-efeonce-group}"
NONINTERACTIVE="${GREENHOUSE_GCLOUD_AUTH_NONINTERACTIVE:-false}"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }
dim()   { printf "\033[2m%s\033[0m\n" "$*"; }

die() {
  red "[GCLOUD_AUTH] $*" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 no encontrado en PATH."
}

gcloud_cli_ok() {
  gcloud auth print-access-token --quiet >/dev/null 2>&1
}

gcloud_adc_ok() {
  gcloud auth application-default print-access-token --quiet >/dev/null 2>&1
}

renew_both() {
  if [ "$NONINTERACTIVE" = "true" ]; then
    die "Credenciales GCP expiradas y GREENHOUSE_GCLOUD_AUTH_NONINTERACTIVE=true.
Renueva manualmente ambos planos:
  gcloud auth login
  gcloud auth application-default login"
  fi

  blue "Renovando gcloud CLI auth..."
  gcloud auth login || die "No se pudo renovar gcloud CLI auth."

  blue "Renovando Application Default Credentials (ADC)..."
  gcloud auth application-default login || die "No se pudo renovar ADC."
}

need_command gcloud

blue "Verificando credenciales GCP CLI + ADC..."

cli_status="ok"
adc_status="ok"

if ! gcloud_cli_ok; then
  cli_status="expired"
fi

if ! gcloud_adc_ok; then
  adc_status="expired"
fi

if [ "$cli_status" != "ok" ] || [ "$adc_status" != "ok" ]; then
  red "Credenciales GCP desalineadas o expiradas (cli=${cli_status}, adc=${adc_status})."
  renew_both
fi

gcloud_cli_ok || die "gcloud CLI auth sigue invalida despues de renovar."
gcloud_adc_ok || die "ADC siguen invalidas despues de renovar."

current_project="$(gcloud config get-value project 2>/dev/null || true)"

if [ "$current_project" != "$PROJECT_ID" ]; then
  blue "Ajustando proyecto gcloud: ${current_project:-<none>} -> $PROJECT_ID"
  gcloud config set project "$PROJECT_ID" >/dev/null
fi

dim "GCP CLI auth vigente."
dim "GCP ADC vigente."
green "Credenciales GCP alineadas para $PROJECT_ID."
