# Greenhouse Worker Build Contract V1

> Status: Active
> Scope: Cloud Run build units in `services/**`
> Canonical gate: `pnpm worker:build-contract-gate`
> Runtime dependency gate: `pnpm worker:runtime-deps-gate`
> Deploy-path coverage gate: `pnpm worker:deploy-path-gate` (added 2026-08-29)

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
| `auth-server` | `services/auth-server/Dockerfile` | `.github/workflows/auth-server-deploy.yml` |

The machine-readable registry lives in `scripts/ci/worker-build-contract-gate.mjs`. A new Node worker is not
part of the platform contract until it is registered there and passes both worker gates.

`auth-server` (EPIC-044, TASK-1828, registered 2026-09-04) is the Efeonce authorization server, not a worker:
it serves HTTP behind the shared MCP front door, but it is built with the same recipe (esbuild
`--packages=external`, Node 22-slim, `pnpm install --prod`) and is registered in all three gates —
`worker:build-contract-gate`, `worker:runtime-deps-gate` and `worker:deploy-path-gate` (its bundle is 11
files, so the deploy-path check is cheap and complete). Its image copies only `package.json`, the lockfile,
`vendor/`, `tsconfig.json`, `src/`, `services/auth-server/` and `services/_shared/`; it does **not** copy
branding or fonts (no PDF/render surface), so a missing brand asset can never be an `auth-server` build
failure. Runbook: `docs/operations/runbooks/auth-server.md`.

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

`pnpm worker:runtime-deps-gate` builds the static import graph of all five registered build units (the four workers plus `auth-server`) and rejects a direct runtime
package that is absent from `dependencies`. This includes `artifact-worker`: although its image installs the
full root dependency set, direct runtime imports must not rely on incidental transitive packages.

The current root manifest remains a transitional shared dependency surface. A worker-specific package/runtime
closure may only be introduced through the authorized build-unit decomposition program; this contract does not
create a workspace or deployable opportunistically.

## Deploy-path coverage

A worker workflow decides **twice** whether to deploy, and both decisions read a path list that used to be
maintained by hand:

1. `on.push.paths` — whether the workflow runs at all.
2. `WORKER_RUNTIME_PATHS` — the drift check. If `git diff --quiet EXPECTED..CURRENT -- <paths>` sees nothing,
   the deploy step is **skipped** and the job closes `success`.

When the worker bundles a file the list does not mention, the change lands on `main`, the release manifest
reaches `released`, every deploy job is green — and the worker keeps serving the previous image. The symptom
surfaces later and elsewhere (stale data, a consumer that never reacts) and points at the domain, never at the
deploy. Release `64bdd105c737` closed green with the `ops-worker` still serving `8adf8c2d3`: exactly the code
that release existed to correct. Its job ran 46 seconds and reported
`worker runtime paths are unchanged since EXPECTED_SHA=64bdd105c737…; skipping build/deploy.`

Measured on 2026-08-29 with the esbuild metafile (the same bundle the Dockerfile produces): the `ops-worker`
packs **1449** local files, the declared list covered **24** prefixes, and **696** files were invisible to it —
including `src/lib/postgres`, most of `src/lib/finance` and all of `src/lib/growth/seo`. Since **1385 of the
1449** come from `src/lib`, enumerating subdirectories is structurally unsustainable. It had already failed five
times, each one closed by appending one more path: TASK-1210 (nubox), TASK-742 (auth/secrets), TASK-1723
(talent-pool), TASK-1746 (hiring/notifications), TASK-1279 (transitive deps of the grader).

**The declaration is therefore coarse and honest** — `src/lib/**`, `src/emails/**`, `src/types/**`,
`src/config/**`, `src/components/**`, `src/i18n/**`, `src/@core/**` plus the worker's own `services/` inputs, in
both lists. It keeps the selectivity that actually matters: `src/app/**`, `docs/**` and `tests/**` do not
redeploy a worker.

`pnpm worker:deploy-path-gate` (`scripts/ci/worker-deploy-path-coverage-gate.mjs`, wired in `ci.yml` next to the
other two worker gates) keeps that declaration true. It replicates the Dockerfile `esbuild --bundle` and derives
coverage from `metafile.inputs` — the real tree with transitive imports included, which is precisely what escapes
review by eye. It reports two failure kinds:

| Failure | Consequence | Remediation |
| --- | --- | --- |
| Bundle file under no declared prefix | The workflow never runs on that change | Add the prefix to **both** lists |
| File in `on.push.paths` but not in `WORKER_RUNTIME_PATHS` | Workflow runs, drift check skips deploy, job closes `success` | Add the prefix to `WORKER_RUNTIME_PATHS` |

The second check only applies where the mechanism exists: a workflow with no `WORKER_RUNTIME_PATHS` block has no
drift check to skip. Remediation always declares a **directory**, never a single file.

Scope: the four esbuild-bundled Node build units registered in the script — `ops-worker`, `commercial-cost-worker`,
`ico-batch` and, since 2026-09-04, `auth-server` (`.github/workflows/auth-server-deploy.yml`). `artifact-worker`
runs from source through `tsx` rather than an esbuild bundle and is not registered in this gate; its path list
remains under manual review.

Verified coverage on 2026-08-29: `ops-worker` 1449 files, `commercial-cost-worker` 107, `ico-batch` 55. The first
run surfaced two gaps nobody was looking for: `commercial-cost-worker` and `ico-batch` did not cover
`services/_shared/sentry-init.ts`, which both bundle. On 2026-09-04 `auth-server` registered with 11 files in its
bundle, all covered.

### Reading a skipped deploy

A skip from the change gate does **not** prove the runtime diff is empty. It proves the **declared paths** did
not change. To tell a legitimate no-op from a false one, diff the **whole tree**, with no `--`:

```bash
git diff --name-only <deployed_sha> <target_sha>   # empty ⇒ identical trees ⇒ legitimate skip
```

Both cases are on record. Release `e1718a359575`: `git diff --name-only 380a20fa3 e1718a359575` came back empty
and the 44-second skip was correct — `push:develop` had already deployed identical content. Release
`64bdd105c737`: the trees did differ, and the same-looking skip left the worker stale.

Operator runbook: `docs/manual-de-uso/plataforma/verificar-cobertura-de-deploy-de-workers.md`. Agent invariants:
`docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` (§Cobertura de rutas de deploy).

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
pnpm worker:deploy-path-gate
gcloud meta list-files-for-upload | rg '^vendor/'
```

After push, every affected Cloud Build must succeed and the deployed revision/job must report the target SHA.
If Docker is unavailable locally, report `code complete, rollout pendiente` until the canonical remote build
provides image evidence. Never declare a failed build harmless because the previous healthy revision remains
serving.
