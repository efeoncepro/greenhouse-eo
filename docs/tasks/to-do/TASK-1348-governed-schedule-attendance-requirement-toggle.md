# TASK-1348 — Toggle gobernado del requisito de asistencia/jornada (`daily_required`) + affordance en la ficha

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-1348-governed-schedule-attendance-requirement-toggle`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy `greenhouse_core.members.daily_required` (el "requiere asistencia diaria" / jornada, que gobierna si la nómina exige señal de asistencia) **no tiene forma gobernada de editarse desde el portal**: no hay control en la ficha ni endpoint dedicado; solo se puede mover creando una compensación nueva o por SQL directo. Esta task entrega el **primitive gobernado** (command + API + capability + audit) para setear/limpiar ese requisito respetando `SCHEDULE_DEFAULTS.overridable`, de modo que exista un camino programático (Full API Parity) que luego consuma la UI de la ficha (y Nexa).

## Why This Task Exists

Durante ISSUE-115/TASK-1347 se resolvió el bloqueo de nómina por `daily_required` incoherente con el régimen, pero la mitigación operativa (bajar el flag de Maria Fernanda `international_internal`) tuvo que aplicarse por **SQL directo** porque no existe ninguna superficie gobernada para editarlo: la UI no lo expone (`grep scheduleRequired src/views src/components` = 0 controles) y la única API que lo toca (`/api/hr/payroll/compensation`) lo hace acoplado a crear una compensación completa. Eso es una brecha de Full API Parity: un campo que afecta el cálculo de nómina no debería requerir SQL manual ni un write acoplado. Se necesita el primitive canónico (un command, muchos consumers), que además honre la política `SCHEDULE_DEFAULTS.overridable` (los regímenes dependientes Chile `indefinido`/`plazo_fijo` son `overridable: false` → el toggle debe quedar bloqueado/locked para ellos).

## Goal

- Existe un command/endpoint gobernado, least-privilege y auditado para setear `daily_required` de un member sin crear una compensación nueva ni tocar SQL.
- El command **respeta `SCHEDULE_DEFAULTS.overridable`**: rechaza (error canónico) cambiar el flag en régimen dependiente Chile (locked); permite hacerlo en régimenes `overridable` (`honorarios`/`contractor`/`eor`/`international_internal`).
- Queda el camino listo para que la ficha del colaborador (y Nexa) expongan el control — el consumer UI se agenda como follow-up `ui-ux` con su diseño (wireframe/flow) propio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (primitive gobernado a nivel capability)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability + grant + coverage)
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Invocar la skill MANDATORIA `greenhouse-payroll-auditor` al tocar payroll/workforce.
- El régimen es autoritativo (TASK-1347): el toggle solo aplica donde `SCHEDULE_DEFAULTS.overridable === true`. Reusar `resolveScheduleRequired`/`SCHEDULE_DEFAULTS`/`isChileDependentContract` de `src/types/hr-contracts.ts` — no reimplementar la política.
- Capability nueva ⇒ grant a ≥1 rol real (`role-codes.ts`) + coverage test en el MISMO PR.
- Write auditado (audit/outbox cuando aplique), idempotente, error canónico es-CL, sin PII en logs.

## Normative Docs

- `docs/tasks/complete/TASK-1347-payroll-attendance-requirement-regime-authoritative.md` — contexto del predicado régimen-scoped y la política `overridable`.
- `docs/issues/resolved/ISSUE-115-payroll-blocked-daily-required-incoherent-with-regime.md` — incidente que motivó esta brecha.

## Dependencies & Impact

### Depends on

- `greenhouse_core.members.daily_required` (columna existente).
- `resolveScheduleRequired` + `SCHEDULE_DEFAULTS` + `isChileDependentContract` (`src/types/hr-contracts.ts`, TASK-1347).
- `resolveMemberContractForCompensation` (`src/lib/payroll/postgres-store.ts`) — write path existente que ya persiste `daily_required`.

### Blocks / Impacts

- Habilita el follow-up `ui-ux` (control en la ficha) y la operabilidad por Nexa/MCP.
- Consumidores del flag: `requiresPayrollAttendanceSignal` (payroll readiness/calculate) — sin cambio de semántica, solo se agrega una vía de edición.

### Files owned

- `src/lib/payroll/**` o `src/lib/workforce/**` — nuevo command `setMemberScheduleRequirement` (ubicación a decidir en Discovery).
- `src/app/api/hr/**` — endpoint dedicado (`[verificar]` ruta exacta).
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` — capability + grant.
- migración seed de capability si aplica.

## Current Repo State

### Already exists

- `daily_required` en `greenhouse_core.members`; se persiste vía `resolveMemberContractForCompensation` (`postgres-store.ts:733`) al crear compensación.
- `SCHEDULE_DEFAULTS` con `overridable` por contractType (`hr-contracts.ts:57`) + `resolveScheduleRequired` (`hr-contracts.ts:163`).
- API `/api/hr/payroll/compensation` acepta `scheduleRequired` pero acoplado a crear versión de compensación.

### Gap

- No hay control en la UI (`grep scheduleRequired src/views src/components` = 0).
- No hay endpoint/command dedicado para editar `daily_required` sin crear compensación.
- No hay capability específica ni audit para ese cambio.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_core.members.daily_required` + política `SCHEDULE_DEFAULTS`
- Consumidores afectados: `payroll readiness/calculate (lectura), futura UI ficha, Nexa/MCP`
- Runtime target: `staging` → `production`

### Contract surface

- Contrato existente a respetar: `resolveScheduleRequired`/`SCHEDULE_DEFAULTS` (política overridable), `requiresPayrollAttendanceSignal` (consumer).
- Contrato nuevo o modificado: command `setMemberScheduleRequirement(memberId, required, reason?)` + endpoint gobernado.
- Backward compatibility: `compatible` (aditivo; nueva vía de edición).
- Full API parity: primitive server-side reusable; la UI y Nexa son consumers, no reimplementan la regla.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.members` (write de un campo).
- Invariantes que no se pueden romper:
  - No permitir editar el flag donde `SCHEDULE_DEFAULTS.overridable === false` (dependiente Chile locked).
  - No aplicar deducciones/mecánicas Chile a régimenes internacionales (invariante existente).
- Tenant/space boundary: sobre members activos; sin cambio de boundary.
- Idempotency/concurrency: idempotente (`SET ... WHERE daily_required IS DISTINCT FROM $target`).
- Audit/outbox/history: registrar el cambio (audit log / outbox event) con actor + reason.

### Migration, backfill and rollout

- Migration posture: `seed` (solo si la capability requiere fila en `capabilities_registry`).
- Default state: `enabled with rationale` (aditivo; gateado por capability).
- Backfill plan: `N/A`.
- Rollback path: revert PR + redeploy; deshabilitar capability.
- External coordination: `N/A — repo-only change`.

### Security and access

- Auth/access gate: capability nueva least-privilege (rol HR/People Ops), NO admin-coarse.
- Sensitive data posture: `payroll` — sin PII en logs; el reason no debe loggear datos sensibles crudos.
- Error contract: `canonicalErrorResponse` (código nuevo, ej. `schedule_requirement_locked_for_regime`).
- Abuse/rate-limit posture: `N/A` — mutación gobernada interna.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding`, `pnpm exec eslint`, `pnpm typecheck`.
- DB/runtime checks: setear flag vía endpoint en staging → `getPayrollPeriodReadiness` refleja el cambio; verificar audit log.
- Integration checks: `N/A`.
- Reliability signals/logs: `N/A` (opcional: audit event).
- Production verification sequence: ver §Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariante `overridable` explícito y testeado (locked para dependiente Chile).
- [ ] Capability + grant + coverage en el mismo PR.
- [ ] Evidencia runtime/DB del write gobernado + audit.
- [ ] Error canónico es-CL sin leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Command gobernado + política `overridable`

- Command `setMemberScheduleRequirement({ memberId, required, actor, reason? })` que hace un write idempotente de `members.daily_required`, rechazando el cambio cuando `SCHEDULE_DEFAULTS[contractType].overridable === false` (error canónico `schedule_requirement_locked_for_regime`).
- Reusar `resolveScheduleRequired`/`isChileDependentContract`; NO reimplementar la política.
- Audit del cambio (actor + before/after + reason).

### Slice 2 — Endpoint + capability

- Endpoint gobernado (ej. `PATCH /api/hr/people/[memberId]/schedule-requirement` `[verificar]`) que invoca el command con auth + capability least-privilege.
- Capability nueva + grant a ≥1 rol real + coverage test.

### Slice 3 — Tests

- Unit del command: overridable true (ok) / false (locked); idempotencia; audit emitido.
- Contract test del endpoint (auth + capability + error canónico).

## Out of Scope

- **El control visible en la ficha** (toggle en "Editar ingreso" / Datos laborales): se agenda como **follow-up `ui-ux` dependiente** de esta foundation, con su wireframe/flow y diseño product-design propios. Esta task entrega solo el primitive gobernado.
- Cambiar la semántica de `requiresPayrollAttendanceSignal` (ya resuelta en TASK-1347).
- Poblar `attendance_daily` (riesgo latente, TASK-005).

## Detailed Spec

Contexto en TASK-1347 + ISSUE-115. El principio: un campo que afecta el cálculo de nómina debe tener un camino programático gobernado (Full API Parity), no requerir SQL manual ni un write acoplado a crear compensación. La política de qué contract types pueden editar el flag ya existe (`SCHEDULE_DEFAULTS.overridable`) — esta task la envuelve en un command + endpoint + capability + audit.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (command + política) → Slice 2 (endpoint + capability) → Slice 3 (tests). El endpoint no debe shippear sin la capability + grant en el mismo PR.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Permitir editar el flag en régimen dependiente Chile (locked) | payroll | low | guard por `SCHEDULE_DEFAULTS.overridable` + test | error inesperado / test rojo |
| Capability sin grant (build gate) | entitlements | low | grant + coverage test en el mismo PR | `capability-grant-coverage.test` rojo |
| Write no auditado | payroll governance | low | audit event con actor+reason obligatorio | ausencia de audit en el flujo |

### Feature flags / cutover

Sin flag — aditivo, gateado por capability. Revert = revert PR + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <10 min | si |
| Slice 2 | revert PR + deshabilitar capability | <10 min | si |
| Slice 3 | revert PR | <10 min | si |

### Production verification sequence

1. Local: tests verdes + typecheck.
2. Staging: setear flag vía endpoint con persona de menor privilegio → readiness refleja el cambio + audit registrado.
3. Producción: repetir con un member `overridable` real; verificar locked en un dependiente Chile.

### Out-of-band coordination required

`N/A — repo-only change`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Command gobernado idempotente edita `members.daily_required` sin crear compensación.
- [ ] El command rechaza el cambio en régimen dependiente Chile (`overridable === false`) con error canónico.
- [ ] Endpoint gobernado con auth + capability least-privilege; capability + grant + coverage en el mismo PR.
- [ ] Cambio auditado (actor + before/after + reason).
- [ ] Tests: overridable ok/locked + idempotencia + contract del endpoint.
- [ ] Follow-up `ui-ux` (control en la ficha) creado/agendado.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (foco: `src/lib/payroll`, entitlements coverage)
- `pnpm staging:request PATCH /api/hr/people/<memberId>/schedule-requirement '{"required":false}'` (verificar 200 + readiness)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real.
- [ ] archivo en la carpeta correcta.
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados.
- [ ] `Handoff.md` + `changelog.md` actualizados.
- [ ] chequeo de impacto cruzado.
- [ ] follow-up `ui-ux` del control en la ficha creado.

## Follow-ups

- **Consumer `ui-ux`**: control (toggle) del requisito de asistencia en la ficha del colaborador ("Editar ingreso" / Datos laborales), locked para dependiente Chile, con wireframe/flow y diseño product-design. Dependiente de esta foundation.
- Operabilidad Nexa/MCP del mismo command (consecuencia de Full API Parity).

## Open Questions

- Ubicación canónica del command (`src/lib/payroll/**` vs `src/lib/workforce/**`) y ruta exacta del endpoint — resolver en Discovery.
- ¿El cambio debe crear una nueva versión de compensación (histórico) o basta con audit del campo en `members`? Preferencia inicial: audit del campo, sin nueva compensación.
