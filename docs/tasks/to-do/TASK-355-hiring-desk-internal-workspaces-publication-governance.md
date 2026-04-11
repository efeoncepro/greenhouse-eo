# TASK-355 — Hiring Desk Internal Workspaces & Publication Governance

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
- Domain: `agency`
- Blocked by: `TASK-353`
- Branch: `task/TASK-355-hiring-desk-internal-workspaces-publication-governance`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Construir los workspaces internos de `Hiring / ATS`: `Demand Desk`, `Pipeline Board`, `Application 360` y `Publication Desk`, reutilizando patrones de Vuexy/MUI ya existentes en el repo y en `full-version`.

## Why This Task Exists

La arquitectura ya define surfaces claras para operar el dominio, pero hoy no existe ninguna surface interna de `Hiring / ATS`. Sin esta task:

- la demanda no tiene consola institucional
- el pipeline no tiene board real
- las applications no tienen 360 operativo
- la publicación pública no tiene carril de gobernanza interno

## Goal

- Materializar los workspaces internos principales del ATS
- Reutilizar el pattern correcto de tabla + kanban + detail shell + publication desk
- Conectar la operación interna al foundation runtime real de `TASK-353`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`

Reglas obligatorias:

- el kanban debe mover `HiringApplication`, no personas sueltas
- el detail shell debe respetar el pattern sidebar + tabs cuando aplique, adaptado al dominio real
- la publication governance interna no debe exponer lógica paralela al opening, sino controlar la proyección pública derivada
- no copiar demos de `full-version` tal cual; adaptar semantics y copy al contexto Greenhouse

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-353`
- `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`
- `src/views/greenhouse/people/PersonView.tsx`
- `src/views/greenhouse/people/PeopleList.tsx`
- `src/components/greenhouse`

### Blocks / Impacts

- operación diaria del dominio `Hiring / ATS`
- governance de openings públicos
- futura integración hiring-aware con `People` y `Agency`

### Files owned

- `src/app/(dashboard)`
- `src/views/greenhouse`
- `src/components/greenhouse`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- patterns internos útiles:
  - `src/views/greenhouse/people/PeopleList.tsx`
  - `src/views/greenhouse/people/PersonView.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.tsx`
- research/UI references ya contrastadas con Vuexy:
  - kanban app de `full-version`
  - user view shell de `full-version`
  - table + filters de `full-version`

### Gap

- no existe `Hiring Desk`
- no existe board interno del pipeline
- no existe `Application 360`
- no existe `Publication Desk`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Demand Desk

- Crear lista institucional de demandas/openings con filtros y KPIs básicos
- Permitir drilldown hacia pipeline, application o publication governance

### Slice 2 — Pipeline Board + Application 360

- Crear board kanban para `HiringApplication`
- Crear `Application 360` o shell equivalente con overview, evaluations, blockers, decision y handoff

### Slice 3 — Publication Desk

- Crear surface interna para revisar y gobernar qué openings se publican externamente
- Permitir revisar copy, estado de publicación y acciones de pausar/cerrar/publicar

## Out of Scope

- landing pública de vacantes
- foundation transaccional de `Hiring / ATS`
- bridge runtime profundo hacia HR / Staff Aug
- scoring automático avanzado o IA evaluativa

## Detailed Spec

El target UX debe tomar de Vuexy:

- tabla filtrable para `Demand Desk`
- kanban para `Pipeline Board`
- shell tipo detail/360 para `Application`

pero adaptado al dominio real:

- copy en español
- CTAs y labels de negocio reales
- no usar demo semantics (`task`, `project`, `deal`) como si fueran válidas para hiring

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un `Demand Desk` usable sobre los openings/demandas reales del dominio
- [ ] Existe un `Pipeline Board` donde cada tarjeta representa una `HiringApplication`
- [ ] Existe un `Application 360` y un `Publication Desk` conectados al foundation runtime real

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validación manual interna: Demand Desk -> Pipeline -> Application 360 -> Publication Desk

## Closing Protocol

- [ ] Verificar visualmente que el kanban no degrade el layout y que el detail shell mantenga estabilidad responsive
- [ ] Dejar en `Handoff.md` qué patterns de Vuexy quedaron adoptados y qué piezas fueron deliberadamente descartadas

## Follow-ups

- Talent Pool explícito si el dominio lo necesita como surface separada
- hiring-aware summaries dentro de `People` o `Agency`

## Open Questions

- si `Demand Desk` y `Publication Desk` conviene dejarlos en una misma route con tabs o como dos routes hermanas desde la primera iteración
