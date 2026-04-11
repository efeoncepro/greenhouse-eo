# TASK-343 — Commercial Quotation Canonical Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-343-commercial-quotation-canonical-program`
- Legacy ID: `follow-on de GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Coordinar la implementación del módulo canónico de cotizaciones comerciales para que Greenhouse deje de tratar `quotes` solo como un listado multi-source de Finance y pase a usar una capa comercial explicable, conectada con pricing, delivery, HubSpot, Nubox, OC/HES, revenue pipeline y profitability tracking.

## Why This Task Exists

Hoy el repo ya tiene una base útil:

- `TASK-210` integró quotes HubSpot en `greenhouse_finance.quotes`
- `TASK-211` integró productos y line items HubSpot
- `TASK-212` dejó pendiente la paridad Nubox de line items
- `TASK-164` ya materializó OC/HES en Finance

Pero la arquitectura canónica de Quotation va bastante más lejos que ese runtime actual. Existen gaps de contrato entre:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- la documentación funcional `cotizaciones-multi-source`

Sin un programa explícito, el módulo corre el riesgo de bifurcarse entre "quotes multi-source de finance" y "quotation comercial canónica" como dos verdades paralelas.

## Goal

- Consolidar primero el contrato canónico de Quotation y su estrategia de cutover
- Bajar luego a runtime el storage, pricing, governance, UI, quote-to-cash e intelligence del módulo
- Mantener compatibilidad con las surfaces actuales de Finance mientras se institucionaliza la capa comercial canónica

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Quotation debe terminar con un source of truth canónico; no dejar `greenhouse_finance.quotes` y `greenhouse_commercial.quotations` como roots equivalentes
- `HubSpot` sigue siendo CRM y canal de sync; costo, margen, pricing health y profitability siguen perteneciendo a Greenhouse
- La cadena documental `cotización → OC → HES → factura` debe reaprovechar foundations existentes antes de abrir lanes paralelos

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/finance/cotizaciones-multi-source.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-211-hubspot-products-line-items-integration.md`
- `docs/tasks/to-do/TASK-212-nubox-line-items-sync-multiline-emission.md`
- `docs/tasks/complete/TASK-162-canonical-commercial-cost-attribution.md`
- `docs/tasks/complete/TASK-164-purchase-orders-module.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-211-hubspot-products-line-items-integration.md`
- `docs/tasks/to-do/TASK-212-nubox-line-items-sync-multiline-emission.md`
- `docs/tasks/complete/TASK-164-purchase-orders-module.md`

### Blocks / Impacts

- `Finance > Cotizaciones`
- `Finance > Product Catalog`
- `Finance > Purchase Orders`
- `Finance > HES`
- sync HubSpot / Nubox de cotizaciones
- pricing y margen comercial
- pipeline de revenue
- profitability tracking y renewal lifecycle

### Files owned

- `docs/tasks/to-do/TASK-344-quotation-contract-consolidation-cutover-policy.md`
- `docs/tasks/to-do/TASK-345-quotation-canonical-schema-finance-compatibility-bridge.md`
- `docs/tasks/to-do/TASK-346-quotation-pricing-costing-margin-health-core.md`
- `docs/tasks/to-do/TASK-347-quotation-catalog-hubspot-canonical-bridge.md`
- `docs/tasks/to-do/TASK-348-quotation-governance-runtime-approvals-versions-templates.md`
- `docs/tasks/to-do/TASK-349-quotation-workspace-ui-pdf-delivery.md`
- `docs/tasks/to-do/TASK-350-quotation-to-cash-document-chain-bridge.md`
- `docs/tasks/to-do/TASK-351-quotation-intelligence-automation-pipeline-renewals-profitability.md`

## Current Repo State

### Already exists

- `greenhouse_finance.quotes` ya es multi-source por `TASK-210`
- `greenhouse_finance.quote_line_items` y `greenhouse_finance.products` ya existen por `TASK-211`
- surfaces existentes:
  - `src/views/greenhouse/finance/QuotesListView.tsx`
  - `src/views/greenhouse/finance/QuoteDetailView.tsx`
  - `src/views/greenhouse/finance/ProductCatalogView.tsx`
- APIs actuales:
  - `src/app/api/finance/quotes/route.ts`
  - `src/app/api/finance/quotes/[id]/route.ts`
  - `src/app/api/finance/quotes/[id]/lines/route.ts`
  - `src/app/api/finance/quotes/hubspot/route.ts`
- bridges documentales y financieros ya existentes:
  - `src/lib/finance/purchase-order-store.ts`
  - `src/lib/finance/hes-store.ts`
  - `src/lib/nubox/emission.ts`
  - `src/lib/commercial-cost-attribution/store.ts`
  - `src/lib/member-capacity-economics/store.ts`

### Gap

- no existe una secuencia coordinada para transformar la base multi-source actual en el módulo comercial canónico descrito por arquitectura

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato canónico

- `TASK-344` — consolidación documental y política de cutover

### Slice 2 — Foundations de runtime

- `TASK-345` — schema canónico + bridge de compatibilidad con Finance
- `TASK-346` — pricing, costing, margin health y revenue metrics
- `TASK-347` — bridge canónico con HubSpot products / quotes / line items

### Slice 3 — Governance y surfaces

- `TASK-348` — versions, approvals, terms, templates y audit trail
- `TASK-349` — workspace UI + PDF client-safe

### Slice 4 — Operación e inteligencia

- `TASK-350` — cadena quote-to-cash con OC / HES / Nubox
- `TASK-351` — pipeline, renewals y profitability automation

## Out of Scope

- implementación runtime directa dentro de esta umbrella
- rediseño completo del módulo de Deals de HubSpot
- contabilidad ERP full de contratos y revenue recognition

## Detailed Spec

Secuencia recomendada:

1. `TASK-344`
2. `TASK-345`
3. `TASK-346`
4. `TASK-347`
5. `TASK-348`
6. `TASK-349`
7. `TASK-350`
8. `TASK-351`

Dependencias lógicas:

- `344 -> 345, 346, 347, 348, 349, 350, 351`
- `345 -> 346, 347, 348, 349, 350, 351`
- `346 -> 348, 349, 350, 351`
- `347 -> 349`
- `348 -> 349`
- `350 -> 351`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una secuencia explícita de child tasks para contrato, foundation, pricing, sync HubSpot, governance, UI, quote-to-cash e intelligence
- [ ] Cada child task distingue claramente ownership, dependencias y scope
- [ ] El programa deja explícito cómo convive el runtime actual de Finance con el target canónico de Quotation

## Verification

- Revisión manual de consistencia documental
- Verificar que `TASK-344` a `TASK-351` existen y están indexadas correctamente

## Closing Protocol

- [ ] Mantener `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` alineados con el programa

## Follow-ups

- re-priorizar `TASK-349` vs `TASK-350` según si el negocio necesita primero workspace comercial o primero cierre quote-to-cash

## Open Questions

- si el cutover final expondrá rutas `/api/commercial/*` como canonical public surface o si `Finance` seguirá funcionando como façade estable hacia el módulo comercial
