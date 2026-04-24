# Product Catalog Sync Runbook

Runbook operativo del loop Greenhouse ↔ HubSpot Products.

Fuente técnica: `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`

## Contract v2 (TASK-603, 2026-04-24)

El outbound GH→HS usa ahora **contract v2** (header `X-Contract-Version: v2`). El middleware acepta v1 sin header para rollback rápido. Fields full-fidelity emitidos en cada push:

| Campo Greenhouse | Campo HubSpot | SoT | Notas |
|---|---|---|---|
| `pricesByCurrency.{CLP,USD,CLF,COP,MXN,PEN}` | `hs_price_*` | GH | 6 monedas siempre presentes; NULL = borra en HS |
| `descriptionRichHtml` | `hs_rich_text_description` | GH | Whitelist `<p>,<strong>,<em>,<ul>,<ol>,<li>,<a href>,<br>`; JS stripped |
| `description` (plain, derivado) | `description` | GH | Si operador no provee, se deriva de rich HTML |
| `productType` | `hs_product_type` | GH | `service`/`inventory`/`non_inventory` — desde `source_kind` o operador override |
| `pricingModel` | `hs_pricing_model` | GH | Siempre `flat` en Fase 1 |
| `productClassification` | `hs_product_classification` | GH | Siempre `standalone` en Fase 1 |
| `bundleType` | `hs_bundle_type` | GH | Siempre `none` en Fase 1 |
| `categoryCode` (HS option value) | `categoria_de_item` | GH | Resuelto via ref table |
| `unitCode` (HS option value) | `unidad` | GH | Resuelto via ref table |
| `taxCategoryCode` (HS option value) | `hs_tax_category` | GH | Resuelto via ref table |
| `isRecurring` | `hs_recurring` | GH | — |
| `recurringBillingFrequency` | `recurringbillingfrequency` | GH | — |
| `recurringBillingPeriodCode` | `hs_recurring_billing_period` | GH | ISO 8601 duration |
| `commercialOwnerEmail` (fallback) + `hubspotOwnerId` (directo) | `hubspot_owner_id` | GH (soft) | TASK-604 flipea a HS-wins inicial |
| `marketingUrl` | `hs_url` | GH | — |
| `imageUrls` (array) | `hs_images` | GH | Semicolon-joined en middleware |
| `costOfGoodsSold` | `hs_cost_of_goods_sold` | GH | **Desbloqueado por TASK-603** |
| `gh_*` (5 custom) | `gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`, `gh_business_line` | GH | Read-only en HS (TASK-563) |

### Governance de costos

- **COGS (TASK-603)**: ALLOWED outbound. `hs_cost_of_goods_sold` se emite siempre que GH lo tenga. Decisión explícita para reporting HS.
- **Margin (permanente)**: BLOCKED. El guard `hubspot-outbound-guard.ts` rechaza con `HubSpotCostFieldLeakError` si alguien intenta enviar `marginPct`, `targetMarginPct`, `floorMarginPct`, `effectiveMarginPct`.
- **Cost breakdown (permanente)**: BLOCKED. Mismo guard rechaza `costBreakdown` / `cost_breakdown`.

### Rollback

Si v2 rompe staging/prod, revertir el middleware a la revisión previa (`gcloud run services update-traffic hubspot-greenhouse-integration ... --to-revisions=PREVIOUS=100`). El TS del portal seguirá enviando header v2, pero el middleware sin logic v2 rechaza con 400 → eventos `commercial.product.hubspot_sync_failed` quedan loggeados sin corromper HS.

Para desactivar v2 desde el TS sin redeploy, editar `src/lib/integrations/hubspot-greenhouse-service.ts` y remover `'X-Contract-Version': 'v2'` del `buildWriteServiceHeaders` call en `create/updateHubSpotGreenhouseProduct`. Middleware cae en path v1.

## Componentes

- materializer local: `source-to-product-catalog`
- outbound HubSpot: `productHubSpotOutbound`
- drift detector: `POST /product-catalog/drift-detect` en `ops-worker`
- surface admin: `/admin/commercial/product-sync-conflicts`

## Scheduler canónico

- job: `ops-product-catalog-drift-detect`
- schedule: `0 3 * * *`
- timezone: `America/Santiago`

## Señales normales

- `source_sync_runs.source_system = 'product_catalog_drift_detect'`
- rows `pending` o `resolved_*` en `greenhouse_commercial.product_sync_conflicts`
- eventos `commercial.product_sync_conflict.detected` y `.resolved`

## Diagnóstico rápido

1. Verificar si hubo corrida:
   - revisar `source_sync_runs` por `source_system='product_catalog_drift_detect'`
2. Si el run quedó `cancelled`:
   - validar si `GET /products/reconcile` sigue `endpoint_not_deployed`
3. Si hay conflictos nuevos:
   - abrir `/admin/commercial/product-sync-conflicts`
   - priorizar `sku_collision` y `orphan_in_hubspot`
