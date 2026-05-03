# EPIC-012 — Finance Five-Capabilities Operating System

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Owner: `unassigned`
- Branch: `epic/EPIC-012-finance-five-capabilities-operating-system`
- GitHub Issue: `[optional]`

## Summary

Coordina la evolución de Finance hacia cinco capacidades canónicas: `Treasury & Payments`, `Accounting Semantics`, `Management Accounting`, `Close Governance` y `Planning & Control Tower`. El objetivo es que Finance deje de ser un conjunto de dashboards y readers parcialmente correctos, y pase a ser un sistema financiero-operativo auditable, explicable y apto para cerrar períodos con confianza.

## Why This Epic Exists

La auditoría `FINANCE_DOMAIN_AUDIT_2026-05-03` confirmó una separación clara:

- la base transaccional de pagos, CLP readers, account balances y Payment Orders está relativamente sana
- la capa de management accounting todavía mezcla implementación V0, shortcuts legacy y clasificación/distribución incompleta
- el cierre de período puede marcar readiness sin gates financieros suficientes
- las mejoras necesarias ya existen como muchas tasks dispersas, pero falta un programa que las ordene por capacidad y dependencia

Este epic existe para convertir esas piezas en un sistema coherente y ejecutable.

## Outcome

- Finance opera con cinco capacidades explícitas y no con una bolsa de funcionalidades mezcladas.
- Mayo 2026 puede aspirar a ser el primer cierre finance-grade, sujeto a gates explícitos.
- `overhead_clp`, costos financieros, payroll/provider payroll, regulatory payments y shared operational overhead quedan separados y explicables.
- Cada métrica visible de Finance declara source reader, lente contable, freshness, close status y degradación.
- Budget, variance y forecast se construyen solo sobre actuals confiables.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-05-03.md`

## Capability Model

### 1. Treasury & Payments

Owner of:

- bank accounts and balances
- payment instruments
- payment orders
- settlement legs
- reconciliation
- payment processors and execution rails
- cash visibility and controls

Primary tasks:

- `TASK-707` — Previred canonical payment runtime and backfill
- `TASK-707a` — Previred detection and canonical state runtime
- `TASK-707b` — Previred historical backfill and rematerialize
- `TASK-707c` — Previred componentization runtime
- `TASK-756` — Payroll orders auto-generation
- `TASK-757` — Payment processor execution sync / Global66 webhook
- `TASK-224` — Finance Document vs Cash Semantic Contract

### 2. Accounting Semantics

Owner of:

- fiscal vs analytical category separation
- economic category quality
- expense distribution lanes
- document-vs-cash semantics
- financial cost vs operating cost boundaries

Primary tasks:

- `TASK-768` — completed foundation for `economic_category`
- `TASK-777` — canonical expense distribution and shared cost pools
- `TASK-397` — financial costs integration
- `TASK-224` — document-vs-cash semantic contract
- `TASK-725` — fiscal scope and legal entity foundation

### 3. Management Accounting

Owner of:

- operational P&L
- client / space / organization / BU profitability
- member loaded cost
- shared cost policy
- cost attribution explainability

Primary tasks:

- `TASK-176` — labor provisions fully-loaded cost
- `TASK-710` — tool consumption bridge
- `TASK-711` — member-tool license UI
- `TASK-712` — tool catalog consolidation
- `TASK-394` — scope expansion BU, legal entity and intercompany
- `TASK-777` — distribution lanes and shared pools

### 4. Close Governance

Owner of:

- period close workflow
- immutable snapshots
- reopen/restatement
- close gates
- readiness and degradation status
- prior-period adjustment governance

Primary tasks:

- `TASK-713` — period closing workflow
- `TASK-393` — period governance, restatements and reclassification
- `TASK-398` — enterprise hardening, explainability, RBAC, observability and runbooks

### 5. Planning & Control Tower

Owner of:

- budgets
- drivers
- variance
- forecast
- executive control tower
- metric registry and dependency graph
- stale/degraded data UX

Primary tasks:

- `TASK-416` — finance metric registry foundation
- `TASK-417` — finance metric registry reader primitives
- `TASK-418` — finance signal engine cutover to registry
- `TASK-419` — finance dashboard cutover to registry
- `TASK-421` — finance metric targets editable + effective dating
- `TASK-422` — metric quality gates + stale data UX
- `TASK-425` — finance metric dependency DAG
- `TASK-178` — finance budget engine
- `TASK-395` — planning engine, budgets, drivers and approval governance
- `TASK-396` — variance, forecast and executive control tower

## Execution Waves

### Wave 0 — Freeze Decision Quality

- Keep April 2026 explicitly provisional / restatement-needed.
- Do not close May 2026 as finance-grade until minimum gates exist.
- Use the existing healthy CLP/payment/account-balance readers as the cash foundation.

### Wave 1 — Make P&L Trustworthy

- Execute `TASK-777`.
- Separate `shared_operational_overhead`, `shared_financial_cost`, `provider_payroll`, `regulatory_payment` and `member_direct_labor`.
- Refactor `member_capacity_economics`, `commercial_cost_attribution` and `operational_pl` away from raw V0 shortcuts.

### Wave 2 — Make Close Real

- Execute `TASK-713` and `TASK-393`.
- Add close blockers for unresolved lanes, shared pool contamination, CLP drift, payment-order health and bank reconciliation policy.
- Add explicit `provisional`, `closed`, `reopened` and `restated` semantics to period reporting.

### Wave 3 — Complete Treasury/Payroll Payment Coverage

- Execute `TASK-707*`, `TASK-756` and `TASK-757`.
- Extend Payment Orders beyond `employee_net_pay`.
- Make Previred, employer social security, provider payroll and processor execution reconcile through canonical payment/settlement paths.

### Wave 4 — Build Planning & Control Tower

- Execute metric registry and DAG tasks.
- Then execute budget, variance and forecast tasks.
- Only promote executive control tower once actuals and close status are reliable.

## Child Tasks

- `TASK-777` — first execution task; fixes expense distribution lanes and shared pools
- `TASK-713` — period closing workflow
- `TASK-393` — restatements and reclassification governance
- `TASK-397` — financial costs integration
- `TASK-176` — fully-loaded labor provisions
- `TASK-710` — tool consumption bridge
- `TASK-711` — member-tool license UI
- `TASK-712` — tool catalog consolidation
- `TASK-707` / `TASK-707a` / `TASK-707b` / `TASK-707c` — Previred runtime and historical cleanup
- `TASK-756` — payroll orders auto-generation
- `TASK-757` — payment processor execution sync
- `TASK-224` — document-vs-cash semantic contract
- `TASK-416` / `TASK-417` / `TASK-418` / `TASK-419` / `TASK-421` / `TASK-422` / `TASK-425` — metric registry and control plane
- `TASK-178` / `TASK-395` / `TASK-396` — planning, budget, variance and forecast
- `TASK-398` — enterprise hardening

## Existing Related Work

- `TASK-766` — CLP currency reader contract
- `TASK-774` — account balance CLP-native reader contract
- `TASK-765` — payment order bank settlement resilience
- `TASK-768` — economic category dimension
- `TASK-280` — finance cash modules
- `TASK-282` — payment instrument reconciliation and settlement orchestration
- `TASK-283` — bank and treasury module
- `TASK-392` — reliable actual foundation program
- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-05-03.md`

## Exit Criteria

- [ ] The five Finance capabilities are documented and mapped to runtime owners.
- [ ] `overhead_clp` no longer includes provider payroll, regulatory payments or financial costs.
- [ ] Every expense has either a canonical distribution lane or an explicit unresolved state.
- [ ] Period close cannot reach finance-grade status while lane ambiguity, CLP drift, payment-order drift or required reconciliation gaps exist.
- [ ] Payment Orders cover payroll net pay, employer social security/provider payroll paths or explicitly block them with visible close impact.
- [ ] Core Finance dashboards use document readers for accrual and normalized payment readers for cash.
- [ ] Finance metrics declare source, accounting lens, freshness, close status and degradation.
- [ ] Budget/variance/forecast are built on closed or explicitly provisional actuals.

## Non-goals

- Opening full legal double-entry accounting inside Greenhouse.
- Replacing Nubox/SII fiscal systems as legal source of truth.
- Rebuilding all Finance UI in one large redesign.
- Implementing planning/forecast before actuals and close governance are trustworthy.

## Delta 2026-05-03

Created after `FINANCE_DOMAIN_AUDIT_2026-05-03` and user decision to frame Finance around five capabilities instead of a single overloaded module.
