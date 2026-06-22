# Greenhouse Source Sync Pipelines V1

## Delta 2026-06-20 — TASK-1209 proyección recurrente de facturas de exportación/exentas + visibilidad

El step PG del sync Nubox (`upsertIncomeFromSale`) ya intentaba **cada** conformed sale por corrida (incluidas las facturas de exportación DTE 110/111/112), pero **toda factura exenta fallaba** registrada con `nubox_postgres_projection_failed` por el bug de exento de `buildIncomeTaxWriteFields` (ver Finance arch Delta TASK-1209). Con el fix, una factura de exportación válida con cliente resuelto **se materializa sola en el próximo sync** — sin scripts por cliente. Berel es fixture, no rama de código.

**Contrato recurrente (modelo objetivo):**

```text
Nubox emite factura mensual
  -> raw/conformed Nubox sales evidence
  -> postgres_projection lee la conformed sale (readConformedSales)
  -> org/client resuelto por identidad tributaria canónica
  -> upsertIncomeFromSale escribe/actualiza greenhouse_finance.income (total = neto + IVA + exento)
  -> finance.income.created outbox para income nuevo
  -> reliability ok
```

**Visibilidad / failure taxonomy:** `writeSyncFailure` acepta `errorCode`; las fallas de projection de export DTE usan el código estable **`nubox_income_projection_failed`** con `nuboxDocumentId` en el payload. Signal nuevo **`finance.nubox_export.unprojected_invoice`** (`src/lib/reliability/queries/nubox-export-unprojected-invoice.ts`, kind `data_quality`, warning, steady=0) que cruza `source_sync_failures` (30d) contra `income.nubox_document_id` y **se auto-limpia** al materializarse el AR. Distinto de `finance.nubox_export.orphan_rfc` (RFC sin org, no se intenta) y `finance.nubox_export.foreign_amount_missing` (income existe sin plano nativo). Diagnóstico read-only: `scripts/finance/task-1209-unprojected-export-invoices-diagnostic.ts`. Owner operativo del signal: Finance Ops.

## Delta 2026-06-20 — TASK-1191 el step PG del sync Nubox estampa el período fiscal (F29)

El step PG del sync Nubox (`upsertIncomeFromSale` / `upsertExpenseFromPurchase` en
`src/lib/nubox/sync-nubox-to-postgres.ts`) ahora **deriva y estampa** el período
fiscal (`period_year` / `period_month`) del documento desde su fecha de emisión
(`emission_date` → `invoice_date`/`document_date`) usando el helper canónico
`getOperationalFiscalPeriod()` (`src/lib/calendar/operational-calendar.ts`). El
conformed BQ trae el período NULL, así que sin esto los documentos con IVA nacían
sin período y **nunca entraban a una posición F29** (ISSUE-103: 165 docs excluidos
del crédito/débito fiscal).

Contrato del estampado:

- **INSERT** (doc nuevo): el período sale del helper sobre `emission_date`;
  fallback al período del conformed sólo si no hay fecha de emisión.
- **UPDATE** (doc existente, re-sync): **self-heal** `period_* = COALESCE(existente, derivado)`
  — nunca pisa un período ya correcto, sólo rellena NULLs. El sync se vuelve
  auto-sanador para documentos históricos sin período.
- Regla SII por defecto = **mes del documento** (validada: 25/25 docs ya estampados
  casaban el mes de la fecha del doc). La ventana de 2 períodos para crédito tardío
  es una decisión manual del contador, no el default.

Backfill one-shot de los 165 docs históricos: `scripts/finance/task-1191-backfill-fiscal-period.ts`
(dry-run por defecto, `--apply`/`--rematerialize`, idempotente, source-agnostic).
Downstream: re-materialización VAT (`materializeAllAvailableVatPeriods`) + signals
`finance.vat.eligible_without_period` / `finance.vat.position_drift` en `ok`.

## Delta 2026-04-26 — Nubox Quotes Hot Sync separa frescura comercial del ETL diario

Las cotizaciones Nubox (`COT` / DTE 52) ya no dependen solo del ETL diario
`/api/cron/nubox-sync` para aparecer oportunamente en Finanzas.

### Topologia

```text
Vercel Cron */15
  -> GET /api/cron/nubox-quotes-hot-sync
    -> syncNuboxQuotesHot()
      -> Nubox /sales?period=<current, previous>
      -> BQ greenhouse_raw.nubox_sales_snapshots (append-only)
      -> BQ greenhouse_conformed.nubox_sales (append-only)
      -> PG greenhouse_finance.quotes
      -> greenhouse_sync.source_sync_runs (source_object_type='quotes_hot_sync')
```

### Reglas

1. El hot lane solo procesa ventas Nubox cuyo tipo resuelve a cotización
   (`legalCode='52'`, `legalCode='COT'`, `abbreviation='COT'` o nombre tipo
   cotización). Facturas, notas y movimientos siguen entrando por el full ETL.
2. La evidencia durable sigue naciendo en raw BigQuery; el hot lane no inserta
   filas directas en Postgres sin snapshot raw/conformed previo.
3. El upsert producto reutiliza `upsertNuboxQuoteFromSale`, el mismo contrato
   que el full ETL. Idempotencia por `quote_id` / `nubox_document_id`.
4. La corrida usa advisory lock de sesión con unlock explícito para evitar
   solapamiento entre invocaciones frecuentes.
