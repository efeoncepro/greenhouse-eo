# TASK-332 — Contrato y gobernanza de superficies relacionales

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `policy`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-332-relationship-surface-contract-governance`
- Legacy ID: `follow-on de la semantica documentada el 2026-04-11`
- GitHub Issue: `none`

## Summary

Formalizar el contrato portal-wide para las relaciones entre personas de Efeonce: `estructura interna`, `equipos operativos`, `trabajo puntual` y `capacidad extendida`. La task define qué superficie consume cada capa, qué módulos la administran y qué labels quedan prohibidos por ambiguos para evitar que `Mi Perfil`, `People`, `Mi equipo`, `Org Chart` y directorios internos reinventen la misma lógica.

## Why This Task Exists

La arquitectura ya dejó explícito que `equipo` no puede seguir usándose como sinónimo de cualquier vínculo entre personas. El gap ahora es operativo: el repo todavía no tiene una matriz canónica que diga qué superficie muestra estructura, cuál muestra colaboración operativa, cuál administra departamentos o supervisoría, y cuál aterriza `staff augmentation` / capacidad extendida.

Sin ese contrato:

- `Mi Perfil` corre el riesgo de hardcodear semántica local
- `Colegas` sigue pudiendo usarse como bolsa plana sin distinguir cercanía estructural vs operativa
- `Mi equipo`, `People`, `Org Chart` y directorios internos pueden divergir en naming y alcance
- la administración de relaciones queda difusa entre HR, Agency, People y Admin

## Goal

- Definir una matriz canónica de superficies relacionales para todo el portal
- Formalizar ownership administrativo por tipo de relación
- Dejar bloqueados los labels y usos ambiguos antes de implementar readers o UX nuevos

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
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- `departments` + `reporting_lines` describen solo estructura interna
- `client_team_assignments` y lanes equivalentes describen equipos operativos, no jerarquía formal
- `staff_augmentation` y capacidad extendida siguen siendo relaciones operativas; no redefinen organigrama ni adscripción estructural
- ninguna surface nueva o existente puede usar `equipo`, `colegas` o `mi equipo` sin declarar explícitamente qué capa representa
- la administración debe reutilizar módulos existentes (`HR > Jerarquía`, `HR > Departamentos`, `Agency > Staff Augmentation`, lanes de assignments) antes de crear otro centro mutante

## Normative Docs

- `docs/documentation/hr/jerarquia-reporte-supervisoria.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/tasks/complete/TASK-193-person-organization-synergy-activation.md`
- `docs/tasks/complete/TASK-157-skills-matrix-staffing.md`

### Blocks / Impacts

- `TASK-333` — readers compartidos
- `TASK-334` — surfaces y entry points
- `TASK-331` — cualquier rediseño UX que toque semántica de relaciones debe respetar esta matriz

### Files owned

- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/documentation/hr/jerarquia-reporte-supervisoria.md`
- `project_context.md`

## Current Repo State

### Already exists

- La semántica base ya quedó documentada en:
  - `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- Existen surfaces reales que hoy consumen o administran relaciones:
  - `src/views/greenhouse/my/MyProfileView.tsx`
  - `src/views/greenhouse/my/MyOrganizationView.tsx`
  - `src/views/greenhouse/hr-core/SupervisorWorkspaceView.tsx`
  - `src/views/greenhouse/hr-core/HrOrgChartView.tsx`
  - `src/views/greenhouse/hr-core/HrHierarchyView.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`

### Gap

- No existe una matriz canónica que diga qué surface consume vs administra cada tipo de relación
- No existe un criterio operativo compartido para labels como `Equipos`, `Colegas`, `Mi equipo` o `Organización`
- No existe ownership documental explícito entre HR, People, Agency y Admin para estas relaciones

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

### Slice 1 — Matriz de capas relacionales

- Registrar de forma explícita qué significa cada capa:
  - estructura interna
  - equipos operativos
  - trabajo puntual
  - capacidad extendida
- Mapear por cada capa:
  - source canónica
  - surfaces consumidoras
  - surfaces administrativas
  - labels permitidos / prohibidos

### Slice 2 — Gobernanza de ownership y navegación

- Definir qué módulo administra cada relación:
  - estructura → `HR > Jerarquía`, `HR > Departamentos`
  - equipos operativos → lanes de assignments / roster operativo
  - capacidad extendida → módulo Staff Augmentation y derivados
- Actualizar documentación viva para que futuras tasks de UI o data no reabran este debate

## Out of Scope

- Implementar readers nuevos
- Rediseñar UI runtime
- Crear tablas, routes o drawers nuevos
- Reabrir el staffing engine de `TASK-157`

## Detailed Spec

La salida mínima de esta task debe dejar una tabla canónica equivalente a:

| Capa | Source canónica | Surface de lectura | Surface de administración |
| --- | --- | --- | --- |
| Estructura interna | `departments` + `reporting_lines` | `Mi Perfil`, `People`, `Mi equipo`, `Org Chart` | `HR > Jerarquía`, `HR > Departamentos` |
| Equipos operativos | `client_team_assignments` + roster operativo | `Mi Perfil`, `People`, `My Assignments`, `Space 360`, directorios operativos | lanes de assignments / roster existentes |
| Trabajo puntual | proyectos / campañas / iniciativas | perfil, dashboards, detail views | módulos de proyecto/campaña |
| Capacidad extendida | `staff_augmentation` + relaciones operativas externas | perfil, people, space/team, workspaces | `Agency > Staff Augmentation` |

## Acceptance Criteria

- [ ] Existe una matriz documental portal-wide para las cuatro capas relacionales
- [ ] Cada capa tiene definida su fuente canónica, surfaces lectoras y surfaces administrativas
- [ ] Queda documentado que `Colegas` y `Equipo` no pueden usarse como labels genéricos ambiguos
- [ ] `TASK-333` y `TASK-334` quedan alineadas explícitamente a esta gobernanza

## Verification

- Revisión manual de consistencia entre:
  - `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
  - `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
  - `project_context.md`

## Closing Protocol

- [ ] Actualizar `docs/tasks/README.md` si el orden sugerido del bloque cambia
- [ ] Registrar cualquier label prohibido o ambiguo identificado durante el diseño

## Follow-ups

- `TASK-333` — materializar readers compartidos
- `TASK-334` — aterrizar surfaces y entry points administrativos

## Open Questions

- ¿Qué labels finales deben quedar reservados para `estructura`, `equipos operativos` y `capacidad extendida` en navegación principal?
- ¿Qué surfaces client-facing deben heredar esta semántica más adelante sin exponer HR interno?
