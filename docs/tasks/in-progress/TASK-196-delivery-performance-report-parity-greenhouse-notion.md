# TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption

## Delta 2026-04-02

- `TASK-201` quedó cerrada como slice de reconciliación histórica y snapshot freezing.
- Resultado clave de la calibración:
  - Greenhouse ya puede congelar un período mensual de Delivery en `ico_engine.delivery_task_monthly_snapshots`
  - `Marzo 2026` quedó materializado con `294` tareas `locked` y `293` tareas clasificadas en el scorecard agency
  - el drift residual frente al `Performance Report` de Notion ya no apunta principalmente a fórmula ni source sync, sino a historia mutable en Notion posterior al cierre
- Decisión operativa nueva:
  - `Abril 2026` en adelante debe operar con snapshot mensual congelado al cierre
  - marzo queda como baseline calibrado con residual explicado, no como período donde debamos exigir paridad exacta retroactiva contra el estado vivo actual
- `TASK-197` quedó cerrada como slice de paridad de source sync/runtime.
- `TASK-200` quedó cerrada como slice de contrato semántico de métricas.
- Resultado útil para esta epic:
  - `greenhouse_conformed.delivery_tasks` y `greenhouse_delivery.tasks` ya preservan `project_source_ids`
  - marzo 2026 quedó alineado por `space` en runtime para el baseline mínimo:
    - `Sky`: `190` tareas, `187` con `assignee_source_id`
    - `Efeonce`: `116` tareas, `116` con `assignee_source_id`
- A partir de este punto, el cuello de botella del `Performance Report` ya no es pérdida mecánica del carril `Notion -> conformed -> runtime`, sino:
  - coverage de identidad (`TASK-198`)
  - contrato de owner attribution (`TASK-199`)
  - semántica de métricas (`TASK-200`)
  - reconciliación/materialización histórica (`TASK-201`)

- La lane se descompone explícitamente en subtasks ejecutables para evitar mezclar sync, identidad, semántica, materialización y publicación:
  - `TASK-197 - Delivery Source Sync Assignee & Project Relation Parity`
  - `TASK-198 - Delivery Notion Assignee Identity Coverage`
  - `TASK-199 - Delivery Performance Owner Attribution Contract`
  - `TASK-200 - Delivery Performance Metric Semantic Contract`
  - `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
  - `TASK-202 - Delivery Performance Report Publication & Notion Consumption Cutover`
- Se auditó vía Notion MCP el schema real de `Efeonce` para distinguir propiedades calculadas de `Proyectos` y `Tareas`.
- Calculadas confirmadas en `Proyectos`:
  - `% On-Time`
  - `RpA Promedio`
  - `Finalización`
- Calculadas confirmadas en `Tareas`:
  - `Client Change Round Final`
  - `Completitud`
  - `Cumplimiento`
  - `Días de retraso`
  - `Días reprogramados`
  - `Indicador de Performance`
  - `Mes actual`
  - `Mes de cierre`
  - `Prioridad efectiva`
  - `Prioridad sugerida`
  - `Priorización`
  - `Reprogramada`
  - `Responsable (texto)`
  - `RpA`
  - `Semáforo RpA`
  - `Tiempo de ejecución`
  - `Tiempo en cambios`
  - `Tiempo en revisión`
  - `Urgencia`
  - `Total días congelados`
- Se documentó la ruta canónica de portabilidad en:
  - `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- Decisión explícita:
  - Greenhouse no debe portar todas las fórmulas de Notion como columnas espejo
  - debe descomponerlas en `primitives -> derivations -> KPI engine -> presentation helpers`
- Se documentó además la vía canónica para replicar la lógica `Proyecto -> Tareas` de Notion en Greenhouse:
  - preservar arrays de relación en conformed
  - mantener una relación primaria operativa por tarea
  - resolver `Project 360` por join y no por rollup opaco
  - evaluar un bridge `task_project_links` solo si aparece uso real many-to-many
