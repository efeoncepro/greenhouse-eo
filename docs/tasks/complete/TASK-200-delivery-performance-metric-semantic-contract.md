# TASK-200 - Delivery Performance Metric Semantic Contract

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Complete`
- Rank: `56`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Congelar el contrato semántico de las métricas del `Performance Report` mensual para que `OTD`, `Late Drop`, `Overdue`, `Carry-Over`, `FTR`, `RpA` y comparativos mensuales signifiquen exactamente lo mismo en Greenhouse y en Notion.

Esta task es el centro lógico de la paridad. Sin ella, aunque sync, identidad y owner estén correctos, el resultado final seguirá divergiendo por definiciones distintas.

## Why This Task Exists

La reconciliación de `Daniela / Marzo 2026` ya mostró drift semántico:

- Greenhouse hoy calcula `otd_pct = on_time / (on_time + late_drop)`
- el reporte de Notion para Daniela parece usar `on_time / total_tasks`

Además, el reporte depende de filtros y exclusiones no triviales:

- tasks con `due date` en el período
- exclusión de `Archivada`, `Cancelada`, `Tomado`
- exclusión de ciertos actores
- reglas específicas para overdue, carry-over y cambios de estado

## Goal

- Definir formalmente cada métrica del `Performance Report`.
- Definir filtros, período, exclusiones y grano canónico.
- Convertir `Marzo 2026` en baseline contractual para validar la semántica.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/tasks/in-progress/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`

Reglas obligatorias:

- ninguna métrica del reporte debe depender de interpretación implícita no versionada
- la semántica debe poder expresarse en SQL o código determinístico
- las exclusiones deben quedar nombradas y auditables
- el contrato debe usar fechas absolutas y timezone explícita cuando aplique

## Dependencies & Impact

### Depends on

- `TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption`
- `TASK-199 - Delivery Performance Owner Attribution Contract`
- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/performance-report.ts`
- `src/lib/sync/projections/agency-performance-report.ts`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`

### Impacts to

- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- `TASK-202 - Delivery Performance Report Publication & Notion Consumption Cutover`
- scorecards mensuales en `ICO`
- cualquier consumer futuro de métricas Delivery

### Files owned

- `docs/tasks/complete/TASK-200-delivery-performance-metric-semantic-contract.md`
- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/performance-report.ts`
- `src/lib/sync/projections/agency-performance-report.ts`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`

## Current Repo State

### Ya existe

- Greenhouse ya produce parte de las métricas Delivery
- Notion ya tiene un reporte mensual real que sirve de baseline
- existen propiedades calculadas en Notion que permiten reconstruir varias clasificaciones
- ya existe una semántica canónica parcial de buckets y período en `src/lib/ico-engine/shared.ts`
- ya existen materializaciones mensuales en `metric_snapshots_monthly`, `metrics_by_member` y `performance_report_monthly`

### Gap actual

- la fórmula vigente de `OTD` no está alineada todavía con la lectura aparente del reporte de Notion
- no existe contrato único y explícito de exclusiones, elegibilidad y fallback order para todos los consumers
- no existe una definición versionada del grano mensual del reporte que cubra `agency`, `space`, `member` y `project`
- marzo 2026 sigue con materialización histórica incompleta:
  - `metrics_by_member` y `metric_snapshots_monthly` tienen buckets `on_time_count` / `late_drop_count` / `overdue_count` / `carry_over_count` en `NULL`
  - `performance_report_monthly` no tiene snapshot `agency` para `2026-03`
- siguen existiendo consumers legacy que infieren `delivery_signal` o `% on-time` desde `cumplimiento`, `completitud` o `% On-Time` de proyecto, no desde el mismo contrato canónico del engine

## Scope

### Slice 1 - Métricas canónicas

- definir `OTD`, `Late Drop`, `Overdue`, `Carry-Over`, `FTR`, `RpA`
- definir numerador, denominador y reglas de inclusión

### Slice 2 - Período y exclusiones

- definir base temporal del reporte
- definir filtros de estados, personas y casos borde
- dejar explícita la timezone y la fecha de corte

### Slice 3 - Contrato auditable

- dejar la semántica lista para implementarse en SQL o código
- vincular cada métrica con sus propiedades fuente necesarias

## Out of Scope

- corregir el sync de responsables y proyecto
- resolver el grafo de identidad humana
- publicar reportes a Notion por sí solo

## Acceptance Criteria

- [x] Existe definición explícita de cada métrica principal del `Performance Report`.
- [x] Existe definición explícita de período, exclusiones y grano del reporte.
- [x] El caso `Daniela / Marzo 2026` puede expresarse con el contrato documentado.
- [x] La task deja base implementable para recalcular `Marzo 2026` en Greenhouse.

## Verification

- comparación manual del contrato contra el reporte de marzo
- revisión de fórmula actual vs fórmula objetivo
- matriz `métrica -> propiedades -> regla`

## Delta 2026-04-02

- La auditoría formal confirmó que `TASK-200` no parte de cero:
  - `src/lib/ico-engine/shared.ts` ya expone una semántica canónica parcial para `OTD`, `Late Drop`, `Overdue`, `Carry-Over` y `FTR`
  - `src/lib/ico-engine/materialize.ts` ya la usa para `metric_snapshots_monthly`, `metrics_by_member`, `metrics_by_project` y `performance_report_monthly`
