# TASK-479 — People Actual Cost + Blended Role Cost Snapshots

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-476`, `TASK-475`
- Branch: `task/TASK-479-people-actual-cost-blended-role-snapshots`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la capa de costo comercial por persona real y costo blended por rol reutilizando `member_capacity_economics`, payroll factual y foundations comerciales ya existentes. La task debe permitir que el pricing engine resuelva tanto `member_actual` como `role_blended` sin duplicar personas ni mover ownership fuera de payroll/serving.

## Why This Task Exists

Para cotizar bien, Greenhouse necesita dos cosas:

- costo real cuando existe una persona concreta;
- costo blended por rol cuando no existe o no conviene fijar una persona.

La base ya existe en `greenhouse_serving.member_capacity_economics` y en payroll factual, pero aún no está empaquetada como cost basis comercial reusable por el engine.

## Goal

- Reusar `member_capacity_economics` como fuente comercial principal de costo real por persona.
- Derivar o materializar costo blended por rol usando snapshots reales y foundations comerciales.
- Exponer readers consistentes con provenance/confidence/freshness.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/tasks/complete/TASK-468-payroll-commercial-employment-types-unification.md`

Reglas obligatorias:

- `member_capacity_economics` es la fuente comercial principal de costo real por persona.
- Payroll sigue siendo owner factual y solo se consume cuando hace falta enriquecer o explicar.
- No crear otra identidad de persona comercial.

## Dependencies & Impact

### Depends on

- `src/lib/member-capacity-economics/store.ts`
- `src/lib/people/get-people-list.ts`
- `src/lib/commercial/sellable-roles-store.ts`
- `src/app/api/people/[memberId]/finance-impact/route.ts`

### Blocks / Impacts

- `TASK-480`
- `TASK-481`

### Files owned

- `src/lib/member-capacity-economics/store.ts`
- `src/lib/people/get-people-list.ts`
- `src/app/api/people/[memberId]/finance-impact/route.ts`
- `src/lib/commercial/sellable-roles-store.ts`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- `member_capacity_economics`
- payroll factual
- foundations de roles y employment types

### Gap

- No existe una capa explícita de `member_actual` y `role_blended` reusable por el pricing engine.
- Falta provenance/confidence compartida para costo persona/rol.

## Scope

### Slice 1 — Actual person cost reader

- Resolver costo real comercial por persona desde `member_capacity_economics`.

### Slice 2 — Blended role cost snapshot

- Derivar o materializar costo blended por rol a partir de evidencia real y foundations comerciales.

### Slice 3 — Shared contract

- Dejar un contrato reusable para engine/UI con:
  - monto
  - moneda
  - `sourceKind`
  - `sourceRef`
  - `snapshotDate`
  - `confidence`

## Out of Scope

- UI del quote builder.
- Costos de tools.
- Catálogo modelado de roles.

## Acceptance Criteria

- [ ] Existe un reader/shared contract de costo real por persona.
- [ ] Existe un reader/shared contract de costo blended por rol.
- [ ] Personas y payroll no se duplican en un dominio paralelo.
- [ ] El engine puede distinguir `member_actual` de `role_blended`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
