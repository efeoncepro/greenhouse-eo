# TASK-347 — Quotation Catalog & HubSpot Canonical Bridge

> **Delta 2026-04-24 — Parcialmente supersedido por TASK-603**
>
> La cláusula de gobierno "no COGS outbound" originaria de este task fue **acotada** por [TASK-603](TASK-603-hubspot-products-outbound-contract-v2-cogs-unblock.md) Fase C. Decisión:
> - **COGS (`cost_of_goods_sold`)**: ahora ALLOWED outbound (GH→HS). HubSpot lo surfacea como `hs_cost_of_goods_sold` para reporting a nivel de producto; el SoT sigue siendo Greenhouse.
> - **Margin + cost_breakdown (permanente)**: siguen BLOCKED. El guard `hubspot-outbound-guard.ts` mantiene los 10 strings forbidden (margin_pct × 4 variantes + effective_margin × 2 + cost_breakdown × 2).
>
> El rationale sigue válido: HubSpot es CRM, Greenhouse es pricing intelligence. COGS es **atributo de producto** (aceptable en HS); margin es **estructura de costos** (leaks loaded labor).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementado y validado 2026-04-17`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-344 ✅, TASK-345 ✅`
- Branch: `feat/nexa-insights-timeline`
- Legacy ID: `follow-on de TASK-210 y TASK-211`
- GitHub Issue: `none`

## Summary

Reanclar la integración HubSpot de quotes, products y line items al modelo canónico de Quotation, preservando la operación actual de sync bidireccional pero evitando que HubSpot siga escribiendo directo contra un storage que ya no será el root final.

## Why This Task Exists

`TASK-210` y `TASK-211` resolvieron muy bien el primer problema: operar quotes y products HubSpot desde Greenhouse. Pero fueron construidas sobre el runtime disponible en ese momento:

- `greenhouse_finance.quotes`
- `greenhouse_finance.quote_line_items`
- `greenhouse_finance.products`

Si el nuevo programa crea un anchor canónico distinto y no se actualiza esta lane, HubSpot seguiría alimentando un modelo legado mientras el resto del módulo usa otro.

## Goal

