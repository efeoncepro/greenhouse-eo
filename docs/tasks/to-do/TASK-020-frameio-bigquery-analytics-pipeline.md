# CODEX TASK -- Frame.io Analytics Pipeline v2: enrichment canonico de delivery e ICO sobre source sync existente

## Estado

Baseline canonica de implementacion al 2026-03-19.

Esta version conserva la necesidad real detectada por `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline.md`, pero reescribe su base tecnica para alinearla con la arquitectura viva del proyecto:
- `PostgreSQL` como control plane operativo para bindings por `space`
- `BigQuery` como landing/raw-conformed-analytics layer, no como truth operativo de bindings
- `greenhouse_conformed.delivery_tasks` y `ico_engine.v_tasks_enriched` como contratos vigentes de consumo
- `Creative Hub` como consumer de read models compartidos, no de una vista silo paralela

## Resumen

Greenhouse necesita capturar metadata rica de Frame.io para cerrar gaps reales en:
- `Creative Hub`
- `ICO Engine`
- futuras lecturas de feedback, review velocity y throughput audiovisual

La necesidad es valida:
- hoy el sync vigente solo pasa conteos resumidos y status a Notion
- faltan timestamps por version
- faltan comments granulares
- falta metadata de assets como `duration_seconds`, `file_type`, `resolution` y `thumbnail`

La decision v2 cambia el como:
- no crear `greenhouse_conformed.tasks_enriched` como nueva surface paralela
- no usar BigQuery como control plane principal de `space -> frameio project`
- si capturar `files`, `versions`, `comments`, `share_activity` y `audit_logs`
- y luego enriquecer el contrato canonico existente de delivery/ICO

## Objetivo

Implementar un pipeline de Frame.io que:
- ingeste data analitica desde Frame.io V4
- preserve el binding por `space_id`
- exponga joins estables por `notion_page_id`
- enriquezca las capas ya existentes de `delivery` e `ICO`
- desbloquee mejoras reales en `Creative Hub`

## Decision de arquitectura

### Principios

- `Frame.io` sigue siendo source system externo
- `notion-frameio-sync` puede seguir existiendo para sync operativo Notion ↔ Frame.io
- el pull batch analitico puede vivir en el runtime existente de sync si eso acelera la entrega
- los bindings por tenant/space deben vivir en `PostgreSQL`
- `BigQuery` recibe el extract y la capa conformed derivada
- el consumo del portal debe seguir pasando por contratos compartidos

### Regla canonica

La task no debe introducir una segunda vista maestra de tareas.

El contrato vigente se mantiene:
- `greenhouse_conformed.delivery_tasks` = tabla conformed de delivery
- `ico_engine.v_tasks_enriched` = vista enriquecida consumida por `ICO Engine`

Frame.io entra como enrichment de ese contrato, no como reemplazo.

## Lo que esta task es y no es

Esta task si es:
- un pipeline de enrich de analytics para review audiovisual
- una extension del source sync existente
- un habilitador de `Creative Hub` e `ICO`

Esta task no es:
- un modulo CRUD de Frame.io dentro del portal
- una nueva identidad canonica de asset
- una nueva tabla maestra de tareas del delivery
- una razon para que `Creative Hub` lea de tablas silo exclusivas

## Scope MVP

Incluye:
- binding `space -> Frame.io project`
- extract batch diario de `files`, `versions`, `comments`
- opcion de incluir `share_activity` y `audit_logs` como fase 1.5
- join estable por `notion_page_id`
- enrichment del modelo de delivery ya existente
- mejoras de metricas de `ICO` y payloads de `Creative Hub`

No incluye:
- reemplazar `notion-frameio-sync` webhook existente
- CRUD de assets o comments en portal
- nueva vista `greenhouse_conformed.tasks_enriched`
- una UI nueva dedicada a administrar Frame.io

## Posicion en la arquitectura

```text
Frame.io API
  -> Frame.io analytics sync
     -> BigQuery source landing / source analytics
        -> greenhouse_conformed frameio_* (o vistas equivalentes)
           -> greenhouse_conformed.delivery_tasks enrichment
              -> ico_engine.v_tasks_enriched
                 -> Creative Hub / ICO Engine / portal reads
```

## Modelo recomendado

### A1. Binding por Space

Mantener el concepto de `space_frameio_sources`, pero alineado al modelo vivo:

```sql
CREATE TABLE greenhouse_core.space_frameio_sources (
  space_frameio_source_id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL
    REFERENCES greenhouse_core.spaces(space_id),

  frameio_account_id TEXT NOT NULL,
  frameio_workspace_id TEXT,
  frameio_project_id TEXT NOT NULL,

  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (space_id, frameio_project_id)
);
```

Reglas:
- usar `TEXT`, no `UUID`
- referenciar `spaces(space_id)`, no `spaces(id)`
- PostgreSQL es el control plane principal
- BigQuery puede tener replica para joins/analytics, pero no debe ser la fuente operativa primaria

### A2. Landing de Frame.io en BigQuery

La implementacion puede conservar `frameio_ops` como dataset fuente si eso acelera el MVP.

Tablas minimas:
- `frameio_ops.files`
- `frameio_ops.versions`
- `frameio_ops.comments`
- `frameio_ops.share_activity`
- `frameio_ops.audit_logs`
- `frameio_ops.sync_log`

Pero su rol debe quedar claro:
- source analytics / landing dataset
- no contrato final de consumo del portal

### A3. Capa conformed correcta

En vez de crear `greenhouse_conformed.tasks_enriched`, usar uno de estos dos caminos:

