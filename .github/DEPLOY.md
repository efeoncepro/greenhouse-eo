# GitHub Actions → GCP Deployments

This document describes the canonical authentication contract between
GitHub Actions workflows in `efeoncepro/greenhouse-eo` and Google Cloud
Platform. **Read this before adding any new workflow that touches GCP.**

## TL;DR

- Workflows authenticate via **Workload Identity Federation** (OIDC),
  not via service account keys. No long-lived secrets exist in the
  repo.
- Impersonation target: `github-actions-deployer@efeonce-group.iam.gserviceaccount.com`
- Only one repo (`efeoncepro/greenhouse-eo`) can mint tokens against
  that service account. The attribute condition in the WIF provider
  enforces it.
- The setup is declared once, idempotently, in
  [`scripts/setup-github-actions-wif.sh`](../scripts/setup-github-actions-wif.sh).
  Re-run that script to re-provision or mirror the setup.

## Why Workload Identity Federation

Service account JSON keys are long-lived credentials that a leaked
workflow run can exfiltrate. WIF replaces them with **short-lived tokens
minted per-workflow-run**, scoped to the exact repository, optionally
scoped further by branch/ref/actor.

The trust chain:

```
GitHub Actions run
    ↓ (issues OIDC token via https://token.actions.githubusercontent.com)
OIDC token with claims { repository: "efeoncepro/greenhouse-eo", ref: "...", actor: "..." }
    ↓ (presented to Google STS)
WIF provider `efeoncepro-greenhouse-eo` (issuer-uri + attribute-condition on repository)
    ↓ (token exchange)
Federated principal under principalSet://…/attribute.repository/efeoncepro/greenhouse-eo
    ↓ (iam.workloadIdentityUser binding)
Service account `github-actions-deployer@efeonce-group`
    ↓ (impersonation)
gcloud commands run AS the service account
```

If any hop in the chain fails — wrong repo, wrong issuer, missing
binding — the token exchange fails cleanly. There is no "default
credentials" fallback.

## One deployer SA, not N

Every GitHub Actions workflow impersonates the **same service account**:
`github-actions-deployer@efeonce-group`. That SA has the union of roles
all workflows need.

**Why not per-service deployers** (e.g. `ops-worker-deployer`,
`nexa-deployer`, `kortex-deployer`):

1. Scaling O(n) with services creates maintenance burden without
   security benefit. The runtime identity of each Cloud Run service is
   already a SEPARATE service account (greenhouse-portal, etc.). The
   deployer only needs to SET those runtime SAs on services, not act
   as them.
2. Adding a new Cloud Run service becomes a zero-IAM change — just add
   a new workflow that impersonates the existing deployer.
