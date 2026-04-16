# TASK-244 — Nexa Insights Widget en Home Dashboard

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-244-nexa-insights-home-dashboard`
- Legacy ID: `none`

## Summary

Agregar un widget compacto "Top Insights" al Home Dashboard que muestre las 3 señales más críticas cross-Space del período actual. El operador ve un resumen proactivo de lo que requiere atención al entrar al portal, sin navegar a Agency.

## Why This Task Exists

El Home Dashboard es la primera pantalla que ve el operador al iniciar sesión. Hoy muestra shortcuts y estado operativo básico, pero no resalta las señales más urgentes. Los enrichments LLM ya existen — falta un widget que agregue los top N insights cross-Space y los presente de forma compacta.

## Goal

- El Home Dashboard muestra las 3 señales más críticas (severity: critical > warning > info)
- El widget reutiliza el `NexaInsightsBlock` actual limitado a 3 insights; no asumir un `compact mode` inexistente
- La navegación al contexto se resuelve por @mentions clickeables dentro del insight y por el contexto natural del bloque; no asumir click sobre toda la card salvo que se extienda el componente explícitamente
- El widget se refresca al cargar el Home (reader on-demand)

## Architecture Alignment

Revisar y respetar:
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md`

## Dependencies & Impact

### Depends on
- `src/views/greenhouse/home/HomeView.tsx` — vista a modificar
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — reader (agregar top N cross-Space)
- Enrichments en `greenhouse_serving.ico_ai_signal_enrichments`

### Blocks / Impacts
- Todos los usuarios internos ven insights al entrar al portal

### Files owned
- `src/views/greenhouse/home/HomeView.tsx` — modificar
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — agregar `readTopAiLlmEnrichments()`

## Current Repo State

### Already exists
- HomeView con greeting, module grid, operation status, task shortlist, Nexa chat
- `NexaInsightsBlock` reutilizable
- Enrichments cross-Space en PostgreSQL serving

### Gap
- No existe reader que retorne top N enrichments cross-Space ordenados por severidad
- Home no muestra insights proactivos
- `NexaInsightsBlock` no tiene hoy `compact mode`
- El schema snapshot baseline está desactualizado para `ico_ai_signals` / `ico_ai_signal_enrichments`; la referencia real es migraciones + `src/types/db.d.ts`

## Scope

### Slice 1 — Reader top N cross-Space
- Agregar `readTopAiLlmEnrichments(periodYear, periodMonth, limit)` a `llm-enrichment-reader.ts`
- Ordenar por severity (`critical` > `warning` > `info`), luego por `quality_score DESC`, luego por `processed_at DESC`
- Sin filtro de space_id — agrega cross-Space

### Slice 2 — Widget en Home Dashboard
- Agregar sección `Nexa Insights` en HomeView
- Usar `NexaInsightsBlock` actual con `defaultExpanded={true}` y límite de 3 insights
- Posicionar después del greeting y antes de los shortcuts

## Out of Scope
- Personalización por rol del usuario
- Filtros por Space o período en el widget
- Notificaciones push de insights

## Acceptance Criteria
- [ ] `readTopAiLlmEnrichments()` retorna top N enrichments cross-Space
- [ ] Home Dashboard muestra widget con top 3 insights del mes
- [ ] Sin enrichments muestra empty state
- [ ] El ranking sigue `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
- [ ] Las @mentions siguen navegando a `Space 360` y `People` sin romper el contrato actual de `NexaMentionText`
- [ ] `pnpm build` y `pnpm lint` sin errores

## Verification
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`
- Validación visual: `/home` → sección Nexa Insights visible con insights críticos

## Closing Protocol
- [ ] Actualizar docs de arquitectura si corresponde
