# CODEX TASK — Team Identity & Capacity: Canonical Identity Closed, Formal Capacity Pending (v2)

## Delta 2026-03-26
- `Agency > Team` confirmó en runtime que la capacidad seguía mezclando contrato, dedicación y uso operativo en una sola semántica visual.
- Se deriva `TASK-056 - Agency Team Capacity Semantics` para cerrar el contrato de dominio antes de seguir iterando backend/UI.
- Regla nueva derivada del caso real:
  - `Asignadas` expresa carga comercial comprometida
  - `Usadas` no debe asumirse igual a `Asignadas`
  - `Efeonce` interno debe tratarse como autogestión/costo hundido fuera de carga cliente para esta vista

## Delta 2026-03-22
- Admin Team mutations and reads now Postgres-first; `client_team_assignments` dual-write flipped to Postgres-primary; `syncAssignmentToPostgres` removed — cerrado por trabajo en `CODEX_TASK_Admin_Team_Postgres_Runtime_Migration_v1`
- Capacity queries in `team-queries.ts` now read roster from Postgres (operational load stays in BigQuery via `notion_ops`)
- People 360 Enrichments cerrada: tab "Identidad" ahora muestra capacity-adjacent data (actividad operativa con KPIs de proyectos/tareas, delivery context) — capacity enrichments que esta task planee pueden asumir que People ya consume `deliveryContext` y `hrContext` como read-only — cerrado por `CODEX_TASK_People_360_Enrichments_v1`

## Resumen

Esta task no parte desde cero. La base canónica de identidad del colaborador ya existe en runtime y esta `v2` se enfoca en cerrar lo que sigue realmente abierto: la formalización del modelo y de las APIs de capacidad.

Ancla canónica vigente:
- `greenhouse.team_members.member_id`

Relación operativa vigente:
- `greenhouse.client_team_assignments`

Integración de identidad vigente:
- `greenhouse.identity_profile_source_links`

Objetivo de esta `v2`:
- consolidar `Team` como fuente operativa de roster y asignaciones
- cerrar el modelo explícito de capacidad sin depender solo de inferencias de tareas
- dejar contratos reutilizables para dashboard, team views, People y futuros módulos internos

## Alineación obligatoria con arquitectura

