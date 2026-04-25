# Greenhouse Source Sync Pipelines V1

## Delta 2026-04-24 — TASK-588 resolución de título Notion tolerante a multi-tenant

El contrato del título canónico (`project_name`, `task_name`, `sprint_name` en
`greenhouse_delivery.*` y `greenhouse_conformed.delivery_*`) pasa a ser
**"real o NULL, jamás placeholder"**. Se elimina el fallback hardcoded a
`'Sin nombre'` en los dos writers.

### Por qué

El Cloud Run externo `notion-bq-sync` serializa cada property Notion con
`force_string=True` en una columna cuyo nombre deriva del property name
normalizado a snake_case. La property title tiene nombre **decidido por el
cliente** en la UI de Notion — Efeonce usa `Nombre del proyecto` →
`nombre_del_proyecto`, Sky Airline usa `Project name` → `project_name`. El
sync canónico leía solo `nombre_del_proyecto` y cualquier tenant con otra
convención terminaba con todos sus títulos en NULL → placeholder `'Sin nombre'`
→ propagación a `greenhouse_delivery.projects` → visible en signals ICO
(`dimensionLabel: "Sin nombre"`).

### Contrato nuevo

- El sync construye una cascada COALESCE **data-driven** por corrida: consulta
  `INFORMATION_SCHEMA.COLUMNS` de cada tabla raw (`notion_ops.proyectos`,
  `notion_ops.tareas`, `notion_ops.sprints`) y arma un `COALESCE(NULLIF(TRIM(col)), ...)`
  solo con las columnas que existen. Set canónico conservador (solo columnas
  semánticamente equivalentes al título):
  - projects: `['nombre_del_proyecto', 'project_name']`
  - tasks: `['nombre_de_tarea', 'nombre_de_la_tarea']`
  - sprints: `['nombre_del_sprint', 'sprint_name']`
- Si el cascade no resuelve ninguna columna poblada para una fila, el writer
  persiste `NULL` y emite un warning estructurado a
  `greenhouse_sync.source_sync_failures` con `error_code='sync_warning_missing_title'`
  y `retryable=false` (observabilidad, no fallo).
- La tabla PG `greenhouse_delivery.*` tiene CHECK constraint
  (`*_name_no_sentinel_chk`) que prohíbe strings placeholder
  (`'sin nombre'`, `'sin título'`, `'untitled'`, `'no title'`, `'sem nome'`,
  `'n/a'`) case-insensitive. Cualquier writer futuro que intente escribirlos
  falla al INSERT.
- El resolver del ICO (`entity-display-resolution.ts`) tiene defensa en
  profundidad: rechaza los mismos sentinels y más shapes de IDs técnicos
  (numéricos largos, prefijos extendidos) para no propagar placeholder
  ni IDs crudos a la narrativa del LLM o la UI, aunque signals históricos
  en BQ aún los tengan en `payloadJson.dimensionLabel`.

### Topología

```text
Notion (property title con nombre variable por cliente)
  ↓ Cloud Run notion-bq-sync (force_string=True)
BQ notion_ops.{proyectos,tareas,sprints}  ← tabla multi-tenant, columnas
                                             variables por space
  ↓ sync canónico (sync-notion-conformed.ts)
  ↓   + readTableColumns() + buildCoalescingTitleExpression()
  ↓   = SELECT ... COALESCE(NULLIF(TRIM(c1),''), NULLIF(TRIM(c2),'')) AS nombre_del_proyecto
  ↓
BQ greenhouse_conformed.delivery_*  (title real o NULL)
  ↓ legacy writer (scripts/sync-source-runtime-projections.ts, CLI-only)
  ↓   = mismo patrón de cascade
PG greenhouse_delivery.*  (CHECK constraint activa)
  ↓ ICO materialize (materialize-ai-signals.ts)
  ↓   + resolver con doble filtro: !isTechnicalProjectIdentifier && !isProjectDisplaySentinel
BQ ico_engine.ai_signals.payload_json.dimensionLabel  (human-readable o fallback "este proyecto")
  ↓
PG greenhouse_serving.ico_ai_signals  ← UI reads
```

### Extensión futura

Si aparece un tenant nuevo con property title fuera del set canónico (p. ej.
una space con `Título`, `Name`, `Campaign name`), el warning
`sync_warning_missing_title` lo expone inmediatamente en la siguiente corrida.
La remediación es extender los `NOTION_*_TITLE_CANDIDATES` en
`src/lib/sync/sync-notion-conformed.ts`. No se requiere config por space ni
tabla de mappings — el sistema sigue siendo stateless para esto.

### Archivos clave

- `src/lib/sync/sync-notion-conformed.ts` — cascade helpers, emitMissingTitleWarning,
  countMissingTitles
- `scripts/sync-source-runtime-projections.ts` — cascade local replicado (CLI-only)
- `src/lib/ico-engine/ai/entity-display-resolution.ts` — sanitizer + sentinels
- `migrations/20260424082917533_project-title-nullable-sentinel-cleanup.sql` — nullable + cleanup batch-safe + CHECK
- `docs/tasks/in-progress/TASK-588-project-title-resolution-conformed-sync-hardening.md`

## Delta 2026-04-21 — TASK-540 agrega Party Lifecycle outbound a HubSpot

Nuevo lane outbound: `greenhouse_core.organizations / commercial_party -> HubSpot Companies`.

### Topologia

```text
greenhouse_sync.outbox_events
  -> partyHubSpotOutbound
    -> push-party-lifecycle.ts
      -> PATCH /companies/:id/lifecycle (hubspot-greenhouse-integration)
        -> HubSpot company properties
          -> gh_last_write_at
            -> sync-hubspot-company-lifecycle.ts (inbound guard anti-ping-pong)
```

### Reglas

1. El outbound solo escribe campos Greenhouse-owned; `name`, `domain`, `industry`, address y phone siguen owned por HubSpot.
2. `gh_last_write_at` es el anchor canónico del anti-ping-pong entre outbound Greenhouse e inbound lifecycle sync.
3. Si el servicio externo responde `404`, Greenhouse trata el resultado como `endpoint_not_deployed`; no se considera hard fail de todo el reactor.
4. Los conflictos operativos se persisten en `greenhouse_commercial.party_sync_conflicts`; no existe una tabla viva `source_sync_pipelines` para este lane.
5. La decisión V1 de compliance es exportar `gh_mrr_tier` y no monto bruto `gh_mrr_clp`.

## Delta 2026-04-21 — TASK-536 extiende HubSpot Companies inbound a Party Lifecycle

