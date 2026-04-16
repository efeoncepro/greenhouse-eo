#!/usr/bin/env bash
#
# scripts/setup-github-actions-wif.sh
#
# Canonical, idempotent setup for GitHub Actions → GCP authentication
# via Workload Identity Federation (WIF). This file is the single source
# of truth for the deployment identity used by every GitHub Actions
# workflow in this repository.
#
# What it provisions:
#
#   1. Workload Identity Pool `github-actions` under
#      projects/efeonce-group/locations/global/workloadIdentityPools
#
#   2. OIDC provider `efeoncepro-greenhouse-eo` inside that pool,
#      issuer `https://token.actions.githubusercontent.com`, locked by
#      an attribute condition to
#          assertion.repository == 'efeoncepro/greenhouse-eo'
#      so tokens from any other repo CANNOT impersonate the deployer.
#
#   3. Service account `github-actions-deployer@efeonce-group` with the
#      project-level roles the CI/CD flows need:
#
#        roles/cloudbuild.builds.editor       (submit Cloud Build jobs)
#        roles/run.admin                       (deploy/update Cloud Run)
#        roles/cloudscheduler.admin            (manage Scheduler jobs)
#        roles/secretmanager.admin             (bind secret accessors)
#        roles/storage.admin                   (Cloud Build GCS staging)
#        roles/artifactregistry.writer         (push built images)
#        roles/iam.serviceAccountUser on
#            greenhouse-portal@efeonce-group   (use as runtime SA)
#
#   4. Workload identity binding so tokens minted for the GitHub repo
#      can impersonate the deployer via principalSet:
#          principalSet://.../workloadIdentityPools/github-actions/
#                attribute.repository/efeoncepro/greenhouse-eo
#
# Why generic (not per-service):
#
#   Creating a dedicated SA per Cloud Run service (e.g. ops-worker-deployer,
#   nexa-deployer, nubox-deployer, ...) scales O(n) with services and
#   creates maintenance burden without adding real security because the
#   runtime identity of every service is already a SEPARATE SA
#   (greenhouse-portal, etc.). The deployer SA only needs to be able to
#   SET those runtime SAs on Cloud Run services — not act as them. One
#   generic deployer is correct.
#
#   If a future service needs a DIFFERENT set of deploy permissions
#   (e.g. bigquery admin for a BQ-managing workflow), we add another
#   deployer SA for that specific need, NOT one per Cloud Run service.
#
# Why the script is idempotent:
#
#   Every step uses create-or-ignore / add-iam-policy-binding which are
#   safe to re-run. The script can be executed by any operator with
#   `roles/owner` or equivalent on the GCP project to recover the
#   setup after a disaster, or to mirror it onto a fresh project. No
#   state files, no terraform, no runtime coupling.
#
# Required to run:
#
#   - gcloud CLI authenticated as a user with roles/owner or
#     roles/iam.workloadIdentityPoolAdmin + roles/iam.serviceAccountAdmin
#     + roles/resourcemanager.projectIamAdmin on the project.
#   - `jq` is NOT required — the script uses plain gcloud output.
#
# Required after running (done ONCE in GitHub, not in gcloud):
#
#   Set the repository secret `GCP_WORKLOAD_IDENTITY_PROVIDER` to:
#       projects/183008134038/locations/global/workloadIdentityPools/github-actions/providers/efeoncepro-greenhouse-eo
#
#   The workflow yml at .github/workflows/ops-worker-deploy.yml reads
#   that secret plus the hardcoded service account email.
#
# Usage:
#
#   bash scripts/setup-github-actions-wif.sh
#

set -euo pipefail

PROJECT_ID="efeonce-group"
PROJECT_NUMBER="183008134038"
POOL_ID="github-actions"
POOL_DISPLAY_NAME="GitHub Actions Pool"
PROVIDER_ID="efeoncepro-greenhouse-eo"
PROVIDER_DISPLAY_NAME="efeoncepro/greenhouse-eo"
REPO="efeoncepro/greenhouse-eo"
DEPLOYER_SA_NAME="github-actions-deployer"
DEPLOYER_SA_EMAIL="${DEPLOYER_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA_EMAIL="greenhouse-portal@${PROJECT_ID}.iam.gserviceaccount.com"
# Cloud Build in this project runs as the Compute Engine default SA (legacy
# default for projects that predate Cloud Build's per-build SA feature). The
# deployer must be able to act-as this SA for `gcloud builds submit` to work.
CLOUDBUILD_SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

PROJECT_ROLES=(
  "roles/cloudbuild.builds.editor"
  "roles/run.admin"
  "roles/cloudscheduler.admin"
  "roles/secretmanager.admin"
  "roles/storage.admin"
  "roles/artifactregistry.writer"
  # Required so `gcloud builds submit` can stream Cloud Build logs back to
  # the workflow output. Without it the submit succeeds but gcloud errors
  # on log-stream retrieval, masking an otherwise-green build as a failure.
  "roles/logging.viewer"
)

