# TASK-312 — Partnership Automation + Alerts

## Status
- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-307, TASK-308, TASK-309, TASK-310`
- Branch: `task/TASK-312-partnership-automation-alerts`
- GitHub Issue: `—`

## Summary

Build proactive alerting and automation for the Partnership module: renewal reminders, missing revenue detection, overdue payment alerts, negative margin warnings, and advanced reporting. This is the operational maturity layer that transforms Partnership from a data entry tool into an active management system.

## Why This Task Exists

With programs, revenue, costs, and profitability all tracked (TASK-307 through TASK-310), the module still relies on manual monitoring. A partnership about to expire, missing quarterly revenue, or going negative margin won't surface unless someone remembers to check. Automation closes this gap — the system actively monitors and alerts.

## Goal
- Renewal alert: programs expiring within N days surfaced in dashboard
- Missing revenue detection: no entry for expected period based on `revenue_frequency`
- Overdue payment alerts: entries past expected payment date still pending
- Negative margin warnings: programs where cost exceeds revenue
- Partnership health score: composite indicator per program
- Optional: Cron job for periodic checks
- Optional: Notifications via existing notification system or email

## Architecture Alignment
Revisar y respetar:
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §9 Phase 4
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — projection patterns if needed
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — if external notifications needed

Reglas obligatorias:
- Alerts are computed, not stored — derive from current data state, don't persist alert records
- Use existing notification/cron infrastructure, don't build parallel systems
- Health score is a read-model calculation, not a stored column

## Normative Docs
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §9 Phase 4

## Dependencies & Impact

### Depends on
- `TASK-307` — partner_programs (status, dates, renewal_type, revenue_frequency)
- `TASK-308` — partner_revenue_entries (payment_status, period data)
- `TASK-309` — serving views + dashboard (extend with alerts section)
- `TASK-310` — partner_costs + profitability (margin data for warnings)

### Blocks / Impacts
- Nexa Insights (TASK-110/245) — partnership alerts could feed into Nexa signal engine
- Home Dashboard — partnership alerts could appear in home page alerts widget
- Email notifications — could use existing email infrastructure for periodic digests

### Files owned
- `src/lib/partnership/alerts.ts`
- `src/lib/partnership/health-score.ts`
- `src/app/api/partnership/alerts/route.ts`
- `src/app/api/cron/partnership-health-check/route.ts` (optional)
- `src/views/greenhouse/partnership/PartnershipAlertsPanel.tsx`

## Current Repo State

### Already exists
- Cron infrastructure in `/api/cron/` with Cloud Scheduler integration
- Notification patterns in the portal
- Email sending via Resend
- Nexa Insights signal engine (TASK-232/245) — potential integration point
- Home Dashboard alerts widget patterns

### Gap
- No partnership-specific alerting
- No renewal tracking automation
- No missing revenue detection
- No health score concept for partnerships
- Dashboard shows current state but not projected risks

## Scope

### Slice 1 — Alert Engine
- `src/lib/partnership/alerts.ts`
  - `getPartnershipAlerts()` — computes all active alerts from current data:
    - **Renewal due**: programs with `expiration_date` within 30/60/90 days and `renewal_type != 'none'`
    - **Missing revenue**: active programs where `revenue_frequency` indicates an expected entry for the current/previous period but none exists
    - **Overdue payments**: revenue entries with `payment_status = 'pending'` older than 30 days (or `payment_status = 'overdue'`)
    - **Negative margin**: programs where `partner_program_360.margin_clp < 0`
    - **Stale partnership**: active programs with no revenue entries in the last 6 months
  - Each alert has: `type`, `severity` (info/warning/critical), `program_id`, `message`, `action_url`

### Slice 2 — Alerts API + Dashboard Integration
- `GET /api/partnership/alerts` — returns computed alerts with optional severity filter
- Alerts panel in partnership dashboard:
  - Grouped by severity (critical first)
  - Each alert links to the relevant program/entry
  - Dismissable (session-level, not persisted)
- Alert count badge on Alianzas nav item

### Slice 3 — Health Score
- `src/lib/partnership/health-score.ts`
  - Composite score (0-100) per program based on:
    - Revenue consistency: are entries arriving on schedule? (0-25 pts)
    - Payment health: % of revenue received vs pending/overdue (0-25 pts)
    - Profitability: margin % relative to target (0-25 pts)
    - Relationship freshness: days since last activity/entry (0-25 pts)
  - Display as color-coded badge in programs list and program detail
- Health score column in programs list view (from TASK-307)

### Slice 4 — Cron Job (Optional)
- `GET /api/cron/partnership-health-check` — periodic check (weekly)
  - Computes alerts for all active programs
  - If critical alerts exist, sends summary email to finance_admin / commercial_admin
  - Uses existing email infrastructure (React Email + Resend)
- Cloud Scheduler job: weekly, Monday 8 AM America/Santiago

### Slice 5 — Advanced Reporting
- Revenue comparison: period over period (current quarter vs previous quarter)
- Program ranking by: revenue, margin, ROI, health score
- Direction breakdown: outbound vs inbound revenue/margin totals
- Category breakdown: cloud vs crm vs integration revenue/margin
- Export to CSV (programs list, revenue entries, profitability)

## Out of Scope
- Partnership pipeline for prospective new partnerships (future module)
- Integration with Nexa Insights signal engine (natural follow-up)
- External notifications to partner contacts (e.g., "your renewal is coming up")
- Budget/forecast module for partnerships
- Partnership OKRs or goal tracking

## Acceptance Criteria
- [ ] Alert engine correctly detects: renewal due, missing revenue, overdue payments, negative margin, stale partnerships
- [ ] Alerts API returns computed alerts with severity
- [ ] Dashboard shows alerts panel grouped by severity
- [ ] Health score calculated for each program (0-100)
- [ ] Health score displayed in programs list and detail
- [ ] Cron job sends email digest for critical alerts (if implemented)
- [ ] Advanced reporting: period comparison, ranking, direction/category breakdown
- [ ] CSV export for programs, revenue, and profitability

## Verification
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual: create scenarios (expired program, missing revenue, overdue payment) and verify alerts surface

## Closing Protocol
- [ ] Update `GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` with Delta
- [ ] Document alert thresholds and health score formula in architecture doc

## Follow-ups
- Nexa Insights integration: surface partnership signals in Nexa
- Home Dashboard: surface top partnership alerts
- Partnership pipeline module for prospective partnerships
- Budget vs actual per partnership per period
