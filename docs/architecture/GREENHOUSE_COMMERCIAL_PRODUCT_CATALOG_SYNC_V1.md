# Greenhouse EO — Commercial Product Catalog Sync Architecture V1

> **Version:** 1.3
> **Created:** 2026-04-20 por Claude (Opus 4.7)
> **Ultima actualizacion:** 2026-04-21 por Claude (Opus 4.7) — Fase C shipped (TASK-547)
> **Audience:** Backend engineers, product owners, agentes que implementen features de catalog management, pricing, quote builder o HubSpot sync
> **Related:** `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`, `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`, `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`, `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`, `GREENHOUSE_EVENT_CATALOG_V1.md`
> **Supersedes:** ninguno (spec nuevo)

---

## Delta 2026-04-21 — Fase C shipped (TASK-547)

Outbound bridge reactivo `product_catalog → HubSpot Products` cerrando el loop Greenhouse-first. Los eventos emitidos por la materialización de Fase B ahora disparan pushes a HubSpot vía Cloud Run.

### Implementado en Fase C

| Area | Artefacto |
|---|---|
| Migration | `migrations/20260421180531865_task-547-product-catalog-hubspot-sync-trace.sql` — 4 columnas nuevas en `product_catalog` (`hubspot_sync_status`, `hubspot_sync_error`, `hubspot_sync_attempt_count`, `hubspot_last_write_at`) + CHECK constraint del status enum + CHECK consistencia `hubspot_product_id → last_outbound_sync_at` + 2 indexes (retryable, last_write) + backfill defensivo para rows legacy con `hubspot_product_id` sin `last_outbound_sync_at` |
| Event catalog | `commercial.product.hubspot_synced_out` + `commercial.product.hubspot_sync_failed` sobre aggregate `product_catalog` |
| Publishers | `src/lib/hubspot/product-hubspot-events.ts` — `publishProductHubSpotSynced` + `publishProductHubSpotSyncFailed` |
| Types | `src/lib/hubspot/product-hubspot-types.ts` — `ProductHubSpotSyncStatus` union + `ProductHubSpotPushAction` + `ProductHubSpotPushResult` + `ProductNotFoundError` |
| Cloud Run client extensions | 3 métodos nuevos en `src/lib/integrations/hubspot-greenhouse-service.ts`: `updateHubSpotGreenhouseProduct`, `archiveHubSpotGreenhouseProduct`, `reconcileHubSpotGreenhouseProducts`. Todos con graceful fallback `endpoint_not_deployed` en 404 (patrón TASK-524/539) — los endpoints server-side viven en el repo externo `hubspot-greenhouse-integration` y se deploy-ean por separado. La interfaz `HubSpotGreenhouseCreateProductRequest` gana `createdBy` + `customProperties` typed. |
| Payload adapter | `src/lib/hubspot/hubspot-product-payload-adapter.ts` — `adaptProductCatalogToHubSpot{Create,Update}Payload` mapean el snapshot canónico a payload HubSpot con 5 custom properties (`gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`, `gh_business_line`). Pasa por `sanitizeHubSpotProductPayload` (TASK-347 guard) como defense-in-depth |
| Push helper | `src/lib/hubspot/push-product-to-hubspot.ts` — pipeline idempotente: `readRow → antiPingPongCheck → deriveAction → callCloudRun → persistTrace → emit`. Anti-ping-pong skippea cuando `hubspot_last_write_at` < 60s. Cada path de degradación (`endpoint_not_deployed`, `skipped_no_anchors`, `failed`) persiste el trace + emite el evento apropiado; solo 5xx rethrow para retry del reactive worker |
| Projection | `src/lib/sync/projections/product-hubspot-outbound.ts` — domain `cost_intelligence`, `maxRetries: 2`, consume los 4 eventos `commercial.product_catalog.{created,updated,archived,unarchived}` |
| Registry | `src/lib/sync/projections/index.ts` ganó `registerProjection(productHubSpotOutboundProjection)` |
| Custom properties spec | `scripts/create-hubspot-product-custom-properties.ts` — array de 5 property definitions + helper `planCustomPropertyCreation` idempotente. NO mutator directo (este repo no tiene creds HubSpot); aplicación offline via skill `hubspot-ops` |
| Operations runbook | `docs/operations/hubspot-custom-properties-products.md` — cuándo correr, validación sandbox→prod, troubleshooting, rollback |
| Tests | 30 tests: 6 payload adapter (create/update mapping, null handling, custom props stability), 13 push helper (happy paths, skip paths, anti-ping-pong, endpoint_not_deployed, error paths), 11 projection (registration, scope extraction, dispatch, eventType drop) |

### Decisiones vs spec §7-§8

| Spec asume | Decisión pragmática |
|---|---|
| Cloud Run service `hubspot-greenhouse-integration` vive en `services/` de este repo | Vive en repo externo. Este repo implementa el **cliente** con graceful `endpoint_not_deployed` fallback en los 3 endpoints pendientes (PATCH/archive/reconcile). Deploy del service queda como follow-up del repo `hubspot-greenhouse-integration` |
| Anti-ping-pong helper compartido de TASK-540 | TASK-540 ya aterrizó `src/lib/sync/anti-ping-pong.ts`. `push-product-to-hubspot.ts` sigue inline leyendo `hubspot_last_write_at` + ventana 60s; `TASK-563` debe refactorizarlo al helper canónico |
| Columna nueva `gh_last_write_at` | No necesaria: `hubspot_last_write_at` (migration TASK-547) cumple esa función; `last_outbound_sync_at` (TASK-545) sigue como el ACK timestamp para UI display |
| `sync_status` granular (5 estados) | Columna legacy `sync_status` es `local_only | pending_sync | synced`. NO se toca. En su lugar 4 cols nuevas específicas del bridge HubSpot (espejo del patrón TASK-524 income), con CHECK constraint enforced |
| Batch API HubSpot para ≥5 events en 30s | Deferido. El reactive worker procesa events 1:1 hoy; introducir coalescing requiere cambios cross-projection. Follow-up explícito post-producción |
| Tests E2E contra HubSpot sandbox | Deferido a post-deploy. Los 30 unit tests cubren todos los paths del push helper + adapter + projection con mocks; E2E contra HubSpot real queda para staging smoke test post-activación del flag |

### Runtime topology confirmada

- **ops-worker** (Cloud Run) — corre `productHubSpotOutboundProjection` del outbox. Consume eventos `commercial.product_catalog.*` emitidos por la materialización de TASK-546. Mismo carril que `quotationHubSpotOutbound` (TASK-463) y `incomeHubSpotOutbound` (TASK-524).
- **hubspot-greenhouse-integration** (Cloud Run, repo externo) — HTTP facade a HubSpot Products API. Expone `POST /products` (ya deployado), y **necesita deploy** de `PATCH /products/:id`, `POST /products/:id/archive`, `GET /products/reconcile`. El cliente de este repo handle 404 como `endpoint_not_deployed` y el retry worker reprocessa cuando el service ship los endpoints.
- **commercial-cost-worker** — NO participa. Reservado para cost basis materialization.

### Decisión multi-currency (open question #4 resuelta)

**Decisión**: 1 product por sellable entity, pricing en **USD** (moneda canónica de Greenhouse hoy). Multi-currency products vía `source_variant_key` (ej. ECG-001 → `ECG-001-CLP`, `ECG-001-USD`) se difiere hasta TASK-421 (Finance Multi-Currency Expansion).

