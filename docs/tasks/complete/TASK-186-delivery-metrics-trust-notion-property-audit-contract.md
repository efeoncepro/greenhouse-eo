# TASK-186 - Delivery Metrics Trust: Notion Property Audit & Conformed Contract Hardening

## Delta 2026-04-01

- El `Performance Report` mensual de Agency dejó de existir solo como helper “on read” y ahora también queda materializado dentro de `ICO` como read-model auditable:
  - nueva tabla BigQuery `ico_engine.performance_report_monthly`
  - la materialización se construye desde `metric_snapshots_monthly` + `metrics_by_member`, no desde un cálculo paralelo
  - `readAgencyPerformanceReport()` ahora usa `materialized-first` con fallback seguro al cálculo previo si el snapshot aún no existe
- El scorecard mensual ahora también persiste mezcla de carga por segmento (`task_mix_json`) y el reader entrega:
  - `taskMix` ordenado por volumen
  - `alertText`
  - `executiveSummary`
- La segmentación del scorecard ya no usa el nombre derivado como clave:
  - ahora agrupa por `client_id` cuando existe
  - hace fallback a `space_id` cuando no existe vínculo de cliente
  - `client_name` / `space_id` quedan solo como label visible
- El scorecard mensual ya tiene carril formal de serving:
  - `ICO` emite `ico.performance_report.materialized`
  - nueva proyección `agency-performance-report`
  - nueva tabla PostgreSQL `greenhouse_serving.agency_performance_reports`
  - `readAgencyPerformanceReport()` ya puede leer `serving -> BigQuery materialized -> fallback computed`
- La UI Agency ICO ya muestra esas piezas del reporte sin recalcular métricas en el cliente:
  - alerta
  - resumen ejecutivo
  - cards `Tareas <segmento>` para los segmentos dominantes del período
- Se cerró además un sub-slice de serving formal del scorecard mensual:
  - migración PostgreSQL para `greenhouse_serving.agency_performance_reports`
  - proyección reactiva desde `ico_engine.performance_report_monthly`
  - `readAgencyPerformanceReport()` ahora intenta `Postgres-first`, luego `BigQuery materialized`, y recién después fallback al cálculo previo
- La segmentación explícita del reporte ya no depende solo de “top segments”:
  - `Tareas Efeonce` usa clasificación interna explícita (`efeonce_internal`, `client_internal`, `space-efeonce`, `Efeonce`, `Efeonce Internal`)
  - `Tareas Sky` usa clasificación explícita por referencias `Sky` en client/space
  - el scorecard mantiene además `taskMix` para segmentos adicionales
- El snapshot mensual del reporte persiste el resumen del scorecard y el `Top Performer` MVP con sus supuestos de elegibilidad, para evitar que el comparativo mensual dependa solo de request-time aggregation.
- Se implementó un segundo sub-slice aditivo en `ICO` para acercar el engine al `Performance Report` sin cambiar sus métricas troncales.
- `buildMetricSelectSQL()` ahora también materializa buckets canónicos como contexto: `on_time_count`, `late_drop_count` y `overdue_count`.
- Las materializaciones `metric_snapshots_monthly`, `metrics_by_project`, `metrics_by_member`, `metrics_by_sprint`, `metrics_by_organization` y `metrics_by_business_unit` quedaron extendidas de forma aditiva para persistir esos buckets.
- `read-metrics.ts` ahora expone esos buckets en `SpaceMetricSnapshot`, `IcoMetricSnapshot` y snapshots por proyecto/miembro como contexto adicional (`onTimeTasks`, `lateDropTasks`, `overdueTasks`).
- `Space 360 > ICO` ahora muestra esos buckets como contexto visible del snapshot.
- Se cerró la regla canónica actual del engine:
  - `on_time` y `late_drop` prefieren `performance_indicator_code` cuando existe y caen a derivación por fechas cuando no existe
  - `overdue` y `carry-over` permanecen como reglas período-relativas de `ICO`, no como labels upstream
  - `FTR` ya no debe leerse como una sola columna: usa `rpa_value <= 1` cuando existe, o fallback a rounds cliente/workflow en cero cuando no existe
  - además `FTR` exige que la tarea esté cerrada sin `client_review_open`, sin `workflow_review_open` y sin `open_frame_comments`
- Se agregó un read-model mensual reutilizable del `Performance Report` para Agency sobre `ICO` materializado:
  - helper `src/lib/ico-engine/performance-report.ts`
  - comparativo `mes actual vs mes anterior`
  - tendencia MVP (`improving`, `stable`, `degrading`) sobre `On-Time %`
  - `Top Performer` MVP desde `metrics_by_member`
