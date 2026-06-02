# GREENHOUSE_WORKFORCE_PAYABLES_CONTROL_PLANE_V1

## Status

`Proposed`

## Date

2026-06-02

## Owner

Finance / Treasury / Payroll / HR / Workforce Platform

## Scope

Cross-domain payment operations for people paid by Efeonce:

- Payroll dependent workers and internal payroll entries.
- Payroll honorarios legacy entries.
- International / Deel / EOR payroll entries where Greenhouse holds an operational amount.
- Contractor engagements and contractor payables.
- Payment obligations, payment orders, payment readiness, payment artifacts, operational notifications, settlement state, remittance/payslip artifacts and reconciliation status.

This ADR does **not** redefine workforce identity, legal relationship source of truth, payroll calculation, contractor evidence workflow, tax formulas or document semantics.

## Reversibility

`two-way-but-slow`

Before implementation this decision is cheap to revise. After UI, signals, events and reports depend on the control plane, reversing would require cross-domain refactors across Payroll, Contractor Payables, Payment Orders, Notification Hub and Finance dashboards.

## Confidence

`High` for the convergence boundary. `Medium` for the exact V1 UI/read-model shape.

The existing runtime already proves the main architecture: Payroll and Contractors converge at `greenhouse_finance.payment_obligations`, `greenhouse_finance.payment_orders`, `expense_payments` and settlement. The unresolved part is productization and governance of that convergence.

## Validated as of

2026-06-02

Evidence validated from current repo/runtime documents and code:

- Payroll export package and notification path:
  - `src/lib/payroll/payroll-export-packages.ts`
  - `src/lib/sync/projections/payroll-export-ready.ts`
  - `src/lib/sync/projections/payroll-receipts.ts`
- Payroll payment obligation materialization:
  - `src/lib/finance/payment-obligations/materialize-payroll.ts`
  - `src/lib/sync/projections/payment-obligations-from-payroll.ts`
- Contractor payables and monthly run:
  - `src/lib/contractor-engagements/payables/monthly-run.ts`
  - `src/lib/contractor-engagements/payables/payment-run-store.ts`
  - `src/lib/sync/projections/contractor-payable-finance-obligation.ts`
  - `src/lib/sync/projections/contractor-payable-expense-materialize.ts`
  - `src/lib/sync/projections/contractor-payable-paid-cascade.ts`
- Payment Orders / Treasury convergence:
  - `src/lib/finance/payment-orders/create-from-obligations.ts`
  - `src/lib/finance/payment-orders/mark-paid-atomic.ts`
  - `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- Domain architecture:
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
  - `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`

No external vendor or pricing claims are introduced by this ADR.

## Context

Greenhouse now has two mature but separate workforce payment rails:

1. Payroll calculates and exports monthly payroll. After export, it materializes payment obligations and emits artifacts, receipts and operational notifications.
2. Contractor Engagements collect work evidence and boletas/invoices, create contractor payables, send them to Finance, create payment obligations, run a monthly contractor payment run and rely on Payment Orders to pay.

Both rails ultimately pay people who are part of the Efeonce workforce. From the operator perspective, Finance wants to answer questions like:

- Who in our workforce is pending payment this period?
- Which payments are blocked by profile, readiness, tax owner, source account or approval?
- Which payments are in an order, sent, paid, reconciled or missing artifacts?
- Which payment artifacts and notifications have been produced?
- Which withholdings or statutory obligations remain to be remitted separately?
- Are we honoring the payroll/contractor payment calendar?

Today those answers are distributed:

- Payroll owns calculation, entries, period export, payroll export packages, payslips and compliance exports.
- Contractor Payables owns work submissions, payables, gross/net/withholding and remittance advice.
- Payment Orders owns maker-checker, scheduling, source instrument, paid state and settlement.
- Finance expense/payment ledgers own cash settlement and reconciliation.
- Notification/email infrastructure owns delivery state.
- Reliability owns signals.

This distribution is correct by domain, but creates cognitive debt for operations. The right convergence is not a single calculation engine. The right convergence is a read/orchestration control plane over workforce payment obligations and downstream state.

## Decision

Greenhouse will introduce a **Workforce Payables Control Plane** as the canonical cross-domain operational layer for payments to people who work for Efeonce.

The control plane will:

- Treat Payroll and Contractor Payables as specialized upstream rails.
- Treat Payment Obligations and Payment Orders as the common Treasury execution layer.
- Provide a unified read model for workforce payment readiness, amount buckets, payment order status, settlement status, artifact status, notification status and reconciliation state.
- Normalize operator language for payment lifecycle without collapsing legal/regime semantics.
- Expose cross-domain operational views and signals for Finance/Treasury, HR/Payroll and executive workforce cost oversight.
- Reuse existing domain primitives before creating new schema or events.

The control plane will **not**:

- Calculate payroll.
- Calculate contractor payables.
- Replace `payroll_entries`.
- Replace `contractor_payables`.
- Replace `payment_orders`.
- Treat contractors as payroll employees.
- Treat Payroll export as paid.
- Treat Contractor run preparation as paid.
- Replace statutory compliance exports, final settlements, payslips or remittance advice.

The canonical convergence point is:

```text
Domain rail output
  -> payment_obligations
  -> payment_orders
  -> expense_payment / settlement_leg
  -> reconciliation
  -> artifact + notification lifecycle