1. recomendado:
- `greenhouse_conformed.frameio_files`
- `greenhouse_conformed.frameio_versions`
- `greenhouse_conformed.frameio_comments`
- luego extender `ico_engine.v_tasks_enriched`

2. aceptable en MVP:
- mantener `frameio_ops.*`
- y hacer el enrich dentro de `ico_engine.v_tasks_enriched`

Regla:
- no crear una segunda vista de tareas compitiendo con `delivery_tasks`

### A4. Join contract

El join principal se mantiene por:
- `notion_page_id`

Eso esta bien alineado con la realidad del sync creativo actual.

Reglas:
- preservar `space_id` en todas las filas extraidas
- preservar `notion_page_id` cuando exista match
- no depender de regex sobre URLs en consumers finales si el pipeline puede resolver el FK una sola vez

## Relacion con Delivery

`Frame.io` no crea un nuevo objeto de delivery.

Aporta enrichment sobre:
- `greenhouse_conformed.delivery_tasks`
- `greenhouse_delivery.tasks` si luego se necesita proyeccion runtime adicional

Campos candidatos de enrichment:
- `fio_total_versions`
- `fio_total_comments`
- `fio_open_comments`
- `duration_seconds`
- `file_type`
- `resolution_width`
- `resolution_height`
- `thumbnail_url`
- `first_version_at`
- `last_version_at`
- `avg_hours_between_versions`
- `avg_comment_resolution_minutes`

## Relacion con ICO Engine

Este es el principal consumer estructural.

La v2 mantiene el objetivo del brief original:
- mejorar `Cycle Time`
- mejorar `Feedback Response Time`
- mejorar `Throughput` audiovisual
- mejorar `Comment Resolution Time`

Pero el camino correcto es:
- enriquecer `ico_engine.v_tasks_enriched`
- no reemplazarlo

Regla operativa:
- cualquier nueva metrica o columna debe entrar por el contrato existente del engine
- agregar nuevas columnas al `v_tasks_enriched`
- luego, si corresponde, agregar uso en `buildMetricSelectSQL()` o consumers de capability

## Relacion con Creative Hub

`Creative Hub` sigue siendo capability surface.

No debe depender de tablas silo nuevas solo para el modulo.

Debe leer:
- read models compartidos
- payloads derivados del mismo enrichment que nutre a `ICO`

Esto permite:
- gallery de assets recientes
- distribucion por tipo/resolucion
- CSC timing mas real
- comparativas entre proyectos

Sin crear una “base de datos propia de Creative Hub”.

## Runtime recomendado

La v2 no obliga a abandonar el repo externo de inmediato.

MVP pragmatico:
- extender `notion-frameio-sync` con batch analytics pull
- reutilizar auth OAuth y refresh ya existentes
- escribir a BigQuery landing dataset

Pero documentando que:
- el contrato operativo del portal esta en Greenhouse
- el control plane por `space` vive en Postgres
- el consumo final pasa por conformed + engine

## Fases recomendadas

### P0. Binding canonico por Space

- crear `greenhouse_core.space_frameio_sources`
- seed para al menos un `space`
- opcional: replica a BigQuery para analytics

### P1. Extract analitico base

- `files`
- `versions`
- `comments`
- `sync_log`

### P2. Enrichment compartido

- join por `notion_page_id`
- nuevas columnas para `ico_engine.v_tasks_enriched`
- ajustes en consumers de `Creative Hub`

### P3. Enrichment extendido

- `share_activity`
- `audit_logs`
- nuevas vistas o cards avanzadas

## Criterios de aceptacion v2

- existe binding canonico `space -> Frame.io` alineado al modelo actual
- el extract analitico preserva `space_id` y `notion_page_id`
- no se crea `greenhouse_conformed.tasks_enriched` como contrato paralelo
- `ICO Engine` consume el enrich dentro de `v_tasks_enriched` o equivalente vigente
- `Creative Hub` puede usar la nueva data sin crear tablas silo exclusivas
- la task deja a Frame.io como source enrichment y no como identidad paralela de delivery

## Riesgos a vigilar

- no mezclar control plane operativo con replica analitica en BigQuery
- no reintroducir `UUID` / `spaces(id)` en una zona ya normalizada a `TEXT` + `space_id`
- no romper el contrato actual del `ICO Engine`
- no convertir el repo externo en source of truth del modelo Greenhouse

## Proximo paso recomendado

Si esta lane se activa de verdad, el siguiente task ejecutivo deberia ser:
- `P0 Frame.io bindings + P1 extract base`

Con foco en:
- `space_frameio_sources`
- `frameio_ops.files`
- `frameio_ops.versions`
- `frameio_ops.comments`
- enrich controlado de `ico_engine.v_tasks_enriched`

---

## Dependencies & Impact

- **Depende de:**
  - `greenhouse_core.spaces` (Account 360 — ya implementado)
  - ICO Engine y `ico_engine.v_tasks_enriched` (ya implementado)
  - `notion-frameio-sync` repo externo (auth OAuth existente)
  - `CODEX_TASK_Tenant_Notion_Mapping` — `space_id` consistency en `notion_ops.*`
- **Impacta a:**
  - Creative Hub — gallery de assets, CSC timing, comparativas entre proyectos
  - `CODEX_TASK_Campaign_360_v2` — Frame.io enrichment por campaign
  - `CODEX_TASK_Business_Units_Canonical_v2` — ICO metrics por BU operativa con Frame.io data
- **Archivos owned:**
  - DDL de `greenhouse_core.space_frameio_sources`
  - BigQuery `frameio_ops.*` tables
  - BigQuery `greenhouse_conformed.frameio_*` conformed tables
  - Extensions a `ico_engine.v_tasks_enriched`
