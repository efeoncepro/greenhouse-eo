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

The implementation must expose a server-only bulk resolver with this contract or an equivalent strictly typed shape. Note `exitEligibility` is **embedded**, not duplicated — TASK-890 stays the single source of truth for exit semantics.

```ts
import type { WorkforceExitPayrollEligibilityWindow } from '@/lib/payroll/exit-eligibility'

type PayrollParticipationPolicy =
  | 'exclude'
  | 'full_period'
  | 'prorate_from_start'
  | 'prorate_until_end'
  | 'prorate_bounded_window'

/**
 * Reason codes ADD information NOT derivable from `policy` alone. They are not
 * redundant with `policy`. Canonical matrix `policy × validReasonCodes`:
 *
 * - `exclude`                 → `compensation_not_effective` | `relationship_not_started`
 *                               | `relationship_ended` | `external_payroll_exit`
 * - `full_period`             → `full_period`
 * - `prorate_from_start`      → `entry_mid_period`
 * - `prorate_until_end`       → `exit_mid_period`
 * - `prorate_bounded_window`  → `entry_mid_period` + (`exit_mid_period` | `external_payroll_exit`)
 *
 * Consumers branch on `policy`. Reason codes are forensic / observability /
 * operator-visible copy. NUNCA branch consumer logic on reason codes.
 */
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

  /** ISO date YYYY-MM-DD inclusive */
  periodStart: string

  /** ISO date YYYY-MM-DD inclusive */
  periodEnd: string

  /**
   * Effective participation interval intersected with [periodStart, periodEnd].
   * `null` en eligibleFrom = no eligible at period start (excluded or future
   * entry). `null` en eligibleTo = eligible through period end. Ambos `null` =
   * excluded entire period.
   */
  eligibleFrom: string | null
  eligibleTo: string | null

  policy: PayrollParticipationPolicy
  reasonCodes: readonly PayrollParticipationReasonCode[]

  /**
   * Composed proration factor in [0, 1].
   *
   * Composition formula (canonical):
   *
   * ```
   * participationFactor = countWeekdays(eligibleFrom, eligibleTo)
   *                     / countWeekdays(periodStart, periodEnd)
   * ```
   *
   * Consumers compose with mode-specific factors (e.g. projected `actual_to_date`):
   *
   * ```
   * finalFactor = participationFactor
   *             × (actualToDateFactor if mode = 'actual_to_date' else 1)
   * ```
   *
   * Composition lives at the consumer (`projectPayrollForPeriod`,
   * `calculatePayroll`), NOT inside the resolver. The resolver only knows the
   * participation window.
   */
  prorationFactor: number

  /**
   * Embedded TASK-890 decision. NEVER replicate `(lane, status, cutoff)` matrix
   * in callers. Read this struct or branch on `policy` above.
   *
   * `null` when no offboarding case applies (member full active) OR when the
   * TASK-890 resolver degraded (see `warnings`).
   */
  exitEligibility: WorkforceExitPayrollEligibilityWindow | null

  warnings: readonly PayrollParticipationWarning[]
}

type PayrollParticipationWarning = {
  code: PayrollParticipationWarningCode
  severity: 'info' | 'warning' | 'blocking'
  messageKey: string
  evidence?: Record<string, unknown>
}

type PayrollParticipationWarningCode =
  | 'exit_resolver_disabled'           // TASK-890 flag OFF; exit decisions degraded to legacy
  | 'exit_resolver_failed'             // TASK-890 query threw; falling back to compensation only
  | 'source_date_disagreement'         // comp.effective_from vs onboarding source differ > 7d (V1.1+)
  | 'compensation_version_overlap'     // multiple comp versions inside period; V1 picks the active one
```

### Date Composition

The canonical formula V1 uses **exactly two sources** for entry — compensation effective dating and period bounds — and composes the exit side via TASK-890:

```text
eligibleFrom = max(periodStart, compensation.effective_from)
eligibleTo   = min(
                  periodEnd,
                  compensation.effective_to,
                  exitEligibility.eligibleTo   when exitEligibility != null
                )
```

If `exitEligibility.projectionPolicy === 'exclude_entire_period'` → policy `exclude`, both bounds `null`.
If `exitEligibility.projectionPolicy === 'exclude_from_cutoff'` AND cutoff ≤ periodStart → policy `exclude`.
If `eligibleFrom > eligibleTo` → policy `exclude`, both bounds `null`.

