# TASK-733 — ICO Locked Snapshot Immutability + Reliquidación Reproducibility

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-009`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-733-ico-locked-snapshot-immutability`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el snapshot `locked` de ICO en un freeze verdadero e introduce un contrato explícito de reproducibilidad histórica para payroll y reliquidación. Un período cerrado no debe reescribirse por reconcile/backfill normal.

## Why This Task Exists

La auditoría detectó que `freezeDeliveryTaskMonthlySnapshot()` todavía puede re-materializar con `force: true`, y que reconcile histórico puede volver a tocar meses cerrados. Eso invalida la base histórica sobre la que luego payroll y reliquidación deberían apoyarse.

## Goal

- freeze realmente inmutable para períodos cerrados
- carril separado para correcciones históricas extraordinarias
- referencia clara desde payroll/reliquidación a la generación de snapshot usada

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `locked` no puede equivaler a “editable con otro force”
- cualquier corrección histórica debe dejar trail, reason y boundary distintos del freeze canónico

## Dependencies & Impact

### Depends on

- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/historical-reconciliation.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`

### Blocks / Impacts

- `TASK-732`
- confiabilidad de reliquidación
- readers históricos de ICO

### Files owned

- `src/lib/ico-engine/**`
- `src/lib/payroll/**`
- `docs/architecture/**`

## Current Repo State

### Already exists

- snapshots/materializers y reconcile histórico activos
- payroll ya consume métricas ICO para cálculo real

### Gap

- un mes `locked` puede reescribirse
- no hay boundary nítido entre freeze canónico y correction lane

## Scope

### Slice 1 — Freeze contract

- definir generación/snapshot canónico e impedir rewrites normales sobre meses `locked`
- endurecer schema/metadata de snapshot

### Slice 2 — Correction lane

- separar reconcile correctivo de freeze normal
- exigir justificación/audit para cambios históricos extraordinarios

### Slice 3 — Payroll linkage

- hacer que payroll y reliquidación referencien explícitamente la base histórica consumida

## Out of Scope

- reescribir todos los consumers ICO

## Acceptance Criteria

- [ ] un período `locked` no puede ser reescrito por materialización o reconcile normal
- [ ] existe un carril separado y auditable para correcciones históricas
- [ ] payroll/reliquidación puede identificar la base histórica concreta que usó

## Verification

- `pnpm lint`
- `pnpm test`
- corrida controlada de materialize + reconcile sobre período locked

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si aplica
- [ ] `changelog.md` actualizado si aplica
- [ ] chequeo de impacto cruzado sobre `TASK-732` y `TASK-734`