5. Operación manual soportada: `pnpm sync:nubox:quotes-hot -- --period=2026-04`
   o `--periods=2026-04,2026-03`. Esto dispara el mismo pipeline, no un parche.
6. El full ETL diario se mantiene como safety net de reconciliación histórica,
   ventas, compras, ingresos bancarios y balances.

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

## Delta 2026-05-09 — Nubox ops-worker freshness contract

Nubox crons live in Cloud Run `ops-worker`, not in Vercel. The source-sync
health contract now treats each lane independently:

- `raw_sync`: first durable evidence from Nubox API into BigQuery raw.
- `conformed_sync`: transformation over raw snapshots; freshness alone is not
  sufficient if raw evidence is stale.
- `postgres_projection`: operational projection into `income`, `expenses`,
  `quotes` and `external_cash_signals`.
- `quotes_hot_sync`: hot lane for quote/COT freshness.
- `balance_sync`: balance reconciliation lane, tracked in
  `greenhouse_sync.source_sync_runs`.

`finance.nubox.source_freshness` is the deterministic reliability signal for
this contract. It reports `error` when raw or hot quotes are stale/failed, and
also when conformed/projection look fresh while raw evidence is stale. Balance
staleness is warning-level unless combined with a raw/hot failure.

Projection resiliency rule: `postgres_projection` records per-document failures
in `greenhouse_sync.source_sync_failures` with
`error_code='nubox_postgres_projection_failed'` and finishes `partial` when at
least one document projected successfully. Valid source semantics, such as
Nubox `BHE` honorarios where `total_amount` is net of withholding, must be
modeled in the adapter before emitting failures.

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

---

## Invariantes operativos para agentes — Notion sync/integrations (TASK-998…1003)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Espejo operativo (NUNCA/SIEMPRE) que un agente carga al tocar este dominio; el contrato técnico vive en su spec. Dedup = TASK-1160 Slice 4.

### Notion Integrations Registry — token ↔ servicio ↔ scope canónico (desde 2026-05-22)

Existen **3 integraciones Notion productivas/no-productivas** + **1 dedicada al sandbox demo**. Cada una mapea a un secret GCP distinto, la usa un consumer distinto y tiene un scope de acceso (qué teamspaces puede ver) estrictamente delimitado. Conectar la integración equivocada a un teamspace es una violación de aislamiento (root cause investigado 2026-05-22: el sandbox demo quedó compartido con *BigQuery Sync*; no hubo fuga porque el demo nunca se registró en el mirror BQ del sync, pero fue mina latente).

| Integración Notion | Secret GCP / env var | Consumer | Scope permitido | Entorno |
|---|---|---|---|---|
| **BigQuery Sync** | `notion-token` (2026-03-08) | Cloud Run `notion-bq-sync` (sync legacy Notion → BigQuery, daily 03:00 Santiago) | SOLO teamspaces productivos registrados en `space_notion_sources WHERE sync_enabled=TRUE` (Efeonce + Sky) | Productivo |
| **Greenhouse** | env `NOTION_TOKEN` (staging/dev) | Runtime no-productivo (`dev-greenhouse`, preview, local) | Efeonce + Sky (staging/dev) | **Staging/Dev** |
| **Greenhouse PRD** | `notion-integration-token-greenhouse-prd` (2026-05-21) → env `NOTION_TOKEN` | Runtime Vercel prod + `ops-worker` (re-fetch status transitions TASK-912 + writeback `[GH]` properties TASK-916) | Efeonce + Sky (productivo) | Producción |
| **(dedicada demo)** | `notion-integration-token-greenhouse-metrics-demo` (2026-05-19) → `NOTION_METRICS_DEMO_TOKEN_SECRET_REF` | `ops-worker` compute/writeback demo (TASK-913) | **SOLO** teamspace `Demo Greenhouse` (`36339c2f-…`) | Sandbox demo |
| **Por cliente (scoped, TASK-998)** | `notion-integration-token-greenhouse-<slug>` → `space_notion_sources.notion_token_secret_ref` (ej. `notion-integration-token-greenhouse-berel`, 2026-06-03) | sync per-space (pendiente en `notion-bigquery`) + checklist onboarding | **SOLO** el teamspace de ESE cliente (el token ES el scope) | Producción (clientes nuevos) |
| **Knowledge (TASK-1088)** | `notion-integration-token-greenhouse-knowledge` → env `NOTION_KNOWLEDGE_TOKEN_SECRET_REF` | `NotionKnowledgeConnector` (ingesta operada por script/ops del corpus de conocimiento → `greenhouse_knowledge`; NO runtime del portal ni Notion live para una respuesta) | **SOLO** el teamspace Notion de conocimiento (compartido con esta integración) | Ops (ingesta de knowledge) |

**⚠️ Reglas duras**:

- **NUNCA** conectar **BigQuery Sync** ni **Greenhouse PRD** al teamspace `Demo Greenhouse`. El demo se conecta **SOLO** a la integración dedicada demo (`notion-integration-token-greenhouse-metrics-demo`), con permisos restringidos exclusivamente a ese teamspace. Esa es la integración canónica del demo (TASK-913) — ni BigQuery Sync, ni Greenhouse, ni Greenhouse PRD.
- **NUNCA** conectar **BigQuery Sync** a un teamspace que no deba llegar a BigQuery. Su endpoint `/discover` enumera **TODO lo que la integración puede ver** vía Notion search, bypassando `space_notion_sources` por completo — cualquier teamspace compartido con esta integración es contaminación potencial de BQ con un solo `/discover` o un flip de `sync_enabled`.
- **NUNCA** usar la integración **Greenhouse** (staging/dev) en producción ni **Greenhouse PRD** en staging/dev. El sufijo `PRD` separa los entornos; cruzarlos rompe el aislamiento prod/staging.
- **NUNCA** flipear `sync_enabled=TRUE` para el space demo en `space_notion_sources`. Está sembrado `FALSE` (migración `20260519120713456`) y ausente del mirror BQ — doble defensa que evita que el sync legacy lo procese aunque BigQuery Sync tuviera acceso.
- **NUNCA** "conectar todas las integraciones por las dudas" al crear un teamspace/database nuevo en Notion. Conectar **solo** la integración cuyo dominio corresponde al propósito del teamspace.
- **NUNCA** usar el secret `notion-token` (BigQuery Sync) ni `notion-integration-token-greenhouse-prd` (Greenhouse PRD) como fuente del token del pipeline demo. El demo resuelve su token exclusivamente vía `NOTION_METRICS_DEMO_TOKEN_SECRET_REF` ([notion-demo-client.ts](src/lib/notion-metrics/notion-demo-client.ts)).
- **NUNCA** reusar el token de **Knowledge** (`notion-integration-token-greenhouse-knowledge`) para sync/discover/demo, ni reusar otro token para la ingesta de knowledge. El `NotionKnowledgeConnector` (TASK-1088) resuelve su token **solo** vía `NOTION_KNOWLEDGE_TOKEN_SECRET_REF` ([notion-knowledge-client.ts](src/lib/knowledge/notion/notion-knowledge-client.ts)); el token está scoped al teamspace de conocimiento y NO debe compartirse con la integración de BigQuery Sync (su `/discover` enumera todo lo que ve → contaminación potencial del mirror BQ).
- **SIEMPRE** que emerja una integración Notion nueva (e.g. otro cliente, otro pipeline), agregarla a este registry con su secret + consumer + scope + entorno antes del primer uso, y enumerar a qué teamspaces se le concede acceso.

**Verificación operador-side** (no es código — son settings de Notion): la lista de integraciones conectadas a un teamspace se ve en Notion → teamspace → Settings → Connections. Para auditar fuga a BQ: `bq query 'SELECT source_database_id, space_id, COUNT(*) FROM efeonce-group.notion_ops.raw_pages_snapshot GROUP BY 1,2'` — todo `source_database_id` debe pertenecer a Efeonce (`spc-c0cf6478-…`) o Sky (`spc-ae463d9f-…`); cualquier `36339c2f…` (demo) es fuga.

### Notion teamspace linking — token POR teamspace + cómo enumerar DBs (TASK-998, desde 2026-06-03)

Para vincular el teamspace Notion de un **cliente nuevo** (Berel, ANAM, …) a Greenhouse, el modelo canónico es **una integración interna scoped SOLO al teamspace de ese cliente**, cuyo token **es el scope**. La integración compartida `notion-token` (BigQuery Sync) queda **solo para Efeonce/Sky legacy** — los clientes nuevos NO se agregan a ella (aislamiento duro; mismo principio que el token dedicado del demo, TASK-913).

**Hechos verificados live (2026-06-03, Grupo Berel) — qué NO funciona para enumerar teamspaces**:

- **La API REST de Notion NO enumera teamspaces.** `GET /v1/teams` → `400 invalid_request_url` (no existe). `POST /v1/search` devuelve data_sources cuyo `parent` es `database_id`, no teamspace → el nombre del teamspace **no está en REST**. Las DBs de un teamspace **NO comparten prefijo de id** (Berel: Tareas/Proyectos/Sprints=`35c39c2f`, "Wiki de Berel"=`98239c2f`, "Content Hub"=`35f39c2f`) → cualquier heurístico de prefijo es **inválido**.
- **El MCP claude.ai (`notion-get-teams`) SÍ enumera** teamspaces por nombre — pero usa el **OAuth personal interactivo** del operador (dueño del workspace, ve todo) y **NO es runtime-available** (absent en headless/cron, CLAUDE.md). Sirve para que un **agente** obtenga IDs durante el onboarding, NUNCA como dependencia del runtime.
- **El Cloud Run `notion-bq-sync` v3.0.0 `/discover` devuelve config snapshot, no discovery en vivo.** No se puede usar para enumerar el teamspace de un cliente nuevo.

**El gate real NO es discovery — es el ACCESO de la integración.** El token compartido `notion-token` da `404 object_not_found` en las DBs de Berel porque la integración no tiene acceso a ese teamspace. Ningún camino (REST, MCP, Cloud Run) puede leer un teamspace que no esté compartido con su credencial — por diseño de seguridad.

**Modelo canónico — token-por-teamspace (el token ES el scope)**:

1. El operador crea en Notion una **integración interna** (Settings → Developers → New connection) scoped al teamspace del cliente (capacidades: Leer/Actualizar/Insertar contenido) + copia el token `ntn_…`. Ej. live: conexión **"Greenhouse - Berel"** sobre el teamspace `Grupo Berel` (`35c39c2f-…`).
2. En el **checklist de onboarding** (item `provision_notion_workspace`, NO el wizard de nacimiento — separación de concerns), el operador pega el token. `discoverNotionDatabasesForToken(token)` ([src/lib/client-onboarding/notion-token-connect.ts](src/lib/client-onboarding/notion-token-connect.ts)) hace `POST /v1/search` (filter data_source, Notion-Version `2026-03-11`) → como el token está acotado, devuelve **SOLO las DBs de ese cliente** (cero cross-tenant) → auto-clasifica Tareas/Proyectos/Sprints por título (tolerante a espacio final/acentos/mayúsculas vía `classifyNotionDatabaseTitle`) → sugiere los 3 ids; el operador confirma/ajusta.
3. Al confirmar: el token se guarda en **GCP Secret Manager** (`notion-integration-token-greenhouse-<slug>`, ej. `notion-integration-token-greenhouse-berel`) con `printf %s` (sin newline) + se persiste el **`*_SECRET_REF`** en `greenhouse_core.space_notion_sources.notion_token_secret_ref` (columna TASK-998). **NUNCA el token crudo en PG/logs/Notion.** `notion_token_secret_ref` NULL = usar el `notion-token` compartido legacy (Efeonce/Sky).

**⚠️ Reglas duras**:

- **NUNCA** enumerar teamspaces Notion con `/v1/search` crudo + heurística de prefijo de id. La API no enumera teamspaces; las DBs de un teamspace no comparten prefijo. Usar el **token scoped por cliente** (el token = el scope) + clasificación por título.
- **NUNCA** cablear el MCP claude.ai (`notion-get-teams`) a un backend (Cloud Run, Vercel, ops-worker). Es OAuth interactivo, absent en headless. Solo un agente lo usa para obtener IDs durante onboarding.
- **NUNCA** agregar un teamspace de cliente nuevo a la integración compartida `notion-token` (BigQuery Sync) "para que el discover lo vea". Rompe el aislamiento duro. Cada cliente nuevo = su propia integración scoped + su propio token.
- **NUNCA** persistir el token Notion crudo en `space_notion_sources`, PG, logs ni el payload de un evento. Solo el `*_SECRET_REF`. El token va a Secret Manager con `printf %s` (Secret Manager Hygiene).
- **NUNCA** vincular el teamspace en el **wizard de nacimiento** del cliente. El vínculo vive en el **checklist de provisioning** (nacimiento ≠ provisioning de tooling — separación de concerns TASK-992/997).
- **SIEMPRE** que un token Notion se pegue en texto plano (chat, form sin enmascarar), tratarlo como expuesto: guardarlo en Secret Manager + recomendar rotación. El campo del form debe ser `type=password`, el POST server-side directo, sin echo.
- **SIEMPRE** que emerja una integración Notion nueva de cliente, agregarla al **Notion Integrations Registry** (arriba) con secret + consumer + scope + entorno antes del primer uso.

**Teams channel linking (lado Teams del mismo checklist)**: el bot Graph (`greenhouse-teams-bot-client-credentials`) **YA puede** listar teams + canales con los permisos actuales — verificado live: `GET /v1.0/teams` (vio "Berel - Efeonce") + `GET /v1.0/teams/{id}/channels` (vio "Squad Berel"). Sin permisos Azure nuevos. (Los chats 1:1 `/v1.0/chats` requieren `Chat.ReadBasic.All`, no concedido — fuera de scope; los canales son el target del registry `teams_notification_channels`.) El reader self-serve reusa `src/lib/integrations/teams/bot-framework/token-cache.ts`.

**Sync end-to-end por cliente nuevo — RESUELTO (TASK-1000 + TASK-1003, 2026-06-04)**: el Cloud Run `notion-bq-sync` ya **resuelve el token POR space** (`notion_token_secret_ref` → Secret Manager; TASK-1000) Y **queryea el endpoint canónico `/v1/data_sources/{id}/query` + Notion-Version `2026-03-11`** (TASK-1003, mata el deprecado `/v1/databases/{id}/query`). Un cliente nuevo registrado por el wizard (data_source ids + token scoped) con `sync_enabled=TRUE` drena nativo a diario. Verificado live con Grupo Berel (3/3 tables, token scoped). Ver §"Notion data_sources endpoint canónico (TASK-1003)" abajo.

### Notion data_sources endpoint canónico — extractor notion-bq-sync (TASK-1003, desde 2026-06-04)

El extractor `notion-bq-sync` (repo hermano `efeoncepro/notion-bigquery`, Cloud Run `us-central1`) queryea Notion **SIEMPRE por el endpoint canónico `POST /v1/data_sources/{id}/query` + Notion-Version `2026-03-11`** (revisión live `00021-wkl`, flag `NOTION_DATA_SOURCES_ENDPOINT_ENABLED=true`). El endpoint legacy `/v1/databases/{id}/query` (deprecado por Notion 2025-09-03) queda muerto.

- **Resolver runtime canónico** `resolve_data_source_id(configured_id)` (`main.py`): acepta AMBOS tipos de id por construcción — `GET /v1/data_sources/{id}`→200 (ya es data_source: Berel/clientes nuevos del wizard) o fallback `GET /v1/databases/{id}`→`data_sources[0].id` (Efeonce/Sky con database ids legacy en el BQ mirror). Multi-data-source (>1) → fail-fast (nunca adivinar). Hereda el token per-space (TASK-1000) vía `_notion_headers`. Cache estable por mapping.
- **`database_id` configurado se conserva como identidad** para snapshot/binding (`source_database_id`, `_resolve_space_context`); SOLO la URL de query usa el id resuelto. NO mezclar.
- **`in_trash` (no `archived`)**: bajo 2026-03-11 el campo page-level de borrado es `in_trash`. El write usa `page.get("in_trash", page.get("archived", False))` (safe ambas versiones; la columna BQ sigue `archived`). NO volver a `page.get("archived", False)` solo.
- **404 NO transitorio**: `_is_transient_sync_error` clasifica 4xx (salvo 429) como NO transitorio (mata el reintento 3x inútil). NO revertir a "cualquier RequestException → transient".

