# Accounting & Finance Playbook

## Objective

Help agents reason correctly about where a number belongs before they fix code, create tasks, or explain a finance issue.

This playbook complements repo-specific architecture with broader accounting, finance, treasury, and controls discipline. Use it to answer not only "what does the code do?" but also "would this treatment hold up under controller, auditor, or treasury review?".

## External anchors

- `IFRS Conceptual Framework`
  - use for faithful representation, comparability, materiality, and decision-usefulness
- `IAS 1`
  - use for presentation, reclassification, comparatives, and restatement discipline
- `IAS 7`
  - use for operating vs investing vs financing cash separation and cash reconciliation logic
- `IFRS 7`
  - use for liquidity, financing, and financial-instrument disclosure thinking
- `COSO`
  - use for control design, maker-checker, audit trail, exception handling, and close governance
- `AICPA/CIMA Global Management Accounting Principles`
  - use for cost causality, performance insight, planning, forecasting, and allocation quality
- `AFP`
  - use for payment controls, treasury discipline, callback procedures, and fraud-aware operations

## The 5 questions to ask first

1. Is this amount **operational**, **financial**, **fiscal**, **treasury**, or **payroll/provider-payroll**?
2. Is it **member-direct**, **client-direct**, **shared**, **regulatory**, **transit**, or **unallocated**?
3. Is the number being read from the **transactional layer**, a **normalized reader**, or a **serving snapshot**?
4. Is the issue a **classification** problem, a **distribution** problem, a **timing/period** problem, or a **consumer misuse** problem?
5. If we freeze this month now, would the snapshot be defendable in a finance review?
6. Which external benchmark would a controller, auditor, or treasury lead expect us to satisfy here?

## Canonical distinctions

### Management accounting vs fiscal accounting

- management accounting asks: “where should this hit margin, loaded cost, or budget?”
- fiscal accounting asks: “what is this legally and tax-wise?”

They can disagree without either one being “wrong”.

Example:

- Deel invoice
  - fiscal: supplier/provider
  - management: labor cost external / provider payroll

### Operating costs vs financial costs

Operating costs:

- labor
- tools/licenses
- direct delivery/vendor costs
- structural operating overhead

Financial costs:

- bank fees
- factoring fees
- FX loss
- treasury carry
- transfer costs

Do not hide financial costs inside operating overhead unless the system is explicitly showing an adjusted “all-in” margin and labels it honestly.

### Shared operational overhead vs shared financial cost

Shared operational overhead:

- core SaaS without direct client/member anchor
- office / admin infra
- firm-level operational subscriptions

Shared financial cost:

- bank maintenance
- factoring interest
- treasury spread
- transfer fees
- FX loss not traceable to one client

These pools can both be shared, but they should not be merged silently.

### Regulatory payment vs labor cost

Regulatory payments are often triggered by labor, but are not the same thing.

Examples:

- `Previred`
- AFP / Isapre / FONASA / Mutual
- tax authority settlements

The key question is whether the system should show them:

- as part of loaded labor cost
- as separate regulatory lane
- or both, with explainability

That must be explicit by policy.

### Recognition vs settlement vs attribution

Keep these three ideas separate:

- `recognition`
  - what the amount economically/accountingly is
- `settlement`
  - when and where cash actually moved
- `attribution`
  - how management reporting distributes the cost for margin and decision-making

A mature system does not force a single shortcut to represent all three.

## Practical decision table

| Scenario | Likely treatment |
|---|---|
| Deel pays Melkin | `provider_payroll` or `member_direct_labor` |
| Previred employer contribution for Valentina | `regulatory_payment` anchored to payroll period |
| HubSpot / Figma / Nubox shared business subscription | `shared_operational_overhead` unless tool/member anchors exist |
| X Capital bank/financial charge | `shared_financial_cost` unless client-direct evidence exists |
| Bank maintenance fee on collection account | `shared_financial_cost` |
| Client-specific reimbursable vendor payment | `client_direct_non_labor` |
| Internal transfer or settlement hop | `treasury_transit`, not P&L cost by default |

## What good looks like

- Shared-cost allocation policies are documented and explainable to non-engineers.
- Operating costs, financial costs, and statutory/regulatory obligations are not silently merged.
- Period close has explicit gates and a credible reopen/restatement path.
- Treasury reporting can explain balances using bank evidence and settlement movements.
- Payment operations have callback, approval, and evidence controls for exceptional actions.
- Manual reclassifications and overrides leave durable audit trails.
- Forecasting and cash views can separate expected collections/payments from already-settled cash.
- Management P&L can be reconciled back to the canonical readers that produced it.

## Period close guidance

### Safe to close

- disputed items are immaterial
- classification and distribution lanes are explicit
- consumers are reading the right snapshots
- residual issues are operational, not conceptual

### Provisional close only

- numbers are directionally useful
- at least one conceptual lane is still wrong
- business needs a frozen number now
- reopen/restatement path is explicit and accepted

### Do not close

- labor/provider-payroll/regulatory/financial costs are materially contaminating `overhead`
- the period would create a false management-accounting baseline
- the cleanup is not merely cosmetic or low-signal

## Recommended style of answer

When using this skill, avoid only saying “the metric is wrong”.

Prefer:

- what the amount is
- where it currently lands
- where it should land
- why the current path is wrong
- what primitive must change so the whole class of errors disappears
