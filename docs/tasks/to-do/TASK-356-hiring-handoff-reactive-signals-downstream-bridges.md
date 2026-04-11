# TASK-356 — Hiring Handoff, Reactive Signals & Downstream Bridges

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
- Branch: `task/TASK-356-hiring-handoff-reactive-signals-downstream-bridges`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1 + RESEARCH-003`
- GitHub Issue: `none`

## Summary

Materializar el `HiringHandoff`, los eventos `hiring.*`, las señales institucionales y los bridges downstream con `People`, `HRIS`, `Staff Augmentation` y lanes reactivas del portal.

## Why This Task Exists

La architecture de `Hiring / ATS` no termina en la UI. Para que el dominio sea realmente útil, necesita:

- handoff explícito hacia `member`, `assignment` y `placement`
- eventos institucionales `hiring.*`
- signals de riesgo, shortlist y estancamiento
- proyecciones y consumers downstream

Sin esta task, el ATS quedaría como silo de captura/seguimiento y no como capa real de fulfillment conectada al resto del grafo Greenhouse.

## Goal

- Materializar `HiringHandoff` como boundary object operativo
- Publicar eventos y señales del dominio
- Conectar el dominio con `People`, `HRIS`, `Staff Augmentation` y proyecciones downstream reales

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`

Reglas obligatorias:

- `HiringHandoff` debe ser explícito y auditable
- `Hiring / ATS` no crea `placement` silenciosamente
- `Hiring / ATS` no redefine `member`, payroll ni cost truth
- los eventos `hiring.*` deben entrar al control plane reactivo existente, no a un bus paralelo

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`

## Dependencies & Impact

### Depends on

- `TASK-353`
- `src/lib/staff-augmentation/store.ts`
- `src/lib/person-360/person-complete-360.ts`
- `src/lib/sync/projections`
- `src/lib/people/get-person-detail.ts`

### Blocks / Impacts

- bridge `selected application -> handoff -> assignment -> placement`
- surfacing hiring-aware en `People` / `Person 360`
- ops/reactive visibility del dominio
- futuras notificaciones y alertas de cobertura

### Files owned

- `src/lib/sync`
- `src/lib/person-360`
- `src/lib/people`
- `src/lib/staff-augmentation`
- `src/app/api`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- infraestructura reactiva institucional:
  - `src/lib/sync/projections`
  - `src/lib/sync/projections/staff-augmentation.ts`
- foundations downstream relevantes:
  - `src/lib/staff-augmentation/store.ts`
  - `src/lib/person-360/person-complete-360.ts`
  - `src/lib/people/get-person-detail.ts`
- research detallado de eventos/señales en `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`

### Gap

- no existe `HiringHandoff`
- no existe catálogo runtime de eventos `hiring.*`
- no existen señales o proyecciones hiring-aware materializadas
- no existe bridge explícito hacia `assignment` / `placement`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Handoff object + service flow

- Materializar `HiringHandoff`
- Resolver transitions y estados mínimos hacia HR / assignment / placement
- Evitar side effects ocultos o no auditables

### Slice 2 — Event catalog + signals

- Publicar eventos `hiring.*`
- Publicar señales institucionales como:
  - `shortlist_ready`
  - `coverage_risk`
  - `opening_stalled`
  - `handoff_ready`

### Slice 3 — Downstream bridges

- Conectar el handoff y las señales con:
  - `People` / `Person 360`
  - `Staff Augmentation`
  - consumers reactivos relevantes del repo

## Out of Scope

- landing pública de careers
- desk interno principal del ATS
- scorecards avanzados o analítica predictiva
- automatizaciones externas complejas fuera del control plane actual

## Detailed Spec

La task debe dejar explícito:

- cómo se evita crear `member` demasiado pronto
- cómo se registra un caso `selected for staff_augmentation` sin crear todavía el placement
- cómo se traduce el handoff a runtime downstream cuando llega el momento correcto
- qué subset de señales amerita notificación/ops en esta primera iteración

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `HiringHandoff` como contrato runtime explícito y auditable
- [ ] Existen eventos `hiring.*` y señales institucionales mínimas publicadas en el control plane reactivo existente
- [ ] Existe bridge explícito desde `Hiring / ATS` hacia `People`, `HRIS` o `Staff Augmentation` sin side effects ocultos

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validación manual del flujo: application seleccionada -> handoff -> downstream state esperado

## Closing Protocol

- [ ] Verificar que los eventos y señales quedan registrados en el control plane institucional y no en un bus ad hoc
- [ ] Documentar en `Handoff.md` cualquier contrato de handoff o señal que cambie follow-ons de `People`, `Staff Aug` o `Agency`

## Follow-ups

- consumers hiring-aware en `Person 360`
- observabilidad/ops health específica del dominio `Hiring`

## Open Questions

- si la primera iteración del handoff debe incluir creación automática de `assignment` en algunos modos o si conviene dejarlo explícitamente humano-asistido