**⚠️ Reglas duras**:

- **NUNCA** reintroducir `/v1/databases/{id}/query` ni Notion-Version `2022-06-28` en el extractor. El endpoint legacy está deprecado; toda query nueva usa data_sources + 2026-03-11.
- **NUNCA** guardar parent database ids de un cliente nuevo para meterlo por el endpoint viejo (anti-patrón rechazado en TASK-1003; viola Solution Quality Contract). El resolver runtime maneja ambos id-types.
- **NUNCA** desplegar `notion-bq-sync` con `bash deploy.sh` a secas: usa `--env-vars-file`/`--set-secrets` (REPLACE) y borraría las vars per-space + el secret `GREENHOUSE_POSTGRES_PASSWORD` que viven manuales en la revisión (no en `.env.yaml`, que es gitignored). Deploy canónico: `gcloud run deploy notion-bq-sync --source --function=notion_bq_sync --update-env-vars=... --update-secrets=...` (MERGE, preserva per-space+PG+secrets). Re-aseverar explícitamente `NOTION_PER_SPACE_TOKEN_ENABLED=true` + `GREENHOUSE_POSTGRES_{INSTANCE_CONNECTION_NAME,DB,USER}` + ambos secrets.
- **NUNCA** flipear `NOTION_DATA_SOURCES_ENDPOINT_ENABLED` ni bumpear `NOTION_VERSION` sin correr el gate de paridad `parity_check_task1003.py` (read-only, no escribe BQ) sobre Efeonce/Sky → PARIDAD TOTAL. Rollback <5 min: flag OFF + `gcloud run services update --update-env-vars` o traffic a revisión previa.
- **SIEMPRE** que emerja un cliente nuevo: el wizard guarda data_source ids + token scoped → con `sync_enabled=TRUE` sincroniza nativo, cero casos especiales (proceso idempotente/escalable, NO repetir el cutover por cliente).

**Spec canónica**: `docs/tasks/complete/TASK-1003-notion-bq-sync-data-sources-endpoint-migration.md`. Skill `notion-platform` §0 (estado canónico). Gate: `parity_check_task1003.py` (repo hermano).

### Notion sync canónico — Cloud Run + Cloud Scheduler (NO usar el script manual ni reintroducir un PG-projection separado)

**El daily Notion sync es un SOLO ciclo de DOS pasos en `ops-worker` Cloud Run**, schedulado por Cloud Scheduler. No hay otro path scheduled.

- **Trigger**: Cloud Scheduler `ops-notion-conformed-sync @ 20 7 * * * America/Santiago` → `POST /notion-conformed/sync` en ops-worker. Definido en `services/ops-worker/deploy.sh` (idempotente, re-run del deploy script lo upsertea).
- **Step 1 — `runNotionSyncOrchestration`**: notion_ops (BQ raw) → `greenhouse_conformed.delivery_*` (BQ). Si BQ conformed ya está fresh contra raw, hace skip ("Conformed sync already current; write skipped"). Esto NO es bug — es comportamiento intencional.
- **Step 2 — `syncBqConformedToPostgres` (UNCONDICIONAL)**: lee BQ `greenhouse_conformed.delivery_*` y escribe `greenhouse_delivery.{projects,tasks,sprints}` en PG vía `projectNotionDeliveryToPostgres`. **Este step DEBE correr siempre**, regardless del skip de Step 1, porque BQ puede estar fresh y PG stale (que es exactamente el bug que llevó 24 días sin detectar antes).

**⚠️ NO HACER**:

- NO mover el PG step adentro del path no-skip de Step 1. Antes vivía ahí (`runNotionConformedCycle` → bloque "Identity reconciliation — non-blocking tail step" precedente) y dejaba PG stale cuando BQ estaba current.
- NO crear un cron Vercel scheduled para `/api/cron/sync-conformed`. La ruta existe como fallback manual, pero el trigger automático canónico vive en Cloud Scheduler. Vercel cron es frágil para syncs largos (timeout 800s vs 60min Cloud Run, sin retry exponencial nativo, no co-located con Cloud SQL).
- NO depender del script manual `pnpm sync:source-runtime-projections` para escribir PG. Sirve para developer ad-hoc, NO para producción. Antes era el único path PG (24 días stale en abril 2026 = root cause del incidente que parió esta arquitectura).
- NO inyectar sentinels (`'sin nombre'`, `'⚠️ Sin título'`, etc.) en `*_name` columns. TASK-588 lo prohíbe vía CHECK constraints. NULL = unknown. Para mostrar fallback amigable usar el helper `displayTaskName/displayProjectName/displaySprintName` de `src/lib/delivery/task-display.ts` o el componente `<TaskNameLabel/ProjectNameLabel/SprintNameLabel>`.
- NO castear directo `Number(value)` para escribir BQ-formula columns a PG INTEGER (e.g. `days_late`). BQ formulas pueden devolver fraccionales (`0.117...`) y PG INT los rechaza. Usar `toInteger()` (con `Math.trunc`) que vive en `src/lib/sync/sync-bq-conformed-to-postgres.ts`.