```

## Relationship To Unified Workforce Foundation

`GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md` remains the broader proposed direction for person-centered workforce modeling.

This ADR is narrower:

- It does not decide the future person/work relationship schema.
- It does not require `members` to become a projection.
- It does not migrate identity or lifecycle write paths.
- It can ship as a read-first Finance/Treasury layer while the broader workforce foundation remains proposed.

If the Unified Workforce Foundation is later accepted, Workforce Payables should become one operational facet of that foundation. Until then, this ADR only governs payment operations and downstream visibility.

## Domain Boundary Contract

### Payroll remains owner of payroll calculation

Payroll owns:

- `payroll_periods`
- `payroll_entries`
- payroll readiness and calculation blockers
- Chile dependent formulas
- honorarios legacy payroll formulas
- international/Deel operational entries
- payroll receipts / payslips
- payroll export PDF/CSV packages
- Previred/LRE compliance exports
- final settlements / finiquitos where applicable

Payroll does not own:

- bank source account selection;
- maker-checker approval of payment orders;
- contractor evidence;
- contractor payable readiness;
- bank reconciliation.

### Contractor Engagements remains owner of contractor evidence and payables

Contractor domain owns:

- `contractor_engagements`
- contractor work submissions
- contractor payable state machine
- contractor gross/net/withholding snapshots
- agreed amount guardrail
- payment profile waiver/override semantics
- contractor remittance advice `EO-RA`
- contractor paid cascade after `finance.payment_order.paid`

Contractor domain does not own:

- payroll entries;
- Previred/LRE;
- finiquito;
- employee payroll calculation;
- source account settlement policy.

### Finance / Treasury remains owner of payment execution

Finance/Treasury owns:

- `payment_obligations`
- `payment_orders`
- source instrument policy
- maker-checker
- schedule/submit/paid lifecycle
- `expense_payments`
- `settlement_legs`
- bank reconciliation
- account balances
- processor/source account distinction

Finance/Treasury does not recalculate upstream amounts. It pays and reconciles amounts produced by the owning rail.

## Canonical Workforce Payment Categories

The control plane should classify rows by a stable operational category, separate from source schema names.

| Category | Upstream source | Obligation source/kind | Beneficiary | Payment amount | Artifact after paid |
|---|---|---|---|---|---|
| `employee_net_pay` | Payroll entry | `payroll` / `employee_net_pay` | `member` | payroll `net_total` | payroll payslip/receipt |
| `payroll_honorarios_net_pay` | Payroll entry with honorarios regime | `payroll` / `employee_net_pay` | `member` | payroll `net_total` | payroll honorarios receipt |
| `payroll_honorarios_withholding` | Payroll entry with honorarios retention | `payroll` / `employee_withheld_component` | `tax_authority=cl_sii` | SII retention | tax remittance evidence |
| `payroll_social_security` | Payroll period aggregate | `payroll` / `employer_social_security` | `supplier/tax_authority` | Previred total | Previred/LRE evidence |
| `contractor_net_pay` | Contractor payable | `contractor_payable` / `provider_payroll` | `member`/provider per payable | contractor `net_payable` | contractor remittance advice `EO-RA` |
| `contractor_withholding` | Contractor payable honorarios CL | future SII remittance obligation | `tax_authority=cl_sii` | contractor withholding | F29/F50 remittance evidence |
| `provider_or_eor_payroll` | Payroll/contractor provider rail | existing/future provider obligation | `supplier`/provider | provider payable amount | provider statement/remittance |

This table is an operational taxonomy for the control plane. It is not a license to mutate existing domain source rows.

## Canonical Lifecycle Vocabulary

The control plane should map domain states into a shared payment lifecycle:

```text
not_ready
  -> ready_to_obligate
  -> obligation_generated
  -> in_payment_order
  -> pending_approval
  -> approved
  -> scheduled
  -> submitted
  -> paid_unreconciled
  -> reconciled
  -> closed
