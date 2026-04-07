# TASK-211 - HubSpot Products & Line Items Bidirectional Integration

## Delta 2026-04-07

- **Complete**: all 9 slices implemented and deployed
- Migration applied: `products` (36 synced) + `quote_line_items` (32 synced) tables
- Cloud Run service deployed: `GET /products`, `POST /products`, `PATCH /products/{id}`, `GET /quotes/{id}/line-items`
- Product catalog UI: `ProductCatalogView.tsx` with margin calculation, create drawer
- Product picker integrated into TASK-210 quote creation drawer
- Line items sync integrated into quote sync (automatic per-quote)
- Cron registered: `hubspot-products-sync` daily at 8 AM

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `finance`

## Summary

Integracion bidireccional del catalogo de productos de HubSpot CRM y los line items de deals/quotes con Greenhouse. **Inbound**: sincronizar el catalogo de productos y los line items de quotes/deals a PostgreSQL. **Outbound**: crear y actualizar productos en HubSpot desde Greenhouse, y asociar line items a quotes outbound (TASK-210 Lane B). Esto cierra el gap de visibilidad sobre que se vende, a que precio, con que margenes, y permite operar el catalogo comercial desde el portal.

## Why This Task Exists

Hoy Greenhouse no tiene visibilidad sobre el catalogo de productos de HubSpot ni sobre el detalle de line items de las cotizaciones y deals. Los services (`greenhouse_core.services`) se sincronizan desde deals, pero sin el desglose de productos/line items que los componen. Esto significa que:

- No se sabe que productos especificos se cotizaron o vendieron a cada cliente
- No hay trazabilidad producto → line item → quote → deal → service → ingreso
- Las cotizaciones (TASK-210) se ven solo a nivel header, sin detalle de lineas
- No se puede analizar mix de productos, pricing trends, o margenes por producto
- La creacion de quotes outbound (TASK-210 Slice 7) necesita poder seleccionar productos del catalogo

## Goal