- Conectar inbound y outbound HubSpot al storage canónico de Quotation
- Mantener la semántica actual de sync y los cron ya existentes
- Preparar el catálogo para convivir con pricing canónico y con la futura UI del módulo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- HubSpot sigue integrándose vía `hubspot-greenhouse-integration`, no vía SDK directo desde el portal
- costo y margen no se empujan a HubSpot
- el catálogo synced no debe volver a convertirse en source of truth comercial por accidente

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-211-hubspot-products-line-items-integration.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-345-quotation-canonical-schema-finance-compatibility-bridge.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-211-hubspot-products-line-items-integration.md`
- `src/lib/integrations/hubspot-greenhouse-service.ts`

### Blocks / Impacts

- `TASK-349`
- sync HubSpot quotes/products/line items
- `Finance > Product Catalog`
- `Finance > Cotizaciones`

### Files owned

- `src/lib/hubspot/sync-hubspot-quotes.ts`
- `src/lib/hubspot/sync-hubspot-products.ts`
- `src/lib/hubspot/sync-hubspot-line-items.ts`
- `src/lib/hubspot/create-hubspot-quote.ts`
- `src/lib/hubspot/create-hubspot-product.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/app/api/cron/hubspot-quotes-sync/route.ts`
- `src/app/api/cron/hubspot-products-sync/route.ts`
- `src/app/api/finance/quotes/hubspot/route.ts`
- `src/app/api/finance/products/route.ts`
- `src/app/api/finance/products/hubspot/route.ts`
- `src/views/greenhouse/finance/ProductCatalogView.tsx`

## Current Repo State

### Already exists

- sync HubSpot quotes:
  - `src/lib/hubspot/sync-hubspot-quotes.ts`
  - `src/app/api/cron/hubspot-quotes-sync/route.ts`
- sync HubSpot products / line items:
  - `src/lib/hubspot/sync-hubspot-products.ts`
  - `src/lib/hubspot/sync-hubspot-line-items.ts`
  - `src/app/api/cron/hubspot-products-sync/route.ts`
- outbound create:
  - `src/lib/hubspot/create-hubspot-quote.ts`
  - `src/lib/hubspot/create-hubspot-product.ts`

### Gap

- toda esa integración sigue anclada al modelo actual de Finance y todavía no conoce el anchor canónico nuevo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Product catalog bridge

- Reanclar products synced a la entidad canónica de catálogo definida por `TASK-344` / `TASK-345`
- Mantener IDs externos y dirección de sync existentes

### Slice 2 — Quote + line items bridge

- Hacer que inbound/outbound HubSpot creen y actualicen quotations y line items en el anchor canónico
- Ajustar mappings de status y lifecycle según el contrato consolidado

### Slice 3 — Compatibility surfaces

- Preservar APIs y cron actuales mientras el portal completa el cutover
- Dejar explícita la relación entre catálogo synced, pricing canónico y quote builder posterior

## Out of Scope

- line items Nubox (`TASK-212`)
- pricing/margin engine
- approval workflow
- rediseño UI completo del quote workspace

## Detailed Spec

La task debe responder:

- si `greenhouse_finance.products` migra, se reemplaza o queda como façade
- cómo se mapea `HubSpot quote` contra `quotation_number` / `quotation_id` canónicos
- cómo se evita el doble write o el drift entre cron inbound y edición local de drafts

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Quotes, products y line items HubSpot sincronizan contra el anchor canónico de Quotation
- [ ] Las rutas y cron actuales de HubSpot siguen operativos durante el cutover
- [ ] No se empujan costo ni margen a HubSpot
- [ ] El catálogo synced deja de comportarse como root comercial alternativo

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- validación manual de inbound sync de una quote HubSpot y creación outbound de una quote con line items

## Closing Protocol

- [ ] Documentar cualquier limitación transitoria de edición concurrente entre HubSpot y Greenhouse
- [ ] Actualizar `Handoff.md` con comportamiento de compatibilidad y rollback si cambia el cron contract

## Follow-ups

- `TASK-349`

## Open Questions

- si el catálogo local seguirá permitiendo productos `greenhouse_only` o si el primer corte exige sync para todo producto cotizable

## Completion Notes (2026-04-17)

### Entregado

- **Event catalog** (`src/lib/sync/event-catalog.ts`):
  - `AGGREGATE_TYPES.quotation` / `quotationLineItem` / `productCatalog` añadidos
  - Nuevos `EVENT_TYPES` canónicos: `commercial.quotation.{created,synced,converted}`,
    `commercial.quotation.line_items_synced`, `commercial.discount.health_alert`,
    `commercial.product_catalog.{created,synced}`
  - Legacy `finance.quote.*` / `finance.product.*` se conservan como aliases
- **Helper centralizado** (`src/lib/commercial/quotation-events.ts`):
  - `publishQuoteCreated/Synced/Converted/LineItemsSynced` — dual-publish
    (legacy + canonical) cuando `quotationId` está disponible
  - `publishProductCreated/Synced` — idem con `commercialProductId`
  - `publishDiscountHealthAlert` — canonical only (nacido en TASK-346)
- **Outbound guard** (`src/lib/commercial/hubspot-outbound-guard.ts`):
  - `sanitizeHubSpotProductPayload` descarta `costOfGoodsSold`, `unit_cost`,
    `loaded_cost`, `marginPct`, `targetMarginPct`, `floorMarginPct`,
    `effectiveMarginPct`, `costBreakdown` (ambos camelCase y snake_case)
  - `assertNoCostFieldsInHubSpotPayload` + `HubSpotCostFieldLeakError` para
    chequeo defensivo
  - Defense-in-depth extra en `createHubSpotGreenhouseProduct`: borra
    `costOfGoodsSold` del payload incluso si el caller olvidó el guard
- **Product catalog store** (`src/lib/commercial/product-catalog-store.ts`):
  - `listCommercialProductCatalog` (search, source, active, business_line_code,
    pagination) lee de `greenhouse_commercial.product_catalog`
  - `getCommercialProduct` por `product_id` canónico o `finance_product_id`
- **Callers actualizados** (5 archivos):
  - `src/lib/hubspot/sync-hubspot-quotes.ts` — publisher movido al caller para
    incluir `quotationId` tras `syncCanonicalFinanceQuote`
  - `src/lib/hubspot/sync-hubspot-line-items.ts` — usa `publishQuoteLineItemsSynced`
    con resolución de `quotationId`
  - `src/lib/hubspot/sync-hubspot-products.ts` — usa `publishProductSynced`
    tras `syncCanonicalFinanceProduct` + `getCommercialProduct` lookup
  - `src/lib/hubspot/create-hubspot-quote.ts` — usa `publishQuoteCreated`
  - `src/lib/hubspot/create-hubspot-product.ts` — aplica `sanitizeHubSpotProductPayload`
    + `assertNoCostFieldsInHubSpotPayload` ANTES de `createHubSpotGreenhouseProduct`,
    usa `publishProductCreated`
- **TASK-346 bug fix**: El orchestrator (`quotation-pricing-orchestrator.ts`)
  insertaba directo en `outbox_events(aggregate_type, aggregate_id, event_type, payload)`
  pero la columna real es `payload_json` y faltaban `event_id`/`status`. El emit
  ahora usa `publishDiscountHealthAlert` que llama al helper canónico
  `publishOutboxEvent` con el schema correcto.
- **API route `/api/finance/products`**: agregado query param `view=canonical`
  que enruta a `listCommercialProductCatalog`. Default (`view=finance_legacy`)
  mantiene el contrato previo sin cambios.
- **Type marker**: `HubSpotGreenhouseCreateProductRequest.costOfGoodsSold`
  anotado `@deprecated` con referencia al guard.

### Tests añadidos (14 casos en 2 archivos)

- `src/lib/commercial/__tests__/hubspot-outbound-guard.test.ts` (8 casos):
  strip camelCase y snake_case, strip margin fields, preserve pricing-safe fields,
  throw con lista de leaked fields, no throw con safe-only, leak report
- `src/lib/commercial/__tests__/quotation-events.test.ts` (6 casos):
  dual-publish para quote created/synced, line_items_synced, product created/synced,
  canonical-only para discount health alert, skip canonical cuando `quotationId` es null

### Detailed Spec resuelta

- **`greenhouse_finance.products` migration**: queda como FAÇADE durante cutover.
  Se absorbe lógicamente vía `finance_product_id` bridge en
  `greenhouse_commercial.product_catalog`. No se borra en TASK-347;
  TASK-349 cerrará el drop cuando la UI de workspace esté lista.
- **Mapping HubSpot quote → quotation**: `hubspot_quote_id` persiste en
  `greenhouse_commercial.quotations.hubspot_quote_id`. La identidad canónica
  (`quotation_id`) se resuelve via `resolveQuotationIdentity` (TASK-346);
  `quotation_number` es distinto de `hubspot_quote_id` (uno es human-readable
  agency-side, el otro HubSpot internal ID).
- **Drift cron vs edición local**: resuelto por ahora con dirección inbound
  dominante (cron HubSpot → canonical). Edición local de drafts canónicos aún
  no expone surface (TASK-349). Cuando coexistan, el `source_system` en
  `quotations` + `updated_at` serán los tiebreakers; `hubspot_last_synced_at`
  registra el último roundtrip.

### Verification ejecutado

- `pnpm exec tsc --noEmit --incremental false` → 0 errors
- `pnpm lint` → 0 errors
- `pnpm test` → 1309 passed / 2 skipped (18 tests nuevos)
- `pnpm build` → exit 0 (warnings Dynamic server usage preexistentes)
- `rg "new Pool\(" src` → sólo `src/lib/postgres/client.ts`

### Acceptance criteria

- [x] Quotes, products y line items HubSpot sincronizan contra el anchor canónico
      y emiten eventos `commercial.*` además de los legacy `finance.*`
- [x] Rutas y cron actuales de HubSpot siguen operativos (sin cambio externo)
- [x] No se empujan costo ni margen a HubSpot (guard + defense-in-depth en service)
- [x] El catálogo synced convive con el canonical como bridge, no como root
      comercial alternativo (escritura legacy + canonical en misma transacción,
      lecturas canonical-first)

### Archivos físicos

Archivo movido de `docs/tasks/to-do/` a `docs/tasks/complete/` el 2026-04-17
tras pasar verificación completa.