**Helpers canónicos (orden de uso)**:

- `runNotionSyncOrchestration({ executionSource })` — wrapper completo BQ raw → conformed (solo lo invoca el endpoint Cloud Run y el endpoint admin manual).
- `syncBqConformedToPostgres({ syncRunId?, targetSpaceIds?, replaceMissingForSpaces? })` — drena BQ conformed → PG. Reusable desde cualquier admin endpoint o script de recovery. Default: todos los spaces activos, `replaceMissingForSpaces=true`.
- `projectNotionDeliveryToPostgres({ ... })` — primitiva más baja: UPSERT por `notion_*_id` directo a PG. Usado por `syncBqConformedToPostgres` y por la wiring inline dentro de `runNotionConformedCycle`. Idempotente, per-row, no table locks.

**Manual triggers / recovery**:

- Cloud Scheduler manual: `gcloud scheduler jobs run ops-notion-conformed-sync --location=us-east4 --project=efeonce-group`
- Admin endpoint Vercel (auth via agent session, sin cron secret): `POST /api/admin/integrations/notion/trigger-conformed-sync` — corre los 2 steps secuencialmente (`runNotionSyncOrchestration` + `syncBqConformedToPostgres`).
- Vercel cron `/api/cron/sync-conformed` (CRON_SECRET) — fallback histórico, queda activo pero no se debe usar como path principal.

**Kill-switch defensivo**: env var `GREENHOUSE_NOTION_PG_PROJECTION_ENABLED=false` revierte el step PG dentro de `runNotionConformedCycle` sin requerir deploy. **NO** afecta el step PG del endpoint Cloud Run (que vive en `services/ops-worker/server.ts`), ese es UNCONDICIONAL.

**Defensas anti-tenant-cross-contamination** (Sky no rompe Efeonce ni viceversa):

- `replaceMissingForSpaces` filtra `WHERE space_id = ANY(targetSpaceIds)` — nunca toca rows fuera del cycle.
- UPSERT por `notion_*_id` (PK natural Notion) es idempotente y no depende del orden.
- Cascade de title `nombre_de_tarea` / `nombre_de_la_tarea` resuelve correctamente para ambos tenants (Efeonce usa la primera columna, Sky la segunda — verificado en vivo via Notion REST API + Notion MCP).

**Schema constraints relevantes**:

- BQ `delivery_*.{task_name,project_name,sprint_name}` están NULLABLE (alineado con TASK-588 PG decision). Helper `ensureDeliveryTitleColumnsNullable` en `sync-notion-conformed.ts` aplica `ALTER COLUMN ... DROP NOT NULL` idempotente al startup.
- PG `greenhouse_delivery.*` tiene CHECK constraints anti-sentinel desde TASK-588 (migration `20260424082917533_project-title-nullable-sentinel-cleanup.sql`). Cualquier sentinel string los va a rechazar.
- DB functions `greenhouse_delivery.{task,project,sprint}_display_name` (migration `20260426144105255`) producen el fallback display data-derived al READ time. Mirror exacto en TS via `src/lib/delivery/task-display.ts` (paridad regression-tested).

**Admin queue de hygiene**: `/admin/data-quality/notion-titles` lista las pages con `*_name IS NULL` agrupadas por space, con CTA "Editar en Notion" → page_url. Cuando el usuario edita el title en Notion, el next sync drena el cambio y la row sale del queue.

### Canonical task status vocabulary V1 — single source of truth cross-tenant (2026-05-18)

Toda comparación de `task_status` / `estado` en TS o SQL embebido **debe** pasar por el módulo canonical `src/lib/delivery/task-status-canonical.ts`. Single source of truth para los 11 estados V1 del lifecycle de tareas Greenhouse + alias map cubriendo Efeonce legacy + Sky legacy + English/accent variants.

**Módulo canonical**: `src/lib/delivery/task-status-canonical.ts` (NOT server-only — safe en client + server).

- `TASK_STATUS_CANONICAL` — 11 estados V1: `Sin empezar`, `Brief listo`, `Pendiente aprobación interna`, `En pausa`, `Bloqueado`, `En curso`, `Listo para revisión`, `Cambios solicitados`, `Aprobado`, `Cancelado`, `Archivado`.
- `TASK_STATUS_ALIASES` — frozen map: 11 canonical self-maps + 7 Efeonce legacy (`Listo→Aprobado`, `Cancelada→Cancelado`, `Archivadas→Archivado`, `Detenido→En pausa`, `Listo para diseñar→Brief listo`, `Pendiente Dir. Arte→Pendiente aprobación interna`, `Cambios Solicitados→Cambios solicitados` con S→s) + 3 Sky legacy (`Tomado→Brief listo`, `Pendiente→Pendiente aprobación interna`, `En feedback→Cambios solicitados`) + 8 English/accent variants (Done/Finalizado/Completado→Aprobado, Cancelled/Canceled→Cancelado, sin tilde, capital case, Backlog→Sin empezar, Archivada singular).
- `TASK_STATUS_GROUPS` — semantic groups: `BRIEFING`, `ACTIVE`, `BLOCKED`, `COMPLETED`, `EXCLUDED`, `READY_FOR_REVIEW`, `CLIENT_CHANGES`.

**Helpers puros** (client + server):

