# TASK-479 — People Actual Cost + Blended Role Cost Snapshots

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-479-people-actual-cost-blended-role-snapshots`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la capa de costo comercial por persona real y costo blended por rol reutilizando `member_capacity_economics`, payroll factual y foundations comerciales ya existentes. La task debe cerrar el gap real del repo: hoy existe costo factual por persona, pero aún no existe el bridge canónico persona -> rol comercial ni el snapshot reusable `role_blended` que el pricing engine necesita.

## Why This Task Exists

Para cotizar bien, Greenhouse necesita dos cosas:

- costo real cuando existe una persona concreta;
- costo blended por rol cuando no existe o no conviene fijar una persona.

La base factual ya existe en `greenhouse_serving.member_capacity_economics` y en payroll, pero el repo real muestra dos huecos que la spec original no explicitaba:

- no existe un bridge canónico persona -> `sellable_role`;
- no existe una lane persistida `role-period` para `role_blended` con provenance/confidence compartida.

Sin esos dos contratos, `role_blended` no puede implementarse de forma robusta ni escalar hacia `TASK-480` y `TASK-481`.

## Goal

- Reusar `member_capacity_economics` como fuente comercial principal de costo real por persona.
- Crear el bridge canónico persona -> rol comercial requerido para agregar evidencia real por rol.
- Derivar y materializar costo blended por rol usando snapshots reales y foundations comerciales.
- Exponer readers consistentes con provenance/confidence/freshness.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`
- `docs/tasks/complete/TASK-468-payroll-commercial-employment-types-unification.md`

Reglas obligatorias:

- `member_capacity_economics` es la fuente comercial principal de costo real por persona.
- Payroll sigue siendo owner factual y solo se consume cuando hace falta enriquecer o explicar.
- No crear otra identidad de persona comercial.
- El bridge persona -> rol comercial vive en `greenhouse_commercial` y solo referencia identidades existentes; no inventa personas, roles ni employment types paralelos.
- La materialización batch de personas/blended snapshots debe montarse sobre `commercial-cost-worker`; no va en `ops-worker` ni en request-response del portal.
- `role_blended` debe salir de evidencia real agrupada por rol comercial efectivo, no de heurísticas ad hoc en request time.

## Dependencies & Impact

### Depends on

- `src/lib/member-capacity-economics/store.ts`
- `src/lib/commercial/sellable-roles-store.ts`
- `src/lib/commercial/pricing-governance-store.ts`
- `src/lib/commercial-cost-worker/materialize.ts`
- `src/lib/commercial-cost-worker/contracts.ts`
- `src/app/api/people/[memberId]/finance-impact/route.ts`

### Blocks / Impacts

- `TASK-480`
- `TASK-481`

### Files owned

- `src/lib/member-capacity-economics/store.ts`
- `src/lib/people/get-people-list.ts`
- `src/app/api/people/[memberId]/finance-impact/route.ts`
- `src/lib/commercial/sellable-roles-store.ts`
- `src/lib/commercial-cost-worker/materialize.ts`
- `src/lib/commercial-cost-worker/contracts.ts`
- `src/lib/finance/pricing/pricing-engine-v2.ts`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- `member_capacity_economics`
- payroll factual
- foundations de roles y employment types
- `TASK-483` ya dejó activo `POST /cost-basis/materialize/people` en `commercial-cost-worker` para esta foundation
- readers exact/latest/batch sobre `member_capacity_economics`
- pricing governance effective-dated
- catálogo comercial `sellable_roles`

### Gap

- No existe un bridge canónico persona -> `sellable_role`.
- No existe snapshot reusable `role_blended` por `role + employment_type + period`.
- Falta provenance/confidence compartida para costo persona/rol.
- `src/app/api/people/[memberId]/finance-impact/route.ts` hoy consulta columnas que no existen en el schema real y debe corregirse como parte del hardening.

## Scope

### Slice 1 — Actual person cost reader

- Resolver costo real comercial por persona desde `member_capacity_economics`.
- Exponer reader/shared contract `member_actual` con provenance, snapshotDate, freshness y confidence sin duplicar payroll factual.

### Slice 2 — Canonical person-to-role bridge

- Materializar el bridge canónico persona -> `sellable_role` usando identidad factual existente, employment type unificado y reglas explícitas de elegibilidad.
- El bridge debe ser persistido y reusable por worker, engine y consumers downstream.

### Slice 3 — Blended role cost snapshot

- Derivar y materializar `role_blended` por periodo a partir de evidencia real agregada por rol comercial efectivo.
- El snapshot debe soportar weighting, provenance agregada, freshness/confidence y trazabilidad al bridge/person snapshots de origen.

