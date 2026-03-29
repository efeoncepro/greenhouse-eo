# TASK-109 - Projected Payroll Runtime Hardening and Observability

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`

## Summary

Cerrar deuda de hardening posterior a `TASK-063` para que `Projected Payroll` opere sin DDL en runtime, con observabilidad explícita del refresh reactivo y con contrato claro para los eventos `payroll.projected_*` más allá de audit trail.

## Why This Task Exists

`TASK-063` dejó resuelto el baseline funcional de projected payroll (API, UI, snapshots y promoción). El pendiente real ya no es producto base, sino robustez operativa:

- el store aún intenta `CREATE TABLE IF NOT EXISTS` en runtime
- falta un panel/health claro para detectar snapshots stale o fallidos
- los eventos `payroll.projected_*` existen, pero sus consumers de negocio no están formalizados

## Goal

- Eliminar DDL defensivo de runtime en projected payroll.
- Asegurar que la materialización dependa solo de migraciones/bootstrap.
- Exponer estado operativo de la proyección reactiva (health + stale + failures).
- Definir explícitamente qué consumidores reales usan `payroll.projected_*` y cuáles quedan como audit trail.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- no hacer DDL en rutas o runtime normal del portal
- projected payroll sigue siendo simulación + cache auditable, no source transaccional
- los eventos `payroll.projected_*` solo deben propagarse a consumers con contrato de negocio explícito

## Dependencies & Impact

### Depends on

- `TASK-063` - Payroll Projected Payroll Runtime
- `TASK-074` - Projected Payroll to Official Promotion Flow

### Impacts to

- `HR > Nómina Proyectada`
- `outbox-react` dominio `people`
- `greenhouse_serving.projected_payroll_snapshots`
- observabilidad de proyecciones

### Files owned

- `src/lib/payroll/projected-payroll-store.ts`
- `src/lib/sync/projections/projected-payroll.ts`
- `src/app/api/hr/payroll/projected/route.ts`
- `src/app/api/internal/projections/route.ts`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

## Current Repo State

### Ya existe

- `GET /api/hr/payroll/projected`
- `POST /api/hr/payroll/projected/promote`
- `project-payroll` engine reutilizando cálculo canónico
- snapshot table + migration + grants
- proyección reactiva registrada

### Gap actual

- runtime DDL aún presente en projected payroll store
- falta observabilidad específica de projected payroll refresh
- contrato downstream de eventos `payroll.projected_*` no está cerrado

## Scope

### Slice 1 - Runtime DDL removal

- quitar `CREATE TABLE IF NOT EXISTS` del runtime store
- usar migraciones/setup como único camino de schema
- fail-fast con error explícito si falta infraestructura

### Slice 2 - Projection health

- exponer salud de `projected_payroll` en surface interna de proyecciones
- métricas mínimas: last refresh, pending, failed, stale threshold
- agregar señales para troubleshooting operativo

### Slice 3 - Event contract hardening

- documentar estado de `payroll.projected_snapshot.refreshed` y `payroll.projected_period.refreshed`
- definir consumers reales o dejar explícito que son audit-only
- alinear catálogo de eventos y task docs

## Out of Scope

- rediseño UI de `ProjectedPayrollView`
- nuevas fórmulas de cálculo de nómina
- forecast financiero multi-mes en Finance

## Acceptance Criteria

- [ ] `projected-payroll-store` no ejecuta DDL en runtime
- [ ] fallback por schema faltante retorna error accionable
- [ ] health de `projected_payroll` visible y verificable en observabilidad interna
- [ ] contrato de eventos `payroll.projected_*` alineado entre runtime y docs

## Verification

- `pnpm exec vitest run src/lib/payroll/projected-payroll-store.test.ts src/lib/payroll/project-payroll.test.ts src/lib/sync/projections/projected-payroll.test.ts`
- `pnpm exec eslint src/lib/payroll/projected-payroll-store.ts src/lib/sync/projections/projected-payroll.ts src/app/api/hr/payroll/projected/route.ts`
- `pnpm build`
