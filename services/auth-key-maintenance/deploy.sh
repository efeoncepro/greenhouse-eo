#!/usr/bin/env bash
# TASK-1833: deploy a paused-by-default Job definition. Never execute it here.
set -euo pipefail

AUTH_MAINT_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$AUTH_MAINT_REPO_ROOT"

if [[ "${ENV:-}" != production ]]; then
  echo 'ERROR: the Auth key Job has one production resource; ENV=production is required.' >&2
  exit 1
fi
if [[ ! "${EXPECTED_SHA:-}" =~ ^[0-9a-f]{40}$ ]] || [[ "$(git rev-parse HEAD)" != "${EXPECTED_SHA}" ]]; then
  echo 'ERROR: EXPECTED_SHA must be the exact checked-out 40-character commit.' >&2
  exit 1
fi
if ! git diff --quiet HEAD -- services/auth-key-maintenance src/lib/auth-server/keys \
  src/lib/auth-server/maintenance package.json pnpm-lock.yaml tsconfig.json vendor .dockerignore .gcloudignore; then
  echo 'ERROR: local runtime/build inputs differ from EXPECTED_SHA.' >&2
  exit 1
fi

AUTH_MAINT_PROJECT='efeonce-group'
AUTH_MAINT_REGION='us-east4'
AUTH_MAINT_JOB='auth-key-maintenance'
AUTH_MAINT_SA="auth-key-maintenance@${AUTH_MAINT_PROJECT}.iam.gserviceaccount.com"
AUTH_MAINT_KEY="projects/${AUTH_MAINT_PROJECT}/locations/${AUTH_MAINT_REGION}/keyRings/auth-server/cryptoKeys/auth-server-es256"
AUTH_MAINT_PG_INSTANCE="${AUTH_MAINT_PROJECT}:${AUTH_MAINT_REGION}:greenhouse-pg-dev"
AUTH_MAINT_PG_REF="${AUTH_KEY_MAINTENANCE_PG_PASSWORD_REF:-}"

if [[ ! "${AUTH_MAINT_PG_REF}" =~ ^greenhouse-auth-key-maintenance-pg-password:[1-9][0-9]*$ ]]; then
  echo 'ERROR: pin a dedicated Auth key maintenance PostgreSQL secret version.' >&2
  exit 1
fi

AUTH_MAINT_PG_VERSION="${AUTH_MAINT_PG_REF##*:}"
if ! gcloud iam service-accounts describe "${AUTH_MAINT_SA}" --project="${AUTH_MAINT_PROJECT}" >/dev/null 2>&1 ||
   [[ "$(gcloud secrets versions describe "${AUTH_MAINT_PG_VERSION}" \
      --secret=greenhouse-auth-key-maintenance-pg-password --project="${AUTH_MAINT_PROJECT}" \
      --format='value(state)' 2>/dev/null)" != ENABLED ]]; then
  echo 'ERROR: dedicated service account or pinned PostgreSQL secret version is unavailable.' >&2
  exit 1
fi

AUTH_MAINT_IMAGE="${AUTH_MAINT_REGION}-docker.pkg.dev/${AUTH_MAINT_PROJECT}/cloud-run-source-deploy/${AUTH_MAINT_JOB}:${EXPECTED_SHA}"
gcloud builds submit "$AUTH_MAINT_REPO_ROOT" \
  --project="${AUTH_MAINT_PROJECT}" \
  --config=services/auth-key-maintenance/cloudbuild.yaml \
  --substitutions="_IMAGE=${AUTH_MAINT_IMAGE}" \
  --quiet

# Fixed OFF/dry-run defaults, no execute-now and no IAM mutation. Scheduler is
# separately provisioned PAUSED only after the Job and recovery rehearsal pass.
gcloud run jobs deploy "${AUTH_MAINT_JOB}" \
  --project="${AUTH_MAINT_PROJECT}" --region="${AUTH_MAINT_REGION}" \
  --image="${AUTH_MAINT_IMAGE}" --service-account="${AUTH_MAINT_SA}" \
  --cpu=1 --memory=512Mi --task-timeout=300s --max-retries=0 --tasks=1 --parallelism=1 \
  --set-env-vars="AUTH_KEY_MAINTENANCE_ENABLED=false,AUTH_KEY_MAINTENANCE_DRY_RUN=true,AUTH_SERVER_KMS_KEY=${AUTH_MAINT_KEY},GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=${AUTH_MAINT_PG_INSTANCE},GREENHOUSE_POSTGRES_DATABASE=greenhouse_app,GREENHOUSE_POSTGRES_USER=auth_key_maintenance,GIT_SHA=${EXPECTED_SHA}" \
  --set-secrets="GREENHOUSE_POSTGRES_PASSWORD=${AUTH_MAINT_PG_REF}" \
  --labels="git-sha=${EXPECTED_SHA},managed-by=deploy-sh" \
  --quiet

AUTH_MAINT_DEPLOYED_SHA="$(gcloud run jobs describe "${AUTH_MAINT_JOB}" \
  --project="${AUTH_MAINT_PROJECT}" --region="${AUTH_MAINT_REGION}" \
  --format='value(metadata.labels.git-sha)')"
if [[ "${AUTH_MAINT_DEPLOYED_SHA}" != "${EXPECTED_SHA}" ]]; then
  echo 'ERROR: Auth key maintenance Job SHA readback differs from EXPECTED_SHA.' >&2
  exit 1
fi

echo "auth-key-maintenance definition deployed at ${EXPECTED_SHA}; execution remains disabled."
