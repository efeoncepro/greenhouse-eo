# TASK-344 — Quotation Contract Consolidation & Cutover Policy

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `policy`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-344-quotation-contract-consolidation-cutover-policy`
- Legacy ID: `follow-on de GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Consolidar el contrato canónico de Quotation antes de implementar más runtime: source of truth, schema owner, status set, eventos, fuentes de capacity/cost, compatibilidad con `Finance > Cotizaciones` y estrategia de cutover desde el modelo multi-source actual.

## Why This Task Exists

La arquitectura de Quotation ya propone un módulo comercial canónico, pero el repo todavía mantiene otros contratos vivos:

- `greenhouse_finance.quotes` como tabla multi-source actual
- `cotizaciones-multi-source.md` como documentación funcional vigente
- `GREENHOUSE_360_OBJECT_MODEL_V1.md` aún diciendo que Quote no es canónico
- gaps internos en la propia arquitectura de Quotation, por ejemplo:
  - `pending_approval` se usa en el flujo pero no aparece en el `CHECK` de `quotations.status`
  - capacity/cost cita `greenhouse_core.assignments` y `greenhouse_hr.member_capacity_economics`, mientras el repo real expone `greenhouse_core.client_team_assignments` y `greenhouse_serving.member_capacity_economics`

Sin cerrar este contrato primero, las tasks de implementación bajarían a código con reglas contradictorias.

## Goal

- Declarar cuál será el anchor canónico de Quotation y cómo convive con Finance durante el cutover
- Corregir contradicciones documentales antes de tocar runtime
- Dejar explícitos status, eventos, ownership de schema y boundaries entre `finance`, `commercial`, `HubSpot` y `Nubox`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- el contrato documental final debe dejar un source of truth explícito para Quote
- las fuentes de capacity y costing deben alinearse con tablas y readers reales del repo
- cualquier compatibilidad con `Finance > Cotizaciones` debe quedar publicada como política temporal o estable, no como ambigüedad

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/finance/cotizaciones-multi-source.md`
- `docs/tasks/complete/TASK-210-hubspot-quotes-integration.md`
- `docs/tasks/complete/TASK-211-hubspot-products-line-items-integration.md`
- `docs/tasks/to-do/TASK-212-nubox-line-items-sync-multiline-emission.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

### Blocks / Impacts

- `TASK-345`
- `TASK-346`
- `TASK-347`
- `TASK-348`
- `TASK-349`
- `TASK-350`
- `TASK-351`

### Files owned

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/documentation/finance/cotizaciones-multi-source.md`
- `project_context.md`
- `Handoff.md`

## Current Repo State

### Already exists

- architecture target de Quotation en `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- runtime/documentación vigente de quotes multi-source en:
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/documentation/finance/cotizaciones-multi-source.md`
- foundations reales de cost/capacity:
  - `src/lib/member-capacity-economics/store.ts`
  - `greenhouse_serving.member_capacity_economics`
  - `greenhouse_core.client_team_assignments`

### Gap

- el contrato arquitectónico y el runtime/documentación vivos todavía no están reconciliados

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical anchor + status contract

- Definir explícitamente:
  - schema canónico
  - façade de compatibilidad si aplica
  - status válidos, incluyendo `pending_approval` si corresponde
  - ownership de eventos y projections

### Slice 2 — Source alignment

- Corregir referencias de capacity/cost y tablas base según el repo real
- Alinear Quote con `client_team_assignments`, `member_capacity_economics` y `commercial_cost_attribution`

### Slice 3 — Cutover policy

- Documentar cómo se migra desde `greenhouse_finance.quotes` / `quote_line_items` / `products`
- Explicitar qué queda como compatibilidad, qué se depreca y en qué orden

## Out of Scope

- migraciones SQL
- implementación de APIs
- cambios de UI
- sync real con HubSpot o Nubox

## Detailed Spec

La policy debe resolver explícitamente:

- si `greenhouse_commercial.quotations` será el único root canónico
- si `Finance > Cotizaciones` queda como consumer o como façade estable
- si `products` actuales migran o se absorben como `product_catalog`
- cómo se traducen `finance.quote.*` y `commercial.quotation.*` en el catálogo de eventos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Quote` queda declarado documentalmente como objeto canónico o façade explícita, sin ambigüedad
- [ ] El set de status, eventos y fuentes de cost/capacity queda consistente entre arquitectura y repo real
- [ ] La documentación funcional vigente de cotizaciones deja explícito su rol durante el cutover

## Verification

- Revisión manual cross-doc
- Verificar consistencia entre `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`, `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `GREENHOUSE_360_OBJECT_MODEL_V1.md` y `cotizaciones-multi-source.md`

## Closing Protocol

- [ ] Registrar en `project_context.md` si el contrato final cambia la forma oficial de hablar de Quote en Greenhouse
- [ ] Dejar en `Handoff.md` cualquier decisión de cutover que impacte tasks activas de Finance

## Follow-ups

- `TASK-345`
- `TASK-346`
- `TASK-347`

## Open Questions

- si el catálogo de eventos debe converger a `commercial.quotation.*` con aliases de compatibilidad para consumers existentes de `finance.quote.*`
