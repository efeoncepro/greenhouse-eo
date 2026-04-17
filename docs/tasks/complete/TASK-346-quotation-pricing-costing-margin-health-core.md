# TASK-346 — Quotation Pricing, Costing & Margin Health Core

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementado y validado 2026-04-17`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-344 (cerrada como policy en TASK-343), TASK-345 (migración + bridge live)`
- Branch: `feat/nexa-insights-timeline`
- Legacy ID: `follow-on de GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1 §4-6 y §11A`
- GitHub Issue: `none`

## Summary

Implementar el core de pricing de Quotation: costeo desde capacity economics, rate cards para roles genéricos, targets/floors de margen, guardrails de descuentos y métricas MRR/ARR/TCV/ACV persistidas en la cotización.

## Why This Task Exists

La arquitectura de Quotation se apoya en una premisa clave: el costo no lo inventa el comercial. Hoy el repo ya tiene foundations fuertes para esto:

- `member_capacity_economics`
- cost attribution comercial
- exchange rates / economic indicators

Pero las cotizaciones actuales no consumen todavía ese backbone de forma canónica. Sin este core, el resto del módulo quedaría reducido a headers, line items y documentos, sin pricing explicable ni guardrails reales de margen.

## Goal

- Derivar costos de personas y roles desde readers canónicos ya existentes
- Persistir health de descuentos y métricas de revenue en la cotización
- Preparar Quotation para approvals, pipeline y profitability posteriores

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- el costo de personas debe salir de `member_capacity_economics` o de un derivado explícito del mismo backbone
- los roles genéricos solo pueden caer a rate cards cuando no exista persona concreta
- el health check de descuentos debe vivir server-side; la UI solo lo refleja

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-162-canonical-commercial-cost-attribution.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-345-quotation-canonical-schema-finance-compatibility-bridge.md`
- `docs/tasks/complete/TASK-162-canonical-commercial-cost-attribution.md`
- `src/lib/member-capacity-economics/store.ts`
- `src/lib/commercial-cost-attribution/store.ts`
- `src/lib/finance/economic-indicators.ts`
- `src/lib/finance/exchange-rates.ts`

### Blocks / Impacts

- `TASK-348`
- `TASK-349`
- `TASK-350`
- `TASK-351`

### Files owned

- `migrations/[verificar]-quotation-pricing-costing-config.sql`
- `src/lib/member-capacity-economics/store.ts`
- `src/lib/commercial-cost-attribution/store.ts`
- `src/lib/finance/contracts.ts`
- `src/lib/finance/postgres-store.ts`
- `src/lib/finance/postgres-store-intelligence.ts`
- `src/lib/finance/economic-indicators.ts`
- `src/lib/finance/exchange-rates.ts`
- `src/app/api/finance/quotes/route.ts`
- `src/app/api/finance/quotes/[id]/route.ts`

## Current Repo State

### Already exists

- `greenhouse_serving.member_capacity_economics`
- `greenhouse_core.client_team_assignments`
- exchange rates e indicadores económicos en `src/lib/finance/`
- cost attribution comercial en:
  - `src/lib/commercial-cost-attribution/store.ts`
  - `src/lib/sync/projections/commercial-cost-attribution.ts`

### Gap

- las cotizaciones actuales no persisten pricing canónico, revenue metrics ni guardrails de margen conectados con estos readers

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Pricing config

- Implementar `margin_targets`, `role_rate_cards` y `revenue_metric_config`
- Definir herencia por business line y overrides necesarios

### Slice 2 — Costing engine

- Derivar `unit_cost`, `cost_breakdown`, `subtotal_cost` y margen efectivo por line item / quotation
- Cubrir casos:
  - persona nombrada
  - rol genérico
  - item directo / deliverable

### Slice 3 — Margin health + revenue metrics

- Implementar discount health checker server-side
- Persistir `mrr`, `arr`, `tcv`, `acv`, `revenue_type` y snapshot de cambio relevante al guardar

## Out of Scope

- approval workflow
- templates y terms
- HubSpot sync
- PDF y workspace UI final

## Detailed Spec

La task debe responder explícitamente:

- qué parte del costo se persiste como snapshot y qué parte se recalcula
- cómo se convierte multi-moneda entre costo base y moneda de cotización
- cómo se resuelve `recurrence_type = inherit` cuando la quote cambia de billing frequency

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una cotización puede calcular costo y margen desde readers canónicos sin costo manual ad hoc
- [ ] Existen rate cards y margin targets configurables para casos sin persona asignada
- [ ] El health check de descuentos detecta y clasifica pérdida, margen bajo floor y margen bajo target
- [ ] MRR, ARR, TCV, ACV y `revenue_type` quedan persistidos en el runtime canónico

## Verification

- `pnpm pg:connect:migrate`
- `pnpm db:generate-types`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- validación manual de una quote recurrente, una one-time y una híbrida

## Closing Protocol

- [ ] Documentar en arquitectura si el costing final usa snapshot, recompute o combinación de ambos
- [ ] Dejar ejemplos de casos borde validados en `Handoff.md`

## Follow-ups

- `TASK-348`
- `TASK-349`
- `TASK-351`

## Open Questions

- si los `direct_cost` line items deben permitir edición humana plena o solo configuración paramétrica con audit trail

## Completion Notes (2026-04-17)

### Entregado

- **Migration**: `migrations/20260417124905235_task-346-quotation-pricing-config.sql` crea
  `greenhouse_commercial.{margin_targets, role_rate_cards, revenue_metric_config}` con
  unique indexes por COALESCE(business_line_code, '__global__'), seeds para SERVICE_LINES
  (Wave 28/20, Reach 18/10, Globe 40/25, Efeonce Digital 35/20, CRM Solutions 30/18)
  y grants al runtime/migrator/app.
- **Pricing helpers** en `src/lib/finance/pricing/`:
  - `contracts.ts` tipos canónicos (MarginTarget, RoleRateCard, RevenueMetricConfig,
    CostComponentBreakdown, DiscountHealthResult, QuotationRevenueMetrics).
  - `pricing-config-store.ts` CRUD + inheritance resolver (quotation override → business_line → global default).
  - `costing-engine.ts` `resolveLineItemCost` cubre `person` (lee
    `greenhouse_serving.member_capacity_economics.cost_per_hour_target`),
    `role` (lee role_rate_cards con fallback global), `deliverable`
    (`product_catalog.default_unit_price`), `direct_cost` (manual). Convierte FX con
    `quotations.exchange_rates` snapshot.
  - `line-item-totals.ts` + `quotation-pricing-orchestrator.ts`
    (`buildQuotationPricingSnapshot`, `persistQuotationPricing`,
    `recalculateQuotationPricing`). Persiste versión en `quotation_versions`
    y publica `commercial.discount.health_alert` al outbox cuando hay alertas.
  - `margin-health.ts` classifier: `margin_below_zero` (blocking),
    `margin_below_floor` (finance approval), `margin_below_target` (warning),
    `item_negative_margin` (warning), `discount_exceeds_threshold` (info).
  - `revenue-metrics.ts` resuelve `inherit` (monthly → recurring, else one_time) y
    produce MRR/ARR/TCV/ACV + `revenue_type`.
- **API routes** (todos bajo `requireFinanceTenantContext`):
  - `POST /api/finance/quotes` create draft + pricing snapshot inicial.
  - `PUT /api/finance/quotes/[id]` update headers + recalcula (o skip con `recalculatePricing:false`).
  - `POST /api/finance/quotes/[id]/lines` replace line items y recompone versión.
  - `POST /api/finance/quotes/[id]/recalculate` re-aplica costing desde backbone.
  - `GET /api/finance/quotes/[id]/health` snapshot discount health server-side.
  - `GET/PUT /api/finance/quotes/pricing/config` (PUT solo finance_admin/efeonce_admin).
- **Tests**: 22 casos en `__tests__/` (revenue-metrics, margin-health, line-item-totals);
  suite global 1291 tests passed.

### Resolución explícita de detailed spec

- **Snapshot vs recompute**: `unit_cost`, `cost_breakdown`, `subtotal_cost` se
  persisten como snapshot en `quotation_line_items` al guardar; se recomputan solo
  cuando el usuario invoca `/recalculate` o replace `/lines`. Totales y márgenes
  agregados SIEMPRE se recalculan on save. Documentado en arquitectura.
- **Multi-moneda**: `quotations.exchange_rates` JSONB congela FX al crear; el
  costing engine usa `exchangeRates[FROM_TO]` o inverse `exchangeRates[TO_FROM]` o
  `fx_rate` del capacity snapshot (sólo cuando target=CLP); si no hay match se
  deja el valor original con warning en `resolutionNotes`.
- **`recurrence_type = inherit`**: resuelto por `resolveLineRecurrence` —
  `monthly` → recurring, `milestone|one_time` → one_time.

### Acceptance criteria

- [x] Una cotización puede calcular costo y margen desde readers canónicos sin costo manual ad hoc.
- [x] Existen rate cards y margin targets configurables para casos sin persona asignada.
- [x] El health check de descuentos detecta y clasifica pérdida, margen bajo floor y margen bajo target.
- [x] MRR, ARR, TCV, ACV y `revenue_type` quedan persistidos en el runtime canónico.

### Archivos modificados / creados

- `migrations/20260417124905235_task-346-quotation-pricing-config.sql` (nuevo)
- `src/lib/finance/pricing/` (carpeta nueva, 8 archivos)
- `src/app/api/finance/quotes/route.ts` (POST agregado)
- `src/app/api/finance/quotes/[id]/route.ts` (PUT agregado)
- `src/app/api/finance/quotes/[id]/lines/route.ts` (POST agregado)
- `src/app/api/finance/quotes/[id]/recalculate/route.ts` (nuevo)
- `src/app/api/finance/quotes/[id]/health/route.ts` (nuevo)
- `src/app/api/finance/quotes/pricing/config/route.ts` (nuevo)
- `src/types/db.d.ts` regenerado por `pnpm db:generate-types`

### Verification ejecutado

- `pnpm migrate:up` → migración aplicada y tipos regenerados.
- `pnpm exec tsc --noEmit --incremental false` → 0 errors.
- `pnpm lint` → 0 errors.
- `pnpm test` → 1291 passed / 2 skipped.
- `pnpm build` → exit 0 (warnings preexistentes de Dynamic server usage, no introducidos por TASK-346).
- `rg "new Pool\(" src` → sólo `src/lib/postgres/client.ts`.