Rationale:
- El schema de `product_catalog` ya soporta `source_variant_key` como discriminador — no hay blocker técnico.
- HubSpot Enterprise tier soporta multi-currency native en products, pero introducir esa complejidad sin primero estabilizar el loop unidireccional USD genera deuda.
- Greenhouse pricing engine ya es USD-first en los handlers de TASK-546.

Cuando TASK-421 desbloquee multi-currency, el adapter + materializer extenderán para emitir 1 product per (source, currency) tuple, con `source_variant_key = currency_code`.

### Rollout plan

1. **Deploy del service externo**: el repo `hubspot-greenhouse-integration` debe shipear `PATCH /products/:id`, `POST /products/:id/archive`, `GET /products/reconcile` antes de activar el bridge. Mientras tanto, el cliente handle 404 como `endpoint_not_deployed` y el retry worker reprocessa cuando shipa.
2. **Custom properties**: correr runbook `docs/operations/hubspot-custom-properties-products.md` contra sandbox HubSpot, validar, replicar en production.
3. **Staging activation**: con los flags `GREENHOUSE_PRODUCT_SYNC_{ROLES,TOOLS,OVERHEADS,SERVICES}` ya ON de TASK-546, los eventos fluirán. Monitorear:
   - `greenhouse_commercial.product_catalog.hubspot_sync_status` distribución
   - Outbox lag (eventos `commercial.product_catalog.*` con edad >5min)
   - `hubspot_sync_attempt_count` max per product (alerta si >3)
4. **Production activation**: replicar tras 48h de staging sin errores.

### Gaps reconocidos para fases siguientes

1. **TASK-548 (Fase D)** — drift cron: consume `reconcileHubSpotGreenhouseProducts` para comparar `gh_owned_fields_checksum` con snapshot HubSpot; escribe `product_sync_conflicts`. Shipped 2026-04-21: cron `ops-product-catalog-drift-detect`, comandos admin, routes `/api/admin/commercial/product-sync-conflicts/**`, Admin Center surface y Slack alerting.
2. **TASK-549 (Fase E)** — policy enforcement: deprecar inbound auto-adopt y drop `sync_direction='hubspot_only'`.
3. **Follow-up outbound service**: deploy de `PATCH/archive/reconcile` endpoints en `hubspot-greenhouse-integration`.
4. **Batch API coalescing** — si el volumen justifica, agregar window-based batching de eventos 30s en el reactive worker.
5. **Multi-currency variants** — se desbloquea con TASK-421.

---

## Delta 2026-04-21 — Fase D shipped (TASK-548)

Drift detection operativo + resolution UI administrativa + observabilidad mínima.

### Implementado en Fase D

| Area | Artefacto |
|---|---|
| Reconciler | `src/lib/commercial/product-catalog/drift-reconciler.ts` — detecta `orphan_in_hubspot`, `orphan_in_greenhouse`, `field_drift`, `sku_collision`, `archive_mismatch`; auto-heal seguro vía `replay_greenhouse`; degrada a `endpoint_not_deployed` si el servicio externo aún no expone `/products/reconcile` |
| Tracking de runs | `src/lib/commercial/product-catalog/drift-run-tracker.ts` — escribe en `greenhouse_sync.source_sync_runs` con `source_system='product_catalog_drift_detect'`, `source_object_type='hubspot_products'`, `sync_mode='batch'` |
| Resolution commands | `src/lib/commercial/product-catalog/conflict-resolution-commands.ts` — `adopt_hubspot_product`, `archive_hubspot_product`, `replay_greenhouse`, `accept_hubspot_field`, `ignore` con audit en `pricing_catalog_audit_log` |
| Admin APIs | `src/app/api/admin/commercial/product-sync-conflicts/**/route.ts` — list, detail y resolve bajo `requireAdminTenantContext()` + capability `commercial.product_catalog.resolve_conflict` |
| Admin UI | `src/app/(dashboard)/admin/commercial/product-sync-conflicts/**` + `src/views/greenhouse/admin/product-sync-conflicts/**` — list/detail, diff viewer, CTAs auditables y estados operativos |
| Ops worker | `services/ops-worker/product-catalog-drift-detect.ts`, `services/ops-worker/server.ts`, `services/ops-worker/deploy.sh` — endpoint `POST /product-catalog/drift-detect` + scheduler `ops-product-catalog-drift-detect` |
| Tests | `drift-reconciler.test.ts` + admin route tests (`GET /api/admin/commercial/product-sync-conflicts`, `POST /resolve`) |

### Correcciones a la spec de drift vs runtime shipped

| Spec previa | Runtime 2026-04-21 |
|---|---|
| `0 4 * * *` | scheduler final `0 3 * * *` (`America/Santiago`) |
| registrar en `source_sync_pipelines` + `source_sync_runs` | V1 escribe solo en `source_sync_runs`; no se agregó control plane paralelo |
| UI bajo `src/app/(admin)/...` | la route real vive en `src/app/(dashboard)/admin/commercial/product-sync-conflicts/**` |
| aislamiento por tabla asumido | `greenhouse_commercial.product_catalog` y `product_sync_conflicts` siguen siendo surfaces global-operativos; V1 se protege por `requireAdminTenantContext()` + capability auditada, no por `space_id` en estas tablas |

### Contrato operativo de resolución

- `replay_greenhouse` es el único auto-heal V1; lo usa tanto el cron como la UI para casos con Greenhouse authoritativo.
- `accept_hubspot_field` solo aplica a `source_kind in ('manual', 'hubspot_imported')`.
- `adopt_hubspot_product` materializa una nueva row local con `source_kind='hubspot_imported'`, `sync_direction='bidirectional'` y checksum recalculado.
- `archive_hubspot_product` y `ignore` cierran el conflicto con audit trail explícito.

---

## Delta 2026-04-21 — Fase B shipped (TASK-546)

Handlers por source materializados + event homogenization + sub-flag rollout.

### Implementado en Fase B

| Area | Artefacto |
|---|---|
| Event catalog | `commercial.sellable_role.{deactivated,reactivated}` + `ai_tool.{deactivated,reactivated}` + `commercial.overhead_addon.{created,updated,deactivated,reactivated}` + nuevo aggregate `overhead_addon` |
| Publishers faltantes | `publishSellableRole{Deactivated,Reactivated}`, `publishAiTool{Deactivated,Reactivated}`, archivo nuevo `src/lib/commercial/overhead-addon-events.ts` con 4 publishers |
| Lifecycle helpers | `deactivate/reactivateSellableRole(roleId)` en `sellable-roles-store.ts`, `deactivate/reactivateToolCatalogEntry(toolId)` en `tool-catalog-store.ts`. `upsertOverheadAddonEntry` ahora emite `.created` / `.updated` / `.deactivated` / `.reactivated` según transición de `active` |
| Sub-flags | `src/lib/commercial/product-catalog/flags.ts` — `GREENHOUSE_PRODUCT_SYNC_{ROLES,TOOLS,OVERHEADS,SERVICES}`. Pattern decentralizado (match con `isFinanceBigQueryWriteEnabled`); default OFF. `isProductSyncEnabled(sourceKind)` despacha por kind |
| Upsert helper | `src/lib/commercial/product-catalog/upsert-product-catalog-from-source.ts` — lock por `(source_kind, source_id, source_variant_key)` + checksum compare + 5 outcomes (`created`/`updated`/`archived`/`unarchived`/`noop`) + emit en la misma transacción |
| Source readers | `src/lib/commercial/product-catalog/source-readers.ts` — 4 readers defensivos (`readSellableRoleForSync`, `readToolForSync`, `readOverheadAddonForSync`, `readServiceForSync`); se re-query la source table para evitar stale payload |
| Handlers | `src/lib/sync/handlers/{sellable-role,tool,overhead-addon,service}-to-product.ts` — puros (map source row → `GhOwnedFieldsSnapshot`), delegan upsert al helper compartido |
| Projection | `source-to-product-catalog.ts` refresh body reemplazado; trigger events extendido a 16 (era 8); dispatcher con flag gating |
| Tests | 55 tests passing: 7 en `upsert-product-catalog-from-source.test.ts`, 14 en `handler-mappers.test.ts`, 10 en `flags.test.ts`, 13 en `source-to-product-catalog.test.ts` (reescrito con mocks), + 11 preservados de Fase A |

