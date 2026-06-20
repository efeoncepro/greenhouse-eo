# FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20

## Status

- Date: 2026-06-20
- Auditor: Codex usando `greenhouse-finance-accounting-operator` + `greenhouse-documentation-governor`
- Mode: `audit`
- Mutation policy: read-only sobre runtime; solo se documenta evidencia
- Runtime checked: Cloud SQL dev via `pnpm pg:doctor` y `pnpm pg:connect --shell`
- Scope requested: ventas, compras, ingresos, egresos, ordenes de compra, banco, flujo de caja, F29/F22, payment orders, conciliacion, Cost Intelligence, syncs, alertas e integraciones
- Decision: `warning`

## Executive Decision

Finance **funciona y no muestra corrupcion critica de caja/ledger** en la BD viva revisada. La base transaccional esta sana: pagos CLP sin drift FX, payment orders pagadas con su `expense_payment`, account balances frescos al 2026-06-20, outbox finance sin pendientes y `income_settlement_reconciliation` con `0` drift.

Pero Finance **todavia no esta cerrado como sistema financiero market-grade completo**. Los bloqueos no son "no hay modulo"; son controles, observabilidad y fiscal/management accounting todavia provisionales:

1. `DTE emission queue` esta peor que en el audit anterior: la tabla no existe en Cloud SQL y el helper todavia ejecuta DDL en runtime (`CREATE TABLE IF NOT EXISTS`). Esto debe moverse a migracion gobernada y entrar en `TASK-1194` o task focal.
2. Las mutaciones sensibles siguen dependiendo de route-group amplio en varias familias. `TASK-1192`, `TASK-1193` y `TASK-1194` siguen siendo obligatorias.
3. F29 mensual esta compuesto y `TASK-1195` aparece complete local-first, pero retencion/PPM siguen en shadow/flag OFF y PPM usa tasa placeholder `placeholder_pending_contador`.
4. F22 anual (`TASK-1196`) no debe tomarse como listo: requiere regla de regimen/tasa IDPC, fuente RLI y validacion contable.
5. Junio 2026 no es margen canonico: `operational_pl` tiene revenue con costo `0` porque falta upstream payroll/labor allocation.
6. `/api/finance/data-quality` puede reportar falsos warnings porque usa `SUM(payments)` raw y no el canon con superseded/settlement/factoring.
7. Integraciones outbound comerciales tienen 4 handlers `degraded` (quotation HubSpot y Sample Sprint HubSpot). No rompen caja, pero si afectan quote-to-cash/commercial sync.
8. Staging expuso un 500 real en `/api/finance/dashboard/pnl`: el query de ingresos leia `effective_cost_amount_clp` desde `income`, pero esa columna es de `expenses`. El fix local cambia ingresos a `SUM(total_amount_clp)` y agrega test anti-regresion; falta deploy/re-smoke.

## Accounting Lens

| Layer | Decision | Evidence |
|---|---|---|
| Transactional finance | `pass with warnings` | 75 `income`, 226 `expenses`; 0 paid-without-ledger canonico; 0 FX repair required |
| Treasury / cash / bank | `pass` | 8 cuentas activas con `account_balances` al 2026-06-20; payment account pending post-cutover = 0 |
| Payment orders | `pass with control warning` | 5 paid orders, 0 paid orders without `expense_payment`; capability gates pendientes |
| Purchase orders | `pass with low data volume` | 2 active POs CLP por 6.903.000 autorizados; ISSUE-045 resuelto |
| Fiscal monthly F29 | `provisional` | VAT 30 periods latest 2026-06; retention 2 periods; PPM 19 periods with placeholder rate |
| DTE retry | `block` | `to_regclass('greenhouse_finance.dte_emission_queue') = null`; runtime helper creates schema |
| Management accounting / P&L | `provisional` | CCA sano hasta 2026-05; 2026-06 revenue 6.902.000 with cost 0 |
| PnL dashboard endpoint | `code fixed, rollout pending` | staging 500 por columna inexistente; fix local usa `income.total_amount_clp` |
| Controls / access | `warning high` | 75 write routes with auth but no fine capability per route audit |
| Sync / integrations | `warning` | finance outbox ok; 4 commercial outbound handlers degraded; Vercel cron parity gap remains |

