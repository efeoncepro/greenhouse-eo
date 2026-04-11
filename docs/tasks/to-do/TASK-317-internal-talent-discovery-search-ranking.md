# TASK-317 — Internal Talent Discovery: Search, Filters & Ranking

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-315`, `TASK-316`
- Branch: `task/TASK-317-internal-talent-discovery-search-ranking`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-04-11 (TASK-316)

- TASK-316 completada — verification_status en skills/tools/certs, cola admin /admin/talent-review, reject con reason. Search puede filtrar por verification_status.

## Delta 2026-04-11

- TASK-313 completada — ahora existe: `member_skills` y `member_certifications` con datos queryables (seniority, verification_status, visibility, issuer, expiry_date), readers en `src/lib/hr-core/certifications.ts` y skills service extendido con funciones de lectura
- Impacto: las tablas base para búsqueda y filtrado ya existen con señal de verificación y seniority; esta task puede construir search/ranking sobre data real en vez de diseñar storage

## Summary

Crear la capa interna de descubrimiento de talento: búsqueda, filtros y ranking sobre perfiles profesionales verificados, integrando skills, certificaciones, herramientas y disponibilidad operativa. El objetivo es que staffing y operaciones puedan encontrar a la persona correcta rápidamente.

## Why This Task Exists

Un perfil completo no sirve a escala si no se puede descubrir bien. Para un comportamiento tipo marketplace enterprise faltan:

- filtros potentes
- ranking útil
- señal de disponibilidad real
- diferenciación entre autodeclarado y verificado

Sin eso, la data existe pero no se convierte en capacidad operativa.

## Goal

- Permitir búsqueda y filtrado de talento interno con señal de confianza
- Integrar disponibilidad/capacidad existente con perfil profesional
- Dejar una base reusable para staffing y futuras surfaces de talento

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- La disponibilidad se consume desde runtime/capacidad ya existente; no inventar un segundo motor.
- El ranking no puede tratar data parcial o autodeclarada como equivalente a data verificada.
- Las búsquedas deben quedar tenant-safe cuando aplique.

## Normative Docs

- `docs/tasks/complete/TASK-157-skills-matrix-staffing.md`
- `docs/tasks/to-do/TASK-315-talent-taxonomy-canonical-model.md`
- `docs/tasks/to-do/TASK-316-talent-trust-ops-verification-governance.md`

## Dependencies & Impact

### Depends on

- `TASK-315`
- `TASK-316`
- `src/lib/agency/skills-staffing.ts`
- `src/lib/member-capacity-economics/store.ts`
- `src/app/(dashboard)/agency/team/page.tsx`
- `src/views/agency/AgencyTeamView.tsx`

### Blocks / Impacts

- staffing operativo
- staffing cross-space futuro
- client-safe talent selection

### Files owned

- `src/app/(dashboard)/agency/team/page.tsx`
- `src/views/agency/AgencyTeamView.tsx`
- `src/lib/agency/skills-staffing.ts`
- `src/types/agency-skills.ts`
- `src/app/api/[verificar]`

## Current Repo State

### Already exists

- `TASK-157` ya entrega cobertura de skills por space
- existe `member_capacity_economics`
- existe surface `Agency > Team`

### Gap

- no existe buscador interno robusto por skill/certificación/herramienta/disponibilidad
- no existe ranking unificado de señal profesional + capacidad

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Query and ranking layer

- Implementar búsqueda y filtros sobre:
  - skills
  - certificaciones
  - herramientas
  - verificación
  - disponibilidad
  - seniority
  - [verificar: idioma / ubicación si ya existe data suficiente]
- Publicar un ranking interpretable para operaciones

### Slice 2 — Agency surface

- Adaptar `Agency > Team` o su surface real para incluir:
  - filtro facetado
  - tarjetas o tabla comparables
  - estado de disponibilidad
  - señal de verificación

### Slice 3 — Staffing integration

- Exponer el mismo reader/ranking para futuras acciones de staffing cross-space
- Evitar duplicación con el engine existente de `TASK-157`

## Out of Scope

- surfacing cliente
- endorsements
- workflow admin de verificación

## Detailed Spec

El ranking debe ponderar al menos:

- fit por skill/certificación
- verificación
- disponibilidad/capacidad
- vigencia de certificaciones si aplica

La UI debe permitir:

- búsqueda libre
- filtros facetados
- ordenar por mejor fit / más disponible / más verificado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una surface interna de discovery con búsqueda, filtros y ranking
- [ ] El ranking distingue verificado vs autodeclarado
- [ ] La disponibilidad usa el runtime existente, no una recomposición paralela
- [ ] Staffing puede reutilizar el reader/ranking sin duplicar lógica

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual en la surface `Agency > Team`

## Closing Protocol

- [ ] Documentar la fórmula/heurística de ranking en el documento adecuado

## Follow-ups

- `TASK-318`
- staffing cross-space más automatizado

## Open Questions

- si la surface final vive enteramente en `Agency > Team` o requiere una vista dedicada de discovery
