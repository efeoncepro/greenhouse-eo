# TASK-019 — Staff Augmentation Module

## Delta 2026-03-31
- El baseline de `TASK-019` se mantiene cerrado; el puente explícito `People membership -> assignment context -> placement` sale a [TASK-169-staff-aug-placement-bridge-hris-runtime-consolidation.md](/Users/jreye/Documents/greenhouse-eo/docs/tasks/in-progress/TASK-169-staff-aug-placement-bridge-hris-runtime-consolidation.md).
- Ajuste operativo confirmado:
  - `ghost slot` / `Vincular a organización` crea `person_memberships`
  - el assignment sigue siendo el pivote real para Staff Aug
  - el placement nunca nace directamente desde membership
- `Create placement` dejó de depender de `/api/team/capacity-breakdown`; ahora usa la route liviana `GET /api/agency/staff-augmentation/placement-options`.

## Status

Closed on 2026-03-30.

## Summary

`Staff Augmentation` quedó implementado como extensión canónica de `greenhouse_core.client_team_assignments`, no como identidad paralela. El assignment sigue siendo el anchor operacional; el placement comercial y operativo vive en tablas satélite de delivery y se materializa hacia serving económico mensual.

La solución final hace sinergia con:
- `Providers` y `Finance Suppliers`
- `AI Tooling`
- `Payroll`
- `member_capacity_economics`
- `commercial_cost_attribution`
- `operational_pl`
- outbox + projections reactivos

## Architecture Reconciliation

Se corrigieron los supuestos viejos de la task:
- `Postgres` es el write path principal; `BigQuery` no es anchor transaccional del módulo.
- `assignment_type = 'staff_augmentation'` ya existe y se muta en runtime.
- El placement no vive en `greenhouse_core.staff_aug_*`; vive en:
  - `greenhouse_delivery.staff_aug_placements`
  - `greenhouse_delivery.staff_aug_onboarding_items`
  - `greenhouse_delivery.staff_aug_events`
  - `greenhouse_serving.staff_aug_placement_snapshots`
- La surface real del módulo vive en:
  - `/agency/staff-augmentation`
  - `/agency/staff-augmentation/[placementId]`
  - `/api/agency/staff-augmentation/placements/*`
- El checklist de placement no usa `placement_onboarding_checklists`; usa `staff_aug_onboarding_items`.
- El vínculo con servicios se resuelve vía `greenhouse_core.service_modules` + `client_service_modules`, sembrando el módulo `staff_augmentation`.
- El snapshot contractual/costo se apoya en `compensation_versions`; no asume todavía que `greenhouse_core.members` ya tenga todo el modelo canónico HRIS consolidado.

## Implemented Scope

### Data model and setup

- `client_team_assignments` enriquecido con:
  - `assignment_type`
  - `contracted_hours_month`
- Nuevo bootstrap:
  - [setup-postgres-staff-augmentation.sql](/Users/jreye/Documents/greenhouse-eo/scripts/setup-postgres-staff-augmentation.sql)
  - [setup-postgres-staff-augmentation.ts](/Users/jreye/Documents/greenhouse-eo/scripts/setup-postgres-staff-augmentation.ts)
- Script package:
  - `pnpm setup:postgres:staff-augmentation`

### Runtime store

- CRUD y helpers en [store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/store.ts)
- Materialización económica mensual en [snapshots.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/snapshots.ts)
- Checklist inicial de onboarding sembrado al crear placement
- Event log transaccional propio en `greenhouse_delivery.staff_aug_events`

### Outbox and projections

- Nuevos aggregates y eventos en [event-catalog.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/sync/event-catalog.ts):
  - `staff_aug_placement`
  - `staff_aug_onboarding_item`
  - `staff_aug_placement_snapshot`
  - `staff_aug.placement.created`
  - `staff_aug.placement.updated`
  - `staff_aug.placement.status_changed`
  - `staff_aug.onboarding_item.updated`
  - `staff_aug.placement_snapshot.materialized`
- Nueva proyección reactiva en [staff-augmentation.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/sync/projections/staff-augmentation.ts)
- Triggers entrantes conectados a:
  - assignments
  - finance expenses/tooling
  - providers/provider tooling snapshots
  - payroll periods, payroll entries y compensation versions

### API

- [route.ts](/Users/jreye/Documents/greenhouse-eo/src/app/api/agency/staff-augmentation/placements/route.ts)
- [route.ts](/Users/jreye/Documents/greenhouse-eo/src/app/api/agency/staff-augmentation/placements/[placementId]/route.ts)
- [route.ts](/Users/jreye/Documents/greenhouse-eo/src/app/api/agency/staff-augmentation/placements/[placementId]/onboarding/[itemId]/route.ts)

