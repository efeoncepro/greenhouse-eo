# TASK-186 - Delivery Metrics Trust: Notion Property Audit & Conformed Contract Hardening

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `2`
- Domain: `data`

## Summary

Institucionalizar la auditoría de propiedades Notion que alimentan métricas de Delivery para `Efeonce`, `Sky Airlines` y `ANAM`, dejando explícito qué campos ya entran a `greenhouse_conformed`, qué gaps siguen abiertos y qué parte del scorecard todavía depende de fórmulas o semánticas no unificadas.

La meta no es solo “tener más campos”, sino recuperar confianza en las métricas: que cualquier agente pueda reconstruir qué base de Notion alimenta qué KPI, qué IDs usar, qué campos son canónicos y qué contratos faltan antes de declarar el reporte como confiable. Esta lane también fija una regla de diseño: los teamspaces pueden parecerse, pero no son idénticos, por lo que el modelo debe absorber particularidades por cliente sin romper el contrato KPI base.

La ejecución de esta lane debe fortalecer el carril actual de `sync-notion-conformed` + `ICO`, no reemplazarlo abruptamente. La expectativa es construir paridad auditable sobre lo ya existente, cerrar gaps de contrato y recién después de eso retirar dependencias opacas de fórmulas Notion.

Dentro de la arquitectura canónica vigente, esta task debe leerse como `consumer hardening` sobre la foundation de integración formalizada en `TASK-187`, no como una redefinición de la capa de integraciones.

En ejecución, esta task también forma parte del carril `MVP` inmediato junto con `TASK-189`: primero recuperar confianza visible en métricas y scorecards, luego profundizar la formalización estructural de integraciones.

## Why This Task Exists

Hoy el portal ya tiene foundation importante para `ICO` y para el sync Notion -> `greenhouse_conformed`, pero la confianza en métricas sigue incompleta por cinco razones:

- no existe una task canónica que documente, con IDs exactos, las bases de `Proyectos` y `Tareas` auditadas en Notion para `Efeonce`, `Sky Airlines` y `ANAM`
- la capa conformed solo ingiere una parte del universo de propiedades que hoy usan o condicionan el performance report
- seguimos dependiendo de outputs de fórmula de Notion para varias señales (`Indicador de Performance`, `Cumplimiento`, `Completitud`, `RpA`, semáforos), en vez de tener siempre las primitivas necesarias para recomputarlas en Greenhouse
- hay deriva semántica en métricas críticas: por ejemplo `FTR` no usa exactamente la misma definición en live queries y en la materialización por miembro
- aunque los spaces comparten una base funcional similar, cada cliente introduce campos y semánticas propias; si se fuerza un esquema rígido de “one-size-fits-all”, se pierden señales valiosas o se contamina el core KPI con excepciones locales mal resueltas

Mientras este contrato no quede auditado y endurecido, cualquier dashboard o reporte mensual seguirá teniendo riesgo de:

- discrepancias entre Notion y Greenhouse
- métricas correctas “por accidente” pero no auditables
- pérdida de confianza del usuario en `ICO` y en la capa conformed

## Goal

- Dejar una baseline auditada de las propiedades reales en Notion para `Efeonce`, `Sky Airlines` y `ANAM`, incluyendo IDs de DB y data sources útiles para futuros agentes.
- Mapear propiedad por propiedad qué ya entra hoy a `greenhouse_conformed.delivery_projects` y `greenhouse_conformed.delivery_tasks`.
- Identificar qué gaps bloquean que Greenhouse sea dueño del `Performance Report` sobre la foundation de integración definida por `TASK-187` y `TASK-188`.
- Definir el contrato mínimo de primitivas y la secuencia de hardening para que las métricas vuelvan confiables y auditables.
- Definir explícitamente el patrón de flexibilidad esperado: `core KPI contract` compartido + extensiones / mappings por `space_id` para particularidades de cliente o tipo de proyecto.

## Iteration Principle

