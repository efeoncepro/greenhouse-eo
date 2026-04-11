# TASK-338 — Compensation Arrangement Canonical Contract & Runtime Foundation

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
- Blocked by: `TASK-337`
- Branch: `task/TASK-338-compensation-arrangement-canonical-runtime-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el contrato y runtime mínimo de `CompensationArrangement` como acuerdo de compensación entre una persona y una entidad legal, previo a su materialización en `Payroll`.

## Why This Task Exists

Hoy `greenhouse_payroll.compensation_versions` funciona como snapshot de nómina formal sobre `member_id`, pero no existe un objeto canónico previo para expresar compensación ejecutiva o acuerdos de compensación que todavía no deberían depender de payroll. Sin ese objeto:

- toda compensación parece nacer dentro de `Payroll`
- no se separa bien acuerdo de compensación vs entry de nómina
- se vuelve difícil distinguir compensación ejecutiva de otros carriles como CCA o préstamos

## Goal

- Formalizar `CompensationArrangement` como objeto canónico persona ↔ entidad legal
- Separar acuerdo de compensación de la materialización formal de nómina
- Dejar base runtime y readers para que `Payroll`, `Finance` y `Costs` consuman el mismo contrato

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

Reglas obligatorias:

- `CompensationArrangement` no reemplaza el ownership de `Payroll` sobre `compensation_versions`
- no mezclar compensación ejecutiva con CCA o préstamos
- si el arrangement se proyecta a nómina formal, la faceta operativa sigue siendo `member_id`

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-026-hris-contract-type-consolidation.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-337-person-legal-entity-relationship-runtime-foundation.md`
- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/types/payroll.ts`

### Blocks / Impacts

- `TASK-340`
- `TASK-341`
- `TASK-342`
- futura compensación ejecutiva fuera de payroll

### Files owned

- `migrations/[verificar]`
- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/types/payroll.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `greenhouse_payroll.compensation_versions`
- `greenhouse_payroll.payroll_entries`
- servicios de versionado y lectura en:
  - `src/lib/payroll/compensation-versioning.ts`
  - `src/lib/payroll/postgres-store.ts`
  - `src/lib/payroll/get-compensation.ts`

### Gap

- no existe objeto explícito previo a payroll para acuerdos de compensación persona ↔ entidad legal
- toda compensación queda forzada al lenguaje y lifecycle de nómina

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical arrangement model

- Diseñar e implementar `CompensationArrangement`
- Cubrir al menos:
  - persona
  - entidad legal
  - tipo/modalidad de compensación
  - moneda
  - periodicidad
  - vigencia
  - estado
  - metadata de source of truth

### Slice 2 — Runtime services + readers

- Publicar servicios/readers para consultar el arrangement vigente
- Definir cómo se relaciona con `member_id` cuando la persona además es colaborador interno

### Slice 3 — Compatibility with payroll snapshots

- Definir y documentar cómo convive con `compensation_versions`
- Dejar claro qué campos quedan en arrangement y cuáles siguen viviendo como snapshot payroll-only

## Out of Scope

- cálculo de payroll por período
- pagos de compensación
- CCA
- analytics de costos completos

## Detailed Spec

La task debe dejar respondido:

- cuándo un cambio modifica el `CompensationArrangement`
- cuándo ese cambio exige una nueva `compensation_version`
- qué consumers pueden leer arrangement directamente
- qué consumers deben seguir leyendo `compensation_versions`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un contrato runtime explícito para `CompensationArrangement`
- [ ] La documentación deja claro que `Payroll` materializa, pero no agota, la semántica de compensación
- [ ] La convivencia entre `CompensationArrangement` y `compensation_versions` queda explícita y no ambigua
- [ ] El arrangement puede vincularse a una persona y una entidad legal sin depender de `user`

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- revisión manual de readers y schema contra la spec

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- [ ] Actualizar `project_context.md` con el contrato final de arrangement vs payroll

## Follow-ups

- `TASK-340`
- `TASK-342`

## Open Questions

- si el arrangement debe soportar desde el día 1 múltiples modalidades además de sueldo fijo recurrente