Nuevo pipeline inbound: `greenhouse_crm.companies -> greenhouse_core.organizations` para materializar prospects y oportunidades comerciales antes del closed-won.

### Topologia

```text
HubSpot Companies raw/conformed snapshot
  -> greenhouse_crm.companies
    -> sync-hubspot-companies.ts
      -> greenhouse_core.organizations
      -> greenhouse_core.organization_lifecycle_history
      -> greenhouse_core.clients (solo si el stage resuelve a active_client)
      -> greenhouse_sync.outbox_events (commercial.party.created/promoted, commercial.client.instantiated)
      -> greenhouse_sync.source_sync_runs + source_sync_watermarks
```

### Reglas

1. El inbound nuevo usa `greenhouse_crm.companies` como source-of-work local; no depende de un list endpoint live del servicio `hubspot-greenhouse-integration`.
2. La cadencia canónica queda en `*/10 * * * *` para incremental y `0 3 * * *` para full resync. El rollout inicial usó `GREENHOUSE_PARTY_LIFECYCLE_SYNC`; `TASK-543` removió ese env guard y el pipeline queda default-on.
3. Toda creación de organization pasa por `createPartyFromHubSpotCompany`; toda promoción posterior pasa por `promoteParty`.
4. `provider_only`, `disqualified` y `churned` se tratan como stages protegidos: el inbound no los degrada.
5. Si HubSpot resuelve a `active_client`, el pipeline respeta el invariante del modelo y materializa `client_id` vía `instantiateClientForParty`.
6. El tracking operativo vive en `greenhouse_sync.source_sync_runs` y `greenhouse_sync.source_sync_watermarks`; no existe una tabla viva `source_sync_pipelines` que haya que sembrar para este corte.

## Delta 2026-04-18 — TASK-454 adds a lightweight HubSpot lifecycle bridge sync

Nuevo pipeline inbound liviano: `HubSpot company lifecycle -> greenhouse_core.clients`.

### Topologia

```text
HubSpot Companies API (lifecyclestage)
  -> Cloud Run hubspot-greenhouse-integration (company profile live read)
    -> sync-hubspot-company-lifecycle.ts
      -> greenhouse_core.clients (denormalized bridge fields)
        -> greenhouse_sync.outbox_events (crm.company.lifecyclestage_changed)
```

### Reglas

1. La raíz operativa sigue siendo `organizations.hubspot_company_id`; `clients` no se vuelve root canónico de Company.
2. El writer solo actualiza rows cuyo `lifecyclestage_source` no sea `manual_override`.
3. `nubox_fallback` se usa solo como backfill conservador para rows legacy sin `hubspot_company_id` pero con evidencia económica runtime.
4. El evento nuevo solo se publica cuando el stage cambia realmente; si solo cambia el source, no hay noise en outbox.
5. La cadencia queda en `0 */6 * * *` porque `lifecyclestage` no requiere polling agresivo.

## Delta 2026-04-13 — Nubox hardening generalizes the canonical inbound sync pattern

El incidente `Nubox` del `2026-04-13` dejó explícito un patrón que ahora debe tratarse como canónico para cualquier pipeline inbound `source -> raw -> conformed -> product`.

### Stage graph canónico

```text
Source API / upstream
  -> Source adapter
  -> Sync planner (hot window + historical sweep + lease)
  -> Raw snapshots (append-only)
  -> Conformed snapshots (append-only or stage-safe writer)
  -> Product projection / serving upsert
  -> Status / readiness / alerting
```

### Reglas nuevas

1. `raw` es la primera evidencia durable del source y la base de frescura real.
2. `conformed` no debe usar `DELETE` destructivo sobre tablas que puedan quedar bloqueadas por streaming buffers o writes calientes.
3. Los readers de `conformed` deben poder resolver `latest snapshot by source id`.
4. La capa producto debe usar `source_last_ingested_at` o equivalente; `NOW()` en la proyección no cuenta como señal de sync del source.
5. Toda pipeline multi-fase debe exponer estado por etapa (`raw_sync`, `conformed_sync`, `projection`) y no esconder fallas parciales detrás de un status agregado ambiguo.
6. Todo pipeline crítico debe soportar replay manual e historical sweep sin edición manual de SQL ni secretos.

### Aplicación inmediata

`Nubox` ya opera bajo este patrón:

- raw con hot window + historical sweep rotativo
- conformed append-only snapshots
- projection PostgreSQL leyendo latest snapshot por ID
- `sync-status` exponiendo `lastRaw`, `lastConformed` y `lastProjection`

La misma disciplina debe aplicarse progresivamente a otros source syncs críticos que aún dependan de writers destructivos o de freshness inferida.

## Delta 2026-04-07 — TASK-210 HubSpot Quotes sync pipeline

Nuevo pipeline inbound: HubSpot Quotes → PostgreSQL `greenhouse_finance.quotes`.

### Topologia

```
HubSpot CRM (quotes API)
  → Cloud Run hubspot-greenhouse-integration (GET /companies/{id}/quotes)
    → Greenhouse sync function (sync-hubspot-quotes.ts)
      → PostgreSQL greenhouse_finance.quotes (source_system='hubspot')
        → Outbox event (finance.quote.synced)
```

### Identidad

- Key de resolucion: `hubspot_company_id` en `greenhouse_core.organizations`
- Join: `organizations` → `spaces` → `client_id` + `organization_id`
- ID format: `QUO-HS-{hubspot_quote_id}`
- Idempotencia: `ON CONFLICT (quote_id) DO UPDATE`

### Scheduling

- Cron: `GET /api/cron/hubspot-quotes-sync` registrado en `vercel.json`
- Frecuencia: cada 6 horas (`0 */6 * * *`)
- Readiness gate: `checkIntegrationReadiness('hubspot')` — skip si down/blocked

### Outbound (reverse sync)

- `POST /api/finance/quotes/hubspot` → Cloud Run `POST /quotes`
- Crea quote + line items + asociaciones en HubSpot en una sola operacion
- Persiste localmente en transaccion con outbox event `finance.quote.created`

### Archivos

| Archivo | Funcion |
|---------|---------|
| `src/lib/hubspot/sync-hubspot-quotes.ts` | `syncAllHubSpotQuotes()`, `syncHubSpotQuotesForCompany()` |
| `src/lib/hubspot/create-hubspot-quote.ts` | `createHubSpotQuote()` — outbound |
| `src/app/api/cron/hubspot-quotes-sync/route.ts` | Cron endpoint con readiness gate |
| `src/lib/integrations/hubspot-greenhouse-service.ts` | Client methods para Cloud Run |
| `scripts/backfill-hubspot-quotes.ts` | Backfill one-time para quotes existentes |