- La API `GET /api/ico-engine/metrics/agency` ahora retorna `report` de forma aditiva y la vista Agency ICO ya lo muestra sin alterar los KPI cards existentes.
- Supuestos MVP explicitados:
  - `Top Performer` usa `OTD` del período
  - mínimo de elegibilidad: `throughput_count >= 5`
  - desempate: `throughput_count DESC`, `rpa_avg ASC`
  - multi-assignee: usa el modelo actual de crédito por miembro de `metrics_by_member`
- La auditoría del repo confirmó que esta lane ya no puede leerse solo como `Notion -> greenhouse_conformed`.
- Se corrigió la spec para reconocer la cadena runtime real: `Notion -> conformed -> ICO -> serving Postgres -> payroll / person intelligence`.
- Se dejó explícito que `TASK-186` no requiere esperar la implementación completa de `TASK-187` / `TASK-188` para avanzar con el `MVP`, pero sí debe mantenerse compatible con esa arquitectura target.
- Se reforzó el guardrail: cualquier endurecimiento del contrato de métricas debe preservar consumers actuales de `ICO`, `payroll`, `serving` y proyecciones reactivas.
- Se aclara que el trabajo reciente sobre `carry-over` debe leerse solo como un sub-slice técnico incremental y no como el foco principal de `TASK-186`.
- Se fija nuevamente el objetivo principal de la lane: paridad y confianza del `Performance Report`, con énfasis en buckets canónicos, `FTR`, snapshot mensual auditable, comparativo contra mes anterior y serving formal del scorecard.

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `2`
- Domain: `data`

## Summary

Institucionalizar la auditoría de propiedades Notion que alimentan métricas de Delivery para `Efeonce`, `Sky Airlines` y `ANAM`, dejando explícito qué campos ya entran a `greenhouse_conformed`, qué parte ya está proyectada a `greenhouse_delivery` / `greenhouse_serving`, qué gaps siguen abiertos y qué parte del scorecard todavía depende de fórmulas o semánticas no unificadas.

La meta no es solo “tener más campos”, sino recuperar confianza en las métricas: que cualquier agente pueda reconstruir qué base de Notion alimenta qué KPI, qué IDs usar, qué campos son canónicos y qué contratos faltan antes de declarar el reporte como confiable. Esta lane también fija una regla de diseño: los teamspaces pueden parecerse, pero no son idénticos, por lo que el modelo debe absorber particularidades por cliente sin romper el contrato KPI base.

La ejecución de esta lane debe fortalecer el carril actual de `sync-notion-conformed` + `ICO`, no reemplazarlo abruptamente. La expectativa es construir paridad auditable sobre lo ya existente, cerrar gaps de contrato y recién después de eso retirar dependencias opacas de fórmulas Notion.

Esta lane no debe confundirse con “propagar `carry-over` por todos lados”. Ese trabajo puede existir como slice de soporte, pero no representa el centro de la task.

Dentro de la arquitectura canónica vigente, esta task debe leerse como `consumer hardening` sobre la foundation de integración formalizada en `TASK-187`, no como una redefinición de la capa de integraciones.

En ejecución, esta task también forma parte del carril `MVP` inmediato junto con `TASK-189`: primero recuperar confianza visible en métricas y scorecards, luego profundizar la formalización estructural de integraciones.

## Why This Task Exists

Hoy el portal ya tiene foundation importante para `ICO`, para el sync Notion -> `greenhouse_conformed` y para serving Postgres downstream, pero la confianza en métricas sigue incompleta por cinco razones:

- no existe una task canónica que documente, con IDs exactos, las bases de `Proyectos` y `Tareas` auditadas en Notion para `Efeonce`, `Sky Airlines` y `ANAM`
- la capa conformed solo ingiere una parte del universo de propiedades que hoy usan o condicionan el performance report
- seguimos dependiendo de outputs de fórmula de Notion para varias señales (`Indicador de Performance`, `Cumplimiento`, `Completitud`, `RpA`, semáforos), en vez de tener siempre las primitivas necesarias para recomputarlas en Greenhouse
- persisten deriva y ambigüedad semántica en métricas críticas como `FTR`, pero ya no viven principalmente en la materialización por miembro de `ICO`; hoy el riesgo está en carriles/documentación paralelos y en consumers que aún no consumen el contrato completo
- aunque los spaces comparten una base funcional similar, cada cliente introduce campos y semánticas propias; si se fuerza un esquema rígido de “one-size-fits-all”, se pierden señales valiosas o se contamina el core KPI con excepciones locales mal resueltas

