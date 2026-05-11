---
name: greenhouse-production-release
description: Use when promoting Greenhouse to production, investigating production release drift, running release preflight, dispatching the production orchestrator, approving production gates, rolling back, or changing the release control plane.
argument-hint: "[target sha, release goal, incident/drift context]"
---

# Greenhouse Production Release

Use this skill whenever a user says or implies: "pasemos a produccion",
"promote to production", "deploy main", "release", "rollback",
"preflight", "watchdog", "worker drift", "Vercel production", or "approve
production".

This skill is intentionally conservative. Production release is a control-plane
workflow, not a sequence of ad hoc deploy commands.

## First Reads

Read only what the task needs, in this order:

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- `.github/workflows/production-release.yml`
- `src/lib/release/workflow-allowlist.ts`

If rollback, watchdog, Azure, Vercel, or HubSpot is involved, also read:

- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/manual-de-uso/plataforma/release-watchdog.md`
- `.github/workflows/production-release-watchdog.yml`
- `.github/workflows/{ops-worker,commercial-cost-worker,ico-batch,hubspot-greenhouse-integration}-deploy.yml`
- `.github/workflows/{azure-teams-deploy,azure-teams-bot-deploy}.yml`

## Hard Rules

- Never treat a push to `main` as a completed production release.
- Never approve individual worker production gates as the normal path.
- Never dispatch production without the canonical orchestrator unless the user explicitly declares break-glass and the reason is documented.
- Never mutate `greenhouse_sync.release_manifests` by raw SQL. Use the canonical CLIs/helpers.
- Never mark a release as `released` when post-release health soft-failed. It must be `degraded`.
- Never run `git push`, GitHub workflow dispatch, Cloud Run deploy, Vercel promotion, rollback, DB release transition, or approval gate without explicit user approval for that external mutation.
- Never bypass `production-release.yml` because "the workers already deployed".
- Never introduce or change a production deploy workflow without updating `src/lib/release/workflow-allowlist.ts`, the orchestrator wiring, tests, docs, and this skill.

## Canonical Release Path

The normal release path is:

1. Confirm current branch, remotes, and dirty worktree.
2. Confirm `develop` is green and no unrelated local changes will be included.
3. Run or inspect release preflight:
   - local exploratory: `pnpm release:preflight --target-sha=<sha> --target-branch=main`
   - CI/orchestrator gate: `pnpm release:preflight --json --fail-on-error --output-file=<path> --target-sha=<sha> --target-branch=main`
4. Promote the intended SHA to `main` through the repo-approved merge/push path.
   - The orchestrator expects `target_sha` to already exist on `main`.
   - Vercel production deploy is triggered by Git integration on push to `main`; the orchestrator waits for that deployment to be READY.
5. Immediately dispatch the canonical orchestrator for that exact SHA:

```bash
gh workflow run production-release.yml \
  --ref main \
  -f target_sha=<40-char-sha> \
  -f force_infra_deploy=false
```

6. Approve the `Production Release Orchestrator` environment gate, not random
   stale worker runs.
7. Watch the orchestrator complete:
   - preflight
   - record-started
   - approval-gate
   - 4 Cloud Run workers via `workflow_call`
   - Azure gated jobs
   - Vercel production READY
   - `/api/auth/health`
   - manifest transition to `released` or `degraded`
8. Run or inspect watchdog after completion:

```bash
gh workflow run production-release-watchdog.yml --ref main \
  -f enable_teams=false \
  -f fail_on_error=true
```

9. Verify Cloud Run `GIT_SHA` for mapped services when needed:
   - `ops-worker` in `us-east4`
   - `commercial-cost-worker` in `us-east4`
   - `ico-batch-worker` in `us-east4`
   - `hubspot-greenhouse-integration` in `us-central1`

## What The Orchestrator Owns

`production-release.yml` owns the production release lifecycle:

- `pnpm release:preflight`
- `pnpm release:orchestrator-record-started`
- GitHub Environment `production` approval gate
- worker deploys through `workflow_call`
- Azure health/diff-gated deploy workflows
- Vercel readiness wait for `target_sha`
- post-release `/api/auth/health`
- `pnpm release:orchestrator-transition-state`
- `greenhouse_sync.release_manifests` final state

The source of truth is Postgres:

- `greenhouse_sync.release_manifests`
- `greenhouse_sync.release_state_transitions`

GitHub, Vercel, Cloud Run, Azure, and Teams are evidence and effectors; they do
not replace the manifest store.

## Drift Recovery

If watchdog reports `platform.release.worker_revision_drift`, do not guess.

1. Read the latest manifest:

```sql
SELECT release_id, target_sha, target_branch, state, started_at, completed_at
FROM greenhouse_sync.release_manifests
WHERE target_branch = 'main'
ORDER BY started_at DESC
LIMIT 5;
```

2. Compare Cloud Run `GIT_SHA` for every mapped service.
3. Identify whether drift is:
   - incomplete orchestrator run
   - direct worker deploy
   - push-triggered partial deploy
   - stale manifest
   - Cloud Run deployment failure
4. Prefer forward-fix with the existing workflow for the single drifted service
   only when the release SHA is already verified and the user approves the
   external mutation.
   - For `hubspot-greenhouse-integration`, use:

```bash
gh workflow run hubspot-greenhouse-integration-deploy.yml \
  --ref main \
  -f environment=production \
  -f expected_sha=<release target_sha> \
  -f skip_tests=false
```

     Then verify `/health`, `/contract`, and `pnpm release:watchdog --json`
     reports `drift_count=0`. Do not edit `greenhouse_sync.release_manifests`
     by SQL to fix drift.
5. Re-run watchdog.
6. Document the incident in `Handoff.md`.

## Break-Glass

Break-glass means a production incident is active and normal orchestration is
blocked. It must include:

- explicit user approval
- reason in plain language
- target SHA
- affected service(s)
- rollback or forward-fix plan
- verification plan
- `Handoff.md` note

Even in break-glass, reuse existing workflows and CLIs before direct cloud
commands.

## Skill Maintenance Contract

Agents must update this skill whenever the critical release flow changes.

Critical flow changes include:

- changing `.github/workflows/production-release.yml` jobs, inputs, gates, or state transitions
- changing worker `workflow_call` contract, `EXPECTED_SHA`, or `GIT_SHA` verification
- adding/removing any production deploy workflow or Cloud Run service mapping
- changing release state machine, manifest schema, or rollback behavior
- changing Vercel production mapping, domain, or readiness check
- changing watchdog semantics, thresholds, auth, or mapped services
- changing Azure production gating or WIF subjects

When a critical flow change happens, update all applicable sources in the same
change set:

- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- `docs/documentation/plataforma/release-orchestrator.md`
- `src/lib/release/workflow-allowlist.ts`
- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

If the change is only a local wording fix, update the skill only when agent
behavior would otherwise become wrong.

## Reporting

When reporting production-release work, include:

- target SHA
- branch and remote state
- whether orchestrator was run
- workflow run id(s)
- release_id and final manifest state
- Vercel production deployment URL and domain
- Cloud Run service SHAs for mapped services
- watchdog result
- what was not validated
- any docs or skill updates made
