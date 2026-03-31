# TASK-154 — Revenue Pipeline Intelligence (HubSpot to Forecast)

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Muy alto |
| Effort | Alto |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Intelligence |
| Sequence | Agency Layer V2 — Phase 5 |

## Summary

Connect HubSpot deals pipeline to Finance forecast. Materialize `revenue_pipeline` serving view. Compute best/expected/worst/at-risk scenarios based on pipeline stage probabilities. Link pipeline FTE requirements to capacity forecast (TASK-153). Show in Economics view and Pulse dashboard.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §5.3B Revenue Forecast, §6 Fase 4

## Dependencies & Impact

- **Depende de:** HubSpot integration sync (CRM pipeline data in BigQuery/Postgres), TASK-153 (Capacity Forecast for FTE linking), TASK-143 (Economics view as UI surface)
- **Impacta a:** TASK-159 (Nexa `get_revenue_forecast` tool), TASK-160 (Enterprise Hardening — observability)
- **Archivos owned:** `src/lib/agency/revenue-pipeline.ts`, `src/app/api/agency/revenue-pipeline/route.ts`

## Scope

### Slice 1 — Pipeline sync (~4h)

Consume HubSpot deals from existing sync. Map deal stages to pipeline probabilities (e.g., Qualification 20%, Proposal 50%, Negotiation 75%, Closed Won 100%). Normalize deal amounts to CLP. Filter for deals linked to existing Spaces or new prospects.

### Slice 2 — Forecast computation (~5h)

`RevenuePipelineForecaster`: compute 4 scenarios per month for next 6 months. Best case (all pipeline closes), expected (weighted by probability), worst case (only Closed Won), at-risk (deals with stalled activity >30 days). Output: `RevenueForecast` with `{ month, best, expected, worst, at_risk_amount }`.

### Slice 3 — Capacity linking (~4h)

For each pipeline deal, estimate FTE requirements by role (from service type or manual input). Feed into Capacity Forecast (TASK-153) as "pipeline demand". Show combined view: current + pipeline FTE demand.

### Slice 4 — Serving view (~3h)

`greenhouse_serving.revenue_pipeline` table: `deal_id`, `space_id`, `amount_clp`, `stage`, `probability`, `expected_close_month`, `fte_requirements` (JSONB), `synced_at`. Refresh on HubSpot sync events or daily cron.

### Slice 5 — UI (~5h)

Economics view: revenue forecast section with scenario chart (best/expected/worst bands). At-risk deals table. Pulse: revenue pipeline summary card — expected revenue next 3 months, pipeline health indicator. Drill-down to deal list.

## Acceptance Criteria

- [ ] HubSpot deals mapped to pipeline with stage probabilities
- [ ] 4 forecast scenarios computed (best/expected/worst/at-risk)
- [ ] Pipeline FTE requirements linked to capacity forecast
- [ ] `revenue_pipeline` serving view materialized
- [ ] Economics view shows forecast scenarios with chart
- [ ] Pulse shows pipeline summary card
- [ ] At-risk deals (stalled >30 days) flagged separately
- [ ] Handles missing HubSpot data gracefully (empty pipeline state)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/revenue-pipeline.ts` | New — pipeline sync + forecast |
| `src/app/api/agency/revenue-pipeline/route.ts` | New — pipeline API |
| `src/views/greenhouse/agency/economics/EconomicsView.tsx` | Add forecast section |
| `src/lib/agency/capacity-forecaster.ts` | Extend with pipeline demand input |
