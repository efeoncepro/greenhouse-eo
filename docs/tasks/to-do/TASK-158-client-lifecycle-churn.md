# TASK-158 — Client Lifecycle Intelligence & Churn Prediction

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P2 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Intelligence |
| Sequence | Agency Layer V2 — Phase 6 |

## Summary

Track client lifecycle stages: Prospect, Onboarding, Active, Growth, Renewal, Churned. Compute churn risk from 8 signals (extending TASK-151 Risk Score). Detect expansion opportunities (growing revenue, adding services, increasing FTE). Show lifecycle stage and churn risk in Space 360 and Pulse.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §5.6 Client Risk Score, §5.3C Recommendations

## Dependencies & Impact

- **Depende de:** TASK-151 (Risk Score — churn risk extends this), login/engagement tracking, service renewal status data
- **Impacta a:** TASK-159 (Nexa tools query lifecycle state), TASK-154 (Revenue Pipeline uses lifecycle for forecast accuracy)
- **Archivos owned:** `src/lib/agency/client-lifecycle.ts`, `src/app/api/agency/spaces/[id]/lifecycle/route.ts`

## Scope

### Slice 1 — Lifecycle signals + computation (~5h)

Define lifecycle stage transitions: Prospect (HubSpot deal), Onboarding (first service in onboarding stage), Active (1+ services active >1 month), Growth (revenue increasing 3+ months or adding services), Renewal (any service in renewal_pending), Churned (all services closed, no activity 60+ days). `ClientLifecycle` module: compute current stage from signals. Persist stage with transition history.

### Slice 2 — Expansion detection (~4h)

Detect expansion signals: revenue growth >10% for 3 months, new service requests, FTE increase requests, positive feedback trend. Score expansion opportunity 0-100. Generate recommendation: "Space X is growing — consider upselling [service type] based on current engagement."

### Slice 3 — UI (~4h)

Space 360 Overview: lifecycle stage badge with stage icon. Transition timeline showing stage history. Expansion opportunity indicator. Pulse: lifecycle distribution chart (how many spaces in each stage). Churn risk list (spaces at Renewal with high risk score).

## Acceptance Criteria

- [ ] Lifecycle stage computed from signals (Prospect through Churned)
- [ ] Stage transitions persisted with timestamps
- [ ] Expansion opportunities detected from growth signals
- [ ] Space 360 shows lifecycle stage badge and transition timeline
- [ ] Pulse shows lifecycle distribution and churn risk list
- [ ] Expansion recommendation generated for growing spaces
- [ ] Handles spaces with incomplete signal data (best-effort stage classification)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/client-lifecycle.ts` | New — lifecycle computation + expansion detection |
| `src/app/api/agency/spaces/[id]/lifecycle/route.ts` | New — lifecycle API |
| `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx` | Add lifecycle badge + timeline |
