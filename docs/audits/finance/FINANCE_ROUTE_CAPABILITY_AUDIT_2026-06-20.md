# FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20

## Status

- Date: 2026-06-20
- Scope: rutas `src/app/api/finance/**`, `src/app/api/admin/finance/**` y `src/app/api/cost-intelligence/**`
- Auditor: Codex usando `greenhouse-finance-accounting-operator`
- Mode: `audit`
- Mutation policy: read-only sobre codigo; no se tocaron rutas runtime
- Parent finding: F9 en `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-06-20.md`
- Decision: `warning` con remediation prioritaria por oleadas

## Executive Summary

La auditoria confirma que Finance no esta "abierto" de forma general: **205 de 206 route files tienen algun tenant context directo**. El unico `POST` sin auth directa es `src/app/api/finance/quotes/hubspot/route.ts`, pero devuelve `410 Gone` sin ejecutar mutacion; es deuda de limpieza, no exposicion activa.

El riesgo real es otro: **75 rutas con metodos write usan auth de dominio/route-group pero no capability fina textual**. En Finance eso es demasiado ancho para operaciones sensibles como pago, tesoreria, DTE, syncs y materializadores. `requireFinanceTenantContext()` valida `routeGroup='finance'` o `efeonce_admin`; no distingue entre leer dashboard y marcar una orden como pagada. `requireBankTreasuryTenantContext()` mejora el acceso por view/rol, pero sigue sin separar permisos de lectura vs transferencia/mutacion.

Resultado: no hay evidencia de bypass anonimo, pero si hay **control gap** para segregacion de funciones, maker-checker, auditoria de acciones sensibles y principio de menor privilegio.

## Method

Inventario mecanico con `rg --files` y analisis de cada `route.ts`:

- `auth direct`: presencia de helpers como `requireFinanceTenantContext`, `requireAdminTenantContext`, `requireCommercialTenantContext`, `requireBankTreasuryTenantContext`, `requireCostIntelligenceTenantContext`, etc.
- `capability direct`: presencia textual de `can(...)`, `assert*Capability`, helpers `canClose*`, `canReopen*`, `canViewCostStack`, `hasRoleCode`, `roleCodes`.
- `write`: metodos `POST`, `PUT`, `PATCH`, `DELETE`.
- Revision manual focal de los helpers `src/lib/tenant/authorization.ts` y ejemplos sensibles.

Limitacion: esta auditoria no ejecuta requests contra staging ni prueba permisos por usuario real. Los falsos positivos son posibles si una ruta delega capability dentro de un comando profundo; aun asi, en Finance la regla operativa recomendada es que el gate sensible sea visible en el borde HTTP o en un helper de access importado por el borde.

## Inventory

| Bucket | Rutas | Write routes | Sin auth directa | Write con auth pero sin capability fina | Con capability directa |
|---|---:|---:|---:|---:|---:|
| commercial_quotes_contracts | 48 | 35 | 1 | 18 | 16 |
| income_expense_po | 32 | 22 | 0 | 19 | 3 |
| management_accounting | 23 | 4 | 0 | 2 | 2 |
| payment_orders | 12 | 9 | 0 | 7 | 2 |
| payment_profiles | 8 | 5 | 0 | 0 | 8 |
| read_misc | 44 | 20 | 0 | 8 | 16 |
| reconciliation | 16 | 15 | 0 | 1 | 14 |
| sync_admin | 14 | 9 | 0 | 7 | 3 |
| treasury_cash | 9 | 6 | 0 | 6 | 0 |
| **Total** | **206** | **125** | **1** | **75** | **57** |

## Findings

### RC1 - Payment Orders admin mutations lack fine-grained capabilities

Severity: `high`

Affected routes:

- `src/app/api/admin/finance/payment-orders/[orderId]/approve/route.ts`
- `src/app/api/admin/finance/payment-orders/[orderId]/cancel/route.ts`
- `src/app/api/admin/finance/payment-orders/[orderId]/mark-paid/route.ts`
- `src/app/api/admin/finance/payment-orders/[orderId]/schedule/route.ts`
- `src/app/api/admin/finance/payment-orders/[orderId]/submit/route.ts`
- `src/app/api/admin/finance/payment-orders/[orderId]/route.ts` (`PATCH`)
- `src/app/api/admin/finance/payment-orders/route.ts` (`POST`)

