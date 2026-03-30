# TASK-149 — Team Capacity Engine: Alerts & Constraints

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Team |
| Sequence | Agency Layer V2 — Phase 2 |

## Summary

Transform capacity from a static view into a constraint engine. Detect over-allocation (>100% FTE), under-utilization (<30% FTE), and role bottlenecks (0 FTE available in a role). Emit alerts via the notification system (TASK-129 complete). Show capacity alerts in Pulse dashboard and Space 360 Team tab.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §4.3 Team Capacity Engine

## Dependencies & Impact

- **Depende de:** TASK-144 (TeamCapacityStore as data source), TASK-148 (Agency events trigger re-evaluation), notification system (TASK-129 complete)
- **Impacta a:** TASK-152 (Anomaly Detection consumes capacity alerts as signal), TASK-153 (Capacity Forecast extends this with projection), TASK-157 (Skills Matrix adds skill-based constraints)
- **Archivos owned:** `src/lib/agency/capacity-engine.ts`, `src/app/api/agency/capacity/alerts/route.ts`

## Scope

### Slice 1 — Detection rules (~4h)

`CapacityEngine` with configurable rules: `OVER_ALLOCATION_THRESHOLD` (>100% FTE), `UNDER_UTILIZATION_THRESHOLD` (<30% FTE), `ROLE_BOTTLENECK` (0 available FTE in a role category). Evaluate against TeamCapacityStore data. Return `CapacityAlert[]` with severity, affected member/role, suggested action.

### Slice 2 — Alert emission + notification (~4h)

Persist detected alerts. Emit notifications via webhook bus to Operations Lead recipients. Deduplicate: same alert for same member/role within 7 days does not re-notify. Include suggested action text in notification payload.

### Slice 3 — UI indicators (~4h)

Capacity page: alert badges on over-allocated members, warning banner when role bottleneck detected. Space 360 Team tab: utilization bar with color coding (green/yellow/red). Pulse dashboard: capacity health summary card with alert count.

## Acceptance Criteria

- [ ] Over-allocation (>100% FTE) detected and flagged per member
- [ ] Under-utilization (<30% FTE) detected and flagged per member
- [ ] Role bottlenecks (0 available FTE) detected per role category
- [ ] Alerts emit notifications to Operations Lead
- [ ] Deduplication prevents repeated notifications within 7 days
- [ ] Capacity page shows alert indicators on affected members
- [ ] Space 360 Team tab shows utilization with color coding
- [ ] Pulse shows capacity health summary

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/capacity-engine.ts` | New — detection rules + evaluation |
| `src/app/api/agency/capacity/alerts/route.ts` | New — capacity alerts API |
| `src/app/(dashboard)/agency/capacity/page.tsx` | Add alert indicators |
| `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx` | Add utilization color coding |