Mientras este contrato no quede auditado y endurecido, cualquier dashboard o reporte mensual seguirá teniendo riesgo de:

- discrepancias entre Notion y Greenhouse
- métricas correctas “por accidente” pero no auditables
- pérdida de confianza del usuario en `ICO` y en la capa conformed

## Goal

- Dejar una baseline auditada de las propiedades reales en Notion para `Efeonce`, `Sky Airlines` y `ANAM`, incluyendo IDs de DB y data sources útiles para futuros agentes.
- Mapear propiedad por propiedad qué ya entra hoy a `greenhouse_conformed.delivery_projects` y `greenhouse_conformed.delivery_tasks`.
- Mapear qué parte del contrato ya vive hoy en `greenhouse_delivery.tasks` y `greenhouse_serving.ico_member_metrics`.
- Identificar qué gaps bloquean que Greenhouse sea dueño del `Performance Report` sin romper el runtime actual de `ICO`, `payroll` y serving.
- Definir el contrato mínimo de primitivas y la secuencia de hardening para que las métricas vuelvan confiables y auditables.
- Definir explícitamente el patrón de flexibilidad esperado: `core KPI contract` compartido + extensiones / mappings por `space_id` para particularidades de cliente o tipo de proyecto.

## Iteration Principle

- No hacer `rip-and-replace` del pipeline actual de Notion ni del cálculo vigente de `ICO`.
- Reusar `greenhouse_conformed.delivery_projects`, `greenhouse_conformed.delivery_tasks` e `ico_engine` como foundation inicial.
- Reusar también `greenhouse_delivery.tasks`, `greenhouse_serving.ico_member_metrics` y las proyecciones ya existentes donde aplique.
- Priorizar compatibilidad y comparación lado a lado contra el reporte manual de Notion antes de cambiar el source of truth visible.
- Mover dependencias de fórmulas Notion a primitivas Greenhouse en slices pequeños y auditables.

## Recommended Execution Order

1. `TASK-189` corrige el filtro canónico de período y carry-over como fix quirúrgico de alto impacto.
2. `TASK-186` endurece el contrato de métricas Delivery y persigue un `MVP` confiable del `Performance Report`.
3. Dentro de `TASK-186`, priorizar primero:
   - buckets canónicos (`On-Time`, `Late Drops`, `Overdue`, `Carry-Over`)
   - semántica única de `FTR`
   - snapshot mensual / comparativo `mes actual vs mes anterior`
   - ranking `Top Performer`
   - serving formal del scorecard mensual