4. Si el outbound no converge:
   - revisar `hubspot_sync_status`, `hubspot_sync_error`, `hubspot_sync_attempt_count`
5. Si el catálogo local no refleja las fuentes Greenhouse:
   - correr `pnpm product-catalog:materialize-and-sync`
   - el comando rematerializa `sellable_roles`, `tool_catalog`, `overhead_addons` y `service_pricing`, promueve survivors legacy por `legacy_sku = product_code`, y luego empuja/bindea hacia HubSpot

## Respuesta recomendada por conflicto

- `orphan_in_hubspot`
  En products, NO adoptar a Greenhouse. Si no existe match exacto contra un `product_code` canónico Greenhouse, tratarlo como legacy a archivar/limpiar en HubSpot.
- `orphan_in_greenhouse`
  Reintentar `Reenviar estado Greenhouse`.
- `field_drift`
  Mantener Greenhouse si el catálogo local es autoritativo; aceptar HubSpot solo para `manual` o `hubspot_imported`.
- `sku_collision`
  Tratar como bug estructural; limpiar catálogo antes de reactivar pushes.
- `archive_mismatch`
  Confirmar el estado correcto y reaplicar desde la superficie admin.

## Alertas

- Slack si se detectan más de `10` conflictos en 24h
- Slack si hay más de `3` `sku_collision` sin resolver

## Comandos útiles

```bash
# Rematerializar el canon Greenhouse-first y sincronizarlo hacia HubSpot
pnpm product-catalog:materialize-and-sync

# TypeScript
pnpm exec tsc --noEmit --pretty false

# Tests focales del detector/admin
pnpm exec vitest run \
  src/lib/commercial/product-catalog/drift-reconciler.test.ts \
  src/app/api/admin/commercial/product-sync-conflicts/route.test.ts \
  'src/app/api/admin/commercial/product-sync-conflicts/[conflictId]/resolve/route.test.ts'

# Smoke E2E inicial outbound (TASK-563)
pnpm tsx scripts/e2e-product-hubspot-outbound.ts
```

## Smoke staging

- Reporte operativo: `docs/operations/product-hubspot-outbound-e2e-report.md`
- El smoke actual cubre `create -> update -> archive` vía staging + sandbox.
- Batch multi-product sigue deferido hasta que el worker reactive soporte algo más que coalescing por scope.

## Escalación

- si el servicio externo no expone `/products/reconcile`, escalar al repo `hubspot-greenhouse-integration`
- si reaparece un `hubspot_imported` sin source Greenhouse, tratarlo como deuda legacy del cutover; no reactivar el carril de adopción automática
- si aparecen colisiones de SKU repetidas, abrir issue de higiene del catálogo comercial
- si una resolución admin no deja audit trail, tratarlo como incidente del lane de governance

---

## Admin UI operativa (TASK-605, 2026-04-24)

Superficie `/admin/commercial/product-catalog` (capability `administracion.product_catalog` + fallback a `routeGroups.includes('admin')`).

### List view

Tabla con los 74 productos + search global SKU/name + filtros: source kind, archived, drift. Click en fila → detail view. El indicador "N drift" muestra el número de campos con drift v2 detectado en el último scan.

### Detail view (secciones)

- **Identidad**: name, description plain, description rich HTML (whitelist `<p>,<strong>,<em>,<ul>,<ol>,<li>,<a href>,<br>`), marketing URL, image URLs (una por línea).
- **Clasificación**: `hubspot_product_type_code` (service/inventory/non_inventory), categoría, unidad, tax category. `pricing_model`, `classification`, `bundle_type` son fijos por Fase 1 (`flat`, `standalone`, `none`).
- **Precios**: input por cada moneda canónica (CLP/USD/CLF/COP/MXN/PEN). Ingresar precio → marca autoritativo (source `gh_admin`) + auto-recompute de las 5 derivadas vía FX.
- **Recurrencia**: toggle `is_recurring` + frequency + period ISO.
- **Metadatos**: owner (member_id), `owner_gh_authoritative` toggle, archivado, timestamps (read-only).

### Manual sync

Botón **"Sincronizar a HubSpot"** en header → POST `/api/admin/commercial/products/[id]/sync` → `pushProductToHubSpot` síncrono → resultado inline (action + hubspotProductId o error).

### API endpoints disponibles

- `GET  /api/admin/commercial/products` — list
- `GET  /api/admin/commercial/products/[id]` — detail
- `PATCH /api/admin/commercial/products/[id]` — update catalog fields
- `PUT  /api/admin/commercial/products/[id]/prices` — bulk set authoritative prices
- `POST /api/admin/commercial/products/[id]/sync` — trigger manual outbound

## Backfill masivo (TASK-605 Slice 5)

Script idempotente `scripts/backfill/product-catalog-hs-v2.ts`:

```bash
# Dry-run (default): muestra qué sincronizaría, no escribe
pnpm tsx scripts/backfill/product-catalog-hs-v2.ts

# Apply: ejecuta pushProductToHubSpot por cada producto
pnpm tsx scripts/backfill/product-catalog-hs-v2.ts --apply
```