If the eligible bounds equal the full period, policy is `full_period` and `prorationFactor = 1`.

If only the start is bounded inside the period, policy is `prorate_from_start`.

If only the end is bounded inside the period, policy is `prorate_until_end`.

If both start and end are bounded inside the period, policy is `prorate_bounded_window`.

### Source Precedence — V1 explicit single entry source

The decision space for `eligibleFrom` evaluated three candidate sources during design:

| Source | Status in V1 | Reason |
| --- | --- | --- |
| `compensation_versions.effective_from` | **Canonical for V1** | Already populated for every active member; consumed by `pgGetApplicableCompensationVersionsForPeriod` today; CHECK constraints exist |
| `work_relationship_onboarding_cases.completed_at` (or equivalent) | **V1.1+ deferred** | Table exists (`src/lib/workforce/onboarding/store.ts`) but no canonical field in `members` yet. Adding it requires schema work + HR validation that onboarding date is more authoritative than comp dating. Out of scope for V1 |
| `members.relationship_started_at` | **Does not exist** | No canonical column in `members`. Would require dedicated TASK to materialize |

**V1 hard rule**: the resolver uses `compensation.effective_from` ONLY for `eligibleFrom`. Adding onboarding as a second source is gated on (a) HR confirming onboarding date is canonical for proration, (b) materializing a single `relationship_started_at` column in `members` or persisting the resolver decision via a derivation table. Both are V1.1+ work.

**Future-ready hook**: the resolver bulk-query (Slice 2) MAY LEFT JOIN onboarding cases without consuming the data — purely to detect drift via the `source_date_disagreement` reliability signal. That signal then drives the V1.1 decision data-driven, not gut-feel.

### Flag Dependency — TASK-893 requires TASK-890

`PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` in any environment **requires** `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` in the same environment. Otherwise the participation resolver composes a degraded exit decision (`full_period` for everyone) and silently overpays exiting collaborators while correctly prorating entering ones — worst failure mode (partial correctness without operator awareness).

The resolver MUST:

1. Call `resolveExitEligibilityForMembers` explicitly (NOT read `exitEligibilityWindow` attached to rows by `pgGetApplicableCompensationVersionsForPeriod`, because that attachment is itself gated by the TASK-890 flag).
2. If TASK-890 returns the legacy fallback (flag OFF), emit warning `exit_resolver_disabled` per member with active exit case in period and degrade `exitEligibility = null`.
3. If TASK-890 throws (DB transient, schema drift), emit `captureWithDomain('payroll', err, { source: 'participation_window.exit_composition_failed' })` + warning `exit_resolver_failed` + degrade `exitEligibility = null`.

This is defense-in-depth: TASK-890 alone gates exit semantics; TASK-893 additionally gates exit composition. Operators flipping TASK-893 without TASK-890 see the warning + the reliability signal `payroll.participation_window.full_month_entry_drift` (which will fire because exit-prorated members suddenly show full month).

### Triple-gate roster semantics

Post-rollout, three orthogonal gates filter the payroll roster, applied in this canonical order:

```text
                ┌──────────────────────────────────────────┐
                │ pgGetApplicableCompensationVersionsForPeriod
                │                                          │
roster ────────▶│ 1. Compensation overlap                  │ ───┐
                │    (effective_from <= periodEnd AND      │    │
                │     effective_to >= periodStart)         │    │
                │                                          │    │
                │ 2. Intake gate (TASK-872)                │    │ filter
                │    WHERE workforce_intake_status =       │    │ (excluded
                │      'completed'                         │    │ members never
                │    (flag-gated, default OFF V1)          │    │ enter roster)
                └──────────────────────────────────────────┘    │
                                                                ▼
                                                       eligibleMembers[]
                                                                │
                                                                ▼
                ┌──────────────────────────────────────────┐
                │ resolvePayrollParticipationWindows...    │
                │  (TASK-893, this spec)                   │
                │                                          │
                │ 3. Participation window                  │
                │    INTERSECTION of:                      │
                │     • compensation effective range       │
                │     • TASK-890 exit eligibility window   │ ───▶ prorationFactor per member
                │     • period bounds                      │      policy per member
                │    (flag-gated, default OFF V1)          │
                └──────────────────────────────────────────┘
```

