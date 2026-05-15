# GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1

## Status

- Status: Accepted
- Date: 2026-05-15
- Owner: HR / Payroll / Workforce
- Scope: Payroll projection, official payroll calculation, compensation effective dating, workforce entry/exit eligibility, HR operational documentation.
- Reversibility: two-way-but-slow
- Confidence: high
- Validated as of: 2026-05-15

## Context

Greenhouse Payroll currently includes any active member whose compensation version overlaps the monthly period:

```text
cv.effective_from <= periodEnd
AND (cv.effective_to IS NULL OR cv.effective_to >= periodStart)
```

That overlap rule is correct for roster discovery, but it is not sufficient for amount calculation. If a collaborator starts mid-month, for example Felipe Zurita starting on day 13, the current `projected_month_end` path treats the compensation as a full-month obligation because `projectPayrollForPeriod()` sets `prorationFactor = 1` for month-end projection and `buildPayrollEntry()` only reduces amounts for unpaid absence or leave.

TASK-890 solved the exit side for workforce offboarding by introducing a canonical exit eligibility resolver. The entry side remains uncovered: a collaborator can enter the monthly roster correctly and still be overpaid because Payroll has no canonical participation window for the part of the period where the person is actually eligible.

This is a payroll semantic decision, not a UI bug. It affects projected payroll, official payroll, future payroll snapshots, payment obligations, personnel expense, and auditability.

## Decision

Greenhouse will introduce a canonical **Payroll Participation Window** primitive. The primitive determines the eligible interval for each member in a payroll period by composing:

- period bounds (`periodStart`, `periodEnd`)
- compensation effective dating (`compensation_versions.effective_from`, `effective_to`)
- workforce relationship or onboarding start date when available
- TASK-890 exit eligibility cutoff when applicable

The participation window is the only place where Payroll decides whether a member is excluded, paid for the full period, or prorated for a bounded portion of the period.

Implementation lives behind a feature flag until staging shadow compare is green:

```text
PAYROLL_PARTICIPATION_WINDOW_ENABLED=false
```

## Runtime Contract

### Type Shape

The implementation must expose a server-only bulk resolver with this contract or an equivalent strictly typed shape:

```ts
type PayrollParticipationPolicy =
  | 'exclude'
  | 'full_period'
  | 'prorate_from_start'
  | 'prorate_until_end'
  | 'prorate_bounded_window'

type PayrollParticipationReasonCode =
  | 'compensation_not_effective'
  | 'entry_mid_period'
  | 'exit_mid_period'
  | 'external_payroll_exit'
  | 'relationship_not_started'
  | 'relationship_ended'
  | 'full_period'

type PayrollParticipationWindow = {
  memberId: string
  eligibleFrom: string | null
  eligibleTo: string | null
  policy: PayrollParticipationPolicy
  reasonCodes: PayrollParticipationReasonCode[]
  prorationFactor: number
}
```

### Date Composition

The canonical formula is:

```text
eligibleFrom = max(periodStart, compensation.effective_from, relationshipStartDate if known)
eligibleTo   = min(periodEnd, compensation.effective_to, TASK-890 exit cutoff if applicable)
```

If either bound is missing because the member is not eligible, or if `eligibleFrom > eligibleTo`, the policy is `exclude` and `prorationFactor = 0`.

If the eligible bounds equal the full period, policy is `full_period` and `prorationFactor = 1`.

If only the start is bounded inside the period, policy is `prorate_from_start`.

If only the end is bounded inside the period, policy is `prorate_until_end`.

If both start and end are bounded inside the period, policy is `prorate_bounded_window`.

### Proration Basis

V1 uses canonical payroll working days, not calendar days:

```text
prorationFactor =
  countWeekdays(eligibleFrom, eligibleTo) / countWeekdays(periodStart, periodEnd)
```

The implementation may later swap `countWeekdays()` for the operational calendar primitive (`src/lib/calendar/operational-calendar.ts`) without changing the public contract. That future change requires its own validation because holidays and local calendars affect payout.

### Attendance Boundary

Participation is not attendance.

A collaborator who starts on the 13th was not absent from the 1st to the 12th. They were not yet eligible for payroll participation. The implementation must not model entry proration as absence, unpaid leave, or attendance deficit.

Attendance and leave continue to adjust amounts only after the participation window has defined the eligible portion of the period.

### Integration Points

The primitive must be consumed by both:

- `src/lib/payroll/project-payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`

It is not acceptable to fix projected payroll only. Projected and official payroll must share the same participation decision.

TASK-890 exit eligibility remains the canonical exit/offboarding source. The participation resolver composes it; it does not reimplement offboarding lane/status policy.

### Observability

The implementation must add reliability coverage for drift introduced by the new window:

- `payroll.participation_window.projection_delta_anomaly`
- `payroll.participation_window.full_month_entry_drift`

Signals should include period, count, affected member ids where safe, and reason code distribution. PII must remain redacted according to existing observability rules.

## Alternatives Considered

### Patch only `projectPayrollForPeriod()`

Rejected. It would make the projected view look right while official payroll could still calculate the full month. This creates a worse failure mode because operators would trust a projected value that does not match the final calculation.

### Treat days before start as absence

Rejected. It is semantically false and pollutes attendance, receipts, compliance exports, personnel expense explanations, and future HR analytics.

### Use only `compensation_versions.effective_from`

Rejected as incomplete. Compensation effective dating is necessary, but workforce relationship/onboarding dates can be the stronger source for when a person actually begins participation. The resolver must be able to compose both without spreading that decision across callers.

### Create a Felipe-specific honorarios rule

Rejected. Felipe is the real trigger fixture, not the architecture. The same bug class applies to Chile dependent workers, honorarios, internal payroll, and future mixed entry/exit cases.

### Extend TASK-890 directly

Rejected as a naming and ownership issue. TASK-890 is specifically exit/offboarding eligibility. The new primitive should compose TASK-890, not expand it into a generic payroll engine with unclear boundaries.

## Consequences

### Positive

- Projected and official payroll share one participation decision.
- Mid-month entry, mid-month exit, and same-month entry/exit become auditable as one bounded interval.
- Future agents can reason about payroll inclusion through a named primitive instead of reverse-engineering inline SQL and calculation code.
- Felipe-like and Maria-like cases can be covered in the same regression matrix.

### Negative / Costs

- Official payroll calculation changes behavior once the flag is enabled.
- Historical periods must not be recalculated silently; any recalculation after rollout will use the new semantics only when explicitly enabled.
- If source dates disagree, the resolver must choose deterministically and expose reason codes; otherwise operators will see unexplained deltas.

## Implementation Notes

Expected module:

```text
src/lib/payroll/participation-window/
```

Expected public entrypoints:

```text
resolvePayrollParticipationWindowsForMembers()
isMemberParticipatingInPayroll()
```

Expected first task:

```text
TASK-893 — Payroll Participation Window
```

## Rollout Requirements

1. Ship resolver and tests behind `PAYROLL_PARTICIPATION_WINDOW_ENABLED=false`.
2. Run staging shadow compare with flag false, recording legacy vs new decisions.
3. Flip flag true in staging only.
4. Verify:
   - Felipe-like mid-month entry prorates from start date.
   - Maria-like external payroll exit remains excluded via TASK-890.
   - Full-month collaborators remain bit-for-bit equal.
   - Same-month entry/exit produces a bounded window.
5. Keep production flag false until staging evidence is accepted by HR/Finance.
6. Flip production via Vercel env var + redeploy only after explicit operator approval.

## Revisit When

- Greenhouse adopts operational-calendar holidays as the legal proration basis instead of weekdays.
- Payroll needs split entries for multiple compensation versions inside the same period.
- HR introduces country-specific payroll regimes where proration basis differs by jurisdiction.
- Provider payroll (Deel/EOR) becomes source-of-truth for payable amount rather than Greenhouse storing an operational projection.

## Self-Critique

### What Breaks In 12 Months

The likely failure mode is source-date drift: compensation effective date, workforce relationship start date, and onboarding execution date disagree. Mitigation: deterministic source precedence plus reason codes and reliability signals.

### What Breaks In 36 Months

Payroll may need split entries per sub-period when a person changes salary or contract type mid-month. This V1 window model does not create multiple entries; it prorates one selected compensation version. That is acceptable for V1 but must be revisited when intra-month compensation changes become common.

### Cognitive Debt Risk

Low if implemented as one primitive with ADR, tests, and docs. High if agents patch `project-payroll.ts`, `calculate-payroll.ts`, and SQL readers independently.

### Observability Gap

Without shadow compare and reason-code distribution, operators may see lower payroll totals without understanding whether the delta is correct. The reliability signals are load-bearing.

