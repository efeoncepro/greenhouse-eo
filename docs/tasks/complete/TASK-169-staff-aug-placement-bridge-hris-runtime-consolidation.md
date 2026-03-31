# TASK-169 - Staff Aug Placement Bridge & HRIS Runtime Consolidation

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `26`
- Domain: `agency`
- Legacy ID: `TASK-038` + `TASK-041`

## Summary

Consolidar el bridge entre `People`, `Assignments` y `Staff Augmentation` sobre el runtime real del repo. La task absorbe los supuestos útiles de `TASK-038` y `TASK-041`, corrige drift documental viejo y deja explícito que el placement nace desde `client_team_assignments`, no desde un ghost slot ni desde una membresía.

También endurece el flujo de creación de placement con un carril liviano de opciones, deja visibles las señales `assignment -> placement` dentro de `Person 360` y fija la sinergia operativa con `Finance`, `Payroll`, `Providers` y `AI Tooling`.

## Why This Task Exists

- `TASK-019` cerró correctamente el baseline moderno de Staff Aug, pero dejó fuera el puente explícito con `People`.
- `TASK-038` y `TASK-041` todavía mezclan conceptos válidos con supuestos viejos:
  - surface `/internal/staff-augmentation`
  - `CreatePlacementDrawer`
  - `greenhouse_core.staff_aug_*`
  - `BigQuery` como write path
  - `ghost slot` o membresía como si fueran equivalentes a placement
- El bug real detectado en 2026-03-31 mostró otro hueco: el modal `Crear placement` estaba usando `/api/team/capacity-breakdown`, un carril demasiado pesado para poblar un selector.

## Goal

- Dejar institucionalizado el bridge `membership -> assignment context -> placement` sin inventar identidades nuevas.
- Hacer visible en `People` el estado real de Staff Aug por assignment.
- Mantener `assignment` como ancla operativa y `placement` como capa comercial-operativa.
- Reconciliar `TASK-038` y `TASK-041` como documentos históricos absorbidos por esta lane.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- `placement` nace desde `greenhouse_core.client_team_assignments`, no desde `person_memberships`.
- `greenhouse_delivery.staff_aug_*` y `greenhouse_serving.staff_aug_placement_snapshots` son el runtime vigente; no reintroducir `greenhouse_core.staff_aug_*`.
- `compensation_versions`, `payroll_entries`, `commercial_cost_attribution`, `providers` y `greenhouse_ai.*` se consumen como fuentes y consumers del placement; no crear una identidad paralela para costos o tooling.

## Dependencies & Impact

### Depends on

- [TASK-019-staff-augmentation-module.md](/Users/jreye/Documents/greenhouse-eo/docs/tasks/complete/TASK-019-staff-augmentation-module.md)
- [TASK-059-tool-provider-canonical-object.md](/Users/jreye/Documents/greenhouse-eo/docs/tasks/complete/TASK-059-tool-provider-canonical-object.md)
- [TASK-060-team-assignment-admin.md](/Users/jreye/Documents/greenhouse-eo/docs/tasks/complete/TASK-060-team-assignment-admin.md)
- [TASK-073-people-canonical-capacity-cutover.md](/Users/jreye/Documents/greenhouse-eo/docs/tasks/to-do/TASK-073-people-canonical-capacity-cutover.md)
- [TASK-162-canonical-commercial-cost-attribution.md](/Users/jreye/Documents/greenhouse-eo/docs/tasks/complete/TASK-162-canonical-commercial-cost-attribution.md)
- [TASK-026-hris-contract-type-consolidation.md](/Users/jreye/Documents/greenhouse-eo/docs/tasks/to-do/TASK-026-hris-contract-type-consolidation.md) como dependencia parcial para futuros campos HRIS canónicos en `members.*`

### Impacts to

- `People 360`
- `Agency > Team`
- `Agency > Staff Augmentation`
- `Finance` y `Payroll` consumers por placement
- `Providers` y `AI Tooling` drilldowns por `providerId`

