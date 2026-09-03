# Contractor compensation, partial periods and reentry

## Canonical sources

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/documentation/hr/contratistas-compensacion.md`
- `docs/documentation/hr/contratistas-onboarding.md`
- `docs/manual-de-uso/finance/pagos-a-contractors.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_REENTRY_RECOVERY_DECISION_V1.md`
- `docs/operations/runbooks/workforce-reentry-recovery.md`

The Valentina audit at `docs/audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md` records a dated case and proof, not permission to repeat writes or a current-state reader.

## Diagnose before writing

1. Resolve the same canonical person across old/new email, user, member and identity links. A different email does not establish a different person; lack of a wizard search result does not prove nonexistence. Delegate identity reconciliation to its canonical recovery lane without widening roles.
2. Read legal relationships and engagements chronologically, with real effective dates and legal entity. Distinguish the old employee exit, old contractor service end and new contractor start. Current availability and contractual classification are separate axes.
3. Resolve both public and internal IDs, and join the exact episode to submissions, payables, obligations and payment orders. The current off-cycle writer looks up the internal `contractor_engagement_id`; `EO-CENG-…` alone can produce “engagement not found.” Do not recreate a contractor to fix that lookup.
4. Inventory existing work/payment for the period before any create. Preserve snapshots and state; an obligation or order is not a bank settlement.

## Recurring amount versus period amount

- The engagement compensation drawer stores **gross before withholding**, not a net promise. If the agreement is net, record that evidence and use the applicable tax policy/snapshot to derive gross with the canonical calculator. Verify current official rules where tax accuracy matters; never hardcode the 2026 Chile case for other periods or countries.
- `updateContractorEngagement` does not recalculate existing submissions/payables. Their snapshot amounts remain independent. Diagnose and correct the proper aggregate through its allowed commands; do not edit financial rows directly.
- In `work-submissions/store.ts`, missing explicit gross derives quantity × rate for hour/day and the full rate otherwise. The fixed monthly rate does **not** prorate automatically from service dates. The self-service composer sends no explicit gross.
- For a partial month, confirm inclusive dates, denominator/calendar convention, gross versus net promise, rounding and approval evidence. If the UI cannot express the authorized exception, an authorized administrative command composition is required; do not temporarily lower the recurring rate or invent a UI capability.
- For a net promise, derive the proportional net first, then gross-up through the applicable calculator; verify persisted gross − withholding = net. Preserve the formula and authorization as metadata/evidence. The operator-confirmed 12/31 used for August 2026 is a case decision, not a universal policy.
- Use `createContractorWorkSubmission` / allowed update → `submitContractorWorkSubmission` → `reviewContractorWorkSubmission` → `createContractorPayableFromSubmission`. Inspect eligibility and authorization for each action. Off-cycle is for genuine separate adjustments, not a duplicate of normal approved work.

## Reentry and historical liabilities

A new contractor episode belongs to the same profile, with a new effective relationship and engagement. Keep historical rates, submissions, payables, obligations and orders anchored to the old episode. Initiating closure can leave the old engagement `ending` while liabilities settle; never acknowledge blockers merely to manufacture a completed closure. Do not repeat the old employee transition to model a later contractor return.

The onboarding activation option permits a nonblocking `needs_review` classification; it does not certify that a legal review happened. Never copy a historical `classificationReviewed=true` into a new episode without evidence.

If historical offboarding damaged the active member or assignment, use the governed workforce reentry recovery command and its preview/snapshot/idempotency controls. Deployment of guards must precede restoration. Finance is outside that command's write set: protect exact records before/after and verify again after `member.updated`/`assignment.updated` consumers complete, since a successful transaction alone cannot prove durable recovery.

## Readiness and closure evidence

An approved work submission can yield a payable still blocked by `invoice_asset_missing`. Approval of work/money does not prove receipt of a boleta. Attach the correct document to the correct period/engagement and reassess; never reuse another episode's invoice or disable `requiresInvoice` to clear the blocker.

Report independently: recurring agreement, authorized period amount, payable status/blockers, obligation/order/bank settlement, lifecycle/assignment, identity/SSO eligibility, and deployment/consumer verification. “Active user” or eligible SSO is not evidence of an interactive login. Financial records unchanged after recovery are not evidence that a pending payment was paid.
