# FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20

## Status

- Date: 2026-06-20
- Auditor: Codex usando `greenhouse-finance-accounting-operator` + `greenhouse-documentation-governor`
- Mode: `audit`
- Mutation policy: audit inicial read-only sobre runtime; deltas posteriores documentan fixes locales aplicados
- Runtime checked: Cloud SQL dev via `pnpm pg:doctor` y `pnpm pg:connect --shell`
- Scope requested: ventas, compras, ingresos, egresos, ordenes de compra, banco, flujo de caja, F29/F22, payment orders, conciliacion, Cost Intelligence, syncs, alertas e integraciones
- Decision: `warning`

## Executive Decision

Finance **funciona y no muestra corrupcion critica de caja/ledger** en la BD viva revisada. La base transaccional esta sana: pagos CLP sin drift FX, payment orders pagadas con su `expense_payment`, account balances frescos al 2026-06-20, outbox finance sin pendientes y `income_settlement_reconciliation` con `0` drift.

Pero Finance **todavia no esta cerrado como sistema financiero market-grade completo**. Los bloqueos no son "no hay modulo"; son controles, observabilidad y fiscal/management accounting todavia provisionales:

1. `DTE emission queue` estaba peor que en el audit anterior: la tabla no existia en Cloud SQL y el helper ejecutaba DDL en runtime (`CREATE TABLE IF NOT EXISTS`). Delta Codex 2026-06-20: `TASK-1194` Slice 0 agrego migracion gobernada `20260620193557859_task-1194-dte-emission-queue-governed-ddl.sql`, la aplico en Cloud SQL dev y dejo el runtime validation-only. Slice 0b deja code-complete el scheduler home: processor canónico compartido, ops-worker `POST /finance/dte-emission-retry`, Cloud Scheduler job `ops-finance-dte-emission-retry` en `deploy.sh`, y pattern async-critical en los gates. Falta deploy/re-smoke del ops-worker.
2. Las mutaciones sensibles siguen dependiendo de route-group amplio en varias familias. `TASK-1192`, `TASK-1193` y `TASK-1194` siguen siendo obligatorias.
3. F29 mensual esta compuesto y `TASK-1195` aparece complete local-first, pero retencion/PPM siguen en shadow/flag OFF y PPM usa tasa placeholder `placeholder_pending_contador`.
4. F22 anual (`TASK-1196`) no debe tomarse como listo: requiere regla de regimen/tasa IDPC, fuente RLI y validacion contable.
5. Junio 2026 no es margen canonico: `operational_pl` tiene revenue con costo `0` porque falta upstream payroll/labor allocation.
6. `/api/finance/data-quality` reportaba falsos warnings porque usaba `SUM(payments)` raw y no el canon con superseded/settlement/factoring. Quedó corregido localmente: income usa `income_settlement_reconciliation`; expenses usa `expense_payments_normalized` activo. Falta deploy/re-smoke.
7. Integraciones outbound comerciales tienen 4 handlers `degraded` (quotation HubSpot y Sample Sprint HubSpot). No rompen caja, pero si afectan quote-to-cash/commercial sync.
8. Staging expuso un 500 real en `/api/finance/dashboard/pnl`: el query de ingresos leia `effective_cost_amount_clp` desde `income`, pero esa columna es de `expenses`. El fix local cambia ingresos a `SUM(total_amount_clp)` y agrega test anti-regresion; falta deploy/re-smoke.
9. La segunda pasada de superficie amplia encontró 205 rutas Finance/admin Finance/cron Finance, 123 write routes y 116 write routes sin capability fina visible por scan estatico. La brecha de controles es mas grande que el numero previo de 75 rutas y debe tratarse como programa de hardening, no como fix puntual.
10. Operativamente hay backlog AR/AP: 32 receivables vencidas por 83.386.937 CLP y 129 payables vencidas por 18.370.018,95 CLP. Esto no contradice que el ledger este sano; indica que Finance aun no esta listo para prometer cobranza/pagos/close operativo sin limpieza.