### Correcciones a §6.2 (Handler contract) vs realidad del schema

| Spec §6.2 asume | Realidad 2026-04-21 |
|---|---|
| `product_type ∈ {'service','tool','addon','component'}` | DB CHECK acepta solo `{'service','deliverable','license','infrastructure'}`. Handlers mapean: tools → `license`, addons → `service`, services → `service`, sellable roles → `service` |
| `pricing_model ∈ {'staff_aug','time_and_materials','fixed','subscription','composition'}` | DB CHECK acepta solo `{'staff_aug','retainer','project','fixed'}`. Handlers mapean: tools → `fixed`, addons → `fixed`, sellable roles → `staff_aug`, services → derivado de `commercial_model` (`on_going`/`on_demand`→`retainer`, `hybrid`→`project`, `license_consulting`→`fixed`, default `project`) |
| `default_currency` flexible | DB CHECK acepta solo `{'CLP','USD','CLF'}`. Handlers usan `USD` por default (pricing Chile-first: roles en USD, tools en USD, addons en USD) |
| `default_unit ∈ {'hour','month','unit','project'}` | Confirmado. Handler mapea `service_unit='monthly'` → `'month'`; fallback a `'project'` |
| `tool.sellable=true` como flag | Columna no existe. Handler interpreta sellable = `tool_sku IS NOT NULL AND is_active=true`. Tools sin sku no materializan |
| Handlers reciben payload rico con todos los campos | Publishers actuales emiten **solo ids** (`roleId`, `toolId`, `moduleId`, `addonId`). Handlers re-query source table con `readXxxForSync` antes de materializar — evita stale payload en retries |
| `commit(tx, snapshot)` como método del handler | Refactor a helper compartido `upsertProductCatalogFromSource(tx, {sourceKind, sourceId, snapshot})`. Handlers son funciones puras extract + delegate |

### Runtime topology

Projection corre en **Cloud Run ops-worker** (domain `cost_intelligence`), NO en `commercial-cost-worker` (decisión Delta 2026-04-20 preservada). El refresh body es transaccional: un `withTransaction` envuelve lock + checksum + upsert + emit.

### Rollout plan

1. **Staging**: enable `GREENHOUSE_PRODUCT_SYNC_ROLES=true`. Validar 48h en `product_catalog` que roles emiten rows consistentes + eventos downstream.
2. **Staging**: enable `..._TOOLS=true`, validar 48h.
3. **Staging**: enable `..._OVERHEADS=true`, validar 48h.
4. **Staging**: enable `..._SERVICES=true`, validar 48h.
5. **Production**: replicar flag por flag tras validación en staging.

Cada fase se puede revertir (set flag a `false`) sin rollback de schema; rows ya materializadas persisten.

### Gaps reconocidos para fases siguientes

1. **TASK-547 (Fase C)** — outbound HubSpot: proyección `productHubSpotOutbound` escucha `commercial.product_catalog.{created,updated,archived,unarchived}` y pushea a HubSpot Products API.
2. **TASK-548 (Fase D)** — drift cron: compara `gh_owned_fields_checksum` contra snapshot HubSpot; escribe `product_sync_conflicts`.
3. **TASK-549 (Fase E)** — policy enforcement: deprecar inbound auto-adopt, remover flags, drop `sync_direction='hubspot_only'`.

---

## Delta 2026-04-21 — Fase A shipped (TASK-545)

Foundation del programa en `develop`. Lo que vive en el repo hoy vs. lo que este spec describe en su forma completa.

### Implementado en Fase A

| Area | Artefacto |
|---|---|
| DDL extension | `migrations/20260421122806370_task-545-product-catalog-extension.sql` — 9 columnas nuevas en `product_catalog` + CHECK de `source_kind` + UNIQUE parcial + 3 indexes |
| Conflicts table | `migrations/20260421122812484_task-545-product-sync-conflicts-table.sql` — `product_sync_conflicts` con check constraints + indexes |
| Backfill | `migrations/20260421122820579_task-545-product-catalog-source-backfill.sql` — clasificacion heuristica por SKU prefix (ECG/ETG/EFO/EFG/PRD), fallback `hubspot_imported`, NOTICE sobre ambiguous rows |
| CLI | `scripts/backfill-product-catalog-source.ts` con `--dry-run` / `--force` |
| Types + helpers | `src/lib/commercial/product-catalog/{types,checksum,product-catalog-events,product-sync-conflicts-store,index}.ts` |
| Event catalog | `commercial.product_catalog.{updated,archived,unarchived}` + `commercial.product_sync_conflict.{detected,resolved}` + aggregate `product_sync_conflict` |
| Projection scaffold | `src/lib/sync/projections/source-to-product-catalog.ts` registrada; refresh es no-op hasta Fase B |
| Store extension | `listCommercialProductCatalog` gana filtros `sourceKind` + `includeArchived` (default oculta archived) |
| Tests | 17 tests passing en `src/lib/commercial/product-catalog/__tests__/**` + `src/lib/sync/projections/__tests__/source-to-product-catalog.test.ts` |

### Correcciones a §5.3 (schema real de source catalogs)

| Spec §5.3 dice | Realidad (2026-04-21) |
|---|---|
| `service_pricing.pricing_id` como PK | La PK es `module_id`; `service_sku` es la columna SKU. El backfill + handlers Fase B deben joinar por `service_sku` y referenciar `module_id` como `source_id`. |
| `sellable_roles.sku` | Columna real es `role_sku`; match por SKU funciona. |
| `tool_catalog.tool_sku` NULLABLE | Confirmado — rows sin SKU no se mapean y caen a `hubspot_imported` si tienen `hubspot_product_id`. |

### Correcciones al catalogo de eventos §6

La spec lista triggers `commercial.tool.*`, `commercial.overhead_addon.*`, `commercial.service.*`. En la realidad hoy existen:

- `commercial.sellable_role.{created,cost_updated,pricing_updated}` — usados en el registration real.
- `ai_tool.{created,updated}` — NOT `commercial.tool.*`.
- `service.{created,updated,deactivated}` — NOT `commercial.service.*`.
- `commercial.overhead_addon.*` — **no existen** publishers todavia.

La projection scaffolded se registra con los **event types reales** (mas cercanos al spec que los documentados). Fase B (TASK-546) decide si:
- Agregar publishers `commercial.overhead_addon.*` en `overhead-addons-store` + actualizar la lista de triggers, o
- Mantener los namespaces `ai_tool.*` / `service.*` y mapear 1:1 en los handlers.

### Correcciones a §8 (`sync_direction`)

La spec menciona valores `greenhouse_only` / `bidirectional` / `hubspot_only`. Hoy `product_catalog.sync_direction` ya existe pero con valores legacy (`inbound`, `outbound`, `bidirectional` segun rows historicos). Fase A NO toca el campo; TASK-549 (Fase E) es quien normaliza el enum y elimina `hubspot_only`.

### Robustez operacional anadida