- Se ejecutó una primera reconciliación real contra `Daniela Ferreira` en `Marzo 2026`:
  - Notion `Performance Report`: `86.3% OT`, `102 tareas`, `88 on-time`, `13 late drops`, `1 overdue`
  - Greenhouse `ico_engine.metrics_by_member`: `82.4% OTD`, `34 total_tasks`, `17 completed_tasks`, `17 active_tasks`
  - diferencia observada: `-3.9 pp` y `-68` tareas
- Se confirmó drift semántico en la fórmula actual de Greenhouse:
  - `shared.ts` calcula `otd_pct = on_time / (on_time + late_drop)`
  - el reporte de Notion para Daniela parece usar `on_time / total_tasks`
- `TASK-200` ya congeló el contrato mensual correcto:
  - grano = `tasks con due_date en el período`
  - corte = `period_end + 1 day`
  - `OTD = On-Time / total_classified_tasks`
  - `Top Performer` usa volumen total de tareas del período
- Se confirmó además drift de scope/población:
  - en `greenhouse_conformed.delivery_tasks`, para Daniela y `due_date` en marzo 2026, hoy solo aparecen `18` tareas
  - esas `18` tareas pertenecen al `space-efeonce` interno
  - no aparecen tareas de `Sky` en ese corte
- Se confirmó drift de materialización histórica:
  - `ico_engine.performance_report_monthly` no tiene snapshot `agency` para `2026-03`
  - `greenhouse_serving.agency_performance_reports` tampoco tiene snapshot `agency` para `2026-03`
  - `metrics_by_member` en `2026-03` tiene `on_time_count` / `late_drop_count` nulos
  - en la muestra de tareas de Daniela, `performance_indicator_code` aparece nulo y `performance_indicator_label` como `—`
- Se auditó el match `Responsables Notion -> miembros Efeonce` para tareas con `due_date` en marzo 2026:
  - `greenhouse_conformed.delivery_tasks`: `304` tareas del período
  - con `assignee_member_id`: `116`
  - con `assignee_member_ids`: `116`
  - sin match a miembro: `188`
- El corte por `space` confirmó una asimetría total:
  - `Efeonce` (`spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad`): `116/116` tareas con match
  - `Sky Airline` (`spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9`): `0/188` tareas con match
- En origen `notion_ops.tareas`, el patrón real es por variante de propiedad:
  - `Efeonce`: `116/116` tareas con `responsables_ids` y `responsables` poblados
  - `Sky Airline`: `187/190` tareas con `responsable_ids` y `responsable` poblados; `3/190` quedan `Sin asignar`
- El schema real de `Sky Airline` en Notion MCP confirmó que ese space usa `Responsable` en singular, no `Responsables`.
- El gap ya no parece estar en el nombre de la propiedad:
  - `sync-notion-conformed.ts` ya hace `COALESCE(responsables_ids, responsable_ids)`
  - aun así, en `greenhouse_conformed.delivery_tasks`, `Sky Airline` queda con `0/188` tareas con `assignee_source_id`
- El problema hoy es una mezcla de pérdida en materialización y cobertura de identidad:
  - `Sky Airline` tiene `5` `notion_user_id` distintos en marzo 2026
  - solo `3` existen en `greenhouse.team_members`
  - los `2` faltantes corresponden a `constanza rojas` y `Adriana`
- Muestra útil de revisión:
  - `Sky Airline` marzo 2026 distribuye responsables así:
    - `Daniela`: `80`
    - `Melkin Hernandez | Efeonce`: `34`
    - `Andrés Carlosama | Efeonce`: `31`
    - `constanza rojas`: `28`
    - `Adriana`: `8`
    - `Adriana, Daniela`: `5`
    - `Sin asignar`: `3`
  - `Efeonce` marzo 2026: tareas como `Actualizar Evergreen`, `Brandear Docs Nuevos Berel`, `Banner Blog — Artículo Berel…` ya llegan mapeadas a `daniela-ferreira`, `melkin-hernandez`, `andres-carlosama`, `luis-reyes`

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `3`
- Domain: `data`