## Delta 2026-04-03 — TASK-209 final closure in production

La lane `TASK-209` quedó cerrada también a nivel de arquitectura runtime, no solo como control plane local.

Contrato operativo final:

- el upstream `../notion-bigquery` ya dispara callback determinístico a `GET /api/cron/sync-conformed` cuando una corrida `full` multi-tenant termina bien
- Greenhouse mantiene de todos modos su control plane local (`waiting_for_raw`, `retry_scheduled`, `retry_running`, `sync_completed`, `sync_failed`) y el recovery cron como safety net
- `src/lib/sync/sync-notion-conformed.ts` sigue siendo el único writer canónico de `greenhouse_conformed.delivery_*`
- el writer canónico ya no expone un failure mode de actualización parcial entre `delivery_projects`, `delivery_tasks` y `delivery_sprints`:
  - stagea primero en tablas efímeras
  - luego hace swap sobre el carril canónico
  - si `notion_ops` no es más nueva que `greenhouse_conformed`, devuelve éxito sin volver a escribir

Regla vigente para métricas:

- `ICO`, `Delivery Performance` y demás consumers downstream deben seguir leyendo `greenhouse_conformed.delivery_*`
- `raw_pages_snapshot`, `notion_ops.*` y `stg_*` son carriles de ingestión / compatibilidad / auditoría, no la capa canónica de cálculo
- la mejora de `TASK-209` fortalece la calidad del snapshot para cálculo; no redefine las fórmulas del negocio

Estado operativo validado el `2026-04-03`:

- el callback upstream `notion-bq-sync -> greenhouse.efeoncepro.com/api/cron/sync-conformed` ya respondió `200`
- el cron `sync-conformed` convergió con `healthySpaces: 2`, `brokenSpaces: 0`
- ambos `space_id` activos volvieron a refrescar `notion_ops.tareas` y `greenhouse.space_notion_sources.last_synced_at`

## Delta 2026-04-03 — TASK-209 Notion sync orchestration closure

Greenhouse ya tiene un control plane explícito para cerrar la recurrencia `raw -> conformed` del pipeline de Delivery sobre Notion.

Contrato operativo vigente:

- `GET /api/cron/sync-conformed` deja de ser un intento aislado y pasa a registrar explícitamente `waiting_for_raw` cuando el upstream todavía no está listo
- existe un carril de recuperación `GET /api/cron/sync-conformed-recovery` agendado cada `30` minutos para reintentar dentro de la ventana operativa sin depender de reruns manuales
- el storage canónico del cierre de orquestación vive en:
  - `greenhouse_sync.notion_sync_orchestration_runs`
- los estados tipados del control plane son:
  - `waiting_for_raw`
  - `retry_scheduled`
  - `retry_running`
  - `sync_completed`
  - `sync_failed`
  - `cancelled`
- el writer canónico sigue siendo único:
  - `src/lib/sync/sync-notion-conformed.ts`
- la orquestación se apoya en la freshness gate existente y no calcula métricas inline
- las surfaces admin ya exponen esta señal junto al monitor de data quality en:
  - `/admin/integrations`
  - `TenantNotionPanel`

Scheduling operativo actualizado:

- upstream raw (`../notion-bigquery`) mantiene su scheduler diario a `03:00 America/Santiago`
- `GET /api/cron/sync-conformed` corre a `20 6 * * *`
- `GET /api/cron/sync-conformed-recovery` corre cada `30` minutos
- `GET /api/cron/notion-delivery-data-quality` queda después de esa ventana para reducir falsos `broken/degraded` por simple desfase temporal

Implicación arquitectónica:

- el callback upstream ya existe y es parte del cierre nominal del loop
- el polling de frescura + retry auditado por `space_id` se conserva como resiliencia local, no como sustituto del callback
- la salud del pipeline ya no depende de recordar un rerun manual; el estado pendiente queda visible y recuperable dentro del operating model normal

## Delta 2026-04-03 — TASK-208 recurrent data quality monitor for Notion delivery

El tramo endurecido `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks` ya tiene monitoreo recurrente persistido.

Contrato operativo vigente:

- `src/lib/integrations/notion-delivery-data-quality.ts` ejecuta el auditor por `space_id`, persiste runs/checks y clasifica el estado como `healthy`, `degraded` o `broken`
- el storage histórico vive en:
  - `greenhouse_sync.integration_data_quality_runs`
  - `greenhouse_sync.integration_data_quality_checks`
- el monitor corre en dos momentos:
  - cron dedicado `GET /api/cron/notion-delivery-data-quality`
  - hook post-sync después de `GET /api/cron/sync-conformed`
- el monitor reutiliza:
  - el auditor de paridad de `TASK-205`
  - las freshness gates y validaciones runtime de `TASK-207`
- la visibilidad operativa ya existe en:
  - `/admin/integrations`
  - `/admin/ops-health`
  - `TenantNotionPanel`

Implicación arquitectónica:

- `source_sync_runs` sigue siendo el control plane de ejecución del sync
- pero la salud histórica de calidad del dato ya no depende de inferencias ad hoc sobre esos runs
- Greenhouse ahora conserva evidencia explícita de drift y severidad por `space`

## Delta 2026-04-03 — TASK-207 runtime hardening for Notion delivery sync

Se cerró el hardening estructural del tramo `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`.

Contrato operativo vigente:

- el writer canónico de `greenhouse_conformed.delivery_tasks` es `src/lib/sync/sync-notion-conformed.ts`
- `/api/cron/sync-conformed` ya exige frescura real de `notion_ops` vía `checkIntegrationReadiness('notion', { requireRawFreshness: true })`
- la frescura real se evalúa por `space_id` activo en `greenhouse_core.space_notion_sources`, contra `notion_ops.tareas` y `notion_ops.proyectos`
- si el raw no está listo, el cron no materializa y registra el run como `cancelled` o `failed` en `greenhouse_sync.source_sync_runs`
- el writer canónico ya preserva `tarea_principal_ids` y `subtareas_ids` en `greenhouse_conformed.delivery_tasks`
- antes de declararse exitoso, el writer valida:
  - paridad `raw -> transformed`
  - paridad `transformed -> persisted`
  - cobertura de `assignee_source_id`
