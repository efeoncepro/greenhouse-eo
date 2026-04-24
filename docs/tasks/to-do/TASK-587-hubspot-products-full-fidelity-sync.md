# TASK-587 — HubSpot Products Full-Fidelity Bidirectional Sync Expansion

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Epic: `TASK-544` (Commercial Product Catalog Sync Program — extiende como Fase F)
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-587-hubspot-products-full-fidelity-sync`

## Summary

Convierte a Greenhouse en SoT inviolable y full-fidelity del catálogo de productos sincronizado a HubSpot: extiende el modelo canónico con multi-moneda normalizada, rich description, product type / classification / pricing model, categorías, unidades, tax category, owner comercial bridged a `members.hubspot_owner_id`, y URL marketing. Cierra los 23 fields HS hoy ignorados o asimétricos sin perder el cost guard de TASK-347 (margin sigue blocked; COGS se desbloquea explícitamente).

## Why This Task Exists

Hoy el sync GH↔HS de productos cubre solo 7 fields del shape canónico (`name`, `sku`, `description`, `unit_price` scalar, `cost_of_goods_sold` inbound-only, `is_active`, custom `gh_*`). HubSpot expone 42 properties en este portal y operadores comerciales editan varias de ellas (categoría, unidad, owner, multi-moneda) sin que GH las refleje, generando:

- **Drift silencioso**: edit operativo en HS sobre `categoria_de_item` o `unidad` queda huérfano y se pierde en el próximo outbound.
- **Pricing roto**: HS tiene 6 slots `hs_price_clp/usd/clf/cop/mxn/pen` (matching la matriz FX de Greenhouse). Hoy ningún producto tiene precio poblado en HS — los 74 productos están vacíos en moneda — porque el outbound envía un `unitPrice` scalar a un field que no existe en este portal (`hs_price` default está deshabilitado).
- **Reporting nativo HS roto**: `hs_product_type` (Service/Inventory/Non-Inventory) está vacío, así que la UI de HubSpot no puede filtrar productos por tipo.
- **Owner sin bridge**: `hubspot_owner_id` existe en infraestructura para deals (`hubspot-owner-identity.ts`) pero no se aplica al catálogo de productos.
- **Rich text aplanado**: `hs_rich_text_description` se descarta inbound; `description` se sobreescribe en plain text en cada outbound.

La solución no es ad-hoc: requiere extender el modelo canónico GH (multi-currency normalizado, vocabularios controlados de categoría/unidad), upgrade del contrato del Cloud Run middleware (`hubspot-greenhouse-integration` o el absorbido vía TASK-574), UI admin para mantenimiento, backfill, reconcile y governance HS-side (field permissions read-only).

## Goal

- Greenhouse es SoT permanente de **16 fields catalog** propagados a HubSpot (todos los precios, descripción rich, tipo, clasificación, categoría, unidad, recurrencia, tax, archived state, business line, sku, name, classification, marketing URL, imágenes, custom `gh_*`).
- HubSpot recibe los 6 `hs_price_*` derivados de `product_catalog_prices` en cada outbound — full overwrite, sin merge — eliminando el actual estado de "sin precio" en los 74 productos.
- Bridge `commercial_owner_member_id ↔ hubspot_owner_id` reusa `loadActorHubSpotOwnerIdentity` y `loadHubSpotOwnerBindingByOwnerId` ya probados para deals; soft-SoT en owner (HS-wins durante ventana sin UI, GH-wins post Fase E).
- Cost-of-goods-sold (`hs_cost_of_goods_sold`) **se desbloquea outbound** como decisión explícita de governance (margin/cost_breakdown siguen blocked).
- Admin UI `/admin/catalogo/productos` permite editar el catálogo completo con selector de owner, grid multi-moneda y trigger manual de sync.
- 42 propiedades HS auditadas, todas con tratamiento explícito: 31 mapeadas, 10 system-only (HS auto-gestionado, lectura para tiebreaker/audit), 1 deliberately ignored (`hs_folder`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (Servicio canonical → `service_modules.module_id`)
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (matriz canónica + derivación FX)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (outbound projections idempotentes)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (node-pg-migrate flow + Kysely codegen)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` (programa parent TASK-544, modelo de dos capas)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (si suma HS webhooks push de productos)

Reglas obligatorias:

- **Greenhouse es SoT inviolable de catalog data** (precios, name, description, classification, type, category, unit, tax, recurrencia, archived, business line). HS edits sobre estos fields se sobrescriben en el siguiente outbound — sin warning operativo, sin merge.
- **Owner es soft-SoT** durante ventana sin UI: HS-wins inicial, GH-wins post Fase E. Tiebreaker `gh_last_write_at` vs `hs_lastmodifieddate`.
- **Cost guard TASK-347 se modifica parcialmente**: `hs_cost_of_goods_sold` se desbloquea outbound (decisión explícita de este task). `margin_pct`, `target_margin_pct`, `floor_margin_pct`, `effective_margin_pct`, `cost_breakdown` siguen permanentemente blocked.
- **Multi-moneda normalizada**: tabla `product_catalog_prices` (no JSONB, no columnas por moneda). Permite agregar monedas sin migración.
- **Vocabularios controlados** para `category_code`, `unit_code`, `tax_category_code` y `product_type_code`. Mapping bidi GH↔HS via tablas ref con `hubspot_option_value`.
- **Custom HS properties `gh_*`** son read-only para operadores HS.
- **Field permissions HS** (Fase E) marcan TODOS los fields catalog como read-only para roles operadores.

## Normative Docs

