# TASK-153 — Capacity Forecast: FTE Projection by Role

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Alto |
| Effort | Alto |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Intelligence |
| Sequence | Agency Layer V2 — Phase 3 |

## Summary

Project FTE demand by role for the next 3 months based on current assignments plus pipeline (services in onboarding/renewal stage). Detect gaps where projected demand exceeds available capacity. Materialize daily in `greenhouse_serving.team_capacity_forecast`. Show in Capacity view and Pulse dashboard. Generate hiring/reasignment suggestions.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §4.3 Team Capacity Engine (Projection), §5.3B Forecasting, §7.1 Serving views (`team_capacity_forecast`)

## Dependencies & Impact

- **Depende de:** TASK-149 (Capacity Engine — current utilization data), service pipeline data (services with `onboarding`/`renewal` stage), TeamCapacityStore
- **Impacta a:** TASK-154 (Revenue Pipeline links FTE requirements), TASK-157 (Skills Matrix adds skill-based gap detection), TASK-159 (Nexa `get_capacity_overview` tool)
- **Archivos owned:** `src/lib/agency/capacity-forecaster.ts`, `src/app/api/cron/capacity-forecast/route.ts`, `src/app/api/agency/capacity/forecast/route.ts`

## Scope

### Slice 1 — Forecast computation (~6h)

`CapacityForecaster`: take current assignments (FTE by member by role) + pipeline services (expected FTE by role from `service_skill_requirements` or estimated from service type). Project demand per role per month for next 3 months. Compare against available FTE. Output: `RoleForecast[]` with `{ role, month, demand_fte, available_fte, gap_fte }`.

### Slice 2 — Serving view + daily cron (~4h)

`greenhouse_serving.team_capacity_forecast` table: `role_category`, `forecast_month`, `demand_fte`, `available_fte`, `gap_fte`, `pipeline_services` (JSONB), `computed_at`. Daily cron `POST /api/cron/capacity-forecast`. Idempotent upsert by `(role_category, forecast_month)`.

### Slice 3 — Gap detection + alerts (~4h)

When `gap_fte < 0` (demand exceeds available): generate alert with suggested actions (hire, reasign from lower-utilization space, reject pipeline service). Emit notification to Operations Lead. Include which pipeline services drive the gap.

### Slice 4 — UI (~5h)

Capacity view: forecast section with role-by-month table showing demand vs available with gap highlighting. Bar chart: FTE demand vs available by role. Pulse: capacity forecast summary card — roles at risk in next 3 months. Link to Capacity view.

## Acceptance Criteria

- [ ] FTE demand projected by role for next 3 months
- [ ] Pipeline services (onboarding/renewal) included in demand projection
- [ ] Gaps detected where demand > available
- [ ] `team_capacity_forecast` serving view refreshed daily
- [ ] Alerts emitted for role gaps with suggested actions
- [ ] Capacity view shows forecast table and chart
- [ ] Pulse shows capacity risk summary
- [ ] Cron is idempotent and handles missing pipeline data gracefully

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/capacity-forecaster.ts` | New — forecast computation |
| `src/app/api/cron/capacity-forecast/route.ts` | New — daily cron |
| `src/app/api/agency/capacity/forecast/route.ts` | New — forecast query API |
| `src/app/(dashboard)/agency/capacity/page.tsx` | Add forecast section |
