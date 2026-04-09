# TASK-309 — Partnership Serving Views + Dashboard

## Status
- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-307, TASK-308`
- Branch: `task/TASK-309-partnership-serving-views-dashboard`
- GitHub Issue: `—`

## Summary

Create the serving views (`partner_program_360`, `partner_revenue_summary`) and the Partnership Dashboard with KPIs and visualizations. This is the operational intelligence layer — Finance and Commercial need at-a-glance visibility into partnership revenue, top performers, and payment status.

## Why This Task Exists

With programs registered (TASK-307) and revenue entries flowing (TASK-308), the data exists but lacks aggregation and visualization. Finance needs a dashboard to monitor partnership revenue across all programs, identify top-performing partnerships, track pending/overdue payments, and see trends over time.

## Goal
- Serving view `partner_program_360` materialized in `greenhouse_serving`
- Serving view `partner_revenue_summary` materialized in `greenhouse_serving`
- Partnership Dashboard page with KPIs, charts, and tables
- Dashboard API endpoint
- Revenue trend chart (monthly/quarterly)
- Top partners ranking
- Payment status overview
- Ecosystem-level revenue rollup for parent programs

## Architecture Alignment
Revisar y respetar:
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §5 — serving views DDL, §8 — dashboard KPIs
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — projection pattern if reactive

Reglas obligatorias:
- Serving views live in `greenhouse_serving` schema
- Views read from `greenhouse_partnership` tables — no data duplication
- Dashboard KPIs use serving views, not raw table queries
- Ecosystem rollup uses query pattern from spec §5.4, not materialized recursion

## Normative Docs
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §5, §8

## Dependencies & Impact

### Depends on
- `TASK-307` — `partner_programs` table
- `TASK-308` — `partner_revenue_entries` table (needed for meaningful dashboard)

### Blocks / Impacts
- `TASK-310` — profitability view extends `partner_program_360` with cost data
- Finance P&L — partnership revenue summary can be consumed by P&L dashboard

### Files owned
- `migrations/YYYYMMDD_create-partnership-serving-views.sql`
- `src/app/api/partnership/dashboard/route.ts`
- `src/lib/partnership/dashboard.ts`
- `src/views/greenhouse/partnership/PartnershipDashboardView.tsx`
- `src/app/(dashboard)/partnership/page.tsx` (dashboard landing)

## Current Repo State

### Already exists
- `greenhouse_serving` schema with multiple 360 views (provider_360, person_360, etc.) — follow same pattern
- Chart components and patterns used in Finance Dashboard (`/finance`)
- KPI card patterns used across modules

### Gap
- No `partner_program_360` view
- No `partner_revenue_summary` view
- No partnership dashboard
- No partnership landing page

## Scope

### Slice 1 — Serving Views Migration
- Create `greenhouse_serving.partner_program_360` per spec §5.1
  - Joins: programs ← organizations, parent program, revenue aggregation, contact count, children count
  - Revenue-only for now (cost/margin columns come in TASK-310)
- Create `greenhouse_serving.partner_revenue_summary` per spec §5.2
  - Group by: program, period, revenue_type
  - Aggregates: total, received, pending, overdue

### Slice 2 — Dashboard API
- `src/lib/partnership/dashboard.ts`
  - `getPartnershipDashboard(filters)` — period range, direction, category
  - Returns: KPIs, top partners, revenue by period, revenue by type, payment status breakdown
- `GET /api/partnership/dashboard` — query params for period/direction/category filters
- Ecosystem rollup: for parent programs, aggregate revenue of self + children

### Slice 3 — Dashboard UI
- Partnership landing page at `/partnership`
- KPI cards row:
  - Revenue total (period) — SUM(amount_clp) for selected period
  - Revenue YTD — SUM(amount_clp) current year
  - Partners activos — COUNT(programs WHERE status = 'active')
  - Revenue pendiente — SUM WHERE payment_status IN ('pending', 'overdue')
  - Top partner (period) — program with highest revenue
- Revenue trend chart (line/bar) — monthly for last 12 months, split by direction or category
- Revenue by type (donut chart) — license_fee, resale_margin, referral_commission, etc.
- Top 10 partners table — sorted by revenue, with direction badge, model chip, revenue amount
- Payment status breakdown — pending vs invoiced vs received vs overdue
- Period selector (month/quarter/year range)
- Filter by direction and category

### Slice 4 — Program 360 Enrichment
- Update ProgramDetailView (from TASK-307) overview tab to use `partner_program_360`
- Show revenue summary, entry count, last revenue period in overview
- Show ecosystem rollup for parent programs (total across children)

## Out of Scope
- Cost columns in partner_program_360 (TASK-310 adds them)
- Profitability view (TASK-310)
- Reactive projection for partner_program_360 (consider in TASK-312 if needed)
- Comparison with Finance P&L (future cross-module view)

## Acceptance Criteria
- [ ] `partner_program_360` view created in `greenhouse_serving` with revenue aggregations
- [ ] `partner_revenue_summary` view created in `greenhouse_serving`
- [ ] Dashboard API returns KPIs, top partners, revenue trends, payment status
- [ ] Dashboard UI renders with KPI cards, trend chart, type donut, top partners table
- [ ] Period selector and direction/category filters work
- [ ] Ecosystem rollup shows consolidated revenue for parent programs with children
- [ ] Program detail overview enriched with 360 summary data

## Verification
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual: navigate to /partnership, verify dashboard renders with real data from TASK-307/308

## Closing Protocol
- [ ] Update `GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` with Delta
- [ ] Verify KPI calculations match Finance team expectations

## Follow-ups
- TASK-310: Add cost/margin columns to partner_program_360 and profitability view
- Cross-module: surface partnership revenue as a line item in Finance P&L dashboard