- `docs/operations/product-catalog-sync-runbook.md` — runbook a actualizar con nueva policy SoT
- `docs/operations/hubspot-custom-properties-products.md` — inventario actual de las 5 `gh_*`, ampliar con changes
- `docs/operations/product-hubspot-outbound-e2e-report.md` — historia de adopción que este task continúa

## Dependencies & Impact

### Depends on

- `TASK-544` — Commercial Product Catalog Sync Program (umbrella parent, in progress)
- `TASK-545` ✅ — Schema & Materializer Foundation
- `TASK-546` ✅ — Source Handlers & Event Homogenization
- `TASK-547` ✅ — HubSpot Outbound Projection (Fase C inicial; este task la amplía con contrato v2)
- `TASK-548` ✅ — Drift Detection & Admin Center (Fase D inicial; este task amplía drift detection)
- `TASK-563` ✅ — Outbound Follow-ups (5 custom properties live en sandbox + production)
- Bridge HS owner ↔ GH member existente:
  - `src/lib/commercial/hubspot-owner-identity.ts`
  - `src/lib/commercial/hubspot-owner-sync.ts`
  - Columna `greenhouse_core.members.hubspot_owner_id`
- `ref.currencies` (o equivalente registrado en FX platform) [verificar exacto schema]
- `TASK-347` ✅ — Cost Field Leak Guard (este task lo modifica parcialmente para COGS, ver Detailed Spec § Governance)

### Sequencing + dependencias externas

**TASK-574 es prerequisito para Fases C, D, E** (cualquier cambio al middleware `hubspot-greenhouse-integration`). Sin TASK-574 cerrada, esas fases requieren PRs cross-repo al sibling `cesargrowth11/hubspot-bigquery` que tiene 0 CI/CD y deploy 100% manual — alta fricción operativa.

Orden recomendado:

```
[TASK-574 absorb middleware]          ────┐
                                          │
[TASK-601 Fase A schema] ─ [TASK-602 Fase B prices] ──┤ (pueden correr en paralelo)
                                          │           │
                                          └───────────┤
                                                      ▼
                             [TASK-603 Fase C outbound v2]
                                          │
                                          ▼
                             [TASK-604 Fase D inbound v2]
                                          │
                                          ▼
                             [TASK-605 Fase E UI + governance]
```

Fases A y B (TASK-601, TASK-602) son 100% PostgreSQL + TS interno — se pueden arrancar en paralelo con TASK-574 sin esperar.

### Coordina con

- `TASK-574` — Absorber Cloud Run `hubspot-greenhouse-integration` en `services/` (prerequisito de C/D/E)
- `TASK-575` — Upgrade HubSpot Developer Platform 2026.03 (ortogonal, no bloquea)

### Blocks / Impacts

- `TASK-549` — Product Catalog Policy Enforcement & Legacy Cleanup (Fase E del programa parent). Este task entrega los inputs para que TASK-549 declare cleanup completo.
- `TASK-524` — Income → HubSpot Invoice Bridge: invoices necesitan que productos tengan precios en moneda correcta del cliente.
- `TASK-576` — HubSpot Quote Publish Contract Completion: line items reusan catálogo; necesita full-fidelity para no inflar manualmente.
- `TASK-583` ✅ — Quote Native Publish: cerrada, pero su line item bridge se beneficia de catalog full-fidelity para próximas iteraciones.
- `TASK-552` — Multi-Currency Quote Output Follow-ups: comparte fields FX y `line_fx_snapshot` — coordinar contrato.

### Files owned

- `migrations/` — 3+ archivos creados via `pnpm migrate:create` (catalog extension, prices table, ref tables)
- `src/lib/commercial/product-catalog-store.ts` (extend)
- `src/lib/commercial/product-catalog-prices.ts` (new)
- `src/lib/commercial/product-catalog-references.ts` (new — categories, units, source_kind_mapping readers)
- `src/lib/commercial/hubspot-outbound-guard.ts` (modify — COGS removed from forbidden list)
- `src/lib/hubspot/hubspot-product-payload-adapter.ts` (extend con contrato v2)
- `src/lib/hubspot/sync-hubspot-products.ts` (extend inbound rehydration)
- `src/lib/hubspot/push-product-to-hubspot.ts` (extend snapshot reader)
- `src/lib/integrations/hubspot-greenhouse-service.ts` (extend types — contrato v2)
- `src/lib/sync/projections/product-hubspot-outbound.ts` (no cambia comportamiento, valida nuevo contract)
- `src/views/greenhouse/admin/catalogo/productos/**` (new)
- `src/app/admin/catalogo/productos/**` (new — page + layout)
- `src/app/api/admin/commercial/products/**` (new — CRUD endpoints)
- `src/app/api/admin/commercial/products/[id]/sync/route.ts` (new — manual trigger)
- `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` (new spec — contrato canónico)
- `docs/operations/product-catalog-sync-runbook.md` (update — nueva policy SoT + COGS desbloqueado + field permissions HS)
- `docs/operations/hubspot-custom-properties-products.md` (update si se agrega `gh_module_id` follow-up)
- `services/hubspot-greenhouse-integration/**` (extend si TASK-574 cerró; si no, PR cross-repo coordinado)

## Current Repo State

### Already exists

