## Delta 2026-03-30
- `TASK-142` ya expone badges `Health` y breakdown operativo heurístico en `Space 360`.
- Esta task ya no debe recrear la shell de UI; debe reemplazar la heurística transicional por un score materializado y reutilizar la superficie ya implementada en `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx`.

# TASK-150 — Space Health Score: Composite Indicator

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Muy alto |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Intelligence |
| Sequence | Agency Layer V2 — Phase 3 |

## Summary

Compute a composite health score 0-100 per Space from 4 weighted dimensions: Delivery (40%), Finance (30%), Engagement (15%), Capacity (15%). Materialize in `greenhouse_serving.space_health_scores`. Display in Space cards (Spaces tab), Pulse dashboard, and Space 360 Overview tab. Semaphore: >=80 green, 60-79 yellow, <60 red.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §5.5 Space Health Score, §7.1 Serving views, §7.4 Health score weights registry

## Dependencies & Impact

- **Depende de:** TASK-142 (Space 360 Overview tab as UI surface), ICO metrics (Delivery dimension), Finance metrics (Finance dimension), Capacity data (Capacity dimension), engagement signals (login/feedback)
- **Impacta a:** TASK-151 (Risk Score complements Health Score), TASK-152 (Anomaly Detection uses health as signal), TASK-160 (Enterprise Hardening — declarative weight registry)
- **Archivos owned:** `src/lib/agency/health-score.ts`, `src/app/api/agency/spaces/[id]/health/route.ts`

## Scope

### Slice 1 — Score computation + dimension registry (~5h)

Declarative `HEALTH_DIMENSIONS` registry with weight, signal source, and normalizer per dimension. Delivery: `OTD * 0.6 + RPA_inverse * 0.4`. Finance: `margin_pct * 0.5 + receivables_aging_inverse * 0.5`. Engagement: `feedback_response_rate * 0.5 + login_recency * 0.5`. Capacity: `team_utilization_balance * 1.0`. Composite = weighted average. Handle missing dimensions with partial score + `incomplete` flag.

### Slice 2 — Serving view + projection (~4h)

`greenhouse_serving.space_health_scores` table: `space_id`, `score`, `delivery_score`, `finance_score`, `engagement_score`, `capacity_score`, `is_complete`, `computed_at`. Reactive projection triggered by outbox events (ICO, Finance, capacity changes). Upsert idempotent by `(space_id, period)`.

### Slice 3 — API (~2h)

`GET /api/agency/spaces/[id]/health` returning health score with dimension breakdown. Batch endpoint for all spaces: extend `GET /api/agency/spaces` response to include `healthScore` field.

### Slice 4 — UI adoption in 3 surfaces (~5h)

Space cards (Spaces tab): health score badge with semaphore color. Pulse dashboard: global health summary (average, distribution, worst 3). Space 360 Overview tab: health breakdown with per-dimension semaphore and trend sparkline.

## Acceptance Criteria

- [ ] Health score computed 0-100 from 4 weighted dimensions
- [ ] Semaphore: >=80 green, 60-79 yellow, <60 red
- [ ] Partial scores computed when some dimensions lack data (flagged `incomplete`)
- [ ] `space_health_scores` serving view materialized and refreshed reactively
- [ ] Space cards show health score badge
- [ ] Pulse shows global health distribution
- [ ] Space 360 Overview shows per-dimension breakdown
- [ ] Dimension weights are configurable via declarative registry

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/health-score.ts` | New — computation + dimension registry |
| `src/app/api/agency/spaces/[id]/health/route.ts` | New — health score API |
| `src/app/api/agency/spaces/route.ts` | Extend response with healthScore |
| `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx` | Add health breakdown |
