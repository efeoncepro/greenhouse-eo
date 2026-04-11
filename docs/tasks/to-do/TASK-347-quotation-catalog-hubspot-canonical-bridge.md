# TASK-347 — Quotation Catalog & HubSpot Canonical Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-344, TASK-345`
- Branch: `task/TASK-347-quotation-catalog-hubspot-canonical-bridge`
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
