# TASK-732 — Payroll ICO Safety Gate + KPI Provenance for Liquidación y Reliquidación

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-009`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-732-payroll-ico-safety-gate-and-kpi-provenance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurece el puente `ICO -> Payroll` para que una nómina oficial o una reliquidación no puedan avanzar silenciosamente con KPI faltantes, fallback ambiguo o evidencia insuficiente. Además persiste provenance durable del KPI utilizado en la entry payroll y en los artefactos de exportación/admin.

## Why This Task Exists

La auditoría de ICO mostró que hoy `missing_kpi` puede degradar a warning y terminar en bonos `0`. La revalidación contra Cloud SQL confirmó que ya existe reliquidación real en producción/dev y que `payroll_entries` solo persiste `kpi_data_source`, sin `source_mode`, `confidence` ni `suppression_reason`. Para un flujo que puede impactar bonificaciones y reliquidaciones, ese contrato es insuficiente.

## Goal

- bloquear cálculo/export oficial cuando falten KPI críticos para miembros con bono KPI
- persistir provenance completa del KPI usado por entry payroll
- exponer esa provenance en admin, export y version history de reliquidación

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- un cálculo oficial no puede degradar a bonus `0` por ausencia de KPI sin bloqueo explícito u override auditable
- la provenance persistida debe distinguir `materialized`, `live`, `manual` y cualquier suppression/fallback relevante

## Normative Docs

- `docs/audits/ico/ICO_ENGINE_AUDIT_2026-04-30.md`
- `docs/tasks/complete/TASK-410-payroll-period-reopen-foundation-versioning.md`
- `docs/tasks/to-do/TASK-414-payroll-reopen-policy-engine-hardening.md`

## Dependencies & Impact

### Depends on

- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/schema.ts`

### Blocks / Impacts

- `TASK-730`
- `TASK-731`
- payroll export/admin screens
- reliquidación audit trail

### Files owned

- `src/lib/payroll/**`
- `src/views/greenhouse/payroll/**`
- `migrations/**`
- `docs/architecture/**`

## Current Repo State

### Already exists

- `fetchKpisForPeriod()` ya conoce `sourceMode`, `confidence` y suppression internamente
- `payroll_period_reopen_audit` y versionado v2 ya existen
- Cloud SQL confirma al menos `1` reopen audit y `4` entries con `version > 1`

### Gap

- payroll entries solo guardan `kpi_data_source`
- `missing_kpi` puede seguir como warning en carriles críticos
- export/admin no muestran evidencia suficiente para defender un cálculo o una reliquidación

## Scope

### Slice 1 — Schema de provenance

- agregar columnas como `kpi_source_mode`, `kpi_confidence`, `kpi_suppression_reason`, `kpi_snapshot_month`, `kpi_evidence_json`
- backfill compatible para entries existentes

### Slice 2 — Safety gate oficial

- endurecer readiness y export para bloquear miembros con bono KPI cuando falten datos críticos
- definir carril explícito de override auditable si negocio decide permitir excepción

### Slice 3 — Surfacing y reliquidación

- mostrar provenance en version history, admin audit y export metadata
- dejar claro si v1/v2 usó snapshot materializado, fallback live o intervención manual

## Out of Scope

- rediseñar por completo el módulo payroll
- rehacer la política de reopen completa de `TASK-414`

## Acceptance Criteria

- [ ] una nómina oficial con KPI crítico faltante no puede avanzar sin bloqueo u override auditable
- [ ] `payroll_entries` persiste provenance más rica que `kpi_data_source`
- [ ] admin y reliquidación pueden explicar con evidencia de dónde salió el KPI usado

## Verification

- `pnpm lint`
- `pnpm test`
- `pnpm pg:doctor`
- prueba manual de calculate/export/reopen en período controlado

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si aplica
- [ ] `changelog.md` actualizado si cambia comportamiento visible
- [ ] chequeo de impacto cruzado sobre `TASK-414`, `TASK-730`, `TASK-731`

## Follow-ups

- políticas de override y compliance de `TASK-414`

## Delta 2026-04-30

Task creada a partir de auditoría ICO + verificación Cloud SQL. La evidencia actual confirma que reliquidación ya existe y que el schema vivo todavía no conserva provenance KPI suficiente para nómina oficial.