Observed gate: mostly `requireFinanceTenantContext()`.

Why it matters: payment order lifecycle changes money movement state, approval state, scheduling, settlement and evidence. A broad Finance route group is not equivalent to `submit`, `approve`, `schedule`, `mark_paid` or `cancel` authority.

Recommended fix:

- Introduce/import capability gates at the route boundary:
  - `finance.payment_orders.create`
  - `finance.payment_orders.submit`
  - `finance.payment_orders.approve`
  - `finance.payment_orders.schedule`
  - `finance.payment_orders.mark_paid`
  - `finance.payment_orders.cancel`
  - `finance.payment_orders.update`
- Keep existing command-level validations; do not replace them with the capability check.
- Add route tests for `403` on missing capability for each sensitive action.

### RC2 - Treasury and bank write routes rely on bank view access, not action capability

Severity: `high`

Affected routes:

- `src/app/api/finance/bank/route.ts` (`POST`)
- `src/app/api/finance/bank/[accountId]/route.ts` (`POST`)
- `src/app/api/finance/bank/transfer/route.ts`
- `src/app/api/finance/settlements/payment/route.ts` (`POST`)
- `src/app/api/finance/shareholder-account/route.ts` (`POST`)
- `src/app/api/finance/shareholder-account/[id]/movements/route.ts` (`POST`)

Observed gate: `requireBankTreasuryTenantContext()` or Finance context, but no action-level capability.

Why it matters: read access to bank/treasury is not the same as declaring accounts, posting transfers, creating settlement payments or mutating shareholder current account movements.

Recommended fix:

- Add treasury capability family:
  - `finance.bank_accounts.create`
  - `finance.bank_accounts.update`
  - `finance.bank_transfers.create`
  - `finance.settlements.record_payment`
  - `finance.shareholder_account.create`
  - `finance.shareholder_account.record_movement`
- Consider maker-checker for transfers and shareholder movements above material thresholds.

### RC3 - DTE, income, expenses, HES and purchase orders have many writes gated only by Finance route group

Severity: `high`

Representative affected routes:

- `src/app/api/finance/income/[id]/emit-dte/route.ts`
- `src/app/api/finance/income/batch-emit-dte/route.ts`
- `src/app/api/finance/income/[id]/payment/route.ts`
- `src/app/api/finance/income/[id]/payments/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/[id]/route.ts`
- `src/app/api/finance/expenses/[id]/payments/route.ts`
- `src/app/api/finance/expenses/bulk/route.ts`
- `src/app/api/finance/hes/[id]/approve/route.ts`
- `src/app/api/finance/hes/[id]/reject/route.ts`
- `src/app/api/finance/hes/[id]/submit/route.ts`
- `src/app/api/finance/purchase-orders/route.ts`
- `src/app/api/finance/purchase-orders/[id]/route.ts`
- `src/app/api/finance/purchase-orders/[id]/cancel/route.ts`

Observed gate: `requireFinanceTenantContext()` / `requireCommercialTenantContext()` in many cases, no capability visible in the route.

Why it matters: DTE emission, payment recording, HES approval and PO cancellation are financial/fiscal state transitions. They should not be authorized by the same broad gate as read-only dashboards.

Recommended fix:

- Split capabilities by action family:
  - DTE: `finance.income.emit_dte`, `finance.income.batch_emit_dte`
  - Income payments: `finance.income.record_payment`
  - Expense payments: `finance.expenses.record_payment`
  - HES: `finance.hes.submit`, `finance.hes.approve`, `finance.hes.reject`
  - Purchase Orders: `finance.purchase_orders.create`, `finance.purchase_orders.update`, `finance.purchase_orders.cancel`
- For fiscal emissions, add tests proving non-authorized Finance users cannot emit.

### RC4 - Sync/materialization endpoints are callable by any Finance route-group user

Severity: `medium-high`

Affected routes:

- `src/app/api/finance/nubox/sync/route.ts`
- `src/app/api/finance/economic-indicators/sync/route.ts`
- `src/app/api/finance/exchange-rates/sync/route.ts`
- `src/app/api/finance/clients/sync/route.ts`
- `src/app/api/finance/suppliers/backfill-provider-links/route.ts`
- `src/app/api/admin/finance/payment-obligations/materialize-period/route.ts`

Observed gate: Finance/Admin tenant context, no explicit sync/admin capability on several routes.

