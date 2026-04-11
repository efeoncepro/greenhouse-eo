# TASK-345 — Quotation Canonical Schema & Finance Compatibility Bridge

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
- Blocked by: `TASK-344`
- Branch: `task/TASK-345-quotation-canonical-schema-finance-compatibility-bridge`
- Legacy ID: `follow-on de TASK-210 y TASK-211`
- GitHub Issue: `none`

## Summary

Implementar la foundation de storage canónico para Quotation y su bridge de compatibilidad con las APIs y surfaces actuales de Finance, de modo que el runtime pueda evolucionar sin romper `Finance > Cotizaciones` ni los syncs ya activos.

## Why This Task Exists

El repo actual ya tiene quotes, products y line items en `greenhouse_finance`, pero el target canónico necesita más estructura:

- quotation header con `pricing_model`, `current_version`, metrics y lifecycle extendido
- versionado explícito
- line items alineados con pricing/costing canónico
- espacio para convivir con HubSpot y Nubox sin dejar dos raíces equivalentes

Antes de pricing, approvals o quote-to-cash, Greenhouse necesita un lugar estable donde esa información viva.

## Goal

- Crear la foundation canónica de Quotation a nivel schema/runtime
- Backfillear o mapear los registros actuales de Finance hacia el nuevo anchor
- Mantener las rutas actuales de Finance operativas sobre el storage canónico o su façade explícita

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- la task debe respetar la policy definida en `TASK-344`
- no dejar `greenhouse_finance.quotes` y el nuevo storage compitiendo como roots equivalentes
- cualquier backfill o compatibilidad debe ser idempotente y auditable

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/finance/cotizaciones-multi-source.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-211-hubspot-products-line-items-integration.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-344-quotation-contract-consolidation-cutover-policy.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-211-hubspot-products-line-items-integration.md`
- `src/app/api/finance/quotes/route.ts`
- `src/lib/finance/postgres-store.ts`

### Blocks / Impacts

- `TASK-346`
- `TASK-347`
- `TASK-348`
- `TASK-349`
- `TASK-350`
- `TASK-351`

### Files owned

- `migrations/[verificar]-quotation-canonical-schema.sql`
- `src/lib/finance/schema.ts`
- `src/lib/finance/contracts.ts`
- `src/lib/finance/canonical.ts`
- `src/lib/finance/postgres-store.ts`
- `src/app/api/finance/quotes/route.ts`
- `src/app/api/finance/quotes/[id]/route.ts`
- `src/app/api/finance/quotes/[id]/lines/route.ts`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `greenhouse_finance.quotes`
- `greenhouse_finance.quote_line_items`
- `greenhouse_finance.products`
- current routes:
  - `src/app/api/finance/quotes/route.ts`
  - `src/app/api/finance/quotes/[id]/route.ts`
  - `src/app/api/finance/quotes/[id]/lines/route.ts`
- setup y backfill operativo:
  - `src/app/api/admin/ops/finance/setup-quotes/route.ts`

### Gap

- no existe aún el storage canónico de Quotation con versionado y contrato suficientemente rico para el target comercial

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema foundation

- Crear el storage canónico de Quotation según la policy de `TASK-344`
- Cubrir al menos quotations, versions y line items con keys estables y metadata de source/cutover

### Slice 2 — Backfill + bridge

- Mapear quotes, line items y products ya existentes al nuevo anchor
- Dejar readers/repositorios que abstraigan la compatibilidad mientras siga existiendo `Finance > Cotizaciones`

### Slice 3 — Finance compatibility

- Ajustar las APIs actuales de Finance para leer/escribir vía el nuevo anchor o façade acordada
- Mantener backward compatibility razonable para consumers actuales del portal

## Out of Scope

- pricing/costing avanzado
- approval workflow
- UI workbench final
- renewals y profitability tracking

## Detailed Spec

La task debe dejar resuelto:

- cómo se representa una quote de HubSpot ya sincronizada dentro del anchor canónico
- cómo conviven `hubspot_quote_id`, `nubox_document_id` y `quotation_id`
- cómo se versiona una quote histórica existente que hoy solo tiene header + line items actuales

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe storage canónico para quotations, versions y line items
- [ ] Las rutas actuales de Finance pueden seguir resolviendo quotes desde el nuevo anchor o façade definida
- [ ] El backfill/mapeo desde `greenhouse_finance.quotes` queda documentado y es idempotente
- [ ] El módulo no deja dos roots equivalentes sin policy de compatibilidad

## Verification

- `pnpm pg:connect:migrate`
- `pnpm db:generate-types`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual de lectura de quotes existentes desde `Finance > Cotizaciones`

## Closing Protocol

- [ ] Actualizar arquitectura/documentación si el placement real difiere de la propuesta inicial
- [ ] Documentar cualquier estrategia de rollback o coexistencia temporal en `Handoff.md`

## Follow-ups

- `TASK-346`
- `TASK-347`
- `TASK-348`

## Open Questions

- si la compatibilidad de Finance conviene materializarla como façade de store, vista SQL o ambos