echo "=== GitHub Actions WIF setup — ${PROJECT_ID} ==="

# ─── 1. Pool ────────────────────────────────────────────────────────────
if gcloud iam workload-identity-pools describe "${POOL_ID}" \
  --project="${PROJECT_ID}" --location=global >/dev/null 2>&1; then
  echo "✓ workload-identity-pool ${POOL_ID} already exists"
else
  echo "→ creating workload-identity-pool ${POOL_ID}"
  gcloud iam workload-identity-pools create "${POOL_ID}" \
    --project="${PROJECT_ID}" --location=global \
    --display-name="${POOL_DISPLAY_NAME}" \
    --description="OIDC pool for GitHub Actions deployments from ${REPO}." \
    --quiet
fi

# ─── 2. Provider ────────────────────────────────────────────────────────
if gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
  --project="${PROJECT_ID}" --location=global \
  --workload-identity-pool="${POOL_ID}" >/dev/null 2>&1; then
  echo "✓ provider ${PROVIDER_ID} already exists"
else
  echo "→ creating provider ${PROVIDER_ID}"
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
    --project="${PROJECT_ID}" --location=global \
    --workload-identity-pool="${POOL_ID}" \
    --display-name="${PROVIDER_DISPLAY_NAME}" \
    --description="OIDC provider restricted to ${REPO}." \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref,attribute.actor=assertion.actor" \
    --attribute-condition="assertion.repository == '${REPO}'" \
    --quiet
fi

# ─── 3. Deployer service account ────────────────────────────────────────
if gcloud iam service-accounts describe "${DEPLOYER_SA_EMAIL}" \
  --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✓ service-account ${DEPLOYER_SA_EMAIL} already exists"
else
  echo "→ creating service-account ${DEPLOYER_SA_EMAIL}"
  gcloud iam service-accounts create "${DEPLOYER_SA_NAME}" \
    --project="${PROJECT_ID}" \
    --display-name="GitHub Actions Deployer" \
    --description="Generic deployer for ${REPO} GitHub Actions. Impersonated via WIF." \
    --quiet
fi

# ─── 4. Project-level roles (idempotent) ────────────────────────────────
for role in "${PROJECT_ROLES[@]}"; do
  echo "→ ensuring ${role} on ${DEPLOYER_SA_EMAIL}"
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
    --role="${role}" \
    --condition=None \
    --quiet >/dev/null
done

# ─── 5. Allow deployer to impersonate the runtime SA ────────────────────
echo "→ ensuring deployer can act as ${RUNTIME_SA_EMAIL}"
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.serviceAccountUser" \
  --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
  --quiet >/dev/null

# ─── 5b. Allow deployer to act as the Cloud Build default SA ───────────
# `gcloud builds submit` runs the build as this SA by default; without
# serviceAccountUser, submission fails with PERMISSION_DENIED (the deployer
# can submit jobs but can't tell Cloud Build to run them as any SA).
echo "→ ensuring deployer can act as ${CLOUDBUILD_SA_EMAIL}"
gcloud iam service-accounts add-iam-policy-binding "${CLOUDBUILD_SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.serviceAccountUser" \
  --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
  --quiet >/dev/null

# ─── 6. WIF binding (repo-scoped principalSet) ──────────────────────────
PRINCIPAL_SET="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPO}"

echo "→ binding ${PRINCIPAL_SET} → ${DEPLOYER_SA_EMAIL}"
gcloud iam service-accounts add-iam-policy-binding "${DEPLOYER_SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="${PRINCIPAL_SET}" \
  --quiet >/dev/null

# ─── Output for the GitHub secret ───────────────────────────────────────

PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

cat <<EOF

=== Setup complete ===

GitHub repository secrets to configure (Settings → Secrets → Actions):

  GCP_WORKLOAD_IDENTITY_PROVIDER:
    ${PROVIDER_RESOURCE}

  (no key file needed — the workflow uses OIDC + impersonation)

Service account used by workflows (hardcoded in the yml):

  ${DEPLOYER_SA_EMAIL}

Verify the workflow references match:

  .github/workflows/ops-worker-deploy.yml
    service_account: ${DEPLOYER_SA_EMAIL}
    workload_identity_provider: \${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}

Add any future GitHub Actions workflow that needs GCP by:

  1. Importing google-github-actions/auth@v2 with the same
     workload_identity_provider secret and service_account literal.
  2. Granting any ADDITIONAL role the new workflow needs (e.g. BQ admin)
     to ${DEPLOYER_SA_EMAIL} by appending it to PROJECT_ROLES in
     this script and re-running. No new WIF pool, no new provider,
     no new principalSet binding needed.
EOF