```

Mapping examples:

- Payroll period not exported: `not_ready` or `ready_to_obligate` depending on payroll readiness.
- Payroll exported + obligation exists + no order: `obligation_generated`.
- Contractor payable `pending_readiness` / `blocked`: `not_ready`.
- Contractor payable `ready_for_finance`: `ready_to_obligate` or `obligation_generated` depending on bridge state.
- Contractor payable `payment_order_created`: `in_payment_order` or downstream order state.
- Payment order `paid` + expense payment not reconciled: `paid_unreconciled`.
- Payment order paid + reconciliation closed: `reconciled` / `closed`.

Shared labels must never imply legal equivalence. A contractor `paid_unreconciled` row and a payroll employee `paid_unreconciled` row share a Treasury state, not a labor regime.

## Artifact And Notification Contract

The control plane should expose but not own artifacts.

Payroll artifacts:

- payroll export PDF/CSV package;
- individual payslip/receipt PDFs;
- Previred/LRE compliance exports.

Contractor artifacts:

- contractor run PDF/Excel package;
- contractor boleta/invoice support;
- contractor remittance advice `EO-RA`;
- future withholding/remittance certificates.

Notification artifacts:

- `payroll_export` delivery;
- `payslip_*` delivery;
- `contractor_remittance_paid` delivery;
- proposed `contractor_payment_run_ready` delivery from TASK-993;
- future Teams/Notification Hub messages.

Rule: downloads are read-only. Operational notifications are triggered by domain lifecycle events, not by manual report download.

## Data Model Direction

V1 should be projection-first.

Recommended V1 shape:

```text
greenhouse_serving.workforce_payables_control
  payment_item_id
  payment_item_public_id
  workforce_subject_type
  identity_profile_id
  member_id
  display_name
  legal_relationship_id
  source_domain
  source_kind
  source_ref
  obligation_id
  payment_order_id
  payment_order_state
  lifecycle_state
  period_id
  period_year
  period_month
  due_date
  currency
  gross_amount
  net_amount
  withholding_amount
  employer_or_provider_amount
  beneficiary_type
  beneficiary_id
  payment_profile_state
  readiness_state
  readiness_blockers_json
  artifact_status_json
  notification_status_json
  settlement_status
  reconciliation_status
  stale_or_degraded_reason
  source_updated_at
  projected_at
