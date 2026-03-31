# TASK-156 — SLA/SLO Contractual per Service

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Delivery |
| Sequence | Agency Layer V2 — Phase 5 |

## Summary

Define SLAs per service: response time, first delivery time, revision rounds limit, OTD target %, RPA target. Compute compliance report comparing SLA targets vs actual ICO metrics. Detect trending-toward-breach before actual breach occurs. Show compliance status in service detail and Space 360.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.2 Service (Health: on-time delivery %, within-budget %)

## Dependencies & Impact

- **Depende de:** TASK-146 (Service P&L — service as economic object), ICO metrics per space (OTD, RPA, throughput)
- **Impacta a:** TASK-152 (Anomaly Engine — add SLA breach rules), TASK-155 (Scope Intelligence — SLA context for scope evaluation)
- **Archivos owned:** `src/lib/agency/sla-compliance.ts`, `src/app/api/agency/services/[serviceId]/sla/route.ts`

## Scope

### Slice 1 — Data model + CRUD (~4h)

`service_sla_definitions` table: `service_id`, `metric` (otd_pct, rpa_target, response_hours, first_delivery_days, max_revision_rounds), `target_value`, `breach_threshold`, `created_at`. CRUD API: `GET/POST/PUT /api/agency/services/[serviceId]/sla`. UI form for defining SLAs per service.

### Slice 2 — Compliance engine (~5h)

`SlaComplianceEngine`: for each service with SLAs, compare target vs actual from ICO metrics. Compute compliance status: Met, At-Risk (within 10% of breach), Breached. Detect trending-toward-breach: if metric is declining toward breach threshold at current rate. Output: `SlaComplianceReport` per service.

### Slice 3 — UI in service detail + Space 360 (~4h)

Service detail: SLA definitions table + compliance status per metric. Traffic light per SLA (green/yellow/red). Space 360 Services tab: SLA health badge per service. Aggregate: "3/5 services meeting all SLAs". Add SLA breach as anomaly rule in detection engine.

## Acceptance Criteria

- [ ] SLA definitions stored per service with configurable targets
- [ ] Compliance computed: Met / At-Risk / Breached per metric
- [ ] Trending-toward-breach detected before actual breach
- [ ] Service detail shows SLA definitions and compliance status
- [ ] Space 360 Services tab shows SLA health badge
- [ ] SLA breach generates anomaly via detection engine
- [ ] Handles services without SLA definitions (shows "no SLA defined")

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/sla-compliance.ts` | New — compliance engine |
| `src/app/api/agency/services/[serviceId]/sla/route.ts` | New — SLA CRUD + compliance API |
| `src/views/greenhouse/agency/services/ServiceDetailView.tsx` | Add SLA section |
| `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx` | Add SLA health badge |
