# TASK-851 — Production Release Orchestrator + Worker SHA Verification (TASK-848 V1.1 follow-up)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform / cloud / ci`
- Blocked by: `TASK-850` (preflight CLI requerido como primer job)
- Branch: `task/TASK-851-production-release-orchestrator-workflow`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementar TASK-848 Slices 3 + 4 unificados (orquestador + worker SHA verification son acoplados: el orquestador invoca workers via `workflow_call` y necesita verificar que la revision Cloud Run desplegada matchea el SHA esperado).

**Parte A — orquestador** `.github/workflows/production-release.yml`: `workflow_dispatch` + inputs `target_sha`, `force_infra_deploy`, `bypass_preflight_reason`. Coordina preflight → manifest INSERT → approval gate → Vercel → workers → integrations → post-release health → manifest UPDATE. Concurrency group `production-release-${{ inputs.target_sha }}` + advisory lock Postgres `pg_try_advisory_lock(hashtext('production-release'))`.

**Parte B — worker SHA verification**: ajustar `services/*/deploy.sh` + workflows worker para aceptar input `expected_sha`, inyectar `GIT_SHA=<expected>` en env de revision Cloud Run, post-deploy verificar via `gcloud run revisions describe` y poll `Ready=True` con timeout 5min. Convertir worker workflows a `workflow_call` reusables para que el orquestador los invoque.

## Why

TASK-848 V1.0 entrega foundation (manifest tables + capabilities + concurrency fix + signals + rollback CLI), pero NO hay workflow orquestador que coordine el release end-to-end. Sin esta task, el release sigue siendo manual: PR develop → main + approval per worker workflow.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (V1)
- TASK-850 preflight CLI como dependencia.

## Scope

### Parte A — Orquestador
- `.github/workflows/production-release.yml`:
  - `workflow_dispatch` con inputs `target_sha` (req), `force_infra_deploy` (default false), `bypass_preflight_reason` (default empty)
  - Concurrency `production-release-${{ inputs.target_sha }}` + `cancel-in-progress: false`
  - Job 1: preflight CLI (TASK-850)
  - Job 2: advisory lock + manifest INSERT (state=preflight)
  - Job 3: approval gate (environment Production)
  - Job 4: Vercel deploy + alias swap
  - Job 5: workers deploy (via workflow_call a workers refactorizados Parte B)
  - Job 6: integrations (HubSpot bridge + Azure Teams gated por TASK-853)
  - Job 7: post-release health checks
  - Job 8: manifest UPDATE (state=released | degraded | aborted) + outbox events
- Helpers TS:
  - `src/lib/release/manifest-store.ts` — recordReleaseStarted, transitionState, completeRelease (atomic con outbox)
  - `src/lib/release/state-machine.ts` — TS enum mirror de DB CHECK + assertValidReleaseStateTransition
  - Tests de paridad TS↔SQL state machine
- Capability check `platform.release.execute` en job 1

### Parte B — Worker SHA verification + workflow_call
- `services/{ops-worker, commercial-cost-worker, ico-batch}/deploy.sh`:
  - Aceptar arg `--expected-sha=<sha>` (default $GITHUB_SHA)
  - Inyectar `GIT_SHA=<expected_sha>` en env de la revision Cloud Run
  - Post-deploy verificar `gcloud run revisions describe <rev> --format="value(spec.containers[0].env[?name=='GIT_SHA'].value)"` matchea
  - Mismatch → exit 1 con mensaje legible
- 3 worker workflows:
  - Agregar input `expected_sha` (workflow_dispatch + workflow_call)
  - Convertir a `workflow_call` reusables (preserve push: y workflow_dispatch: paths)
  - Job step nuevo: poll `Ready=True` con timeout 300s
  - Fail loud si no llega a `True` o emite `False`
- Tests anti-regresion:
  - `tests/release/concurrency-deadlock-regression.test.ts` (mock GH API + assert detector clasifica AMBOS runs como blockers)
  - `tests/release/concurrency-fix-verification.test.ts` (assert post-fix NO se reproduce desde push, dispatch directo, dispatch desde orquestador)

## Acceptance Criteria

- [ ] Orquestador dispatchable con 3 inputs.
- [ ] Advisory lock + partial UNIQUE INDEX previenen 2 releases activos.
- [ ] State machine TS↔SQL parity test verde.
- [ ] Manifest persistido con `attempt_n` incrementado en re-runs del mismo SHA.
- [ ] 7 outbox events `platform.release.* v1` emitidos en transiciones canonicas.
- [ ] `bypass_preflight_reason` requiere capability `platform.release.bypass_preflight` + reason >=20 chars.
- [ ] 3 worker workflows aceptan `expected_sha` + verifican SHA + poll `Ready=True`.
- [ ] Workers invocables via `workflow_call` desde orquestador.
- [ ] Test concurrency-fix-verification verde desde 3 entrypoints.

## Out of Scope

- No automatizar Azure config / Bicep rollback (TASK-853).
- No implementar dashboard UI (TASK-854 que lo absorbe).

## Compaction note

Esta task absorbe el scope original de TASK-852 (Worker SHA Verification) porque el orquestador y la verificacion SHA son arquitecturalmente acoplados: el orquestador invoca workers via `workflow_call` y depende de que estos verifiquen SHA. Separarlos crea una ventana donde el orquestador referencia capability inexistente. Compactacion validada arch-architect: reduces task overhead sin afectar el plan de implementacion futura.
