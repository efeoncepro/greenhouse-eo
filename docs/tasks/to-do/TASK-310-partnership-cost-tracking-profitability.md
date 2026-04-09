# TASK-310 — Partner Cost Tracking + Profitability

## Status
- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-307, TASK-308, TASK-309`
- Branch: `task/TASK-310-partnership-cost-tracking-profitability`
- GitHub Issue: `—`

## Summary

Create the `partner_costs` table, cost registration flow, `partner_profitability` serving view, and the profitability analysis UI. This completes the ROI picture: revenue (TASK-308) minus cost (this task) equals margin per partnership.

## Why This Task Exists

Revenue tracking alone is half the picture. Efeonce invests in certifications, memberships, training, dedicated hours, co-marketing, travel, and events for each partnership. Without cost tracking, there's no way to measure ROI — a high-revenue partnership could be unprofitable if the investment exceeds the return.

## Goal
- `partner_costs` table operational with full structure
- Cost registration drawer accessible from program detail
- Costs tab in program detail view
- CRUD API for cost entries
- Optional bridge to `greenhouse_finance.expenses` via `expense_id`
- `partner_profitability` serving view with margin and ROI
- Extend `partner_program_360` with cost and margin data
- Profitability page with per-program and per-period analysis
- Ecosystem-level consolidated profitability for parent programs
- Outbox event: `partnership.cost.recorded`

## Architecture Alignment
Revisar y respetar:
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §4.3, §5.3 — DDL + profitability view
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — expense bridge pattern

Reglas obligatorias:
- Cost entries are append-only, same as revenue
- Bridge to expenses via `expense_id`, don't duplicate
- `amount_clp` always populated
- ID format: `pco-{uuid}`

## Normative Docs
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §4.3, §5.3, §5.4
- `src/lib/finance/expenses/` — existing expense store for bridge pattern

## Dependencies & Impact

### Depends on
- `TASK-307` — `partner_programs` table
- `TASK-308` — `partner_revenue_entries` (for profitability calculation)
- `TASK-309` — `partner_program_360` view (extend with cost columns), dashboard (extend with margin KPIs)

### Blocks / Impacts
- `TASK-312` (automation) — profitability alerts depend on this
- `TASK-309` dashboard — extend with margin KPIs (avg margin, ROI)
- Cost Intelligence surfaces (TASK-070/071) — partnership costs may feed into cost attribution

### Files owned
- `migrations/YYYYMMDD_create-partner-costs.sql`
- `migrations/YYYYMMDD_create-partner-profitability-view.sql`
- `src/lib/partnership/costs.ts`
- `src/lib/partnership/profitability.ts`
- `src/app/api/partnership/programs/[programId]/costs/route.ts`
- `src/app/api/partnership/programs/[programId]/costs/[costId]/route.ts`
- `src/app/api/partnership/dashboard/profitability/route.ts`
- `src/views/greenhouse/partnership/ProgramCostsTab.tsx`
- `src/views/greenhouse/partnership/RegisterCostDrawer.tsx`
- `src/views/greenhouse/partnership/ProfitabilityView.tsx`
- `src/app/(dashboard)/partnership/profitability/page.tsx`

## Current Repo State

### Already exists
- `partner_programs` and `partner_revenue_entries` (from TASK-307, TASK-308)
- `partner_program_360` and `partner_revenue_summary` views (from TASK-309)
- `greenhouse_finance.expenses` with expense store — bridge pattern
- `greenhouse_finance.suppliers` — optional FK for cost attribution to supplier
- FX helpers for `amount_clp`
- Partnership dashboard (TASK-309) — extend with margin KPIs

### Gap
- No `partner_costs` table
- No `partner_profitability` view
- No cost registration UI
- No profitability analysis page
- `partner_program_360` lacks cost/margin columns
- Dashboard lacks margin KPIs

## Scope

### Slice 1 — Migration + Types
- Create `partner_costs` table per spec §4.3
- Create `greenhouse_serving.partner_profitability` view per spec §5.3
- Alter `partner_program_360` view to include cost aggregation, margin_clp, margin_percent, roi_ratio
- Regenerate Kysely types

### Slice 2 — Cost Store + API
- `src/lib/partnership/costs.ts`
  - `listCostEntries(programId, filters)` — paginated with period/type filters
  - `createCostEntry(data)` — validates program, calculates amount_clp
  - `updateCostEntry(costId, data)` — limited fields
- API routes:
  - `GET /api/partnership/programs/[programId]/costs` — list
  - `POST /api/partnership/programs/[programId]/costs` — create
  - `PATCH /api/partnership/programs/[programId]/costs/[costId]` — update
- Outbox event on create

### Slice 3 — Cost UI
- Costs tab in Program Detail view
  - TanStack table: period, type, description, amount, currency, amount_clp, hours, team member, supplier
  - Filters: period range, cost type
  - Summary row: total cost CLP
- Register Cost drawer
  - Fields: period, cost type (select), description, amount, currency, hours invested (optional), team member (optional autocomplete), supplier (optional), expense reference (bridge), notes
- Optional bridge to `greenhouse_finance.expenses`

### Slice 4 — Profitability Store + API
- `src/lib/partnership/profitability.ts`
  - `getProfitabilityByProgram(filters)` — per program, per period, with ecosystem rollup
  - `getProfitabilitySummary(filters)` — aggregated across all programs
- `GET /api/partnership/dashboard/profitability` — profitability data with filters

### Slice 5 — Profitability UI
- New page `/partnership/profitability`
- Profitability table: program name, org, direction, revenue, cost, margin, margin%, ROI, hours
  - Period selector (month/quarter/year)
  - Sort by any column
  - Filter by direction, category
- Margin trend chart — revenue vs cost over time
- Parent program ecosystem rollup row (expandable to show children)
- Navigation: add "Rentabilidad" under Alianzas

### Slice 6 — Dashboard Extension
- Add margin KPIs to partnership dashboard (TASK-309):
  - Margen promedio (%)
  - ROI promedio
  - Partnership más rentable
  - Partnership con margen negativo (alert)

## Out of Scope
- Automatic cost allocation from Finance expenses (manual bridge only)
- Labor cost calculation from hours × rate (would need integration with HR compensation)
- Forecasting or projection of future profitability
- Alerts on negative margin (TASK-312)

## Acceptance Criteria
- [ ] `partner_costs` table created with all columns and indexes per spec
- [ ] `partner_profitability` view created in `greenhouse_serving`
- [ ] `partner_program_360` view updated with cost, margin, and ROI columns
- [ ] Cost CRUD API operational
- [ ] Costs tab renders in program detail with TanStack table
- [ ] Register Cost drawer works with FX calculation
- [ ] Profitability API returns per-program, per-period data with ecosystem rollup
- [ ] Profitability page renders with table, chart, and filters
- [ ] Dashboard extended with margin KPIs
- [ ] Ecosystem rollup shows consolidated margin for parent programs
- [ ] Outbox event published on cost creation

## Verification
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual: register costs for a program, verify profitability view shows correct margin

## Closing Protocol
- [ ] Update `GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` with Delta
- [ ] Verify cost types cover all real-world scenarios with Finance team

## Follow-ups
- TASK-312: Negative margin alerts
- Future: labor cost auto-calculation from HR compensation data
- Future: budget vs actual comparison per partnership