## Runtime Evidence Snapshot

### Core counts

| Object | Count |
|---|---:|
| `greenhouse_finance.income` | 75 |
| `greenhouse_finance.expenses` | 226 |
| `greenhouse_finance.income_payments` | 27 |
| `greenhouse_finance.expense_payments` | 121 |
| `greenhouse_finance.payment_orders` | 9 |
| `greenhouse_finance.payment_order_lines` | 11 |
| `greenhouse_finance.payment_obligations` | 22 |
| `greenhouse_finance.purchase_orders` | 2 |
| `greenhouse_finance.accounts` | 8 |
| `greenhouse_finance.account_balances` | 1712 |
| `greenhouse_finance.settlement_groups` | 33 |
| `greenhouse_finance.settlement_legs` | 54 |
| `greenhouse_finance.vat_monthly_positions` | 30 |
| `greenhouse_finance.retention_monthly_positions` | 2 |
| `greenhouse_finance.ppm_monthly_positions` | 19 |
| `greenhouse_serving.commercial_cost_attribution` | 12 |
| `greenhouse_serving.operational_pl_snapshots` | 45 |

### Ledger / cash integrity

| Check | Result | Decision |
|---|---:|---|
| `expense_payments.requires_fx_repair` | 0 | pass |
| `income_payments.requires_fx_repair` | 0 | pass |
| Canonical `income amount_paid > 0` without payment row | 0 | pass |
| Canonical `expense amount_paid > 0` without payment row | 0 | pass |
| `income_settlement_reconciliation.has_drift` | 0 / 75 | pass |
| Active payments without account after TASK-708 cutover | 0 income / 0 expense | pass |
| Active payments without account before cutover | 0 income / 0 expense | pass |

Important correction: an initial broad query counted 65 expense payments without `payment_account_id`, but those rows are not active under the canonical TASK-708 definition because `superseded_at` must also be excluded. The canonical post-cutover count is 0.

### Bank / treasury

All active accounts have balances materialized through 2026-06-20.

| Account | Category | Currency | Latest balance date | Latest closing balance |
|---|---|---|---|---:|
| `santander-clp` | bank_account | CLP | 2026-06-20 | 1.212.492,07 |
| `santander-usd-usd` | bank_account | USD | 2026-06-20 | 1,94 |
| `santander-corp-clp` | credit_card | CLP | 2026-06-20 | 1.910.235,69 |
| `global66-clp` | fintech | CLP | 2026-06-20 | -2.603,41 |
| `global-66-mxn-mxn` | fintech | MXN | 2026-06-20 | 0 |
| `deel-clp` | payment_platform | CLP | 2026-06-20 | 0 |
| `previred-clp` | payroll_processor | CLP | 2026-06-20 | 0 |
| `sha-cca-julio-reyes-clp` | shareholder_account | CLP | 2026-06-20 | 172.495,43 |

### Payment orders / obligations

| Check | Result |
|---|---|
| Payment orders by state | 5 `paid`, 3 `cancelled`, 1 `pending_approval` |
| Paid orders without `expense_payment` | 0 |
| Active order lines without `expense_payment` | 1, expected because the order is not paid yet |
| Obligations | payroll generated/paid/cancelled + 1 contractor payable scheduled |

Control caveat: runtime state is consistent, but action-level capability gates remain pending in `TASK-1192`.

### Purchase orders

| State | Count | Authorized CLP | Invoiced CLP | Remaining CLP |
|---|---:|---:|---:|---:|
| active | 2 | 6.903.000 | 0 | 6.903.000 |

`ISSUE-045` is resolved; create/read worked in staging in the prior session. Remaining control work for PO create/update/cancel belongs to `TASK-1193`.

### Fiscal monthly position

