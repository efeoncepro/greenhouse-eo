# Greenhouse Delivery Performance Report Parity V1

## Delta 2026-04-02 — Metric semantic contract now freezes due-date report logic

`TASK-200` fija la semántica canónica del `Performance Report` mensual para Delivery.

Regla vigente del scorecard mensual:

- el grano del reporte es `task with due_date in period`
- la fecha de corte canónica del cierre mensual es `period_end + 1 day`
- las exclusiones mínimas del scorecard son:
  - `Archivada`
  - `Cancelada`
  - `Tomado`
- las tareas del período deben caer en un bucket mutuamente excluyente:
  - `On-Time`
  - `Late Drop`
  - `Overdue`
  - `Carry-Over`
- `OTD` ya no significa `on_time / (on_time + late_drop)` para el reporte mensual
- `OTD` canónico del reporte = `on_time / total_classified_tasks`
- `FTR` sigue calculándose sobre tareas completadas del período
- `RpA` sigue calculándose sobre tareas completadas del período con `rpa_value > 0`
- `Top Performer` debe ordenar por `otd_pct` canónico y usar volumen total de tareas del período como criterio de elegibilidad/desempate, no solo completadas

Consecuencia:

- `shared.ts` es la fuente ejecutable del contrato
- `materialize.ts`, `read-metrics.ts` y `performance-report.ts` deben leer exactamente esa misma semántica
- la reconciliación histórica de `Marzo 2026` queda como follow-on de `TASK-201`, no como precondición para cerrar el contrato

## Delta 2026-04-02 — Owner attribution contract moves to primary-owner credit

`TASK-199` fija que la atribución canónica del `Performance Report` ya no debe seguir acreditando member-level metrics a todos los assignees resueltos.

Regla vigente:

- el owner principal del reporte es el primer assignee de Notion preservado por Greenhouse
- en runtime eso queda expresado por `assignee_source_id` / `assignee_member_id`
- `assignee_member_ids` se conserva para trazabilidad y contexto operativo, no para co-crédito en `ICO` member-level
- si el owner principal no resuelve a `member` sino a `client_user` o contacto externo, la tarea sigue contando para métricas de `space` / `agency`, pero no acredita a un miembro interno
- `Sin asignar` queda fuera de member attribution y debe tratarse explícitamente como borde del contrato

Consecuencia:

- `metrics_by_member`
- `Person ICO`
- `Top Performer`

deben alinearse a `primary owner credit`, mientras `Project Detail`, `Reviews Queue` y readers operativos pueden seguir usando el responsable singular ya preservado por el sync.

## Delta 2026-04-02 — Audit of calculated properties in `Efeonce`

Baseline auditado vía Notion MCP sobre `Efeonce`:

- `Proyectos` data source: `collection://abaeb422-4538-44d8-b43f-026a907746a2`
- `Tareas` data source: `collection://5126d7d8-bf3f-454c-80f4-be31d1ca38d4`

Propiedades calculadas confirmadas en `Proyectos`:

- `% On-Time` — `formula`
- `RpA Promedio` — `formula`
- `Finalización` — `rollup`

Propiedades calculadas confirmadas en `Tareas`:

- `Client Change Round Final` — `formula`
- `Completitud` — `formula`
- `Cumplimiento` — `formula`
- `Días de retraso` — `formula`
- `Días reprogramados` — `formula`
- `Indicador de Performance` — `formula`
- `Mes actual` — `formula`
- `Mes de cierre` — `formula`
- `Prioridad efectiva` — `formula`
- `Prioridad sugerida` — `formula`
- `Priorización` — `formula`
- `Reprogramada` — `formula`
- `Responsable (texto)` — `formula`
- `RpA` — `formula`
- `Semáforo RpA` — `formula`
- `Tiempo de ejecución` — `formula`
- `Tiempo en cambios` — `formula`
- `Tiempo en revisión` — `formula`
- `Urgencia` — `formula`
- `Total días congelados` — `rollup`

Lectura arquitectónica del audit:

- Notion hoy usa fórmulas para mezclar tres capas distintas:
  - primitivas operativas reales
  - derivaciones determinísticas por fila
  - helpers de presentación o grouping
- Greenhouse no debe portar todas esas fórmulas como columnas opacas 1:1.
- Greenhouse debe separar explícitamente qué vive como dato base, qué vive como derivación canónica y qué vive como helper de presentación.

## Purpose

Definir la arquitectura canónica para que el `Performance Report` mensual de Delivery se calcule de forma completa en Greenhouse con paridad semántica frente al reporte histórico generado en Notion para `Efeonce`.

