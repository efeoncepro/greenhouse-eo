# Greenhouse Worker Build Contract V1

> Status: Active
> Scope: Cloud Run build units in `services/**`
> Canonical gate: `pnpm worker:build-contract-gate`
> Runtime dependency gate: `pnpm worker:runtime-deps-gate`

## Purpose

Make every worker image reproducible from the committed Git SHA and fail before deployment when a package,
filesystem input, package-manager version or workflow trigger is incomplete.

The current build units covered by this contract are:

| Build unit | Dockerfile | Deployment workflow |
| --- | --- | --- |
| `ops-worker` | `services/ops-worker/Dockerfile` | `.github/workflows/ops-worker-deploy.yml` |
| `commercial-cost-worker` | `services/commercial-cost-worker/Dockerfile` | `.github/workflows/commercial-cost-worker-deploy.yml` |
| `ico-batch-worker` | `services/ico-batch/Dockerfile` | `.github/workflows/ico-batch-deploy.yml` |
| `artifact-worker` | `services/artifact-worker/Dockerfile` | `.github/workflows/artifact-worker-deploy.yml` |

The machine-readable registry lives in `scripts/ci/worker-build-contract-gate.mjs`. A new Node worker is not
part of the platform contract until it is registered there and passes both worker gates.

## Package-manager source of truth

`package.json#packageManager` is the sole source of truth for pnpm in GitHub Actions. Workflows use
`pnpm/action-setup@v6` without a `version` input. Dockerfiles bootstrap before dependency installation and may
mirror the exact version through `ARG PNPM_VERSION`; the gate rejects drift from `packageManager`.

Node runtime ownership remains separate: portal/CI use Node 24, while worker runtime cutover follows its
authorized runtime task. This contract does not silently rewrite a worker base image.

## Local filesystem dependencies

While Greenhouse consumes a package with a `file:` specifier:

1. the referenced file must exist and be tracked by Git;
2. its SHA-512 must match `pnpm-lock.yaml`;
3. `.gcloudignore` and `.dockerignore` must keep the input in the root build context;
4. every Docker stage that runs `pnpm install` must copy the input root before installation;
5. every worker workflow must react to `package.json`, `pnpm-lock.yaml`, both ignore files and `vendor/**`.

The canonical Docker ordering is:

```dockerfile
COPY package.json pnpm-lock.yaml ./
COPY vendor/ ./vendor/
RUN pnpm install --frozen-lockfile --ignore-scripts
```

Copying the directory instead of a single filename makes a new local package visible without repeating a
Dockerfile edit, while the gate still validates each declared `file:` input individually.

## Runtime dependency closure

`pnpm worker:runtime-deps-gate` builds the static import graph of all four workers and rejects a direct runtime
package that is absent from `dependencies`. This includes `artifact-worker`: although its image installs the
full root dependency set, direct runtime imports must not rely on incidental transitive packages.

The current root manifest remains a transitional shared dependency surface. A worker-specific package/runtime
closure may only be introduced through the authorized build-unit decomposition program; this contract does not
create a workspace or deployable opportunistically.

## Distribution target and retirement

The vendored Globe tarballs are an explicit temporary bridge from `TASK-1454`. Their definitive distribution
path is owned by `TASK-1473`, which is currently blocked by its declared capability dependencies.

`TASK-1473` must certify a scoped private registry path with immutable SemVer versions, exact consumer pins,
lockfile integrity, short-lived workload authentication, publish/install provenance and rollback to the prior
package version. Vendored inputs may be removed only after local, GitHub Actions, Cloud Build and Vercel installs
all pass against the registry. Until that gate closes, vendoring remains supported and deterministic rather than
being bypassed with an ad-hoc token or untracked file.

## Verification and failure semantics

Run before committing a worker/build-input change:

```bash
pnpm worker:build-contract-gate:test
pnpm worker:build-contract-gate
pnpm worker:runtime-deps-gate
gcloud meta list-files-for-upload | rg '^vendor/'
```

After push, every affected Cloud Build must succeed and the deployed revision/job must report the target SHA.
If Docker is unavailable locally, report `code complete, rollout pendiente` until the canonical remote build
provides image evidence. Never declare a failed build harmless because the previous healthy revision remains
serving.