- **Gate 1** (compensation overlap, no flag): roster discovery. Always on.
- **Gate 2** (intake, TASK-872 flag): exclude un-onboarded members BEFORE participation. Filter, not intersection.
- **Gate 3** (participation, TASK-893 flag): intersect entry + exit windows. Compute prorationFactor.

Gates 2 and 3 are independent flags. Gate 3 internally consumes TASK-890 (gate inside gate, see Flag Dependency above). NEVER collapse the gates into one. NEVER reorder.

### Régimen coverage (4 regímenes canónicos)

Participation window applies to ALL four canonical payroll regímenes (TASK-758 receipt presenter taxonomy). The basis (`countWeekdays`) is the same for the four. The application differs by what gets multiplied:

| Régimen | `prorationFactor` applies to |
| --- | --- |
| `chile_dependent` | Base salary + fixed haberes; `chileTotalDeductions` recomputed from prorated gross (Previred bases scale linearly) |
| `honorarios` | Base honorarios; `siiRetentionAmount` recomputed from prorated gross (retención SII Art. 74 N°2 LIR scales linearly) |
| `international_deel` | `baseGross` only (Greenhouse projects, Deel calculates final). Footnote in receipt: "monto proyectado, Deel reconcilia" |
| `international_internal` | Base salary + fixed haberes; no Chile-specific deductions |

The implementation MUST extend `prorateEntry` to honorarios path. Today honorarios skips attendance proration; that skip must NOT extend to participation. Participation is a contractual eligibility gate, not an attendance phenomenon.

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

The implementation must add **three canonical reliability signals** for drift introduced by the new window. All three live under subsystem **`Finance Data Quality`** rollup with `incidentDomainTag='payroll'` (aligns with TASK-766/768/774 cost-discipline signals; payroll deltas are economic outcomes, not workforce identity drift).

| Signal | Kind | Severity | Steady | Detects |
| --- | --- | --- | --- | --- |
| `payroll.participation_window.projection_delta_anomaly` | drift | warning if delta > 5% / error if > 15% | < 5% | post-rollout proyección delta vs legacy baseline, period-by-period |
| `payroll.participation_window.full_month_entry_drift` | drift | error if count > 0 | 0 | members con `effective_from` mid-period que igual recibieron `prorationFactor = 1` (regresión silente del fix) |
| `payroll.participation_window.source_date_disagreement` | drift | warning if count > 0 | 0 | `(member, period)` donde `comp.effective_from` y `onboarding.completed_at` difieren > 7 días; data-driven trigger para V1.1 onboarding source |

Signal payloads MUST include: `period_year`, `period_month`, `count`, affected `member_ids[]` (redacted via `redactSensitive`), and `reason_code_distribution` (count per `PayrollParticipationReasonCode`). PII (full name, RUT, email) stays redacted per `src/lib/observability/redact.ts` rules.

`source_date_disagreement` is the **observability hook** for the V1.1 decision: when count emerges > 0 sustained, that's the data-driven signal to materialize onboarding as a second source. Until then, the resolver detects without consuming.

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

## Downstream Consumers — Cross-Domain Blast Radius

The flag flip changes payroll amounts for mid-period entry/exit cases. Six downstream systems consume payroll entries (or derivatives) and will see propagated deltas. Coordination is required before production cutover.

| Sistema | Surface | Blast | Mitigación |
| --- | --- | --- | --- |
| `/api/hr/payroll/projected` | Pulse projected payroll card, agency dashboards | Montos proyectados bajan para mid-month joiners | Staging shadow compare verde >= 7d before prod flip |
| `calculatePayroll()` oficial | Period close, payslips, export to Previred/SII | Persisted amounts change post-rollout | HR/Finance OOB approval; `no_recompute_closed_periods` invariant (see below) |
| `payment_obligations` (TASK-748) | Bank pay queue, payment orders | Obligaciones generadas pueden reflejar montos prorateados new-semantic en periods abiertos | Re-materialization gated; period-close ordering enforced |
| `commercial_cost_attribution_v2` (TASK-708) + `client_labor_cost_allocation_consolidated` (TASK-709) | `/agency/cost-intelligence`, MRR/ARR margin views | `expense_direct_member_via_fte` baja; client_economics ICO baja | VIEW recompute is downstream-reactive; signal `commercial.cost_attribution.delta_anomaly` covers detection (existing) |
| `client_economics` materializer + ICO motor | Globe client KPIs, ICO scorecards | ICO economics shift for clients with mid-month-entry staff | No additional mitigation; signal cascade catches anomaly |
| Final settlement (TASK-862/863) | Finiquito calculation, document render, ratification | Same-month entry+exit case bases legales change | Validate with `greenhouse-payroll-auditor` BEFORE Slice 4 ships; cross-spec invariant lift to `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` if needed |