- **Drift-safe checksum order:** `computeGhOwnedFieldsChecksum` usa un orden **inmutable** documentado en `GH_OWNED_FIELDS_CHECKSUM_ORDER`. Cambiar el orden invalida todos los hashes almacenados — tests unitarios detectan drift.
- **NULL vs empty string:** el checksum los trata como equivalentes (documentado en `checksum.ts`), evitando drift falso cuando HubSpot normaliza `description = ''` vs `NULL`.
- **`is_archived` default hidden:** `listCommercialProductCatalog` oculta archived por default. Admin Center + drift cron pasan `includeArchived: true`.

### Gaps reconocidos para fases siguientes

1. **Handlers por source** — scaffolded pero no activos. TASK-546 los implementa.
2. **Publisher de overhead_addons** — no existe; TASK-546 lo agrega antes de activar el materializer.
3. **Outbound HubSpot** — leera `commercial.product_catalog.{created,updated,archived,unarchived}` y hará PUT a HubSpot Products API; llega en TASK-547.
4. **Drift cron** — escribe `product_sync_conflicts` comparando `gh_owned_fields_checksum` contra HubSpot; llega en TASK-548.
5. **Rows ambiguas** — el backfill deja `source_kind=NULL` para rows sin prefix reconocible ni `hubspot_product_id`. Requiere review operacional (via CLI `--force`) o task de hygiene.

---

## 1. Resumen ejecutivo

Greenhouse hoy tiene cinco catálogos canónicos para cosas vendibles —`sellable_roles` (ECG), `tool_catalog` (ETG), `overhead_addons` (EFO), `service_pricing` (EFG) y `product_catalog` (PRD)— pero solo uno (`product_catalog`) sincroniza con HubSpot, y solo en modo CREATE. No hay UPDATE outbound, no hay proyección reactiva, no hay drift detection, y los cuatro catálogos fuente viven aislados del anchor de distribución. Consecuencia: crear un role en Greenhouse no lo hace seleccionable como line item en HubSpot, cambiar pricing local no propaga, y el operador queda con un catálogo fragmentado que inevitablemente drifta.

Este spec formaliza un **modelo de dos capas** — autoría (5 catálogos fuente) vs distribución (`product_catalog` como anchor único outbound) — conectadas por **reactive materializers** que convierten eventos de los catálogos fuente en upserts al `product_catalog`, y una **proyección outbound `productHubSpotOutbound`** (clonada del patrón de `quotationHubSpotOutbound` TASK-463) que pushea a HubSpot Products via Cloud Run. Completa el loop con drift detection nocturno, archival semántico (no delete), field authority con Greenhouse como owner estricto, y policy enforcement que bloquea la creación de productos directamente en HubSpot.

Es un programa complementario al de Commercial Party Lifecycle (TASK-534): mientras ese formaliza el **quién** (la party que recibe la cotización), este formaliza el **qué** (el catálogo de lo que se cotiza). Juntos cierran el loop quote-to-HubSpot end-to-end.

---

## 2. Problema que este spec resuelve

### 2.1 Síntoma reportado (operación, 2026-04-20)

- Al crear un role nuevo (`sellable_roles`), no aparece como opción en HubSpot Deals/Quotes como line item.
- Al ajustar pricing de una tool (`tool_catalog`), HubSpot no se entera.
- Al deactivar un overhead addon, sigue apareciendo en HubSpot y en quotes nuevas se puede seleccionar por error.
- El operador no tiene claridad de qué productos de HubSpot son gestionados por Greenhouse y cuáles son huérfanos creados manualmente.

### 2.2 Causa raíz arquitectónica

Cinco catálogos fuente existen como tablas canónicas maduras (cada una con SKU propio, governance, cost basis, versioning), pero ninguno tiene un hook reactivo que sincronice su estado al `product_catalog`. El `product_catalog` a su vez tiene `hubspot_product_id` y `sync_status` pero nunca se popula desde los catálogos fuente — solo se popula manualmente via `create-hubspot-product.ts` o por import HubSpot → Greenhouse. No hay proyección reactiva análoga a `quotationHubSpotOutbound` que cierre el loop.

El resultado es que **`product_catalog` no es realmente el source of truth de distribución** — es un catálogo más, desconectado. Y HubSpot termina siendo una fuente paralela no gestionada.

### 2.3 Impacto de no resolverlo

- **Fricción operativa**: sales selecciona productos incorrectos o desactualizados en HubSpot; quotes llegan con descripciones/precios que no matchean el pricing governance.
- **Dual-write invisible**: alguien edita un producto en HubSpot para "arreglar rápido" y el siguiente sync o push lo sobrescribe, perdiendo el fix.
- **Drift acumulativo**: sin reconciler, cada mes el catálogo HubSpot se aleja más del canónico.
- **Bloqueador de Kortex**: la plataforma paralela de CRM necesita el mismo modelo — sin sync unificado, cada cliente externo replica la fragmentación.
- **Bloqueador de reporting**: revenue attribution por producto/role/tool es imposible si HubSpot tiene productos no mapeados.
- **Bloqueador de TASK-474 (Quote Builder Catalog Reconnection)**: el reconnection no puede asumir coherencia si el catalog HubSpot drifta.

---

## 3. Scope y non-goals

### 3.1 In scope

- Modelo conceptual de dos capas: autoría vs distribución.
- Extender `product_catalog` con `source_kind` + `source_id` + FK a cualquiera de las 5 fuentes.
- Materializers reactivos desde los 4 source catalogs (roles, tools, overheads, services) hacia `product_catalog`.
- Proyección outbound `productHubSpotOutbound` que consume eventos de `product_catalog` y pushea a HubSpot.
- Extensión del Cloud Run `hubspot-greenhouse-integration` con `POST /products`, `PATCH /products/:id`, `POST /products/:id/archive`.
- Archival semántico (no hard delete) con preservación de quotes históricas.
- Drift detection nocturno + tabla `product_sync_conflicts` + Admin Center surface.
- Field authority table (Greenhouse owns pricing/description/code; HubSpot owns product ID interno).
- Policy enforcement strict: productos nacen en Greenhouse, no en HubSpot.
- Feature flags por source catalog para rollout incremental.
- Runbook operacional de reconciliation manual.

### 3.2 Non-goals

- **No** se recrean los catálogos fuente — cada uno (roles, tools, overheads, services) mantiene su modelo, sus reglas de pricing, su governance.
- **No** se migra el anchor de distribución a una tabla nueva; `product_catalog` sigue siendo la capa outbound.
- **No** se resuelve el contrato de **line items** end-to-end — `quotation_line_items` ya referencia `product_id` y eso sigue igual. Se valida que funcione tras el enrollment de todos los sources, nada más.
- **No** se cubre sync bi-direccional de campos owned por HubSpot (product internal id, created_at HubSpot).
- **No** se aborda contratos multi-portal HubSpot (misma open question que TASK-534 §12).
- **No** se cubre pricing discovery o product recommendation (fuera de alcance — está en roadmap de Nexa).
- **No** se migra la nomenclatura de SKU existentes — ECG/ETG/EFO/EFG/PRD se mantienen.

---

## 4. Modelo conceptual

### 4.1 Dos capas: autoría vs distribución

