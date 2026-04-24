# GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1

> **Status:** Vigente — 2026-04-24
> **Owner:** Comercial / CRM
> **Ubica:** Cierre del programa TASK-587 (Fase F de TASK-544)
> **Relación:** Especialización aplicada de [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md](GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md). Este documento captura el **contrato final** de 16 campos de catálogo + COGS que fluyen GH↔HS post-TASK-587.

## Propósito

Definir el **modelo canónico full-fidelity** del Product Catalog de Greenhouse sincronizado con HubSpot después del programa TASK-587. Este documento es la fuente única de verdad operativa para operadores comerciales, operadores HubSpot y agentes que toquen productos, precios, categorías o sincronización.

## Contrato de 16 campos catalog + COGS

Los 16 campos + COGS son GH-SoT inviolable. HubSpot los refleja; edits manuales en HS se sobrescriben al próximo outbound. Excepción documentada: `hubspot_owner_id` es soft-SoT (ver sección "Owner bridge").

### Tabla de campos

| Campo Greenhouse | Columna PG | Campo HubSpot | SoT | Notas |
|---|---|---|---|---|
| Product name | `product_catalog.product_name` | `name` | GH | Editable en admin UI |
| SKU | `product_catalog.product_code` | `hs_sku` | GH | Immutable post-creación |
| Description plain | `product_catalog.description` | `description` | GH | Derivado de rich si null |
| Description rich HTML | `product_catalog.description_rich_html` | `hs_rich_text_description` | GH | Whitelist `<p>,<strong>,<em>,<ul>,<ol>,<li>,<a href>,<br>` |
| Prices por moneda (6) | `product_catalog_prices.{CLP,USD,CLF,COP,MXN,PEN}` | `hs_price_clp/usd/clf/cop/mxn/pen` | GH | 1 authoritative + 5 derivadas FX |
| Product type | `product_catalog.hubspot_product_type_code` | `hs_product_type` | GH | `service` / `inventory` / `non_inventory` |
| Pricing model | `product_catalog.hubspot_pricing_model` | `hs_pricing_model` | GH | Fijo `flat` en Fase 1 |
| Product classification | `product_catalog.hubspot_product_classification` | `hs_product_classification` | GH | Fijo `standalone` en Fase 1 |
| Bundle type | `product_catalog.hubspot_bundle_type_code` | `hs_bundle_type` | GH | Fijo `none` en Fase 1 |
| Category | `product_catalog.category_code` | `categoria_de_item` | GH | Vocabulario controlado via `product_categories` |
| Unit | `product_catalog.unit_code` | `unidad` | GH | Vocabulario controlado via `product_units` |
| Tax category | `product_catalog.tax_category_code` | `hs_tax_category` | GH | Vocabulario controlado via `tax_categories` |
| Is recurring | `product_catalog.is_recurring` | `hs_recurring` | GH | Boolean |
| Recurring billing freq | `product_catalog.recurring_billing_frequency_code` | `recurringbillingfrequency` | GH | — |
| Recurring billing period | `product_catalog.recurring_billing_period_iso` | `hs_recurring_billing_period` | GH | ISO 8601 duration |
| Marketing URL | `product_catalog.marketing_url` | `hs_url` | GH | HTTPS absoluta |
| Image URLs (array) | `product_catalog.image_urls[]` | `hs_images` | GH | Semicolon-joined en el wire |
| COGS | `finance.products.cost_of_goods_sold` | `hs_cost_of_goods_sold` | GH | **Desbloqueado por TASK-603** (ver gobernanza) |
| Commercial owner | `product_catalog.commercial_owner_member_id` | `hubspot_owner_id` | **Soft-SoT** | HS-wins durante ventana pre-UI; GH-wins con toggle `owner_gh_authoritative=true` (post-TASK-605) |
| Custom GH markers (5) | Varios | `gh_product_code`, `gh_source_kind`, `gh_last_write_at`, `gh_archived_by_greenhouse`, `gh_business_line` | GH | Read-only en HS desde TASK-563 |

### Campos HS que NO migramos (deliberadamente)

- `hs_folder` — ignorado. GH usa `business_line_code` + `category_code` como organización ortogonal.
- `margin_pct` y variantes — **permanentemente blocked** outbound (TASK-347). Greenhouse nunca filtra estructura de costos a HubSpot.
- `cost_breakdown` — mismo block permanente.