Output: reporte Markdown en `docs/operations/backfill-product-catalog-hs-v2-YYYYMMDD.md` con per-product action (created/updated/skipped/failed) + hubspotProductId + error detail.

**Cuándo correrlo**:

- One-shot inicial post-TASK-605 deploy para poblar los 16 fields v2 + COGS en los 74 productos HS.
- Re-run selectivo si se detecta stale data después de una interrupción del pipeline reactivo.
- Idempotencia: `pushProductToHubSpot` tiene anti-ping-pong 60s + HS PATCH es idempotente. Re-correr N veces converge.

## Governance de COGS (TASK-603)

TASK-347 originalmente bloqueaba todos los cost fields outbound. **TASK-603 lo acotó**:

- ✅ **ALLOWED outbound**: `cost_of_goods_sold` → `hs_cost_of_goods_sold`. Decisión explícita de gobierno: COGS es atributo de producto (aceptable en CRM para reporting).
- 🚫 **Permanentemente BLOCKED**: `margin_pct` + variantes (target/floor/effective), `cost_breakdown`. El guard `hubspot-outbound-guard.ts` rechaza con `HubSpotCostFieldLeakError` si un caller intenta enviarlos.

Rationale: margin + cost_breakdown leak la estructura de costos laboral cargada de la agencia. COGS es estándar ERP y no compromete la pricing intelligence.

## HubSpot field permissions (checklist operativa)

Configuración manual en HubSpot admin portal (`https://app.hubspot.com/settings/48713323/users-and-teams/roles`). Para roles **operadores** (no super-admin):

### Read-only obligatorio

- Los 6 `hs_price_*` (clp, usd, clf, cop, mxn, pen)
- `name`, `hs_sku`, `description`, `hs_rich_text_description`
- `hs_product_type`, `hs_product_classification`, `hs_pricing_model`, `hs_bundle_type`
- `categoria_de_item`, `unidad`, `hs_tax_category`
- `recurringbillingfrequency`, `hs_recurring_billing_period`, `hs_recurring`
- `hs_status`
- `hs_cost_of_goods_sold`
- `hs_url`, `hs_images`
- Los 5 `gh_*` (ya configurados como read-only desde TASK-563)

### Editable para operadores

- `hubspot_owner_id` — soft-SoT. Operador puede reasignar en HS mientras `owner_gh_authoritative=false` en GH. Cuando admin UI toggle a `true`, GH gana y edits en HS se sobrescriben al próximo outbound.

### Validación

1. Ingresar con cuenta de rol operador (no admin).
2. Abrir un producto en HS.
3. Intentar editar `name` → debe aparecer como read-only o rechazar el save.
4. Intentar editar `hubspot_owner_id` → debe permitirlo.
5. Documentar screenshot de la configuración en este runbook al cerrarla.

## Reconcile scheduler (Phase 1 manual)

En TASK-605 Phase 1 NO hay cron automatizado. El reconcile corre de facto **en cada sync inbound** via `detectProductDriftV2` (TASK-604), que persiste a `source_sync_runs` con `source_system='product_drift_v2'`.

Para disparar un reconcile puntual sin esperar al próximo cron del `sync-hubspot-products`:

```bash
# Via staging (requires bypass)
pnpm staging:request POST /api/cron/hubspot-products-sync
```

El admin UI muestra el último drift por producto en el tab Metadatos (sección drift). Operadores pueden abrir cada producto con drift > 0, revisar `driftedFields`, decidir qué hacer (los `pending_overwrite` se auto-resuelven en el próximo sync; `manual_drift` requiere acción sobre ref table; `error` requiere crear binding de member).

**Follow-up ops**: provisionar Cloud Scheduler cron semanal (Lunes 06:00 America/Santiago) que invoque un endpoint del ops-worker corriendo `detectProductDriftV2` sobre los 74 productos + Slack alert si `count(manual_drift) + count(error) > 5`. No se hace en código aquí; es gcloud manual.

## Manual sync flow (TASK-605)

Cuando un operador edita un producto en la admin UI, los cambios se persisten en PG via PATCH. Para propagarlos inmediatamente a HubSpot sin esperar al próximo cron:

1. En el detail view, click **"Sincronizar a HubSpot"**
2. UI dispara `POST /api/admin/commercial/products/[id]/sync`
3. Endpoint invoca `pushProductToHubSpot({productId, eventType: 'commercial.product_catalog.updated', actorId: tenant.userId})`
4. Adapter v2 construye payload full-fidelity (16 fields + COGS + 5 `gh_*`)
5. Middleware v2 fan-out a HubSpot con header `X-Contract-Version: v2`
6. Result estructurado mostrado inline (success / endpoint_not_deployed / failed).

Si falla: revisar logs del middleware Cloud Run (`hubspot-greenhouse-integration`) + `hubspot_sync_error` column en `product_catalog`.