4. Tratar extensiones como `carry_over_count` en `serving/Postgres` como sub-slices de soporte y no como cierre de la lane.
5. `TASK-188` consolida la arquitectura paraguas de `Native Integrations Layer`.
6. `TASK-187` formaliza Notion dentro de ese marco sin romper el binding, discovery y sync que ya existen.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Greenhouse no debe calcular lógica de negocio directamente desde Notion API o desde Notion AI en request time.
- Los IDs de origen de Notion deben preservarse como `source ids`, no como identidad canónica de Greenhouse.
- Las métricas visibles y auditables deben derivarse preferentemente de primitivas canónicas en Greenhouse, no de fórmulas opacas de Notion.
- Las diferencias entre spaces (`Efeonce` vs `Sky Airlines`) deben resolverse con normalización explícita; no con supuestos implícitos escondidos en SQL o UI.
- Spaces parecidos no implican schemas idénticos: el contrato debe separar un núcleo KPI común de extensiones específicas por cliente, proyecto o vertical.
- esta task no modela onboarding, registry ni drift como capability general; consume la dirección arquitectónica de `TASK-187`, pero no necesita esperar su cierre completo para ejecutar el MVP de trust de métricas
- esta task no debe romper ni reescribir `ICO`; cualquier cambio sobre el engine debe ser incremental, compatible y orientado a aumentar confianza, no a cambiar el contrato completo de golpe
- cualquier ajuste debe preservar compatibilidad con consumers activos en:
  - `src/lib/payroll/fetch-kpis-for-period.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `src/lib/sync/projections/person-operational.ts`
  - `src/lib/sync/projections/person-intelligence.ts`

## Dependencies & Impact

### Depends on

- `TASK-002 - Tenant / Space -> Notion mapping`
- `TASK-046 - Delivery Performance Metrics ICO Cutover`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-postgres-source-sync.sql`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/sync/projections/ico-member-metrics.ts`
- `scripts/materialize-member-metrics.ts`
- datasets `notion_ops.*`, `greenhouse_conformed.*`, `ico_engine.*`
- tablas runtime `greenhouse_delivery.*`, `greenhouse_serving.ico_member_metrics`

### Impacts to

- `TASK-011 - ICO Person 360 Integration`
- `TASK-048 - Delivery Sprint Runtime Completion`
- `TASK-049 - Delivery Client Runtime Consolidation`
- cualquier scorecard mensual de Delivery / Performance Reports
- `payroll` projected / period KPI consumers
- `person_operational_metrics` y `person_intelligence`
- futuros reportes de bonos, variable comp y accountability operacional basados en `ICO`

### Files owned

- `docs/tasks/in-progress/TASK-186-delivery-metrics-trust-notion-property-audit-contract.md`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-postgres-source-sync.sql`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/sync/projections/ico-member-metrics.ts`
- `scripts/materialize-member-metrics.ts`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

## Current Repo State

### Nueva posición arquitectónica

- `TASK-188` y `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md` definen la architecture layer shared.
- `TASK-187` formaliza `Notion` como integración gobernada dentro de esa layer.
- `TASK-186` endurece el consumer `Delivery / ICO / Performance Report` sobre esa foundation.

### Ya existe

- El sync actual ya normaliza varias diferencias entre spaces en `sync-notion-conformed.ts`:
  - `nombre_de_tarea` / `nombre_de_la_tarea`
  - `estado` / `estado_1`
  - `client_change_round_final` / `cantidad_de_correcciones`
  - `rpa` / `rondas`
  - `semáforo_rpa` / `semáforo_rondas`
  - `responsables_ids` / `responsable_ids`
- `greenhouse_conformed.delivery_projects` y `greenhouse_conformed.delivery_tasks` ya almacenan el núcleo del scorecard:
  - proyecto: nombre, estado, resumen, finalización, `% on-time`, `RpA promedio`, owner, fechas, business unit
  - tarea: estado, prioridad, fase, responsables, completitud, cumplimiento, días de retraso, reprogramación, indicador de performance, rounds, `rpa`, review flags, bloqueos, comentario Frame, due dates y completed date
- `greenhouse_delivery.tasks` ya existe como proyección operacional Postgres con campos clave del scorecard (`due_date`, `completed_at`, `delivery_compliance`, `days_late`, `performance_indicator_code`, `client_change_round_final`, `rpa_value`, `review flags`, `original_due_date`)
- `ICO` ya expone KPIs clave (`otd_pct`, `ftr_pct`, `rpa_avg`, `throughput_count`, `pipeline_velocity`, `cycle_time`, `stuck_asset_pct`)
- `greenhouse_serving.ico_member_metrics` ya existe como puente BigQuery -> Postgres para consumo runtime y downstream
- La arquitectura de sync ya tiene foundation para flexibilidad vía `space_property_mappings`, pero esta task aún debe explicitar cómo usarla sin degradar el contrato KPI común.
- El endurecimiento reciente de `carry-over` en `ICO` y su propagación parcial a serving debe leerse solo como un sub-slice incremental de soporte; no cierra por sí mismo la paridad del `Performance Report`.

### Referencia MCP confirmada

#### Efeonce

- Teamspace: `Efeonce`
- `Proyectos` DB: `15288d9b-1459-4052-9acc-75439bbd5470`
- `Proyectos` data source: `collection://abaeb422-4538-44d8-b43f-026a907746a2`
- `Tareas` DB: `3a54f090-4be1-4158-8335-33ba96557a73`
- `Tareas` data source: `collection://5126d7d8-bf3f-454c-80f4-be31d1ca38d4`

#### Sky Airlines

- Teamspace: `Sky Airlines`
- `Proyectos` DB: `23039c2f-efe7-817a-8272-ffe6be1a696a`
- `Proyectos` data source: `collection://23039c2f-efe7-8116-8a83-000b758078f8`
- `Tareas` DB: `23039c2f-efe7-8138-9d1e-c8238fc40523`
- `Tareas` data source: `collection://23039c2f-efe7-81f8-af2d-000b67594d18`

#### ANAM

- Teamspace: `ANAM`
- Teamspace ID: `32539c2f-efe7-8162-8792-004280c1a3dd`
- `Proyectos` DB: `32539c2f-efe7-8053-94f7-c06eb3bbf530`
- `Proyectos` data source: `collection://32539c2f-efe7-814e-912f-000be974ec4b`
- `Tareas` DB: `32539c2f-efe7-81a4-92f4-f4725309935c`
- `Tareas` data source: `collection://32539c2f-efe7-8125-be10-000bdb706d4c`

### Baseline de propiedades auditadas vía MCP

#### Efeonce - Proyectos

