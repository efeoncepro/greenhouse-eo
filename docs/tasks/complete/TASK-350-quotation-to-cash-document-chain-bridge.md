# TASK-350 — Quotation-to-Cash Document Chain Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementacion`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-345, TASK-346, TASK-348, TASK-212`
- Branch: `task/TASK-350-quotation-to-cash-document-chain-bridge`
- Legacy ID: `follow-on de TASK-164`
- GitHub Issue: `none`

## Summary

Conectar el módulo canónico de Quotation con la cadena operacional real `cotización → OC → HES → factura`, reutilizando las foundations de `purchase_orders`, `hes` y emisión Nubox ya existentes en Finance.

## Why This Task Exists

Greenhouse ya tiene partes valiosas del quote-to-cash:

- módulo de `purchase_orders`
- módulo de `hes`
- emisión Nubox de DTEs

Pero esas piezas aún no orbitan explícitamente alrededor de una cotización canónica con pricing, versiones, line items y lifecycle comercial. El bridge es lo que transforma Quotation en un contrato operativo real, no solo en una propuesta.

## Goal

- Enlazar cotizaciones canónicas con OC, HES e invoice triggers
- Reutilizar foundations existentes sin duplicar módulos
- Hacer visible la progresión documental y los montos autorizados/facturados por quote

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

Reglas obligatorias:

- OC y HES deben colgar de la cotización canónica; no del deal HubSpot ni de un header suelto
- la facturación Nubox debe consumir datos autorizados de HES/quote-to-cash, no reconstruir los line items desde cero sin trazabilidad
- esta task debe reaprovechar `TASK-164` y `TASK-212`, no reabrir sus módulos desde cero

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-164-purchase-orders-module.md`
- `docs/tasks/to-do/TASK-212-nubox-line-items-sync-multiline-emission.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-348-quotation-governance-runtime-approvals-versions-templates.md`
- `docs/tasks/complete/TASK-164-purchase-orders-module.md`
- `docs/tasks/to-do/TASK-212-nubox-line-items-sync-multiline-emission.md`
- `src/lib/finance/purchase-order-store.ts`
- `src/lib/finance/hes-store.ts`
- `src/lib/nubox/emission.ts`

### Blocks / Impacts

- `TASK-351`
- `Finance > Purchase Orders`
- `Finance > HES`
- emisión de facturas ligadas a cotización

### Files owned

- `migrations/[verificar]-quotation-to-cash-bridge.sql`
- `src/lib/finance/purchase-order-store.ts`
- `src/lib/finance/hes-store.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/lib/nubox/emission.ts`
- `src/app/api/finance/purchase-orders/route.ts`
- `src/app/api/finance/purchase-orders/[id]/route.ts`
- `src/app/api/finance/hes/route.ts`
- `src/app/api/finance/hes/[id]/route.ts`
- `src/app/api/finance/income/[id]/emit-dte/route.ts`
- `src/views/greenhouse/finance/PurchaseOrdersListView.tsx`
- `src/views/greenhouse/finance/HesListView.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`

## Current Repo State

### Already exists

- stores y routes de OC:
  - `src/lib/finance/purchase-order-store.ts`
  - `src/app/api/finance/purchase-orders/route.ts`
- stores y routes de HES:
  - `src/lib/finance/hes-store.ts`
  - `src/app/api/finance/hes/route.ts`
- emisión DTE:
  - `src/lib/nubox/emission.ts`
  - `src/app/api/finance/income/[id]/emit-dte/route.ts`

### Gap

- el bridge explícito entre cotización canónica, OC, HES y facturación aún no existe

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Quotation linkage

- Hacer que PO y HES referencien y consuman el anchor canónico de Quotation
- Exponer la trazabilidad documental desde la cotización

### Slice 2 — Authorized vs quoted

- Registrar diferencias entre lo cotizado, lo autorizado por HES y lo efectivamente facturado
- Preparar metadata útil para drift y profitability posterior

### Slice 3 — Billing trigger bridge

- Conectar invoice trigger / emisión Nubox con el quote-to-cash runtime
- Reaprovechar line items y montos autorizados cuando corresponda

## Out of Scope

- revenue recognition contable completo
- cobranza y settlement end-to-end
- rediseño UI completo de OC/HES fuera del bridge a Quotation

## Detailed Spec

La task debe dejar explícito:

- cómo conviven rama simple (sin OC/HES) y rama enterprise
- cuándo una quote se considera `converted`
- qué se factura: quote vigente, HES autorizada, o combinación según branch operativa

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Una cotización puede enlazarse canónicamente con OC y HES (via `purchase_orders.quotation_id` + `service_entry_sheets.quotation_id`, con helpers `linkPurchaseOrderToQuotation` / `linkServiceEntryToQuotation` que validan consistencia y emiten outbox + audit).
- [x] El sistema distingue lo cotizado, lo autorizado y lo facturado (reader `readQuotationDocumentChain` devuelve los tres totales y sus deltas; UI los muestra como KPIs con delta chip).
- [x] La emisión/facturación puede apoyarse en el bridge quote-to-cash con trazabilidad auditable (`income.quotation_id` + `income.source_hes_id`; approve-HES puede encadenar materialización en el mismo handler; todos los cambios pasan por audit log + outbox).
- [x] La rama simple y la rama enterprise quedan explícitamente soportadas (rama simple: `POST /convert-to-invoice` sobre quote aprobada sin PO/HES; rama enterprise: materialización desde HES aprobada con source_hes_id).

## Verification

- `pnpm pg:connect:migrate`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- validación manual de un caso con OC/HES y un caso sin OC/HES

## Closing Protocol

- [ ] Dejar documentado en `Handoff.md` cualquier compatibilidad temporal con flujos legacy de emisión
- [ ] Actualizar documentación funcional si OC/HES cambian de punto de entrada o semántica visible

## Follow-ups

- `TASK-351`

## Open Questions

- si la rama simple debe materializar un pseudo-HES interno o si basta con gatillar facturación directa desde quote aprobada/convertida
