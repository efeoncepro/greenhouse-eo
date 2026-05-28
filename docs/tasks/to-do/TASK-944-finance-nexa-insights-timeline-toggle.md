# TASK-944 — Finance Nexa Insights: habilitar timeline toggle

## Delta 2026-05-28 — Composabilidad con TASK-947 detail page canonical

- **Routing canonical aplicado**: el drill-in desde el Finance Nexa Insights bento usa `/nexa/insights/[id]` top-level (NO `/finance/insights/...`). Patrón canonical alias `/finance/insights/[id]` puede coexistir reusando el mismo shell `NexaInsightDetailView` (TASK-947) con dispatch por dominio (`subject.domain==='finance'` → helper sibling Finance Signal Engine). Decisión arch-architect + greenhouse-ico (2026-05-28).
- **Drill key Finance**: `EO-FAIE-*` (Finance AI Enrichment ID, path separado canonical preservado — `finance_ai_signals`). El resolver del page detail dispatch por prefix incluye este caso.
- **Pre-requisito TASK-947 V1 MVP**: necesita estar shipped antes para que el toggle Finance tenga target funcional. Sin TASK-947, el timeline toggle apunta a 404.
- **NUEVO Depends on**: `TASK-947` (detail page canonical) — agregar a la sección Dependencies.

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|ui`
- Blocked by: `none`
- Branch: `task/TASK-944-finance-nexa-timeline-toggle`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar el toggle "recent"/"timeline" del componente `NexaInsightsBlock` en `FinanceDashboardView` — hoy la única de las 5 surfaces Nexa Insights del portal que no lo muestra. Las otras 4 (Home, Agency ICO, Space 360 Overview, Person 360 Activity) ya pasan `timelineInsights` al block; Finance solo pasa `insights`. Alineación de tratamiento del mismo componente.

## Why This Task Exists

Verificado en mapeo cross-surface (sesión 2026-05-28 post TASK-941/942/943):

| Surface | Timeline toggle |
|---|---|
| Home | ✅ |
| Agency ICO | ✅ |
| Space 360 Overview | ✅ |
| Person 360 Activity | ✅ |
| **Finance Dashboard** | ❌ |

`NexaInsightsBlock` ya soporta el modo timeline; el endpoint `/api/finance/intelligence/nexa-insights` no devuelve el payload `timeline`. Inconsistencia de tratamiento; mejora trivial.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — módulo Finance.
- Patrón canonical: la timeline lee de la tabla append-only de enrichment history (en finance, posiblemente `finance_ai_signal_enrichment_history` si existe; verificar en Discovery).

Reglas obligatorias:
- Reusar `NexaInsightsBlock` y `NexaInsightsTimeline` — no crear UI nueva.
- Microcopy es-CL via `getMicrocopy()` / `greenhouse-nomenclature.ts` (TASK-265).

## Dependencies & Impact

### Depends on

- Ninguna bloqueante.
- (Opcional) `TASK-945` — si se sumó signal lifecycle al block, Finance lo hereda gratis.

### Blocks / Impacts

- `FinanceDashboardView.tsx` (UI).
- `/api/finance/intelligence/nexa-insights/route.ts` (endpoint).
- Posible nueva query a `finance_ai_signal_enrichment_history` si no se está leyendo.

### Files owned

- `src/views/greenhouse/finance/FinanceDashboardView.tsx` — MODIFY (pass `timelineInsights`).
- `src/app/api/finance/intelligence/nexa-insights/route.ts` — MODIFY (return `timeline` payload).
- `src/lib/finance/ai/llm-enrichment-reader.ts` — MODIFY si necesita helper nuevo.

## Current Repo State

### Already exists

- `NexaInsightsBlock` con toggle recent/timeline funcional.
- `NexaInsightsTimeline` MUI Timeline component.
- 4 surfaces ya consumen el modo timeline.
- Finance AI signals + enrichments pipeline (separado de ICO; PG-based).

### Gap

- Endpoint Finance Nexa Insights no devuelve `timeline`.
- FinanceDashboardView no pasa `timelineInsights`.

## Scope

### Slice 1 — Endpoint timeline payload

- Verificar si existe `finance_ai_signal_enrichment_history` (PG). Si no, queda de scope (no se inventa tabla).
- Extender `/api/finance/intelligence/nexa-insights` para devolver `timeline: Array<{...processedAt}>` ordenado DESC.
- Default window: último mes (alineado con las otras surfaces).

### Slice 2 — UI wiring

- En `FinanceDashboardView`, pasar `timelineInsights={nexaInsights.timeline ?? []}` al `NexaInsightsBlock`.
- Verificar visual: el toggle solo aparece cuando `timelineInsights.length > 0` (comportamiento existente).

### Slice 3 — Tests

- Unit test del endpoint (shape `timeline`).
- Smoke staging del Finance dashboard con timeline visible.

## Out of Scope

- Cambiar el modelo de finance signals (DELETE+INSERT en Finance es local; TASK-943 es ICO).
- Crear tabla history nueva si no existe (en ese caso queda como follow-up para Finance).

## Acceptance Criteria

- [ ] Endpoint `/api/finance/intelligence/nexa-insights` devuelve `timeline` array cuando hay enrichments históricos.
- [ ] `FinanceDashboardView` muestra el toggle recent/timeline cuando `timeline.length > 0`.
- [ ] 5 de 5 surfaces Nexa Insights del portal tratan el componente consistentemente.

## Verification

- `pnpm exec tsc --noEmit --pretty false`.
- `pnpm vitest run src/lib/finance src/app/api/finance/intelligence/nexa-insights`.
- Staging: `pnpm staging:request /api/finance/intelligence/nexa-insights --pretty` debe incluir `timeline`.
- Browser smoke en `/finance` con timeline visible.

## Closing Protocol

- [ ] Lifecycle complete + mover a `complete/`.
- [ ] Sync `README.md` + `TASK_ID_REGISTRY.md`.
- [ ] `Handoff.md` + `changelog.md`.