```
┌──────────────────────────────────────┐        ┌──────────────────────────────────┐
│         AUTORÍA (internal)           │        │    DISTRIBUCIÓN (HubSpot face)   │
│  ──────────────────────────────────  │        │  ──────────────────────────────  │
│                                      │        │                                  │
│  sellable_roles       (ECG-xxx)  ───┐│        │                                  │
│  tool_catalog         (ETG-xxx)  ───┤│        │                                  │
│  overhead_addons      (EFO-xxx)  ───┼┼──────→ │   product_catalog (PRD-xxx)      │
│  service_pricing      (EFG-xxx)  ───┤│        │   (single outbound anchor)       │
│  [manual products]    (PRD-xxx)  ───┘│        │                                  │
│                                      │        │              │                   │
│  Responsabilidad:                    │        │              │                   │
│  - pricing governance                │        │              ▼                   │
│  - cost basis                        │        │    HubSpot Products ──→ Line     │
│  - versioning                        │        │    (custom prop: gh_product_code)│
│  - capacity model                    │        │                                  │
│  - margin tiers                      │        │    Responsabilidad:              │
│                                      │        │    - sales UX (autocomplete)     │
│                                      │        │    - deal/quote line items       │
│                                      │        │    - reporting HubSpot           │
└──────────────────────────────────────┘        └──────────────────────────────────┘
```

La capa de autoría es **donde se piensa**: qué roles existen, cuánto cuestan, qué tiers, qué governance. La capa de distribución es **donde se vende**: qué cosas aparecen en HubSpot como seleccionables.

La separación permite:
- Roles/tools pueden existir en Greenhouse sin exponerse a HubSpot (internal tools, roles de shadow staffing).
- Un mismo source puede proyectarse a múltiples products si hay variantes (un role con 3 tiers = 3 products).
- La governance interna (TASK-464, TASK-467, TASK-470) no se contamina con lógica HubSpot.

### 4.2 Reglas de materialización

| Source catalog | Cuándo crear product_catalog row | Product code | Archival trigger |
|---|---|---|---|
| `sellable_roles` (ECG) | Al crear role activo | `product_code = role.sku` (ECG-xxx) | `role.active=false` |
| `tool_catalog` (ETG) | Al crear tool activa con `sellable=true` | `product_code = tool.tool_sku` (ETG-xxx) | `tool.active=false` o `sellable=false` |
| `overhead_addons` (EFO) | Al crear addon con `visibleToClient=true` | `product_code = addon.addon_sku` (EFO-xxx) | `addon.active=false` o `visibleToClient=false` |
| `service_pricing` (EFG) | Al crear service_pricing active | `product_code = service.service_sku` (EFG-xxx) | `service.active=false` |
| Manual (PRD) | Creación directa desde Admin Center | `product_code = manual.PRD-xxx` | Admin action |

**Regla clave**: `product_code` es el **business key estable** — independiente de `hubspot_product_id` (asignado por HubSpot). Si HubSpot pierde un product y lo recrea, el sync lo re-asocia vía `gh_product_code` custom property.

### 4.3 Relaciones

```
product_catalog
├── product_id (PK, PRD-xxx internal)
├── source_kind      ← NUEVO: 'sellable_role' | 'tool' | 'overhead_addon' | 'service' | 'manual'
├── source_id        ← NUEVO: role_id | tool_id | addon_id | pricing_id | null
├── product_code     ← business key (ECG/ETG/EFO/EFG/PRD-xxx)
├── hubspot_product_id
├── sync_status
├── sync_direction   ← 'greenhouse_only' por default post-spec
├── is_archived      ← NUEVO: soft-archive flag
├── archived_at
└── ...
```

**Constraint**: `UNIQUE(source_kind, source_id)` donde `source_id IS NOT NULL` — previene doble-materialización. `product_code` también UNIQUE globalmente.

### 4.4 Un source, múltiples products (variantes)

Caso que el modelo debe soportar: un role con 3 tiers puede querer 3 HubSpot products separados (Senior Consultant $X, Mid $Y, Junior $Z). Opciones:

- **Opción A (recomendada)**: 1 product_catalog row por `(source_kind, source_id)`. Si hay variantes, se crean rows adicionales con `source_kind='sellable_role_variant'` y `source_id=role_id` + `variant_key='tier_senior'`. `product_code` compuesto: `ECG-xxx-SR`.
- **Opción B**: 1 product_catalog row representa "el role" y HubSpot tiene un solo product con pricing tiers (HubSpot lo soporta parcialmente).

Opción A es más extensible y mapea 1:1 con cómo HubSpot modela productos. Opción B requiere menos rows pero acopla el variant management a HubSpot.

**Decisión**: ir con A. Los variants nacen en TASK-547 (Fase B), no ahora.

---

## 5. Contrato de datos

### 5.1 Extensión de `product_catalog`

```sql
ALTER TABLE greenhouse_commercial.product_catalog
  ADD COLUMN source_kind TEXT
    CHECK (source_kind IN (
      'sellable_role',
      'sellable_role_variant',
      'tool',
      'overhead_addon',
      'service',
      'manual',
      'hubspot_imported'  -- para orphans adoptados
    )),
  ADD COLUMN source_id TEXT,         -- id canónico de la fuente; null si source='manual'
  ADD COLUMN source_variant_key TEXT, -- para variantes
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN archived_by TEXT,
  ADD COLUMN last_outbound_sync_at TIMESTAMPTZ,
  ADD COLUMN last_drift_check_at TIMESTAMPTZ,
  ADD COLUMN gh_owned_fields_checksum TEXT; -- para drift detection eficiente

-- Constraints
ALTER TABLE greenhouse_commercial.product_catalog
  ADD CONSTRAINT uq_product_catalog_source UNIQUE (source_kind, source_id, source_variant_key)
    WHERE source_kind IS NOT NULL AND source_kind <> 'manual';

-- Index para search por source
CREATE INDEX idx_product_catalog_source ON greenhouse_commercial.product_catalog (source_kind, source_id) WHERE source_kind IS NOT NULL;
CREATE INDEX idx_product_catalog_archived ON greenhouse_commercial.product_catalog (is_archived) WHERE is_archived = FALSE;
```

### 5.2 Tabla de conflictos

```sql
CREATE TABLE greenhouse_commercial.product_sync_conflicts (
  conflict_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES greenhouse_commercial.product_catalog(product_id),
  hubspot_product_id TEXT,
  conflict_type TEXT NOT NULL
    CHECK (conflict_type IN (
      'orphan_in_hubspot',       -- existe en HubSpot, no en Greenhouse
      'orphan_in_greenhouse',    -- existe en Greenhouse, no en HubSpot
      'field_drift',             -- ambos existen, campos divergen
      'sku_collision',           -- mismo product_code en dos rows
      'archive_mismatch'         -- archived state divergent
    )),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conflicting_fields JSONB,
  resolution_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (resolution_status IN ('pending', 'resolved_greenhouse_wins', 'resolved_hubspot_wins', 'ignored')),
  resolution_applied_at TIMESTAMPTZ,
  resolved_by TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_product_sync_conflicts_unresolved ON greenhouse_commercial.product_sync_conflicts (detected_at DESC) WHERE resolution_status = 'pending';
```

### 5.3 Contrato de `source_kind` y `source_id`

| `source_kind` | `source_id` apunta a | Event trigger (al materializar) |
|---|---|---|
| `sellable_role` | `greenhouse_commercial.sellable_roles.role_id` | `commercial.sellable_role.{created,updated,deactivated}` |
| `tool` | `greenhouse_ai.tool_catalog.tool_id` | `commercial.tool.{created,updated,deactivated}` |
| `overhead_addon` | `greenhouse_commercial.overhead_addons.addon_id` | `commercial.overhead_addon.{created,updated,deactivated}` |
| `service` | `greenhouse_commercial.service_pricing.pricing_id` | `commercial.service.{created,updated,deactivated}` |
| `manual` | null | Admin action direct |
| `hubspot_imported` | null | Import from HubSpot orphan |

---

## 6. Materializers reactivos (source → product_catalog)

### 6.1 Patrón