- **Inbound** ([sync-hubspot-products.ts:14-75](src/lib/hubspot/sync-hubspot-products.ts#L14-L75)): consume `name`, `sku`, `description`, `unitPrice` scalar, `costOfGoodsSold`, `tax`, `isRecurring`, `frequency`, `periodCount`, `isArchived`. Upsert a `greenhouse_finance.products`.
- **Outbound** ([hubspot-product-payload-adapter.ts:38-87](src/lib/hubspot/hubspot-product-payload-adapter.ts#L38-L87)): emite `name`, `sku`, `description`, `unitPrice`, 5 custom `gh_*`, `isArchived`. Sanitiza con guard.
- **Guard cost/margin** ([hubspot-outbound-guard.ts:14-31](src/lib/commercial/hubspot-outbound-guard.ts#L14-L31)): bloquea 8 fields (incluye COGS). Este task **remueve COGS** y mantiene los 7 restantes.
- **Tipos contract v1** ([hubspot-greenhouse-service.ts:363-430](src/lib/integrations/hubspot-greenhouse-service.ts#L363-L430)): `HubSpotGreenhouseProductProfile` + create/update requests.
- **Bridge owner**: 4 helpers en [hubspot-owner-identity.ts](src/lib/commercial/hubspot-owner-identity.ts) + columna `members.hubspot_owner_id`.
- **5 custom properties `gh_*`** live en HubSpot sandbox + production (TASK-563).
- **Reactive projection** ([product-hubspot-outbound.ts](src/lib/sync/projections/product-hubspot-outbound.ts)): trigger en `productCatalog{Created,Updated,Archived,Unarchived}`.
- **74 productos** en HubSpot portal `48713323`, ningún field `hs_price_*` poblado.
- **Cloud Run middleware**: `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app` ([service.ts:6](src/lib/integrations/hubspot-greenhouse-service.ts#L6)).

### Gap

- **Multi-moneda**: no hay tabla de prices por currency. Single `default_unit_price` + `default_currency` en `product_catalog`. Outbound envía a un field HS inexistente (`hs_price` default).
- **Rich text**: `hs_rich_text_description` ignorado inbound; outbound solo escribe `description` plain.
- **Product type**: no hay column ni mapping `source_kind → hs_product_type`. HS reporting nativo roto.
- **Categoría**: HS expone `categoria_de_item` custom prop sin contraparte GH; ningún producto la tiene poblada en muestras observadas.
- **Unidad**: HS expone `unidad` custom prop; GH tiene `defaultUnit` en snapshot pero no se publica.
- **Tax category**: HS guarda categoría enum (`hs_tax_category`); GH guarda numérico (`tax_rate`). Semánticas no convertibles.
- **Recurrencia outbound**: `recurringbillingfrequency` y `hs_recurring_billing_period` se leen pero nunca se escriben.
- **Owner**: bridge existe para deals, no aplicado a productos.
- **Marketing URL**: `hs_url` ignorado en ambas direcciones.
- **Imágenes**: `hs_images` ignorado; operadores que pegan URLs en HS pierden la info en el próximo outbound.
- **Owner assigned date**: `hubspot_owner_assigneddate` (audit timestamp) no capturado.
- **Reference tables**: no existen `product_categories`, `product_units`, `tax_categories`, `product_source_kind_mapping`.
- **Admin UI**: no hay surface para editar catálogo. Edits requieren migration SQL ad-hoc.
- **Reconcile**: existe stub ([service.ts:894](src/lib/integrations/hubspot-greenhouse-service.ts#L894)) pero solo reporta presencia, no drift por field.
- **Field permissions HS**: ningún field marcado read-only operativo; cualquier operador puede editar prices, name, etc., y generar drift.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

> **Naturaleza umbrella**: 5 child tasks ya reservadas, siguiendo el patrón de TASK-534 (Party Lifecycle) y TASK-544 (Product Catalog Program).
>
> | Fase | Child task | Effort |
> |---|---|---|
> | A — Canonical Model Extension + Ref Tables | [TASK-601](docs/tasks/to-do/TASK-601-product-catalog-schema-extension-ref-tables.md) | Medio |
> | B — Multi-Currency Price Normalization | [TASK-602](docs/tasks/to-do/TASK-602-product-catalog-multi-currency-prices.md) | Medio |
> | C — Outbound Contract v2 + COGS Unblock | [TASK-603](docs/tasks/to-do/TASK-603-hubspot-products-outbound-contract-v2-cogs-unblock.md) | Alto |
> | D — Inbound Rehydration + Owner + Drift | [TASK-604](docs/tasks/to-do/TASK-604-hubspot-products-inbound-rehydration-owner-drift.md) | Medio |
> | E — Admin UI + Backfill + Reconcile + Governance | [TASK-605](docs/tasks/to-do/TASK-605-product-catalog-admin-ui-backfill-governance.md) | Alto |

### Slice A — Canonical Model Extension

Entregables:

- Migración 1: extender `greenhouse_commercial.product_catalog` con columnas nullable: `description_rich_html TEXT`, `product_type_code TEXT`, `category_code TEXT`, `unit_code TEXT`, `tax_category_code TEXT`, `pricing_model TEXT DEFAULT 'flat'`, `product_classification TEXT DEFAULT 'standalone'`, `bundle_type_code TEXT DEFAULT 'none'`, `is_recurring BOOLEAN DEFAULT FALSE`, `recurring_billing_period_code TEXT`, `recurring_billing_frequency_code TEXT`, `commercial_owner_member_id TEXT REFERENCES greenhouse_core.members(member_id)`, `commercial_owner_assigned_at TIMESTAMPTZ`, `owner_gh_authoritative BOOLEAN DEFAULT FALSE`, `marketing_url TEXT`, `image_urls TEXT[] DEFAULT ARRAY[]::TEXT[]`.
- Migración 2: 4 tablas ref con seed:
  - `greenhouse_commercial.product_categories (code PK, label_es, label_en, hubspot_option_value, active, display_order)`
  - `greenhouse_commercial.product_units (code PK, label_es, label_en, hubspot_option_value, active, display_order)` — seed: `UN`, `HORA`, `MES`, `ANUAL`, `DIA`, `PROYECTO`, `CUSTOM`
  - `greenhouse_finance.tax_categories (code PK, label_es, hubspot_option_value, default_rate_pct, jurisdiction)` — seed mínimo Chile (`standard_iva_19`, `exempt`, `non_taxable`)
  - `greenhouse_commercial.product_source_kind_mapping (source_kind PK, hubspot_product_type, notes)` — seed: `service→Service`, `sellable_role→Service`, `tool→Non-Inventory`, `overhead_addon→Non-Inventory`, `manual→Service`
- Discovery one-time: barrer 74 productos HS, capturar valores actuales de `categoria_de_item` y `unidad` y proponer seed extendido para tablas ref.
- Backfill de columnas nuevas desde `greenhouse_finance.products` donde haya datos.
- Regenerar tipos Kysely (`pnpm db:generate-types`).
- Tests unitarios para readers de tablas ref.

### Slice B — Multi-Currency Price Normalization

Entregables:

- Migración 3: tabla `greenhouse_commercial.product_catalog_prices`:
  ```
  product_id              TEXT NOT NULL REFERENCES product_catalog(product_id) ON DELETE CASCADE
  currency_code           TEXT NOT NULL  -- CLP, USD, CLF, COP, MXN, PEN
  unit_price              NUMERIC(18,4) NOT NULL
  is_authoritative        BOOLEAN NOT NULL DEFAULT FALSE
  derived_from_currency   TEXT NULL      -- moneda fuente si is_authoritative=false
  derived_from_fx_at      TIMESTAMPTZ NULL
  derived_fx_rate         NUMERIC(18,8) NULL
  source                  TEXT NOT NULL DEFAULT 'gh_admin'  -- gh_admin | hs_seed | fx_derived
  created_at              TIMESTAMPTZ DEFAULT NOW()
  updated_at              TIMESTAMPTZ DEFAULT NOW()
  PRIMARY KEY (product_id, currency_code)
  ```
- Migración 4: VIEW `product_catalog_default_price` para callers legacy:
  ```sql
  SELECT pc.product_id,
         pcp.unit_price AS default_unit_price,
         pcp.currency_code AS default_currency
    FROM product_catalog pc
    LEFT JOIN product_catalog_prices pcp
      ON pcp.product_id = pc.product_id
     AND pcp.is_authoritative = TRUE
     AND pcp.currency_code = pc.default_currency_preference
  ```
- Backfill: migrar `default_unit_price + default_currency` actuales a 1 fila autoritativa por producto.
- Discovery one-time: si algún producto en HS tiene `hs_price_*` poblado, captura como semilla `source='hs_seed'`. **Después del seed, GH es SoT permanente — HS edits a precios se sobrescriben sin merge.**
- Helper `derivePricesFromAuthoritative(productId)`: lee la fila autoritativa, computa los 5 currencies restantes via FX platform, upsert con `is_authoritative=false, source='fx_derived'`.
- Hook reactivo: cuando cambia FX rate o cuando se modifica precio autoritativo, regenerar derived prices y publicar `productCatalogPricesUpdated`.
- Tests: round-trip authoritative → derived → outbound payload.

### Slice C — Outbound Contract v2 (GH → HS)

Entregables:

- Extender `HubSpotGreenhouseCreateProductRequest` y `HubSpotGreenhouseUpdateProductRequest` en [hubspot-greenhouse-service.ts](src/lib/integrations/hubspot-greenhouse-service.ts) con shape v2:
  ```ts
  {
    name, sku,
    description,            // plain auto-derivado de rich
    descriptionRichHtml,    // sanitizado server-side
    pricesByCurrency: { CLP?, USD?, CLF?, COP?, MXN?, PEN? },  // null borra
    costOfGoodsSold,        // ⬅ desbloqueado este task (governance change)
    productType,            // 'service' | 'inventory' | 'non_inventory'
    pricingModel,           // siempre 'flat' Fase 1
    productClassification,  // siempre 'standalone' Fase 1
    bundleType,             // siempre 'none' Fase 1
    categoryCode,           // mapea a categoria_de_item via hubspot_option_value
    unitCode,               // mapea a unidad
    taxCategoryCode,        // mapea a hs_tax_category
    isRecurring,
    recurringBillingFrequency,
    recurringBillingPeriodCode,
    commercialOwnerEmail,   // middleware resuelve a hubspot_owner_id
    marketingUrl,           // hs_url
    imageUrls,              // string[] → hs_images (array de URLs absolutas)
    createdBy,
    customProperties: { gh_* }  // 5 custom existentes
  }
  ```
- Modificar [hubspot-outbound-guard.ts:14-31](src/lib/commercial/hubspot-outbound-guard.ts#L14-L31): remover `costOfGoodsSold`, `cost_of_goods_sold`, `unitCost`, `unit_cost`, `loadedCost`, `loaded_cost` del set forbidden. Mantener los 7 restantes (margin*, cost_breakdown, effective_margin*).
- Actualizar JSDoc del guard reflejando: "TASK-587 supersedea parcialmente a TASK-347 — COGS habilitado outbound; margin/cost_breakdown permanentemente blocked".
- Extender [hubspot-product-payload-adapter.ts](src/lib/hubspot/hubspot-product-payload-adapter.ts) y `ProductCatalogSyncSnapshot`: pull catalog completo + prices grid + owner identity via `loadActorHubSpotOwnerIdentity`.
- Sanitizer HTML server-side (`sanitize-html` o `isomorphic-dompurify`) con whitelist `<p>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<a href>`, `<br>`.
- Plain-text deriver: `descriptionRichHtml → description` via strip-tags.
- Coordinación middleware (Cloud Run): contract v2 acepta nuevos fields, fan-out a `hs_price_clp/usd/clf/cop/mxn/pen`, `hs_product_type`, `hs_rich_text_description`, `hs_cost_of_goods_sold`, `hubspot_owner_id`, `categoria_de_item`, `unidad`, `hs_pricing_model=flat`, `hs_product_classification=standalone`, `hs_bundle_type=none`, `hs_url`, `hs_images`, `hs_tax_category`, `recurringbillingfrequency`, `hs_recurring_billing_period`. Versionar header `X-Contract-Version: v2`. Dual-write durante validación.
- Tests: snapshot completo → payload v2 → assertion shape; cobertura de COGS desbloqueado; cobertura de owner resolution con member existente y no existente.

### Slice D — Inbound Rehydration (HS → GH)

Entregables:

- Coordinación middleware: `HubSpotGreenhouseProductProfile` v2 incluye `owner: HubSpotGreenhouseOwnerProfile | null`, `pricesByCurrency: Record<CurrencyCode, number>`, `descriptionRichHtml`, `categoryHubspotValue`, `unitHubspotValue`, `taxCategoryHubspotValue`, `hubspotOwnerAssignedAt`.
- Extender [sync-hubspot-products.ts](src/lib/hubspot/sync-hubspot-products.ts):
  - `commercial_owner_member_id` resuelto via `loadHubSpotOwnerBindingByOwnerId(profile.owner.ownerHubspotUserId)`. Si null binding, log warning a `source_sync_runs`.
  - `commercial_owner_assigned_at` capturado de HS (read-only HS audit, GH nunca escribe).
  - Resolución reverse de category/unit/tax_category: `hubspot_option_value → code` via tablas ref.
  - **Conflict resolution para owner**: si `gh_last_write_at < hs_lastmodifieddate` Y `owner_gh_authoritative=false`, HS gana. En cualquier otro caso, GH wins (preserva valor actual).
- Drift detection ampliado en [service.ts:894](src/lib/integrations/hubspot-greenhouse-service.ts#L894): comparar field-by-field, reportar shape `{ productId, driftedFields: [{ name, hsValue, ghValue, classification: 'pending_overwrite' | 'manual_drift' }] }`. Drift en prices = `pending_overwrite` (no error). Drift en `categoria_de_item`/`unidad` = `manual_drift` (revisión).
- Tests: simular owner edit en HS, verificar inbound captura sin sobrescribir GH si flag autoritativo.

### Slice E — Admin UI + Backfill + Governance

Entregables:

- Surface `/admin/catalogo/productos` con:
  - List view: search por SKU/name/BU, filtros por `source_kind`, `category_code`, `is_archived`, columna sync status (last_outbound_sync_at + drift indicator).
  - Detail drawer con tabs:
    - **Identidad**: code, name, description (rich editor con whitelist), marketing URL, imágenes (list editor de URLs absolutas: add/remove filas, validación URL HTTPS, preview thumbnail opcional)
    - **Precios**: grid 6 monedas con toggle `is_authoritative` por fila, derivación FX live preview, currency preference selector
    - **Clasificación**: product type, classification, category (autocomplete from ref), unit (autocomplete from ref), tax category, COGS
    - **Recurrencia**: is_recurring toggle, billing frequency, billing period
    - **Owner**: autocomplete miembros (búsqueda por nombre/email), `owner_gh_authoritative` toggle (override HS-wins durante ventana), display de `commercial_owner_assigned_at` read-only
    - **Metadatos**: BU, source kind (read-only), `gh_last_write_at` (read-only), HS sync status + manual trigger button
- Capability `commercial.product_catalog.manage` (entitlement).
- Endpoint `POST /api/admin/commercial/products/[id]/sync`: dispara outbound inmediato, devuelve resultado.
- Backfill masivo: script idempotente `scripts/backfill-product-catalog-hs.ts` que reprocesa los 74 productos contra HS con contrato v2. Output: `created`, `updated`, `errors` per producto.
- Reconcile weekly scheduler: extender `ops-worker` con job que corre `/products/reconcile` y persiste drift en `source_sync_runs` + alerta Slack en >5 productos drifted simultáneos.
- Governance HS-side:
  - Coordinar con admin HS portal: marcar TODOS los fields catalog (prices, name, description, sku, classification, type, category, unit, tax, recurrencia) como **read-only para roles operadores**. Solo super-admin con justificación temporal puede editarlos.
  - `hs_cost_of_goods_sold` queda **read-only operativo** (GH SoT) pero visible para reporting.
  - `gh_*` custom props ya son read-only (TASK-563).
  - `hubspot_owner_id` queda editable (sigue siendo soft-SoT en owner).
  - Documentar en runbook update.
- Update `docs/operations/product-catalog-sync-runbook.md` con:
  - Nueva policy SoT por field (tabla copiada de Detailed Spec)
  - Decisión COGS desbloqueado (con referencia a este task)
  - Procedimiento de field permissions HS
  - Cómo invocar manual sync desde UI vs CLI
  - Drift classification: `pending_overwrite` vs `manual_drift`

## Out of Scope

- **Tiered pricing** (`hs_pricing_model='tiered'`) y **bundles** (`hs_product_classification='bundle'` o `variant`): YAGNI. Se escribe `flat`/`standalone`/`none` explícito siempre. Follow-up separado si emerge use case.
- **Upload workflow de imágenes con GCS bucket**: Fase 1 acepta URLs absolutas (HTTPS) como input — operador pega link de Notion/CDN/bucket ya existente. UI de upload con GCS + signed URLs + thumbnails generadas queda como follow-up TASK separado.
- **`hs_folder` mirror**: ignorado deliberadamente. GH usa `business_line_code + category_code` como organización ortogonal.
- **`gh_module_id` custom HS property** (link a `service_modules.module_id` canonical 360): follow-up — requiere modelar primero el bridge canonical-to-catalog.
- **Cualquier mecanismo que permita HS ser SoT de precio** (incluye merge, "preserve si HS es más reciente", etc.). Owner es la ÚNICA excepción documentada.
- **Migración de `greenhouse_finance.products` legacy**: cubierto por TASK-549.
- **HubSpot quote line items con prices override**: cubierto por TASK-576.
- **Income / Invoice currency conversion**: cubierto por TASK-524 y TASK-552.
- **Margin / cost_breakdown outbound**: permanentemente blocked. Solo COGS se desbloquea este task.
- **Admin UI de tablas ref** (categories, units, tax_categories): seed inicial via SQL en Slice A; CRUD admin queda como follow-up si emerge necesidad operativa.
- **Multi-jurisdicción tax categories**: seed inicial Chile-only. Coordina con TASK-562 para MX/CO/PE expansion.
- **Cambios a modelo de members/owners**: fuera; reusa `hubspot-owner-identity.ts` existente.

## Detailed Spec

### SoT Direction Table — contrato canónico inviolable

| Field GH | Field HS | SoT | Conflict resolution |
|---|---|---|---|
| `name` | `name` | **GH** | GH overwrite siempre |
| `description_rich_html` | `hs_rich_text_description` | **GH** | GH overwrite siempre (HTML sanitizado) |
| `description` (auto-derivado strip-tags) | `description` | **GH** | GH overwrite siempre |
| `product_code` | `hs_sku` + `gh_product_code` | **GH** | GH overwrite siempre |
| `product_catalog_prices.unit_price` × 6 currencies | `hs_price_clp/usd/clf/cop/mxn/pen` | **GH** | GH overwrite siempre, **incluso con NULL** (envía `null` explícito) |
| `cost_of_goods_sold` (NUEVO outbound) | `hs_cost_of_goods_sold` | **GH** | GH overwrite siempre — supersedea parcialmente TASK-347 guard |
| `product_type_code` (derivado de `source_kind` via mapping table) | `hs_product_type` | **GH** | GH overwrite siempre |
| `category_code` (FK ref table) | `categoria_de_item` | **GH** | GH overwrite siempre |
| `unit_code` (FK ref table) | `unidad` | **GH** | GH overwrite siempre |
| `pricing_model` (siempre `flat` Fase 1) | `hs_pricing_model` | **GH** | GH overwrite siempre |
| `product_classification` (siempre `standalone` Fase 1) | `hs_product_classification` | **GH** | GH overwrite siempre |
| `bundle_type_code` (siempre `none` Fase 1) | `hs_bundle_type` | **GH** | GH overwrite siempre |
| `tax_category_code` (FK ref table) | `hs_tax_category` | **GH** | GH overwrite siempre |
| `is_recurring`, `recurring_billing_period_code`, `recurring_billing_frequency_code` | `recurringbillingfrequency`, `hs_recurring_billing_period` | **GH** | GH overwrite siempre |
| `is_archived` | `hs_status` (active/inactive) | **GH** | GH overwrite siempre |
| `business_line_code` | `gh_business_line` | **GH** | GH overwrite siempre |
| `marketing_url` | `hs_url` | **GH** | GH overwrite siempre (NULL borra) |
| `image_urls TEXT[]` | `hs_images` | **GH** | GH overwrite siempre (array vacío borra). Fase 1: URLs absolutas HTTPS; upload GCS como follow-up |
| `commercial_owner_member_id` | `hubspot_owner_id` | **HS hasta UI admin (Fase E), luego GH** | Tiebreaker `gh_last_write_at` vs `hs_lastmodifieddate`. Override via flag `owner_gh_authoritative` |
| `commercial_owner_assigned_at` | `hubspot_owner_assigneddate` | **HS read-only** | Inbound captura, GH nunca escribe |
| `gh_*` custom props (5) | `gh_*` custom props | **GH** | Solo GH escribe (custom properties read-only para operadores HS desde TASK-563) |
| `hubspot_product_id` | `hs_object_id` | **HS** | HS auto-genera; GH lee y deriva `product_id = GH-PROD-{hs_object_id}` |
| (no field GH) | `hs_folder` | **HS-only** | Ignorado por GH; HS opera independiente |

### Cost guard modification (governance change)

Update [hubspot-outbound-guard.ts:14-31](src/lib/commercial/hubspot-outbound-guard.ts#L14-L31):

```ts
// ANTES (TASK-347): bloqueaba 8 fields
HUBSPOT_FORBIDDEN_PRODUCT_FIELDS = [
  'costOfGoodsSold', 'cost_of_goods_sold',  // ⬅ remover (TASK-587)
  'unitCost', 'unit_cost',                  // ⬅ remover (TASK-587)
  'loadedCost', 'loaded_cost',              // ⬅ remover (TASK-587)
  'marginPct', 'margin_pct',                // mantener
  'targetMarginPct', 'target_margin_pct',   // mantener
  'floorMarginPct', 'floor_margin_pct',     // mantener
  'effectiveMarginPct', 'effective_margin_pct',  // mantener
  'costBreakdown', 'cost_breakdown'         // mantener
]

// DESPUÉS (TASK-587): bloquea 5 fields conceptuales (10 strings)
HUBSPOT_FORBIDDEN_PRODUCT_FIELDS = [
  'marginPct', 'margin_pct',
  'targetMarginPct', 'target_margin_pct',
  'floorMarginPct', 'floor_margin_pct',
  'effectiveMarginPct', 'effective_margin_pct',
  'costBreakdown', 'cost_breakdown'
]
```

JSDoc actualizado:

```ts
/**
 * Fields that Greenhouse MUST NEVER push to HubSpot. Updated by TASK-587:
 *   - costOfGoodsSold: NOW ALLOWED outbound (decision: HubSpot needs unit cost
 *     for native margin reporting; GH remains SoT)
 *   - margin_pct, target_margin_pct, floor_margin_pct, effective_margin_pct:
 *     STILL FORBIDDEN (internal pricing strategy)
 *   - cost_breakdown: STILL FORBIDDEN (internal payroll snapshot with member ids)
 *
 * HubSpot is CRM (deal stage, contact, product metadata + cost). Greenhouse keeps
 * margin/pricing strategy intelligence. Removing margin fields from outbound
 * preserves "costo viene del sistema, no del usuario" for margin specifically.
 */
```

### Currency canonical set (Fase 1)

| Code | Label | Source HubSpot |
|---|---|---|
| CLP | Peso Chileno | `hs_price_clp` |
| USD | US Dollar | `hs_price_usd` |
| CLF | UF (Unidad de Fomento) | `hs_price_clf` |
| COP | Peso Colombiano | `hs_price_cop` |
| MXN | Peso Mexicano | `hs_price_mxn` |
| PEN | Sol Peruano | `hs_price_pen` |

Agregar moneda futura = (1) registrar en `ref.currencies`, (2) HubSpot habilita el field `hs_price_{code}` a nivel portal, (3) middleware mapping table añade entrada. Sin migración.

### Source kind to product type mapping

```sql
INSERT INTO greenhouse_commercial.product_source_kind_mapping (source_kind, hubspot_product_type, notes) VALUES
  ('service',         'service',       'Catálogo de servicios — 1:1 semántico'),
  ('sellable_role',   'service',       'Rol facturable vendido como servicio'),
  ('tool',            'non_inventory', 'Software/licencia, no inventariable'),
  ('overhead_addon',  'non_inventory', 'Add-on operativo, no inventariable'),
  ('manual',          'service',       'Default — operador puede override en UI');
```

### Properties HS deliberadamente no mapeadas (con justificación)

| HS property | Razón |
|---|---|
| `hs_folder` | Estructura HS-internal navegacional. GH usa `business_line + category` como organización ortogonal. Si emerge necesidad de mirror, agregar `hs_folder_id` follow-up |
| `hs_object_source_label`, `hs_object_source_detail_1/2/3`, `hs_merged_object_ids`, `hs_created_by_user_id`, `hs_updated_by_user_id`, `createdate`, `hs_createdate`, `hs_lastmodifieddate` | Sistema HS auto-gestionado; lectura para audit/tiebreaker, sin mapping |

### Owner resolution flow (outbound)

```
ProductCatalogSyncSnapshot.commercialOwnerMemberId
    ↓
loadActorHubSpotOwnerIdentity({ memberId })
    ↓ returns { hubspotOwnerId, candidateEmails }
    ↓
if hubspotOwnerId !== null:
    payload.commercialOwnerEmail = canonicalEmail  // middleware resuelve a id
elif candidateEmails.length > 0:
    middleware /owners/resolve?email=... → si resuelve, persistir back en members.hubspot_owner_id
else:
    no enviar field (preserve HS-side)
```

### Owner resolution flow (inbound)

```
HubSpotGreenhouseProductProfile.owner.ownerHubspotUserId
    ↓
loadHubSpotOwnerBindingByOwnerId(hsOwnerId)
    ↓ returns { memberId, userId, email }
    ↓
if memberId !== null:
    if owner_gh_authoritative === false AND hs_lastmodifieddate > gh_last_write_at:
        commercial_owner_member_id = memberId  // HS wins durante ventana inicial
    else:
        // GH wins, no overwrite
elif binding null:
    log warning a source_sync_runs (owner HS sin contraparte GH)
    commercial_owner_member_id queda NULL
```

### Discovery one-time (Slice A + B)

Antes de migrations, ejecutar reporte:

```bash
pnpm tsx scripts/discovery/hubspot-products-inventory.ts
# Output:
# - 74 productos
# - Distribución de categoria_de_item actuales (probable: vacíos)
# - Distribución de unidad actuales (probable: vacíos)
# - Productos con hs_price_* poblado (probable: 0)
# - Productos con hubspot_owner_id seteado
# - Productos con hs_url seteado
# - Productos con hs_images pobladas (para seed de image_urls durante backfill)
# - Productos con valores no-default en pricing_model/classification/bundle_type
```

El output decide:
- Seed de `product_categories` y `product_units` (si HS ya tiene valores en uso)
- Productos que requieren backfill de owner (Slice D)
- Validación de assumption "0 productos con precio en HS" (Slice B)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migración 1: `product_catalog` extendido con 16 columnas nullable (incluye `image_urls TEXT[]`); backfill corrido desde `greenhouse_finance.products`; tipos Kysely regenerados; `pnpm pg:doctor` green
- [ ] Migración 2: 4 tablas ref creadas y sembradas (`product_categories`, `product_units`, `tax_categories`, `product_source_kind_mapping`); seeds cubren al menos los valores observados en HS Discovery
- [ ] Migración 3+4: `product_catalog_prices` creada; VIEW `product_catalog_default_price` expone compat; `default_unit_price` actuales migrados a 1 fila autoritativa por producto
- [ ] Helper `derivePricesFromAuthoritative` produce las 5 monedas restantes via FX platform; hook reactivo dispara recompute en cambio de FX rate o de precio autoritativo
- [ ] Cost guard modificado: COGS removido del set forbidden, margin/cost_breakdown siguen blocked, JSDoc updated
- [ ] Contrato v2 GH→HS: middleware Cloud Run acepta y aplica los 6 `hs_price_*`, `hs_cost_of_goods_sold`, `hs_product_type`, `hs_rich_text_description`, `hubspot_owner_id`, `categoria_de_item`, `unidad`, `hs_pricing_model=flat`, `hs_product_classification=standalone`, `hs_bundle_type=none`, `hs_url`, `hs_images`, `hs_tax_category`, `recurringbillingfrequency`, `hs_recurring_billing_period`
- [ ] Outbound emite los 6 fields de precio en todo create/update, incluso cuando GH tiene NULL (envía `null` explícito para limpiar)
- [ ] Después de Fase B + C, ningún edit operativo a `hs_price_*` persiste en HubSpot — el siguiente outbound sobrescribe con valor calculado en GH (test E2E)
- [ ] Inbound rehidrata `commercial_owner_member_id` usando `loadHubSpotOwnerBindingByOwnerId`; conflict resolution respeta tiebreaker `gh_last_write_at` vs `hs_lastmodifieddate` y flag `owner_gh_authoritative`
- [ ] Drift detection clasifica drift de price como `pending_overwrite` (no error); drift de category/unidad como `manual_drift`; reporta en `source_sync_runs`
- [ ] Admin UI `/admin/catalogo/productos` operativa: list + detail con 5 tabs (Identidad, Precios, Clasificación, Recurrencia, Metadatos), CRUD funcional, manual sync trigger
- [ ] Capability `commercial.product_catalog.manage` registrada; surface protegida por entitlement
- [ ] Backfill masivo ejecutado: 74 productos rehidratados con contrato v2; los 74 tienen al menos 1 precio en moneda autoritativa post-backfill
- [ ] Reconcile weekly scheduler activo en `ops-worker`; alerta Slack si >5 productos en drift simultáneos
- [ ] Field permissions HS configuradas: catalog fields read-only para operadores; documentado en runbook
- [ ] Runbook actualizado con: nueva policy SoT (tabla completa), decisión COGS desbloqueado, procedimiento field permissions, manual sync flow
- [ ] Test E2E staging: 1 producto creado en GH admin → outbound → verificación en HS sandbox de los 16 fields catalog (incluye `hs_images`) + custom `gh_*` + COGS
- [ ] Spec arquitectura nueva: `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` creado con SoT table + COGS rationale + multi-currency model
- [ ] 42 propiedades HS auditadas, todas con tratamiento explícito documentado en spec o este task

## Verification

> **Tipo umbrella**: verificación primaria es consistencia documental + acceptance criteria. Cada child task agregará su propia verificación técnica (`pnpm lint`, `tsc`, `test`).

- Consistency check: SoT table en Detailed Spec coincide con código real en cada child task al cierre
- `pnpm pg:doctor` post cada migración
- `pnpm test` covers prices derivation, owner resolution flows, cost guard modification
- E2E staging: `scripts/staging-request.mjs POST /api/admin/commercial/products/[id]/sync` valida outbound completo
- HS portal manual verification: producto sample muestra los 15+ fields poblados después de backfill
- Reconcile reporte semanal verificado en Ops Health durante 2 ciclos consecutivos sin drift inesperado

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo vive en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con: child tasks creadas, decisión COGS desbloqueado, fecha de field permissions HS aplicadas, owner SoT flip date (si Fase E completó)
- [ ] `changelog.md` actualizado con: 4 nuevas tablas, contrato v2 middleware, COGS outbound habilitado
- [ ] chequeo de impacto cruzado sobre TASK-549 (cleanup beneficiado), TASK-524 (income bridge desbloqueado), TASK-576 (quote publish desbloqueado), TASK-552 (FX coordination)
- [ ] Spec `GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` linkeado desde `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`
- [ ] TASK-347 actualizada con nota: "Parcialmente supersedido por TASK-587 — COGS desbloqueado outbound; margin/cost_breakdown siguen vigentes"
- [ ] Runbook `docs/operations/product-catalog-sync-runbook.md` refleja policy final
- [ ] Custom property doc `docs/operations/hubspot-custom-properties-products.md` refleja `gh_module_id` follow-up si aplica

## Follow-ups

- **TASK derivada — Tiered pricing support** (si emerge use case): habilitar `hs_pricing_model='tiered'` con tabla de tiers, schemas + outbound + UI
- **TASK derivada — Product bundles & variants**: habilitar `hs_product_classification='bundle'` o `'variant'`, modelar relaciones en GH
- **TASK derivada — Image upload workflow con GCS**: UI uploader con drag-drop, bucket dedicado `greenhouse-product-images`, signed URLs, thumbnail generation, cleanup de imágenes huérfanas. Fase 1 del task acepta URLs absolutas; esta TASK reemplaza el input de URL por uploader completo
- **TASK derivada — `gh_module_id` custom HS property**: link canonical 360 (`service_modules.module_id`) a producto HS para round-trip completo
- **TASK derivada — Multi-jurisdicción tax categories** (coordina con TASK-562): seed MX/CO/PE en `tax_categories`
- **TASK derivada — Admin UI de tablas ref** (categorías, unidades, tax categories): si emerge necesidad de CRUD operativo
- **Coordinación TASK-574**: si absorción del Cloud Run middleware no cerró, definir PR cross-repo coordinado para contrato v2
- **Coordinación TASK-549**: cleanup final del programa parent se beneficia de full-fidelity establecida aquí

## Open Questions

(Ninguna abierta — las 9 decisiones críticas (A)–(I) quedaron cerradas en la fase de diseño con el usuario. Cualquier nueva pregunta surgida en Discovery se levanta como Delta.)