- `Nombre del proyecto`
- `Estado`
- `Fechas`
- `Finalización`
- `% On-Time`
- `RpA Promedio`
- `Business Unit`
- `Propietario`
- `Resumen`
- `Tareas`
- `Está bloqueando`
- `Bloqueado por`
- `Prioridad`

#### Efeonce - Tareas

- `Nombre de tarea`
- `Estado`
- `Prioridad`
- `Priorización`
- `Completitud`
- `Cumplimiento`
- `Días de retraso `
- `Días reprogramados`
- `Reprogramada`
- `Indicador de Performance`
- `Client Change Round`
- `Client Change Round Final`
- `RpA`
- `Semáforo RpA`
- `Frame Versions`
- `Frame Comments`
- `Open Frame Comments`
- `Client Review Open`
- `Workflow Review Open`
- `Workflow Change Round`
- `Bloqueado por`
- `Bloqueando`
- `Proyecto`
- `Sprint`
- `Responsables`
- `Responsable (texto)`
- `Fecha límite`
- `Fecha límite original`
- `Fecha de completado`
- `Fecha de creación`
- `Fecha de inicio`
- `Fecha de envío a revisión`
- `Fecha de retorno`
- `Tiempo de ejecución`
- `Tiempo en cambios`
- `Tiempo en revisión`
- `Total días congelados`
- `Mes actual`
- `Mes de cierre`
- `Review Source`
- `Impacto`
- `Esfuerzo`
- `Estimaciones`
- `Tipo de entregable`
- `Urgencia`
- `Prioridad efectiva`
- `Prioridad sugerida`
- `Frame Asset ID`
- `URL Frame.io`
- `Resolved Frame Comments`
- `Last Frame Comment`
- `Last Frame Comment At`
- `Last Frame Comment ID`
- `Last Frame Comment Timecode`
- `Last Frame Comment Version`
- `Campaña`
- `Contenidos`
- `Email Marketing`
- `PRs de GitHub`
- `Revisiones`
- `Subtareas`
- `Tarea principal`
- `ID de la tarea`
- `Creado por`

#### Sky Airlines - Proyectos

- `Project name`
- `Estado`
- `Periodo`
- `% completado`
- `Avance tareas`
- `Responsable`
- `Resumen`
- `Prioridad`
- `Salud`
- `Tamaño campaña`
- `Mercados`
- `Tareas`
- `Bloqueado por`
- `Bloqueando`
- `Calendario de Contenidos`
- `Campaña Sky`
- `Gestión de campañas`
- `Archivos y multimedia`

#### Sky Airlines - Tareas

- `Nombre de la tarea`
- `Estado 1`
- `Responsable`
- `Responsable (texto)`
- `Prioridad`
- `Descripción`
- `Resumen`
- `Tipo de trabajo`
- `Tipo de pieza`
- `Plataforma`
- `Equipo`
- `Proyecto`
- `Sprint`
- `Pieza de calendario`
- `Calendario de Contenidos`
- `Campaña`
- `Subtareas`
- `Tarea principal`
- `Bloqueado por`
- `Bloqueando`
- `Correcciones`
- `Cantidad de correcciones`
- `Rondas`
- `Semáforo rondas`
- `Cumplimiento %`
- `Indicador de Performance`
- `Días de retraso`
- `Total días congelados`
- `Fecha límite`
- `Fecha de completado`
- `Fecha de iteración`
- `Fecha revisión`
- `Mes actual`
- `Mes de cierre`
- `Completitud`
- `Progreso`
- `Requerido`

#### ANAM - Proyectos

- `Nombre del proyecto`
- `Estado`
- `Fechas`
- `Finalización`
- `% On-Time`
- `RpA Promedio`
- `Facturación`
- `Propietario`
- `Resumen`
- `Tareas`
- `Está bloqueando`
- `Bloqueado por`
- `Prioridad`

#### ANAM - Tareas