Este documento fija:

- el contrato analítico del reporte
- la cadena de datos requerida para reconstruirlo
- la regla de source of truth entre Greenhouse y Notion
- el baseline de calibración para declarar confiable el reporte Greenhouse-first

Usar junto con:

- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `docs/tasks/in-progress/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`

## Core Decision

Greenhouse debe convertirse en el motor canónico del `Performance Report` mensual.

Notion no debe seguir siendo un segundo motor de cálculo en paralelo para este informe. Debe operar como consumer y superficie de consumo del resultado ya canonizado por Greenhouse.

Regla operativa:

1. Notion sigue siendo source system de trabajo operativo.
2. Greenhouse ingesta y normaliza las propiedades necesarias.
3. Greenhouse materializa el reporte mensual con reglas versionadas.
4. Notion consume y publica ese mismo resultado para narrativa, visualización o cálculos complementarios.

## Reporting Parity Model

La paridad requerida no es solo de schema. Es de semántica.

Para declarar paridad completa deben alinearse simultáneamente:

- propiedades y relaciones de origen
- reglas de inclusión y exclusión
- granularidad temporal
- clasificación de buckets
- lógica de ranking, alertas y comparativos

## Canonical Report Contract

Cada versión del reporte mensual debe fijar explícitamente:

- período de análisis
- timezone operativa
- spaces incluidos
- estados excluidos
- reglas para `On-Time`
- reglas para `Late Drop`
- reglas para `Overdue`
- reglas para `Carry-Over`
- reglas para `RpA`
- reglas para `FTR`
- elegibilidad de `Top Performer`
- criterios de alertas y hallazgos
- reglas de comparativo versus mes anterior

## Canonical Data Chain

La cadena objetivo para el reporte es:

1. `Notion`
2. `notion_ops`
3. `greenhouse_conformed`
4. `ico_engine` o mart mensual equivalente
5. `greenhouse_serving`
6. publicación a `Notion`

Regla obligatoria:

- si una métrica del reporte no puede reconstruirse de forma auditable desde esa cadena, el contrato de datos sigue incompleto

## Minimum Data Fidelity Required

Para reconstruir el reporte completo, Greenhouse debe preservar:

- propiedades KPI base
- propiedades de workflow y revisión
- timestamps operativos
- relaciones entre tareas, proyectos y objetos relacionados
- arrays/IDs de relación además de labels derivados
- metadata suficiente para auditar exclusiones, bloqueos y diagnóstico

Regla:

- no degradar relaciones ricas a solo contadores cuando el informe necesita explicación causal

## Porting strategy for calculated properties

La vía recomendada para portar las propiedades calculadas de Notion a Greenhouse es una descomposición en cuatro capas.

### 1. Source primitives in `notion_ops` and `greenhouse_conformed`

Estas propiedades no deben depender de fórmulas Notion como source of truth. Deben llegar como campos base o relaciones fieles:

- `Estado`
- `Fecha límite`
- `Fecha límite original`
- `Fecha de inicio`
- `Fecha de envío a revisión`
- `Fecha de retorno`
- `Fecha de Completado`
- `Review Source`
- `Client Change Round`
- `Workflow Change Round`
- `Client Review Open`
- `Workflow Review Open`
- `Last Reviewed Version`
- `Open Frame Comments`
- `Resolved Frame Comments`
- `Frame Comments`
- `Frame Versions`
- `URL Frame.io`
- `Frame Asset ID`
- `Impacto`
- `Esfuerzo`
- `Prioridad`
- `Responsables`
- `Proyecto`
- `Sprint`
- `Revisiones`
- `Bloqueado por`
- `Bloqueando`
- `Campaña`
- `Contenidos`
- `Email Marketing`
- `PRs de GitHub`
- `Subtareas`
- `Tarea principal`

Regla:

- las relaciones deben preservarse también como arrays/IDs en BigQuery y no solo como labels o counts

### 2. Deterministic row-level derivations in `greenhouse_conformed`

Estas propiedades pueden recomputarse fila por fila de manera auditable y no necesitan seguir viviendo como outputs opacos de Notion:

- `Client Change Round Final`
- `Días de retraso`
- `Días reprogramados`
- `Reprogramada`
- `RpA`
- `Tiempo de ejecución`
- `Tiempo en cambios`
- `Tiempo en revisión`
- `Mes de cierre`
- `Prioridad sugerida`
- `Prioridad efectiva`
- `Priorización`
- `Responsable (texto)`

Regla:

- si la derivación depende solo de la fila y sus relaciones inmediatas, debe vivir como SQL/versioned logic en Greenhouse