Important note: this overlaps operationally with TASK-1191. Do not edit Nubox sync routes in parallel with Claude's TASK-1191 implementation unless coordinated.

Recommended fix:

- Move scheduler-like syncs behind either:
  - Cloud Scheduler/ops-worker only, with cron/shared-secret guard where HTTP remains needed; or
  - admin-only capability such as `finance.sync.run`, `finance.nubox.sync`, `finance.fx.sync`, `finance.payment_obligations.materialize`.
- Ensure manual run endpoints are logged with actor, reason and period/scope.

### RC5 - Cost Intelligence close/reopen is better than average, but read vs write policy is implicit

Severity: `medium`

Observed:

- Cost Intelligence routes use `requireCostIntelligenceTenantContext()`.
- Close/reopen routes have specific helpers (`canCloseCostIntelligencePeriod`, `canReopenCostIntelligencePeriod`).
- Read endpoints rely on `canReadCostIntelligence`, which accepts Finance route group or `efeonce_admin`.

Treatment: acceptable for reads. Keep explicit close/reopen helpers. If future mutations are added under Cost Intelligence, require capability helpers at birth.

### RC6 - Deprecated `quotes/hubspot` is the only no-auth route; it returns 410

Severity: `low`

Route:

- `src/app/api/finance/quotes/hubspot/route.ts`

Observed behavior: `POST` logs a deprecation warning and returns `410 Gone`; no mutation runs.

Recommended fix: either keep as intentional public tombstone with a short comment in the route, or remove the route after confirming no clients call it. Do not treat it as urgent security exposure.

## Positive Controls

- `payment_profiles` is the strongest surface in this sample: all 8 routes show explicit capability/access helper usage.
- Reconciliation is mostly well-gated: 14 of 16 routes show capability checks; one remaining write (`reconciliation/auto-match`) should be reviewed, but the family pattern is healthy.
- Admin-only routes that already use `requireAdminTenantContext()` plus `can(...)` exist for sensitive repair/rematerialization paths (`payments-clp-repair`, `payroll-expense-rematerialize`, economic category reclassifications, Nubox export RFC dispositions).
- Cost Intelligence close/reopen already models stricter action helpers.

## Recommended Remediation Plan

### Wave 1 - Payment and treasury action gates

Registered as `TASK-1192`:

- payment order action capabilities + tests;
- bank/treasury/shareholder movement capabilities + tests;
- no schema changes unless capability registry/grants require migration.

This is the highest control value and does not overlap TASK-1191.

### Wave 2 - DTE, income/expense payment and HES gates

Registered as `TASK-1193`. Add action capabilities for fiscal emission and financial document state transitions. Include route tests for non-authorized Finance users.

### Wave 3 - Sync/materializer HTTP boundary

Registered as `TASK-1194`. TASK-1191 is complete, so this can proceed without changing fiscal-period semantics. Normalize sync routes into Cloud Scheduler/ops-worker or explicit admin capabilities with actor/reason audit.

### Wave 4 - Commercial quotes/contracts clean-up

Many quote/contract writes use commercial context and internal command rules. Audit separately by business action because pricing/catalog already has several stronger helpers. Do not block fiscal/treasury remediation on this wave.

## Registered Follow-up Tasks

- `TASK-1192` — `docs/tasks/to-do/TASK-1192-finance-payment-treasury-capability-gates.md`
- `TASK-1193` — `docs/tasks/to-do/TASK-1193-finance-fiscal-document-action-capability-gates.md`
- `TASK-1194` — `docs/tasks/to-do/TASK-1194-finance-sync-materializer-http-boundary-hardening.md`

## Verification

Commands/run context:

- `rg --files src/app/api/finance src/app/api/admin/finance src/app/api/cost-intelligence | rg '/route\\.(ts|tsx)$'`
- Node read-only classifier over route files for methods, auth helpers and capability tokens.
- Manual read of `src/lib/tenant/authorization.ts`.
- Manual spot checks of:
  - `src/app/api/finance/quotes/hubspot/route.ts`
  - `src/app/api/admin/finance/payment-orders/[orderId]/mark-paid/route.ts`
  - `src/app/api/finance/bank/transfer/route.ts`
  - `src/app/api/finance/nubox/sync/route.ts`

No runtime writes, no staging requests, no route code edits.