- `scripts/sync-source-runtime-projections.ts` sigue existiendo para seeds/runtime PostgreSQL, pero ya no debe sobreescribir `greenhouse_conformed.*` salvo que `GREENHOUSE_ENABLE_LEGACY_CONFORMED_OVERWRITE=true`

Implicación arquitectónica:

- la convergencia práctica a single writer ya está cerrada para la capa conformed de Delivery
- el siguiente paso natural es monitoreo recurrente y alerting sobre este contrato endurecido, no otro hardening paralelo

## Delta 2026-04-02 — Project to Tasks association model for Notion parity

La relación `Proyecto -> Tareas` de Notion ya tiene un espejo parcial en Greenhouse, pero hoy no está modelada con fidelidad completa.

Estado actual confirmado en runtime:

- `greenhouse_conformed.delivery_tasks` preserva `project_source_id` singular
- `greenhouse_delivery.tasks` preserva `project_record_id` y `notion_project_id` singular
- el sync actual toma la primera relación disponible desde `proyecto_ids?.[0]`
- la lectura `Proyecto -> Tareas` ya puede reconstruirse por join, pero se pierde fidelidad si una tarea trae más de una relación o si queremos auditar exactamente el array de relaciones de Notion

Decisión arquitectónica:

- Greenhouse debe tratar la relación canónica operativa como `task belongs to primary project`
- pero debe preservar además la fidelidad del array de relaciones de Notion para auditoría y paridad

Modelo objetivo:

### 1. Raw fidelity

En `notion_ops` y `greenhouse_conformed` debemos preservar:

- `project_source_ids ARRAY<STRING>` en tareas
- `task_source_ids ARRAY<STRING>` en proyectos cuando la fuente lo permita

Regla:

- el array preserva la relación exacta de Notion
- no debe degradarse a solo la primera relación sin guardar el resto

### 2. Canonical operational relation

Para runtime y joins rápidos, Greenhouse debe exponer:

- `primary_project_source_id` en tareas de conformed
- `project_record_id` en PostgreSQL runtime

Regla:

- la relación operativa principal se usa para APIs, readers y scorecards
- si una tarea viene con más de un proyecto relacionado, Greenhouse debe escoger una relación primaria explícita y además conservar el resto en el carril de fidelidad

### 3. Bridge for future many-to-many fidelity

Si el workspace empieza a usar relaciones `task <-> project` genuinamente many-to-many, el patrón recomendado es un bridge explícito:

- `greenhouse_conformed.delivery_task_project_links`
- `greenhouse_delivery.task_project_links`

Campos mínimos sugeridos:

- `task_source_id`
- `project_source_id`
- `is_primary`
- `source_relation_count`
- `sync_run_id`
- `synced_at`

Regla:

- no crear el bridge solo por teoría
- activarlo cuando la auditoría detecte tareas con múltiples proyectos reales o cuando un módulo necesite esa fidelidad explícita

### 4. Project 360 read model

La lectura correcta de un proyecto con sus asociaciones no debe depender de una columna rollup tipo Notion.

Debe resolverse por join desde tareas y exponer:

- metadatos del proyecto
- lista de tareas asociadas
- counts por estado
- overdue, on-time, late drops, carry-over
- responsables
- bloqueos
- fechas relevantes
- KPIs agregados del conjunto de tareas

Regla:

- `Proyecto -> Tareas` en Greenhouse debe ser un read-model calculado, no un string o label precalculado opaco

### 5. Publishing back to Notion

Si Greenhouse publica de vuelta a Notion:

- Notion puede consumir rollups o scorecards derivados de Greenhouse
- pero la verdad operativa del vínculo `project -> tasks` debe seguir viviendo en Greenhouse como join auditable

Vía recomendada de implementación:

1. ampliar `greenhouse_conformed.delivery_tasks` para preservar `project_source_ids`
2. mantener `project_source_id` actual como `primary_project_source_id`
3. evaluar si `delivery_projects` necesita también `task_source_ids` o si el join desde tasks es suficiente
4. construir un reader `Project 360` sobre `delivery_projects + delivery_tasks`
5. si aparecen casos reales many-to-many, introducir el bridge `task_project_links`

## Delta 2026-04-02 — TASK-197 source sync parity implemented

Se implementó un primer slice técnico de paridad para responsables y relación `Proyecto -> Tareas`.

Cambios aplicados:

- `greenhouse_conformed.delivery_tasks` ahora preserva `project_source_ids ARRAY<STRING>` además de `project_source_id`
- `sync-notion-conformed.ts` ahora valida cobertura de assignee por `space_id`, no solo globalmente
- `scripts/sync-source-runtime-projections.ts` ya normaliza `responsables_ids` y `responsable_ids` en el mismo carril
- `greenhouse_delivery.tasks` queda preparado para persistir:
  - `assignee_source_id`
  - `assignee_member_ids`
  - `project_source_ids`

Compatibilidad:

- `project_source_id` y `assignee_member_id` siguen existiendo como contrato backward-compatible
- `ICO` puede seguir leyendo `project_source_id` y `assignee_member_ids`
- `Person 360` puede seguir leyendo `assignee_member_id` mientras runtime empieza a cerrar la brecha de fidelidad

Nota operativa:

- update 2026-04-02:
  - el bloqueo de migraciones quedó superado y se aplicó `20260402222438783_delivery-runtime-space-fk-canonicalization.sql`
  - `greenhouse_delivery.{projects,sprints,tasks}.space_id` ya referencia `greenhouse_core.spaces(space_id)`
  - el setup base `scripts/setup-postgres-source-sync.sql` quedó alineado con esa FK canónica
  - el cron moderno también corrigió el falso fallback `COALESCE(responsables_ids, responsable_ids)` mediante una selección de arrays no vacíos, lo que restauró la atribución de `Sky` en `greenhouse_conformed`

## Delta 2026-04-01 — Notion DB IDs canónicos para Delivery / ICO

Los teamspaces y databases de Notion que hoy alimentan el baseline operativo de Delivery e `ICO` deben tratarse como referencia arquitectónica viva, no solo como contexto de una task.

Baseline auditado vía MCP:

- `Efeonce`
  - `Proyectos`: `15288d9b-1459-4052-9acc-75439bbd5470`
  - `Tareas`: `3a54f090-4be1-4158-8335-33ba96557a73`
- `Sky Airlines`
  - `Proyectos`: `23039c2f-efe7-817a-8272-ffe6be1a696a`
  - `Tareas`: `23039c2f-efe7-8138-9d1e-c8238fc40523`
- `ANAM`
  - `Proyectos`: `32539c2f-efe7-8053-94f7-c06eb3bbf530`
  - `Tareas`: `32539c2f-efe7-81a4-92f4-f4725309935c`