## Summary

Convertir el `Performance Report` mensual de Delivery en un producto analítico canónico de Greenhouse con paridad total frente al reporte generado en Notion para `Efeonce`, empezando por `Marzo 2026` como período de calibración y `Abril 2026` como primer período operativo Greenhouse-first.

La lane no busca solo traer más propiedades de Notion. Busca fijar un contrato semántico único para el informe, cerrar los gaps de ingestión a `greenhouse_conformed`, materializar el reporte en Greenhouse y publicar los mismos resultados de vuelta a Notion para que Notion opere como capa de consumo y narrativa, no como motor alterno de cálculo.

## Why This Task Exists

Hoy Greenhouse ya puede reproducir parte del scorecard de Delivery, pero no alcanza todavía la misma profundidad diagnóstica ni la misma semántica del `Performance Report` mensual construido en Notion AI sobre el workspace vivo.

El riesgo operativo es alto:

- Greenhouse y Notion pueden divergir en métricas si calculan por separado.
- Greenhouse hoy no recibe todas las propiedades y relaciones requeridas para reconstruir el informe completo.
- el informe mensual se vuelve dependiente de interpretación contextual no versionada si no existe un contrato analítico explícito.
- el equipo no puede confiar en abril como primer período Greenhouse-first sin antes calibrar marzo contra la fuente real.

## Goal

- Definir un contrato canónico del `Performance Report` mensual con reglas explícitas de período, exclusión, clasificación y elegibilidad.
- Cerrar la paridad de datos necesaria desde `Notion -> notion_ops -> greenhouse_conformed -> PostgreSQL/serving`.
- Materializar el reporte mensual completo en Greenhouse y usarlo como source of truth para publicar resultados a Notion.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Greenhouse debe calcular el reporte mensual desde reglas versionadas, no desde interpretación ad hoc de Notion AI.
- Notion debe quedar como consumer del resultado canónico de Greenhouse para evitar drift semántico.
- La capa `conformed` debe preservar fidelidad suficiente de propiedades, relaciones e IDs para auditar el reporte completo.
- La calibración debe hacerse contra un período ya existente (`Marzo 2026`) antes de declarar confiable el período operativo siguiente (`Abril 2026`).

## Dependencies & Impact

### Depends on