| Line | Coverage | Latest period | Decision |
|---|---:|---|---|
| VAT / IVA | 30 periods | 2026-06 | official line, scope by legal entity |
| Retention | 2 periods | 2026-06 | shadow until accountant validation + flag flip |
| PPM | 19 periods | 2026-06 | shadow; rate is placeholder pending accountant |
| F29 consolidated reader | complete local-first | 2026-06 smoke data available | right design; staging/rollout still pending per Handoff |
| F22 annual | task to-do | n/a | not ready without tax/accountant decisions |

Latest 2026-06 values:

- VAT net position: 1.085.952,22 CLP.
- Retention: 138.646 CLP.
- PPM: 14.500 CLP over 5.800.000 CLP base at 0,25% placeholder.

### DTE retry queue

Finding: `greenhouse_finance.dte_emission_queue` does not exist in Cloud SQL (`to_regclass = null`). The code path `src/lib/finance/dte-emission-queue.ts` still owns schema creation with:

- `CREATE TABLE IF NOT EXISTS greenhouse_finance.dte_emission_queue`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`

This is not acceptable for runtime. Finance already fixed the same class for `commercial_cost_attribution` in `TASK-1190`: DDL belongs in migration governance, runtime validates/uses the provisioned table. The audit F2 should be upgraded from "cron orphan" to:

1. missing governed migration/runtime table in current DB;
2. runtime DDL anti-pattern;
3. cron still not registered in the canonical scheduler lane.

Recommended treatment: fold into `TASK-1194` if its hook confirms scope, or create a focused `TASK-*` for DTE retry queue governance.

### Cost intelligence / management accounting

`commercial_cost_attribution` is recovered through May 2026:

| Period | CCA rows | Loaded cost CLP |
|---|---:|---:|
| 2026-02 | 2 | 2.160.380,09 |
| 2026-03 | 3 | 3.318.254,00 |
| 2026-04 | 4 | 5.934.224,30 |
| 2026-05 | 3 | 2.706.028,15 |

`operational_pl_snapshots` still has revenue with cost 0 in 2025-11, 2025-12, 2026-01 and 2026-06. June 2026 has 6.902.000 CLP revenue and 0 cost across client/space/organization scopes. This is correctly surfaced by the `finance.operational_pl.cost_coverage_degraded` signal from `TASK-1190`; it must remain provisional until payroll/labor allocation upstream exists.

### Reactive / outbox / integrations

| Check | Result |
|---|---:|
| Finance outbox events not published | 0 |
| CCA active failed reactive logs | 0 |
| CCA failed handlers | 0 |
| Total failed handlers | 0 |
| Handler health | 283 healthy, 4 degraded |
| Finance AI enrichment runs | 66 |
| Finance AI signals | 0 |
| Finance AI signal enrichments | 0 |

Degraded handlers:

- `quotation_hubspot_outbound:commercial.quotation.created`
- `quotation_hubspot_outbound:commercial.quotation.issued`
- `quotation_hubspot_outbound:commercial.quotation.sent`
- `sample_sprint_hubspot_outbound:service.engagement.outbound_requested`

This is not a bank/cash blocker, but it is a commercial/quote-to-cash integration warning.

### Staging API smoke

Read-only staging requests showed the main finance surfaces responding, with three important caveats:

- `200`: dashboard summary, cashflow, cash position, cash-in/cash-out, bank, payment orders KPIs/list, purchase orders, income/expense summaries, VAT, retention, PPM and operational P&L.
- `500`: `/api/finance/dashboard/pnl` because the income query referenced `effective_cost_amount_clp`, a column that does not exist on `greenhouse_finance.income`. Local fix applied in `src/app/api/finance/dashboard/pnl/route.ts`; deploy/re-smoke pending.
- `404`: `/api/finance/f29/monthly-position` in staging because the TASK-1195 endpoint was still local-first/not deployed.
- `503`: `/api/admin/finance/ledger-health` is honest-blocking on operational backlog, not hidden corruption: canonical settlement drift and phantoms were 0, but unanchored legacy expenses and external cash signals remain unresolved.
- `/api/finance/data-quality` returned `overallStatus=error`: includes stale ledger-warning logic plus real operational backlog (`overdue_receivables`, direct costs without client, Nubox balance divergence, annulled expenses).

## Findings

### FD-1 - DTE retry queue has runtime DDL and no table in Cloud SQL

Severity: `high`

The prior audit described the DTE retry cron as orphaned with an empty queue. The deeper check shows the table itself is absent in current Cloud SQL, and the helper would create it at runtime. That violates the Finance DDL governance pattern and can fail under runtime roles or remain unobservable until the first retry path executes.

Recommended fix:

- Add governed migration for `greenhouse_finance.dte_emission_queue`.
- Remove DDL from `ensureDteEmissionQueueSchema()`; make it validate the table or fail honestly.
- Register or intentionally retire `/api/cron/dte-emission-retry`.
- Add reliability signal for pending/retry/dead-letter queue state.

### FD-2 - Action-level Finance capabilities remain the highest control gap

Severity: `high`

The route audit remains valid: 75 write routes have broad domain auth but no visible fine-grained capability. The most sensitive waves are already planned:

- `TASK-1192`: payment orders, bank/treasury, settlements, shareholder account.
- `TASK-1193`: DTE, income, expenses, HES, purchase orders.
- `TASK-1194`: sync/materializer HTTP boundary.

Do these before calling Finance control-ready under COSO/treasury expectations.

### FD-3 - F29 monthly is usable as consolidated shadow/official mix, not official filing output

Severity: `medium-high`

`TASK-1195` uses the right architecture: composition only, no duplicate tax SQL. But it is not official F29 output until:

- `RETENTION_POSITION_ENABLED=true` after accountant validation.
- `PPM_POSITION_ENABLED=true` after real SII/accountant PPM rate replaces placeholder.
- staging/runtime smoke is complete after deploy.

`TASK-1196` F22 annual should wait until those monthly foundations are stable.

### FD-4 - June 2026 margin is not canonical

Severity: `medium-high`

Cost Intelligence is recovered technically, but June has revenue with zero cost because upstream labor allocation is missing. Do not use June 2026 `operational_pl` as real margin for leadership, Nexa, pricing, or client profitability decisions until payroll/labor allocation is complete and the degradation signal clears.

### FD-5 - `/api/finance/data-quality` ledger checks are stale relative to canonical ledger semantics

Severity: `medium`

The endpoint compares `amount_paid` to raw `SUM(income_payments)` / `SUM(expense_payments)`. That can over-warning because:

- income with factoring should reconcile through `income_settlement_reconciliation`;
- payments should exclude superseded chains (`superseded_by_payment_id`, `superseded_by_otb_id`, `superseded_at`);
- canonical paid-without-ledger is 0/0, while raw drift counted 4 income / 69 expense rows.

Recommended fix:

- Refactor data-quality ledger checks to use `income_settlement_reconciliation` for income.
- Use active payment filters for expense payments.
- Add tests covering superseded and factoring cases.

### FD-6 - Economic category manual queue still needs operations drain

Severity: `medium`

`economic_category` itself is resolved on income/expenses, but the manual queue has 181 total rows and 171 `pending`. This is not cash/fiscal corruption, but it weakens analytic confidence and should be drained or reduced with declarative rules.

### FD-7 - Finance AI signals are empty despite enrichment runs

Severity: `medium`

There are 66 enrichment runs and 0 persisted `finance_ai_signals` / enrichments. Do not build Nexa drill/actions assuming finance signals are durable until the source-of-truth is decided.

### FD-8 - Commercial outbound HubSpot handlers degraded

Severity: `medium-low`

Four handlers are `degraded`, mostly quotation HubSpot outbound. This does not break the financial ledger, but it may affect sales/commercial synchronization and quote-to-cash visibility.

### FD-9 - External signals route discoverability remains open

Severity: `low`

`/finance/external-signals` exists but remains menu-less per prior audit. This should still be handled by `TASK-983`.

### FD-10 - PnL dashboard staging 500 from income/expense schema drift

Severity: `medium-high`

Staging returned 500 for `/api/finance/dashboard/pnl`. Vercel logs showed `column "effective_cost_amount_clp" does not exist`. Root cause: the income query used `COALESCE(effective_cost_amount_clp, total_amount_clp)` inside `FROM greenhouse_finance.income`, but `effective_cost_amount_clp` is an expense-side field. The canonical PnL architecture already defines revenue as `SUM(income.total_amount_clp)`.

Treatment applied locally:

- `src/app/api/finance/dashboard/pnl/route.ts` now calculates accrued income with `SUM(total_amount_clp)`.
- `src/app/api/finance/dashboard/pnl/route.test.ts` asserts the income query does not reference `effective_cost_amount_clp`.

Remaining: deploy to staging and re-smoke `/api/finance/dashboard/pnl`.

## What Is Ready

- Transactional ledgers: income/expense payments have no FX repair required.
- Cash/bank: balances fresh through 2026-06-20 for all active accounts.
- Payment orders: paid orders have expense payment side effects.
- Purchase orders: create/read bug from `ISSUE-045` is resolved.
- Pricing quote gap from `ISSUE-055` is resolved.
- Cost attribution technical recovery from `TASK-1190` is effective: CCA handlers are no longer failed.
- VAT legal-entity scope and fiscal period stamping are in place.
- F29 consolidated reader has the right design and appears complete local-first.
- PnL dashboard 500 root cause is fixed locally with a focused anti-regression test.

## What Is Missing

Priority order if the goal is "Finance funciona y funciona bien":

1. Fix/plan DTE retry queue governance (`FD-1`).
2. Execute `TASK-1192` payment/treasury capability gates.
3. Execute `TASK-1193` fiscal/document action gates.
4. Execute `TASK-1194` sync/materializer boundary, including DTE retry if scoped there.
5. Validate retention + PPM with accountant and flip flags only after evidence.
6. Complete upstream payroll/labor allocation for June 2026 before using margin.
7. Fix `data-quality` false-positive ledger checks.
8. Drain `economic_category_manual_queue`.
9. Provision Teams Finance Alerts webhook (`ISSUE-058`).
10. Decide finance AI signal source-of-truth before Nexa finance actions.
11. Add navigation/viewCode for `/finance/external-signals`.
12. Deploy/re-smoke the local PnL dashboard fix in staging.

## Verification Performed

- `git status --short --branch`
- `git diff -- tsconfig.json`
- `pnpm pg:doctor`
- `pnpm pg:connect --shell` read-only SQL probes against Cloud SQL dev
- `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/cash-position/route.test.ts src/app/api/finance/cash-in/route.test.ts src/app/api/finance/cash-out/route.test.ts src/app/api/finance/dashboard/summary/route.test.ts src/app/api/finance/dashboard/cashflow/route.test.ts src/app/api/finance/dashboard/pnl/route.test.ts src/app/api/finance/income/summary/route.test.ts src/app/api/finance/expenses/summary/route.test.ts src/lib/finance/payment-orders/mark-paid-atomic.test.ts src/lib/finance/payment-orders/transitions.test.ts src/lib/finance/payment-orders/source-instrument-policy.test.ts src/app/api/finance/purchase-orders/route.test.ts src/lib/finance/vat-ledger.test.ts src/lib/finance/retention-ledger.test.ts src/lib/finance/ppm-ledger.test.ts src/lib/finance/f29-consolidated.test.ts`
- `pnpm finance:e2e-gate`
- Read-only staging API smoke across Finance dashboard, cash, bank, payment orders, purchase orders, summaries, fiscal monthly positions and operational P&L.
- Vercel logs for `/api/finance/dashboard/pnl` 500.
- `pnpm exec vitest run src/app/api/finance/dashboard/pnl/route.test.ts` after the local PnL fix.
- Reads of finance architecture, runtime map, payment orders architecture, cash/bank docs, reconciliation docs, prior finance audits, route capability audit and selected source files.

Test result before PnL fix: 17 test files passed, 83 tests passed. PnL focal after fix: 1 test file passed, 3 tests passed.

## Limits / Not Verified

- No writes, migrations, backfills or runtime repairs were executed.
- No staging browser/GVC audit was run because this is backend/data/operability audit, not UI visible change.
- PnL dashboard fix is local/staged in git; staging will keep failing until deploy.
- No production DB was queried independently.
- No official tax/legal conclusion is made; retention/PPM/F22 need accountant/SII validation.