Uso correcto de estos IDs:

- son `source ids` de Notion, no identidades canónicas de Greenhouse
- son el ancla operativa para auditar `space_notion_sources`, `notion_ops.*`, `greenhouse_conformed.delivery_projects` y `greenhouse_conformed.delivery_tasks`
- si cambian en Notion o se agrega un nuevo Space relevante para `ICO`, actualizar este documento y `TASK-186` en el mismo cambio

Regla operativa:

- para auditorías de métricas Delivery, primero verificar que el sync sigue leyendo estas DBs correctas antes de asumir que el problema está en `ICO` o en el serving layer
- no confiar en memoria conversacional para redescubrir estos IDs; este documento es la referencia viva

## Purpose

Define how Greenhouse should ingest, back up, normalize, and serve data that currently comes from external operational systems such as Notion and HubSpot.

This document answers four practical questions:
- where raw source backups should live
- where normalized source data should live
- what subset must be projected into PostgreSQL for runtime calculations
- how Greenhouse should stop depending on live Notion/HubSpot reads in product request paths

Use together with:
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `project_context.md`

## Core Decision

Greenhouse will not calculate business logic directly from Notion or HubSpot APIs at request time.

The correct serving model is:
1. external sources are ingested and backed up into BigQuery raw tables
2. normalized source models are built in BigQuery conformed tables
3. only the runtime-critical subset is projected into PostgreSQL
4. product modules calculate from PostgreSQL or from BigQuery marts, never from raw source APIs

This means:
- Notion and HubSpot remain source systems
- BigQuery becomes the historical and analytical landing zone
- PostgreSQL becomes the operational serving layer for fast reads and transactional calculations

## End-to-End Topology

### Source to platform flow

1. `Notion` and `HubSpot` are pulled by scheduled sync jobs.
2. Each pull writes an append-only snapshot into `BigQuery raw`.
3. BigQuery builds `conformed` current-state tables from those snapshots.
4. Greenhouse projects selected conformed entities into PostgreSQL.
5. Product modules read:
   - `PostgreSQL` for operational runtime and low-latency calculations
   - `BigQuery marts` for analytical and historical views

### Reverse analytical flow

1. Product writes happen in PostgreSQL.
2. Postgres emits outbox events.
3. BigQuery marts receive operational truth asynchronously.
4. `360`, BI and executive dashboards read from BigQuery.

## Data Layer Responsibilities

### 1. BigQuery raw

Purpose:
- immutable backup
- audit trail
- replay and recovery
- source-diff support

Rules:
- append-only
- partitioned by ingestion date
- clustered by source object id when possible
- stores full source payload plus sync metadata

### 2. BigQuery conformed

Purpose:
- normalize source schemas
- flatten properties
- resolve enums and timestamps
- expose stable input shapes for downstream serving

Rules:
- one conformed table per business concept
- preserves source ids
- no UI or API should consume source raw tables directly

### 3. PostgreSQL operational projections

Purpose:
- provide fast local joins and calculations for runtime modules
- remove direct dependence on Notion/HubSpot latency
- anchor external context to canonical ids already living in `greenhouse_core`

Rules:
- only selected serving slices are projected here
- do not copy every raw source object into Postgres
- every projected row must keep source ids and sync metadata

### 4. BigQuery marts

Purpose:
- historical KPIs
- 360 views
- heavy joins
- AI and BI context

Rules:
- denormalized and analytical
- rebuilt from raw, conformed, and synced operational truth

## Canonical Datasets and Schemas

### BigQuery target datasets

Recommended target datasets:
- `greenhouse_raw`
- `greenhouse_conformed`
- `greenhouse_marts`

Legacy datasets currently in use:
- `hubspot_crm`
- `notion_ops`
- `greenhouse`

Migration rule:
- legacy datasets can remain as phase-one inputs
- new sync logic should target `greenhouse_raw` and `greenhouse_conformed`
- feature code should progressively stop reading `hubspot_crm.*` and `notion_ops.*`

### PostgreSQL target schemas

Existing:
- `greenhouse_core`
- `greenhouse_serving`
- `greenhouse_sync`
- `greenhouse_hr`

New serving schemas recommended for external-source projections:
- `greenhouse_crm`
- `greenhouse_delivery`

Purpose:
- `greenhouse_crm`: operational projection of commercial source slices
- `greenhouse_delivery`: operational projection of projects, sprints and tasks used by runtime features

## Raw Backup Model

All source ingestions should persist the following metadata fields.

### Common raw columns

- `sync_run_id`
- `source_system`
- `source_object_type`
- `source_object_id`
- `source_parent_object_id`
- `source_created_at`
- `source_updated_at`
- `source_deleted_at`
- `is_deleted`
- `payload_json`
- `payload_hash`
- `ingested_at`
- `ingested_date`

### Why append-only raw matters

This gives Greenhouse:
- replayable history
- point-in-time reconstruction
- source drift detection
- safe rebuild of conformed tables
- an internal backup even if Notion or HubSpot data changes unexpectedly

## Source Table Blueprint

### Notion raw tables

Minimum raw tables:
- `greenhouse_raw.notion_projects_snapshots`
- `greenhouse_raw.notion_tasks_snapshots`
- `greenhouse_raw.notion_sprints_snapshots`
- `greenhouse_raw.notion_people_snapshots`
- `greenhouse_raw.notion_databases_snapshots`

Primary incremental watermark:
- `last_edited_time`

Deletion/tombstone fields:
- `archived`
- `in_trash`

Expected keys:
- `source_object_id = notion page id`
- `source_parent_object_id = notion database id or parent page id`

### HubSpot raw tables

Minimum raw tables:
- `greenhouse_raw.hubspot_companies_snapshots`
- `greenhouse_raw.hubspot_deals_snapshots`
- `greenhouse_raw.hubspot_contacts_snapshots`
- `greenhouse_raw.hubspot_owners_snapshots`
- `greenhouse_raw.hubspot_line_items_snapshots`

Primary incremental watermark:
- `updatedAt` when available
- otherwise `hs_lastmodifieddate`

Deletion/tombstone fields:
- `archived`
- source diff-based tombstones if the endpoint does not emit deletes directly

Expected keys:
- `source_object_id = HubSpot object id`

## Conformed Model Blueprint

Conformed tables should strip away source quirks and expose stable business semantics.

### Notion conformed tables

Recommended tables:
- `greenhouse_conformed.delivery_projects`
- `greenhouse_conformed.delivery_tasks`
- `greenhouse_conformed.delivery_sprints`

