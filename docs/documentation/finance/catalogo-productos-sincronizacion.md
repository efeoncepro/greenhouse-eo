# Catálogo de productos — Sincronización automática desde fuentes internas

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-21 por Claude (Opus 4.7) — TASK-546
> **Ultima actualizacion:** 2026-04-21 por Claude
> **Documentacion tecnica:**
> - Task: [TASK-546](../../tasks/complete/TASK-546-product-catalog-source-handlers-events.md)
> - Spec tecnica: [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1](../../architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md)
> - Foundation: [TASK-545 Schema + Materializer Foundation](../../tasks/complete/TASK-545-product-catalog-schema-materializer-foundation.md)
> - Docs relacionadas: [Administración del catálogo de pricing](./administracion-catalogo-pricing.md) · [Pricing comercial](./pricing-comercial.md) · [Cotizador](./cotizador.md)

## Qué problema resuelve

Greenhouse tiene **4 catálogos fuente internos** donde los equipos mantienen las cosas vendibles:

| Catálogo | SKU prefix | Qué contiene |
|---|---|---|
| **Sellable Roles** | `ECG-###` | Roles consultivos facturables (Senior Designer, Tech Lead, etc.) |
| **Tool Catalog** | `ETG-###` | Licencias de herramientas AI revendibles (Figma Pro, Notion, Claude, etc.) |
| **Overhead Addons** | `EFO-###` | Fees adicionales visibles al cliente (soporte 24h, rush fees, etc.) |
| **Service Catalog** | `EFG-###` | Servicios compuestos (recetas de roles + tools + addons) |

Hasta ahora, estos catálogos vivían aislados del **`product_catalog`** (PRD-xxx), que es el único anchor que sincroniza con HubSpot como line items en deals y quotes. Consecuencia: crear un role en Greenhouse no lo hacía seleccionable en HubSpot, y cambiar pricing local no propagaba.

**Ahora** cada vez que creas, editas o desactivas algo en los 4 catálogos fuente, un proceso en background lo **materializa automáticamente** en `product_catalog`, preservando un **snapshot inmutable** con checksum para detectar drift futuro. Es la base para que (en TASK-547) Greenhouse pushee automáticamente a HubSpot.

## Cómo funciona

### El flujo básico

```
1. Alguien crea un Sellable Role → sellable-roles-store emite `commercial.sellable_role.created`
2. El reactive worker (Cloud Run ops-worker) ve el evento
3. Verifica que el sub-flag GREENHOUSE_PRODUCT_SYNC_ROLES esté ON
4. Invoca al handler `sellable-role-to-product`
5. El handler:
   a. Lee la fila fresca de la tabla fuente (sellable_roles + último pricing USD)
   b. Mapea a GhOwnedFieldsSnapshot (10 campos canónicos)
   c. Computa checksum SHA-256 del snapshot
   d. Upsertea en product_catalog con row lock
   e. Decide el outcome: created / updated / archived / unarchived / noop
   f. Emite el evento correspondiente en la misma transacción
```

Todo esto ocurre en ≤30 segundos desde la mutación original.

### Los 4 handlers y sus reglas

#### Sellable Role → Producto

- **Materializa**: siempre que la role tenga `role_sku`
- **product_type**: `service`
- **pricing_model**: `staff_aug`
- **default_unit**: `hour`
- **default_currency**: `USD`
- **default_unit_price**: toma el último `hourly_price` USD de `sellable_role_pricing_currency`
- **Archivado**: cuando `active=false`

#### Tool → Producto

- **Materializa**: solo si `tool_sku IS NOT NULL AND is_active=true` (ésta es la interpretación operativa de "sellable")
- **product_type**: `license`
- **pricing_model**: `fixed`
- **default_unit**: `month`
- **default_currency**: `USD`
- **default_unit_price**: `prorated_price_usd`
- **business_line_code**: primer valor de `applicable_business_lines` (tools pueden aplicar a varias BU; la primera gana como canónica)
- **Archivado**: cuando `is_active=false`

#### Overhead Addon → Producto

- **Materializa**: cuando existe en la tabla
- **product_type**: `service`
- **pricing_model**: `fixed`
- **default_unit**: `unit` por default; mapea `month`/`hour`/`project` si el addon los declara
- **default_currency**: `USD`
- **default_unit_price**: `final_price_usd`
- **Archivado**: cuando `active=false` **OR** `visible_to_client=false`. Esto es importante — un addon marcado como oculto al cliente no debe aparecer como producto vendible, aunque siga activo internamente.

