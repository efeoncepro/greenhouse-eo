# TASK-315 — Talent Taxonomy & Canonical Professional Model

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
- Domain: `data`
- Blocked by: `TASK-313`
- Branch: `task/TASK-315-talent-taxonomy-canonical-model`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar el modelo canónico del perfil profesional para separar `skills`, `herramientas`, `certificaciones`, `especialidades`, `idiomas`, links profesionales y datos de presentación. Esta task evita que el sistema escale sobre arrays legacy ambiguos y prepara search, trust y client-safe surfacing.

## Why This Task Exists

Hoy el repo mezcla distintos conceptos bajo campos livianos de HR Core (`skills`, `tools`, `notes`, `linkedinUrl`, `portfolioUrl`) y el canon de `TASK-157` solo cubre `skills` para staffing. Eso no alcanza para un sistema enterprise de talento. Sin una taxonomía canónica:

- skill, herramienta y certificación se confunden
- no se puede buscar o rankear de forma consistente
- la verificación no tiene un objeto claro sobre el cual operar
- se rompe la evolución hacia perfiles cliente-safe y evidencia reusable

## Goal

- Separar canónicamente las dimensiones del perfil profesional
- Dejar un contrato estable y extensible para trust, search y surfaces cliente
- Reducir dependencia de arrays sueltos como storage o API surface final

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`

Reglas obligatorias:

- `TASK-157` sigue siendo el canon de skills para staffing; esta task lo amplía, no lo reemplaza arbitrariamente.
- Nuevas estructuras deben colgar del objeto persona/miembro canónico.
- No crear catálogos paralelos si el repositorio ya tiene un catálogo base reutilizable o extensible.
- Si la taxonomía necesita representación visual, debe modelar tokens reusables de iconografía de forma compatible con el stack del repo (`tabler-*` para categorías internas, logos bundleados/`BrandLogo` para marcas), sin depender de assets AI como source of truth.

## Normative Docs

- `docs/tasks/to-do/TASK-313-skills-certifications-profile-crud.md`
- `docs/tasks/complete/TASK-157-skills-matrix-staffing.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-313-skills-certifications-profile-crud.md`
- `src/lib/agency/skills-staffing.ts`
- `src/types/agency-skills.ts`
- `src/lib/hr-core/service.ts`
- `src/types/hr-core.ts`

### Blocks / Impacts

- `TASK-316`
- `TASK-317`
- `TASK-318`
- `TASK-319`
- `TASK-320`

### Files owned

- `src/lib/agency/skills-staffing.ts`
- `src/types/agency-skills.ts`
- `src/lib/hr-core/service.ts`
- `src/types/hr-core.ts`
- `migrations/[verificar]`
- `src/types/db.d.ts`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

## Current Repo State

### Already exists

- `greenhouse_core.skill_catalog`
- `greenhouse_core.member_skills`
- `src/lib/hr-core/service.ts` con `skills`, `tools`, `linkedinUrl`, `portfolioUrl`, `notes`
- surfaces reales en `Mi perfil` y `Admin > Usuario`

### Gap

- no existe taxonomía formal que separe skill, herramienta, certificación, especialidad, idioma y links profesionales
- arrays HR Core siguen siendo insuficientes como contrato enterprise

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Taxonomy split

- Definir el modelo canónico para:
  - skills
  - herramientas/plataformas
  - certificaciones
  - especialidades/disciplinas [verificar si queda en esta fase o follow-on]
  - idiomas [verificar]
  - links profesionales
  - `about` y datos de presentación
- Definir también cómo se representa visualmente cada lane sin ambigüedad:
  - categoría semántica interna -> token Tabler
  - plataforma/marca externa -> identificador de logo reusable
  - sin almacenar blobs o SVG generados ad hoc como contrato primario

### Slice 2 — Storage & readers

- Implementar tablas o extensiones necesarias para que cada lane tenga storage claro
- Dejar readers y tipos reutilizables para surfaces self/admin/client-safe
- Resolver compatibilidad con campos existentes de HR Core sin romper consumers vigentes

### Slice 3 — Backward compatibility

- Mantener compatibilidad razonable con `TASK-157` y con el perfil HR actual
- Documentar qué campos quedan legacy, qué campos quedan como fallback y cuál es la nueva source of truth

## Out of Scope

- workflow de verificación admin
- búsqueda/ranking
- surfacing cliente

## Detailed Spec

Separaciones mínimas esperadas:

- `Skill`: capacidad profesional con seniority
- `Tool`: dominio de herramienta/plataforma
- `Certification`: credential formal con issuer, vigencia y evidencia
- `ProfessionalLink`: social/profile URL con tipo
- `ProfileNarrative`: `about`, headline y otros campos de presentación

La salida de esta task debe permitir responder sin ambigüedad:

- qué sabe hacer una persona
- con qué herramientas trabaja
- qué credenciales formales tiene
- qué parte puede ser visible al cliente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una taxonomía canónica separando al menos skill, herramienta, certificación y links profesionales
- [ ] `TASK-157` sigue funcionando como base de staffing sin ambigüedad de source of truth
- [ ] Los tipos y readers permiten consumo consistente por self/admin/client-safe
- [ ] La documentación deja claro qué campos quedan legacy y cuáles canónicos
- [ ] La taxonomía deja claro qué iconografía se resuelve por semántica interna y qué iconografía se resuelve por marca externa

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- revisión manual de compatibilidad de payloads en `Mi perfil` y `Admin > Usuario`

## Closing Protocol

- [ ] Actualizar `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- [ ] Actualizar `project_context.md` si cambia el contrato canónico del perfil profesional

## Follow-ups

- `TASK-316`
- `TASK-317`
- `TASK-319`

## Open Questions

- si `idiomas` entra en este corte o en un follow-on posterior
- si `especialidad` vive como taxonomía propia o como agrupación de skills
