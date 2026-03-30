# TASK-142 — Agency Space 360 View

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P0 |
| Impact | Muy alto |
| Effort | Alto |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Space |
| Sequence | Agency Layer V2 — Phase 1 |

## Summary

Replace the broken Space detail redirect (`/agency/spaces/[id]` currently redirects to `/admin/tenants/`) with a dedicated Space 360 page. Six tabs: Overview, Team, Services, Delivery, Finance, ICO. Header with KPI strip (Revenue, Margin, OTD, RPA) and Health/Risk badges. This is the central object of the agency operator layer — every downstream intelligence feature surfaces here.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.1 Space, §4.1 Space 360

## Dependencies & Impact

- **Depende de:** `src/lib/agency/agency-queries.ts` (existing BigQuery queries), `src/lib/agency/agency-finance-metrics.ts` (TASK-138 complete), ICO Engine materialized views, `src/app/api/agency/spaces/route.ts`
- **Impacta a:** TASK-150 (Health Score UI surface), TASK-151 (Risk Score UI surface), TASK-152 (Anomaly Detection UI), TASK-149 (Capacity alerts in Team tab), TASK-146 (Service P&L in Services tab), TASK-160 (Enterprise Hardening)
- **Archivos owned:** `src/app/(dashboard)/agency/spaces/[id]/page.tsx`, `src/views/greenhouse/agency/space-360/`, `src/app/api/agency/spaces/[id]/route.ts`

## Scope

### Slice 1 — Shell + KPI header (~6h)

Page layout at `/agency/spaces/[id]` with tab navigation (MUI Tabs). Header: Space name, organization, business line, Health Score badge, Risk Level badge. KPI strip: Revenue, Margin %, OTD %, RPA. API route `GET /api/agency/spaces/[id]` aggregating identity + summary metrics.

### Slice 2 — Overview tab (~4h)

Health summary with semaphore per dimension (Delivery, Finance, Engagement, Capacity). Recent activity feed (last 10 events from outbox). Alerts section (anomalies if any). Recommendations placeholder.

### Slice 3 — Team tab (~4h)

Members assigned to space with FTE allocation, role, utilization %. Capacity vs delivery load bar. Drawer for assign/unassign actions (reuse existing team assignment patterns).

### Slice 4 — Services tab (~4h)

Contracted services list with pipeline stage, timeline (start/end), cost. Revenue/cost/margin per service (placeholder until TASK-146). Service lifecycle actions.

### Slice 5 — Delivery tab (~4h)

ICO metrics (RPA, OTD, throughput) with trend charts. Projects with status. Stuck assets list. Sprint/cycle completion rate. Reuse existing ICO query patterns.

### Slice 6 — Finance tab (~4h)

Space P&L (revenue, costs, margin). Receivables/payables summary. Invoice history table. Payment timeline. Consume `getSpaceFinanceMetrics()`.

## Acceptance Criteria

- [ ] `/agency/spaces/[id]` renders Space 360 page (no redirect to Admin)
- [ ] All 6 tabs render with real data from existing sources
- [ ] KPI header shows Revenue, Margin, OTD, RPA from live queries
- [ ] Health Score and Risk Level badges display (static computation initially)
- [ ] Team tab shows assigned members with FTE and role
- [ ] Finance tab shows P&L using `agency-finance-metrics.ts`
- [ ] Delivery tab shows ICO metrics with trend charts
- [ ] Page is access-governed via existing authorization layer
- [ ] Mobile-responsive layout with tab scroll on narrow screens

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/app/(dashboard)/agency/spaces/[id]/page.tsx` | Replace redirect with Space 360 shell |
| `src/views/greenhouse/agency/space-360/Space360View.tsx` | New — main view component |
| `src/views/greenhouse/agency/space-360/tabs/` | New — one component per tab |
| `src/app/api/agency/spaces/[id]/route.ts` | New — Space detail API |
| `src/lib/agency/agency-queries.ts` | Extend with per-space detail queries |
