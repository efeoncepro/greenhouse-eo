# TASK-353 — Hiring / ATS Domain Foundation

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
- Blocked by: `none`
- Branch: `task/TASK-353-hiring-ats-domain-foundation`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Materializar la foundation transaccional de `Hiring / ATS`: `TalentDemand`, `HiringOpening`, `CandidateFacet`, `HiringApplication`, publication contract del opening y servicios/API base para que el resto del programa no nazca sobre mocks o modelos implícitos.

## Why This Task Exists

La arquitectura ya define el dominio, pero el repo todavía no tiene un backbone runtime donde anclar:

- intake de demanda
- openings reales
- candidate facet sobre `Person`
- applications como unidad del pipeline
- proyección pública del opening

Sin esta task, la landing pública, el desk interno y el handoff downstream tendrían que inventar modelos paralelos o trabajar sobre `placement`/`member` antes de tiempo.

## Goal

- Crear la foundation runtime del dominio `Hiring / ATS`
- Dejar explícito el contrato entre opening interno y opening público
- Exponer un carril inicial de services/API para demanda, opening, candidate facet y application

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

Reglas obligatorias:

- `Person` sigue siendo la raíz humana canónica; `CandidateFacet` no crea un root paralelo
- `HiringApplication` es la unidad transaccional del pipeline
- el opening público es una proyección controlada del `HiringOpening` interno
- esta task no crea `member`, `assignment` ni `placement`

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `src/lib/person-360/person-complete-360.ts`
- `src/lib/people/get-person-detail.ts`
- `src/lib/staff-augmentation/store.ts`
- `src/lib/storage/greenhouse-assets.ts`

### Blocks / Impacts

- `TASK-354`
- `TASK-355`
- `TASK-356`
- futuros consumers hiring-aware en `People` y `Agency`

### Files owned

- `src/lib`
- `src/app/api`
- `src/types`
- `src/lib/person-360`
- `src/lib/people`
- `src/lib/storage/greenhouse-assets.ts`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `project_context.md`

## Current Repo State

### Already exists

- foundations persona-first:
  - `src/lib/person-360/person-complete-360.ts`
  - `src/lib/people/get-person-detail.ts`
  - `src/lib/people/get-people-list.ts`
- runtime Staff Aug sobre assignment -> placement:
  - `src/lib/staff-augmentation/store.ts`
  - `src/app/api/agency/staff-augmentation/placements/route.ts`
- upload/access shared de adjuntos:
  - `src/lib/storage/greenhouse-assets.ts`
  - `src/app/api/assets/private/route.ts`

### Gap

- no existen aggregates ni services runtime de `Hiring / ATS`
- no existe publication contract para openings públicos
- no existe API base para demanda/opening/application/candidate facet

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Aggregate foundation

- Materializar los aggregates transaccionales mínimos del dominio:
  - `TalentDemand`
  - `HiringOpening`
  - `CandidateFacet`
  - `HiringApplication`
- Dejar explícito el ownership de schema/servicio según el modelo final elegido en implementación

### Slice 2 — Services + API baseline

- Crear service layer y API contracts iniciales para:
  - crear/listar/actualizar `TalentDemand`
  - crear/listar/actualizar `HiringOpening`
  - reconciliar `CandidateFacet` sobre `Person`
  - crear/listar `HiringApplication`

### Slice 3 — Public opening publication contract

- Materializar la proyección pública del opening
- Soportar `visibility` y `publicationStatus`
- Definir el payload público mínimo que consumirá la landing de careers

## Out of Scope

- landing pública de vacantes
- UI interna del Hiring Desk
- publication workflow UI
- handoff a HR / assignment / placement
- projections reactivas downstream profundas

## Detailed Spec

El slice debe dejar explícitos:

- contrato de deduplicación `Person <-> CandidateFacet`
- source normalization incluyendo `public_careers`
- frontera entre datos internos del opening y payload público derivado
- payload mínimo de `HiringApplication` para que `TASK-354` y `TASK-355` no dependan de mocks

Si el schema final no existe hoy en el repo, la task debe:

- declararlo en la migration
- dejar delta corto en arquitectura
- evitar mezclar `Hiring / ATS` como extensión informal de `staff_aug_placements`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen aggregates y service/API baseline para `TalentDemand`, `HiringOpening`, `CandidateFacet` y `HiringApplication`
- [ ] La publicación pública del opening queda resuelta como proyección derivada del opening interno
- [ ] La reconciliación de candidate facet reutiliza `Person` como raíz canónica

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validación manual de API contracts para demanda, opening y application

## Closing Protocol

- [ ] Dejar delta corto en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` si el schema/contract final cambia respecto de la spec actual
- [ ] Registrar en `Handoff.md` cualquier decisión de schema, dedup o publication contract que condicione `TASK-354` a `TASK-356`

## Follow-ups

- `TASK-354`
- `TASK-355`
- `TASK-356`

## Open Questions

- si la primera iteración del schema vive completamente en un dominio nuevo o si requiere apoyo temporal de una tabla/faceta en `greenhouse_core`