#### Service → Producto

- **Materializa**: cuando la fila de `service_pricing` existe con `service_sku`
- **product_type**: `service`
- **pricing_model**: derivado de `commercial_model`:
  - `on_going`/`on_demand` → `retainer`
  - `hybrid` → `project`
  - `license_consulting` → `fixed`
  - desconocido → `project`
- **default_unit**: `month` si `service_unit='monthly'`, sino `project`
- **default_currency**: `USD`
- **default_unit_price**: **null** (los servicios son compositivos; el precio se resuelve por quote, no por flat price)
- **Archivado**: cuando `active=false`

### Idempotencia y dedup

El helper `upsertProductCatalogFromSource` garantiza:

- Si el mismo evento llega 2 veces, el segundo upsert es **no-op** (checksum no cambió → no se emite evento ni se modifica la fila)
- Lock con `FOR UPDATE` por `(source_kind, source_id, source_variant_key)` evita race conditions entre workers concurrentes
- Transiciones de archivado son **event-only**: archived/unarchived solo se emite cuando el flag `is_archived` cambia, no cuando solo cambia el contenido

### Sub-flags por source

El rollout es **gradual**, una fuente a la vez. Cada handler respeta su propio flag de environment:

| Flag | Controla |
|---|---|
| `GREENHOUSE_PRODUCT_SYNC_ROLES` | Handler de sellable_role |
| `GREENHOUSE_PRODUCT_SYNC_TOOLS` | Handler de tool |
| `GREENHOUSE_PRODUCT_SYNC_OVERHEADS` | Handler de overhead_addon |
| `GREENHOUSE_PRODUCT_SYNC_SERVICES` | Handler de service |

**Default: OFF**. Activar requiere set explícito en Vercel (`true`, `1`, `yes`, o `on`).

Plan de rollout:

1. Staging: encender `ROLES=true`, validar 48h con `product_catalog` + eventos downstream
2. Staging: encender `TOOLS=true`, validar 48h
3. Staging: encender `OVERHEADS=true`, validar 48h
4. Staging: encender `SERVICES=true`, validar 48h
5. Production: replicar flag por flag una vez validado

Si algo falla, se apaga el flag (`false`) y el handler skippea silenciosamente. **No hay rollback de schema necesario** — las filas ya materializadas persisten.

## Eventos emitidos por el materializer

Cada materialización exitosa emite exactamente un evento al outbox:

| Evento | Cuándo se emite | Consumers |
|---|---|---|
| `commercial.product_catalog.created` | Fila nueva en `product_catalog` | TASK-547 (outbound HubSpot), quote builder, reports |
| `commercial.product_catalog.updated` | Fila existente cuyo checksum cambió | TASK-547 (PATCH a HubSpot), drift detector TASK-548 |
| `commercial.product_catalog.archived` | `is_archived` pasó de false a true | TASK-547 (archive en HubSpot), reports |
| `commercial.product_catalog.unarchived` | `is_archived` pasó de true a false | TASK-547 (unarchive), reports |
| *(ninguno)* | Checksum unchanged y archival unchanged → no-op | — |

El payload incluye `productId`, `sourceKind`, `sourceId`, `productCode`, `ghOwnedFieldsChecksum`, y el estado completo del snapshot. TASK-547 consumirá estos eventos para el push a HubSpot.

## Eventos homogéneos en source catalogs

Antes de TASK-546, cada catálogo fuente emitía un set diferente de eventos:

| Source | Antes | Ahora |
|---|---|---|
| sellable_roles | `created`, `cost_updated`, `pricing_updated` | + `deactivated`, `reactivated` |
| tool_catalog | `created`, `updated` | + `deactivated`, `reactivated` |
| overhead_addons | **ninguno** (silent upsert) | `created`, `updated`, `deactivated`, `reactivated` |
| service_pricing | `created`, `updated`, `deactivated` | sin cambios (ya estaba completo) |

Los nuevos lifecycle publishers están expuestos también para que futuros flujos (Admin Center, migraciones, deprecations) los puedan usar directamente:

- `deactivateSellableRole(roleId)` / `reactivateSellableRole(roleId)`
- `deactivateToolCatalogEntry(toolId)` / `reactivateToolCatalogEntry(toolId)`