3. Per-service deployers encourage drift ("ops-worker-deployer has
   roles/secretmanager.admin, nexa-deployer doesn't remember which
   secrets it needs"). One deployer has a single list of roles in the
   setup script and every new workflow automatically inherits.

**When to fork a deployer**: only when a workflow legitimately needs a
role that no other workflow should have. Example: a workflow that
rotates the root Postgres password probably wants its own
`root-rotator-deployer` with scoped permissions. Until that case
exists, stay on one.

## Provisioned roles

`github-actions-deployer` has the following **project-level** roles
(granted in `scripts/setup-github-actions-wif.sh`):

| Role | Why |
|---|---|
| `roles/cloudbuild.builds.editor` | Submit Cloud Build jobs to build container images |
| `roles/run.admin` | Deploy / update / describe Cloud Run services |
| `roles/cloudscheduler.admin` | Create, update, delete Cloud Scheduler jobs |
| `roles/secretmanager.admin` | Grant `roles/secretmanager.secretAccessor` on individual secrets to runtime SAs |
| `roles/storage.admin` | Read/write the Cloud Build staging bucket + private assets bucket |
| `roles/artifactregistry.writer` | Push built container images |

And the following **resource-level** binding:

| Role | Resource | Why |
|---|---|---|
| `roles/iam.serviceAccountUser` | `greenhouse-portal@efeonce-group` | Set greenhouse-portal as the **runtime** SA of a Cloud Run service without being greenhouse-portal itself |

The deployer is intentionally **NOT** greenhouse-portal. Deploy identity
and runtime identity stay separate so a compromised workflow can't read
production data — it can only cause services to be redeployed (which is
auditable via Cloud Build + Cloud Run revision history).

## Adding a new workflow

1. Create `.github/workflows/<name>.yml` that calls
   `google-github-actions/auth@v2` with:

   ```yaml
   permissions:
     contents: read
     id-token: write  # REQUIRED — this is how OIDC tokens are minted
   ...
   - name: Authenticate to Google Cloud
     uses: google-github-actions/auth@v2
     with:
       workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
       service_account: github-actions-deployer@efeonce-group.iam.gserviceaccount.com
   ```

2. If the workflow needs a role that `github-actions-deployer` doesn't
   yet have, append it to `PROJECT_ROLES` in
   `scripts/setup-github-actions-wif.sh` and re-run:

   ```bash
   bash scripts/setup-github-actions-wif.sh
   ```

   The script is idempotent, so re-runs only add the new binding.

3. Do NOT create a new service account, WIF pool, or provider unless
   the workflow genuinely needs isolation from other workflows (very
   rare).

## Adding `GCP_WORKLOAD_IDENTITY_PROVIDER` to the repo secrets

Only an owner/admin of the GitHub repo can do this:

1. Run `scripts/setup-github-actions-wif.sh` (or read the existing
   provider resource name from gcloud):

   ```bash
   gcloud iam workload-identity-pools providers describe \
     efeoncepro-greenhouse-eo \
     --project=efeonce-group \
     --location=global \
     --workload-identity-pool=github-actions \
     --format='value(name)'
   ```

   Expected output:
   ```
   projects/183008134038/locations/global/workloadIdentityPools/github-actions/providers/efeoncepro-greenhouse-eo
   ```

2. In GitHub: Settings → Secrets and variables → Actions → New
   repository secret.

   - Name: `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - Value: (the full resource name from step 1)

3. The workflow will start authenticating successfully on the next run.

## Protecting production

The `ops-worker-deploy.yml` workflow uses GitHub **environments**
(`staging` for develop, `production` for main). Configure these in
Settings → Environments:

- `staging`: no required reviewers. Auto-deploys on push to develop.
- `production`: add **required reviewers** (at minimum the tech lead
  and one other maintainer). The workflow will pause until someone
  approves, then resume.

The environment protection is a GitHub-side feature — it is NOT
enforced by GCP. If you want GCP-side protection (e.g. prevent
production deploys on weekends), add an attribute condition to the
WIF provider or a deny-rule to the service account.

## Disaster recovery

If the WIF setup is deleted or corrupted:

1. Run `bash scripts/setup-github-actions-wif.sh` with an account that
   has owner / IAM admin on `efeonce-group`.
2. Copy the provider resource name from the output.
3. Update `GCP_WORKLOAD_IDENTITY_PROVIDER` in GitHub repo secrets.
4. Trigger a workflow run to confirm.

Total time: under 5 minutes. No data is at risk because WIF never
stores any secret material — the trust chain is purely attribute-based.

## Related files

- [`.github/workflows/ops-worker-deploy.yml`](workflows/ops-worker-deploy.yml) — the first workflow using this setup
- [`.github/workflows/ico-batch-deploy.yml`](workflows/ico-batch-deploy.yml) — same WIF pattern for ICO/Finance batch lanes
- [`.github/workflows/commercial-cost-worker-deploy.yml`](workflows/commercial-cost-worker-deploy.yml) — WIF deploy for the dedicated commercial cost basis worker
- [`scripts/setup-github-actions-wif.sh`](../scripts/setup-github-actions-wif.sh) — idempotent provisioning script
- [`services/ops-worker/deploy.sh`](../services/ops-worker/deploy.sh) — the actual deploy shell script the workflow runs
