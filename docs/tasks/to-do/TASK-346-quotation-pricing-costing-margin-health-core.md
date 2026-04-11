# TASK-346 — Quotation Pricing, Costing & Margin Health Core

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-344, TASK-345`
- Branch: `task/TASK-346-quotation-pricing-costing-margin-health-core`
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