## Accounting Lens

| Layer | Decision | Evidence |
|---|---|---|
| Transactional finance | `pass with warnings` | 75 `income`, 226 `expenses`; 0 paid-without-ledger canonico; 0 FX repair required |
| Treasury / cash / bank | `pass` | 8 cuentas activas con `account_balances` al 2026-06-20; payment account pending post-cutover = 0 |
| Payment orders | `pass with control warning` | 5 paid orders, 0 paid orders without `expense_payment`; capability gates pendientes |
| Purchase orders | `pass with low data volume` | 2 active POs CLP por 6.903.000 autorizados; ISSUE-045 resuelto |
| Fiscal monthly F29 | `provisional` | VAT 30 periods latest 2026-06; retention 2 periods; PPM 19 periods with placeholder rate |
| DTE retry | `code fixed, rollout pending` | Migracion gobernada aplicada en Cloud SQL dev + helper validation-only; scheduler home code-complete en ops-worker/deploy.sh; Cloud Scheduler rollout pendiente |
| Management accounting / P&L | `provisional` | CCA sano hasta 2026-05; 2026-06 revenue 6.902.000 with cost 0 |
| PnL dashboard endpoint | `code fixed, rollout pending` | staging 500 por columna inexistente; fix local usa `income.total_amount_clp` |
| Controls / access | `warning high` | 123 write routes in Finance/admin Finance; 116 without visible fine capability by static scan |
| Sync / integrations | `warning` | finance outbox ok; 4 commercial outbound handlers degraded; Vercel cron parity gap remains |

## Runtime Evidence Snapshot

### Refresh pass — 2026-06-20 19:45 UTC

Third pass after commits `20434dc49`, `6b622fa0d` and `d07dec5ce` reconfirmed the audit against current Cloud SQL dev plus staging API:

| Area | Fresh evidence | Decision |
|---|---|---|
| DB auth / runtime role | `pnpm pg:doctor` healthy; runtime `greenhouse_app` has `USAGE` on governed schemas and no `CREATE` on schemas | pass |
| Core finance counts | unchanged: 75 income, 226 expenses, 27 income payments, 121 expense payments, 9 payment orders, 2 purchase orders, 8 accounts | stable |
| Ledger/cash integrity | income settlement drift 0; income paid-without-active-payment 0; expense paid-without-active-payment 0; income/expense FX repair required 0/0 | pass |
| DTE queue | `greenhouse_finance.dte_emission_queue` exists and has 0 rows | DB infra pass; scheduler code fixed locally, rollout pending |
| Bank balances | all 8 active accounts have latest `balance_date=2026-06-20` | cash snapshot pass |
| Bank API freshness signal | staging `/api/finance/bank` returns HTTP 200, but `freshness.isStale=true` because `lastMaterializedAt` is ~10h old despite same-day balances | code fixed locally; rollout pending |
| Payment orders | staging `/api/admin/finance/payment-orders` HTTP 200, total 9; DB paid-without-expense-payment 0 | pass with control warning |
| Purchase orders | staging `/api/finance/purchase-orders` HTTP 200, 2 active POs, 6.903.000 CLP authorized | pass with low data volume |
| Income / expenses summaries | staging `/api/finance/income/summary` and `/api/finance/expenses/summary` HTTP 200 | pass |
| Cashflow / dashboard summary | staging `/api/finance/dashboard/summary` and `/api/finance/dashboard/cashflow` HTTP 200 | pass |
| PnL dashboard | staging `/api/finance/dashboard/pnl` still HTTP 500 | rollout pending; local fix not deployed |
| Data quality endpoint | staging `/api/finance/data-quality` HTTP 200 but still reports stale ledger false positives: 4 income + 69 expense raw drifts | rollout pending; local fix not deployed |
| F29 consolidated | staging `/api/finance/f29/monthly-position` still HTTP 404 | rollout pending; local TASK-1195 not deployed |
| VAT monthly | staging `/api/finance/vat/monthly-position` HTTP 200 for 2026-06, net VAT 1.085.952,22 CLP | pass as VAT line |
| Retention / PPM / F22 | retention 2 periods, PPM 19 periods, 1 placeholder PPM config, `f22_annual_positions` table absent | provisional / not official |
| Operational P&L | staging and DB both show June 2026 revenue 6.902.000 CLP, cost 0 across scopes | provisional; margin not canonical |
| Handler health | DB: 283 healthy, 4 degraded (`quotation_hubspot_outbound:*`, `sample_sprint_hubspot_outbound:*`) | warning |
| AR/AP backlog | DB: 32 overdue receivables for 83.384.328 CLP; 129 overdue payables for 18.370.018,95 CLP; 70 unresolved external cash signals for 24.313.807 native amount | operational backlog |
| Economic category manual queue | 171 pending, 10 archived | operational backlog |