- `TASK-186 - Delivery Metrics Trust: Notion Property Audit & Conformed Contract Hardening`
- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-postgres-source-sync.sql`
- datasets `notion_ops.*`, `greenhouse_conformed.*`, `ico_engine.*`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

### Impacts to

- `TASK-197 - Delivery Source Sync Assignee & Project Relation Parity`
- `TASK-198 - Delivery Notion Assignee Identity Coverage`
- `TASK-199 - Delivery Performance Owner Attribution Contract`
- `TASK-200 - Delivery Performance Metric Semantic Contract`
- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- `TASK-202 - Delivery Performance Report Publication & Notion Consumption Cutover`
- scorecards mensuales de Delivery
- `ICO` y sus readers mensuales
- futuros reportes de staffing, capacity y accountability operacional
- cualquier publicación de reportes mensuales hacia Notion

### Files owned

- `docs/tasks/in-progress/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-postgres-source-sync.sql`
- futuros readers/materializations del reporte mensual

## Current Repo State

### Ya existe

- `TASK-186` ya auditó propiedades y endureció parte del scorecard mensual.
- `TASK-187` ya formalizó governance de schema por `space` para Notion.
- Greenhouse ya calcula parte del `Performance Report` en `ICO` y serving.
- El reporte real `Performance Report — Marzo 2026` existe en `Efeonce Admin` y sirve como baseline de calibración.

### Gap actual

- `Proyectos` y `Tareas` de `Efeonce` no llegan completas a `greenhouse_conformed` ni a PostgreSQL.
- la semántica completa del reporte no está versionada en un contrato único.
- Notion y Greenhouse todavía pueden producir resultados distintos para el mismo período.
- no existe aún un carril canónico de publicación `Greenhouse -> Notion` para el informe mensual.
- El gap de atribución no es homogéneo entre spaces:
  - `Efeonce` sí llega con IDs de responsables y mapea bien a miembros
  - `Sky Airline` usa otra variante de propiedad (`Responsable`) y sí trae IDs en origen, pero hoy no conserva esa atribución al materializar `delivery_tasks`

### Baseline de reconciliación ya confirmada

- El caso `Daniela Ferreira / Marzo 2026` ya prueba que hoy no existe paridad real.
- La discrepancia no es una sola:
  - fórmula distinta
  - universo de tareas distinto
  - atribución distinta
  - snapshots históricos faltantes
- El `Performance Report` de Notion usa scope explícito `Efeonce + Sky` y owner principal.
- Greenhouse hoy materializa `metrics_by_member` con `UNNEST(assignee_member_ids)`, lo que no equivale al criterio de owner principal del reporte.
- El caso `Sky Airline` sugiere además una deuda previa a la atribución:
  - el problema no es el nombre de la propiedad en Notion
  - el problema se reparte entre:
    - pérdida de `assignee_source_id` al materializar `greenhouse_conformed.delivery_tasks`
    - cobertura incompleta de `greenhouse.team_members` para `notion_user_id` de `Sky`

## Scope

### Slice 1 - Contrato del reporte

- formalizar cada métrica, filtro, exclusión y criterio del `Performance Report`
- definir grano, período, timezone, elegibilidad, desempates y comparativo mes contra mes

### Slice 2 - Paridad de datos

- mapear `propiedad Notion -> notion_ops -> conformed -> postgres/serving`
- cerrar los gaps mínimos necesarios para reproducir el reporte completo
- reconciliar explícitamente `Efeonce + Sky` para casos reales como `Daniela / Marzo 2026`
- identificar qué parte del gap proviene de:
  - scope
  - owner attribution
  - fórmula
  - materialización faltante
- aislar específicamente el gap de identidad/atribución para `Sky`:
  - validar por qué `responsable_ids` sí existe en `notion_ops` pero no sobrevive a `delivery_tasks`
  - completar `greenhouse.team_members` para `constanza rojas` y `Adriana` si deben atribuirse en Greenhouse
  - confirmar si el reporte de Notion usa `owner principal` o una regla especial cuando el responsable pertenece al equipo cliente

### Slice 3 - Materialización canónica

- construir el read-model mensual en Greenhouse
- validar `Marzo 2026` contra el reporte ya existente en Notion

### Slice 4 - Publicación y operating model

- definir salida canónica de Greenhouse hacia Notion
- dejar el runbook mensual para publicar y validar cada cierre

## Out of Scope

- rediseño UI completo del módulo Agency o ICO
- reescritura total de `ICO`
- generalizar todavía el patrón a todos los spaces y verticales sin calibrar primero `Efeonce`

## Acceptance Criteria

- [ ] Existe contrato documental canónico del `Performance Report` mensual en Greenhouse.
- [ ] Existe matriz de paridad entre métricas del reporte y propiedades/relaciones necesarias de Notion.
- [ ] `Marzo 2026` puede recalcularse en Greenhouse con paridad verificable frente al reporte de Notion.
- [ ] Queda definido el carril operativo para producir `Abril 2026` desde Greenhouse y publicarlo a Notion.
- [ ] Existe reconciliación documentada `Notion vs Greenhouse` para al menos un caso real por miembro (`Daniela / Marzo 2026`) con explicación del gap.

## Verification

- revisión documental contra `TASK-186` y `TASK-187`
- validación de cobertura de propiedades en BigQuery y PostgreSQL
- comparación `Marzo 2026 Notion vs Greenhouse`
