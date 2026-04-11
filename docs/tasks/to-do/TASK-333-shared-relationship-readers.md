# TASK-333 — Readers compartidos de relaciones para personas, workspaces y admin

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Blocked by: `TASK-332`
- Branch: `task/TASK-333-shared-relationship-readers`
- Legacy ID: `follow-on de TASK-193 y de la semantica 2026-04-11`
- GitHub Issue: `none`

## Summary

Materializar readers compartidos para que `Mi Perfil`, `People`, `Mi equipo`, `Org Chart`, directorios internos y surfaces admin consuman las relaciones entre personas desde un mismo contrato. La task separa estructura interna, equipos operativos y capacidad extendida en la capa de lectura, evitando que cada componente reconstruya su propia semántica desde `assignments` o desde un directorio plano de miembros.

## Why This Task Exists

Hoy el repo ya tiene piezas fuertes, pero aisladas:

- `Person Complete 360` expone `assignments`, `organization` y `staffAug`
- `/api/my/organization/members` devuelve un directorio plano de la org
- `Supervisor Workspace` compone team/subtree con un contrato propio
- `People detail` y `Org Chart` usan otros readers

El resultado es que varias surfaces terminan deduciendo relaciones en el componente:

- `Mi Perfil` usa `assignments` como si fueran `equipos`
- `Colegas` sale de un flat org directory, no de una red humana relevante
- las capas `estructura` vs `operación` vs `capacidad extendida` no salen explícitas desde backend

## Goal

