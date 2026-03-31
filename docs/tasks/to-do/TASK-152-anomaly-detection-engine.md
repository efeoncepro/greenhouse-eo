# TASK-152 — Anomaly Detection Engine: Rule-Based

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P0 |
| Impact | Muy alto |
| Effort | Alto |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Intelligence |
| Sequence | Agency Layer V2 — Phase 3 |

## Summary

Declarative `AnomalyRule[]` registry detecting: OTD drops (>15pts in 2 periods), margin erosion (<10% for 2 months), capacity overload (>110% FTE for 3 periods), scope creep signals. Materialize detected anomalies in `greenhouse_serving.agency_anomalies`. Emit notifications to affected roles. Surface in Space 360 Overview and Pulse dashboard. Run via hourly cron.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §5.3 Anomaly Detection, §5.4 Implementation, §7.3 Idempotencia, §7.4 Anomaly rules registry

## Dependencies & Impact

- **Depende de:** TASK-150 (Health Score as signal), TASK-149 (Capacity Engine for utilization signals), notification system (TASK-129 complete), `greenhouse_serving` schema
- **Impacta a:** TASK-155 (Scope Intelligence adds rules to registry), TASK-159 (Nexa tools query anomalies), TASK-161 (Permissions + playbook templates for anomaly response), TASK-160 (Enterprise Hardening — observability)
- **Archivos owned:** `src/lib/agency/anomaly-detector.ts`, `src/app/api/cron/agency-anomalies/route.ts`, `src/app/api/agency/anomalies/route.ts`

## Scope

### Slice 1 — Rule registry + detector (~6h)

`AnomalyRule` interface: `id`, `signal`, `condition` (drop/rise/threshold/streak), `threshold`, `windowPeriods`, `severity`, `category`, `titleTemplate`, `suggestionTemplate`, `recipientStrategy`. Initial rules: `otd_drop`, `margin_erosion`, `capacity_overload`, `rpa_degradation`. `AnomalyDetector` evaluates rules against materialized signal data. Returns `DetectedAnomaly[]`.

### Slice 2 — Serving view + cron (~5h)

`greenhouse_serving.agency_anomalies` table: `anomaly_id`, `rule_id`, `space_id`, `severity`, `title`, `suggestion`, `signal_data` (JSONB), `status` (active/acknowledged/resolved), `detected_at`, `resolved_at`. Cron route `POST /api/cron/agency-anomalies` runs hourly. Deduplicate by `(space_id, rule_id, period)`. Auto-resolve when condition clears.

### Slice 3 — Notification wiring (~3h)

On new anomaly detection, emit notification via webhook bus. Recipient resolution from `recipientStrategy` (space_account, operations_lead, finance_admin). Include title, suggestion, and link to Space 360.

### Slice 4 — UI in Space 360 (~3h)

Space 360 Overview tab: active anomalies section with severity badge, title, suggestion, and acknowledge button. Filter by severity. Show resolved anomalies in collapsed history.

### Slice 5 — UI in Pulse (~3h)

Pulse dashboard: anomaly summary card — count by severity, top 3 most critical. Link to affected spaces. Global anomaly trend (detected vs resolved over time).

## Acceptance Criteria

- [ ] Declarative `AnomalyRule[]` registry with at least 4 initial rules
- [ ] Adding a new rule = adding one object to the registry (zero new code)
- [ ] Anomalies materialized in `agency_anomalies` with deduplication
- [ ] Hourly cron runs detection and persists results
- [ ] Notifications emitted for new anomalies to appropriate recipients
- [ ] Auto-resolve when underlying condition clears
- [ ] Space 360 Overview shows active anomalies with acknowledge action
- [ ] Pulse shows anomaly summary with severity distribution
- [ ] Cron is idempotent and retry-safe

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/anomaly-detector.ts` | New — rule registry + detection engine |
| `src/app/api/cron/agency-anomalies/route.ts` | New — hourly cron |
| `src/app/api/agency/anomalies/route.ts` | New — anomalies query API |
| `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx` | Add anomalies section |