- Catalogo de productos HubSpot sincronizado a PostgreSQL (inbound)
- Line items de quotes y deals visibles en Greenhouse (inbound)
- Crear/actualizar productos en HubSpot desde Greenhouse (outbound)
- Seleccionar productos del catalogo al crear quotes outbound (sinergia TASK-210)
- Trazabilidad completa: producto → line item → quote/deal → service → ingreso

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_Services_Architecture_v1.md` — ya documenta que Services nacen de Products via Deal Line Items
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- Patron de integracion HubSpot via middleware Cloud Run (`hubspot-greenhouse-integration`). Products y Line Items siguen el mismo patron.
- Products son objetos de catalogo (template); Line Items son instancias transaccionales en deals/quotes.
- Identity resolution: products se identifican por `hubspot_product_id` (hs_object_id). Line items por `hubspot_line_item_id`.
- Migracion DDL via `node-pg-migrate` antes de cualquier deploy.
- Los line items de quotes se conectan con TASK-210 (quote inbound/outbound).

## HubSpot Products API Reference

### Endpoints

| Operacion | Metodo | Endpoint | Notas |
| --- | --- | --- | --- |
| Crear producto | `POST` | `/crm/v3/objects/products` | Crea en catalogo |
| Leer producto | `GET` | `/crm/v3/objects/products/{productId}` | Con `properties` |
| Listar productos | `GET` | `/crm/v3/objects/products` | Paginado (max 100) |
| Actualizar producto | `PATCH` | `/crm/v3/objects/products/{productId}` | Update parcial |
| Buscar productos | `POST` | `/crm/v3/objects/products/search` | Filter groups, sorting |
| Batch create | `POST` | `/crm/v3/objects/products/batch/create` | Hasta 100 por batch |
| Archivar producto | `DELETE` | `/crm/v3/objects/products/{productId}` | Soft delete |

### Propiedades de Product

| Propiedad | Tipo | Writable | Requerido | Notas |
| --- | --- | --- | --- | --- |
| `hs_object_id` | string | No | — | PK auto-generado |
| `hs_product_name` | string | Si | **Si** | Nombre del producto |
| `hs_sku` | string | Si | **Si** | SKU unico dentro de la cuenta |
| `hs_product_description` | text | Si | No | Descripcion |
| `price` | number | Si | No | Precio base unitario |
| `cost_of_goods_sold` | number | Si | No | Costo de venta (para margen) |
| `hs_cost_price` | number | Si | No | Costo por unidad |
| `tax` | number | Si | No | Monto o porcentaje de impuesto |
| `hs_recurring` | boolean | Si | No | Es producto recurrente/suscripcion? |
| `hs_recurring_billing_period` | enum | Si | No | `monthly`, `quarterly`, `annual` |
| `hs_recurring_billing_frequency` | number | Si | No | Numero de periodos |
| `createdate` | datetime | No | — | Auto-generado |
| `hs_lastmodifieddate` | datetime | No | — | Auto-generado |

**Custom properties**: soportadas con prefijo `hs_`. Se pueden agregar categorias, tiers, dimensiones.

**Minimo para crear**:
```json
{
  "properties": {
    "hs_product_name": "Consultoria CRM",
    "hs_sku": "SVC-CRM-001"
  }
}
```

### Catalogo actual de Efeonce en HubSpot

Segun `docs/architecture/Greenhouse_Services_Architecture_v1.md`, el catalogo incluye al menos:

- Licenciamiento HubSpot
- Implementacion & Onboarding
- Consultoria CRM
- Desarrollo Web
- Diseno UX
- Agencia Creativa
- (y otros mapeados a `servicio_especifico` en Services)

## HubSpot Line Items API Reference

### Endpoints

| Operacion | Metodo | Endpoint | Notas |
| --- | --- | --- | --- |
| Crear line item | `POST` | `/crm/v3/objects/line_items` | Puede referenciar un product |
| Leer line item | `GET` | `/crm/v3/objects/line_items/{lineItemId}` | Con properties |
| Listar line items | `GET` | `/crm/v3/objects/line_items` | Paginado |
| Actualizar line item | `PATCH` | `/crm/v3/objects/line_items/{lineItemId}` | Update parcial |
| Buscar line items | `POST` | `/crm/v3/objects/line_items/search` | Filter groups |
| Batch create | `POST` | `/crm/v3/objects/line_items/batch/create` | Hasta 100 por batch |
| Eliminar line item | `DELETE` | `/crm/v3/objects/line_items/{lineItemId}` | Remove de deal/quote |

### Propiedades de Line Item

| Propiedad | Tipo | Writable | Hereda de Product? | Notas |
| --- | --- | --- | --- | --- |
| `hs_object_id` | string | No | — | PK auto-generado |
| `hs_product_id` | string | Si | — | FK al producto (opcional) |
| `hs_product_name` | string | Si | Si (si `hs_product_id` seteado) | Nombre del item |
| `quantity` | number | Si | No | Cantidad/unidades |
| `price` | number | Si | Si (puede override) | Precio unitario para este deal |
| `discount` | number | Si | No | Monto de descuento |
| `discount_percentage` | number | Si | No | Descuento como porcentaje |
| `amount` | number | No | — | **Auto-calculado**: qty x price - discount + tax |
| `tax` | number | Si | Si (puede override) | Impuesto |
| `description` | text | Si | No | Descripcion especifica |
| `hs_billing_frequency` | string | Si | Si | `monthly`, `quarterly`, etc. |
| `hs_billing_period` | number | Si | Si | Duracion del billing |
| `hs_createdate` | datetime | No | — | Auto-generado |

### Relacion Product ↔ Line Item

```
Product (catalogo/template)
  ├── price: 5000 (base)
  ├── tax: 950
  └── hs_recurring: true
        │
        ▼ instanciado como
Line Item (transaccional, en deal/quote)
  ├── hs_product_id: "product-456"  ← FK al template
  ├── quantity: 2
  ├── price: 4500                   ← override negociado
  ├── discount_percentage: 10
  ├── tax: 800                      ← override por region
  └── amount: 8910                  ← auto-calculado
