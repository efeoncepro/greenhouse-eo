# TASK-349 — Quotation Workspace UI & PDF Delivery

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
- Domain: `ui`
- Blocked by: `TASK-345, TASK-346, TASK-347, TASK-348`
- Branch: `task/TASK-349-quotation-workspace-ui-pdf-delivery`
- Legacy ID: `follow-on de Finance > Cotizaciones`
- GitHub Issue: `none`

## Summary

Construir la surface operativa de Quotation para Greenhouse: listado, detalle, edición, preview de health/versiones/términos/templates y generación/descarga de PDF client-safe, sin exponer costos ni márgenes internos.

## Why This Task Exists

El runtime backend por sí solo no cierra el módulo. La operación real necesita una surface donde el comercial y Finance puedan:

- crear y ajustar cotizaciones
- revisar health y approvals
- ver versiones
- construir un PDF presentable al cliente

Hoy las vistas `QuotesListView` y `QuoteDetailView` responden al modelo multi-source vigente, no al módulo comercial canónico completo.

## Goal

- Evolucionar las surfaces actuales de cotizaciones hacia el nuevo runtime canónico
- Renderizar una experiencia de trabajo usable para draft/send/review
- Generar PDFs client-safe conectados al estado vigente de la cotización

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- el PDF cliente-safe no debe exponer costo, margen, breakdown interno ni approval metadata
- la surface debe soportar compatibilidad con `Finance > Cotizaciones` durante el cutover
- los states dinámicos del quote builder no deben romper layout ni asumir datos sync incompletos

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/finance/cotizaciones-multi-source.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-347-quotation-catalog-hubspot-canonical-bridge.md`
- `docs/tasks/to-do/TASK-348-quotation-governance-runtime-approvals-versions-templates.md`
- `src/views/greenhouse/finance/QuotesListView.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`
- `src/views/greenhouse/finance/ProductCatalogView.tsx`

### Blocks / Impacts

- operación diaria de cotizaciones
- delivery del PDF comercial al cliente
- adopción del módulo por Account Leads / Finance

### Files owned

- `src/views/greenhouse/finance/QuotesListView.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`
- `src/views/greenhouse/finance/ProductCatalogView.tsx`
- `src/views/greenhouse/finance/`
- `src/app/api/finance/quotes/route.ts`
- `src/app/api/finance/quotes/[id]/route.ts`
- `src/app/api/finance/quotes/[id]/lines/route.ts`
- `src/app/api/finance/quotes/`

## Current Repo State

### Already exists

- listado actual de cotizaciones:
  - `src/views/greenhouse/finance/QuotesListView.tsx`
- detalle actual:
  - `src/views/greenhouse/finance/QuoteDetailView.tsx`
- catálogo de productos:
  - `src/views/greenhouse/finance/ProductCatalogView.tsx`

### Gap

- las surfaces actuales no cubren versions, health, templates, approvals ni PDF client-safe del modelo canónico

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Workspace shell

- Adaptar listado y detalle a los nuevos campos del runtime canónico
- Hacer visibles health, versiones, status, fuente y trazabilidad necesaria para operar

### Slice 2 — Builder / editing UX

- Integrar line items, catálogo, términos, templates y señales de margin health
- Cubrir draft, save, send y flujos de aprobación en la UI

### Slice 3 — PDF delivery

- Implementar generación, preview y descarga de PDF client-safe
- Asegurar que el documento refleje la versión vigente enviada al cliente

## Out of Scope

- renewals automation
- profitability tracking dashboard
- conciliación contable o billing posterior

## Detailed Spec

La task debe responder:

- si la route visible sigue siendo `/finance/quotes` o si aparece una surface comercial dedicada
- cómo se presentan las quotes heredadas multi-source que no tengan aún todos los campos del modelo canónico
- cómo se comunica al usuario que una quote está en compatibilidad vs plenamente canónica

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El listado y el detalle de cotizaciones consumen el runtime canónico y exponen health/versiones/status relevantes
- [ ] La UI permite crear o editar una quote usando catálogo, line items y términos del módulo
- [ ] Se puede generar y descargar un PDF client-safe alineado a la versión vigente
- [ ] La surface no expone costo ni margen interno al cliente

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- validación manual en preview del flujo draft → send → PDF

## Closing Protocol

- [ ] Validar preview real del PDF o HTML renderizado antes de cerrar
- [ ] Actualizar microcopy/documentación funcional si cambian labels o semántica visible para usuarios

## Follow-ups

- instrumentar analytics de uso del quote workspace si la adopción inicial lo justifica

## Open Questions

- si conviene sostener una sola surface en Finance o abrir una workspace comercial dedicada y dejar Finance como vista resumida