### Slice 4 — Shared contract + consumer hardening

- Dejar un contrato reusable para engine/UI con:
  - monto
  - moneda
  - `sourceKind`
  - `sourceRef`
  - `snapshotDate`
  - `confidence`
- Corregir consumers ya existentes con drift, en particular People finance impact, para que lean el contrato real y no columnas inexistentes.

## Out of Scope

- UI del quote builder.
- Costos de tools.
- Catálogo modelado de roles sin evidencia real (`TASK-477`).
- Resolver overrides/manual cost en quotes (`TASK-481`).

## Detailed Spec

- `member_actual` no crea una tabla paralela si `member_capacity_economics` ya cubre el snapshot factual; el deliverable es un reader/contract comercial reusable sobre la base factual existente.
- `role_blended` sí requiere persistencia propia en `greenhouse_commercial` porque no existe hoy un agregado canónico por rol-period.
- El bridge persona -> rol comercial debe vivir en `greenhouse_commercial` y referenciar:
  - `member_id`
  - `role_id` / `role_code` / `role_sku`
  - `employment_type_code`
  - `effective_from` / `effective_to`
  - `mapping_source` / `mapping_confidence`
  - `source_ref`
- La materialización `role_blended` debe, como mínimo, agrupar por:
  - `role_id`
  - `employment_type_code`
  - `period_year`
  - `period_month`
- La política de blending debe ser deterministic y auditable:
  - usar solo snapshots `member_capacity_economics` válidos del periodo
  - excluir evidencia sin bridge comercial activo
  - ponderar por horas/FTE factual disponible, no por conteo simple de personas
  - registrar `sample_size`, freshness y confidence agregada
- `commercial-cost-worker` extiende el scope `people`; no se usa el scope `roles` reservado para `TASK-477`, porque aquí el agregado nace desde evidencia real de personas.
- `pricing-engine-v2` debe poder resolver explícitamente dos lanes distintas:
  - `member_actual`
  - `role_blended`
- `src/app/api/people/[memberId]/finance-impact/route.ts` debe alinearse al schema real de `member_capacity_economics` o consumir el reader compartido para evitar drift futuro.

## Acceptance Criteria

- [x] Existe un reader/shared contract `member_actual` basado en `member_capacity_economics`.
- [x] Existe un bridge persistido persona -> `sellable_role` reusable por worker y engine.
- [x] Existe un reader/shared contract de costo blended por rol con snapshot persistido por periodo.
- [x] Personas y payroll no se duplican en un dominio paralelo.
- [x] El engine puede distinguir `member_actual` de `role_blended`.
- [x] El worker `people` materializa el agregado blended sin mover esta responsabilidad a `ops-worker`.
- [x] El consumer People finance impact deja de depender de columnas inexistentes.

## Verification

- `pnpm exec vitest run src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src | rg -v "src/lib/postgres/client.ts"`

## Delta 2026-04-19

- Se corrigió la spec tras auditoría del repo real.
- `TASK-475` y `TASK-476` ya no bloquean la ejecución de esta task.
- Se explicitó el bridge faltante persona -> rol comercial como parte obligatoria del alcance.
- Se explicitó que `role_blended` requiere snapshot persistido propio y que el scope correcto de materialización es `commercial-cost-worker` `people`.
- Se agregó el hardening de `src/app/api/people/[memberId]/finance-impact/route.ts` al alcance por drift detectado contra el schema real.
- Se implementó la migración `20260419141717643_task-479-people-actual-cost-blended-role-snapshots.sql` con:
  - `greenhouse_commercial.member_role_cost_basis_snapshots`
  - `greenhouse_commercial.role_blended_cost_basis_snapshots`
- Se agregó `src/lib/commercial-cost-basis/people-role-cost-basis.ts` como capa reusable para:
  - reader `member_actual`
  - bridge persona -> rol comercial con confidence/provenance
  - snapshot `role_blended` por `role_id + employment_type_code + period`
- `commercial-cost-worker` scope `people` ahora materializa `member_capacity_economics` + bridge persona/rol + snapshot `role_blended` en la misma corrida batch.
- `pricing-engine-v2` ahora distingue explícitamente `member_actual`, `role_blended`, `role_modeled` y `tool_snapshot`, y prefiere `role_blended` antes de caer al costo modelado del catálogo.
- `GET /api/people/[memberId]/finance-impact` y `person-360/facets/costs` quedaron alineados al schema real vía el reader compartido, eliminando la dependencia de columnas inexistentes en `member_capacity_economics`.