Los overhead addons ya emiten correctamente desde `upsertOverheadAddonEntry` cuando el upsert detecta transiciones.

## Sincronización automática a HubSpot (Fase C — TASK-547 shipped)

Desde TASK-547, cada evento de lifecycle que emite la materialización (`commercial.product_catalog.{created,updated,archived,unarchived}`) dispara automáticamente un push a HubSpot via el bridge `productHubSpotOutbound`.

### Qué pasa al escribir un producto

1. El materializer de TASK-546 emite un evento con el `productId`.
2. El reactive worker (Cloud Run `ops-worker`) consume el evento, domain `cost_intelligence`.
3. La proyección `productHubSpotOutbound` invoca `pushProductToHubSpot(productId)`.
4. El helper:
   - Lee la fila actual de `product_catalog`.
   - **Anti-ping-pong**: si `hubspot_last_write_at` fue hace menos de 60s, skippea (evita echo de un webhook inbound que llegó justo después de un outbound).
   - Decide la acción según el estado: `create` (sin hubspot_product_id), `update` (con id), `archive` (flag archived + id), `unarchive` (flag false + id), `noop` (archive sin id).
   - Adapta el payload con 5 custom properties Greenhouse (`gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`, `gh_business_line`).
   - Llama al Cloud Run `hubspot-greenhouse-integration`.
   - Persiste el trace: `hubspot_sync_status`, `hubspot_sync_error`, `hubspot_sync_attempt_count`, `last_outbound_sync_at`, `hubspot_last_write_at`, `hubspot_product_id`.
   - Emite `commercial.product.hubspot_synced_out` o `commercial.product.hubspot_sync_failed`.

### Estados de sync

| `hubspot_sync_status` | Significado |
|---|---|
| `NULL` | Nunca intentado (rows pre-TASK-547 o recién creadas sin trigger aún) |
| `synced` | Último push exitoso; HubSpot tiene el estado actual |
| `pending` | Enqueued pero aún no procesado (estado transitorio raro) |
| `failed` | 5xx o error inesperado; retry worker lo reintenta con backoff |
| `endpoint_not_deployed` | El endpoint del Cloud Run aún no existe (patrón TASK-524); trace persiste, retry worker lo recoge cuando shipa |
| `skipped_no_anchors` | Skipped por anti-ping-pong o archive sin hubspot_product_id (no hay acción útil) |

### Los 3 endpoints del Cloud Run

El servicio `hubspot-greenhouse-integration` (repo externo) debe exponer:

- `POST /products` — create (ya deployado).
- `PATCH /products/:hubspotProductId` — update fields respetando field authority.
- `POST /products/:hubspotProductId/archive` — archival; HubSpot marca el product inactive.
- `GET /products/reconcile` — batch read para que TASK-548 (drift) compare checksums.

Los últimos 3 aún no están deployados — el cliente handle 404 como `endpoint_not_deployed` y el retry worker reprocessa cuando shipan.

### 5 custom properties en HubSpot

Crear via runbook `docs/operations/hubspot-custom-properties-products.md` antes de activar el bridge.

| Property | Tipo | Para qué |
|---|---|---|
| `gh_product_code` | string (read-only) | SKU canónico (ECG/ETG/EFO/EFG) para joinear con Greenhouse |
| `gh_source_kind` | enum (read-only) | Catálogo fuente Greenhouse |
| `gh_last_write_at` | datetime (read-only) | Anti-ping-pong timestamp |
| `gh_archived_by_greenhouse` | bool (read-only) | Distingue archival operativo vs manual |
| `gh_business_line` | string | BU owner |

### Guarantees

- **Idempotencia**: llamar al bridge 2 veces con el mismo estado es no-op en HubSpot + refresh del trace.
- **Field authority**: `sanitizeHubSpotProductPayload` (TASK-347 guard) strip 14 campos cost/margin. Greenhouse NUNCA emite internal costing.
- **Atomicidad trace + emit**: el UPDATE del trace y el publishing del outbox event corren en la misma transacción para create path. Update/archive/unarchive usan persist + emit secuencial (no requieren atomicidad porque solo tocan el propio producto).
- **Retry gracioso**: 5xx → reactive worker retry; 404 → persist `endpoint_not_deployed` sin retry (hasta que deploy shipa y el worker de retry lo despierte).

## Qué NO hace esta task (out of scope)