### No-recompute-silente invariant

Periods already exported (`payroll_periods.status IN ('exported','approved')` or equivalent terminal) MUST preserve legacy semantic. Recompute on a closed period requires:

- Capability `payroll.period.force_recompute` (NEW V1.1; reserved EFEONCE_ADMIN + FINANCE_ADMIN).
- Reason >= 20 chars persisted in audit row.
- Explicit operator action via admin endpoint; never automatic.

Until the capability lands (V1.1), `calculatePayroll()` MUST refuse to overwrite entries on closed periods and surface a `period_closed_no_recompute` error code. Flag-on does not retroactively change past months.

## Consequences

### Positive

- Projected and official payroll share one participation decision.
- Mid-month entry, mid-month exit, and same-month entry/exit become auditable as one bounded interval.
- Future agents can reason about payroll inclusion through a named primitive instead of reverse-engineering inline SQL and calculation code.
- Felipe-like and Maria-like cases can be covered in the same regression matrix.
- TASK-890 stays the single source of truth for exit semantics; TASK-893 composes, does not duplicate.

### Negative / Costs

- Official payroll calculation changes behavior once the flag is enabled.
- Historical periods must not be recalculated silently; the `no_recompute_closed_periods` invariant is load-bearing.
- If source dates disagree, the resolver must choose deterministically and expose reason codes; otherwise operators will see unexplained deltas.
- Six downstream systems propagate the delta. Misaligned rollout (TASK-893 ON, TASK-890 OFF) produces partial correctness — the worst failure mode.
- `prorationFactor` in `ProjectedPayrollEntry` shifts from period-wide scalar to per-member; legacy tests pinning the period-wide value must migrate before Slice 3.

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
2. Verify `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` in staging BEFORE flipping TASK-893 flag (flag dependency canonical).
3. Run staging shadow compare with flag false, recording legacy vs new decisions.
4. Flip flag true in staging only.
5. Verify:
   - Felipe-like mid-month entry prorates from start date.
   - Maria-like external payroll exit remains excluded via TASK-890.
   - Full-month collaborators remain bit-for-bit equal.
   - Same-month entry/exit produces a bounded window.
   - 4 régimenes (chile_dependent, honorarios, deel, international_internal) each prorate correctly.
   - All 3 reliability signals readable and steady (delta < 5%, full_month_drift = 0, source_disagreement reports actual count).
6. Keep production flag false until staging evidence is accepted by HR/Finance.
7. Pre-flip checklist before production:
   - TASK-890 flag on in production for >= 7 days steady.
   - HR/Finance written approval (documented in `Handoff.md`).
   - Validation with `greenhouse-payroll-auditor` that finiquito calculation (TASK-862/863) handles same-month entry+exit correctly.
   - Coordination message to downstream consumers (Finance P&L, ICO observers) that personnel expense may decrease for joiner months.
8. Flip production via Vercel env var + redeploy only after pre-flip checklist green.

## Hard Rules — Canonical (lift to `CLAUDE.md` post-Slice 6)