Recommended business fields for tasks:
- `task_source_id`
- `project_source_id`
- `sprint_source_id`
- `client_source_id`
- `client_id`
- `module_code`
- `module_id`
- `task_name`
- `task_status`
- `task_phase`
- `task_priority`
- `assignee_source_id`
- `assignee_member_id` — first Notion responsable resolved to Greenhouse member ID (backward compat)
- `assignee_member_ids` — `ARRAY<STRING>` all Notion responsables resolved to Greenhouse member IDs (enables person-level ICO metrics via UNNEST; added 2026-03-18)
- `project_source_ids` — `ARRAY<STRING>` exact Notion project relations preserved for auditability and richer project readers (added 2026-04-02)
- `due_date`
- `completed_at`
- `last_edited_time`
- `is_deleted`
- `sync_run_id`

Delta 2026-04-01:
- `due_date` quedó ratificado como ancla operativa principal del período para `ICO` / `Performance Report`.
- `completed_at` sigue siendo señal de cierre y calidad, pero ya no debe usarse como único criterio de pertenencia mensual.
- El sync no necesita recalcular métricas; su responsabilidad sigue siendo preservar primitivas suficientes para que `ICO` derive período, carry-over y scorecards de forma auditable.

Multi-assignee enrichment:
- `responsables_ids` (Notion array) is mapped through `team_members.notion_user_id` → `member_id`
- `assignee_member_id` keeps first assignee for backward compatibility
- `assignee_member_ids` stores all resolved IDs; `v_tasks_enriched` falls back to wrapping the singular `assignee_member_id` for legacy rows
- Column added idempotently via `ALTER TABLE ADD COLUMN IF NOT EXISTS` at sync time

Guardrails added after payroll/ICO remediation (2026-03-27):
- the conformed sync must fail loudly if source tasks with `responsables_ids` are read but `greenhouse_conformed.delivery_tasks` persists `0` rows with `assignee_source_id`
- as of `TASK-197`, this validation must also hold per `space_id`, so a healthy space like `Efeonce` cannot mask attribution loss in another space like `Sky`
- sync results should expose validation counters at runtime:
  - `sourceTasksWithResponsables`
  - `conformedTasksWithAssigneeSource`
  - `conformedTasksWithAssigneeMember`
  - `conformedTasksWithAssigneeMemberIds`
- this guardrail exists because person-level `ICO` metrics and payroll variable bonuses depend on `UNNEST(assignee_member_ids)`; silent loss of task attribution is therefore a payroll-impacting incident, not only a delivery analytics issue

### HubSpot conformed tables

Recommended tables:
- `greenhouse_conformed.crm_companies`
- `greenhouse_conformed.crm_deals`
- `greenhouse_conformed.crm_contacts`
- `greenhouse_conformed.crm_owners`

Recommended business fields for deals:
- `deal_source_id`
- `company_source_id`
- `client_id`
- `pipeline_id`
- `stage_id`
- `stage_name`
- `deal_name`
- `amount`
- `currency`
- `close_date`
- `owner_source_id`
- `owner_user_id`
- `is_closed_won`
- `is_closed_lost`
- `updated_at`
- `is_deleted`
- `sync_run_id`

## PostgreSQL Projection Blueprint

### What must be projected into PostgreSQL

Only the slices required by product runtime and operational calculations.

### `greenhouse_crm`

Recommended tables:
- `greenhouse_crm.companies`
- `greenhouse_crm.deals`
- `greenhouse_crm.contacts`

These tables should keep:
- canonical foreign keys such as `client_id`
- source ids such as `hubspot_company_id` and `hubspot_deal_id`
- sync metadata:
  - `source_updated_at`
  - `synced_at`
  - `sync_run_id`
  - `payload_hash`

Primary uses:
- Finance and admin runtime that needs client/commercial context fast
- tenant provisioning context
- pipeline-aware UI without live HubSpot calls

### `greenhouse_delivery`

Recommended tables:
- `greenhouse_delivery.projects`
- `greenhouse_delivery.sprints`
- `greenhouse_delivery.tasks`

These tables should keep:
- canonical foreign keys:
  - `client_id`
  - `module_id`
  - `member_id`
- source ids:
  - `notion_project_id`
  - `notion_task_id`
  - `notion_sprint_id`
- operational fields needed by runtime:
  - status
  - phase
  - due date
  - completion state
  - effort/load markers
  - current assignee
- sync metadata:
  - `source_updated_at`
  - `synced_at`
  - `sync_run_id`
  - `payload_hash`

Primary uses:
- capability runtime
- agency and capacity surfaces
- task-derived operational calculations
- cached drilldowns without live Notion access

## What stays in BigQuery only

These should stay analytical-first unless product proves they are needed in low-latency runtime:
- full source payload history
- long-tail CRM properties not used by runtime
- long-tail Notion properties not used by runtime
- historical task status event reconstruction
- heavy multi-period KPI computation
- executive BI and AI context marts

## Calculation Policy

### Runtime calculations

Must run from PostgreSQL if they affect:
- interactive screens
- approval flows
- state transitions
- near-real-time operational counters
- joins between external context and canonical identity

Examples:
- current task load per collaborator
- stuck tasks used by a capability runtime
- latest commercial status shown in admin/runtime
- finance or delivery counters rendered inside operational screens

### Analytical calculations

Should run from BigQuery marts if they affect:
- trend analysis
- historical performance
- cross-module reporting
- executive dashboards
- AI enrichment or narrative summaries over large timespans

Examples:
- monthly throughput trends
- multi-quarter revenue by module
- long-range team utilization
- historical CRM conversion analysis

## Sync Control Plane

The sync system itself should have an explicit control plane in PostgreSQL.

Recommended tables under `greenhouse_sync`:
- `source_sync_runs`
- `source_sync_watermarks`
- `source_sync_failures`
- `integration_registry` — central registry of native integrations with taxonomy, ownership, readiness status, consumer domains and sync cadence. Introduced by `TASK-188` as Layer 1 of the Native Integrations Layer (`GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`).

### `source_sync_runs`

Tracks each execution:
- `sync_run_id`
- `source_system`
- `source_object_type`
- `started_at`
- `finished_at`
- `status`
- `records_read`
- `records_written_raw`
- `records_written_conformed`
- `records_projected_postgres`

### `source_sync_watermarks`

Tracks incremental checkpoints:
- `source_system`
- `source_object_type`
- `watermark_key`
- `watermark_value`
- `updated_at`

