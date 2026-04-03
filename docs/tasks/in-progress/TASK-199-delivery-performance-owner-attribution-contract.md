# TASK-199 - Delivery Performance Owner Attribution Contract

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Diseño`
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

### Impacts to

- `TASK-200 - Delivery Performance Metric Semantic Contract`
- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- métricas por miembro en `ICO`
- futuros scorecards por proyecto, persona y staffing

### Files owned

- `docs/tasks/to-do/TASK-199-delivery-performance-owner-attribution-contract.md`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`

## Current Repo State

### Ya existe

- `delivery_tasks` ya persiste arrays de responsables a nivel de miembro cuando el match resuelve
- `ICO` ya consume `assignee_member_ids`
- existe evidencia documental de que el reporte Notion usa owner principal

### Gap actual

- Greenhouse acredita a todos los assignees en vez de aplicar owner principal
- no existe campo o derivación canónica de owner principal para el reporte
- tareas compartidas y `Sin asignar` no tienen contrato estable

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

- [ ] Existe una regla explícita y documentada de owner principal para Delivery.
- [ ] Existe una regla explícita para tareas compartidas, responsables cliente y `Sin asignar`.
- [ ] `ICO` y los readers afectados tienen un plan claro para consumir la atribución canónica.
- [ ] El contrato permite reconciliar tarea por tarea contra el reporte de Notion.

## Verification

- revisión documental contra el reporte de marzo
- reconciliación manual de una muestra de tareas compartidas
- validación de queries por miembro con y sin co-asignados