Cada source catalog emite eventos canónicos al outbox en create/update/deactivate. Un materializer único `sourceToProductCatalog` los consume y upserte la fila correspondiente en `product_catalog`.

```typescript
// src/lib/sync/projections/source-to-product-catalog.ts
export const sourceToProductCatalogProjection = registerProjection({
  name: 'source_to_product_catalog',
  domain: 'cost_intelligence',
  events: [
    'commercial.sellable_role.created',
    'commercial.sellable_role.updated',
    'commercial.sellable_role.deactivated',
    'commercial.tool.created',
    'commercial.tool.updated',
    'commercial.tool.deactivated',
    'commercial.overhead_addon.created',
    'commercial.overhead_addon.updated',
    'commercial.overhead_addon.deactivated',
    'commercial.service.created',
    'commercial.service.updated',
    'commercial.service.deactivated',
  ],
  consumer: async (event, { tx }) => {
    const handler = resolveSourceHandler(event.eventType);
    const payload = handler.extract(event);
    await upsertProductCatalogFromSource(tx, payload);
  },
});
```

### 6.2 Handlers por source

Cada source tiene un handler dedicado que traduce su shape interno al contrato común de `product_catalog`:

```typescript
// src/lib/sync/handlers/sellable-role-to-product.ts
export const sellableRoleHandler = {
  extract(event) {
    const role = event.payload;
    return {
      sourceKind: 'sellable_role',
      sourceId: role.roleId,
      productCode: role.sku,            // ECG-xxx
      productName: role.roleName,
      productType: 'service',
      pricingModel: 'staff_aug',
      defaultUnit: 'hour',
      defaultUnitPrice: role.defaultBillRateUsd,
      defaultCurrency: 'USD',
      description: role.description,
      businessLineCode: role.defaultBusinessLine,
      isArchived: !role.active,
    };
  },
};
```

Handlers análogos para tool, overhead_addon, service.

### 6.3 Invariantes del materializer

1. **Idempotencia**: correr el mismo event dos veces es no-op si nada cambió.
2. **Atomic**: upsert + emit outbox evento `commercial.product_catalog.{created,updated,archived}` en la misma transacción.
3. **Field ownership**: solo escribe campos owned por el source; no toca `hubspot_product_id`, `sync_status`, campos de archival manual.
4. **No cascade delete**: un source deactivation archiva el product, no lo borra.
5. **Variant spawn**: si el source emite metadata de variants (tiers, currencies), el handler decide si crea rows adicionales.

### 6.4 Eventos que debe emitir cada source catalog

| Source | Eventos hoy | Eventos a agregar |
|---|---|---|
| `sellable_roles` | parcial (pricing, cost changes) | `.created`, `.updated`, `.deactivated` explícitos con payload canónico |
| `tool_catalog` | parcial | igual |
| `overhead_addons` | parcial | igual |
| `service_pricing` | sí (TASK-465 done) | validar que coincidan contrato |
| Manual | ya emite | `.created`, `.updated`, `.archived` |

Sub-task de la Fase B: auditar y homogeneizar los eventos de cada source para que el materializer consuma un contrato único.

---

## 7. Proyección outbound (product_catalog → HubSpot)

### 7.1 Patrón (clonado de `quotationHubSpotOutbound`)

```typescript
// src/lib/sync/projections/product-hubspot-outbound.ts
export const productHubSpotOutboundProjection = registerProjection({
  name: 'product_hubspot_outbound',
  domain: 'cost_intelligence',
  events: [
    'commercial.product_catalog.created',
    'commercial.product_catalog.updated',
    'commercial.product_catalog.archived',
    'commercial.product_catalog.unarchived',
  ],
  consumer: async (event, { tx }) => {
    const product = await getProductById(tx, event.payload.productId);
    if (product.syncDirection === 'greenhouse_only' || product.syncDirection === 'bidirectional') {
      await pushProductToHubSpot(product, { eventType: event.eventType });
    }
  },
});
```

### 7.2 Lógica de push

```
event type                   → HubSpot action
──────────────────────────────────────────────────
product_catalog.created      → POST /products (si no existe hubspot_product_id)
product_catalog.updated      → PATCH /products/:hubspot_product_id
product_catalog.archived     → POST /products/:hubspot_product_id/archive
product_catalog.unarchived   → PATCH /products/:hubspot_product_id (active=true)
```

Idempotencia: si `hubspot_product_id` ya existe en un `.created`, degrada a `.updated`. Si no existe en `.updated`, crea.

### 7.3 Anti-ping-pong

Igual que TASK-540: marcar `gh_last_write_at` custom property en HubSpot en cada outbound. El inbound sync skipea si Greenhouse escribió en los últimos 60s.

### 7.4 Resultados

Cada push emite un evento de resultado:

- `commercial.product_catalog.hubspot_synced_out` (éxito)
- `commercial.product_catalog.hubspot_sync_failed` (error — retry con exponential backoff; tras 5 fallos → DLQ + alert)

### 7.5 Payload contract al Cloud Run

```typescript
type PushProductPayload = {
  productId: string;
  productCode: string;        // ECG-xxx, ETG-xxx, etc.
  productName: string;
  productType: string;
  description?: string;
  defaultPrice: number;
  defaultCurrency: 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN';
  defaultUnit: 'hour' | 'month' | 'unit' | 'project';
  businessLine?: string;
  sourceKind: string;          // para tagging en HubSpot
  ghProductCode: string;       // custom property estable
  ghLastWriteAt: string;       // ISO timestamp
  isArchived: boolean;
  existingHubspotProductId?: string; // si ya conocido
};
```

---

## 8. Cloud Run integration endpoints

### 8.1 Nuevos endpoints en `hubspot-greenhouse-integration`

| Method | Path | Propósito |
|---|---|---|
| `POST` | `/products` | Crear product en HubSpot. Retorna `{ hubspotProductId, createdAt }` |
| `PATCH` | `/products/:hubspotProductId` | Update fields. Retorna `{ hubspotProductId, updatedFields }` |
| `POST` | `/products/:hubspotProductId/archive` | Archive (active=false). Retorna `{ hubspotProductId, archivedAt }` |
| `GET` | `/products/reconcile` | Batch snapshot de products en HubSpot (para drift cron). Retorna todos los products con custom props `gh_product_code`, `gh_last_write_at` |

### 8.2 Custom properties HubSpot obligatorias

Creadas idempotentemente por script (usar skill `hubspot-ops`):

- `gh_product_code` (TEXT) — SKU canónico Greenhouse (ECG/ETG/EFO/EFG/PRD-xxx)
- `gh_source_kind` (TEXT) — para analytics en HubSpot side
- `gh_last_write_at` (TIMESTAMP) — anti-ping-pong
- `gh_business_line` (TEXT) — BU code
- `gh_archived_by_greenhouse` (BOOL) — útil en filtered views

### 8.3 Rate limiting y retry

- HubSpot API limit: 100 req/10s por portal. El Cloud Run implementa bucket + exponential backoff.
- Batch operations: usar HubSpot batch API (`POST /products/batch/create`) cuando el outbound procese >5 events simultáneos.

---

## 9. Line items resolution (ya funciona, validación)

El contrato actual (`quotation_line_items.product_id` FK a `product_catalog`) no cambia. El push de quote a HubSpot:

1. Lee line items canónicas con `product_id`.
2. Por cada line, resuelve `product_id → hubspot_product_id` via join.
3. Si `hubspot_product_id IS NULL`, **bloquea el push** y emite `commercial.quotation.hubspot_sync_blocked` con razón `missing_product_sync`. Esto fuerza resolución antes de push.
4. HubSpot crea line item con reference al product.