- El drift real no es solo “cambiar la fórmula de OTD”:
  - también hay que congelar denominadores, exclusiones, elegibilidad de `Top Performer`, orden de fallback y semántica de comparativos mensuales
  - además existen consumers legacy que todavía derivan señales desde `cumplimiento`, `completitud` o `% on-time` de proyecto
- El baseline histórico sigue incompleto para `Marzo 2026`:
  - `metrics_by_member` para `daniela-ferreira` trae `otd_pct = 82.4`, `total_tasks = 34`, `completed_tasks = 17`, `active_tasks = 17`
  - pero `on_time_count`, `late_drop_count`, `overdue_count` y `carry_over_count` siguen en `NULL`
  - `metric_snapshots_monthly` para marzo 2026 también mantiene buckets nulos en varias filas
  - `performance_report_monthly` no tiene fila `agency` para `2026-03`
- Decisión operativa para esta task:
  - congelar primero el contrato semántico completo
  - luego alinear engine, materializaciones y readers a esa misma definición
  - dejar `TASK-201` como la task que recalcula y reconcilia el histórico una vez fijado el contrato

## Delta 2026-04-02 — Cierre

- `TASK-200` quedó cerrada como contrato semántico implementado.
- Semántica canónica fijada:
  - grano mensual = `tasks con due_date en el período`
  - fecha de corte canónica = `period_end + 1 day`
  - exclusiones mínimas = `Archivada`, `Cancelada`, `Tomado`
  - buckets del scorecard mutuamente excluyentes = `On-Time`, `Late Drop`, `Overdue`, `Carry-Over`
  - `OTD` mensual = `On-Time / total_classified_tasks`
  - `Top Performer` usa `OTD` canónico y volumen total de tareas del período como elegibilidad/desempate
- Implementación cerrada:
  - `src/lib/ico-engine/shared.ts`
    - cambia el período canónico a `due_date`
    - agrega `REPORT_CUTOFF_DATE_SQL`, `REPORT_PERIOD_SCOPE_SQL`, `CANONICAL_OPEN_TASK_SQL` y `CANONICAL_CLASSIFIED_TASK_SQL`
    - `OTD` deja de usar `on_time / (on_time + late_drop)` y pasa a `on_time / total_classified`
    - `Overdue` y `Carry-Over` ya usan `performance_indicator_code` cuando existe y caen a derivación por fecha/estado si falta
  - `src/lib/ico-engine/metric-registry.ts`
    - alinea descripción/formula declarativa de `OTD` y `FTR` con el contrato nuevo
  - `src/lib/ico-engine/materialize.ts`
    - `performance_report_monthly` materializa `on_time_pct` con denominador `total_tasks`
    - `Top Performer` deja de usar `throughput_count` de completadas y pasa a `total_tasks`
  - `src/lib/ico-engine/performance-report.ts`
    - fallback live y `readTopPerformer()` quedan alineados a la misma semántica
- Verificación de contrato:
  - el `Performance Report — Marzo 2026` de Notion confirma explícitamente:
    - scorecard sobre tareas con fecha límite en marzo
    - buckets mutuamente excluyentes
    - `On-Time % = On-Time / Total Tareas`
    - tareas compartidas atribuidas al responsable principal
  - el histórico Greenhouse de marzo 2026 sigue con drift y buckets nulos en materializaciones legacy; eso queda explícitamente delegado a `TASK-201`

## Delta 2026-04-03

- Auditoría posterior confirmó que el scorecard mensual vigente sigue siendo internamente consistente cuando se ancla a `due_date in period`.
- También confirmó que intentar reintroducir `carry-over` de períodos anteriores directamente en el filtro compartido del engine infla el scorecard mensual con trabajo histórico abierto y vuelve inestable la semántica del reporte.
- Corrección vigente:
  - el contrato del `Performance Report` se mantiene anclado a `due_date in period`
  - `readAgencyPerformanceReport()` pasa a preferir `ico_engine.performance_report_monthly` por encima de `greenhouse_serving.agency_performance_reports` para leer la fuente canónica del cálculo

## Delta 2026-04-03 — Corrección funcional de `Carry-Over`

- Aclaración de negocio posterior al cierre de esta task:
  - `Carry-Over` **no** debe significar “tarea vencida de meses anteriores aún abierta”
  - `Carry-Over` debe significar: **tarea creada dentro del mes cuyo `due_date` cae en el mes siguiente o después**
- Consecuencia contractual:
  - el scorecard de cumplimiento mensual ya no debe tratar `Carry-Over` como bucket del mismo universo `due_date in period`
  - los buckets de cumplimiento del mes quedan reducidos a:
    - `On-Time`
    - `Late Drop`
    - `Overdue`
  - `OTD` debe leerse sobre ese universo de cumplimiento del período, sin meter `Carry-Over` en el denominador
- Se incorpora además una métrica separada para deuda operativa:
  - `Overdue Carried Forward`
  - definición: tareas con `due_date` en o antes del cierre del mes que siguen abiertas al comenzar el mes siguiente
- Lectura correcta:
  - `Carry-Over` mide carga sembrada en el mes para períodos futuros
  - `Overdue Carried Forward` mide vencidos reales que se cargan al mes siguiente
- Estado de implementación:
  - esta aclaración corrige el contrato funcional/documental
  - la adaptación explícita del engine queda delegada a `TASK-204` para no mezclar esta redefinición con los hardenings ya cerrados de `TASK-200` y `TASK-201`