- No hacer `rip-and-replace` del pipeline actual de Notion ni del cálculo vigente de `ICO`.
- Reusar `greenhouse_conformed.delivery_projects`, `greenhouse_conformed.delivery_tasks` e `ico_engine` como foundation inicial.
- Priorizar compatibilidad y comparación lado a lado contra el reporte manual de Notion antes de cambiar el source of truth visible.
- Mover dependencias de fórmulas Notion a primitivas Greenhouse en slices pequeños y auditables.

## Recommended Execution Order

1. `TASK-189` corrige el filtro canónico de período y carry-over como fix quirúrgico de alto impacto.
2. `TASK-186` endurece el contrato de métricas Delivery y persigue un `MVP` confiable del `Performance Report`.
3. `TASK-188` consolida la arquitectura paraguas de `Native Integrations Layer`.
4. `TASK-187` formaliza Notion dentro de ese marco sin romper el binding, discovery y sync que ya existen.

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
- esta task no modela onboarding, registry ni drift como capability general; consume la foundation que debe cerrar `TASK-187`
- esta task no debe romper ni reescribir `ICO`; cualquier cambio sobre el engine debe ser incremental, compatible y orientado a aumentar confianza, no a cambiar el contrato completo de golpe

## Dependencies & Impact

### Depends on

- `TASK-002 - Tenant / Space -> Notion mapping`
- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `TASK-188 - Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model`
- `TASK-046 - Delivery Performance Metrics ICO Cutover`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `src/lib/ico-engine/shared.ts`
- `scripts/materialize-member-metrics.ts`
- datasets `notion_ops.*`, `greenhouse_conformed.*`, `ico_engine.*`

### Impacts to

- `TASK-011 - ICO Person 360 Integration`
- `TASK-048 - Delivery Sprint Runtime Completion`
- `TASK-049 - Delivery Client Runtime Consolidation`
- cualquier scorecard mensual de Delivery / Performance Reports
- futuros reportes de bonos, variable comp y accountability operacional basados en `ICO`

### Files owned

- `docs/tasks/to-do/TASK-186-delivery-metrics-trust-notion-property-audit-contract.md`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `src/lib/ico-engine/shared.ts`
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
- `ICO` ya expone KPIs clave (`otd_pct`, `ftr_pct`, `rpa_avg`, `throughput_count`, `pipeline_velocity`, `cycle_time`, `stuck_asset_pct`)
- La arquitectura de sync ya tiene foundation para flexibilidad vía `space_property_mappings`, pero esta task aún debe explicitar cómo usarla sin degradar el contrato KPI común.

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
- Hay deriva en `FTR`:
  - live/shared `ICO` usa `client_change_round_final = 0`
  - materialización por miembro usa `client_review_open = false`
- Falta institucionalizar un contrato “as-of month-end” para reportes mensuales auditables.

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
| `Tareas Efeonce` | `Parcial` | `space_id`, relaciones de tarea, proyecto y origen del space | Fijar regla institucional de segmentación por ejecución interna | `P1` |
| `Tareas Sky` | `Parcial` | `space_id`, task inventory | Fijar regla institucional de segmentación para trabajo Sky / client team | `P1` |
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

- [ ] `TASK-186` queda explícitamente posicionada como hardening de consumer sobre la integration foundation de `TASK-187`.
- [ ] La task documenta los DB IDs y data source IDs confirmados de `Efeonce` y `Sky Airlines`.
- [ ] Existe una baseline explícita de propiedades auditadas para `Proyectos` y `Tareas` en ambos spaces.
- [ ] Cada propiedad relevante para el performance report queda clasificada como `ya sincroniza`, `derivada`, `faltante` o `space-specific`.
- [ ] Queda documentada la deriva semántica actual de `FTR` y la decisión pendiente para unificarla.
- [ ] Queda definido el set mínimo de primitivas necesarias para que Greenhouse sea dueño del scorecard mensual.
- [ ] Queda documentada la regla de flexibilidad: core KPI común + extensiones/mappings por `space_id` para particularidades de cliente.
- [ ] La task incluye una matriz explícita `métrica del performance report -> ya se puede / qué falta / prioridad`.
- [ ] La task deja follow-ups claros para `sync-notion-conformed`, `greenhouse_conformed` y `ico_engine`.

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
