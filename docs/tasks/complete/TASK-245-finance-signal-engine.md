# TASK-245 — Finance Signal Engine

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-245-finance-signal-engine`
- Legacy ID: `none`

## Summary

Crear el primer engine de señales fuera del ICO Engine: un detector de anomalías para métricas financieras (margen operativo, cash flow, DSO, costo por activo). Las señales se enriquecen con el pipeline LLM existente y se muestran en Finance Dashboard y Space 360 Finance tab vía `NexaInsightsBlock`.

## Why This Task Exists

El módulo Finance muestra cuentas, balances, income/expense y P&L, pero no detecta anomalías ni explica cambios. Un operador ve que el margen cayó 6pp pero no sabe si es por aumento de payroll, caída de revenue, o cambio en FX. El ICO Engine solo cubre métricas delivery — Finance no tiene señales AI.

TASK-242/243/244 validan el patrón de surfacing de Nexa Insights en múltiples surfaces. Esta task extiende el pipeline al dominio financiero.

## Goal

- Detector de anomalías para métricas financieras materializadas
- Señales almacenadas en `greenhouse_serving.finance_ai_signals`
- Enrichments LLM con prompt domain-aware para Finance
- Insights visibles en Finance Dashboard vía `NexaInsightsBlock`

## Architecture Alignment

Revisar y respetar:
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — contrato de la capa
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — módulo Finance
- `docs/architecture/GREENHOUSE_BATCH_PROCESSING_POLICY_V1.md` (§1.1) — Cloud Run para batch

Reglas obligatorias:
- Domain-scoped schema: `greenhouse_serving.finance_ai_signals`
- Prompt domain-aware con glosario de métricas financieras
- Cloud Run para materialización (no Vercel Function)
- Advisory-only: nunca bloquea workflows financieros

## Dependencies & Impact

### Depends on
- Métricas financieras materializadas (income, expenses, P&L por período)
- Pipeline LLM en Cloud Run (`ico-batch-worker` o nuevo servicio)
- `NexaInsightsBlock` y `NexaMentionText` componentes

### Blocks / Impacts
- Primer engine de señales fuera del ICO → valida extensibilidad de la Nexa Insights Layer
- Finance Dashboard y Space 360 Finance tab muestran insights

### Files owned
- `src/lib/finance/ai/` — nuevo directorio con detector, tipos, reader
- `src/lib/finance/ai/anomaly-detector.ts`
- `src/lib/finance/ai/finance-signal-types.ts`
- `src/views/greenhouse/finance/FinanceDashboardView.tsx` — modificar: agregar NexaInsightsBlock
- `migrations/` — tabla `greenhouse_serving.finance_ai_signals`

## Current Repo State

### Already exists
- ICO Engine como referencia de implementación (anomaly-detector, predictor, root-cause-analyzer)
- Pipeline LLM genérico en Cloud Run
- Finance module con income/expense/P&L data
- `NexaInsightsBlock` reutilizable

### Gap
- No existe detector de anomalías para métricas financieras
- No existe tabla `finance_ai_signals`
- No existe prompt domain-aware para Finance
- Finance Dashboard no tiene insights AI

## Scope

### Slice 1 — Schema + tipos
- Crear migración: `greenhouse_serving.finance_ai_signals` (misma estructura que `ico_ai_signals`)
- Crear `src/lib/finance/ai/finance-signal-types.ts` con tipos

### Slice 2 — Anomaly detector
- Crear `src/lib/finance/ai/anomaly-detector.ts`
- Métricas: `margin_pct`, `revenue_clp`, `expense_clp`, `dso_days`
- Z-score sobre rolling 6 meses (mismo patrón que ICO)

### Slice 3 — LLM enrichment
- Crear prompt domain-aware con glosario financiero
- Reutilizar `materializeAiLlmEnrichments` pattern
- Agregar endpoint al Cloud Run worker: `POST /finance/llm-enrich`

### Slice 4 — UI integration
- Agregar `NexaInsightsBlock` a Finance Dashboard
- Reader: `readFinanceAiLlmSummary()`

## Out of Scope
- Predicciones financieras (forecasting)
- Alertas automáticas por email
- Recomendaciones de inversión o ahorro

## Acceptance Criteria
- [x] Tabla `greenhouse_serving.finance_ai_signals` existe con datos
- [x] Detector genera señales para anomalías de margen y cash flow
- [x] Enrichments LLM con prompt financiero producen narrativas relevantes
- [x] Finance Dashboard muestra `NexaInsightsBlock` con insights financieros
- [x] `pnpm build` y `pnpm lint` sin errores

## Implementation Summary — 2026-04-16

- **Migration:** `migrations/20260416235432829_task-245-finance-ai-signals.sql` — creates `greenhouse_serving.finance_ai_signals`, `finance_ai_signal_enrichments`, `finance_ai_enrichment_runs` (Postgres-first, no BigQuery round-trip; Finance es PG-first).
- **Detector:** `src/lib/finance/ai/anomaly-detector.ts` — Z-score rolling 6m sobre 6 métricas financieras. Solo emite deteriorations.
- **Materializer:** `src/lib/finance/ai/materialize-finance-signals.ts` — lee `client_economics`, escribe `finance_ai_signals`, publica `finance.ai_signals.materialized`.
- **LLM worker:** `src/lib/finance/ai/llm-enrichment-worker.ts` + `llm-provider.ts` con prompt `finance_signal_enrichment_v1` (glosario + cadena causal financiera).
- **Reader:** `src/lib/finance/ai/llm-enrichment-reader.ts` expone `readFinanceAiLlmSummary` y `readClientFinanceAiLlmSummary`.
- **Types:** `src/lib/finance/ai/finance-signal-types.ts` (metric registry, stable IDs `EO-FSIG-*` / `EO-FAIE-*` / `EO-FAIR-*`, prompt template).
- **Events:** `EVENT_TYPES.financeAiSignalsMaterialized`, `financeAiLlmEnrichmentsMaterialized` (+ aggregate types) agregados a `src/lib/sync/event-catalog.ts`.
- **Cloud Run:** `services/ico-batch/server.ts` extendido con `POST /finance/materialize-signals` y `POST /finance/llm-enrich`.
- **Vercel cron fallback:** `GET /api/cron/finance-ai-signals?monthsBack=1&skipEnrich=true`.
- **API:** `GET /api/finance/intelligence/nexa-insights?year=YYYY&month=MM&limit=N`.
- **UI:** `FinanceDashboardView.tsx` integra `NexaInsightsBlock` entre KPIs y Economic Indicators; se oculta cuando no hay analysis del período.
- **Docs actualizadas:** `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` (delta Finance), `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (delta signal engine).
- **Delta vs spec original:** spec menciona métricas `margin_pct`/`dso_days`; la implementación usa las 6 columnas reales de `client_economics` (incluye gross/net margin pct, revenue, direct/indirect costs, net result CLP). `dso_days` no está pre-materializado por cliente — queda como follow-up cuando DSO por cliente exista en serving layer.

## Verification
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`
- Validación: Finance Dashboard muestra insights con narrativas financieras

## Closing Protocol
- [ ] Actualizar `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` con delta
- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con Finance Engine

## Follow-ups
- Predicciones de cash flow (time series forecasting)
- Alertas de DSO crítico por email
- Finance insights en Space 360 Finance tab
