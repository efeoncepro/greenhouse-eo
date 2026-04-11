# TASK-358 — Assigned Team Semantic Layer & Portfolio Readers

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `task/TASK-358-assigned-team-semantic-layer-portfolio-readers`
- Legacy ID: `follow-on de GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Crear la semantic layer canónica de `Equipo asignado`: tipos, readers y APIs que materializan `ClientWorkforcePortfolio` desde assignments, spaces, perfiles client-safe, capacidad y snapshots de staffing.

## Why This Task Exists

Hoy los datos viven repartidos entre `Space 360`, `Team Capacity`, `Staff Augmentation` y `client-safe profiles`. Eso sirve para surfaces puntuales, pero no alcanza para un capability enterprise reutilizable. Sin este reader unificado, cada vista volvería a recomponer roster, FTE, seniority, skills y health con lógica local.

## Goal

- Materializar un reader canónico `Assigned Team` reusable por cualquier surface
- Normalizar el shape portfolio -> segment -> member sin duplicar verdad
- Exponer APIs y tests para que UI y permissions consuman un contrato estable

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

Reglas obligatorias:

- el root must be `Organization / Space + assignments`, no una tabla nueva de roster
- el reader debe consumir `client-safe` para perfiles visibles y `Team Capacity` para carga/FTE
- las formulas de saturación y coverage no se recalculan ad hoc en cada consumer

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`

## Dependencies & Impact

### Depends on

- `src/lib/team/client-safe-profile.ts`
- `src/lib/team-queries.ts`
- `src/lib/team-capacity/shared.ts`
- `src/lib/member-capacity-economics/store.ts`
- `src/lib/agency/space-360.ts`
- `src/lib/staff-augmentation/store.ts`
- `src/lib/staff-augmentation/snapshots.ts`

### Blocks / Impacts

- `TASK-359`
- `TASK-361`
- `TASK-362`
- `TASK-363`
- `TASK-364`
- `TASK-365`

### Files owned

- `src/lib/assigned-team/*`
- `src/app/api/team/assigned/route.ts`
- `src/app/api/team/assigned/[organizationId]/route.ts`
- `src/types/assigned-team.ts`
- `docs/tasks/to-do/TASK-358-assigned-team-semantic-layer-portfolio-readers.md`

## Current Repo State

### Already exists

- `src/app/api/team/profiles/route.ts` y `src/app/api/team/members/[memberId]/profile/route.ts` publican perfil client-safe
- `src/app/api/team/capacity/route.ts` y `src/app/api/team/capacity-breakdown/route.ts` publican capacidad operativa
- `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx` ya consume semánticas de coverage y members

### Gap

- no existe un reader portfolio enterprise para cliente
- no existe tipado compartido `AssignedTeam` / `ClientWorkforcePortfolio`
- no hay freshness ni lineage documentada por campo para esta capability

## Scope

### Slice 1 — Domain contract

- definir `ClientWorkforcePortfolio`, `AssignedTeamSegment`, `AssignedTalentProfile`
- mapear provenance de cada bloque: assignments, capacity, trust, staffing, performance

### Slice 2 — Readers & API

- crear readers server-side con filtros por organization, space, active-only, grouping
- exponer API cliente-safe para dashboard y módulo principal

### Slice 3 — Quality & tests

- agregar tests de shape, joins, field masking y edge cases de organizaciones sin team
- documentar fallback semantics y freshness markers

## Out of Scope

- componentes visuales del módulo
- policy de permisos y field-level access

## Acceptance Criteria

- [ ] Existe un contrato tipado `Assigned Team` reusable por surfaces cliente-facing
- [ ] El reader unifica assignments, capacidad y perfil client-safe sin duplicar tablas
- [ ] Las APIs nuevas tienen cobertura de tests para casos vacíos, parciales y multi-space

## Verification

- `pnpm test -- assigned-team`
- `pnpm lint`
- `pnpm tsc --noEmit`

## Closing Protocol

- [ ] documentar en `Handoff.md` cualquier decisión de shape o provenance que afecte consumers posteriores

## Follow-ups

- `TASK-359`
- `TASK-361`
- `TASK-363`
