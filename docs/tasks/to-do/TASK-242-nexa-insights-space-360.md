# TASK-242 — Nexa Insights en Space 360

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-242-nexa-insights-space-360`
- Legacy ID: `none`

## Summary

Agregar el bloque `NexaInsightsBlock` a la tab Overview del Space 360 para que cada Space muestre sus insights AI filtrados por `space_id`. Las señales y enrichments ya existen en PostgreSQL serving — solo falta el reader scoped y la integración UI.

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
- `src/views/greenhouse/agency/space-360/Space360View.tsx` — vista a modificar
- Enrichments materializados en `greenhouse_serving.ico_ai_signal_enrichments`

### Blocks / Impacts
- Cualquier Space activo mostrará insights automáticamente
- Follow-up: Person 360 (TASK-243) puede seguir el mismo patrón

### Files owned
- `src/views/greenhouse/agency/space-360/Space360View.tsx` — modificar: agregar NexaInsightsBlock
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — modificar: agregar `readSpaceAiLlmSummary(spaceId, year, month)`

## Current Repo State

### Already exists
- `NexaInsightsBlock` — componente reutilizable con KPIs, lista de insights, @mentions
- `readAgencyAiLlmSummary()` — reader a nivel agency (sin filtro por space)
- `greenhouse_serving.ico_ai_signal_enrichments` — tabla con campo `space_id`
- Space 360 con tabs: Overview, Team, Services, Delivery, Finance, ICO

### Gap
- No existe reader scoped por `space_id` para enrichments
- Space 360 Overview no muestra insights AI

## Scope

### Slice 1 — Reader scoped por Space
- Agregar `readSpaceAiLlmSummary(spaceId, periodYear, periodMonth)` a `llm-enrichment-reader.ts`
- Misma estructura que `readAgencyAiLlmSummary` pero con filtro `WHERE space_id = $X`

### Slice 2 — Integración en Space 360
- Agregar `NexaInsightsBlock` en la tab Overview del Space 360
- Pasar insights filtrados por el `space_id` del Space actual
- Posicionar debajo de los KPIs, antes del contenido de métricas

## Out of Scope
- Crear nuevas señales o enrichments
- Modificar NexaInsightsBlock
- Agregar insights a otras tabs del Space 360

## Acceptance Criteria
- [ ] `readSpaceAiLlmSummary(spaceId)` retorna enrichments filtrados por space
- [ ] Space 360 Overview muestra `NexaInsightsBlock` con insights del Space
- [ ] @mentions clickeables navegan a perfiles correctos
- [ ] Space sin enrichments muestra empty state de Nexa
- [ ] `pnpm build` y `pnpm lint` sin errores

## Verification
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`
- Validación visual: `/agency/spaces/[id]` → Overview → bloque Nexa Insights visible

## Closing Protocol
- [ ] Actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` con delta
