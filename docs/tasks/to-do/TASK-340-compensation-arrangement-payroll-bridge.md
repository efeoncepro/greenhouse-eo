# TASK-340 — CompensationProfile → Payroll Bridge (frozen until parity)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Frozen — no ejecutar hasta reframe de TASK-338 + TASK-962 + checkpoint arquitectonico`
- Rank: `TBD`
- Domain: `cross-domain` (`hr|payroll|finance|data`)
- Blocked by: `TASK-338 reframe`, `TASK-962`, `architecture checkpoint`
- Branch: `task/TASK-340-compensation-arrangement-payroll-bridge`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Definir, más adelante, el puente explícito entre `CompensationProfile` y `Payroll`. Esta task queda congelada porque cualquier bridge puede cambiar montos, elegibilidad o snapshots payroll si se ejecuta antes de tener compensation parity y arquitectura aceptada.

No ejecutar el diseño anterior `CompensationArrangement -> Payroll` as-is.

## Why This Task Exists

Una vez que exista un `CompensationProfile` read model validado, el sistema necesitará responder con claridad:

- cuándo un profile impacta payroll
- cómo se vincula a `member_id`
- qué snapshot sigue perteneciendo a payroll
- cuándo un cambio de arrangement obliga a una nueva `compensation_version`

Si este puente se formaliza demasiado temprano, se corre el riesgo opuesto: consolidar writes de payroll desde un modelo incompleto, antes de explicar los gaps de `TASK-959`/`TASK-962`.

## Goal

- Definir el mapping explícito `CompensationProfile -> Payroll`
- Preservar `member_id` como ancla operativa de nómina
- Evitar duplicaciones ambiguas entre profile vigente y snapshot payroll
- Exigir before/after payroll gates antes de cualquier cambio de monto o snapshot

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- `Payroll` sigue siendo owner de `compensation_versions`, `payroll_periods` y `payroll_entries`
- el bridge debe preservar `member_id` como llave operativa
- el profile no debe eliminar el valor histórico de snapshot de `compensation_versions`
- no cambiar montos, eligibility, recibos ni payroll entries sin before/after gates documentados
- no iniciar esta task hasta que `TASK-338` sea reescrita y `TASK-962` clasifique coverage/readiness gaps

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-026-hris-contract-type-consolidation.md`
- `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md` (must be reframed first as `CompensationProfile`)
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/types/payroll.ts`

### Blocks / Impacts

- `TASK-341`
- `TASK-342`
- futuras surfaces de compensación ejecutiva

### Files owned

- `migrations/[verificar]`
- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/types/payroll.ts`
- `src/app/api/hr/payroll/compensation/route.ts`
- `src/app/api/hr/payroll/compensation/[versionId]/route.ts`

## Current Repo State

### Already exists

- endpoints y stores de compensación payroll
- versionado histórico vía `greenhouse_payroll.compensation_versions`
- lifecycle de payroll formal bien definido

### Gap

- no existe contrato explícito de proyección desde `CompensationProfile` a `compensation_versions`
- no está definido qué cambios del profile disparan nueva versión o recálculo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Reframe gate (mandatory)

- Confirm `TASK-338` closed with `CompensationProfile` semantics.
- Confirm `TASK-962` classified compensation coverage gaps and no blocker remains unexplained.
- Confirm ADR/checkpoint allows a bridge/write-path.
- Produce before/after payroll verification plan before any implementation.

### Slice 1 — Mapping rules

- Definir qué fields del `CompensationProfile` are allowed to project to payroll
- Definir precondiciones para materializar sobre `member_id`
- Definir cambios que requieren nueva `compensation_version`

### Slice 2 — Runtime bridge

- Implementar el bridge de escritura/lectura que mantenga sincronía explícita entre profile y payroll
- Preservar historial y trazabilidad de qué snapshot deriva de qué profile/evidence source

### Slice 3 — API/service hardening

- Ajustar services/APIs payroll necesarios para reflejar el bridge sin romper surfaces vigentes
- Dejar errores de dominio claros cuando una persona tenga arrangement pero no pueda proyectarse a payroll

## Out of Scope

- cálculo del período completo
- pagos/reembolsos
- ejecutar sin checkpoint arquitectónico
- cambiar montos sin payroll before/after evidence
- CCA
- costos

## Detailed Spec

La task debe dejar explícito:

- cómo se enlaza profile con `member_id`
- cuándo el bridge falla vs cuándo degrada
- qué partes de `compensation_versions` siguen siendo snapshot payroll-only
- qué rollback existe si el bridge genera snapshots incorrectos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un bridge explícito entre `CompensationProfile` y `Payroll`
- [ ] `member_id` sigue siendo la llave operativa de nómina
- [ ] La creación/actualización de profile no deja ambigüedad con `compensation_versions`
- [ ] Los servicios payroll exponen trazabilidad suficiente del origen del snapshot
- [ ] Payroll before/after gates prueban que no hay deltas no intencionales de monto/elegibilidad

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- validación manual de create/update de compensación en `/hr/payroll`

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- [ ] Registrar en `project_context.md` el contrato final de bridge

## Follow-ups

- `TASK-341`
- `TASK-342`

## Open Questions

- si el bridge debe existir como write path o solo como projection/read correlation en una primera entrega
