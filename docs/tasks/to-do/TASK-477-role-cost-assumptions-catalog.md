# TASK-477 — Role Cost Assumptions Catalog & Effective-Dated Modeling

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-476`, `TASK-475`
- Branch: `task/TASK-477-role-cost-assumptions-catalog`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Evolucionar la foundation de roles comerciales para soportar costo modelado efectivo en el tiempo cuando Greenhouse necesita cotizar roles que todavía no existen como personas reales en capacidad. La task extiende el catálogo comercial existente en vez de crear uno nuevo.

## Why This Task Exists

El quote builder no siempre podrá apoyarse en personas reales. Greenhouse necesita cotizar capacidad futura o hipotética. La base actual en `greenhouse_commercial.sellable_role_cost_components` es valiosa, pero no alcanza todavía para expresar un catálogo de supuestos de costo suficientemente robusto, efectivo en el tiempo y reusable por el engine.

## Goal

- Extender el modelado de costo por rol en `greenhouse_commercial`.
- Soportar effective dating, país, employment type, seniority y estructura de costo.
- Permitir que el engine resuelva costo modelado sin inventar montos manuales ad hoc.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`
- `docs/tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md`
- `docs/tasks/complete/TASK-468-payroll-commercial-employment-types-unification.md`

Reglas obligatorias:

- Reusar `greenhouse_commercial.sellable_roles` y `sellable_role_cost_components`; no crear un catálogo maestro de roles paralelo.
- `Payroll` sigue siendo owner factual; esta task modela costo comercial, no reescribe `compensation_versions`.
- Las assumptions deben ser versionadas/effective-dated y auditables.
- Si la task necesita materialización batch o backfill, debe habilitar el endpoint reservado `POST /cost-basis/materialize/roles` en `commercial-cost-worker`, no crecer en `ops-worker`.

## Dependencies & Impact

### Depends on

- `src/lib/commercial/sellable-roles-store.ts`
- `src/lib/commercial/employment-type-alias-store.ts`
- `src/lib/commercial/payroll-rates-bridge.ts`
- `src/app/api/admin/pricing-catalog/roles/[id]/cost-components/route.ts`

### Blocks / Impacts

- `TASK-480`
- `TASK-481`

### Files owned

- `src/lib/commercial/sellable-roles-store.ts`
- `src/app/api/admin/pricing-catalog/roles/[id]/cost-components/route.ts`
- `src/views/greenhouse/admin/pricing-catalog/drawers/EditSellableRoleDrawer.tsx`
- `src/views/greenhouse/admin/pricing-catalog/drawers/CreateSellableRoleDrawer.tsx`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- `sellable_roles`
- `sellable_role_cost_components`
- `role_employment_compatibility`
- bridge commercial-side de employment types hacia payroll
- `TASK-483` ya dejó `commercial-cost-worker` operativo y reservó `POST /cost-basis/materialize/roles` como target runtime de esta slice.

### Gap

- No existe un contrato explícito de `role_modeled` con confidence/effective dating suficientemente fuerte.
- El endpoint reservado de roles todavía no tiene payload/lógica final porque depende de esta task.

## Scope

### Slice 1 — Role assumptions model

- Definir la evolución de `sellable_role_cost_components` o tabla hermana comercial para soportar:
  - sueldo base
  - bonos
  - cargas
  - overhead
  - horas objetivo
  - país
  - seniority
  - employment type
  - effective dating
  - confidence/source

### Slice 2 — Resolver comercial por rol

- Exponer readers determinísticos para que el engine pueda resolver costo modelado por rol.

### Slice 3 — Governance admin mínima

- Extender el admin pricing catalog lo suficiente para mantener estos supuestos sin duplicar UX ni inventar otro panel aparte.

## Out of Scope

- Costos por persona real; eso queda en `TASK-479`.
- UI del quote builder; eso queda en `TASK-481`.

## Acceptance Criteria

- [ ] El catálogo comercial de roles soporta costo modelado effective-dated sin crear un dominio paralelo.
- [ ] El costo modelado por rol es explicable por componentes y no solo por un valor final.
- [ ] El engine puede consumir un reader comercial estable para roles sin persona real.
- [ ] El ownership factual de payroll sigue intacto.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