### `source_sync_failures`

Tracks retryable or dead-letter failures:
- `sync_failure_id`
- `sync_run_id`
- `source_system`
- `source_object_type`
- `source_object_id`
- `error_code`
- `error_message`
- `payload_json`
- `created_at`
- `resolved_at`

## Incremental Sync Strategy

### Notion

Incremental read key:
- `last_edited_time`

Sync rule:
- fetch all changed pages since watermark
- write append-only raw snapshot
- rebuild conformed current-state rows for changed objects
- project changed records into `greenhouse_delivery`

### HubSpot

Incremental read key:
- `updatedAt` or `hs_lastmodifieddate`

Sync rule:
- fetch all changed records since watermark
- write append-only raw snapshot
- upsert conformed current-state rows
- project runtime-critical records into `greenhouse_crm`

Bridge canónico comercial vigente:
- **TASK-453** agrega un segundo carril sobre el runtime existente: `greenhouse_crm.deals` sigue siendo la proyección operational/raw-backed desde HubSpot, mientras `greenhouse_commercial.deals` pasa a ser el mirror canónico comercial para forecasting y revenue pipeline.
- El sync de este bridge no relee BigQuery ni reemplaza el control plane source-sync: consume `greenhouse_crm.deals`, resuelve `organization_id` / `space_id`, calcula FX a CLP con `greenhouse_finance.exchange_rates` y publica `commercial.deal.*` al outbox.
- La consecuencia operativa es explícita: `greenhouse_crm.deals` = staging/runtime inbound; `greenhouse_commercial.deals` = entidad canónica comercial consumida por TASK-455/456/457.

### Conflict rule

If the incoming `payload_hash` did not change, projection to Postgres can be skipped.

## Suggested Cadence

### Notion

- projects: every `15` minutes
- tasks: every `10` minutes
- sprints: every `15` minutes

### HubSpot

- companies: every `15` minutes
- deals: every `10` minutes
- contacts: every `15` minutes
- owners: every `60` minutes

### BigQuery marts

- near-real-time marts fed from Postgres outbox: every `5` to `15` minutes
- heavier executive marts: hourly or daily, depending on cost and freshness requirements

## Rollout Order

### Phase 1

- formalize raw backup tables for Notion and HubSpot
- formalize sync control plane in `greenhouse_sync`
- stop introducing new runtime reads to `notion_ops.*` and `hubspot_crm.*`

### Phase 2

- build conformed tables:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_conformed.delivery_sprints`
  - `greenhouse_conformed.crm_companies`
  - `greenhouse_conformed.crm_deals`

### Phase 3

- project runtime-critical slices into PostgreSQL:
  - `greenhouse_delivery.*`
  - `greenhouse_crm.*`

### Phase 4

- switch runtime services to PostgreSQL-backed projections
- keep BigQuery as analytics and rebuild layer

### Phase 5

- add marts and historical dashboards from:
  - raw backups
  - conformed external data
  - synced Postgres operational truth

## Non-Negotiable Rules

- no product API should depend on live Notion or HubSpot reads for critical runtime logic
- every synced external row must preserve its source id
- every raw ingestion must be replayable
- every operational projection in PostgreSQL must preserve `source_updated_at` and `synced_at`
- every module must read through Greenhouse service layers, never directly from source raw tables

## Conformed Data Layer — Config-Driven Property Mappings

### Status: Implemented (2026-03-18)

The conformed data layer now supports **config-driven property mappings** via a Postgres configuration table. This enables onboarding new Spaces (clients) with different Notion property names or types without modifying the sync script.

Design rule reinforced after auditing `Efeonce`, `Sky Airlines`, and `ANAM`:

- Spaces may share a broad operational shape (`Proyectos`, `Tareas`, similar KPI intent), but they do not have identical schemas.
- Greenhouse must preserve a **common KPI core contract** for Delivery/ICO while allowing **space-specific extensions** for client, vertical, or project-type particularities.
- The right answer is not a rigid one-size-fits-all schema, nor uncontrolled per-client hardcoding.
- The right answer is:
  - stable core fields for cross-space KPIs
  - config-driven mapping for property name/type drift
  - explicit classification of `space-specific` fields that enrich explanation, workflow, or client context without redefining the KPI core

### Architecture

```
Notion Teamspace (Space A) ─┐
Notion Teamspace (Space B) ─┤  Notion API
Notion Teamspace (Space N) ─┘
        │
        ▼
notion-bq-sync (Python, Cloud Run)
  • Generic service — syncs Notion → BigQuery
  • NO Greenhouse business logic
  • Writes raw to notion_ops.tareas (Spanish names)
        │
        ▼
src/lib/sync/sync-notion-conformed.ts (TypeScript, writer canónico automatizado)
  │
  ├── 1. Reads notion_ops.tareas from BigQuery (raw)
  ├── 2. Resolves tenant context from raw `space_id` + `greenhouse_core.space_notion_sources`
  ├── 3. Applies default/runtime mapping (governance mappings remain advisory, not primary runtime source)
  ├── 4. Preserves assignee arrays + hierarchy arrays:
  │      ├── `assignee_member_ids`
  │      ├── `project_source_ids`
  │      ├── `tarea_principal_ids`
  │      └── `subtareas_ids`
  ├── 5. Runs raw freshness gate before writing conformed
  ├── 6. Writes to greenhouse_conformed.delivery_tasks (BQ, normalized)
  │      └── validates assignee parity + persisted raw→conformed parity by `space_id`
  └── 7. Records control-plane status in `greenhouse_sync.source_sync_runs`

scripts/sync-source-runtime-projections.ts (TypeScript, carril legacy/manual)
  │
  ├── sigue existiendo para seed/manual recovery y proyección PostgreSQL
  ├── por defecto NO reescribe `greenhouse_conformed.delivery_*`
  └── solo puede sobrescribir conformed si `GREENHOUSE_ENABLE_LEGACY_CONFORMED_OVERWRITE=true`
