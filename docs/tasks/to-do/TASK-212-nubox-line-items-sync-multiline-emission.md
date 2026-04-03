# TASK-212 - Nubox Line Items Sync & Multi-Line Emission

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`

## Summary

Sincronizar los line items de documentos Nubox (ventas y compras) a PostgreSQL y habilitar la emision multi-linea de DTEs. Hoy el sync de Nubox solo trae headers (totales) sin el desglose de lineas, y la emision de documentos (`emitDte`) solo genera una linea por factura. Esta task cierra ambos gaps: **inbound** trae el detalle completo de cada documento, **outbound** permite emitir DTEs con multiples productos/servicios.

## Why This Task Exists

1. **Inbound gap**: El pipeline Nubox → BigQuery → PostgreSQL sincroniza solo headers de documentos (total, impuestos, cliente). Los line items estan disponibles via `GET /v1/sales/{id}/details` pero no se llaman durante el sync. Esto significa que no se puede ver que productos/servicios componen cada factura o cotizacion de Nubox.

2. **Outbound gap**: `emitDte()` en `src/lib/nubox/emission.ts` crea un DTE con exactamente 1 linea hardcodeada:
   ```typescript
   details: [{
     lineNumber: 1,
     description: income.description || `Servicios profesionales — ${income.invoice_number}`,
     quantity: 1,
     unitPrice: Number(income.subtotal)
   }]
   ```
   Esto no refleja la realidad comercial cuando un servicio se compone de multiples items con cantidades y precios distintos.

3. **Cross-source gap**: Con TASK-211 (HubSpot Products) y TASK-210 (HubSpot Quotes), Greenhouse tendra line items de HubSpot pero no de Nubox. La tabla `greenhouse_finance.quote_line_items` (TASK-211) necesita tambien alimentarse desde Nubox para tener paridad cross-source.

## Goal

- Line items de documentos Nubox sincronizados a PostgreSQL (ventas + compras)
- Cotizaciones Nubox (DTE 52) con sus lineas visibles en la tabla unificada
- Facturas Nubox con desglose de lineas visible en detalle
- Emision multi-linea: crear DTEs con N productos/servicios desde Greenhouse
- Paridad de line items entre fuentes Nubox y HubSpot

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- Los line items de Nubox se almacenan en la misma tabla `greenhouse_finance.quote_line_items` (para quotes DTE 52) y una nueva `greenhouse_finance.income_line_items` (para facturas DTE 33/34/61).
- El sync de line items se ejecuta como paso adicional del pipeline existente (`sync-nubox-to-postgres.ts`), no como pipeline paralelo.
- La emision multi-linea extiende `emitDte()` existente; no crea un flujo separado.
- Nubox **no tiene API de productos/catalogo** — solo line items dentro de documentos. No crear tabla de productos Nubox.

## Nubox Line Items API Reference

### Endpoints disponibles

| Endpoint | Metodo | Estado en codebase | Notas |
| --- | --- | --- | --- |
| `GET /v1/sales/{id}/details` | GET | Implementado (`getNuboxSaleDetails`) | Line items de ventas |
| `GET /v1/purchases/{id}/details` | GET | **No implementado** | Line items de compras |
| `POST /v1/sales/issuance` | POST | Implementado (`issuNuboxSales`) | Crear DTEs con details[] |

### NuboxSaleDetail (lectura)

Tipo existente en `src/lib/nubox/types.ts`:

```typescript
export type NuboxSaleDetail = {
  lineNumber: number        // Numero de linea (1-based)
  description: string       // Descripcion libre del item
  quantity: number           // Cantidad
  unitPrice: number          // Precio unitario
  totalAmount: number        // Total calculado
  discountPercent?: number   // Porcentaje de descuento
  exemptIndicator?: boolean  // true = exento de IVA
}
```

### NuboxIssuanceDetail (escritura)

Tipo existente en `src/lib/nubox/types.ts`:

```typescript
export type NuboxIssuanceDetail = {
  lineNumber: number
  description: string
  quantity: number
  unitPrice: number
  exemptIndicator?: boolean
  discountPercent?: number
}
```

### Limitaciones de Nubox vs HubSpot

| Campo | HubSpot | Nubox |
| --- | --- | --- |
| Product ID / FK | `hs_product_id` (FK al catalogo) | No existe |
| SKU | `hs_sku` | No existe |
| Nombre del producto | `hs_product_name` | `description` (texto libre) |
| Cantidad | `quantity` | `quantity` |
| Precio unitario | `price` (override) | `unitPrice` |
| Descuento | `discount_percentage` + `discount` | `discountPercent` |
| Impuesto | `tax` (monto) | `exemptIndicator` (solo flag binario) |
| Total | `amount` (auto-calculado) | `totalAmount` |
| COGS | `cost_of_goods_sold` | No existe |
| Recurrente | `hs_recurring` | No existe |
| Categoria | custom property | No existe |

**Conclusion**: Nubox es line-item-only (sin catalogo master). Los items se identifican por descripcion, no por ID de producto. La reconciliacion cross-source Nubox ↔ HubSpot debe hacerse por matching de texto/monto, no por FK.

## Dependencies & Impact

### Depends on

- **TASK-211** (HubSpot Products & Line Items): define la tabla `quote_line_items` que esta task reutiliza para quotes Nubox.
- **TASK-163** (Finance Document Type Separation): ya separó quotes de income — esta task respeta esa separacion.
- **Pipeline Nubox existente**: `sync-nubox-raw.ts`, `sync-nubox-conformed.ts`, `sync-nubox-to-postgres.ts` — esta task extiende el paso 3.
- **`emitDte()`** en `src/lib/nubox/emission.ts` — esta task extiende, no reemplaza.

### Impacts to

- **TASK-210** (HubSpot Quotes): quotes Nubox con line items visibles en la misma tabla
- **TASK-211** (HubSpot Products): paridad de line items cross-source
- **TASK-013** (Nubox Finance Reconciliation): line items enriquecen el matching DTE
- **TASK-165** (Nubox Full Data Enrichment, complete): esta task es el follow-on natural para line items
- **Income detail view**: facturas con desglose de lineas

### Files owned

- `migrations/XXXX_create-income-line-items.sql` (nueva migracion)
- `src/lib/nubox/sync-nubox-to-postgres.ts` (extension: sync de line items)
- `src/lib/nubox/emission.ts` (extension: multi-line emission)
- `src/lib/nubox/client.ts` (extension: `getNuboxPurchaseDetails`)
- `src/app/api/finance/income/[id]/lines/route.ts` (update: leer de nueva tabla)
- `src/app/api/finance/quotes/[id]/lines/route.ts` (nuevo o shared con TASK-211)

## Current Repo State

### Ya existe

- `getNuboxSaleDetails(id)` en `src/lib/nubox/client.ts` — implementado y funcional
- `NuboxSaleDetail` y `NuboxIssuanceDetail` types en `src/lib/nubox/types.ts`
- Pipeline Nubox completo: raw → conformed → PostgreSQL (solo headers)
- `emitDte()` en `src/lib/nubox/emission.ts` con emision single-line funcional
- `GET /api/finance/income/[id]/lines/` — endpoint que lee line items de `greenhouse_finance.income_line_items` (tabla ya existe de TASK-165)
- `greenhouse_finance.income_line_items` tabla ya creada con schema basico
- BigQuery `greenhouse_raw.nubox_sales_snapshots` guarda el JSON completo (incluye details si presentes en response)

### Gap actual

- **Line items no se sincronizan**: `sync-nubox-to-postgres.ts` no llama a `getNuboxSaleDetails()` para cada documento
- **`getNuboxPurchaseDetails(id)` no existe**: falta client function para compras
- **Quote line items Nubox no existen**: DTE 52 solo se sincroniza a header en `greenhouse_finance.quotes`
- **Emision single-line**: `emitDte()` hardcodea 1 linea con description genérica
- **No hay UI para agregar multiples lineas** al emitir un DTE
- **BigQuery conformed no tiene line items**: solo totales de documento

## Scope

### Slice 1 - Schema: income_line_items extension + quote_line_items Nubox support

- Si `greenhouse_finance.income_line_items` ya existe pero le faltan columnas Nubox:
  - Agregar `nubox_document_id TEXT`, `source_system TEXT DEFAULT 'manual'`
- Si `greenhouse_finance.quote_line_items` se crea en TASK-211:
  - Agregar columnas Nubox: `nubox_document_id TEXT`, `dte_type_code TEXT`
  - Si TASK-211 no esta implementada aun, crear la tabla aqui con schema compatible
- Regenerar tipos: `pnpm db:generate-types`

### Slice 2 - Inbound: sync line items de ventas Nubox

- Extender `sync-nubox-to-postgres.ts`:
  - Despues de upsert de income/quote, llamar a `getNuboxSaleDetails(nuboxSaleId)` para cada documento
  - Para DTE 33/34/61 (facturas): insertar en `greenhouse_finance.income_line_items`
  - Para DTE 52/COT (cotizaciones): insertar en `greenhouse_finance.quote_line_items`
  - Idempotencia: `DELETE + INSERT` por `nubox_document_id` (reemplazar lineas completas en cada sync)
  - Rate limiting: batch calls con delay para no saturar API de Nubox
- Considerar optimizacion: solo fetch details de documentos nuevos o modificados (comparar `payload_hash`)

### Slice 3 - Inbound: sync line items de compras Nubox

- Implementar `getNuboxPurchaseDetails(id)` en `src/lib/nubox/client.ts`
  - Mismo patron que `getNuboxSaleDetails`
  - Endpoint: `GET /v1/purchases/{id}/details`
- Crear tipo `NuboxPurchaseDetail` (probablemente identico a `NuboxSaleDetail`)
- Extender sync de compras para traer line items a `greenhouse_finance.expense_line_items` (nueva tabla o extension de income_line_items con discriminador)

### Slice 4 - API: line items de income y quotes Nubox

- Actualizar `GET /api/finance/income/[id]/lines/` para leer de tabla sincronizada
- Asegurar que `GET /api/finance/quotes/[id]/lines` (de TASK-211) tambien devuelve line items Nubox
- Response unificado:

```typescript
interface LineItem {
  lineItemId: string
  lineNumber: number
  name: string              // description de Nubox
  description: string | null
  quantity: number
  unitPrice: number
  discountPercent: number | null
  totalAmount: number
  isExempt: boolean
  source: 'nubox' | 'hubspot' | 'manual'
  productId: string | null  // FK a products (null para Nubox)
}
```

### Slice 5 - Outbound: emision multi-linea

- Extender `emitDte()` en `emission.ts`:
  - Aceptar `lineItems?: Array<{ description, quantity, unitPrice, discountPercent?, exemptIndicator? }>`
  - Si se pasan line items, usarlos directamente (override del single-line default)
  - Si no se pasan, mantener el comportamiento actual (1 linea, backward compat)
  - Validaciones: al menos 1 line item, quantity > 0, unitPrice >= 0
  - Suma de line items debe ser consistente con subtotal del income (warning si difiere)
- Actualizar la API de emision para aceptar line items en el body

### Slice 6 - UI: line items en detalle de documentos

- Enriquecer vista de detalle de income (factura):
  - Expandir fila para ver line items
  - Tabla: linea, descripcion, cantidad, precio unitario, descuento, total, exento
- Enriquecer vista de quote detail (si existe) con line items Nubox
- Formulario de emision de DTE:
  - Tabla editable de line items (agregar, editar, eliminar lineas)
  - Auto-calculo de subtotal, IVA, total
  - Validacion: total de lineas = total del documento

## Out of Scope

- **Catalogo de productos Nubox** — Nubox no tiene API de productos; no inventar uno
- **Reconciliacion cross-source de line items** (Nubox ↔ HubSpot por descripcion) — es un follow-up
- **BigQuery conformed line items** — primera iteracion es PostgreSQL-first
- **Line items de gastos bancarios** (Nubox expenses) — son movimientos bancarios sin detalle de items
- **OCR/parsing de PDFs** para extraer line items de documentos que no tienen details en la API

## Acceptance Criteria

### Inbound

- [ ] Line items de ventas Nubox (DTE 33/34/52/61) sincronizados a PostgreSQL
- [ ] `getNuboxPurchaseDetails(id)` implementado en client
- [ ] Line items de compras Nubox sincronizados a PostgreSQL
- [ ] API `GET /api/finance/income/{id}/lines` devuelve line items desde tabla sincronizada
- [ ] API `GET /api/finance/quotes/{id}/lines` devuelve line items Nubox
- [ ] Sync es idempotente: re-sync reemplaza lineas sin duplicados

### Outbound

- [ ] `emitDte()` acepta array de line items y emite DTE multi-linea
- [ ] DTE emitido en Nubox tiene N lineas con description, quantity, unitPrice correctos
- [ ] Backward compat: emision sin line items sigue generando 1 linea (behavior actual)
- [ ] UI de emision permite agregar/editar/eliminar line items

### Cross-cutting

- [ ] `pnpm build` sin errores
- [ ] `pnpm lint` sin errores
- [ ] `pnpm test` sin regresiones

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm migrate:status` confirma migraciones aplicadas
- Cron sync: documentos Nubox muestran line items en PostgreSQL
- API: `GET /api/finance/income/{id}/lines` devuelve lineas reales de Nubox
- Emision: crear DTE con 3 line items → verificar en Nubox que las 3 lineas aparecen
- Preview deploy: expandir factura muestra desglose de lineas

## Open Questions

- Rate limiting: cuantas calls a `/sales/{id}/details` puede hacer el sync por minuto? Necesitamos throttling?
- Backfill: se deben traer line items de documentos historicos ya sincronizados o solo de nuevos?
- Consistencia: si la suma de line items no coincide con el total del header, que hacer? Warning vs block?
- TASK-211 timing: si TASK-211 no esta lista, crear `quote_line_items` aqui o esperar?

## Rollout Notes

- Los slices inbound (1-4) son independientes de los outbound (5-6).
- Slice 2 (sync de ventas) es el de mayor impacto y puede ir primero.
- Slice 5 (multi-line emission) es high-value pero requiere testing cuidadoso con Nubox SII.
- Considerar un feature flag para multi-line emission hasta validar en UAT.

## Follow-ups

- **Line item reconciliation cross-source**: matching Nubox ↔ HubSpot line items por descripcion/monto
- **BigQuery conformed line items**: denormalize line items a BigQuery para analytics
- **Product catalog inference**: clustering de descriptions Nubox para inferir catalogo implicito
- **Line item templates**: templates reutilizables para emisiones frecuentes
- **Expense line items**: si Nubox agrega details a compras bancarias en el futuro
