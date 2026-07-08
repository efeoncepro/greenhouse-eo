---
name: greenhouse-production-release
description: Use when promoting Greenhouse to production, investigating production release drift, running release preflight, dispatching the production orchestrator, approving production gates, rolling back, changing the release control plane, OR recovering from orchestrator/preflight failures and diagnosing release blockers (sentry critical issues, vercel env drift, secret ref corruption, watchdog stale approvals, worker_revision_drift, Wait Vercel READY failure, AZURE_AD_CLIENT_ID drift, smoke probe failures). MANDATORY before touching any preflight check code, deploy.sh, or workflow YAML.
argument-hint: "[target sha, release goal, incident/drift context]"
---

# Greenhouse Production Release

Use this skill whenever a user says or implies: "pasemos a produccion",
"promote to production", "deploy main", "release", "rollback",
"preflight", "watchdog", "worker drift", "Vercel production", or "approve
production".

This skill is intentionally conservative. Production release is a control-plane
workflow, not a sequence of ad hoc deploy commands.

Current watchdog posture as of 2026-05-24: `.github/workflows/production-release-watchdog.yml`
is manual-only in repo until TASK-920 repairs the false-positive signal. The
GitHub workflow is also `disabled_manually` as an emergency stop while `main`
still has the old schedule. Use `pnpm release:watchdog --json` until the
no-schedule workflow reaches `main` and the workflow is re-enabled. Do not
re-enable a schedule without TASK-920 or an explicit incident rationale.

## First Reads

Read only what the task needs, in this order:

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- **`docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` — OBLIGATORIO si el orchestrator falló (no chasees el gate; lee el JSON output como diagnóstico)**
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- **`docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — OBLIGATORIO en TODO paso a producción. Lee la `§ Pendientes de acción`: hay features `code-complete` cuyo flag default-OFF debe prenderse en prod junto a este release (a veces + migración/ops-worker). El deploy del código NO los activa — qué prender se lee de acá, no de la memoria.**
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
- Never reintroduce worker production deploys on `push:main`; workers deploy to
  production through the orchestrator `workflow_call` path, with
  `workflow_dispatch` reserved for documented break-glass.
- Never dispatch production without the canonical orchestrator unless the user explicitly declares break-glass and the reason is documented.
- Never mutate `greenhouse_sync.release_manifests` by raw SQL. Use the canonical CLIs/helpers.
- Never mark a release as `released` when post-release health soft-failed. It must be `degraded`.
- Never run `git push`, GitHub workflow dispatch, Cloud Run deploy, Vercel promotion, rollback, DB release transition, or approval gate without explicit user approval for that external mutation.
- Never bypass `production-release.yml` because "the workers already deployed".
- Never introduce or change a production deploy workflow without updating `src/lib/release/workflow-allowlist.ts`, the orchestrator wiring, tests, docs, and this skill.
- Never infer that Azure or a worker "skipped" from the workflow name alone. Read the job summary/logs and verify Cloud Run `Ready=True` + `GIT_SHA` or watchdog OK. Azure `no_infra_diff` can be an expected no-op; worker revision drift is never a clean release closure.
- **Never `git push` to `main` (including hotfixes, doc-only commits, or fixes "that don't affect workers") without immediately dispatching the canonical orchestrator `production-release.yml` with `target_sha=<HEAD del push>`.** Every commit on `main` MUST be tracked by a release manifest. The Vercel auto-deploy on `push:main` is NOT a release — only the manifest in `greenhouse_sync.release_manifests` reflects what production is supposed to be. **Anti-pattern detectado 2026-05-14**: Codex pushó 3 hotfixes directo a main (`982accaf`, `4fe799cf`, `cfea1784`) post un release ajeno; Vercel auto-deployó pero el manifest quedó en el SHA del release anterior → drift cosmético + audit trail roto.
- **Never cherry-pick to `main` a commit that also exists on `develop`.** Creates duplicate SHAs for the same logical change (caso real 2026-05-14: `fa5258a5/4fe799cf` mismo diff distinto SHA), confuses audit trail, breaks the exact mirror between develop/main. Canonical hotfix path: branch from `main` → fix → PR → merge → orchestrator dispatch → cherry-pick back to develop (not the other direction).
- **Never assume "hotfix small, no orchestrator needed"** — the rule has zero exceptions outside break-glass. Even a typo fix to `main` requires orchestrator dispatch to keep manifest aligned. If the fix is too trivial for a release manifest, it's too trivial to push to `main` — merge to develop and wait for the next regular release.
- **SIEMPRE revisar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (§ Pendientes de acción) al planear Y al cerrar un paso a producción.** Una feature `code-complete` mergeada a `main` queda **invisible** en prod si su flag `*_ENABLED` (default OFF) no se prende explícitamente — a veces además requiere su migración aplicada a prod (vía este release) y/o redeploy del ops-worker. El deploy del código NO prende flags. Qué flags prender con este release se lee del ledger, no de la memoria; tras prenderlos, actualizar el snapshot del ledger. **NUNCA** declarar un release `released` dejando un flag que debía prenderse en este release sin prender (queda como `degraded` o pendiente documentado).

## Canonical Release Path

The normal release path is:

1. Confirm current branch, remotes, and dirty worktree.
2. Confirm `develop` is green and no unrelated local changes will be included.
3. Run or inspect release preflight:
   - local exploratory: `pnpm release:preflight --target-sha=<sha> --target-branch=main`
   - CI/orchestrator gate: `pnpm release:preflight --json --fail-on-error --output-file=<path> --target-sha=<sha> --target-branch=main`
   - `--fail-on-error` must fail on any `readyToDeploy=false` payload; do
     not promote a degraded or unknown preflight.
4. Promote the intended SHA to `main` through the repo-approved merge/push path.
   - The orchestrator expects `target_sha` to already exist on `main`.
   - Vercel production deploy is triggered by Git integration on push to `main`; the orchestrator waits for that deployment to be READY.
   - Worker Cloud Run production deploys are not triggered by `push:main`; the orchestrator owns them through `workflow_call`.
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
10. **Prender los flags pendientes de este release.** Revisar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` → `§ Pendientes de acción`: por cada feature `code-complete` cuyo flip estaba gated a este release, `vercel env add <FLAG>=true Production` (+ `gcloud run services update ops-worker --update-env-vars ...` si el flag corre en el worker) + redeploy + smoke del flujo en prod + actualizar la fila del ledger (snapshot por environment). El deploy del código no activa nada por sí solo. Si un flag requería su migración en prod, confirmar que entró por este release antes de prenderlo.