```

- Un Product puede tener N Line Items en diferentes deals/quotes
- Un Line Item **puede existir sin Product** (item custom/one-off)
- Si `hs_product_id` esta seteado y no se pasan price/tax, HubSpot usa los defaults del Product
- Si se pasan, hacen override

### Asociaciones de Line Items

| Objeto padre | Asociacion | Type ID | Semantica |
| --- | --- | --- | --- |
| Quote | `quote_to_line_items` | 67 | Line items de una cotizacion |
| Deal | `deal_to_line_items` | standard | Line items de un deal |
| Invoice | `invoice_to_line_items` | standard | Line items de una factura |
| Product | `product_to_line_items` | standard | Product referenciado |

## Dependencies & Impact

### Depends on

- **Cloud Run integration service** (`hubspot-greenhouse-integration`): necesita endpoints de Products (read + write) y Line Items (read + write).
- **TASK-210** (HubSpot Quotes): Lane B outbound necesita seleccion de productos del catalogo para crear line items en quotes. Lane A inbound puede enriquecerse con detalle de line items.
- **Identity resolution** HubSpot company → `organization_id` ya existente.
- **Services Architecture**: `greenhouse_core.services` ya mapea desde deals; products agrega la capa de catalogo.

### Impacts to

- **TASK-210** (HubSpot Quotes): outbound quote creation consume el catalogo de productos para line items
- **TASK-146** (Service-Level P&L): product cost + line item pricing alimentan el P&L por servicio
- **TASK-154** (Revenue Pipeline Intelligence): product mix y pricing trends
- **TASK-070** (Cost Intelligence Finance UI): COGS por producto enriquece el analysis
- **Services sync** (`service-sync.ts`): puede enriquecerse con product metadata

### Files owned

- `migrations/XXXX_create-products-and-line-items.sql` (nueva migracion)
- `src/lib/hubspot/sync-hubspot-products.ts` (nuevo — inbound catalog sync)
- `src/lib/hubspot/sync-hubspot-line-items.ts` (nuevo — inbound line items sync)
- `src/lib/hubspot/create-hubspot-product.ts` (nuevo — outbound product creation)
- `src/app/api/cron/hubspot-products-sync/route.ts` (nuevo)
- `src/app/api/finance/products/route.ts` (nuevo — CRUD API)
- `src/app/api/finance/products/hubspot/route.ts` (nuevo — outbound creation)
- `src/app/api/finance/quotes/[id]/lines/route.ts` (nuevo — line items de una quote)
- `src/lib/integrations/hubspot-greenhouse-service.ts` (extension: products + line items)
- `src/views/greenhouse/finance/ProductCatalogView.tsx` (nuevo — vista de catalogo)

## Current Repo State

### Ya existe

- `greenhouse_core.services` con `hubspot_service_id`, `hubspot_deal_id` — servicios derivados de deals
- Service sync (`src/lib/services/service-sync.ts`) como patron de referencia
- HubSpot integration service (Cloud Run) con read endpoints para companies, contacts, services
- `src/lib/finance/hubspot.ts` con helpers para BigQuery schema de `hubspot_crm.companies` y `hubspot_crm.deals`
- Income line items API (`/api/finance/income/[id]/lines/`) como patron de referencia para line items en Greenhouse
- `NuboxSaleDetail` type con `lineNumber`, `description`, `quantity`, `unitPrice`, `totalAmount`, `discountPercent`
- TASK-210 documenta el flujo de creacion de line items para quotes outbound
- Services Architecture documenta que Products → Deal → Service

### Gap actual

- **No hay tabla de productos** en PostgreSQL
- **No hay tabla de line items** transaccionales en PostgreSQL (solo Nubox income lines exist)
- **No hay sync de productos** desde HubSpot
- **No hay sync de line items** de deals/quotes desde HubSpot
- **No hay endpoint de products** en el Cloud Run integration service
- **No hay vista de catalogo** de productos en el portal
- **Services no tienen FK a product** — `servicio_especifico` es un enum, no un FK al catalogo

## Scope

### Lane A — Inbound (HubSpot → Greenhouse)

#### Slice 1 - Schema: tablas de productos y line items

- Crear migracion `node-pg-migrate`:

```sql
-- Catalogo de productos (master data)
CREATE TABLE greenhouse_finance.products (
  product_id TEXT PRIMARY KEY,            -- GH-PROD-{hubspot_product_id} o manual UUID
  source_system TEXT NOT NULL DEFAULT 'manual',  -- 'hubspot', 'manual'
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  unit_price NUMERIC,
  cost_of_goods_sold NUMERIC,
  currency TEXT DEFAULT 'CLP',
  tax_rate NUMERIC DEFAULT 0.19,
  is_recurring BOOLEAN DEFAULT FALSE,
  billing_frequency TEXT,                 -- 'monthly', 'quarterly', 'annual'
  billing_period_count INT,
  category TEXT,                          -- categoria libre o enum
  is_active BOOLEAN DEFAULT TRUE,
  -- HubSpot metadata
  hubspot_product_id TEXT,
  hubspot_last_synced_at TIMESTAMPTZ,
  -- Context
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_hubspot ON greenhouse_finance.products (hubspot_product_id);
CREATE INDEX idx_products_sku ON greenhouse_finance.products (sku);
CREATE INDEX idx_products_source ON greenhouse_finance.products (source_system);

-- Line items transaccionales (instancias en quotes/deals)
CREATE TABLE greenhouse_finance.quote_line_items (
  line_item_id TEXT PRIMARY KEY,          -- GH-LI-{hubspot_line_item_id} o manual UUID
  quote_id TEXT NOT NULL REFERENCES greenhouse_finance.quotes(quote_id),
  product_id TEXT REFERENCES greenhouse_finance.products(product_id),
  source_system TEXT NOT NULL DEFAULT 'manual',
  line_number INT,
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC,                   -- auto-calculable o from HubSpot
  is_exempt BOOLEAN DEFAULT FALSE,
  -- HubSpot metadata
  hubspot_line_item_id TEXT,
  hubspot_product_id TEXT,                -- hs_product_id del line item
  hubspot_last_synced_at TIMESTAMPTZ,
  -- Context
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quote_line_items_quote ON greenhouse_finance.quote_line_items (quote_id);
CREATE INDEX idx_quote_line_items_product ON greenhouse_finance.quote_line_items (product_id);
CREATE INDEX idx_quote_line_items_hubspot ON greenhouse_finance.quote_line_items (hubspot_line_item_id);
```

- Regenerar tipos: `pnpm db:generate-types`

#### Slice 2 - Cloud Run integration service: products + line items read endpoints

- Agregar al servicio Cloud Run:

| Endpoint | Metodo | Funcion |
| --- | --- | --- |
| `GET /products` | GET | Catalogo completo de productos |
| `GET /products/{productId}` | GET | Detalle de un producto |
| `GET /quotes/{quoteId}/line-items` | GET | Line items de una quote con product info |
| `GET /deals/{dealId}/line-items` | GET | Line items de un deal con product info |

- Response normalizada para productos:

```typescript
interface HubSpotGreenhouseProductProfile {
  identity: {
    productId: string           // hs_object_id
    name: string                // hs_product_name
    sku: string | null          // hs_sku
    hubspotProductId: string
  }
  pricing: {
    unitPrice: number | null    // price
    costOfGoodsSold: number | null  // cost_of_goods_sold
    currency: string | null
    tax: number | null
  }
  billing: {
    isRecurring: boolean
    frequency: string | null    // hs_recurring_billing_period
    periodCount: number | null  // hs_recurring_billing_frequency
  }
  metadata: {
    description: string | null
    isArchived: boolean
    createdAt: string | null
    lastModifiedAt: string | null
  }
  source: {
    sourceSystem: 'hubspot'
    sourceObjectType: 'product'
    sourceObjectId: string
  }
}
```

- Response normalizada para line items:

```typescript
interface HubSpotGreenhouseLineItemProfile {
  identity: {
    lineItemId: string          // hs_object_id
    hubspotLineItemId: string
    hubspotProductId: string | null  // hs_product_id (FK al template)
  }
  content: {
    name: string                // hs_product_name
    description: string | null
    quantity: number
    unitPrice: number           // price (puede ser override)
    discountPercent: number | null
    discountAmount: number | null
    taxAmount: number | null
    totalAmount: number         // amount (auto-calculado por HubSpot)
  }
  billing: {
    frequency: string | null
    period: number | null
  }
  source: {
    sourceSystem: 'hubspot'
    sourceObjectType: 'line_item'
    sourceObjectId: string
  }
}
```

- Nota: este slice se ejecuta en el repo del Cloud Run service.

#### Slice 3 - Client + sync functions (inbound)

- Extender `hubspot-greenhouse-service.ts`:
  - `getHubSpotGreenhouseProductCatalog()` — lista completa de productos
  - `getHubSpotGreenhouseProduct(productId)` — detalle de un producto
  - `getHubSpotGreenhouseQuoteLineItems(quoteId)` — line items de una quote
  - `getHubSpotGreenhouseDealLineItems(dealId)` — line items de un deal
- Crear `src/lib/hubspot/sync-hubspot-products.ts`:
  - `syncHubSpotProductCatalog()` — fetch catalogo completo → upsert en `greenhouse_finance.products`
  - Idempotency key: `hubspot_product_id`
  - Product ID format: `GH-PROD-{hubspot_product_id}`
  - Outbox event: `finance.product.synced`
- Crear `src/lib/hubspot/sync-hubspot-line-items.ts`:
  - `syncQuoteLineItems(quoteId, hubspotQuoteId)` — fetch line items de una quote → upsert en `quote_line_items`
  - Se ejecuta como parte del quote sync (TASK-210 Slice 3)
  - Line item ID format: `GH-LI-{hubspot_line_item_id}`
  - Resuelve `hubspot_product_id` → `product_id` local si el producto ya esta sincronizado
- Crear `src/app/api/cron/hubspot-products-sync/route.ts`:
  - Readiness gate: HubSpot integration healthy
  - Bearer token auth
  - Logging: products created, updated, archived, errored
  - Frecuencia sugerida: diaria (catalogo cambia poco)

#### Slice 4 - API endpoints (read)

- `GET /api/finance/products` — lista de productos con filtros (source, category, active)
- `GET /api/finance/products/{productId}` — detalle de un producto
- `GET /api/finance/quotes/{quoteId}/lines` — line items de una quote
- Requiere tenant context con permiso finance

#### Slice 5 - UI catalogo de productos

- Crear `ProductCatalogView.tsx`:
  - Tabla con: nombre, SKU, precio, costo, margen, recurrente, fuente
  - Filtros: fuente (HubSpot/Manual), categoria, activo/archivado
  - Chip de fuente: HubSpot (warning) / Manual (secondary)
  - Margen calculado: `(price - cogs) / price * 100`
- Enriquecer quote detail view con line items:
  - Expandir fila de quote para ver line items
  - Mostrar: nombre, cantidad, precio unitario, descuento, total
  - Link a producto del catalogo si existe

### Lane B — Outbound (Greenhouse → HubSpot)

#### Slice 6 - Cloud Run integration service: products write endpoints

- Agregar al servicio Cloud Run:

| Endpoint | Metodo | Funcion |
| --- | --- | --- |
| `POST /products` | POST | Crear producto en catalogo HubSpot |
| `PATCH /products/{productId}` | PATCH | Actualizar producto |
| `DELETE /products/{productId}` | DELETE | Archivar producto |

- Request de creacion:

```typescript
interface HubSpotGreenhouseCreateProductRequest {
  name: string                  // → hs_product_name (requerido)
  sku: string                   // → hs_sku (requerido)
  description?: string          // → hs_product_description
  unitPrice?: number            // → price
  costOfGoodsSold?: number      // → cost_of_goods_sold
  tax?: number                  // → tax
  isRecurring?: boolean         // → hs_recurring
  billingFrequency?: string     // → hs_recurring_billing_period
  billingPeriodCount?: number   // → hs_recurring_billing_frequency
}

interface HubSpotGreenhouseCreateProductResponse {
  hubspotProductId: string
  name: string
  sku: string
}
```

#### Slice 7 - Greenhouse outbound: product creation logic

- Crear `src/lib/hubspot/create-hubspot-product.ts`:
  - `createHubSpotProduct(input)` — call Cloud Run → persist local → outbox event
  - `updateHubSpotProduct(productId, updates)` — update local + push to HubSpot
  - Idempotencia: verificar SKU unico antes de crear
  - Outbox event: `finance.product.created` con `direction: 'outbound'`
- Crear `POST /api/finance/products/hubspot`:
  - Body: `CreateProductRequest`
  - Validaciones: name y sku requeridos, sku unico
  - Response: producto creado con `hubspot_product_id`
- Crear `PATCH /api/finance/products/{productId}/hubspot`:
  - Update bidireccional: local + push a HubSpot
  - Solo para productos con `source_system = 'hubspot'`

#### Slice 8 - UI outbound: crear/editar productos

- Agregar boton "Nuevo producto" en `ProductCatalogView.tsx`:
  - Dialog/drawer con formulario: nombre, SKU, descripcion, precio, costo, recurrente, frecuencia
  - Toggle: "Crear tambien en HubSpot" (default true si integracion activa)
  - Submit: `POST /api/finance/products/hubspot` o `POST /api/finance/products` (manual)
- Edicion inline o drawer para productos existentes
- Sync badge: indicador de si el producto esta sincronizado con HubSpot

#### Slice 9 - Sinergia con TASK-210: product picker para quotes outbound

- Cuando se crea una quote outbound (TASK-210 Slice 9), el formulario de line items ofrece:
  - **Buscar producto del catalogo** (autocomplete sobre `greenhouse_finance.products`)
  - Auto-fill de precio, descripcion, tax rate desde el producto seleccionado
  - Override permitido (precio negociado, descuento, cantidad)
  - **Crear line item sin producto** (item custom one-off)
- Esto conecta TASK-211 (catalogo) con TASK-210 (quotes outbound)

## Out of Scope

- **Inventory management** — Greenhouse no es ERP; productos son catalogo comercial, no stock
- **Product variants/tiers** — primera iteracion es catalogo plano; variantes son follow-up
- **Deal line items write** — solo quote line items en esta task; deal line items son read-only
- **Product pricing rules** — pricing tiers, volume discounts, etc. son de HubSpot nativo
- **BigQuery conformed layer** — primera iteracion es PostgreSQL-first (consistente con patron HubSpot)

## Acceptance Criteria

### Lane A — Inbound

- [ ] Tablas `greenhouse_finance.products` y `greenhouse_finance.quote_line_items` creadas via migracion
- [ ] Cloud Run service expone `GET /products` y `GET /quotes/{id}/line-items`
- [ ] Sync function sincroniza catalogo completo de productos HubSpot a PostgreSQL
- [ ] Line items de quotes se sincronizan como parte del quote sync (TASK-210)
- [ ] Cron `/api/cron/hubspot-products-sync` funciona con readiness gate
- [ ] API `GET /api/finance/products` lista productos con filtros
- [ ] API `GET /api/finance/quotes/{id}/lines` devuelve line items de una quote
- [ ] Vista de catalogo muestra productos con margen, fuente y estado

### Lane B — Outbound

- [ ] Cloud Run service expone `POST /products` y `PATCH /products/{id}`
- [ ] `POST /api/finance/products/hubspot` crea producto en HubSpot y PostgreSQL
- [ ] Producto creado aparece en HubSpot con name, SKU, price, COGS
- [ ] Product picker disponible en formulario de quote outbound (TASK-210)
- [ ] UI permite crear productos desde el catalogo view

### Cross-cutting

- [ ] `pnpm build` sin errores
- [ ] `pnpm lint` sin errores
- [ ] `pnpm test` sin regresiones

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm migrate:status` confirma migraciones aplicadas
- Preview deploy: vista de catalogo muestra productos de HubSpot
- HubSpot: producto creado desde Greenhouse aparece en el catalogo CRM
- Quote con line items: expandir quote muestra detalle de lineas con producto asociado

## Open Questions

- Cuantos productos tiene el catalogo actual de HubSpot en Efeonce? Hay custom properties?
- Se usan product folders/categories en HubSpot? Necesitamos mapearlas?
- Que SKU convention usa el equipo? Hay que validar unicidad cross-system?
- Los line items de deals existentes deben sincronizarse o solo de quotes nuevas?
- Se necesita una vista de margen por producto? (price - COGS)

## Rollout Notes

- Lane A (inbound) es prerequisito para Lane B (outbound) — necesitamos el catalogo sincronizado antes de poder seleccionar productos en quotes outbound.
- Slice 9 (product picker en quotes) depende de que TASK-210 Lane B este implementada.
- El sync de productos puede empezar independiente de TASK-210 (es catalogo master, no transaccional).

## Follow-ups

- **Product pricing history**: tracking de cambios de precio por producto a lo largo del tiempo
- **Product mix analytics**: que productos se venden mas, a que clientes, en que periodos
- **Product margin dashboard**: margen por producto, por BU, tendencias
- **Deal line items sync**: traer line items de deals ademas de quotes
- **Product variants**: tiers, packs, bundles de productos
- **Product ↔ Service bridge**: vincular producto del catalogo con `greenhouse_core.services` existente
