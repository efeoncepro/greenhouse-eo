# TASK-477 — Role Cost Assumptions Catalog & Effective-Dated Modeling

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementada, mergeada a develop y cerrada documentalmente`
- Rank: `complete`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-477-role-cost-assumptions-catalog`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Evolucionar la foundation de roles comerciales para soportar costo modelado efectivo en el tiempo cuando Greenhouse necesita cotizar roles que todavía no existen como personas reales en capacidad. La task extiende el catálogo comercial existente en vez de crear uno nuevo.

## Why This Task Exists

El quote builder no siempre podrá apoyarse en personas reales. Greenhouse necesita cotizar capacidad futura o hipotética. La base actual en `greenhouse_commercial.sellable_role_cost_components` es valiosa, pero no alcanza todavía para expresar un catálogo de supuestos de costo suficientemente robusto, efectivo en el tiempo y reusable por el engine.

## Goal

- Extender el modelado de costo por rol en `greenhouse_commercial`.
- Formalizar `role_modeled` como lane explícito, auditable y explainable dentro del engine comercial.
- Reusar effective dating y estructura de costo ya existentes, sin duplicar dimensiones que hoy ya viven en:
  - `employment_types.country_code`
  - SKU / identidad del `sellable_role` para la seniority baked-in del catálogo
- Permitir que el engine resuelva costo modelado con provenance/confidence sin inventar montos manuales ad hoc.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`
- `docs/tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md`
- `docs/tasks/complete/TASK-468-payroll-commercial-employment-types-unification.md`
- `docs/tasks/complete/TASK-479-people-actual-cost-blended-role-snapshots.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Reusar `greenhouse_commercial.sellable_roles` y `sellable_role_cost_components`; no crear un catálogo maestro de roles paralelo.
- `Payroll` sigue siendo owner factual; esta task modela costo comercial, no reescribe `compensation_versions`.
- Las assumptions deben ser versionadas/effective-dated y auditables.
- Mantener la precedencia runtime vigente del engine: `role_blended` sigue teniendo prioridad sobre `role_modeled` cuando exista evidencia factual reusable.
- No introducir columnas redundantes para `country` o `seniority` si la necesidad ya queda resuelta por `employment_types` o por el SKU/identidad del rol.
- Si el cambio toca payloads de catálogo o readers de pricing, debe preservar el contrato que hoy consume el quote builder (`pricing/config`, `pricing/lookup`, `pricing-engine-v2`).
- Si la task necesita materialización batch o backfill, debe habilitar el endpoint reservado `POST /cost-basis/materialize/roles` en `commercial-cost-worker`, no crecer en `ops-worker`.

## Dependencies & Impact

### Depends on

- `src/lib/commercial/sellable-roles-store.ts`
- `src/lib/commercial/employment-type-alias-store.ts`
- `src/lib/commercial/payroll-rates-bridge.ts`
- `src/app/api/admin/pricing-catalog/roles/[id]/cost-components/route.ts`
- `src/lib/finance/pricing/pricing-engine-v2.ts`
- `src/lib/commercial-cost-basis/people-role-cost-basis.ts`
- `services/commercial-cost-worker/server.ts`

### Blocks / Impacts

- `TASK-480`
- `TASK-481`

### Files owned

- `src/lib/commercial/sellable-roles-store.ts`
- `src/app/api/admin/pricing-catalog/roles/[id]/cost-components/route.ts`
- `src/views/greenhouse/admin/pricing-catalog/drawers/EditSellableRoleDrawer.tsx`
- `src/views/greenhouse/admin/pricing-catalog/drawers/CreateSellableRoleDrawer.tsx`
- `src/lib/commercial-cost-worker/**`
- `services/commercial-cost-worker/**`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- `sellable_roles` como catálogo canónico de roles vendibles por SKU.
- `sellable_role_cost_components` con PK `(role_id, employment_type_code, effective_from)` y breakdown por componentes.
- `role_employment_compatibility` editable desde admin UI.
- bridge commercial-side de employment types hacia payroll (`employment_type_aliases` + `payroll-rates-bridge`).
- `pricing-engine-v2` ya consume `role_modeled` vía `getCurrentCost(...)`.
- `TASK-479` ya materializa `role_blended_cost_basis_snapshots` y el engine los prefiere antes de caer a `role_modeled`.
- `TASK-467` ya dejó el admin pricing catalog operativo para roles, modalidades, cost components y pricing por moneda.
- `TASK-483` ya dejó `commercial-cost-worker` operativo y reservó `POST /cost-basis/materialize/roles` como target runtime de esta slice.