```

### Configuration table

Table: `greenhouse_delivery.space_property_mappings` (Postgres)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Unique identifier |
| `space_id` | TEXT NOT NULL | Space that this mapping belongs to |
| `notion_property_name` | TEXT NOT NULL | Exact Notion property name (case-sensitive) |
| `conformed_field_name` | TEXT NOT NULL | Target field in conformed schema (snake_case, English) |
| `notion_type` | TEXT NOT NULL | Notion property type: number, formula, select, rollup, etc. |
| `target_type` | TEXT NOT NULL | Target type: STRING, INTEGER, FLOAT, BOOLEAN, TIMESTAMP |
| `coercion_rule` | TEXT NOT NULL | How to convert: direct, formula_to_int, status_to_string, etc. |
| `is_required` | BOOLEAN | Log warning if property not found |
| `fallback_value` | TEXT | Default value if null (JSON encoded) |

Constraints:
- `UNIQUE (space_id, conformed_field_name)` — one source per conformed field per Space
- `UNIQUE (space_id, notion_property_name)` — one target per Notion property per Space

### Coercion rules

16 built-in rules handle Notion type heterogeneity:

| Rule | Converts | Example |
|------|----------|---------|
| `direct` | Same type cast | `number → INTEGER` |
| `formula_to_int/float/string/bool` | Notion formula result | `"2.0" → 2` |
| `rollup_to_int/float/string` | Notion rollup result | `"5" → 5` |
| `select_to_string` / `status_to_string` | Select/Status objects | `{name:"Done"} → "Done"` |
| `checkbox_to_bool` | Checkbox | `true → true` |
| `extract_number_from_text` | First number from text | `"v2.1" → 2.1` |
| `relation_first_id` | First ID from relation | `["abc","def"] → "abc"` |
| `people_first_email` | First email from people | `["a@b.com"] → "a@b.com"` |
| `ignore` | Excluded from output | — |

### Fallback behavior

Spaces without entries in `space_property_mappings` use the hardcoded default mapping. This is the permanent fallback for Efeonce and any Space whose Notion properties match the default schema.

Important nuance:

- “matches the default schema” does not mean “is identical to Efeonce”
- a Space can share the KPI core and still require additional fields or different semantics for project-specific use cases
- when that happens, prefer extending mappings and downstream contracts explicitly instead of silently overfitting the default schema

If the Postgres query for mappings fails (connection error, table missing), the pipeline logs a warning and continues with the default mapping. The sync never blocks on a configuration error.

Current nuance after `TASK-187`:

- the active cron lane `src/lib/sync/sync-notion-conformed.ts` still consumes default/runtime mappings and does not yet read `space_property_mappings` as its primary contract source
- `space_property_mappings` remains the governance/config table for explicit overrides, discovery output and future runtime convergence
- per-space Notion governance is now persisted in:
  - `greenhouse_sync.notion_space_schema_snapshots`
  - `greenhouse_sync.notion_space_schema_drift_events`
  - `greenhouse_sync.notion_space_kpi_readiness`
- admin surfaces for that governance live under:
  - `GET /api/admin/tenants/[id]/notion-governance`
  - `POST /api/admin/tenants/[id]/notion-governance/refresh`

### Discovery script

`scripts/notion-schema-discovery.ts` automates new Space onboarding:

```bash
npx tsx scripts/notion-schema-discovery.ts --space-id EO-SPC-SKY
```

Output:
1. `discovery_report.md` — property catalog, suggested mappings with confidence levels, type conflicts, seed SQL
2. `discovery_raw.json` — full raw schema data

The script reads Space configurations from `greenhouse_core.space_notion_sources`, calls the Notion API to enumerate database properties, and matches them against the conformed schema using name patterns and type compatibility.

### New Space onboarding workflow

1. Register Space in Greenhouse (API: `POST /api/admin/spaces`)
2. Register Notion DB bindings (UI `TenantNotionPanel` or `POST /api/integrations/notion/register`)
3. Refresh/persist governance snapshots (best-effort from register or explicit `POST /api/admin/tenants/[id]/notion-governance/refresh`)
4. Run discovery script when a human needs a richer audit/export: `npx tsx scripts/notion-schema-discovery.ts --space-id <SPACE_ID>`
5. Review `discovery_report.md` — adjust mappings as needed
6. Execute seed SQL in Postgres (from the report) when explicit overrides are required
7. Run sync: shared control plane `POST /api/admin/integrations/notion/sync` or cron `GET /api/cron/sync-conformed`
8. Verify data in `greenhouse_conformed.delivery_tasks` filtered by `space_id`
9. Run ICO materialization: `npx tsx scripts/materialize-ico.ts`

### Runtime hardening after `TASK-207`

- `GET /api/cron/sync-conformed` now calls `checkIntegrationReadiness('notion', { requireRawFreshness: true })`
- readiness for Notion now requires fresh rows in:
  - `notion_ops.tareas`
  - `notion_ops.proyectos`
  - `notion_ops.sprints`
- the cron lane still performs a second in-process guard before writing conformed, so admin/manual triggers do not bypass raw freshness accidentally
- `greenhouse_conformed.delivery_tasks` now preserves hierarchy arrays:
  - `tarea_principal_ids`
  - `subtareas_ids`
- `greenhouse_delivery.tasks` now mirrors those hierarchy arrays in PostgreSQL runtime
- the legacy script remains available, but conformed overwrite is opt-in to avoid `last writer wins` drift against the cron writer

### Operational remediation runbook

When payroll or person-level `ICO` metrics show missing KPI despite real completed work:

1. Audit `notion_ops.tareas` for rows with `responsables_ids`
2. Compare against `greenhouse_conformed.delivery_tasks`:
   - `assignee_source_id`
   - `assignee_member_id`
   - `assignee_member_ids`
   - o usar el auditor reusable `pnpm audit:notion-delivery-parity --space-id=<SPACE_ID> --assignee-source-id=<NOTION_USER_ID> --year=<YYYY> --month=<MM> --period-field=due_date|created_at`
3. If attribution was lost, run the canonical remediation:
   - `pnpm exec tsx scripts/remediate-ico-assignee-attribution.ts <year> <month>`
4. Re-verify:
   - `greenhouse_conformed.delivery_tasks` attribution counters
   - `ico_engine.metrics_by_member` for the affected period
   - downstream consumers such as projected payroll

`TASK-205` leaves that parity audit as an on-demand diagnostic. Structural runtime hardening and freshness gates were closed by `TASK-207`; monitoreo recurrente y alerting quedan como follow-on de `TASK-208`.

This remediation is safe to rerun and is the canonical recovery path for attribution-driven KPI gaps.

---

## Immediate Next Step

The first implementation slice after this document should be:
- create `greenhouse_sync.source_sync_runs`
- create `greenhouse_sync.source_sync_watermarks`
- create BigQuery raw tables for Notion and HubSpot snapshots
- build the first conformed tables for:
  - `delivery_tasks`
  - `delivery_projects`
  - `crm_companies`
  - `crm_deals`

That is the minimum foundation needed before moving more calculations out of direct source reads.
