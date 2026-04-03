# TASK-199 - Delivery Performance Owner Attribution Contract

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Complete`
- Rank: `55`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Definir el contrato canónico de atribución de tareas del `Performance Report` para que Greenhouse y Notion acrediten el trabajo a la misma persona bajo las mismas reglas.

Esta task separa explícitamente el problema de ownership del problema de sync. Aunque la tarea llegue bien a Greenhouse, la métrica seguirá divergiendo si Greenhouse acredita a todos los assignees y Notion acredita al owner principal.

## Why This Task Exists

La reconciliación de `Daniela / Marzo 2026` mostró que el gap no es solo de cobertura de datos. También hay un drift de atribución:

- el reporte de Notion indica que las tareas compartidas se atribuyen al owner principal
- Greenhouse hoy materializa `metrics_by_member` con `UNNEST(assignee_member_ids)`
- existen además tareas `Sin asignar` y combinaciones como `Adriana, Daniela`

Sin contrato de atribución, el mismo universo de tareas puede producir métricas distintas incluso con la misma fórmula.

## Goal

- Definir la regla canónica de owner principal para Delivery.
- Definir el tratamiento de co-asignados, cliente, agencia y tareas sin asignar.
- Alinear la atribución usada en reporting, readers y materializaciones mensuales.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `docs/tasks/in-progress/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`

Reglas obligatorias:

- la atribución canónica del reporte debe vivir en Greenhouse, no en interpretación manual posterior
- la regla debe ser auditable tarea por tarea
- no mezclar en la misma métrica la semántica de owner principal y co-crédito sin un contrato explícito
- `Sin asignar` debe tener tratamiento explícito, no implícito

## Dependencies & Impact

### Depends on

- `TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption`
- `TASK-197 - Delivery Source Sync Assignee & Project Relation Parity`
- `TASK-198 - Delivery Notion Assignee Identity Coverage`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/performance-report.ts`
- `src/lib/sync/projections/agency-performance-report.ts`
- `src/lib/person-360/get-person-ico-profile.ts`
- `src/lib/person-360/get-person-delivery.ts`
- `src/app/api/reviews/queue/route.ts`

### Impacts to

- `TASK-200 - Delivery Performance Metric Semantic Contract`
- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- métricas por miembro en `ICO`
- futuros scorecards por proyecto, persona y staffing

### Files owned

- `docs/tasks/complete/TASK-199-delivery-performance-owner-attribution-contract.md`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/performance-report.ts`
- `src/lib/sync/projections/agency-performance-report.ts`
- `src/lib/person-360/get-person-ico-profile.ts`
- `src/lib/person-360/get-person-delivery.ts`
- `src/app/api/reviews/queue/route.ts`
- `src/lib/projects/get-project-detail.ts`
- `src/lib/team-queries.ts`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`

## Current Repo State

### Ya existe

- `delivery_tasks` ya persiste un responsable primario implícito (`assignee_member_id`) y un array completo (`assignee_member_ids`)
- `ICO` ya consume `assignee_member_ids`
- múltiples readers operativos ya consumen el primer responsable como principal de facto
- existe evidencia documental de que el reporte Notion usa owner principal

### Gap actual

- Greenhouse acredita a todos los assignees en vez de aplicar owner principal
- no existe campo o helper canónico explícito de `primary_owner_*` para el reporte
- tareas compartidas, owners cliente y `Sin asignar` no tienen contrato estable
- el caso híbrido `cliente + colaborador` (`Adriana, Daniela`) sigue sin semántica definida
- `Person ICO`, `Person Delivery`, `Project Detail` y `Reviews Queue` no están alineados entre sí sobre singular vs plural

## Scope

### Slice 1 - Contrato de owner principal

- definir cómo se determina el owner principal por tarea
- definir si la prioridad del array de responsables es suficiente o si hace falta otro signal
- dejar tratamiento explícito para tareas compartidas

### Slice 2 - Contrato de exclusiones y bordes

- definir tratamiento para `Sin asignar`
- definir tratamiento para responsables cliente
- definir si ciertas tareas quedan fuera del score por falta de owner resoluble

### Slice 3 - Alineación de consumers

- alinear `ICO` y materializaciones mensuales con la regla canónica
- evitar que distintos readers apliquen reglas distintas

## Out of Scope