- Exponer un contrato de lectura explícito para estructura, equipos operativos y capacidad extendida
- Reutilizar ese contrato en las APIs/person readers ya existentes
- Eliminar la dependencia de listas planas o joins ad hoc para resolver relaciones humanas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/schema-snapshot-baseline.sql`

Reglas obligatorias:

- No crear una tabla paralela para estas relaciones; reutilizar `departments`, `reporting_lines`, `client_team_assignments` y lanes de `staff_augmentation`
- `departments` + `reporting_lines` siguen siendo la fuente de estructura formal
- `client_team_assignments` sigue siendo la fuente de equipos operativos
- `staff_augmentation` sigue siendo capacidad operativa externa; no se convierte en jerarquía formal
- Toda query debe respetar tenant isolation y el contexto org/space del consumer
- Nuevos readers deben usar `query`, `getDb` o helpers canónicos del repo; no crear clients DB ad hoc

## Normative Docs

- `docs/tasks/complete/TASK-193-person-organization-synergy-activation.md`
- `docs/tasks/complete/TASK-157-skills-matrix-staffing.md`

## Dependencies & Impact

### Depends on

- `TASK-332`
- `src/lib/person-360/person-complete-360.ts`
- `src/lib/person-360/facets/assignments.ts`
- `src/lib/person-360/facets/organization.ts`
- `src/lib/person-360/facets/staff-aug.ts`
- `src/app/api/person/[id]/360/route.ts`
- `src/app/api/my/organization/members/route.ts`
- `src/lib/hr-core/supervisor-workspace.ts`
- `src/app/api/hr/core/supervisor-workspace/route.ts`
- `src/lib/people/get-person-detail.ts`

### Blocks / Impacts

- `TASK-334` — surfaces y entry points
- `/my/profile`
- `/people`
- `/hr/team`
- `/my/organization`

### Files owned

- `src/lib/person-360/person-complete-360.ts`
- `src/lib/person-360/facets/assignments.ts`
- `src/lib/person-360/facets/organization.ts`
- `src/lib/person-360/facets/staff-aug.ts`
- `src/app/api/person/[id]/360/route.ts`
- `src/app/api/my/organization/members/route.ts`
- `src/lib/hr-core/supervisor-workspace.ts`
- `src/app/api/hr/core/supervisor-workspace/route.ts`
- `src/lib/people/get-person-detail.ts`
- `src/types/person-complete-360.ts`
- `src/types/hr-core.ts`

## Current Repo State

### Already exists

- Person 360 ya tiene facets reales:
  - `assignments`
  - `organization`
  - `staffAug`
- El directorio de organización ya existe en:
  - `src/app/api/my/organization/members/route.ts`
- El workspace supervisor ya existe en:
  - `src/lib/hr-core/supervisor-workspace.ts`
  - `src/app/api/hr/core/supervisor-workspace/route.ts`
- People detail ya agrega información compuesta en:
  - `src/lib/people/get-person-detail.ts`

### Gap

- No existe un reader compartido que exponga capas relacionales explícitas para los consumers
- `/api/my/organization/members` hoy funciona como directorio, pero está siendo tentador usarlo como `colegas`
- `Person 360` expone piezas útiles, pero no una lectura relacional explícita lista para surfaces humanas
- Supervisor workspace, People y profile siguen resolviendo relaciones con contratos distintos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Lane compartida de relaciones

- Crear o consolidar una lane shared sobre readers existentes para separar:
  - estructura interna
  - equipos operativos
  - capacidad extendida
- Reutilizar fuentes canónicas ya materializadas en lugar de recomponerlas en cada route
- Mantener compatibilidad razonable con payloads existentes cuando aplique

### Slice 2 — Adaptación de readers y routes existentes

- Alinear `Person 360` para que sus facets no obliguen al consumer a inferir semántica relacional
- Alinear `/api/my/organization/members` para que quede claro que es `directorio org` y no reemplazo de readers de colaboración
- Alinear supervisor workspace y People detail para consumir la misma separación de capas relacionales

### Slice 3 — Tipos y pruebas

- Endurecer `src/types/person-complete-360.ts` y `src/types/hr-core.ts` con el contrato relacional compartido
- Agregar cobertura de tests a los readers/routes que cambien
- Documentar cualquier deprecación o compatibilidad necesaria para consumers actuales

## Out of Scope

- Rediseño visual de las surfaces
- Nuevos flujos mutantes de HR o Agency
- Reemplazar el staffing engine o recalcular métricas de capacidad inline
- Reabrir el contrato estructural de `Org Chart`

## Detailed Spec

El criterio mínimo de diseño debe ser:

- `estructura` se lee desde `departments` + `reporting_lines`
- `equipos operativos` se leen desde `client_team_assignments` y roster asociado
- `capacidad extendida` se lee desde la capa de `staff_augmentation` y/o assignments operativos marcados como externos
- un directorio organizacional puede seguir existiendo como surface, pero no debe ser la fuente implícita de `colegas` o `mi red`

## Acceptance Criteria

- [ ] Existe una lane de lectura reutilizable para estructura, equipos operativos y capacidad extendida
- [ ] `Person 360`, supervisor workspace y People detail consumen esa separación de capas
- [ ] `/api/my/organization/members` queda semánticamente acotado a directorio org o explícitamente diferenciado del reader relacional
- [ ] Los tipos runtime reflejan el contrato relacional compartido
- [ ] Hay tests de regression para los readers y routes tocados

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- --runInBand [verificar si el repo requiere filtro específico]`
- Validación manual de payloads en:
  - `GET /api/person/me/360`
  - `GET /api/my/organization/members`
  - `GET /api/hr/core/supervisor-workspace`

## Closing Protocol

- [ ] Actualizar documentación viva si cambia el contrato público de `Person 360`
- [ ] Registrar cualquier deprecación o cambio de shape en los consumers que dependan de payloads legacy

## Follow-ups

- `TASK-334` — aterrizar la nueva semántica en surfaces y navegación

## Open Questions

- ¿Conviene que la colaboración operativa viva como facet nueva o como endurecimiento de las facets ya existentes en `Person 360`?
- ¿Qué consumers, además de `My Profile`, necesitan una red humana contextual y no un directorio plano?
