## Delta 2026-03-30
- `TASK-142` ya expone badge `Risk` heurístico en `Space 360`.
- Esta task queda enfocada en materializar el score/factor breakdown canónico y enchufarlo al `OverviewTab` existente, no en crear una surface nueva.

# TASK-151 — Space Risk Score & Churn Prediction

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Intelligence |
| Sequence | Agency Layer V2 — Phase 3 |

## Summary

Compute a risk score 0-100 per Space from 8 weighted factors: OTD below 70% for 2+ months (+30pts), margin below 10% (+20pts), receivables aging >60 days (+25pts), feedback pending >5 items (+10pts), no client login in 30+ days (+15pts), service in `renewal_pending` without action (+20pts), revenue declining trend (+15pts), RPA deteriorating trend (+10pts). Classify as Low (0-20), Medium (21-50), High (51-75), Critical (76+). Show in Space cards and Space 360.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §5.6 Client Risk Score

## Dependencies & Impact

- **Depende de:** TASK-150 (Health Score — complementary indicator), ICO metrics, Finance metrics, client lifecycle signals (login tracking, feedback)
- **Impacta a:** TASK-152 (Anomaly Detection uses risk score as signal), TASK-158 (Client Lifecycle extends risk model), TASK-159 (Nexa tools expose risk score)
- **Archivos owned:** `src/lib/agency/risk-score.ts`, `src/app/api/agency/spaces/[id]/risk/route.ts`

## Scope

### Slice 1 — Score computation (~5h)

`RiskScorer` with declarative factor registry. Each factor: signal source, condition, points awarded. Aggregate points capped at 100. Classify: Low/Medium/High/Critical. Handle missing signals: skip factor, flag as partial.

### Slice 2 — Serving view (~3h)

`greenhouse_serving.space_risk_scores` table: `space_id`, `score`, `level`, `factors` (JSONB with triggered factors), `is_partial`, `computed_at`. Reactive projection. API: `GET /api/agency/spaces/[id]/risk`.

### Slice 3 — UI (~4h)

Space cards: risk level badge (color-coded). Space 360 Overview: risk score with factor breakdown (which factors triggered, points per factor). Pulse: high-risk spaces list (score >50).

## Acceptance Criteria

- [ ] Risk score computed 0-100 from 8 weighted factors
- [ ] Classification: Low (0-20), Medium (21-50), High (51-75), Critical (76+)
- [ ] Factor breakdown stored in JSONB showing which factors triggered
- [ ] `space_risk_scores` serving view materialized reactively
- [ ] Space cards show risk level badge
- [ ] Space 360 Overview shows risk factor breakdown
- [ ] Pulse lists high-risk spaces
- [ ] Missing signals handled gracefully (partial score flagged)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/risk-score.ts` | New — risk computation + factor registry |
| `src/app/api/agency/spaces/[id]/risk/route.ts` | New — risk score API |
| `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx` | Add risk factor breakdown |