### 3. Canonical KPI and report logic in `ICO` or monthly marts

Estas propiedades deben vivir como lógica canónica del engine/report y no como fórmula row-level de Notion:

- `Indicador de Performance`
- `Cumplimiento`
- `% On-Time`
- `RpA Promedio`
- `Top Performer`
- comparativo `mes actual vs mes anterior`
- breakdown por responsable, proyecto y segmento

Regla:

- la clasificación `On-Time / Late Drop / Overdue / Carry-Over` debe salir del mismo contrato que usa el reporte mensual

### 4. Presentation helpers in serving or Notion publication

Estas propiedades pueden regenerarse downstream para UI, dashboards o publicación de vuelta a Notion:

- `Completitud`
- `Semáforo RpA`
- `Urgencia`
- `Mes actual`
- `Finalización`

Regla:

- las propiedades dinámicas o muy acopladas a “cómo se muestra” no deben gobernar la verdad analítica base

## Migration guidance by property family

### Project-level formulas

- `% On-Time` debe recalcularse en Greenhouse desde buckets canónicos de tareas y no persistirse como verdad final de Notion.
- `RpA Promedio` debe salir de `RpA` canónico por tarea, agregado por proyecto.
- `Finalización` requiere decisión explícita de contrato en Greenhouse porque hoy es un `rollup` opaco en Notion.

Regla:

- mientras `Finalización` no tenga semántica formal definida, tratarla como display helper y no como primitive canónica

### Freeze/thaw timing formulas

Las fórmulas `Días de retraso`, `Tiempo de ejecución`, `Tiempo en revisión`, `Tiempo en cambios` y el rollup `Total días congelados` muestran que Notion ya está usando un modelo de reloj congelado.

Vía recomendada:

- modelar una lógica Greenhouse versionada basada en:
  - `due_date`
  - `original_due_date`
  - `started_at`
  - `sent_to_review_at`
  - `returned_from_review_at`
  - `completed_at`
  - estado actual

Regla:

- el cálculo freeze/thaw debe vivir en Greenhouse como contrato de tiempo operativo y no quedar amarrado a una fórmula visual de Notion

### Prioritization formulas

Notion ya combina `Impacto`, `Esfuerzo`, `Prioridad` y cercanía a vencimiento para producir:

- `Priorización`
- `Prioridad sugerida`
- `Prioridad efectiva`
- `Urgencia`

Vía recomendada:

- portar la matriz `Impacto x Esfuerzo` a Greenhouse como tabla o SQL versionado
- tratar `Prioridad` manual como override
- calcular `Urgencia` downstream porque depende del tiempo relativo al momento del cálculo

### Review and quality formulas

Notion ya mezcla `Review Source`, contadores de cambios y relaciones de `Revisiones` para producir:

- `Client Change Round Final`
- `RpA`
- `Semáforo RpA`

Vía recomendada:

- Greenhouse debe adoptar `Review Source` como switch canónico
- `RpA` y `Client Change Round Final` deben calcularse en `conformed` desde primitives
- `Semáforo RpA` debe quedar como helper de display

## Calibration Baseline

El baseline obligatorio para calibrar la paridad es:

- `Performance Report — Marzo 2026`
- teamspace `Efeonce Admin`
- período `2026-03-01` a `2026-03-31`

Uso correcto del baseline:

- sirve para comparar Greenhouse contra un reporte ya existente
- no debe tratarse como excepción manual permanente
- cualquier desviación debe explicarse por regla, dato faltante o bug de cálculo

## Output Principle

El resultado canónico del reporte mensual debe quedar disponible en Greenhouse como:

- scorecard mensual
- breakdown por owner
- breakdown por segmento/space
- comparativo mes anterior
- alertas y resumen ejecutivo
- metadata de versionado del cálculo

## Notion Consumption Principle

Notion debe consumir el reporte mensual canonizado desde Greenhouse mediante:

- sync a database de reportes
- update de propiedades calculadas
- opcionalmente una página narrativa derivada del snapshot

Regla:

- si Notion muestra una cifra distinta a Greenhouse para el mismo período, Greenhouse prevalece y el drift debe corregirse

## Delivery Scope

Fase inicial obligatoria:

- `Efeonce`

Expansión posterior:

- `Sky`
- `ANAM`
- otros spaces una vez que la paridad esté validada

## Verification Standard

Antes de declarar operativo un período Greenhouse-first, debe existir:

- matriz de paridad `métrica -> regla -> propiedades -> datasets -> consumer`
- diff explícito `Notion vs Greenhouse`
- explicación de cualquier desviación residual
- cierre documental en el operating model mensual