### Gap

- No existe un contrato explícito y reusable de `role_modeled` con `source_ref`, `snapshot_date`, `confidence` y explainability equivalente al lane `role_blended`.
- El engine puede resolver `role_modeled`, pero hoy lo hace leyendo directamente `sellable_role_cost_components`; falta una capa más explícita para provenance/confidence y para batch materialization por período.
- El endpoint reservado de roles todavía no tiene payload/lógica final porque depende de esta task.
- `docs/architecture/schema-snapshot-baseline.sql` no refleja este lane; la referencia operativa real es migraciones + `src/types/db.d.ts`.

## Scope

### Slice 1 — Role assumptions model

- Definir la evolución de `sellable_role_cost_components` y/o una capa hermana de snapshots modelados para soportar:
  - sueldo base
  - bonos
  - cargas
  - overhead
  - horas objetivo
  - employment type
  - effective dating
  - confidence/source
- Reusar las dimensiones ya existentes del repo:
  - `country_code` desde `employment_types`
  - seniority implícita en el `sellable_role` / SKU
- No duplicar columnas si la misma semántica ya existe en el catálogo canónico.

### Slice 2 — Resolver comercial por rol

- Exponer readers determinísticos para que el engine pueda resolver costo modelado por rol con metadata explícita de provenance/confidence.
- Mantener compatibilidad con el contrato de `PricingCostStackV2` ya existente (`costBasisKind`, `costBasisSourceRef`, `costBasisSnapshotDate`, `costBasisConfidence*`).

### Slice 3 — Governance admin mínima

- Extender el admin pricing catalog existente lo suficiente para mantener estos supuestos sin duplicar UX ni inventar otro panel aparte.
- Preservar los contratos ya consumidos por el quote builder y por `GET /api/finance/quotes/pricing/lookup`.

### Slice 4 — Worker roles materialization

- Implementar la slice reservada `POST /cost-basis/materialize/roles` en `commercial-cost-worker`.
- Dejar tracking, manifest y eventing alineados al patrón ya existente de `people` / `tools` / `bundle`.

## Out of Scope

- Costos por persona real; eso queda en `TASK-479`.
- Rediseñar la UI del quote builder; eso queda en `TASK-481`.
- Cambiar el orden de precedencia `role_blended -> role_modeled` ya adoptado por el engine.

## Acceptance Criteria

- [x] El catálogo comercial de roles soporta costo modelado effective-dated sin crear un dominio paralelo.
- [x] El costo modelado por rol es explicable por componentes y no solo por un valor final.
- [x] El engine puede consumir un reader comercial estable para roles sin persona real, con provenance/confidence explícitos.
- [x] `role_blended` sigue ganando precedencia sobre `role_modeled` cuando exista evidencia factual para el período.
- [x] `POST /cost-basis/materialize/roles` deja de estar reservado y queda implementado sobre `commercial-cost-worker`.
- [x] El ownership factual de payroll sigue intacto.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`

## Completion Notes

- Migración aplicada: `20260419151636951_task-477-role-modeled-cost-basis.sql`
- Reader/modelado nuevo: `src/lib/commercial-cost-basis/role-modeled-cost-basis.ts`
- Engine actualizado: `src/lib/finance/pricing/pricing-engine-v2.ts`
- Worker `roles` activado en `commercial-cost-worker`
- Admin pricing catalog extendido para overhead, loaded cost, provenance y confidence
- Mergeado a `develop`: `0ebfd7a1`