### Files owned

- `src/lib/staff-augmentation/store.ts`
- `src/app/api/agency/staff-augmentation/placement-options/route.ts`
- `src/app/api/agency/staff-augmentation/placements/route.ts`
- `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx`
- `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`
- `src/lib/people/get-person-detail.ts`
- `src/types/people.ts`
- `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx`
- `src/lib/sync/projections/assignment-membership-sync.ts`

## Current Repo State

### Ya existe

- `TASK-019` dejó cerrado el baseline `assignment -> placement -> snapshot`.
- La proyección `assignment_membership_sync` ya asegura `assignment -> membership`.
- La proyección `staff_augmentation_placements` ya materializa snapshots con señales entrantes desde assignments, finance, payroll, providers y tooling.
- `Agency > Team` ya consume `assignmentType`, `placementId` y `placementStatus`.

### Gap actual

- `People` no estaba viendo esas señales de placement.
- `Create placement` estaba cargando un endpoint demasiado pesado para un modal.
- `TASK-038` y `TASK-041` seguían sugiriendo helpers/schemas/rutas que ya no existen como baseline.

## Scope

### Slice 1 - Create placement liviano

- Crear una route específica `placement-options` sobre el store de Staff Aug.
- Cortar el modal `CreatePlacementDialog` fuera de `/api/team/capacity-breakdown`.
- Permitir preselección por `assignmentId` para deep-links desde `People`.

### Slice 2 - People bridge mínimo y seguro

- Extender `PersonDetailAssignment` con:
  - `assignmentType`
  - `placementId`
  - `placementStatus`
- Mostrar esas señales dentro de `PersonMembershipsTab`.
- Exponer CTA según estado:
  - crear assignment desde editar membresía cuando aún no existe
  - crear placement cuando ya existe assignment elegible
  - abrir placement cuando ya existe

### Slice 3 - Reconciliación documental

- Marcar `TASK-038` como brief histórico absorbido.
- Marcar `TASK-041` como addendum absorbido por esta lane para el bridge real.
- Dejar explícito en documentación viva que:
  - el ghost slot crea membresías
  - el assignment crea contexto operativo
  - el placement crea la capa comercial-operativa

## Out of Scope

- Rehacer `Staff Augmentation` como módulo nuevo.
- Promover `person_membership` a identidad canónica del placement.
- Completar la consolidación HRIS de `members.contract_type`, `members.payroll_via` y similares; eso sigue en `TASK-026`.
- Reemplazar el baseline económico mensual de `TASK-019`.

## Acceptance Criteria

- [x] `Create placement` ya no depende de `/api/team/capacity-breakdown` para listar opciones elegibles.
- [x] `Person 360` expone `assignmentType`, `placementId` y `placementStatus` sin crear un modelo paralelo.
- [x] Desde `People`, un assignment elegible puede abrir `Agency > Staff Augmentation` con `assignmentId` preseleccionado para crear placement.
- [x] `TASK-038` y `TASK-041` quedan reconciliadas como documentos absorbidos por `TASK-169`.
- [x] `project_context.md`, `Handoff.md` y `changelog.md` reflejan el bridge real `assignment -> membership` y `assignment -> placement`.

## Verification

- `pnpm exec vitest run src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx src/app/api/agency/staff-augmentation/placements/route.test.ts src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx`
- `pnpm exec eslint src/lib/staff-augmentation/store.ts src/app/api/agency/staff-augmentation/placement-options/route.ts src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/lib/people/get-person-detail.ts src/types/people.ts src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

## Follow-ups

- Llevar el mismo bridge a `People 360` con una surface Staff Aug más explícita si el producto la necesita.
- Evaluar un CTA hacia assignment creation desde `People` sin depender del drawer de edición de membresía.
- Cuando `TASK-026` cierre, revisar si algún snapshot de placement debe tomar nuevos campos canónicos de HRIS en vez de derivados runtime.
