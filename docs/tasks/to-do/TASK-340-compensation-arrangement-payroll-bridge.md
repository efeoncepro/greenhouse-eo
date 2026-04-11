# TASK-340 — Compensation Arrangement → Payroll Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-338`
- Branch: `task/TASK-340-compensation-arrangement-payroll-bridge`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Definir e implementar el puente explícito entre `CompensationArrangement` y `Payroll`, para que la compensación formalizable se materialice en `compensation_versions` y `payroll_entries` sin convertir a `Payroll` en la raíz semántica de todo acuerdo de compensación.

## Why This Task Exists

Una vez que exista `CompensationArrangement`, el sistema necesita responder con claridad:

- cuándo un arrangement impacta payroll
- cómo se vincula a `member_id`
- qué snapshot sigue perteneciendo a payroll
- cuándo un cambio de arrangement obliga a una nueva `compensation_version`

Si este puente no se formaliza, `Payroll` y el arrangement terminarán coexistiendo con reglas implícitas y drift de datos.

## Goal

- Definir el mapping explícito `CompensationArrangement -> Payroll`
- Preservar `member_id` como ancla operativa de nómina
- Evitar duplicaciones ambiguas entre arrangement vigente y snapshot payroll

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- `Payroll` sigue siendo owner de `compensation_versions`, `payroll_periods` y `payroll_entries`
- el bridge debe preservar `member_id` como llave operativa
- el arrangement no debe eliminar el valor histórico de snapshot de `compensation_versions`

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-026-hris-contract-type-consolidation.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md`
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

- no existe contrato explícito de proyección desde `CompensationArrangement` a `compensation_versions`
- no está definido qué cambios del arrangement disparan nueva versión o recálculo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Mapping rules

- Definir qué campos del arrangement se proyectan a payroll
- Definir precondiciones para materializar sobre `member_id`
- Definir cambios que requieren nueva `compensation_version`

### Slice 2 — Runtime bridge

- Implementar el bridge de escritura/lectura que mantenga sincronía explícita entre arrangement y payroll
- Preservar historial y trazabilidad de qué snapshot deriva de qué arrangement

### Slice 3 — API/service hardening

- Ajustar services/APIs payroll necesarios para reflejar el bridge sin romper surfaces vigentes
- Dejar errores de dominio claros cuando una persona tenga arrangement pero no pueda proyectarse a payroll

## Out of Scope

- cálculo del período completo
- pagos/reembolsos
- CCA
- costos

## Detailed Spec

La task debe dejar explícito:

- cómo se enlaza arrangement con `member_id`
- cuándo el bridge falla vs cuándo degrada
- qué partes de `compensation_versions` siguen siendo snapshot payroll-only

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un bridge explícito entre `CompensationArrangement` y `Payroll`
- [ ] `member_id` sigue siendo la llave operativa de nómina
- [ ] La creación/actualización de arrangement no deja ambigüedad con `compensation_versions`
- [ ] Los servicios payroll exponen trazabilidad suficiente del origen del snapshot

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

- si el arrangement debe ser visible en las surfaces payroll existentes o solo operar primero como source-of-truth backend