Esta task debe revisarse contra:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`

Reglas obligatorias:
- `greenhouse.team_members.member_id` sigue siendo el ancla canónica del objeto `Collaborator`
- `identity_profile_id` e `identity_profile_source_links` siguen siendo la capa reusable de identidad transversal
- `Admin Team` mantiene ownership de las mutaciones de roster y asignaciones
- `People` sigue siendo la vista read-first del colaborador
- `Capacity` no debe seguir dependiendo solo de task assignees incidentales ni de heurísticas aisladas

Resultado del contraste 2026-03-14:
- la parte de identidad sí quedó alineada y bastante sembrada en runtime
- la parte de capacidad no debe considerarse cerrada todavía
- la propia arquitectura sigue pidiendo formalizar team/capacity como modelo y APIs explícitas

## Estado real del runtime

### Ya implementado

- `greenhouse.team_members`
- `greenhouse.client_team_assignments`
- `greenhouse.identity_profile_source_links`
- `GET /api/team/members`
- `GET /api/team/capacity`
- `GET /api/team/by-project/[projectId]`
- `GET /api/team/by-sprint/[sprintId]`
- `GET /api/admin/team/members`
- `GET /api/admin/team/members/[memberId]`
- `GET /api/admin/team/assignments`
- `GET /api/admin/team/assignments/[assignmentId]`
- mutaciones de roster y assignments bajo `/api/admin/team/*`

### Complementos backend ya cerrados para esta v2

- `GET /api/team/capacity` ahora expone semántica más explícita de capacidad:
  - `summary.assignedHoursMonth`
  - `summary.activeAssets`
  - `summary.completedAssets`
  - `summary.expectedMonthlyThroughput`
  - `summary.healthBuckets`
  - `roleBreakdown`
- cada `member` de capacity ahora devuelve además:
  - `assignedHoursMonth`
  - `expectedMonthlyThroughput`
  - `utilizationPercent`
  - `capacityHealth`

Regla operativa derivada:
- frontend no debe volver a inferir estados como `idle`, `high` u `overloaded` desde FTE o assets crudos si el backend ya entrega `capacityHealth`
- la capa `team/capacity` sigue siendo lectura operativa y todavía no reemplaza una futura planeación contractual más formal

### Lo que sigue abierto de verdad

1. La capacidad sigue demasiado apoyada en señales derivadas de `notion_ops`
- hoy existe valor operativo, pero no una capa suficientemente explícita para tratarla como cerrada
- la arquitectura ya advierte que la capacidad puede requerir source enrichment más allá de las tablas actuales

2. Falta separar mejor tipos de capacidad
- capacidad contratada
- capacidad asignada
- capacidad usada
- capacidad disponible o idle
- riesgo de sobrecarga por persona, rol, cliente y vista interna

3. Faltan contratos más estables para consumo transversal
- dashboard interno
- team views por cliente
- People detail
- futuras vistas de capacity planning

4. La semántica entre Team, People y Dashboard todavía puede confundir
- `Admin Team` escribe
- `People` consolida lectura por colaborador
- `Team/Capacity` debe exponer contratos reutilizables sin convertirse en una segunda ficha de persona

## Alcance de esta v2

### A. Formalizar capacidad como capa explícita

Definir contratos y criterios server-side para distinguir:
- capacidad base disponible
- capacidad comprometida por assignment
- capacidad operativa usada
- alertas de saturación o riesgo

### B. Estabilizar APIs reutilizables de team/capacity

Los contratos de capacidad no deben seguir dependiendo de overrides visuales ni de interpretación cliente a cliente en frontend.

Dirección esperada:
- mantener `/api/team/*` para lectura operativa
- endurecer payloads para que dashboard y vistas internas no tengan que recomputar semántica local

### C. Mantener identidad como objeto compartido

Todo enriquecimiento de capacidad debe seguir colgando del mismo `Collaborator`:
- no crear `employee_master_id`
- no duplicar roster en otro módulo
- no tratar `People` o `Payroll` como nueva fuente de verdad de identidad

## Criterios de aceptación

- la task deja explícito que identidad y capacidad ya no son el mismo problema
- queda confirmado que identidad canónica ya vive en runtime sobre `team_members.member_id`
- queda confirmado que la parte pendiente es la formalización de capacidad
- cualquier implementación futura de capacity debe salir alineada con arquitectura y no desde inferencias ad hoc

## Archivos y zonas probables

- `src/lib/team-queries.ts`
- `src/app/api/team/members/route.ts`
- `src/app/api/team/capacity/route.ts`
- `src/app/api/team/by-project/[projectId]/route.ts`
- `src/app/api/team/by-sprint/[sprintId]/route.ts`
- `src/views/greenhouse/dashboard/config.ts`
- `src/views/greenhouse/team/*`

## Fuera de alcance

- reemplazar `People` como vista 360 del colaborador
- mover writes de roster fuera de `/api/admin/team/*`
- crear una identidad paralela de colaborador
- tratar señales heurísticas actuales como cierre definitivo del dominio de capacity

---

## Dependencies & Impact

- **Depende de:**
  - `greenhouse.team_members.member_id` (ancla canónica — ya implementado)
  - `greenhouse.client_team_assignments` (relación operativa — ya implementado)
  - `CODEX_TASK_Admin_Team_Postgres_Runtime_Migration_v1` — capacity APIs se benefician de store Postgres
- **Impacta a:**
  - `CODEX_TASK_People_360_Enrichments_v1` — capacity contracts estables alimentan enrichments de People
  - `CODEX_TASK_Staff_Augmentation_Module_v2` — capacity planning integra placements
  - `CODEX_TASK_Greenhouse_Home_Nexa_v2` — Home puede mostrar capacity summary como pendiente/contexto
- **Archivos owned:**
  - `src/lib/team-queries.ts`
  - `src/app/api/team/members/route.ts`
  - `src/app/api/team/capacity/route.ts`
  - `src/app/api/team/by-project/[projectId]/route.ts`
  - `src/app/api/team/by-sprint/[sprintId]/route.ts`
