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
- Epic: `EPIC-011`
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
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

Reglas obligatorias:

- `Person` sigue siendo la raíz humana canónica; `CandidateFacet` no crea un root paralelo
- `CandidateFacet` se ancla a `identity_profile_id`; `member_id` es faceta operativa opcional, no llave primaria del candidato.
- `HiringApplication` es la unidad transaccional del pipeline
- el opening público es una proyección controlada del `HiringOpening` interno
- esta task no crea `member`, `assignment` ni `placement`
- La foundation debe dejar listo el contrato para que `TASK-356` pueda convertir `internal_hire` vía HRIS/People sobre el mismo `identity_profile_id`, sin duplicar persona.
- El schema canónico V1 vive en `greenhouse_hiring`; cualquier tabla de apoyo en `greenhouse_core` debe justificarse como faceta cross-domain real.
- Toda query interna debe filtrar por `space_id` o por scope canónico equivalente cuando la entidad sea tenant-scoped.
- Los APIs deben sanitizar errores y no devolver `error.message` raw al cliente.

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

- `migrations/<ts>_task-353-hiring-ats-domain-foundation.sql`
- `src/lib/hiring/**`
- `src/app/api/hiring/**`
- `src/types/hiring.ts`
- `src/types/db.d.ts`
- `src/lib/person-360/**` solo para readers hiring-aware derivados
- `src/lib/people/**` solo para readers hiring-aware derivados
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` si se documentan eventos base
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
- Crear las tablas en `greenhouse_hiring` con IDs estables, `space_id` cuando aplique, timestamps, audit fields, status enums/checks y FKs explícitas hacia `greenhouse_core.identity_profiles`.
- Dejar `CandidateFacet` como relación persona-first: `candidate_facet_id`, `identity_profile_id`, source, readiness, availability, expected rate/band, consent/retention metadata y estado.
- No crear tabla root `candidates` ni copiar PII fuera de `identity_profile` salvo snapshots mínimos justificados.
- Dejar en `HiringApplication` / `HiringDecision` los campos necesarios para downstream: `identity_profile_id`, `candidate_facet_id`, selected destination, tentative start date, expected legal entity/context y prerequisites snapshot si aplica.
- No persistir payroll truth definitiva en Hiring; compensation/rate/budget quedan como propuesta/snapshot hasta confirmación downstream.

### Slice 2 — Services + API baseline

- Crear service layer y API contracts iniciales para:
  - crear/listar/actualizar `TalentDemand`
  - crear/listar/actualizar `HiringOpening`
  - reconciliar `CandidateFacet` sobre `Person`
  - crear/listar `HiringApplication`
- Implementar validación de payload, tenant isolation, capability gates y sanitización de errores.
- Separar endpoints internos de endpoints públicos; esta task solo deja contratos internos/base, no abre apply público.

### Slice 3 — Public opening publication contract

- Materializar la proyección pública del opening
- Soportar `visibility` y `publicationStatus`
- Definir el payload público mínimo que consumirá la landing de careers
- Persistir o derivar un payload público allowlist-only: nunca publicar owners internos, score, economics, budget/rate internos, notas, risk ni cliente confidencial.

### Slice 4 — Access + capability baseline

- Declarar views mínimas esperadas aunque la UI viva en `TASK-355`.
- Declarar capabilities V1:
  - `hiring.demand.read`
  - `hiring.demand.write`
  - `hiring.opening.read`
  - `hiring.opening.write`
  - `hiring.opening.publish`
  - `hiring.application.read`
  - `hiring.application.write`
  - `hiring.application.decide`
- Registrar el delta en catálogo de entitlements/capabilities si el repo lo requiere durante implementación.

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
- payload mínimo de selección para que `TASK-356` pueda crear `HiringHandoff` y HRIS/People pueda revisar creación/promoción de `member`

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
- [ ] No existe root paralelo `candidate`; la faceta referencia `identity_profile_id`
- [ ] Las APIs internas filtran por tenant/scope y no exponen errores raw
- [ ] El ownership de archivos queda acotado a `src/lib/hiring/**`, `src/app/api/hiring/**`, migración, types y docs explícitos
- [ ] La foundation conserva IDs/persona y snapshots mínimos suficientes para handoff `internal_hire` sin crear `member`

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

## Resolved Open Questions

- La primera iteración vive en schema nuevo `greenhouse_hiring`. Solo referencia `greenhouse_core.identity_profiles` como raíz humana y facetas existentes cuando corresponda.
- No se crea `greenhouse_core.candidates` ni se modela `candidate` como root. Si implementación descubre que falta una faceta core reusable, debe documentarse como delta arquitectónico y no improvisarse dentro de Hiring.
- El publication contract queda en Hiring y se consume como allowlist pública por `TASK-354`; no se crea otro modelo público paralelo.