**Nuevo guard**: si `product.is_archived=true`, bloquear también — no se pueden cotizar productos archivados. El quote builder debe impedirlo UI-side también.

---

## 10. Drift detection y reconciliation

### 10.1 Cron nocturno

```
schedule: 0 3 * * *  America/Santiago
endpoint: ops-worker /product-catalog/drift-detect
```

Steps:

1. Fetch snapshot completo de products HubSpot via `GET /products/reconcile`.
2. Cross-join con `product_catalog` local.
3. Detectar:
   - **Orphans en HubSpot**: products en HubSpot sin `gh_product_code` o con `gh_product_code` no matcheable en Greenhouse.
   - **Orphans en Greenhouse**: products activos en Greenhouse sin `hubspot_product_id` o con id no matcheable.
   - **Field drift**: ambos existen, pero `name/price/description/archived` difieren.
   - **SKU collision**: dos rows en Greenhouse con mismo `product_code` (bug).
4. Insertar rows en `product_sync_conflicts`.
5. Alert si >10 conflicts detectados en 24h o >3 `sku_collision` sin resolver.
6. Si `GET /products/reconcile` responde `404`, registrar el run como degradado/cancelled, actualizar `last_drift_check_at` local y no crear conflicts falsos.

### 10.2 Resolution policies

| Conflict type | Default action | Operator override |
|---|---|---|
| `orphan_in_hubspot` | Alert; operador decide adoptar (materializar como `source_kind='hubspot_imported'`) o archivar en HubSpot | Admin Center CTA |
| `orphan_in_greenhouse` | Re-trigger outbound automático (self-healing) | Admin Center retry button |
| `field_drift` | Greenhouse wins (owner de pricing/name/description); re-push | Admin Center "accept HubSpot value" (exception) |
| `sku_collision` | Bloquear outbound de ambos; alert P0 (es bug) | Manual fix |
| `archive_mismatch` | Greenhouse state wins | Admin override con razón |

### 10.3 Auto-heal vs manual

**Auto-heal** (`orphan_in_greenhouse`, `field_drift` con Greenhouse win): el cron puede disparar re-push automático si el conflict persiste > 2 iteraciones y no hay intervención.

**Manual obligatorio** (`orphan_in_hubspot`, `sku_collision`): requieren operador; el auto-heal es peligroso porque puede borrar data legítima.

---

## 11. Governance y field authority

### 11.1 Field authority table

```typescript
const PRODUCT_FIELD_AUTHORITY: Record<string, FieldOwnerRule> = {
  product_code:        () => 'greenhouse',  // inmutable post-create
  product_name:        () => 'greenhouse',
  description:         () => 'greenhouse',
  default_unit_price:  () => 'greenhouse',
  default_currency:    () => 'greenhouse',
  default_unit:        () => 'greenhouse',
  product_type:        () => 'greenhouse',
  pricing_model:       () => 'greenhouse',
  business_line_code:  () => 'greenhouse',
  is_archived:         () => 'greenhouse',
  hubspot_product_id:  () => 'hubspot',     // HubSpot assigns internal id
  hubspot_created_at:  () => 'hubspot',
};
```

Cualquier cambio en HubSpot a fields owned por Greenhouse es **rollback automático** en el próximo reconciler.

### 11.2 Autorización

| Acción | Capability |
|---|---|
| Crear product manual | `commercial.product_catalog.create_manual` (default: `efeonce_admin`, `finance_admin`) |
| Editar product (cualquier source) | `commercial.product_catalog.edit` (default: `finance_admin`, `commercial_admin`) |
| Archivar product | `commercial.product_catalog.archive` |
| Adoptar orphan HubSpot | `commercial.product_catalog.adopt_orphan` (default: `efeonce_admin`) |
| Resolver conflict manualmente | `commercial.product_catalog.resolve_conflict` |

### 11.3 Audit trail

Toda escritura queda en `pricing_catalog_audit_log` (ya existe, TASK-467) con `entity_type='product_catalog'` + correlation_id si es parte de un materializer chain.

### 11.4 Policy: strict Greenhouse-origin

Decisión cerrada en este spec:

- **Productos nacen en Greenhouse, no en HubSpot**.
- El inbound sync de products queda **deprecado** tras el rollout (sigue corriendo en read-only para detección de orphans, pero no crea rows en `product_catalog` automáticamente).
- Orphans detectados en HubSpot: admin tiene 2 opciones — adoptar (materializar como `hubspot_imported` + promover a uno de los sources si aplica) o borrar en HubSpot.
- **No** se permite `sync_direction='hubspot_only'` nuevo (se mantiene para legacy rows durante migration; post-cleanup se remueve el valor enum).

---

## 12. Migración y rollout (5 fases)

### Fase A — Schema extension + materializer foundation

- Migración DDL sobre `product_catalog` (columnas nuevas, constraints, indexes).
- Tabla `product_sync_conflicts`.
- Scaffolding del materializer `sourceToProductCatalog` (sin handlers aún).
- Script de backfill de `source_kind`/`source_id` para rows actuales (heurística por `product_code` prefix).
- Feature flag `GREENHOUSE_PRODUCT_CATALOG_UNIFIED` off.

### Fase B — Source handlers + event homogenization

- Auditoría de eventos emitidos por cada source catalog.
- Normalizar contrato de eventos `commercial.{sellable_role,tool,overhead_addon,service}.{created,updated,deactivated}`.
- Handlers por source + tests unitarios exhaustivos.
- Activar materializer en domain `cost_intelligence`.
- Rollout por source: primero roles, después tools, después overheads, después services (cada uno detrás de su sub-flag).

### Fase C — Outbound proyección + Cloud Run endpoints

- Cloud Run gana `POST /products`, `PATCH`, `archive`, `GET /reconcile`.
- Custom properties HubSpot creadas via script.
- Proyección `productHubSpotOutbound` registrada.
- Anti-ping-pong guard.
- Tests E2E: crear role → aparece en HubSpot en ≤2 min.

### Fase D — Drift detection + Admin Center

- Cron nocturno + reconciler logic.
- Admin Center surface `/admin/commercial/product-sync-conflicts` con resolution UI.
- Auto-heal para orphans_in_greenhouse y field_drift.
- Alertas Slack ops.
- `pricing_catalog_audit_log` acepta `entity_type='product_catalog'` para auditar resoluciones administrativas.

### Fase E — Policy enforcement + legacy cleanup

- Deprecar inbound auto-adopt de HubSpot products (solo detection, no materialize).
- Remover `sync_direction='hubspot_only'` como valor enum válido.
- Cleanup de feature flags.
- Runbook publicado + doc funcional.
- TASK-474 (Quote Builder Catalog Reconnection) desbloqueada.

---

## 13. Eventos de outbox (extensión del catálogo)

Nuevos eventos canónicos a añadir en `GREENHOUSE_EVENT_CATALOG_V1.md`:

| Event | Domain | Emitido por |
|---|---|---|
| `commercial.product_catalog.created` | `cost_intelligence` | materializer + Admin manual |
| `commercial.product_catalog.updated` | `cost_intelligence` | materializer |
| `commercial.product_catalog.archived` | `cost_intelligence` | materializer + Admin manual |
| `commercial.product_catalog.unarchived` | `cost_intelligence` | Admin manual |
| `commercial.product_catalog.hubspot_synced_out` | `cost_intelligence` | `productHubSpotOutbound` |
| `commercial.product_catalog.hubspot_sync_failed` | `cost_intelligence` | proyección error path |
| `commercial.product_catalog.drift_detected` | `cost_intelligence` | reconciler cron |
| `commercial.product_catalog.conflict_resolved` | `cost_intelligence` | Admin action |
| `commercial.product_catalog.orphan_adopted` | `cost_intelligence` | Admin action |
| `commercial.sellable_role.created/updated/deactivated` | `cost_intelligence` | sellable_roles store (nuevos si no existen) |
| `commercial.tool.created/updated/deactivated` | `cost_intelligence` | tool_catalog store (nuevos si no existen) |
| `commercial.overhead_addon.created/updated/deactivated` | `cost_intelligence` | overhead_addons store (nuevos si no existen) |
| `commercial.service.created/updated/deactivated` | `cost_intelligence` | service_pricing store (validar existentes TASK-465) |