- `normalizeTaskStatus(raw)` → canonical V1 string o null.
- `isCanonicalStatus(raw, canonical)` → boolean predicate.
- `isCanonicalStatusInGroup(raw, group)` → boolean predicate.
- `allVariantsForCanonical(canonical)` → string[] con TODAS las variantes (legacy + canonical).
- `allVariantsForGroup(group)` → string[] expandido.

**SQL builders** (server-side):

- `taskStatusSql(canonical)` → `'A','B','C'` SQL-safe IN list para un canonical.
- `taskStatusGroupSql(group)` → group expandido con todas las variantes.
- `buildTaskStatusToCscPhaseSql(column)` → CASE WHEN canonical mapeando a CSC phase (briefing / produccion / revision_interna / cambios_cliente / aprobado / bloqueado / excluido / unknown).

**Pattern canónico**:

```ts
// TS predicate (client + server)
if (isCanonicalStatusInGroup(row.task_status, TASK_STATUS_GROUPS.COMPLETED)) { ... }

// SQL embebido (server)
const sql = `
  COUNTIF(task_status IN (${taskStatusGroupSql(TASK_STATUS_GROUPS.COMPLETED)})) AS done
`

// UNNEST(@param) pattern para BQ parameterized
const params = { completedStatuses: allVariantsForGroup(TASK_STATUS_GROUPS.COMPLETED) }
const sql = `COUNTIF(estado IN UNNEST(@completedStatuses)) AS done`
```

**⚠️ Reglas duras**:

- **NUNCA** hardcodear un literal de status en TS/SQL/BQ (`if (status === 'Cambios Solicitados')`, `WHERE estado = 'Listo'`, etc.). Toda comparación pasa por canonical helpers + constants.
- **NUNCA** comparar status con `===` contra un nombre canonical sin normalizar el lado raw antes. Pre-rename data tiene variantes case-mismatched (`'Cambios Solicitados'` capital S vs canonical `'Cambios solicitados'`) — la comparación directa falla silente. Usar `isCanonicalStatus(raw, canonical)` o `normalizeTaskStatus(raw)` primero.
- **NUNCA** modificar `TASK_STATUS_ALIASES` para REMOVER un legacy alias sin verificar que BQ/PG no tiene rows residuales con ese nombre. La eliminación es decisión coordinada cuando TASK-908 ship + 0% data en BQ con el nombre viejo.
- **NUNCA** agregar aliases para nombres custom de cliente nuevo. Si entra cliente con custom status names, **enforce canonical template L1** en Notion antes del onboarding (eso es lo escalable). Los aliases son SOLO para legacy transition window.
- **NUNCA** importar este módulo desde código que tenga `import 'server-only'` directive en un componente cliente — el módulo en sí NO es server-only (sin directive), pero los SQL builders solo tienen sentido server-side.
- **NUNCA** usar el output de `taskStatusGroupSql` / `taskStatusSql` en un endpoint que acepte user input para el group/canonical (potencial SQL injection). Los inputs DEBEN ser constants `TASK_STATUS_GROUPS.*` o `TASK_STATUS_CANONICAL.*`, no strings runtime.
- **SIEMPRE** que emerja un nuevo callsite que necesite comparar/filtrar status, usar canonical helpers. NO replicar inline arrays como `['Listo', 'Done', 'Finalizado', 'Completado']`.
- **SIEMPRE** que emerja un cliente nuevo con custom status names en Notion, NO agregar aliases. Migrar el template Notion del cliente al canonical V1 ANTES del onboarding. L1 universalización es la única solución escalable.

**Pattern fuente**: TASK-742 (single source of truth + frozen maps + helper canonical pattern). Migration path: Plan B (TASK-908) introduce `status_code` enum persistido en PG al boundary del sync — código matchea por código estable, no por nombre. Cuando shipee, los aliases legacy se eliminan en cleanup PR.

**Spec canónica**: commit `1525e51c` en `develop` 2026-05-18. Tests anti-regresión: 68 asserts en `src/lib/delivery/task-status-canonical.test.ts`.

### Notion delivery PG projection — robust integer cast + per-row resilience (2026-05-18)

`projectNotionDeliveryToPostgres` (`src/lib/sync/project-notion-delivery-to-postgres.ts`) es el writer canónico de `greenhouse_delivery.{projects,tasks,sprints}` PG desde BQ conformed. Toda INSERT de una columna INTEGER pasa por **SQL-boundary cast** + **per-row try/catch** + **Sentry diagnostic capture** + **result shape con skipped counters**. Defense in depth de 4 capas.

**Helpers canónicos** (`src/lib/sync/project-notion-delivery-to-postgres.ts`):

- `intArg(value)` → `sql\`(${value})::numeric::integer\``. Cast doble que acepta string (`"0.44"`), number (`0.44`), null, undefined → coerce a INTEGER truncando fraccional. Belt-and-suspenders con TS `toInteger` upstream.
- `arrayArg(value)` → `sql\`COALESCE(${value}::text[], ARRAY[]::text[])\``. Mirror del `intArg` pattern para ARRAY NOT NULL columns. BQ runtime puede devolver `null` para repeated-string properties sin valores (e.g. task sin Subtareas relation). PG ARRAY NOT NULL DEFAULT '{}' rechaza ese null. Helper coerce `null → []` en SQL boundary. Aplica a las 4 columnas ARRAY NOT NULL canónicas (`assignee_member_ids`, `project_source_ids`, `subtareas_ids`, `tarea_principal_ids`) + cualquier columna ARRAY NOT NULL futura.
- `summarizePgError(err)` → extrae `{message, code, position, column, constraint}` de un PG error sin row-level data.

