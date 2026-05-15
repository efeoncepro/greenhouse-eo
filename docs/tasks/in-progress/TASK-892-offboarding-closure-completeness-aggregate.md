# TASK-892 — Offboarding Closure Completeness Aggregate

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `In-flight 2026-05-15`
- Rank: `TBD`
- Domain: `hr|identity|payroll|reliability`
- Blocked by: `none` (TASK-890 + TASK-891 V1.0 SHIPPED 2026-05-15 — proveen las capas que esta task sintetiza)
- Branch: `develop` (operador autorizo directo en develop por scope server-side extension + UI consumption + signal nuevo)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

El work-queue de `/hr/offboarding` muestra `primaryAction` desde una sola dimension (`closureLane`), ignorando que el cierre real de una salida involucra 4 capas ortogonales. Sintoma observable post-TASK-891: caso de Maria Camila Hoyos con `status='executed'` aparece con boton "Cerrar con proveedor" clickable que abriria un dialog que el state machine va a rechazar. Causa raiz: NO existe agregado `closureCompleteness` que sintetice case lifecycle + member runtime + Person 360 relationships + payroll scope. Esta task introduce ese agregado canonico server-side, lo wire-ea como SSOT del work-queue, agrega reliability signal `hr.offboarding.completeness_partial` (steady=0), y refactor UI para consumir el shape sintetizado.

## Why This Task Exists

Bug class detectado live 2026-05-15 post TASK-891 V1.0 SHIPPED durante validacion operativa por el usuario.

Datos verificados del caso `EO-OFF-2026-0609A520` (Maria Camila Hoyos):

| Capa | Estado |
|---|---|
| Offboarding case lifecycle | `status='executed'` ✅ (terminal) |
| Member runtime | `contract_type='contractor', payroll_via='deel', pay_regime='international'` ✅ alineado con lane external_payroll |
| Person 360 relationship | `relationship_type='employee', status='active', effective_to=NULL` ❌ DRIFT (TASK-890 Slice 6 signal lo detecta) |
| Payroll scope | excluida por gate legacy `executed + last_working_day < periodStart` ✅ |

3 de 4 capas estan OK. La que falta es Layer 3 (Person 360 reconciliation). PERO la UI muestra `primaryAction='external_provider_close'` (Layer 1) — accion obsoleta de una capa ya terminal.

Si el operador hace click, el dialog POSTearia a `/transition` con `status='approved'` y el state machine rechaza `executed → approved`. UX engañoso + ruido en logs + operador desconfiando del sistema.

La causa raiz NO es bug local del primaryAction — es ausencia de un agregado canonico `closureCompleteness` que sintetice las 4 capas y derive el siguiente step canonico. Validado por arch-architect Greenhouse overlay.

## Goal

- Modelar `OffboardingClosureCompleteness` como agregado derivado server-side en el work-queue projection.
- `closureState` enum cerrado 4 valores: `pending | partial | complete | blocked`.
- `pendingSteps[]` ordenado por prioridad canonica con capability check + `actionable: boolean` per step.
- `primaryAction` ahora se deriva del `pendingSteps[0]` — NO mas hardcoded por lane.
- Reliability signal nuevo `hr.offboarding.completeness_partial` detecta casos terminal con `pendingSteps.length > 0` (steady=0).
- UI HrOffboardingView consume `closureCompleteness` + esconde steps no-actionable o los muestra como hint informativo.
- Hard rules canonical en CLAUDE.md anti-regresion.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` (work-queue projection contract)
- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` (TASK-890 — Layer 4 resolver)
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md` (TASK-891 — Layer 3 write path)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `closureCompleteness` se computa server-side dentro del work-queue derivation (SSOT). NO cliente.
- `pendingSteps` orden canonico via `STEP_PRIORITY` constant — si emerge step nuevo, agregarlo con position explicita.
- Cada step declara `capability` + `actionable: boolean`. UI esconde steps que la sesion del operador no puede ejecutar.
- `primaryAction` NUNCA hardcoded por lane. Siempre via `pendingSteps[0]`.
- V1.0 = solo offboarding. Generalizacion cross-flow (onboarding, hiring, activation) = V1.1+ si emerge 2do callsite real.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/complete/TASK-867-offboarding-work-queue-projection-ux-modernization.md` (predecesor — provee la projection que esta task extiende)
- `docs/tasks/complete/TASK-890-workforce-exit-payroll-eligibility-window.md` (Layer 4 resolver)
- `docs/tasks/complete/TASK-891-person-relationship-drift-reconciliation-write-path.md` (Layer 3 write path)
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- TASK-867 (work-queue projection foundation) — extends, no modify.
- TASK-890 V1.0 (TASK-890 resolver canonico `resolveExitEligibilityForMembers`) — Layer 4 consumer.
- TASK-891 V1.0 (signal `identity.relationship.member_contract_drift`) — Layer 3 detector.
- `src/lib/workforce/offboarding/work-queue/derivation.ts` (target del extension).
- `src/lib/reliability/queries/` (signal nuevo).

### Blocks / Impacts

