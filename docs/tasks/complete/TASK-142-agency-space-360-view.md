# TASK-142 — Agency Space 360 View

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | P0 |
| Impact | Muy alto |
| Effort | Alto |
| Status real | `Cerrada` |
| Rank | — |
| Domain | Agency / Space |
| Sequence | Agency Layer V2 — Phase 1 |

## Delta 2026-03-30

- La task ya no debe asumir `BigQuery-first` ni que `/agency/spaces/[id]` represente un `space_id` puro.
- Baseline real actual:
  - el listado Agency sigue navegando por `clientId` como proxy operativo del Space
  - la resolución canónica debe enriquecer con `greenhouse_core.spaces.space_id` y `organization_id` cuando exista vínculo
  - la vista 360 debe consumir capas ya existentes antes de inventar motores nuevos:
    - `greenhouse_serving.operational_pl_snapshots`
    - `member_capacity_economics`
    - `greenhouse_core.client_team_assignments`
    - módulo `services`
    - runtime `staff_augmentation`
    - `greenhouse_sync.outbox_events` como activity feed
- `Health Score` y `Risk Level` siguen siendo heurísticos transicionales en esta task; los motores formales quedan en `TASK-150` y `TASK-151`.
- La emisión de eventos propios de Agency no bloquea esta vista y se trata explícitamente como follow-on de `TASK-148`.
- La implementación quedó cerrada sobre el baseline real:
  - nueva store `src/lib/agency/space-360.ts`
  - nueva route `GET /api/agency/spaces/[id]`
  - `/agency/spaces/[id]` ya no redirige a Admin
  - nueva surface `src/views/greenhouse/agency/space-360/*` con tabs `Overview`, `Team`, `Services`, `Delivery`, `Finance`, `ICO`
  - pruebas nuevas para store, route y vista shell

## Summary

Replace the broken Space detail redirect (`/agency/spaces/[id]` currently redirects to `/admin/tenants/`) with a dedicated Space 360 page. The first operating cut uses the current Agency routing key (`clientId`) while resolving canonical `space_id` + organization context behind the scenes. The page exposes six tabs: Overview, Team, Services, Delivery, Finance, ICO. Header with KPI strip (Revenue, Margin, OTD, RPA) and Health/Risk badges. This is the central object of the agency operator layer and should compose Finance, Payroll, Providers, Tooling, Staff Augmentation, Services and recent outbox activity without creating a parallel identity.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.1 Space, §4.1 Space 360  
`docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`  
`docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`  
`docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

## Dependencies & Impact

- **Depende de:** `src/lib/agency/agency-finance-metrics.ts`, `src/lib/agency/agency-queries.ts`, `src/lib/services/service-store.ts`, `src/app/api/team/capacity-breakdown/route.ts`, `greenhouse_serving.operational_pl_snapshots`, `member_capacity_economics`, `greenhouse_sync.outbox_events`
- **Impacta a:** TASK-143 (Agency Economics API), TASK-146 (Service P&L), TASK-148 (Agency outbox events), TASK-149 (Capacity alerts), TASK-150 (Health Score), TASK-151 (Risk Score), TASK-159 (Nexa Agency tools)
- **Archivos owned:** `src/app/(dashboard)/agency/spaces/[id]/page.tsx`, `src/app/api/agency/spaces/[id]/route.ts`, `src/lib/agency/space-360.ts`, `src/views/greenhouse/agency/space-360/`

## Scope

### Slice 1 — Shell + KPI header (~6h)

Page layout at `/agency/spaces/[id]` with tab navigation (MUI Tabs). Header: Space name, organization, business line, Health Score badge, Risk Level badge. KPI strip: Revenue, Margin %, OTD %, RPA. API route `GET /api/agency/spaces/[id]` aggregates canonical identity + summary metrics and returns provenance/partial-state flags when some sources are missing.

### Slice 2 — Overview tab (~4h)

Health summary with semaphore per dimension (Delivery, Finance, Engagement, Capacity). Recent activity feed (last 10 events from outbox). Alerts section (anomalies/partial-state warnings). Recommendations remain placeholder and must be clearly marked as pending intelligence.

### Slice 3 — Team tab (~4h)

Members assigned to the space with FTE allocation, role, utilization %, assignment type and Staff Aug/placement context when available. Reuse existing assignment patterns without creating a second staffing runtime in this task.

### Slice 4 — Services tab (~4h)

Contracted services list with pipeline stage, timeline (start/end), cost, provider/tooling hints when present. Revenue/cost/margin per service stays partial until `TASK-146`, but the tab must still show current contract data honestly.

### Slice 5 — Delivery tab (~4h)

ICO metrics (RPA, OTD, throughput) with trend charts. Projects with status. Stuck assets list. Sprint/cycle completion rate. Reuse existing ICO query patterns.

### Slice 6 — Finance tab (~4h)

Space P&L (revenue, costs, margin). Receivables/payables summary. Invoice and expense history. Payment timeline when available. Finance tab must connect cost context with payroll, provider tooling and staff augmentation exposure where detectable.

## Acceptance Criteria

- [x] `/agency/spaces/[id]` renders Space 360 page (no redirect to Admin)
- [x] All 6 tabs render with real data from existing sources or explicit partial-state fallbacks
- [x] KPI header shows Revenue, Margin, OTD, RPA from live queries
- [x] Health Score and Risk Level badges display with heuristic/transitional computation and honest provenance
- [x] Team tab shows assigned members with FTE, role and assignment context
- [x] Finance tab shows P&L using `agency-finance-metrics.ts` plus cost composition/drilldowns
- [x] Delivery tab shows ICO metrics, project inventory and stuck assets
- [x] Overview tab surfaces recent outbox activity for the current space/client context
- [x] Page is access-governed via existing authorization layer
- [x] Mobile-responsive layout with tab scroll on narrow screens

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/app/(dashboard)/agency/spaces/[id]/page.tsx` | Replace redirect with Space 360 shell |
| `src/lib/agency/space-360.ts` | New — shared store for canonical space detail |
| `src/views/greenhouse/agency/space-360/Space360View.tsx` | New — main view component |
| `src/views/greenhouse/agency/space-360/tabs/` | New — one component per tab |
| `src/app/api/agency/spaces/[id]/route.ts` | New — Space detail API |
| `src/lib/agency/agency-queries.ts` | Extend only where BigQuery delivery/ICO reads are still the correct source |