```

This can be a SQL view, materialized projection, or server-side reader. The implementation task must decide after measuring query cost and drift requirements.

Hard rule: do not create a new write-path source of truth in V1.

## Event Direction

The control plane should observe existing events first:

- `payroll_period.exported`
- `finance.payment_order.created`
- `finance.payment_order.approved`
- `finance.payment_order.scheduled`
- `finance.payment_order.submitted`
- `finance.payment_order.paid`
- `finance.payment_order.cancelled`
- `workforce.contractor_payable.ready_for_finance`
- `workforce.contractor_payable.paid`
- `finance.contractor_payment_run.ready` proposed by TASK-993

If new events are introduced, they should describe control-plane projections or operational notification state. They must not duplicate domain events that already exist.

## Access Model

The control plane must use both Greenhouse access planes:

- visible surface via `view_registry` / `authorizedViews` / route group;
- fine actions via capabilities.

Suggested surface:

- route: `/finance/workforce-payables`
- route group: `finance`
- primary roles: `finance_admin`, `finance_analyst`, `efeonce_admin`
- optional read-only HR/Payroll facet later: `hr_payroll`, `hr_manager`

Suggested capabilities:

- `finance.workforce_payables.read`
- `finance.workforce_payables.export`
- `finance.workforce_payables.resend_notification`
- `finance.workforce_payables.view_sensitive_payment_route` only if sensitive payment profile details ever surface

V1 should not expose sensitive bank account numbers. It may deep-link to existing payment profile surfaces.

## UI / Product Direction

The V1 UI should be an operational workbench, not a marketing page.

Expected jobs:

1. See all workforce payables for a period.
2. Filter by rail: Payroll, Payroll honorarios, Contractor, Deel/EOR, tax/social security.
3. Filter by lifecycle: blocked, obligation generated, in order, pending approval, submitted, paid, reconciled.
4. Open a detail drawer showing source rail, amount breakdown, readiness blockers, payment order, artifact and notification status.
5. Deep-link to the owning surface:
   - Payroll period/entry;
   - Contractor payable;
   - Payment Order;
   - Payment Profile;
   - Reconciliation row;
   - Email delivery/admin preview where applicable.
6. Export an operational report that clearly separates gross, net, withholding, statutory and provider amounts.

No V1 action should mutate Payroll calculation or Contractor payable amounts from this workbench.

## Alternatives Considered

### Alternative 1: Keep Payroll and Contractors completely separate

Rejected as insufficient. The domains must remain separate for calculation, but Treasury/Finance already pays them through shared primitives. Keeping operations fully separate preserves cognitive debt and makes total workforce cash exposure harder to see.

### Alternative 2: Move contractors into Payroll

Rejected. Contractor payables are based on engagements, evidence, boletas/invoices and contractor-specific readiness. Collapsing them into `payroll_entries` would create legal, compliance and accounting confusion.

### Alternative 3: Create a universal `workforce_payment` write table now

Rejected for V1. It would introduce a new source of truth before proving the read model. The existing domain rails are already operational and sensitive. Projection-first is safer.

### Alternative 4: Use Payment Orders alone as the unified surface

Rejected as incomplete. Payment Orders starts after obligations exist. Operators also need pre-obligation readiness, artifacts, report packages and domain-specific blockers.

### Alternative 5: Build a Person 360-only facet

Rejected for V1. Person 360 is useful for individual history, but Finance/Treasury needs period/batch/cash operation views across many people.

## Consequences

### Positive

- Gives Finance one mental model for workforce payments.
- Preserves legal and calculation boundaries.
- Makes total workforce payment exposure visible before and after Payment Orders.
- Reuses mature Payroll and Contractor artifacts instead of duplicating reports.
- Reduces risk of double-pay, missed pay, stale artifacts and silent notification failures.
- Creates a natural home for SII withholding remittance convergence.
- Helps agents reason from one operational projection instead of table-specific heuristics.

### Negative

- Adds a new conceptual layer that must be documented clearly.
- Increases pressure on consistent lifecycle mapping and naming.
- Requires careful access controls because the view aggregates HR, Finance and payment facts.
- Can become a dumping ground if V1 accepts write actions too early.

### Neutral / contextual

- Does not replace Payroll or Contractor workbenches.
- Does not force acceptance of the broader Unified Workforce Foundation ADR.
- Does not eliminate domain-specific compliance documents.
- Does not remove the need for payment profiles, maker-checker, settlement or reconciliation.

## Runtime Contract

While this ADR is `Proposed`:

- No implementation may claim this as accepted runtime architecture.
- Research and task planning are allowed.
- Any implementation task must keep feature flags/read-only posture explicit until acceptance.

If accepted:

- New cross-domain workforce payment views should use this control-plane model.
- Payroll and Contractor rails remain upstream owners.
- Payment Orders remains Treasury owner.
- Downloads remain read-only.
- Operational notifications must trigger from lifecycle events, not report downloads.
- The first implementation must be projection-first and additive.
- Any new write action in the control plane requires a narrower follow-up ADR or explicit task slice with maker-checker, audit and rollback.

## Implementation Principles

1. Projection-first, no new source of truth in V1.
2. Deep-link to source owners, do not duplicate forms.
3. Map lifecycle states, do not rewrite domain states.
4. Preserve gross/net/withholding semantics exactly as source domains produce them.
5. Keep SII/Previred/social security obligations separate from net worker payments.
6. Separate artifact generation from notification delivery.
7. Use reliability signals for drift/dead-letter/stale projection.
8. Keep sensitive payment profile data masked by default.
9. Use GVC for visible UI verification.
10. Use Payment Orders for payment state; never infer paid from export/run.

## Self-Critique

### What breaks in 12 months?

If Efeonce adds more countries or legal entities, a V1 projection keyed only by `period_id` and `member_id` may become too weak. The projection must carry operating/legal entity and relationship context from day one, even if V1 only renders a subset.

### What breaks in 36 months?

If Greenhouse becomes a multi-entity, multi-country workforce platform, the control plane will need jurisdiction-aware grouping, local statutory obligations, provider statements, remittance certificates and multi-currency settlement. V1 should avoid naming that implies Chile-only or payroll-only.

### Cognitive debt risk

High if the UI says "nomina" for everything. The control plane must use "Workforce Payables" or Spanish equivalent carefully: "pagos de workforce" operationally, not "nomina" legally.

### Lock-in

Low vendor lock-in. The main lock-in is internal architecture: once dashboards and agents consume the projection, changing lifecycle vocabulary becomes expensive.

### Observability gap

The dangerous silent failures are:

- obligation not materialized after upstream event;
- payment order paid but downstream artifact/email missing;
- report package stale after recalculation/reliquidation;
- withholding computed but no remittance obligation exists;
- projection stale but UI appears healthy.

V1 must ship reliability signals before treating the control plane as operational truth.

### AI-specific risk

Agents could collapse legal distinctions if given a unified surface without source-domain metadata. Every row must carry `source_domain`, `source_kind`, `regime`, `legal_relationship_id` or equivalent evidence so agents can explain why an action belongs to Payroll, Contractor or Treasury.

### Regional / compliance gap

Chile honorarios withholding, Previred, F29/F50 and future non-resident withholding cannot be generalized by name. The control plane may show them together, but formulas and filing obligations remain owned by their compliance rails.

## Related Documents

- [GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md](GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md)
- [GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md](GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md)
- [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)
- [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)
- [GREENHOUSE_NOTIFICATION_HUB_V1.md](GREENHOUSE_NOTIFICATION_HUB_V1.md)
- [GREENHOUSE_EMAIL_PREVIEW_V1.md](GREENHOUSE_EMAIL_PREVIEW_V1.md)
- [TASK-993 - Contractor Payment Run Ready Email](../tasks/to-do/TASK-993-contractor-payment-run-ready-email.md)

## Revisit When

- The ADR `GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md` is accepted or superseded.
- Payroll adds obligation deltas for reliquidation.
- Contractor SII remittance obligations are automated.
- Payment Orders supports provider payroll / social security / tax obligations beyond current settlement branches.
- Efeonce adds a new legal operating entity outside Chile.
- Finance asks for one-click batch actions from the control plane, which would move this from read/control to command execution.
