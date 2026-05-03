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
- Epic: `EPIC-011`
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
- `CandidateFacet` debe anclarse a `identity_profile` / `Person`; `member_id` solo aparece si la persona ya tiene faceta colaborador o si un handoff aprobado la crea/promueve downstream.
- El programa debe declarar ambos planos de acceso: `views` para surfaces visibles y `entitlements/capabilities` para acciones finas.
- Ninguna child task puede abrir write lanes públicas sin consentimiento, rate limiting, sanitización y reuso del storage privado GCP existente para adjuntos (`GREENHOUSE_PRIVATE_ASSETS_BUCKET` + `greenhouse_core.assets`).

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
- `TASK-770`
- futuros readers hiring-aware en `People`, `Agency` y `Person 360`

### Files owned

- `docs/tasks/to-do/TASK-353-hiring-ats-domain-foundation.md`
- `docs/tasks/to-do/TASK-354-public-careers-landing-apply-intake.md`
- `docs/tasks/to-do/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- `docs/tasks/to-do/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`
- `docs/tasks/to-do/TASK-770-hiring-to-hris-collaborator-activation.md`

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
- Incluye schema domain-per-schema `greenhouse_hiring` y contrato explícito con `identity_profile`, no tablas sueltas bajo módulos vecinos.

### Slice 2 — Public candidate entry

- `TASK-354` — landing pública de vacantes, detail público y apply intake
- Incluye guardrails de entrada pública: consentimiento, abuso/spam, privacidad, retención y adjuntos privados sobre la capability shared de assets existente.

### Slice 3 — Internal workspaces

- `TASK-355` — Demand Desk, Pipeline Board, Application 360 y Publication Desk
- Incluye modelo de `views`/`entitlements` para operar demanda, pipeline, publicación y decisión.

### Slice 4 — Downstream runtime bridges

- `TASK-356` — handoff, eventos `hiring.*`, signals y bridges con HR/Staff Aug/People
- El handoff V1 es humano-asistido por defecto; no crea `member`, `assignment` ni `placement` automáticamente.

### Slice 5 — Internal hire activation closure

- `TASK-770` — toma handoffs `internal_hire` aprobados y los convierte vía HRIS/People en `member` + onboarding + colaborador activo cuando readiness está completa
- Cierra el loop end-to-end sin que Hiring cree colaborador, payroll truth ni accesos por side effect.

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
5. `TASK-770`

Dependencias lógicas:

- `353 -> 354`
- `353 -> 355`
- `353 -> 356`
- `354` y `355` pueden avanzar en paralelo una vez cerrada `353`
- `356 -> 770`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una secuencia explícita de child tasks para foundation, careers público, desk interno y handoff/reactividad
- [ ] Cada child task tiene ownership, dependencia y alcance distinguible
- [ ] La umbrella no mezcla coordinación de programa con implementación directa
- [ ] Las Open Questions del programa quedan resueltas antes de tomar `TASK-353`
- [ ] Las child tasks no dejan ownership amplio tipo `src/lib` o `src/app` sin subpaths específicos

## Verification

- Revisión manual de consistencia documental
- Verificar que `TASK-353` a `TASK-356` existen y están indexadas correctamente
- Verificar que cada child task mantiene access model, seguridad pública y handoff explícito sin side effects ocultos

## Closing Protocol

- [ ] Mantener `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` alineados con el programa

## Follow-ups

- futuros readers hiring-aware en `Person 360`
- futura capa de analytics/conversion del careers público
- `TASK-770` para cierre `internal_hire` hasta colaborador activo vía HRIS/People

## Resolved Open Questions

- `Talent Pool` no entra como surface V1 dentro de `TASK-355`. Queda como follow-up propio después de `TASK-353` y `TASK-356`, porque requiere reglas de elegibilidad, retención, búsqueda, consentimiento y deduplicación que exceden el desk operativo inicial.
- La primera implementación usa `greenhouse_hiring` como schema owner del dominio y referencia `greenhouse_core.identity_profiles` / facetas existentes. No se modela Hiring dentro de `staff_aug_placements` ni como extensión informal de HRIS.
- La entrada pública parte centralizada para Efeonce/Greenhouse; micrositios por cliente/practice quedan fuera hasta que exista evidencia de necesidad real y governance de branding.
