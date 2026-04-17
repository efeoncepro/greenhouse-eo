# TASK-348 — Quotation Governance Runtime: Approvals, Versions, Templates & Audit

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Entregado 2026-04-17`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-344, TASK-345, TASK-346`
- Branch: `task/TASK-348-quotation-governance-runtime-approvals-versions-templates`
- Legacy ID: `follow-on de GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1 §8, §12, §17, §18, §19`
- GitHub Issue: `none`

## Summary

Implementar la gobernanza interna de Quotation: versionado, diffs, approval workflow por excepción, library de términos, templates reutilizables y audit trail inmutable.

## Why This Task Exists

El módulo de cotizaciones no es solo storage y pricing. Para ser operable enterprise necesita:

- versionar cambios comerciales
- disparar aprobaciones cuando el health check lo pida
- reutilizar templates y términos
- dejar trazabilidad de quién cambió qué

Hoy nada de eso está institucionalizado en el runtime de quotes de Finance.

## Goal

- Materializar el runtime de gobernanza de Quotation
- Habilitar `pending_approval`, versiones y diffs de manera auditable
- Preparar el terreno para la UI del quote workspace y para el quote-to-cash posterior

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- approval workflow es por excepción, no requisito universal
- audit log, versions y outbox no son lo mismo; no colapsarlos en un solo mecanismo
- templates y terms deben quedar desacoplados de un cliente específico

## Normative Docs

- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-346-quotation-pricing-costing-margin-health-core.md`
- `src/lib/finance/contracts.ts`
- `src/lib/finance/postgres-store.ts`
- `src/app/api/finance/quotes/route.ts`

### Blocks / Impacts

- `TASK-349`
- `TASK-350`

### Files owned

- `migrations/[verificar]-quotation-governance-runtime.sql`
- `src/lib/finance/contracts.ts`
- `src/lib/finance/postgres-store.ts`
- `src/app/api/finance/quotes/route.ts`
- `src/app/api/finance/quotes/[id]/route.ts`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- status normalizado de quotes en Finance
- detalle básico de cotizaciones en `src/views/greenhouse/finance/QuoteDetailView.tsx`
- outbox e infraestructura reactiva existente en el repo

### Gap

- no existen approval policies/steps, version diff, templates, terms library ni audit trail específico para cotizaciones

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Versions + audit

- Implementar snapshots de versiones y diff entre revisiones
- Implementar audit trail inmutable específico de Quotation

### Slice 2 — Approval workflow

- Implementar `approval_policies` y `approval_steps`
- Conectar el decisioning con el health check de `TASK-346`

### Slice 3 — Terms + templates

- Implementar `terms_library`, `quotation_terms`, `quote_templates` y `quote_template_items`
- Dejar APIs/readers suficientes para el workspace posterior

## Out of Scope

- PDF final al cliente
- UI completa del quote builder
- quote-to-cash con OC/HES/factura

## Detailed Spec

La task debe dejar explícito:

- cómo se genera `pending_approval`
- qué eventos outbox se emiten en approval, versioning y template usage
- qué información se persiste en snapshot vs qué se resuelve al vuelo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Las cotizaciones pueden versionarse con snapshot y diff
- [x] Existe approval workflow por excepción conectado al pricing health
- [x] Templates y terms pueden reutilizarse sin acoplarse a una quote puntual
- [x] El audit trail de Quotation distingue cambios de line items, descuentos, status y decisiones de aprobación

## Completion Summary (2026-04-17)

- Migration `20260417140553325_task-348-quotation-governance-runtime.sql` aplicada. 7 tablas nuevas en `greenhouse_commercial` + seeds iniciales de 3 approval_policies y 6 terms_library.
- Runtime helpers en `src/lib/commercial/governance/` (contracts, audit-log, approval-evaluator, approval-steps-store, policies-store, terms-store, templates-store, versions-store, version-diff).
- API surface extension:
  - Por quote: `/api/finance/quotes/[id]/versions`, `/approve`, `/audit`, `/terms`.
  - Globales: `/api/finance/quotation-governance/approval-policies[/[id]]`, `/terms-library[/[id]]`, `/templates[/[id]]`.
- 8 events nuevos en `event-catalog.ts` + publishers en `src/lib/commercial/quotation-events.ts`.
- UI: tabs General / Versiones / Aprobaciones / Términos / Auditoría en `QuoteDetailView.tsx` y componentes `src/views/greenhouse/finance/governance/*`.
- Doc `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` bumped a v2.5 con delta del runtime governance.
- Verificado: `pnpm lint`, `npx tsc --noEmit --incremental false`, `pnpm test` (1309 passed), `pnpm build` OK.

## Verification

- `pnpm pg:connect:migrate`
- `pnpm db:generate-types`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- validación manual de una quote que gatille aprobación y una que no

## Closing Protocol

- [ ] Actualizar documentación de eventos si el runtime final agrega nuevos outbox events
- [ ] Dejar trazado en `Handoff.md` si algún status legacy queda temporalmente soportado por compatibilidad

## Follow-ups

- `TASK-349`
- `TASK-350`

## Open Questions

- si los templates deben poder guardar pricing explícito o solo estructura + sugerencias de margen