- **NUNCA** replicar la matriz `(lane, status, cutoff)` en consumers nuevos. Toda decisión de exit pasa por `resolveExitEligibilityForMembers`; toda decisión de entry + exit pasa por `resolvePayrollParticipationWindowsForMembers` (compone TASK-890).
- **NUNCA** modelar días previos al inicio contractual como attendance / leave / unpaid. Participation ≠ attendance.
- **NUNCA** fixear projection sin fixear official. Ambos paths consumen la misma primitive.
- **NUNCA** activar `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` sin: (a) `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en mismo env; (b) staging shadow compare >= 7d verde; (c) HR/Finance approval OOB documentado.
- **NUNCA** recomputar período cerrado (`status IN ('exported','approved')`) silente. Requiere capability `payroll.period.force_recompute` + reason >= 20 chars + audit row (V1.1).
- **NUNCA** branchear lógica de consumer en `reasonCodes`. Branch en `policy` (enum cerrado). Reason codes son forensic + operator copy.
- **NUNCA** leer `exitEligibilityWindow` desde rows attachados por `pgGetApplicableCompensationVersionsForPeriod`; el participation resolver SIEMPRE invoca `resolveExitEligibilityForMembers` explícito (independiente del estado del flag TASK-890).
- **NUNCA** poblar `eligibleFrom` con `relationshipStartDate` en V1; única source canónica es `compensation.effective_from`. Onboarding source es V1.1+ con materialización de columna canónica en `members`.
- **NUNCA** colapsar los 3 gates (intake / exit / participation) en uno. Son ortogonales by design.
- **NUNCA** skipear participation para honorarios. Los 4 regímenes prorratean con la misma basis (`countWeekdays`).
- **SIEMPRE** que un consumer payroll necesite `prorationFactor` per-member, leer el row mapped (post `pgGetApplicableCompensationVersionsForPeriod` con TASK-893 flag ON); NUNCA recomputar inline.
- **SIEMPRE** que emerja un régimen nuevo (más allá de los 4), declarar explícitamente cómo se aplica el `prorationFactor` antes de mergear.
- **SIEMPRE** que un proceso async downstream consume payroll entries (payment_obligations, cost attribution, ICO), respetar el invariante `no_recompute_closed_periods`.

## Revisit When

- Greenhouse adopts operational-calendar holidays as the legal proration basis instead of weekdays.
- Payroll needs split entries for multiple compensation versions inside the same period.
- HR introduces country-specific payroll regimes where proration basis differs by jurisdiction.
- Provider payroll (Deel/EOR) becomes source-of-truth for payable amount rather than Greenhouse storing an operational projection.

## Self-Critique

### What Breaks In 12 Months

The likely failure mode is **source-date drift**: compensation effective date, workforce relationship start date, and onboarding execution date disagree. V1 closes this by using compensation as the only source AND emitting `source_date_disagreement` signal that watches the would-be V1.1 source silently. When the signal accumulates count, the decision to introduce onboarding becomes data-driven, not gut-feel.

### What Breaks In 36 Months

Payroll may need **split entries per sub-period** when a person changes salary or contract type mid-month. This V1 window model does not create multiple entries; it prorates one selected compensation version. That is acceptable for V1 but must be revisited when intra-month compensation changes become common.

A second 36-month risk: the **triple-gate orchestration** (intake / exit / participation) may grow a fourth orthogonal dimension (e.g. legal hold, garnishment, leave override). Adding without an architectural review will produce drift between gates. The canonical pattern is: each gate has its own resolver + flag + signal; composition lives in the bulk reader, not in consumer code.

### Cognitive Debt Risk

Low if implemented as one primitive with ADR, tests, and docs. High if agents patch `project-payroll.ts`, `calculate-payroll.ts`, and SQL readers independently — the hard rule "NUNCA fixear projection sin fixear official" defends against this.

The `prorationFactor` type shift (period-wide scalar → per-member) is the highest-friction migration. Legacy tests mock it as a global 22-day factor. Slice 1 must lock the new shape before Slice 3 touches `projectPayrollForPeriod`.

### Observability Gap

Without shadow compare and reason-code distribution, operators may see lower payroll totals without understanding whether the delta is correct. The three reliability signals are load-bearing:

- `projection_delta_anomaly` tracks aggregate behavior (the "did the rollout move the needle as expected" question).
- `full_month_entry_drift` catches silent regression (the "did the fix accidentally stop working for someone" question).
- `source_date_disagreement` watches the V1.1 decision space passively (the "should we add onboarding as a second source yet" question).

Removing any of the three creates a blind spot. The first two are required for V1 rollout; the third is required for V1.1 evolution.

### Cross-Domain Coordination Risk

Six downstream systems consume payroll entries or their derivatives. The flag flip propagates a delta to all six. The mitigation is documenting them explicitly (see "Downstream Consumers" above) and the `no_recompute_closed_periods` invariant.

The highest-risk consumer is **final settlement (TASK-862/863)**: a same-month entry+exit case calculates indemnización + finiquito over a partial-month base. The Chilean legal framework treats this case explicitly (Art. 159 CT — voluntary resignation requires 30-day notice prorated). Whether the participation window primitive applies to finiquito calculation or finiquito has its own dedicated logic MUST be validated with `greenhouse-payroll-auditor` BEFORE Slice 4 ships. This is an Open Question, not a known answer.