## Multi-currency model (TASK-602)

`greenhouse_commercial.product_catalog_prices` normaliza producto × moneda. PK `(product_id, currency_code)`. Matriz canónica de 6 monedas: CLP, USD, CLF, COP, MXN, PEN. Cada fila es **authoritative** (source `gh_admin`, `hs_seed`, `backfill_legacy`) o **derivada** (source `fx_derived`).

Reglas:

- Un producto puede tener 1..6 autoritativas. `setAuthoritativePrice` upsert + computa derivadas en misma transacción.
- Derivación FX via `getExchangeRateOnOrBefore` (TASK-602 / FX platform).
- Anti-ping-pong: 60s window sobre `derived_from_fx_at` evita tight-loops.
- VIEW `product_catalog_authoritative_price` resuelve desempate con precedencia CLP→USD→CLF→COP→MXN→PEN.
- Projection reactiva `product_catalog_prices_recompute` suscrita a `finance.exchange_rate.upserted` regenera derivadas cuando cambia una rate.

Detalle completo: [TASK-602](../tasks/complete/TASK-602-product-catalog-multi-currency-prices.md).

## Owner bridge semantics

### Soft-SoT durante ventana pre-admin-UI

Desde TASK-604 hasta TASK-605: `commercial_owner_member_id` se hidrata inbound desde HubSpot con conflict resolution:

1. Si `owner_gh_authoritative = TRUE` → GH wins. Preserve existente, ignora HS.
2. Sino, si `hs_lastmodifieddate > gh_last_write_at` → HS wins. Upsert member.
3. Sino → GH wins, preserve.

### Post-TASK-605 (operador con Admin UI)

- Productos con owner editado vía admin UI: operador toggle `owner_gh_authoritative = TRUE` → GH wins permanente, HS ya no puede sobrescribir.
- Productos legacy (sin edit post-UI): siguen con flag `false` hasta que operador revise.
- `commercial_owner_assigned_at` siempre-lectura desde HS (audit trail, GH nunca lo escribe outbound).

### Bridge mechanics

- Member → HubSpot owner vía `greenhouse_core.members.hubspot_owner_id`.
- Resolver `loadActorHubSpotOwnerIdentity({ memberId })` devuelve `hubspotOwnerId` + `candidateEmails[]`.
- Reverse: `loadHubSpotOwnerBindingByOwnerId(hubspotOwnerId)` resuelve member.
- Outbound envía ambos (`commercialOwnerEmail` + `hubspotOwnerId`); middleware prefiere id directo, fallback a email via `resolve_owner_by_email`.

## Drift detection + classification (TASK-604)

Cada inbound run ejecuta `detectProductDriftV2` comparando los 16 fields v2 HS contra GH. Persiste reporte a `greenhouse_sync.source_sync_runs` con `source_system = 'product_drift_v2'`, `notes` JSON con shape:

```json
{
  "productId": "...",
  "hubspotProductId": "...",
  "scannedAt": "ISO",
  "driftedFields": [
    { "name": "price_clp", "hsValue": 100000, "ghValue": 99999, "classification": "pending_overwrite" }
  ]
}
```

### Clasificación 3-nivel

| Level | Semántica | Ejemplo | Acción |
|---|---|---|---|
| `pending_overwrite` | HS tiene valor distinto de GH-SoT; el próximo outbound lo resuelve | HS tiene precio USD 100, GH tiene USD 99 | Informacional. No requiere acción humana. |
| `manual_drift` | HS tiene valor que GH podría aceptar pero no está enumerado en ref table | HS `categoria_de_item = "Retainer"` no está en `product_categories` | Revisar manualmente: agregar al ref table o override HS |
| `error` | Valor estructuralmente inválido / irresoluble | Owner ID sin binding en `members` | Alert-worthy. Operador debe crear binding |

## Admin surface (TASK-605)

Superficie `/admin/commercial/product-catalog`:

- **Capability**: `administracion.product_catalog` (viewCode en `view-access-catalog.ts`)
- **Gate**: `hasAnyAuthorizedViewCode` con fallback a `routeGroups.includes('admin')`
- **List view**: tabla con 74 productos, search, filtros (sourceKind, archived, drift), indicador de drift count
- **Detail view**: editor con secciones (Identidad / Clasificación / Precios / Recurrencia / Metadatos); manual sync button