- `Nombre de tarea`
- `Estado`
- `Prioridad`
- `Priorización`
- `Completitud`
- `Cumplimiento`
- `Días de retraso `
- `Días reprogramados`
- `Reprogramada`
- `Indicador de Performance`
- `Client Change Round`
- `Client Change Round Final`
- `RpA`
- `Semáforo RpA`
- `Frame Versions`
- `Frame Comments`
- `Open Frame Comments`
- `Resolved Frame Comments`
- `Client Review Open`
- `Workflow Review Open`
- `Workflow Change Round`
- `Bloqueado por`
- `Bloqueando`
- `Proyecto`
- `Sprint`
- `Responsables`
- `Responsable (texto)`
- `Fecha límite`
- `Fecha límite original`
- `Fecha de Completado`
- `Fecha de creación`
- `Fecha de inicio`
- `Fecha de envío a revisión`
- `Fecha de retorno`
- `Tiempo de ejecución`
- `Tiempo en cambios`
- `Tiempo en revisión`
- `Mes actual`
- `Mes de cierre`
- `Review Source`
- `Impacto`
- `Esfuerzo`
- `Estimaciones`
- `Tipo de entregable`
- `Urgencia`
- `Prioridad efectiva`
- `Prioridad sugerida`
- `Frame Asset ID`
- `URL Frame.io`
- `Last Frame Comment`
- `Last Frame Comment At`
- `Last Frame Comment ID`
- `Last Frame Comment Timecode`
- `Last Frame Comment Version`
- `Last Reviewed Version`
- `Last Workflow Status`
- `Contenidos`
- `Campaña`
- `Email Marketing`
- `PRs de GitHub`
- `Revisiones`
- `Subtareas`
- `Tarea principal`
- `Entregable`
- `Creado por`
- `ID de la tarea`
- `Fase de implementación`
- `Módulo HubSpot`
- `Origen`
- `Pendiente insumo cliente`
- `Tipo de entrega RevOps`

### Gap actual

- No todas las propiedades relevantes para el scorecard y sus explicaciones están entrando hoy a `greenhouse_conformed`.
- Efeonce tiene señales de priorización, freeze, review y root cause que hoy se pierden al sincronizar.
- Sky tiene semánticas propias (`Equipo`, `Plataforma`, `Tipo de trabajo`, `Correcciones`, `Rondas`) que hoy solo se normalizan parcialmente.
- ANAM tiene semánticas propias de implementación CRM/RevOps (`Fase de implementación`, `Módulo HubSpot`, `Origen`, `Pendiente insumo cliente`, `Tipo de entrega RevOps`, `Facturación`) que hoy no entran al contrato conformed.
- Falta fijar qué parte del modelo debe ser común a todos los spaces y qué parte debe vivir como extensión flexible por `space_id` o por tipo de proyecto/cliente.
- Seguimos dependiendo de fórmulas de Notion para varias señales importantes en vez de capturar suficientes primitivas.
- `Carry-Over` ya quedó endurecido en el carril canónico de `ICO` (`BigQuery` + read path), pero todavía no baja completo al serving Postgres ni a todos los consumers runtime.
- La deriva de `FTR` ya no está principalmente en la materialización por miembro: ese carril fue alineado al engine canónico. Lo pendiente es cerrar semántica única fuera de `ICO` y limpiar carriles/documentación con definiciones alternativas.
- Falta institucionalizar un contrato “as-of month-end” para reportes mensuales auditables y un serving formal del scorecard mensual.

## Performance Report Coverage Matrix

Objetivo de esta sección: dejar explícito qué tan cerca está Greenhouse de reproducir el `Performance Report` mensual de Notion con el mismo resultado y qué brechas siguen abiertas.

### Regla de lectura

- `Sí` = ya existe señal suficiente para calcular la métrica en Greenhouse
- `Parcial` = existe una aproximación útil, pero no una paridad exacta y audit-stable
- `No` = todavía no hay base suficiente o falta contrato claro

| Métrica del reporte | ¿Se puede calcular hoy? | Base actual en Greenhouse | Qué falta para paridad exacta | Prioridad |
| --- | --- | --- | --- | --- |
| `On-Time %` | `Parcial` | `due_date`, `completed_at`, `performance_indicator_label/code`, `delivery_compliance`, `days_late` | Definir fórmula canónica única y dejar de depender de fórmula Notion como verdad final | `P0` |
| `Late Drops` | `Parcial` | `performance_indicator_label/code`, `days_late`, `completed_at` | Recomputar bucket en Greenhouse y fijar snapshot mensual `as-of month-end` | `P0` |
| `Overdue` | `Parcial` | `task_status`, `due_date`, `days_late`, `completed_at` | Cerrar regla exacta de overdue mensual y congelar por período | `P0` |
| `Carry-Over` | `Parcial` | `performance_indicator_label/code`, `due_date`, `completed_at`, `task_status` | Reglas de corte mensual e histórico para evitar que el bucket cambie retroactivamente | `P0` |
| `OT Mes Anterior` | `No` | Existe base mensual reutilizable en `ICO`, pero no serving formal del scorecard | Materialización mensual comparativa `current vs previous month` | `P1` |
| `Periodo` | `Sí` | `due_date`, `completed_at`, mes de consulta | Solo falta fijar la convención exacta del cierre mensual | `P1` |
| `Total Tareas` | `Sí` | `delivery_tasks`, `space_id`, `completed_at`, `task_status` | Validar regla exacta de inclusión por período | `P1` |
| `Tareas Efeonce` | `Sí` | segmentación explícita en `performance_report_monthly` + fallback por clasificación interna | Validar si aparecen nuevos aliases internos fuera del set actual | `P2` |
| `Tareas Sky` | `Sí` | segmentación explícita en `performance_report_monthly` + fallback por referencias `Sky` | Validar si Sky requiere IDs/aliases más estrictos que `contains('sky')` | `P2` |
| `Top Performer` | `Parcial` | `assignee_member_ids`, `otd_pct`, `throughput_count`, `metrics_by_member` | Definir ranking oficial: base métrica, mínimo de volumen, manejo multi-assignee | `P0` |
| `Tendencia` | `No` | Se puede inferir desde comparación mensual | Definir contrato explícito de tendencia (`mejora`, `estable`, `retroceso`) | `P2` |
| `Alerta` | `Parcial` | Hay señales en `days_late`, overdue, backlog, rounds, bloqueos | Traducir alertas hoy narrativas a reglas explícitas y auditables | `P2` |
| `Resumen Ejecutivo` | `Parcial` | Puede sintetizarse desde KPIs calculados | Definir plantilla/narrativa o capa AI sobre métricas ya cerradas | `P3` |