- `/hr/offboarding` UI: refactor de `primaryAction` rendering.
- `/admin/operations` Identity & Access subsystem: nuevo signal `hr.offboarding.completeness_partial`.
- Maria Camila Hoyos: post-deploy, su caso muestra correctly `closureState='partial'` con `pendingSteps[0] = reconcile_drift` linkeando a TASK-891 dialog.

### Files owned

- `src/lib/workforce/offboarding/work-queue/derivation.ts` (extend)
- `src/lib/workforce/offboarding/work-queue/closure-completeness.ts` (nuevo, pure logic + STEP_PRIORITY)
- `src/lib/workforce/offboarding/work-queue/closure-completeness.test.ts` (nuevo)
- `src/lib/workforce/offboarding/work-queue/query.ts` (extend — fetch person_legal_entity_relationships + payroll scope)
- `src/lib/workforce/offboarding/work-queue/types.ts` (extend)
- `src/lib/reliability/queries/offboarding-completeness-partial.ts` (nuevo)
- `src/lib/reliability/queries/offboarding-completeness-partial.test.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up)
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx` (UI refactor primaryAction)
- `src/lib/copy/workforce.ts` (microcopy es-CL para pending steps + closureState badges)
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` (Delta)
- `docs/documentation/hr/offboarding.md` (Delta funcional)
- `docs/manual-de-uso/hr/offboarding.md` (Delta manual)
- `CLAUDE.md` (sección canonica nueva)

## Current Repo State

### Already exists

- Work-queue projection `OffboardingWorkQueueItem` con `primaryAction: OffboardingWorkQueueActionDescriptor` (TASK-867).
- `resolveOffboardingClosureLane` (TASK-867) deriva `closureLane` desde rule_lane + payroll_via.
- Signal `identity.relationship.member_contract_drift` (TASK-890 Slice 6 + TASK-891 Slice 5 auto-escalation).
- Helper `resolveExitEligibilityForMembers` + `isMemberInPayrollScope` (TASK-890 Slice 2) para Layer 4.
- Capability `person.legal_entity_relationships.reconcile_drift` + UI form `/admin/identity/drift-reconciliation` (TASK-891 V1.0 SHIPPED).
- Subsystem `Identity & Access` rollup en reliability registry.

### Gap

- NO existe agregado `closureCompleteness` que sintetice las 4 capas.
- NO existe `STEP_PRIORITY` constant — orden de derivacion de pendingSteps no esta canonico.
- `primaryAction` hardcoded por lane en derivation.ts — bug class actual (Maria's case).
- NO existe signal de "closure incompleteness" — drift Layer 3 se detecta pero la post-condicion de "case terminal con steps pendientes" no.
- UI render hardcoded `actionDescriptor.code` mapping a hrefs — fragil.

## Scope

### Slice 1 — Closure completeness aggregate + derivation extension

- Crear `src/lib/workforce/offboarding/work-queue/closure-completeness.ts` con:
  - Type `OffboardingClosureCompleteness`
  - `STEP_PRIORITY` constant array — orden canonico de pendingSteps
  - `computeClosureCompleteness(input)` pure function — recibe facts de las 4 capas, devuelve aggregate
- Extender `OffboardingWorkQueueItem.closureCompleteness` en types.ts
- Extender `query.ts` para fetch person_legal_entity_relationships (drift detection) + member runtime
- Extender `derivation.ts` para invocar `computeClosureCompleteness` + derivar `primaryAction` desde `pendingSteps[0]`
- Tests pure logic con 8+ casos (Maria fixture, draft external, executed internal, blocked, etc.)

### Slice 2 — Reliability signal `hr.offboarding.completeness_partial`

- Crear `src/lib/reliability/queries/offboarding-completeness-partial.ts`:
  - Query cuenta casos `status IN ('executed','cancelled')` AND con drift Layer 3 detectado (proxy: relación legal employee activa + member contractor)
  - Severity `warning` si count > 0, `ok` si count = 0, `unknown` si query falla
  - Steady=0
- Tests del reader (4+ casos)
- Wire-up en `get-reliability-overview.ts` bajo subsystem `Identity & Access`

### Slice 3 — UI consumption en HrOffboardingView

- Refactor `hrefForAction` para usar `closureCompleteness.pendingSteps[0]` cuando presente
- Render `closureState` badge (Cerrado completamente / Cierre parcial / En curso / Bloqueado)
- Render `pendingSteps` como lista informativa cuando `actionable=false`
- Microcopy es-CL en `src/lib/copy/workforce.ts` (nuevo namespace o extend existente)
- Cancel button-link a TASK-891 dialog cuando step es `reconcile_drift`

### Slice 4 — Docs + manuales + CLAUDE.md

- Update `GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` con Delta 2026-05-15 describiendo closure completeness
- Update `docs/documentation/hr/offboarding.md` con la lectura operativa
- Update `docs/manual-de-uso/hr/offboarding.md` con guia paso-a-paso post-executed
- Agregar seccion canonica "Offboarding Closure Completeness invariants (TASK-892)" en CLAUDE.md con 7 hard rules

## Out of Scope

- **Generalizar pattern cross-flow** (onboarding/hiring/activation). V1.0 solo offboarding. Si onboarding emerge necesidad, extract pattern compartido en V1.1.
- **Reabrir caso executed**. NO V1.0. Casos en estado terminal son terminal. La reconciliacion drift (Layer 3) NO requiere reabrir el case.
- **Auto-resolver drift desde el work-queue UI**. UI solo navega a TASK-891 dialog (operator-initiated). NUNCA auto-mutate.
- **Mutar Maria operativamente como parte de esta task**. Maria es el caso fuente disparador. Recovery viene via dialog UI post-deploy.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1** MUST ship antes de Slice 3 (UI consume el shape Slice 1 expose).
- **Slice 2** puede correr paralelo a Slice 3 (signal lectura es independiente del rendering).
- **Slice 4** corre al cierre.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Closure completeness misderiva → operador no ve action canonico | UI / HR | medium | Tests pure logic ≥8 cases con fixtures canonicos + Maria fixture explicito | `hr.offboarding.completeness_partial` cuenta drift sostenido |
| Layer 3 drift detection falla (query timeout) → closureState='unknown' | identity | low | Defensive try/catch + `captureWithDomain('identity', err, ...)` + closureState='blocked' graceful | Sentry domain=identity |
| primaryAction breaking change rompe consumer downstream | hr | low | OffboardingWorkQueueItem.primaryAction sigue siendo OffboardingWorkQueueActionDescriptor (mismo shape). Solo cambia derivation logic | Tests anti-regresion |
| Render UI confunde operador con too many pendingSteps | UI | low | V1.0 muestra solo primaryAction (pendingSteps[0]) + counter "X pasos pendientes" | Manual UX review |

### Feature flags / cutover

Sin flag. Cambio es aditivo (closureCompleteness es campo nuevo opcional) + refactor primaryAction es deterministico desde mismas inputs. Backward compatible.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR; UI sigue funcionando con primaryAction legacy hasta que UI también consuma | <15min | si |
| Slice 2 | Revert reader + wire-up; subsystem queda sin la nueva signal | <10min | si |
| Slice 3 | Revert UI; queda funcional con legacy actionDescriptor | <15min | si |
| Slice 4 | Revert docs | <5min | si |

### Production verification sequence

1. Deploy a staging.
2. Verify caso Maria muestra `closureState='partial'` + `pendingSteps[0]={code:'reconcile_drift'}`.
3. Operador HR (no EFEONCE_ADMIN) ve hint informativo "Falta reconciliar drift legal — contactar admin". Sin CTA broken.
4. Operador EFEONCE_ADMIN ve CTA "Reconciliar relacion legal" linkeando a /admin/identity/drift-reconciliation.
5. Signal `hr.offboarding.completeness_partial` count >= 1 (Maria).
6. Post-reconciliation Maria (TASK-891 dialog), refresh /hr/offboarding → caso Maria muestra `closureState='complete'` + `pendingSteps=[]`. Signal count = 0.

### Out-of-band coordination required

- N/A. Toda implementacion vive en repo.

## Acceptance Criteria

- [ ] Type `OffboardingClosureCompleteness` definido con 4 capas + closureState enum cerrado + pendingSteps[].
- [ ] `computeClosureCompleteness` pure function tested con ≥8 cases (Maria fixture + draft external + executed internal + blocked + complete).
- [ ] `STEP_PRIORITY` constant canonical declarado.
- [ ] `primaryAction` derivation NO referencia closureLane hardcoded — siempre via pendingSteps[0].
- [ ] Reliability signal `hr.offboarding.completeness_partial` wired + steady=0 + tests ≥4 cases.
- [ ] HrOffboardingView consume closureCompleteness — caso `executed` con drift muestra `Reconciliar relacion legal` (no `Cerrar con proveedor`).
- [ ] Hints informativos para operadores sin capability (UX honesta).
- [ ] CLAUDE.md sección canonica con 7 hard rules.
- [ ] Maria's case: post-deploy, badge `Cierre parcial` + CTA `Reconciliar relacion legal` (para EFEONCE_ADMIN).
- [ ] `pnpm test` full suite verde. `pnpm build` verde. `pnpm lint` 0 errors.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm pg:doctor`
- Manual staging verification (steps 1-6 production verification sequence)

## Closing Protocol

- [ ] Lifecycle `complete` + mover a `complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` actualizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Maria's case verified post-deploy + drift resolved post-TASK-891 dialog execution

## Follow-ups

- V1.1: generalizar pattern a onboarding/hiring/activation work-queues si emerge 2do callsite real.
- V1.1: si emerge necesidad real, agregar `recommendedActions[]` para operadores sin capabilities (informational, paths to escalation).

## Open Questions

- ¿`computeClosureCompleteness` debe cachear por memberId dentro de la projection request o re-compute per item? **Resolucion**: re-compute per item V1.0 (work-queue lista <50 items tipico; pure function <1ms). Cache si emerge cost.