## Gotchas conocidos del release (verificados 2026-07-03 #139; fix de raíz = ISSUE-114)

El flujo de **squash-merge** produce condiciones recurrentes que NO son fallas reales. No las persigas como bugs; aplicá la mitigación:

1. **El PR `develop→main` conflicta ("merge commit cannot be cleanly created").** `main` (squashes de releases previos) no es ancestro de `develop` → conflictos (docs Handoff/changelog/README/registry y a veces código). **Resolución robusta:** en `develop`, `git merge origin/main -X ours --no-edit` (`develop` es autoritativo — contiene todo `main` por construcción: los squash de `main` son DE commits de `develop`). Verificá: `git log origin/main --not develop` vacío **y** `git diff HEAD@{1} HEAD -- src/ scripts/` sin cambios de código. Push `develop` → el PR queda MERGEABLE. Bonus: **avanza la merge-base** y reduce la divergencia del próximo release. **NUNCA** cherry-pick a `main` (duplica SHAs).

2. **Preflight `release_batch_policy=requires_break_glass` falso positivo.** El classifier usa diff *three-dot* (`origin/main...target`, merge-base) → resucita archivos ya desplegados en un release previo (ej. `services/ops-worker/deploy.sh`) como `cloud_release` irreversible. Confirmá el fantasma: `git diff origin/main..target -- <archivo>` = 0 líneas. Post-merge (target = HEAD de `main`) el batch-policy del orchestrator ve diff vacío y pasa. Fix de raíz pendiente = **ISSUE-114** (three-dot → two-dot).

3. **`playwright_smoke` (0 runs) + `ci_green` (aún corriendo) en el squash commit fresco de `main`.** El smoke corre en `develop` (ya verde); el commit de `main` no tiene su propio smoke. Con solo *warnings* (sin errors), el preflight marca `readyToDeploy=false` salvo `bypass_preflight_reason` (≥20 chars → activa `--override-batch-policy --bypass-preflight-warnings`). Es el path canónico. **Mejor práctica:** esperá el CI de `main` verde ANTES de re-dispatchar, para que `ci_green` sea genuino y el bypass cubra solo el `playwright_smoke` inevitable. Documentá el motivo real (no genérico) en `bypass_preflight_reason`.

4. **ops-worker puede quedar con GIT_SHA rezagado tras el release — NO es drift.** `ops-worker-deploy` es *change-gated*: si ningún worker-runtime-path cambió desde `EXPECTED_SHA`, salta el rebuild (`deploy_needed=false`) y el servicio conserva el SHA del último deploy que sí tocó código de worker (código idéntico al target, por diseño — ver el step de worker-drift del workflow). **NO** fuerces redeploy para "alinear el label" salvo que el código del worker haya cambiado. Los otros 3 workers sí redeployan al target.

5. **Vercel Ignored Build Step no aplica a production/main.** Desde 2026-07-08,
   `vercel.json` puede cancelar builds docs-only de `develop`/previews mediante
   `scripts/ci/vercel-ignore-build.mjs`, pero **main/Production queda
   excluido** porque `production-release.yml` espera un deployment Vercel
   `READY` para el `target_sha`. Si un release futuro quiere ahorrar builds
   docs-only en `main`, primero debe modelar explícitamente un estado
   `vercel_skipped` en el release control plane, runbooks y watchdog.

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
   - workflow no-op/skip that left Cloud Run on an older `GIT_SHA`
   - stale manifest
   - Cloud Run deployment failure
4. Prefer a fresh orchestrator attempt for the verified target SHA. If a
   worker workflow skipped due to perceived runtime equivalence but watchdog
   still reports drift, treat it as incomplete closure, not success. Use a
   single worker workflow dispatch only as break-glass when the orchestrator is
   blocked and the user approves the external mutation.
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
6. Document the incident in `Handoff.md`, including whether the suspected skip
   was expected (`no_infra_diff`) or real drift (`worker_revision_drift`).

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