- **TASK-548 (Fase D)**: drift detection cron. Comparar `gh_owned_fields_checksum` con HubSpot + Admin Center para resolution. El cliente `reconcileHubSpotGreenhouseProducts` ya está listo para consumir.
- **TASK-549 (Fase E)**: deprecar inbound auto-adopt + remover flags + drop `sync_direction='hubspot_only'`.
- **Variantes del mismo producto** (sellable_role_variant) — scaffolded en schema pero sin handler.
- **Service bundle en HubSpot** — deferido.
- **Multi-currency variants** — depende de TASK-421. Hoy 1 product en USD por source entity.
- **Batch API HubSpot** (coalescing ≥5 events en ventana 30s) — deferido; requiere cambios cross-projection en el reactive worker.

## Preguntas frecuentes

**¿Qué pasa con las filas existentes de `product_catalog` creadas antes de TASK-546?**

Se quedan tal como están hasta que llegue un evento fresh desde la source correspondiente. El materializer NO re-procesa filas legacy automáticamente. El backfill heurístico de TASK-545 ya clasificó `source_kind`/`source_id` por SKU prefix, así que cuando llegue el primer evento update/pricing/deactivate, el handler las encontrará por lock.

**¿Qué pasa si cambio el pricing de un role varias veces seguidas?**

Cada cambio emite `commercial.sellable_role.pricing_updated`, el materializer recomputa el snapshot, y emite `commercial.product_catalog.updated` solo si el checksum cambió. Si actualizas 10 veces con el mismo precio, solo una mutación llega a HubSpot.

**¿Se puede forzar un re-materialize de todos los productos?**

Hoy no hay CLI específico; la foundation de TASK-545 incluye `scripts/backfill-product-catalog-source.ts` con `--force` para la clasificación `source_kind`. Para forzar recomputo de snapshots basados en source state, el approach es tocar alguna fila del catálogo fuente (ej. actualizar `updated_at`) para disparar un evento.

**¿Qué pasa con tools marcados como `includes_in_addon=true`?**

Se materializan igual que cualquier tool con `tool_sku + is_active=true`. El flag `includes_in_addon` afecta cómo se agregan al pricing de un quote, no su visibilidad como producto en sí.

**¿Los servicios realmente se materializan sin precio?**

Sí. El `default_unit_price` de servicios es `null` porque son compositivos — el precio se resuelve por quote basado en el recipe + tier + cliente. HubSpot soporta line items sin list price; el AE completa el precio al crear el deal. Esto es consistente con cómo funciona hoy antes de la automatización.

**¿Cómo se entera un operator de que un producto cambió?**

Cada evento `commercial.product_catalog.*` va al outbox. Los consumers descargados (TASK-547 Fase C outbound, TASK-548 Fase D drift detector) van a consumirlos. Para Admin Center hay que esperar a TASK-548 que incluye una UI de resolution para conflicts.

## Limitaciones conocidas (follow-ups)

1. **Admin Center UI** — hoy no hay pantalla para ver/gestionar `product_catalog` con source tracing. Viene en TASK-548.
2. **Per-line tax code / per-variant pricing** — el schema soporta `source_variant_key` pero no hay handler ni publisher para variantes.
3. **Backpressure / coalescing** — si un operator hace bulk edit de 100 roles, se emiten 100 eventos individuales. Coalescing queda para follow-up si aparece performance issue.
4. **Real-time monitoring** — Admin Center conflict dashboard llega con TASK-548.
5. **Multi-currency productos** — hoy todos se materializan en USD. TASK-421 expandirá el pricing multi-currency; el materializer deberá aprender a emitir snapshots en `default_currency` variable por org/BU cuando llegue.

> Detalle tecnico:
> - Upsert helper: [upsert-product-catalog-from-source.ts](../../../src/lib/commercial/product-catalog/upsert-product-catalog-from-source.ts)
> - Handlers: [sync/handlers/](../../../src/lib/sync/handlers/)
> - Readers: [source-readers.ts](../../../src/lib/commercial/product-catalog/source-readers.ts)
> - Flags: [flags.ts](../../../src/lib/commercial/product-catalog/flags.ts)
> - Projection: [source-to-product-catalog.ts](../../../src/lib/sync/projections/source-to-product-catalog.ts)
> - Event catalog: [event-catalog.ts](../../../src/lib/sync/event-catalog.ts)