- resolver el sync técnico de `assignee_source_id`
- definir la fórmula matemática de `OTD`
- publicar reportes a Notion

## Acceptance Criteria

- [x] Existe una regla explícita y documentada de owner principal para Delivery.
- [x] Existe una regla explícita para tareas compartidas, responsables cliente y `Sin asignar`.
- [x] `ICO` y los readers afectados tienen un plan claro para consumir la atribución canónica.
- [x] El contrato permite reconciliar tarea por tarea contra el reporte de Notion.

## Verification

- revisión documental contra el reporte de marzo
- reconciliación manual de una muestra de tareas compartidas
- validación de queries por miembro con y sin co-asignados

## Delta 2026-04-02

- La auditoría formal confirmó que el runtime actual ya preserva un owner técnico implícito: el primer assignee de Notion baja como `assignee_source_id` / `assignee_member_id`.
- El drift real no es “falta inferir owner principal desde cero”; es que `ICO` sigue acreditando a todos los assignees con `UNNEST(assignee_member_ids)` mientras otros readers operativos ya usan el responsable singular como principal de facto.
- Consumers ya impactados por esta decisión:
  - `src/lib/ico-engine/schema.ts`
  - `src/lib/ico-engine/read-metrics.ts`
  - `src/lib/ico-engine/materialize.ts`
  - `src/lib/ico-engine/performance-report.ts`
  - `src/lib/sync/projections/agency-performance-report.ts`
  - `src/lib/person-360/get-person-ico-profile.ts`
  - `src/lib/person-360/get-person-delivery.ts`
  - `src/app/api/reviews/queue/route.ts`
  - `src/lib/projects/get-project-detail.ts`
  - `src/lib/team-queries.ts`
- El baseline `docs/architecture/schema-snapshot-baseline.sql` quedó rezagado para este slice y no refleja aún `assignee_source_id` / `assignee_member_ids` en `greenhouse_delivery.tasks`; para esta lane la verdad estructural vigente está en:
  - `migrations/20260402220356569_delivery-source-sync-assignee-project-parity.sql`
  - `scripts/setup-postgres-source-sync.sql`
- Evidencia real marzo 2026:
  - `greenhouse_conformed.delivery_tasks`: `306` tareas con `due_date` marzo 2026
  - solo `4` tareas tienen `assignee_member_ids` con más de un `member`
  - esas `4` tareas viven todas en `Efeonce`; `Sky` no tiene tareas multi-assignee resueltas a más de un `member`
  - caso borde crítico: `Adriana, Daniela` llega con owner primario cliente no-miembro y co-asignada interna sí resoluble
- Decisión para esta task:
  - congelar si el primer elemento del array de Notion es el contrato canónico del reporte
  - explicitar tratamiento para `client_user`, co-asignados y `Sin asignar`
  - evitar que distintos readers sigan aplicando reglas distintas sin contrato compartido
- Implementación cerrada:
  - `v_tasks_enriched` ahora expone aliases explícitos de owner principal: `primary_owner_source_id`, `primary_owner_member_id`, `primary_owner_type`, `has_co_assignees`
  - `metrics_by_member` deja de acreditarse por `UNNEST(assignee_member_ids)` y pasa a acreditarse solo por `primary_owner_member_id`
  - `computeMetricsByContext('member', ...)` y `readMemberMetrics()` quedan alineados al mismo contrato
  - `Person ICO` deja de usar co-crédito y pasa a usar owner principal
  - `Top Performer` ya publica explícitamente la nueva policy: solo acredita al owner principal miembro; co-asignados y owners cliente no reciben member credit
- Regla canónica fijada:
  - owner principal = primer assignee de Notion preservado por Greenhouse
  - si el owner principal resuelve a `member`, la tarea acredita a ese miembro y solo a ese miembro
  - si el owner principal resuelve a `client_user` o contacto externo sin `member`, la tarea sigue contando en métricas de `space` / `agency`, pero no acredita a un miembro interno
  - co-asignados quedan preservados para trazabilidad y contexto operativo, no para scorecard canónico
  - `Sin asignar` queda fuera de member attribution y explícitamente tratada como borde
- Verificación de negocio marzo 2026:
  - `Daniela` con co-crédito amplio: `104` tareas
  - `Daniela` con owner principal: `98` tareas
  - `multi_member_tasks`: `4`
  - `Sky` con owner primario no-miembro: `39` tareas
