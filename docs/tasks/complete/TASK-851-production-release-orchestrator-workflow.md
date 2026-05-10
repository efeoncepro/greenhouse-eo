# TASK-851 — Production Release Orchestrator + Worker SHA Verification (TASK-848 V1.1 follow-up)

## Closure 2026-05-10

**SHIPPED en `develop`** con 5 commits incrementales sin PR ceremony, mantenida en develop per instrucción del usuario.

**Slices entregados**:

- `9050bbcb` Slice 0 — CLI orchestrator helpers + state-machine live parity test
- `0d3e1d12` Slice 1 — Worker deploy.sh accept EXPECTED_SHA + verify post-deploy (4 services)
- `880c8fe7` Slice 2 — Worker workflows × 4 con workflow_call + Ready=True poll
- `e14865c1` Slice 3 — production-release.yml orquestador (8 jobs)
- (este commit) Slice 4 — Tests anti-regresion + docs canónicas + cierre

**Tests**: 10/10 verdes anti-regresion concurrency-fix-verification + state-machine parity TS↔SQL verificada manual via shell.

**Decisiones foundational arch-architect 4-pillar validadas**:

1. Compactación TASK-851 + TASK-852 (orquestador y SHA verification arquitecturalmente acoplados) — ✓
2. CLI scripts TS para invocar helpers desde workflow YAML (mismo patron TASK-849) — ✓
3. Solo partial UNIQUE INDEX, NO advisory lock aplicativo — ✓
4. Vercel deploy automático (no triggered desde orquestador) — ✓
5. workflow_call para los 4 workers con uniformidad — ✓

**Acceptance criteria**:

- [x] Orquestador dispatchable con 3 inputs (target_sha, force_infra_deploy, bypass_preflight_reason).
- [x] Advisory lock + partial UNIQUE INDEX previenen 2 releases activos. **Nota**: solo partial UNIQUE INDEX (decisión foundational #3); advisory lock NO necesario.
- [x] State machine TS↔SQL parity test verde (verificada via shell, test live skipea sin DB).
- [x] Manifest persistido con `attempt_n` incrementado en re-runs del mismo SHA (helper TASK-848 V1.0 ya lo hace).
- [x] 7 outbox events `platform.release.* v1` emitidos en transiciones canonicas (helper TASK-848 V1.0).
- [x] `bypass_preflight_reason` requiere capability `platform.release.bypass_preflight` + reason >=20 chars (enforced en preflight job script).
- [x] 3 worker workflows aceptan `expected_sha` + verifican SHA + poll `Ready=True`. **Extendido a 4** (HubSpot incluido).
- [x] Workers invocables via `workflow_call` desde orquestador.
- [x] Test concurrency-fix-verification verde (10/10 verdes desde 3 entrypoints).

**Capabilities**: 0 nuevas. Reusa `platform.release.execute` + `platform.release.preflight.execute` + `platform.release.bypass_preflight`.

**Outbox events**: 0 nuevos. Reusa los 7 existentes via manifest-store helpers.

**Reliability signals**: 0 nuevos. Reusa los 3 existentes (stale_approval, pending_without_jobs, worker_revision_drift) que el watchdog monitora background.

**Hard Rules** canonizadas en CLAUDE.md sección "Production Release Orchestrator invariants (TASK-851)".

**Docs canonizadas**: CLAUDE.md + AGENTS.md secciones nuevas, DECISIONS_INDEX entry, GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md Delta TASK-851 SHIPPED, manual operador, doc funcional.

**Pendiente fuera de scope** (TASK-853 + TASK-854):

- TASK-853 Azure Infra Release Gating: extender orchestrator con job condicional `deploy-azure-bicep`.
- TASK-854 Release Observability Completion: 2 signals nuevos + dashboard UI consume manifests históricos.

---

## Status

- Lifecycle: `complete`
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