### Gaps por grupo

#### Grupo 1 - Buckets de performance mensual

Métricas afectadas:

- `On-Time %`
- `Late Drops`
- `Overdue`
- `Carry-Over`

Gap real:

- hoy podemos aproximarlas usando campos ya sincronizados, pero seguimos dependiendo parcialmente de `Indicador de Performance`, `Cumplimiento` o lógica derivada de Notion
- falta institucionalizar el cálculo en Greenhouse y no solo persistir el resultado de la fórmula externa

Cierre esperado:

- fórmula canónica Greenhouse por bucket
- tests de regresión por bucket
- snapshot mensual materializado

#### Grupo 2 - Snapshot histórico y comparativos

Métricas afectadas:

- `OT Mes Anterior`
- `Tendencia`
- cualquier lectura “como se veía en marzo”

Gap real:

- el modelo actual sirve muy bien para operación viva, pero todavía no garantiza reconstrucción mensual exacta tipo cierre contable

Cierre esperado:

- tabla/materialización `performance_report_monthly`
- corte por `period_year`, `period_month`, `space_id`, `member_id`
- comparativo formal contra período previo

#### Grupo 3 - Ranking y ownership por persona

Métricas afectadas:

- `Top Performer`
- scorecards por responsable
- accountability operacional

Gap real:

- ya existe `assignee_member_ids`, pero falta cerrar la política de ranking y evitar deriva entre live y materializado
- multi-assignee sigue necesitando regla explícita para score individual

Cierre esperado:

- ranking oficial por miembro
- criterio de elegibilidad mínimo
- política explícita para tareas multi-assignee

#### Grupo 4 - Explicación y narrativa

Métricas afectadas:

- `Alerta`
- `Resumen Ejecutivo`

Gap real:

- hoy la señal existe distribuida, pero no como contrato explicativo oficial
- se puede redactar insight, pero todavía no está claro qué parte es determinística y qué parte es narrativa

Cierre esperado:

- capa explicativa basada en reglas
- narrativa opcional sobre métricas ya cerradas

## Minimum Viable Parity

Para declarar que Greenhouse ya puede reproducir el `Performance Report` mensual con confianza mínima, esta task debe dejar cerrado al menos este baseline:

- fórmula canónica en Greenhouse para `On-Time`, `Late Drop`, `Overdue` y `Carry-Over`
- materialización mensual auditable por `space_id`
- comparativo contra mes anterior
- ranking oficial `Top Performer`
- segmentación explícita de `Tareas Efeonce` y `Tareas Sky`
- regla unificada de `FTR`
- serving formal del scorecard mensual para consumers OLTP

Que `carry-over` exista en `ICO` o incluso en `serving` no es suficiente para considerar esta task cerrada.

## Recommended Implementation Order

1. Cerrar la fórmula canónica de buckets mensuales en Greenhouse.
2. Ampliar `greenhouse_conformed.delivery_tasks` con las primitivas faltantes de review/freeze.
3. Crear materialización mensual `performance_report_monthly` por `space` y por miembro.
4. Implementar comparativo `mes actual vs mes anterior`.
5. Formalizar ranking `Top Performer`.
6. Montar alertas/resumen ejecutivo encima de métricas ya estabilizadas.

## Scope

### Slice 1 - Auditoría de fuentes y propiedades

