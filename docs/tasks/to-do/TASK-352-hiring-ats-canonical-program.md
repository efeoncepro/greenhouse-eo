# TASK-352 — Hiring / ATS Canonical Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-352-hiring-ats-canonical-program`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Coordinar la materialización de `Hiring / ATS` como dominio canónico de Greenhouse: foundation transaccional, landing pública de vacantes, desks internos de operación/publicación y handoff explícito hacia `member`, `assignment` y `placement`.

## Why This Task Exists

La arquitectura ya dejó explícito que `Hiring / ATS` debe ser una capa canónica de fulfillment de talento para Efeonce y que además debe soportar una landing pública de vacantes sin crear un pipeline paralelo. Pero hoy el repo todavía no tiene:

- aggregates runtime de `TalentDemand`, `HiringOpening`, `CandidateFacet`, `HiringApplication` y `HiringHandoff`
- routes o surfaces públicas de careers
- un `Hiring Desk` interno para demanda, pipeline, publicación y handoffs
- eventos/proyecciones de `hiring.*` que conecten con `People`, `HRIS`, `Staff Augmentation` y `Agency`

Sin una umbrella explícita, el módulo correría el riesgo de nacer partido entre UI pública, sourcing interno y bridges downstream.

## Goal

- Coordinar la secuencia de tasks que materializan `Hiring / ATS` como dominio operativo real
- Separar foundation del modelo, careers público, desk interno y handoff/reactividad
- Alinear el futuro rollout con `People`, `HRIS`, `Staff Augmentation`, `Team Capacity` y `Agency`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- `Person` sigue siendo la raíz humana canónica; `candidate` no puede nacer como identidad paralela
- `HiringApplication` es la unidad transaccional del pipeline y la unidad visual del kanban
- la landing pública de vacantes debe resolver como lens público del mismo `HiringOpening`
- `Hiring / ATS` no puede absorber `member`, `assignment`, `placement`, payroll ni margin como source of truth

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- `src/lib/person-360/person-complete-360.ts`
- `src/lib/staff-augmentation/store.ts`

### Blocks / Impacts

- `TASK-353`
- `TASK-354`
- `TASK-355`
- `TASK-356`
- futuros readers hiring-aware en `People`, `Agency` y `Person 360`

### Files owned

- `docs/tasks/to-do/TASK-353-hiring-ats-domain-foundation.md`
- `docs/tasks/to-do/TASK-354-public-careers-landing-apply-intake.md`
- `docs/tasks/to-do/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- `docs/tasks/to-do/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`

## Current Repo State

### Already exists

- spec canónica del dominio en `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- research reactivo previo en `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- foundations relevantes ya materializadas:
  - `src/lib/person-360/person-complete-360.ts`
  - `src/lib/people/get-person-detail.ts`
  - `src/lib/staff-augmentation/store.ts`
  - `src/lib/storage/greenhouse-assets.ts`
  - `src/app/api/assets/private/route.ts`
  - `src/app/api/agency/staffing/route.ts`

### Gap

- no existe un programa runtime explícito para bajar la arquitectura de `Hiring / ATS` a aggregates, API, UI pública, UI interna y bridges reactivos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Domain foundation

- `TASK-353` — aggregates, services, API contract y publicación pública derivada del opening

### Slice 2 — Public candidate entry

- `TASK-354` — landing pública de vacantes, detail público y apply intake

### Slice 3 — Internal workspaces

- `TASK-355` — Demand Desk, Pipeline Board, Application 360 y Publication Desk

### Slice 4 — Downstream runtime bridges

- `TASK-356` — handoff, eventos `hiring.*`, signals y bridges con HR/Staff Aug/People

## Out of Scope

- implementación runtime directa dentro de esta umbrella
- motor avanzado de scoring IA
- marketplace externo completo de talento
- micrositios multi-tenant por cliente en la primera iteración

## Detailed Spec

Secuencia recomendada:

1. `TASK-353`
2. `TASK-354`
3. `TASK-355`
4. `TASK-356`

Dependencias lógicas:

- `353 -> 354`
- `353 -> 355`
- `353 -> 356`
- `354` y `355` pueden avanzar en paralelo una vez cerrada `353`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una secuencia explícita de child tasks para foundation, careers público, desk interno y handoff/reactividad
- [ ] Cada child task tiene ownership, dependencia y alcance distinguible
- [ ] La umbrella no mezcla coordinación de programa con implementación directa

## Verification

- Revisión manual de consistencia documental
- Verificar que `TASK-353` a `TASK-356` existen y están indexadas correctamente

## Closing Protocol

- [ ] Mantener `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` alineados con el programa

## Follow-ups

- futuros readers hiring-aware en `Person 360`
- futura capa de analytics/conversion del careers público

## Open Questions

- si `Talent Pool` debe entrar dentro de `TASK-355` o si amerita un follow-on propio una vez exista foundation suficiente