**Pattern canónico per upsert helper**:

```typescript
for (const row of rows) {
  if (!row.entity_source_id) continue
  try {
    await sql`INSERT INTO greenhouse_delivery.X (...)
              VALUES (...,
                ${intArg(row.integer_col)},
                ${arrayArg(row.array_col)},
                ...)
              ON CONFLICT (...) DO UPDATE SET ...`.execute(db)
    written += 1
  } catch (err) {
    skipped += 1
    const summary = summarizePgError(err)
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'delivery_projection', entity: '<project|sprint|task>' },
      extra: { syncRunId, entityId: row.entity_source_id, ...summary }
    })
    if (failures.length < 20) failures.push({ entityType, entityId, error: summary })
  }
}
```

**Result shape canónico** (extendido a `ProjectNotionDeliveryToPostgresResult`):

- `projectsSkipped` / `sprintsSkipped` / `tasksSkipped` — real counters per entity (no capped).
- `failureSamples[]` — capped a 20 samples para audit payload bounded.

**Bug class disparadores (2026-05-18)**:

- **INTEGER NOT NULL** (commit `ca465ac0`): BQ formula columns emiten valores fraccionales como string `"0.44"`. El TS contract `<col>: number | null` PASSED tsc, pero runtime podía leak strings. PG INTEGER rechazaba con `invalid input syntax for type integer: "0.44"`. Solución: `intArg`.
- **ARRAY NOT NULL** (commit `550c0e67`): BQ devuelve `null` para repeated-string properties sin valores (e.g. task sin Subtareas). PG `ARRAY NOT NULL DEFAULT '{}'` rechaza con `null value in column "tarea_principal_ids" of relation "tasks" violates not-null constraint`. Detected en vivo durante Efeonce canonical rename cascade (1322 rows skipped en Step 1, Sentry alert JAVASCRIPT-NEXTJS-64). Solución: `arrayArg`.

Sin per-row try/catch, una sola row mala fallaba el batch entero. Sin diagnostic capture, RCA requería deep grep post-facto. La per-row resilience + diagnostic capture hicieron que el bug class ARRAY fuera SURFACEABLE inmediatamente (Sentry alert clara con `column: "tarea_principal_ids"`) sin bloquear la cascada (Step 2 UNCONDITIONAL drain bypaseó el bug y dejó PG canonical).

**Columnas protegidas actualmente**:

- INTEGER (10): `days_late`, `rescheduled_days`, `client_change_round_final`, `frame_versions`, `frame_comments`, `open_frame_comments`, `blocker_count`, `workflow_change_round`, `completed_tasks_count`, `total_tasks_count`.
- ARRAY NOT NULL (4): `assignee_member_ids`, `project_source_ids`, `subtareas_ids`, `tarea_principal_ids`.

Cualquier columna nueva (INTEGER o ARRAY NOT NULL) queda automáticamente protegida por la primitiva canonical cuando se envuelve con el helper apropiado.

**⚠️ Reglas duras**:

- **NUNCA** pasar una columna INTEGER a un INSERT sin envolver el valor en `intArg(...)`. Aunque el TS contract diga `number | null`, el runtime puede leak strings desde BQ formulas.
- **NUNCA** pasar una columna ARRAY NOT NULL a un INSERT sin envolver el valor en `arrayArg(...)`. Aunque el TS contract diga `string[] | null`, BQ runtime puede devolver `null` cuando la repeated property Notion no tiene valores.
- **NUNCA** envolver un upsert helper (`upsertProjects/Sprints/Tasks`) sin per-row try/catch. Resilience canónica: una row mala no debe bloquear el batch.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'delivery_projection', entity: '<project|sprint|task>' }, extra: { syncRunId, entityId, ...summary } })`.
- **NUNCA** loggear el row completo en el catch (puede contener PII). Solo `entityId` + `summarizePgError(err)` output (campos estructurales sin user data).
- **NUNCA** modificar el shape `ProjectNotionDeliveryToPostgresResult` removiendo campos. Adding-only es safe; removing rompe consumers.
- **SIEMPRE** que emerja una columna INTEGER nueva en el schema, agregarla al INSERT con `intArg(...)`. Lint rule no la enforce hoy — code review humano.
- **SIEMPRE** que emerja una columna ARRAY NOT NULL nueva en el schema, agregarla al INSERT con `arrayArg(...)`. Mismo enforcement humano.
- **SIEMPRE** que emerja un nuevo upsert helper (e.g. para `revisions` o cualquier delivery entity nueva), seguir el mismo pattern: try/catch + intArg + arrayArg + captureWithDomain + skipped/failures wiring.
- **SIEMPRE** caller del helper debe loggear `pgResult.{projectsSkipped, sprintsSkipped, tasksSkipped}` en cron summary line + first `failureSamples[0]` si totalSkipped > 0. Cron visibility canónica.

**Spec canónica**: commits `ca465ac0` (intArg + per-row resilience) + `550c0e67` (arrayArg) en `develop` 2026-05-18. Pattern fuente: TASK-742 7-layer auth resilience (per-row try/catch + diagnostic capture + Sentry domain), TASK-571/766/774 (VIEW canónica + helper + signal + lint).
