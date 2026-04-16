# TASK-242 — Nexa Insights en Space 360

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-242-nexa-insights-space-360`
- Legacy ID: `none`

## Summary

Agregar el bloque `NexaInsightsBlock` a la tab Overview del Space 360 para que cada Space muestre sus insights AI filtrados por `space_id`. Las señales y enrichments ya existen en PostgreSQL serving; el trabajo real consiste en agregar el reader scoped, extender el snapshot `Space360Detail` y renderizar el bloque en la composición real del Overview.

## Why This Task Exists

Space 360 es la vista ejecutiva principal de un cliente/Space. Muestra KPIs de delivery, finance y team, pero no explica *por qué* las métricas cambiaron ni *qué hacer*. Los enrichments LLM ya existen filtrados por `space_id` pero solo se muestran en Agency ICO — no en el contexto individual del Space donde el operador toma decisiones.

## Goal

- El Space 360 Overview muestra los insights AI relevantes para ese Space
- El operador ve narrativas con @mentions clickeables en contexto del Space
- No se crean nuevas señales — se reutilizan los enrichments existentes del ICO Engine

## Architecture Alignment

Revisar y respetar:
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — contrato de la capa
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — LLM lane
- `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md` — formato de @mentions

Reglas obligatorias:
- Reutilizar `NexaInsightsBlock` sin modificarlo
- Reader filtra por `space_id` (tenant isolation)
- Advisory-only: disclaimer obligatorio

## Dependencies & Impact

### Depends on
- `src/components/greenhouse/NexaInsightsBlock.tsx` — componente existente
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — reader existente (necesita scope por space)
- `src/lib/agency/space-360.ts` — snapshot canónico a extender con payload Nexa
- `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx` — surface real a modificar
- Enrichments materializados en `greenhouse_serving.ico_ai_signal_enrichments`

### Blocks / Impacts
- Cualquier Space activo mostrará insights automáticamente
- Follow-up: Person 360 (TASK-243) puede seguir el mismo patrón

### Files owned
- `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx` — modificar: agregar NexaInsightsBlock
- `src/lib/agency/space-360.ts` — modificar: extender `Space360Detail` con payload Nexa
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — modificar: agregar `readSpaceAiLlmSummary(spaceId, year, month)`

## Current Repo State

### Already exists
- `NexaInsightsBlock` — componente reutilizable con KPIs, lista de insights, @mentions
- `readAgencyAiLlmSummary()` — reader a nivel agency
- `readTopAiLlmEnrichments()` — reader cross-space para Home
- `readMemberAiLlmSummary()` — reader por member para Person 360
- `greenhouse_serving.ico_ai_signal_enrichments` — tabla con campo `space_id`
- Space 360 con tabs: Overview, Team, Services, Delivery, Finance, ICO

### Gap
- No existe reader scoped por `space_id` para enrichments
- `Space360Detail` todavía no entrega payload `nexaInsights`
- Space 360 Overview no muestra insights AI

## Scope

### Slice 1 — Reader scoped por Space
- Agregar `readSpaceAiLlmSummary(spaceId, periodYear, periodMonth)` a `llm-enrichment-reader.ts`
- Reutilizar el patrón de `readMemberAiLlmSummary()` para devolver payload Nexa directo y con orden por severidad / quality / processed time
- Filtrar siempre por `space_id`, `period_year`, `period_month` y `status = 'succeeded'`

### Slice 2 — Extensión del snapshot Space 360
- Extender `Space360Detail` para incluir `nexaInsights`
- Resolver el período actual desde el mismo helper de Space 360 y leer Nexa solo cuando exista `space_id` canónico
- Mantener fallback vacío cuando la vista opere en modo `client_only`

### Slice 3 — Integración en Space 360
- Agregar `NexaInsightsBlock` dentro de `OverviewTab`
- Pasar insights filtrados por el `space_id` del Space actual
- Posicionar el bloque al inicio del Overview, antes del grid principal de dimensiones

## Out of Scope
- Crear nuevas señales o enrichments
- Modificar NexaInsightsBlock
- Agregar insights a otras tabs del Space 360
- Corregir `docs/architecture/schema-snapshot-baseline.sql` como parte de esta task; el drift queda documentado, pero no bloquea

## Acceptance Criteria
- [ ] `readSpaceAiLlmSummary(spaceId)` retorna enrichments filtrados por space
- [ ] `Space360Detail` entrega `nexaInsights` cuando existe `space_id` canónico
- [ ] Space 360 Overview muestra `NexaInsightsBlock` con insights del Space
- [ ] @mentions clickeables navegan a perfiles correctos
- [ ] Space sin enrichments muestra empty state de Nexa
- [ ] `pnpm build` y `pnpm lint` sin errores

## Verification
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`
- Validación visual: `/agency/spaces/[id]` → Overview → bloque Nexa Insights visible

## Audit Corrections — 2026-04-16

- La surface real a modificar no es `Space360View.tsx`, sino `tabs/OverviewTab.tsx`.
- El contrato real a extender es `Space360Detail`; sin eso, la UI no tiene payload Nexa.
- El snapshot SQL baseline de arquitectura está desfasado para la capa `ico_ai_signal_enrichments`; la fuente operativa real es la migración `20260404123559856_task-232-ico-llm-enrichments.sql` y `src/types/db.d.ts`.
- El ecosistema reader actual ya incluye consumers `top` y `member`; el hueco restante de esta task es el scope `space`.

## Closing Protocol
- [x] Actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` con delta
- [x] Actualizar `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con delta

## Completion Notes — 2026-04-16

- Se implementó `readSpaceAiLlmSummary(spaceId, periodYear, periodMonth, limit)` en `src/lib/ico-engine/ai/llm-enrichment-reader.ts`.
- `src/lib/agency/space-360.ts` ahora entrega `nexaInsights` dentro de `Space360Detail`.
- `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx` renderiza `NexaInsightsBlock` al inicio del Overview y cae al empty state compartido cuando no hay insights.
- Validación ejecutada:
  - `pnpm exec vitest run src/lib/ico-engine/ai/llm-enrichment-reader.test.ts src/lib/agency/space-360.test.ts src/views/greenhouse/agency/space-360/Space360View.test.tsx`
  - `pnpm exec eslint src/lib/ico-engine/ai/llm-types.ts src/lib/ico-engine/ai/llm-enrichment-reader.ts src/lib/ico-engine/ai/llm-enrichment-reader.test.ts src/lib/agency/space-360.ts src/lib/agency/space-360.test.ts src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx src/views/greenhouse/agency/space-360/Space360View.test.tsx`
  - `pnpm build`
- Nota de repo: `pnpm lint` sigue fallando por un issue ajeno en `src/app/api/hr/evaluations/summaries/[summaryId]/finalize/route.ts`.