### UI / UX

La UI quedó aterrizada en `Agency`, siguiendo Vuexy reusable patterns.

- Listado y creación:
  - [StaffAugmentationListView.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx)
  - [CreatePlacementDialog.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx)
- Detalle:
  - [PlacementDetailView.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.tsx)
- Rutas:
  - [page.tsx](/Users/jreye/Documents/greenhouse-eo/src/app/(dashboard)/agency/staff-augmentation/page.tsx)
  - [page.tsx](/Users/jreye/Documents/greenhouse-eo/src/app/(dashboard)/agency/staff-augmentation/[placementId]/page.tsx)
- Navegación/gobernanza:
  - `GH_AGENCY_NAV.staffAugmentation`
  - `gestion.staff_augmentation`
  - entrada en sidebar de `Agency`

### Consumers and synergy

- `Agency > Team` ahora expone `assignment_type`, `placement_id`, `placement_status` y CTA al placement.
- `Staff Augmentation` drilldowna hacia:
  - `Agency > Team`
  - `HR > Payroll`
  - `Admin > AI Tooling` filtrado por `providerId`
- El snapshot económico mensual consolida:
  - revenue proxy
  - employer payroll cost
  - loaded cost
  - direct member expense
  - tooling cost
  - margin proxy

## Dependencies & Impact

### Depende de

- `greenhouse_core.client_team_assignments`
- `greenhouse_payroll.compensation_versions`
- `greenhouse_payroll.payroll_entries`
- `greenhouse_serving.commercial_cost_attribution`
- `greenhouse_finance.exchange_rates`
- `greenhouse_core.providers`
- `greenhouse_core.service_modules`
- `greenhouse_core.client_service_modules`

### Impacta a

- `TASK-041` como addendum HRIS
- `TASK-038` como brief histórico ya no ejecutable literalmente
- consumers de `Agency > Team`
- futuros consumers de `People` y `Finance Clients`

### Archivos owned

- [setup-postgres-staff-augmentation.sql](/Users/jreye/Documents/greenhouse-eo/scripts/setup-postgres-staff-augmentation.sql)
- [setup-postgres-staff-augmentation.ts](/Users/jreye/Documents/greenhouse-eo/scripts/setup-postgres-staff-augmentation.ts)
- [store.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/store.ts)
- [snapshots.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/staff-augmentation/snapshots.ts)
- [staff-augmentation.ts](/Users/jreye/Documents/greenhouse-eo/src/lib/sync/projections/staff-augmentation.ts)
- [route.ts](/Users/jreye/Documents/greenhouse-eo/src/app/api/agency/staff-augmentation/placements/route.ts)
- [route.ts](/Users/jreye/Documents/greenhouse-eo/src/app/api/agency/staff-augmentation/placements/[placementId]/route.ts)
- [route.ts](/Users/jreye/Documents/greenhouse-eo/src/app/api/agency/staff-augmentation/placements/[placementId]/onboarding/[itemId]/route.ts)
- [StaffAugmentationListView.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx)
- [CreatePlacementDialog.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx)
- [PlacementDetailView.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.tsx)

## Validation

Validated on closure with:
- `pnpm exec vitest run src/app/api/team/capacity-breakdown/route.test.ts src/lib/sync/projections/staff-augmentation.test.ts src/lib/sync/event-catalog.test.ts src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.test.tsx`
- `pnpm exec eslint src/lib/staff-augmentation/store.ts src/lib/staff-augmentation/snapshots.ts src/lib/sync/projections/staff-augmentation.ts src/lib/sync/event-catalog.ts src/app/api/team/capacity-breakdown/route.ts src/app/api/team/capacity-breakdown/route.test.ts src/views/agency/AgencyTeamView.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.tsx src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.test.tsx 'src/app/(dashboard)/agency/layout.tsx' 'src/app/(dashboard)/agency/staff-augmentation/page.tsx' 'src/app/(dashboard)/agency/staff-augmentation/[placementId]/page.tsx' src/components/layout/vertical/VerticalMenu.tsx src/config/greenhouse-nomenclature.ts src/lib/admin/view-access-catalog.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Follow-ons left intentionally outside this task

- HRIS canonical contract consolidation sobre `members.*` sigue en el carril `TASK-026` / `TASK-041`.
- Enriquecimiento específico de `People 360` para placements puede crecer como consumer adicional sin reabrir el baseline.
- Surfaces financieras más profundas por placement/cliente pueden derivarse sobre este baseline sin rediseñar el anchor.
