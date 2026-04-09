# TASK-308 — Partnership Revenue Registration

## Status
- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-307`
- Branch: `task/TASK-308-partnership-revenue-registration`
- GitHub Issue: `—`

## Summary

Create the `partner_revenue_entries` table and build the full revenue registration flow: CRUD API, registration drawer, revenue list within program detail, and bridge to `greenhouse_finance.income`. This is the highest-priority business capability — Efeonce currently has no formal tracking of partnership revenue.

## Why This Task Exists

Partnership revenue (license resale margins, commissions, rebates, white-label execution fees, MDF, etc.) is not registered in Greenhouse. Finance has no visibility into how much each partnership generates, which revenue is pending vs received, or how partnership revenue contributes to the overall P&L. This task closes that gap.

## Goal
- `partner_revenue_entries` table operational with full structure
- Revenue registration drawer accessible from program detail view
- Revenue list tab in program detail view
- CRUD API for revenue entries
- Optional bridge to `greenhouse_finance.income` via `income_id`
- Payment status tracking (pending → invoiced → received)
- Outbox events: `partnership.revenue.recorded`, `partnership.revenue.payment_received`
- Revenue entries attributable to client and/or business line

## Architecture Alignment
Revisar y respetar:
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §4.2 — DDL completo
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — income bridge pattern
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — no crear identidad paralela

Reglas obligatorias:
- Revenue entries are append-only — corrections via new entries, not mutations
- Bridge to `greenhouse_finance.income` via `income_id`, don't duplicate financial transactions
- `amount_clp` always populated (normalized to CLP)
- ID format: `pre-{uuid}`

## Normative Docs
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §4.2, §6.1 — revenue table + Finance bridge
- `src/lib/finance/income/` — existing income store patterns for bridge

## Dependencies & Impact

### Depends on
- `TASK-307` — `partner_programs` table must exist
- `greenhouse_finance.income` table (exists) — for optional bridge
- `greenhouse.clients` table (exists) — for optional client attribution
- FX resolution helpers in Finance (exist) — for `amount_clp` calculation

### Blocks / Impacts
- `TASK-309` (serving views + dashboard) — revenue data feeds dashboard KPIs and views
- `TASK-310` (profitability) — revenue is half of the margin equation
- `TASK-070` / `TASK-071` — partnership revenue may impact cost intelligence surfaces

### Files owned
- `migrations/YYYYMMDD_create-partner-revenue-entries.sql`
- `src/lib/partnership/revenue.ts`
- `src/app/api/partnership/programs/[programId]/revenue/route.ts`
- `src/app/api/partnership/programs/[programId]/revenue/[entryId]/route.ts`
- `src/views/greenhouse/partnership/ProgramRevenueTab.tsx`
- `src/views/greenhouse/partnership/RegisterRevenueDrawer.tsx`

## Current Repo State

### Already exists
- `greenhouse_finance.income` with `partner_share_*` columns — supplementary mechanism, not replaced
- FX resolution: `resolveExchangeRateToClp()` in `src/lib/finance/shared.ts`
- Client lookup: `greenhouse.clients` with `client_id`
- Business line lookup: `greenhouse_core.service_modules` where `module_kind = 'business_line'`
- Outbox event publishing pattern

### Gap
- No `partner_revenue_entries` table
- No revenue registration API
- No revenue UI in partnership views
- No bridge mechanism from partnership revenue → finance income
- Partnership revenue is completely invisible in the portal

## Scope

### Slice 1 — Migration + Types
- Create `partner_revenue_entries` table per spec §4.2
- All indexes including unique index on `income_id` bridge
- Regenerate Kysely types

### Slice 2 — Store + API
- `src/lib/partnership/revenue.ts` — CRUD functions
  - `listRevenueEntries(programId, filters)` — paginated with period/type/status filters
  - `getRevenueEntry(entryId)`
  - `createRevenueEntry(data)` — validates program exists, calculates `amount_clp` via FX if needed
  - `updateRevenueEntry(entryId, data)` — limited fields (payment_status, payment_date, notes, income_id)
- API routes:
  - `GET /api/partnership/programs/[programId]/revenue` — list with filters (period_year, period_month, revenue_type, payment_status)
  - `POST /api/partnership/programs/[programId]/revenue` — create entry
  - `GET /api/partnership/programs/[programId]/revenue/[entryId]` — detail
  - `PATCH /api/partnership/programs/[programId]/revenue/[entryId]` — update (payment status, bridge to income)
- Outbox events on create and payment status change

### Slice 3 — UI
- Revenue tab in Program Detail view
  - TanStack table: period, type, description, amount, currency, amount_clp, client, BU, payment status, payment date
  - Filters: period range, revenue type, payment status
  - Summary row: total revenue CLP for filtered period
- Register Revenue drawer
  - Fields: period (year/month), revenue type (select from enum), description, gross amount, currency, exchange rate (auto-filled if USD/EUR), client (optional autocomplete), business line (optional select), invoice reference, payment status, notes
  - `amount_clp` auto-calculated on currency/amount/rate change
- Update payment status inline or via detail

### Slice 4 — Finance Income Bridge
- Optional: when creating a revenue entry, option to "also register in Finance Income"
  - Creates `greenhouse_finance.income` record with appropriate mapping
  - Stores `income_id` back in the revenue entry
  - Shows link to income record in revenue detail
- This is opt-in, not automatic (per spec §6.1 Option A)

## Out of Scope
- Revenue dashboard/KPIs (TASK-309)
- Serving views aggregations (TASK-309)
- Cost entries (TASK-310)
- Profitability calculations (TASK-310)
- Bulk import of historical revenue
- Automatic reconciliation with Finance income

## Acceptance Criteria
- [ ] `partner_revenue_entries` table created with all columns, constraints, and indexes per spec
- [ ] Kysely types regenerated
- [ ] API: GET revenue list returns paginated entries with filters
- [ ] API: POST creates revenue entry with FX calculation for `amount_clp`
- [ ] API: PATCH updates payment status and income bridge
- [ ] Revenue tab renders in program detail with TanStack table
- [ ] Register Revenue drawer creates entries correctly
- [ ] Revenue entries can optionally be linked to `greenhouse_finance.income`
- [ ] Outbox events published on create and payment status change
- [ ] Client and business line attribution works via optional selectors
- [ ] Payment status workflow: pending → invoiced → received (or overdue)

## Verification
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual: create revenue entries for a program, verify list/filter, verify income bridge

## Closing Protocol
- [ ] Update `GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` with Delta
- [ ] Verify revenue type enum covers all real-world scenarios with Finance team

## Follow-ups
- TASK-309: Dashboard + serving views to aggregate revenue data
- TASK-310: Cost tracking to enable profitability calculation
- Historical backfill of pre-module partnership revenue (separate task if needed)