Important nuance: staging is currently behind local `develop` by at least the local Finance fixes. The failures for PnL, F29 consolidated and data-quality ledger false positives are therefore rollout gaps, not necessarily current repo-code gaps. Because the operator has not asked for push/deploy, they remain documented as rollout pending.

### Refresh pass — 2026-06-20 20:00 UTC

Fourth pass reconfirmed the same DB/runtime posture and advanced `FD-1` locally:

| Area | Fresh evidence | Decision |
|---|---|---|
| DB auth / runtime role | `pnpm pg:doctor` healthy; runtime role still has schema `USAGE` and no schema `CREATE` | pass |
| Staging rollout | PnL still HTTP 500, F29 consolidated still HTTP 404, data-quality still reports raw ledger false positives, bank freshness still stale despite same-day balances | rollout pending |
| Core finance counts | income 75, expenses 226, income payments 27, expense payments 121, payment orders 9, purchase orders 2, accounts 8, account balances 1712 | stable |
| Ledger/cash integrity | income settlement drift 0; income paid-without-active-payment 0; expense paid-without-active-payment 0; income/expense FX repair required 0/0 | pass |
| Bank balances | all 8 active accounts have latest `balance_date=2026-06-20`, `computed_at` around 09:00 UTC | cash snapshot pass |
| Payment orders | 5 paid, 3 cancelled, 1 pending approval; paid-without-expense-payment 0 | pass with control warning |
| Purchase orders | 2 active POs, 6.903.000 CLP authorized, 0 invoiced, 6.903.000 remaining | pass with low data volume |
| Fiscal readiness | VAT 30 periods, retention 2, PPM 19, 1 placeholder PPM config, `f22_annual_positions` missing | provisional |
| AR/AP backlog | 33 open receivables for 90.286.328 CLP, of which 32 are overdue for 83.384.328 CLP; 157 open payables for 31.282.727,17 CLP, of which 129 are overdue for 18.370.018,95 CLP | operational backlog |
| External signals / economic category | external cash signals: 70 unresolved, 21 adopted, 65 dismissed; economic category queue: 171 pending, 10 archived | operational backlog |
| Operational P&L | June 2026 revenue 6.902.000 CLP and cost 0 across client/space/organization | provisional; margin not canonical |
| DTE queue | `greenhouse_finance.dte_emission_queue` exists and has 0 rows | pass for DB infra |
| DTE retry scheduler | Code complete locally: `processDteEmissionRetryQueue`, ops-worker `POST /finance/dte-emission-retry`, `ops-finance-dte-emission-retry` every 15 min in deploy script, async-critical pattern in cron gates | rollout pending |
| Quote data | commercial quotations 57 / 119.953.739,68 CLP; finance quotes 37 / 112.379.302 CLP; commercial and finance quote line orphans 0/0 | pass on read integrity |

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

Initial finding: `greenhouse_finance.dte_emission_queue` did not exist in Cloud SQL (`to_regclass = null`). The code path `src/lib/finance/dte-emission-queue.ts` owned schema creation with:

- `CREATE TABLE IF NOT EXISTS greenhouse_finance.dte_emission_queue`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`

This was not acceptable for runtime. Finance already fixed the same class for `commercial_cost_attribution` in `TASK-1190`: DDL belongs in migration governance, runtime validates/uses the provisioned table. The audit F2 should be upgraded from "cron orphan" to:

1. missing governed migration/runtime table in current DB;
2. runtime DDL anti-pattern;
3. cron still not registered in the canonical scheduler lane.

Delta Codex 2026-06-20: folded into `TASK-1194` Slice 0. Code now has governed migration `20260620193557859_task-1194-dte-emission-queue-governed-ddl.sql`; `ensureDteEmissionQueueSchema()` now queries `information_schema.columns` and fails honestly if the provisioned table is missing or incomplete. The helper no longer runs `CREATE`, `ALTER` or `CREATE INDEX` at request time. The migration was applied in Cloud SQL dev; `pnpm pg:connect:status` reports `No migrations to run` and `to_regclass('greenhouse_finance.dte_emission_queue')` returns the table with `0` rows. Remaining: register or intentionally retire `/api/cron/dte-emission-retry` in the canonical scheduler lane.

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
- `/api/finance/data-quality` returned `overallStatus=error`: staging still includes stale ledger-warning logic until deploy, plus real operational backlog (`overdue_receivables`, direct costs without client, Nubox balance divergence, annulled expenses).

Second staging smoke pass (60 GET endpoints, authenticated agent, no writes):

| Result | Count | Notes |
|---|---:|---|
| HTTP 2xx on first call | 53 / 60 | Core dashboards, cash, bank, accounts, income, expenses, POs, clients, suppliers, products, contracts, quotes, payment orders, obligations, fiscal lines, intelligence, commercial intelligence, FX/economic indicators, Nubox, reconciliation and contractor payables responded |
| Expected 400 validation | 4 / 60 | Missing query params on pricing lookup, allocations, exchange-rate readiness and reconciliation snapshots; all retested OK with valid params |
| Real runtime failures | 3 / 60 | PnL 500 until deploy, F29 404 until TASK-1195 deploy, ledger-health 503 by design because health is not clean |

Validated parameterized retries:

- `/api/finance/quotes/pricing/lookup?type=role` -> 200, `items:10`.
- `/api/finance/intelligence/allocations?year=2026&month=6` -> 200, `items:0`.
- `/api/finance/exchange-rates/readiness?from=USD&to=CLP&domain=finance_core` -> 200, USD->CLP supported, rate age 1 day.
- `/api/finance/reconciliation/snapshots?accountId=santander-clp` -> 200, `snapshots:1`.

### Static API surface scan

Static route scan scope: `src/app/api/finance/**`, `src/app/api/admin/finance/**` and Finance-owned crons (`outbox-react-finance`, `finance-ai-signals`, `dte-emission-retry`, `reconciliation-auto-match`, `hubspot-quotes-sync`, `nubox-quotes-hot-sync`).

| Family | Routes | Write routes | Visible fine capability |
|---|---:|---:|---:|
| `finance` | 159 | 98 | 0 |
| `admin/finance` | 40 | 25 | 10 |
| Finance crons | 6 | 0 | n/a |
| **Total** | **205** | **123** | **10 write-capable route files with capability markers** |

Write-route families with the largest capability gap:

| Family | Write routes without visible capability | Notes |
|---|---:|---|
| `quotes` | 20 | Quote lifecycle, line items, issue/send/approve, cost overrides, pricing config |
| `reconciliation` | 15 | match/unmatch/archive/exclude/auto-match/intelligence |
| `admin/payment-orders` | 9 | approve/submit/schedule/mark-paid/cancel/recover |
| `income` | 8 | payments, DTE emit/batch emit, factoring, reconcile payments |
| `contractor-payables` | 6 | ready/cancel/waive/override/monthly run |
| `master-agreements` | 6 | agreements, clauses, signatures, library |
| `quotation-governance` | 6 | templates, terms, approval policies |
| `expenses` + `hes` | 8 | expense create/update/payments, HES submit/approve/reject |
| `bank` + `purchase-orders` | 6 | bank writes/transfers and PO create/update/cancel |

This is a static scan, not a full authorization proof. Some routes may enforce access through local helpers not matching the regex. But as an audit signal it upgrades `FD-2`: the capability hardening wave must cover the whole write surface, not only the 75 routes in the earlier audit.

### Sales / purchases / AR / AP operating data

Commercial and finance quote data is structurally present:

| Check | Result |
|---|---|
| `greenhouse_commercial.quotations` | 43 `draft`, 12 `issued`, 2 `expired`; 119.953.739,68 CLP total quoted |
| `greenhouse_finance.quotes` | 18 `issued`, 12 `sent`, 7 `draft`; 112.379.302 CLP total quoted |
| Commercial quotation line orphans | 0 |
| Finance quote line orphans | 0 |

Operating backlog:

| Check | Result |
|---|---:|
| Income `pending` | 32 rows, 89.536.937 CLP |
| Income `partial` | 1 row, 752.000 CLP |
| Overdue receivables | 32 rows, 83.386.937 CLP |
| Expenses `pending` | 157 rows, 31.282.727,17 CLP |
| Overdue payables | 129 rows, 18.370.018,95 CLP |
| Overdue payable type mix | 128 supplier rows, 1 contractor row |
| External cash signals `unresolved` | 70 rows, 24.313.807 native amount |
| Payment profiles | 7 active, 5 draft, 2 pending approval, 2 cancelled, 1 superseded |

Interpretation: this is not evidence of ledger corruption. It is evidence that the operational close/cash action queue is not clean enough to call Finance "works well" in the management sense. Aging, payment status cleanup, signal adoption/dismissal and payable scheduling must be treated as part of the Finance readiness program.

## Findings

### FD-1 - DTE retry queue had runtime DDL and no table in Cloud SQL

Severity: `high`

The prior audit described the DTE retry cron as orphaned with an empty queue. The deeper check shows the table itself is absent in current Cloud SQL, and the helper would create it at runtime. That violates the Finance DDL governance pattern and can fail under runtime roles or remain unobservable until the first retry path executes.

Treatment applied locally under `TASK-1194` Slice 0:

- Added governed migration `20260620193557859_task-1194-dte-emission-queue-governed-ddl.sql` for `greenhouse_finance.dte_emission_queue`, grants and pending/retry index.
- Removed runtime DDL from `ensureDteEmissionQueueSchema()`; it now validates required columns and fails with a migration-specific error if the table is absent/incomplete.
- Added anti-regression coverage proving enqueue does not execute `CREATE`/`ALTER`/`DROP` and missing governed schema fails before insert.
- Applied the migration in Cloud SQL dev; `pnpm pg:connect:status` reports no pending migrations and SQL smoke confirms `greenhouse_finance.dte_emission_queue` exists with `0` rows.

Remaining:

- Deploy/re-smoke `ops-finance-dte-emission-retry` from `services/ops-worker/deploy.sh`.
- Add reliability signal for pending/retry/dead-letter queue state.

### FD-2 - Action-level Finance capabilities remain the highest control gap

Severity: `high`

The control concern is larger than the earlier route audit. A fresh static scan found 123 write-capable Finance/admin Finance route files, with 116 not showing a fine-grained capability marker. Some may have local access helpers not caught by the scan, but the result is enough to treat the control gap as program-level.

The most sensitive waves are already planned:

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

### FD-5 - `/api/finance/data-quality` ledger checks were stale relative to canonical ledger semantics

Severity: `medium`

The endpoint compares `amount_paid` to raw `SUM(income_payments)` / `SUM(expense_payments)`. That can over-warning because:

- income with factoring should reconcile through `income_settlement_reconciliation`;
- payments should exclude superseded chains (`superseded_by_payment_id`, `superseded_by_otb_id`, `superseded_at`);
- canonical paid-without-ledger is 0/0, while raw drift counted 4 income / 69 expense rows.

Treatment applied locally:

- Income ledger drift now reads `greenhouse_finance.income_settlement_reconciliation.has_drift`.
- Income paid-without-ledger now checks active rows through `greenhouse_finance.income_payments_normalized`.
- Expense ledger drift now compares `expenses.amount_paid` to `SUM(expense_payments_normalized.payment_amount_native)`, which excludes superseded rows.
- Expense paid-without-ledger now checks active rows through `greenhouse_finance.expense_payments_normalized`.
- Anti-regression test ensures the endpoint no longer reintroduces raw `SUM(amount)` over `income_payments` / `expense_payments`.

Runtime evidence: Cloud SQL raw expense drift was 69, canonical active-native expense drift is 0; `income_settlement_reconciliation` drift is 0. Remaining: deploy to staging and re-smoke `/api/finance/data-quality`.

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

### FD-11 - AR/AP operating backlog prevents a clean Finance close posture

Severity: `medium-high`

The ledger/cash primitives are consistent, but the operating queues are not clean:

- 32 overdue receivables totaling 83.386.937 CLP.
- 129 overdue payables totaling 18.370.018,95 CLP.
- 70 unresolved external cash signals totaling 24.313.807 native amount.
- 5 draft and 2 pending-approval beneficiary payment profiles.

This should not be described as corruption; it is an operational readiness gap. Before Finance can be called "funciona bien" for management operations, the team needs an explicit AR/AP cleanup policy:

- confirm whether old pending expenses are real obligations, legacy status debt, or cancelled/written-off rows;
- schedule/action valid payables through payment orders;
- resolve/adopt/dismiss external cash signals;
- assign owners and aging thresholds for overdue receivables.

### FD-12 - Quote-to-cash read surface is healthy, but write controls are weak

Severity: `medium-high`

Sales/quotes data exists and line-item integrity looks healthy:

- `greenhouse_commercial.quotations`: 57 rows, 0 orphan line items.
- `greenhouse_finance.quotes`: 37 rows, 0 orphan line items.
- Staging GET `/api/finance/quotes` returned 48 items; pricing lookup with `type=role` returned 200.

But the write route scan found 20 `quotes` write routes without visible fine capability markers, including lifecycle and price-affecting routes (`issue`, `send`, `approve`, `cost-override`, `pricing/config`). Quote-to-cash should be included explicitly in the capability hardening plan, even though the immediate ECG-004 pricing data issue is resolved.

### FD-13 - Bank freshness signal was over-sensitive for daily snapshots

Severity: `medium-low`

Staging `/api/finance/bank` returns HTTP 200 and all 8 active accounts have `balance_date=2026-06-20` in Cloud SQL. The same response still marks:

- `freshness.lastMaterializedAt = 2026-06-20 09:00:02Z`
- `freshness.ageSeconds ~= 38.740`
- `freshness.isStale = true`
- `freshness.label = Hace 10 h`

Root cause: `src/lib/finance/bank-freshness.ts` applied a 1-hour threshold to `computed_at`, while the canonical ops-worker balance materializer runs daily (`ops-finance-rematerialize-balances`) and the account snapshot date is already current. For a no-payment current day, a 10-hour-old computed snapshot can be faithful and should not render as stale.

Treatment applied locally:

- `buildFreshnessSignal()` now accepts coverage metadata (`latestBalanceDate`, `expectedFreshThroughDate`) and treats a snapshot as fresh when the materialized balance date covers the requested period end.
- `getBankOverview()` passes `MAX(balance_date)` plus `periodEnd`; `getBankAccountDetail()` passes the account snapshot `balance_date` plus the overview period end.
- The computed-at threshold remains as fallback when coverage dates are unknown.
- Anti-regression test covers:
  - same-day covered snapshot with old `computed_at` -> not stale;
  - stale when materialized balance date does not cover expected date;
  - fallback threshold when coverage is unknown.
- GVC local `/finance/bank` passed after webpack warmup: `.captures/2026-06-20T19-51-30_inline-finance-bank`. Frame and aria evidence show the page rendered without skeleton/login/error and without the stale snapshot banner; the separate FX materialization degraded warning remains visible.

Remaining: deploy/re-smoke staging `/api/finance/bank`; staging will keep showing the old freshness behavior until deploy.

## What Is Ready

- Transactional ledgers: income/expense payments have no FX repair required.
- Cash/bank: balances fresh through 2026-06-20 for all active accounts.
- Payment orders: paid orders have expense payment side effects.
- Purchase orders: create/read bug from `ISSUE-045` is resolved.
- Pricing quote gap from `ISSUE-055` is resolved.
- Quote data: commercial/finance quotation line items have 0 orphan rows; staging quote reads and pricing lookup respond.
- Data-quality ledger false positives are fixed locally with canonical settlement/normalized payment sources.
- Cost attribution technical recovery from `TASK-1190` is effective: CCA handlers are no longer failed.
- VAT legal-entity scope and fiscal period stamping are in place.
- F29 consolidated reader has the right design and appears complete local-first.
- PnL dashboard 500 root cause is fixed locally with a focused anti-regression test.
- Bank freshness false warning has a local fix with focal tests and GVC evidence.
- Staging confirms core read surfaces respond: dashboard summary, cashflow, bank, income summary, expense summary, payment orders, purchase orders, quote pricing lookup, VAT monthly and operational P&L.

## What Is Missing

Priority order if the goal is "Finance funciona y funciona bien":

1. Deploy/re-smoke the new `ops-finance-dte-emission-retry` scheduler home and add DTE queue reliability signal (`FD-1` remainder).
2. Deploy/re-smoke the local PnL dashboard fix in staging (`FD-10`).
3. Deploy/re-smoke the local `data-quality` false-positive ledger fix (`FD-5`).
4. Deploy/re-smoke TASK-1195/F29 consolidated endpoint and card if it is ready for staging.
5. Execute `TASK-1192` payment/treasury capability gates.
6. Execute `TASK-1193` fiscal/document action gates.
7. Continue `TASK-1194` sync/materializer boundary beyond DTE queue DDL.
8. Validate retention + PPM with accountant and flip flags only after evidence.
9. Complete upstream payroll/labor allocation for June 2026 before using margin.
10. Drain `economic_category_manual_queue`.
11. Provision Teams Finance Alerts webhook (`ISSUE-058`).
12. Decide finance AI signal source-of-truth before Nexa finance actions.
13. Add navigation/viewCode for `/finance/external-signals`.
14. Triage AR/AP backlog: 32 overdue receivables, 129 overdue payables, 70 unresolved external cash signals and pending/draft payment profiles.
15. Deploy/re-smoke the bank freshness signal fix (`FD-13`).
16. Extend capability hardening beyond the original count: static scan now shows 123 write routes and 116 without visible fine capability markers, with `quotes` and `reconciliation` as the largest surfaces.

## Verification Performed

- `git status --short --branch`
- `git diff -- tsconfig.json`
- `pnpm pg:doctor`
- `pnpm pg:connect --shell` read-only SQL probes against Cloud SQL dev
- `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/cash-position/route.test.ts src/app/api/finance/cash-in/route.test.ts src/app/api/finance/cash-out/route.test.ts src/app/api/finance/dashboard/summary/route.test.ts src/app/api/finance/dashboard/cashflow/route.test.ts src/app/api/finance/dashboard/pnl/route.test.ts src/app/api/finance/income/summary/route.test.ts src/app/api/finance/expenses/summary/route.test.ts src/lib/finance/payment-orders/mark-paid-atomic.test.ts src/lib/finance/payment-orders/transitions.test.ts src/lib/finance/payment-orders/source-instrument-policy.test.ts src/app/api/finance/purchase-orders/route.test.ts src/lib/finance/vat-ledger.test.ts src/lib/finance/retention-ledger.test.ts src/lib/finance/ppm-ledger.test.ts src/lib/finance/f29-consolidated.test.ts`
- `pnpm finance:e2e-gate`
- Read-only staging API smoke across Finance dashboard, cash, bank, payment orders, purchase orders, summaries, fiscal monthly positions and operational P&L.
- Second read-only staging API smoke: 60 GET endpoints; 53 passed first call, 4 parameter-validation endpoints passed with valid params, 3 real failures remained (PnL 500 pending deploy, F29 404 pending deploy, ledger-health 503 by design).
- Third read-only refresh pass at 2026-06-20 19:45 UTC:
  - `pnpm pg:doctor`
  - Cloud SQL probes for core counts, canonical ledger/cash integrity, DTE queue, AR/AP backlog, F29/F22 readiness, CCA/OPL and handler health.
  - Staging API probes: `dashboard/summary` 200, `dashboard/cashflow` 200, `bank` 200, `income/summary` 200, `expenses/summary` 200, `admin/finance/payment-orders` 200, `purchase-orders` 200, `quotes/pricing/lookup?type=role` 200, `vat/monthly-position` 200, `intelligence/operational-pl?year=2026&month=6&scope=client` 200, `dashboard/pnl` 500, `f29/monthly-position` 404, `data-quality` 200 with stale raw ledger warnings, `admin/finance/ledger-health` 503 by design/backlog.
- `pnpm exec vitest run src/lib/finance/bank-freshness.test.ts`
- `pnpm exec vitest run src/lib/finance/bank-freshness.test.ts src/app/api/finance/cash-position/route.test.ts src/app/api/finance/dashboard/cashflow/route.test.ts`
- `pnpm exec eslint src/lib/finance/bank-freshness.ts src/lib/finance/bank-freshness.test.ts src/lib/finance/account-balances.ts`
- GVC local `/finance/bank`: first run blocked by initial webpack compile/skeleton; second run passed at `.captures/2026-06-20T19-51-30_inline-finance-bank`.
- `pnpm exec vitest run src/lib/finance/dte-emission-retry.test.ts src/app/api/cron/dte-emission-retry/route.test.ts services/ops-worker/deploy-contract.test.ts src/lib/reliability/queries/cron-staging-drift.test.ts services/ops-worker/cron-handler-wrapper.test.ts`
- `pnpm exec eslint src/lib/finance/dte-emission-retry.ts src/lib/finance/dte-emission-retry.test.ts src/app/api/cron/dte-emission-retry/route.ts src/app/api/cron/dte-emission-retry/route.test.ts services/ops-worker/server.ts services/ops-worker/deploy-contract.test.ts scripts/ci/vercel-cron-async-critical-gate.mjs src/lib/reliability/queries/cron-staging-drift.ts`
- `pnpm typecheck`
- `pnpm vercel-cron-gate`
- `pnpm worker:runtime-deps-gate`
- `pnpm finance:e2e-gate` (skipped: no Finance product route handlers changed)
- `pnpm qa:gates --changed --agent codex --task TASK-1194 --finance --runtime --cron --docs`
- Static API route scan for `src/app/api/finance/**`, `src/app/api/admin/finance/**` and Finance-owned crons.
- Read-only Cloud SQL probes for commercial/finance quotations, quote line orphans, AR/AP aging, payment profiles and external cash signals.
- Read-only Cloud SQL probe comparing raw vs canonical data-quality ledger drift (`expense` raw 69 -> canonical 0; income settlement drift 0).
- `pnpm exec vitest run src/app/api/finance/data-quality/route.test.ts`
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