---

## 14. Dependencies & impact

### 14.1 Depende de

- `greenhouse_commercial.product_catalog` (existe, TASK-345)
- `sellable_roles`, `tool_catalog`, `overhead_addons`, `service_pricing` (existen, TASK-464a/b/c/d, TASK-465)
- `hubspot-greenhouse-integration` Cloud Run service
- `quotationHubSpotOutbound` proyección (template, TASK-463 cerrada)
- Outbox + reactive worker

### 14.2 Impacta a

- **TASK-474** (Quote Builder Catalog Reconnection) — desbloquea; post-TASK-534 este sync puede correr coherente
- **TASK-466** (Multi-currency quote output) — sin cambio, ortogonal
- **TASK-467** (Pricing Catalog Admin UI) — Admin Center gana surfaces para product_catalog + conflict resolution
- **TASK-534** (Commercial Party Lifecycle) — complementario; juntos cierran quote-to-HubSpot end-to-end
- **Kortex platform** — desbloquea el modelo unificado para clientes externos
- **Reporting por product/role/tool** — habilita revenue attribution consistente

### 14.3 Archivos que nacerán (para chequeo cruzado de tasks)

- `migrations/YYYYMMDD_task-###-product-catalog-extension.sql`
- `migrations/YYYYMMDD_task-###-product-sync-conflicts-table.sql`
- `src/lib/sync/projections/source-to-product-catalog.ts`
- `src/lib/sync/projections/product-hubspot-outbound.ts`
- `src/lib/sync/handlers/sellable-role-to-product.ts`
- `src/lib/sync/handlers/tool-to-product.ts`
- `src/lib/sync/handlers/overhead-addon-to-product.ts`
- `src/lib/sync/handlers/service-to-product.ts`
- `src/lib/commercial/product-catalog-commands/`
- `src/app/api/admin/commercial/product-sync-conflicts/**`
- `services/hubspot-greenhouse-integration/routes/products.ts` (extensión)
- `scripts/create-hubspot-product-custom-properties.ts`
- `scripts/backfill-product-catalog-source.ts`
- `src/app/(admin)/admin/commercial/product-sync/**`
- `docs/operations/product-catalog-sync-runbook.md`
- `docs/documentation/admin-center/product-catalog-sync.md`

---

## 15. Preguntas abiertas

1. **Variants granularity (§4.4)**: ¿variants se crean on-demand solo si HubSpot los necesita, o siempre que existan tiers en el source? Decisión recomendada: on-demand via flag `export_variants` en el source row. Resolver en Fase B.
2. **Inbound deprecation timing**: ¿cuándo apagar completamente el auto-create inbound? Propuesta: tras 4 semanas de Fase E en production sin issues. Resolver en Fase E.
3. **Pricing snapshot vs live**: HubSpot acepta `price` como campo único por product. Si tenemos pricing efective-dated (TASK-421) con cambios programados, ¿pushamos solo el current o usamos HubSpot custom prop `gh_next_price_at`?
4. **Multi-currency products en HubSpot**: HubSpot Enterprise soporta multi-currency pero requiere tier suficiente. Si no, ¿creamos 1 product por currency (ECG-xxx-USD, ECG-xxx-CLP) o dejamos `default_currency` y que el quote lo convierta?
5. **Archive vs delete en HubSpot**: HubSpot permite delete si no hay line items referencian. ¿Policy conservadora (siempre archive) o pragmática (delete si es posible)? Recomendado: siempre archive.
6. **Service composition complex products**: TASK-465 entregó `service_pricing` con recipes (role + tool). ¿Cómo se expone en HubSpot — un solo product "service" con description del recipe, o un bundle/kit? HubSpot soporta "product bundle" custom. Diferir a Fase B+.
7. **Performance del materializer**: si un cambio masivo en pricing governance (ej. actualización de tier margins) dispara 500 eventos simultáneos → 500 product_catalog upserts → 500 HubSpot pushes = rate limit. ¿Implementar coalescing (de-duplicar eventos en ventana de 30s)? Recomendado: sí, patrón estándar.

---

## 16. Diagrama de flujo end-to-end

```
┌────────────────────────────────────────────────────────────────────────────┐
│ AUTHORING LAYER                                                            │
│                                                                            │
│  sellable_roles  ──┐                                                       │
│  tool_catalog    ──┤ emit events                                           │
│  overhead_addons ──┼──────────────┐                                        │
│  service_pricing ──┤              │                                        │
│  manual products ──┘              │                                        │
│                                   ▼                                        │
│                         ┌───────────────────┐                              │
│                         │ sourceToProduct   │  materializer reactivo       │
│                         │   Catalog         │  (fase A/B)                  │
│                         │   projection      │                              │
│                         └────────┬──────────┘                              │
│                                  │ upsert                                  │
│                                  ▼                                         │
│                         ┌───────────────────┐                              │
│                         │  product_catalog  │  ← single outbound anchor    │
│                         │   (canonical)     │                              │
│                         └────────┬──────────┘                              │
│                                  │ emit commercial.product_catalog.*       │
└──────────────────────────────────┼─────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼─────────────────────────────────────────┐
│ DISTRIBUTION LAYER               │                                         │
│                                  ▼                                         │
│                         ┌───────────────────┐                              │
│                         │ productHubSpot    │  proyección outbound         │
│                         │   Outbound        │  (fase C)                    │
│                         │   projection      │                              │
│                         └────────┬──────────┘                              │
│                                  │ POST/PATCH/archive                      │
│                                  ▼                                         │
│                         ┌───────────────────┐                              │
│                         │ Cloud Run         │  hubspot-greenhouse-         │
│                         │  /products        │    integration (extensión)   │
│                         └────────┬──────────┘                              │
│                                  │                                         │
│                                  ▼                                         │
│                         ┌───────────────────┐                              │
│                         │ HubSpot Products  │  custom property             │
│                         │                   │  gh_product_code (SKU canon) │
│                         └────────┬──────────┘                              │
│                                  │ used as line items                      │
│                                  ▼                                         │
│                         ┌───────────────────┐                              │
│                         │ HubSpot Deals/    │                              │
│                         │  Quotes line items│                              │
│                         └───────────────────┘                              │
│                                                                            │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │ RECONCILER (fase D)                                         │           │
│  │                                                             │           │
│  │  nightly cron → GET /products/reconcile from HubSpot        │           │
│  │  → cross-join with product_catalog                          │           │
│  │  → insert into product_sync_conflicts                       │           │
│  │  → auto-heal where safe; alert ops when manual required     │           │
│  └─────────────────────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 17. Changelog

- **v1.0 — 2026-04-20:** Spec inicial. Define el modelo de dos capas (autoría vs distribución), contratos de materializer reactivo desde 4 source catalogs hacia `product_catalog`, proyección outbound hacia HubSpot vía Cloud Run, drift detection, governance con Greenhouse como owner estricto, y plan de rollout por 5 fases (A-E). Complementa `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` para cerrar el loop quote-to-HubSpot end-to-end (quién + qué).