- consolidar en esta task los IDs de DB y data sources de Notion ya confirmados
- mantener el inventario de propiedades reales por space y por base (`Proyectos`, `Tareas`)
- anotar cambios/deltas de schema cuando Notion evolucione

### Slice 2 - Matriz Notion -> Conformed

- mapear propiedad por propiedad a:
  - `ya sincroniza`
  - `sincroniza pero como derivado`
  - `falta campo primitivo`
  - `espacio-específica`
- distinguir explícitamente entre:
  - señales operativas
  - señales KPI
  - señales de explicación / root cause

### Slice 3 - Contrato flexible por space

- separar el `core KPI contract` de las extensiones específicas por cliente
- definir cuándo una diferencia entre spaces debe:
  - normalizarse al core
  - vivir como `space-specific semantic`
  - resolverse por mapping/config y no por hardcode nuevo
- evitar que las excepciones de un cliente rompan o ensucien el scorecard base de todos

### Slice 4 - Contrato canónico de métricas

- definir cuáles métricas deben recomputarse en Greenhouse desde primitivas
- dejar temporalmente explicitadas las métricas que siguen viniendo desde fórmula de Notion
- cerrar la semántica única de `FTR`, `OTD`, `late drop`, `overdue`, `carry-over`

### Slice 5 - Plan de hardening

- definir ampliaciones concretas de `greenhouse_conformed.delivery_tasks` y `delivery_projects`
- definir qué debe entrar después a `ico_engine` y qué debe quedarse como señal workflow
- definir verificaciones SQL o checks de consistencia para validar que el scorecard mensual es trazable

## Out of Scope

- reemplazar Notion como upstream operativo de Delivery en un solo corte
- reescribir completo `ICO` antes de validar paridad de métricas con el reporte manual
- imponer un schema idéntico para todos los spaces sin extensiones controladas

- reescribir completo el pipeline externo de Notion en esta misma lane
- rediseñar el módulo visual de Delivery
- cortar todo Delivery inmediatamente a PostgreSQL
- reemplazar Notion como upstream operativo en esta iteración
- cualquier refactor amplio de `ico_engine` que no sea necesario para el MVP de confianza de métricas

## Acceptance Criteria

- [x] `TASK-186` queda explícitamente posicionada como hardening de consumer sobre la integration foundation de `TASK-187`.
- [x] La task documenta los DB IDs y data source IDs confirmados de `Efeonce` y `Sky Airlines`.
- [x] Existe una baseline explícita de propiedades auditadas para `Proyectos` y `Tareas` en ambos spaces.
- [x] Cada propiedad relevante para el performance report queda clasificada como `ya sincroniza`, `derivada`, `faltante` o `space-specific`.
- [x] Queda documentada la deriva semántica actual de `FTR`, incluyendo que el drift principal ya no está en la materialización por miembro de `ICO`, y la decisión pendiente para unificarla fuera del engine canónico.
- [x] Queda definido el set mínimo de primitivas necesarias para que Greenhouse sea dueño del scorecard mensual.
- [x] Queda documentada la regla de flexibilidad: core KPI común + extensiones/mappings por `space_id` para particularidades de cliente.
- [x] La task incluye una matriz explícita `métrica del performance report -> ya se puede / qué falta / prioridad`.
- [x] La task deja follow-ups claros para `sync-notion-conformed`, `greenhouse_conformed` y `ico_engine`.

## Verification

- Revisión MCP de Notion sobre las cuatro DB confirmadas
- Lectura de `src/lib/sync/sync-notion-conformed.ts`
- Lectura de `scripts/setup-bigquery-source-sync.sql`
- Lectura de `src/lib/ico-engine/shared.ts`
- Lectura de `scripts/materialize-member-metrics.ts`

## Open Questions

- ¿`Review Source` debe entrar como campo canónico para distinguir mejor `Frame`, `Sky`, cliente u otros carriles de revisión?
- ¿`Total días congelados` debe consumirse como primitiva materializada o recomputarse desde eventos/fechas base?
- ¿El scorecard mensual debe seguir aceptando señales derivadas de fórmula (`Indicador de Performance`, `Cumplimiento`) mientras se completa el hardening, o debe bloquearse hasta tener primitivas suficientes?
- ¿Sky requiere un adapter semántico propio antes de compartir completamente el mismo contrato KPI que Efeonce?

## Follow-ups

- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- ampliar `greenhouse_conformed.delivery_tasks` con las primitivas faltantes priorizadas en esta task
- institucionalizar snapshot mensual `as-of month-end` para scorecards auditables
- agregar checks de consistencia que comparen distribución KPI en Notion vs conformed para detectar drift antes de publicar reportes