API REST admin:

- `GET /api/admin/commercial/products` — list con filtros + drift counts
- `GET /api/admin/commercial/products/[id]` — detalle completo (product + prices + owner + drift + refOptions)
- `PATCH /api/admin/commercial/products/[id]` — update mutable fields
- `PUT /api/admin/commercial/products/[id]/prices` — bulk authoritative prices + recompute derivadas
- `POST /api/admin/commercial/products/[id]/sync` — trigger manual outbound sync

## Governance de COGS (TASK-603)

**TASK-347 parcialmente supersedido por TASK-603**.

- `cost_of_goods_sold` → **ALLOWED outbound** como `hs_cost_of_goods_sold`. Decisión explícita: COGS es atributo de producto y permite reporting HS de margen por producto.
- `margin_pct` + variantes (target/floor/effective), `cost_breakdown` → **permanentemente BLOCKED**. El guard `hubspot-outbound-guard.ts` rechaza con `HubSpotCostFieldLeakError` si un caller intenta enviarlos.

Rationale: COGS es tú costo de venta por unidad (aceptable en CRM); margin + cost_breakdown exponen estructura de costos laboral cargada (leak de pricing intelligence).

## HubSpot field permissions (operativo)

Configuración en el portal HubSpot (admin manual, fuera de código):

- **Read-only para roles operadores**: todos los fields catalog (prices, name, description, sku, classification, type, category, unit, tax, recurrencia, COGS, url, images) + los 5 `gh_*` (ya read-only desde TASK-563).
- **Editable para roles operadores**: `hubspot_owner_id` (soft-SoT, con ventana hasta que GH-wins se active vía admin UI).

Ver [product-catalog-sync-runbook.md](../operations/product-catalog-sync-runbook.md) §HubSpot field permissions para la checklist operativa.

## Reconcile scheduler (manual Phase 1)

Post-TASK-605 Phase 1: reconcile job corre **bajo demanda** vía invocación manual del endpoint de detección o desde CLI (`pnpm tsx scripts/backfill/product-catalog-hs-v2.ts` no es reconcile — es backfill; el reconcile real es `detectProductDriftV2` invocado en cada sync).

Follow-up: provisionar **Cloud Scheduler cron weekly** (Lunes 06:00 America/Santiago) que invoque endpoint del ops-worker corriendo `detectProductDriftV2` en los 74 productos y alertando a Slack si `count(manual_drift) + count(error) > 5`. Queda como TASK-### dedicada (ops manual).

## Referencias canónicas

- **Programa padre**: [TASK-544 Commercial Product Catalog Sync Program](../tasks/complete/TASK-544-commercial-product-catalog-sync-program.md)
- **Umbrella**: [TASK-587 HubSpot Products Full-Fidelity Bidirectional Sync Expansion](../tasks/to-do/TASK-587-hubspot-products-full-fidelity-sync.md)
- **Fases cerradas**:
  - [TASK-601 Schema + Ref Tables](../tasks/complete/TASK-601-product-catalog-schema-extension-ref-tables.md)
  - [TASK-602 Multi-Currency Price Normalization](../tasks/complete/TASK-602-product-catalog-multi-currency-prices.md)
  - [TASK-603 Outbound Contract v2 + COGS Unblock](../tasks/complete/TASK-603-hubspot-products-outbound-contract-v2-cogs-unblock.md)
  - [TASK-604 Inbound Rehydration + Drift Detection](../tasks/complete/TASK-604-hubspot-products-inbound-rehydration-owner-drift.md)
  - [TASK-605 Admin UI + Backfill + Governance](../tasks/complete/TASK-605-product-catalog-admin-ui-backfill-governance.md)
- **Infra**: [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md](GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md), [GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md](GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md), [GREENHOUSE_EVENT_CATALOG_V1.md](GREENHOUSE_EVENT_CATALOG_V1.md)
- **Runbook operativo**: [product-catalog-sync-runbook.md](../operations/product-catalog-sync-runbook.md)

## Changelog

- 2026-04-24 — Documento creado al cierre de TASK-605, consolidando el contrato final del programa TASK-587.
