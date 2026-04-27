# TASK-702 — Bank Reconciliation, Canonical Anchors & Account Balances Rematerialization

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Crítico`
- Effort: `Alto`
- Type: `implementation + remediation`
- Status real: `In Progress`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop` (continúa el flujo del catalog robustness)
- Legacy ID: `none`

## Summary

Cierra de raíz el desfase entre saldos bancarios reales y los que muestra Greenhouse (CLP $4.172.563 real vs $15.776.453 en sistema, drift de +$11.6M), agregando anclas canónicas a cada `expense_payment` / `income_payment`, supersede para phantoms Nubox sin payment_account_id, re-materialización idempotente de `account_balances`, conciliación marzo+abril 2026 contra cartolas reales y cierre de las 3 root causes Nubox/Payroll que producen drift recurrente.

## Why This Task Exists

- `account_balances` snapshot diario está congelado: 192 filas con `transaction_count=0`, opening==closing desde 2025-10-21. La cuenta USD no tiene snapshots. La TC muestra saldo positivo absurdo.
- Nubox sync crea `income_payments` con `payment_account_id IS NULL` (20+ phantoms detectados) — el motor de saldo los ignora.
- Nubox sync nunca crea `expense_payments` automático: `reconcileExpenseFromBankMovement` hace `UPDATE expense.payment_status='paid'` directo sin emitir el ledger trail. Solo 4 expense_payments en 2026 vs ~30 outflows reales en cartolas.
- Payroll runs nunca disparan `recordExpensePayment`. Las nóminas a colaboradores quedan como `expense kind=payroll` con `amount_paid=0` aunque el banco sí pagó.
- El factoring de abril 2026 (FO-326C62B0, INC-NB-27971848) está bien registrado vía `factoring_operations`, pero co-existe un phantom Nubox (`PAY-NUBOX-inc-3968935`, INC-NB-26639047) que doble-contabiliza. La VIEW `income_settlement_reconciliation` detecta este tipo de drift pero no se ataca.
- Cargos TC a tooling providers (Vercel $515.985, Adobe, Notion, Claude.ai, Metricool, ElevenLabs, OpenAI) deben anclarse a `greenhouse_ai.tool_catalog` para que cost attribution + client_economics no diverjan. Crear `expense_payments` huérfanos sin anchor degrada calculos downstream.
- Conciliación previa al cierre actual: 0 reconciliaciones reales (1 fila de prueba en marzo). 0 períodos creados para abril ni para USD ni para Global66.

## Goal

- Saldos al 27/04/2026: `account_balances.closing_balance` cuadra con saldo bancario real para Santander CLP ($4.172.563), Santander USD (USD 1,94), Global66 (~$380), TC Santander Corp (saldo deuda).
- Cada `bank_statement_row` queda anclado a un objeto canónico (factoring_operation_id, payroll_entry_id, tool_catalog tool_id, expense.supplier_id, etc.) o explícitamente `excluded` con razón.
- Phantoms Nubox marcados como `superseded` (no eliminados — preservan audit) cuando exista un payment canónico equivalente.
- Conciliación marzo+abril 2026 cerrada (`is_period_closed=true`) para CLP, USD, Global66; abril cerrado para TC.
- 3 PRs Nubox/Payroll que cierran las raíces para que de aquí en adelante el ciclo sea automático y trazable.
- Cargos a costos (cost_attribution / client_economics) se materializan correctamente vía outbox events anclados.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias (en CLAUDE.md):

- VIEW canónica `income_settlement_reconciliation` (TASK-571) es la única lectura para drift de ledger. No re-derivar.
- Phantoms NO se eliminan por DELETE manual — se marcan `superseded_by` con audit (mismo patrón que `projection_refresh_queue` orphan archive).
- Sentinel anti-empty-name (TASK-588) sigue vigente; helper `displayProjectName` + co.
- Outbox events anclados a anchor canónico; reactive projections NO deben recalcularse desde un ledger inconsistente.

## Dependencies & Impact

### Depends on

- Migración `20260408120005013_finance-account-balances-and-treasury` (account_balances)
- Migración `20260408103211338_finance-reconciliation-ledger-orchestration` (settlement_groups + bank_statement_rows)
- Migración `20260427143400960_task-701-payment-provider-catalog` (payment_provider_catalog FK)
- Migración `20260427181028993_payment-provider-catalog-canonical-resync` (catálogo idempotente)
- Migración `20260413195519177_factoring-operations-fee-breakdown` (fee desglosada)
- Migración `20260426135618436_add-income-settlement-reconciliation-view` (TASK-571)
- VIEW `income_settlement_reconciliation`
- Tabla `greenhouse_ai.tool_catalog` (anchor para tooling)
- Tabla `greenhouse_payroll.payroll_entries` (anchor para nómina)

### Blocks / Impacts

- TASK-518 (ApexCharts deprecation) — no impacta
- Cost attribution + `client_economics` — los expense_payments con anchor disparan re-materialización vía outbox. Validar que `commercial_cost_attribution` queda coherente al cerrar.
- Reliability dashboard — se agrega signal `payment_ledger_drift` para detectar drift futuro.

### Files owned

- `migrations/<ts>_finance-canonical-anchors-and-supersede.sql`
- `migrations/<ts>_finance-loan-accounts-scaffold.sql` (si necesario)
- `src/lib/finance/payment-instruments/anchored-payments.ts`
- `src/lib/finance/payment-instruments/preflight-bank-row.ts`
- `src/lib/finance/payment-instruments/supersede.ts`
- `src/lib/finance/payment-instruments/__tests__/anchored-payments.test.ts`
- `src/lib/finance/payment-instruments/__tests__/preflight-bank-row.test.ts`
- `src/lib/finance/account-balances-rematerialize.ts`
- `scripts/finance/rematerialize-account-balances.ts`
- `scripts/finance/preflight-bank-conciliation-report.ts`
- `src/app/api/finance/reconciliation/[id]/anchor-payment/route.ts`
- `src/app/api/admin/finance/ledger-health/route.ts`
- `docs/tasks/in-progress/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Current Repo State

### Already exists

- `expense` table tiene columnas anchor: `payroll_entry_id`, `payroll_period_id`, `member_id`, `tax_type`, `tax_period`, `social_security_type`, `linked_income_id`, `nubox_purchase_id` — ya cubren todos los anclajes que necesitamos (no como FK formal, pero el shape está)
- `income_payments` y `expense_payments` tienen `reconciliation_row_id` FK a `bank_statement_rows`
- `factoring_operations` con `linked_payment_id`, `linked_expense_id`, `interest_amount + advisory_fee_amount` desglosado
- VIEW `income_settlement_reconciliation` para drift de ledger
- `bank_statement_rows` con fingerprint MD5 idempotente
- `settlement_groups` + `settlement_legs` con modos `internal_transfer | fx_conversion | funding | fee | receipt | payout`
- Parser Santander CLP en `src/lib/finance/csv-parser.ts`
- UI `/finance/reconciliation` y `/finance/bank`
- Auto-match scoring engine en `src/lib/finance/auto-match.ts`
- `tool_catalog` (`greenhouse_ai`) con tool_id + subscription_amount + currency
- `payment_provider_catalog` canónico (TASK-701 + commit 95323f28)

### Gap

- Ninguna FK enforcement en columnas anchor de `expense` (pueden quedar dangling)
- No hay `superseded_by_payment_id` en payment tables → phantoms no se excluyen del trigger `fn_sync_expense_amount_paid`
- No hay tabla `loan_accounts` para anclar Pago Cuota Crédito 420051383906
- No hay factories TS canónicas para crear payments anchored
- `account_balances` tiene 192 filas con state stale; no hay script de re-materialización idempotente
- `recordExpensePayment` no se llama desde Nubox sync ni desde Payroll → hueco crítico
- `recordPayment` (Nubox income) llama sin `paymentAccountId` → 20+ phantoms detectados
- 0 conciliaciones reales en `bank_statement_rows` (solo 1 fila de prueba)
- 0 períodos en abril, USD, Global66, TC

## Scope

### Slice 1 — Schema canónico (Fase 1)

- Migración `<ts>_finance-canonical-anchors-and-supersede.sql`:
  - Add FK constraint `expense.payroll_entry_id` → `greenhouse_payroll.payroll_entries(entry_id)` (DEFERRABLE INITIALLY DEFERRED)
  - Add FK constraint `expense.payroll_period_id` → `greenhouse_payroll.payroll_periods(period_id)` si tabla existe
  - Add column `expense.tool_catalog_id` TEXT → FK `greenhouse_ai.tool_catalog(tool_id)`
  - Add column `expense.loan_account_id` TEXT → FK loan_accounts (scaffold abajo)
  - Add columns `superseded_by_payment_id`, `superseded_at`, `superseded_reason` en `income_payments` y `expense_payments`
  - Update trigger `fn_sync_expense_amount_paid` para ignorar superseded
  - Update función equivalente en lado income (manualmente desde `recordPayment`) para idem
  - Indexes para reverse lookup
- Migración `<ts>_finance-loan-accounts-scaffold.sql`:
  - Tabla mínima `greenhouse_finance.loan_accounts` (loan_id, lender_name, original_amount, monthly_installment, currency, account_id, started_at, notes)
  - Seed 1 fila para Pago Cuota Crédito 420051383906 (Santander, ~$102k mensual)
  - GRANTs

### Slice 2 — Helpers TS canónicos (Fase 2)

- `anchored-payments.ts`: 10 factories enforce coherencia y idempotencia (`createPayrollExpensePayment`, `createToolingExpensePayment`, `createTaxExpensePayment`, `createSupplierExpensePayment`, `createBankFeeExpensePayment`, `createFactoringFeeExpense`, `createInternationalPayrollSettlement`, `createPreviredSettlement`, `createInternalTransferSettlement`, `createFxConversionSettlement`)
- `supersede.ts`: `supersedeIncomePhantom` + `supersedeExpensePhantom` con audit trail
- `preflight-bank-row.ts`: `preflightBankRowAgainstLedger(row): { state, candidates, suggestedAnchor }`
- Tests unitarios per factory + casos sintéticos preflight

### Slice 3 — Reset y re-materialización (Fase 3)

- `src/lib/finance/account-balances-rematerialize.ts`: función pura `rematerializeAccountBalanceRange(accountId, startDate, endDate, options)` — idempotente
- `scripts/finance/rematerialize-account-balances.ts`: CLI que toma openings al 28/02, hace DELETE + seed + loop daily materialize hasta hoy
- Output: closing al 27/04 vs saldo banco esperado, log de divergencias

### Slice 4 — Preflight report y ejecución (Fase 0 + Fase 5)

- `scripts/finance/preflight-bank-conciliation-report.ts`: lee cartolas xlsx convertidas a JSON, clasifica cada fila A/B/C/D vs ledger, output md con decisión sugerida per fila
- Crear los 7 períodos de conciliación (CLP marzo/abril, USD marzo/abril, Global66 marzo/abril, TC abril)
- Ejecutar conciliación: por cada bank row, aplicar la acción de su clasificación A/B/C/D vía factories
- Cerrar períodos cuando `closing_balance_bank == closing_balance_system`

### Slice 5 — Verificación canónica (Fase 7 partial)

- Validar:
  - `account_balances.closing_balance` al 27/04 == saldo banco real per cuenta
  - `income_settlement_reconciliation.has_drift = false` para todos los incomes 2026
  - Cada bank_statement_row del período tiene `match_status` distinto de `unmatched`
  - Cada expense_payment 2026 tiene anchor (payroll_entry_id OR tool_catalog_id OR supplier_id OR tax_type OR loan_account_id OR cost_category='bank_fee' OR factoring linkage)
  - Phantoms Nubox marcados `superseded_by_payment_id IS NOT NULL` para los reemplazados
  - Endpoint `/api/admin/finance/ledger-health` devuelve 200 OK
- Endpoint nuevo `/api/admin/finance/ledger-health` que expone drift report con:
  - VIEW `income_settlement_reconciliation` count drifted
  - account_balances current closing vs expected per account
  - phantoms unsuperseded count

### Slice 6 — Documentación + cierre (Fase 8)

- `docs/documentation/finance/conciliacion-bancaria.md` con manual humano del flow A/B/C/D + factories canónicas
- Update `Handoff.md` + `changelog.md`
- Update `docs/tasks/README.md` (mover entrada a Complete)
- Cross-impact check sobre tasks abiertas

### Slice 7 (FOLLOW-UP, no bloquea cierre) — Root causes Nubox/Payroll

3 PRs separados después del cierre de slices 1-6:

- **PR-A**: Nubox `reconcileExpenseFromBankMovement` crea `expense_payment` via `createSupplierExpensePayment` (idempotency `nubox_movement_id` UNIQUE)
- **PR-B**: Nubox `recordPayment` pasa `paymentAccountId` por currency match + skip si existe `factoring_operation` activa para el income
- **PR-C**: Payroll `markPayrollRunPaid` itera entries y llama `createPayrollExpensePayment` o `createInternationalPayrollSettlement` según country del miembro

Estos quedan documentados como Follow-ups y se trabajan como tasks separadas o PRs incrementales sobre TASK-702.

## Out of Scope

- Re-arquitectar `commercial_cost_attribution` (los outbox events anclados van a propagar correctamente; cualquier ajuste estructural va aparte)
- Migrar histórico pre-2026 (mark legacy `payment_source` queda como está)
- Crear UI completa de "Anchor selector" (slice 4 usa endpoints; UI polish es siguiente iteración)
- Soporte para más bancos en csv-parser (sólo Santander hoy)

## Acceptance Criteria

- [ ] Migración aplicada a `greenhouse-pg-dev` y FK constraints activas
- [ ] `account_balances.closing_balance` al 27/04 cuadra con banco real para 4 cuentas (CLP, USD, Global66, TC)
- [ ] `income_settlement_reconciliation` NO reporta drift para incomes 2026
- [ ] 7 períodos de conciliación marzo+abril cerrados (`is_period_closed=true`)
- [ ] Bank rows importadas: 41 (CLP) + 2 (USD) + 22 (Global66) + ~17 (TC) = ~82 filas en `bank_statement_rows`
- [ ] Cada bank row 2026 tiene `match_status` ∈ {`auto_matched`, `manual_matched`, `excluded`}
- [ ] Cada expense_payment 2026 tiene anchor canónico no-null (uno de payroll_entry_id, tool_catalog_id, supplier_id, tax_type, loan_account_id, factoring linkage)
- [ ] Phantoms Nubox identificados marcados `superseded_by`
- [ ] Endpoint `/api/admin/finance/ledger-health` responde 200 con `healthy=true` o lista actionable de drift
- [ ] `pnpm test`: 100% verde
- [ ] `npx tsc --noEmit`: 0 errores
- [ ] `pnpm lint`: 0 errores
- [ ] `pnpm catalog:check`: OK
- [ ] Doc funcional `docs/documentation/finance/conciliacion-bancaria.md` publicado

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm catalog:check`
- Re-correr `scripts/finance/rematerialize-account-balances.ts` y verificar saldo final cuadra
- Llamar `/api/admin/finance/ledger-health` y verificar 200 OK
- Verificar manualmente en `/finance/bank` que la UI muestra saldos correctos

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real
- [ ] archivo en `complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] `TASK_ID_REGISTRY.md` actualizado (TASK-702 → complete)
- [ ] chequeo de impacto cruzado ejecutado
- [ ] 3 follow-up PRs (slice 7) documentadas como tasks/issues separadas

## Follow-ups

- TASK-### `nubox-bank-movement-creates-expense-payment` (slice 7 PR-A)
- TASK-### `nubox-record-payment-with-account-id` (slice 7 PR-B)
- TASK-### `payroll-run-paid-creates-expense-payments` (slice 7 PR-C)
- Reliability cron diario que re-materializa últimos 7 días + alerta en divergencia (Fase 7 hardening completo)
- Crear cartola TC marzo (operacional, fuera del scope técnico) para cerrar el gap auditable de marzo TC

## Open Questions

- ¿`tax_filings` se debe crear como tabla canónica o el shape actual `expense.tax_type + tax_period` es suficiente? Decisión: shape actual es suficiente para slices 1-6. Si más adelante se quiere consolidar declaraciones SII, se crea en task separada.
- Para crédito Santander 420051383906: ¿el saldo amortizado real lo trackeamos en `loan_accounts` con cron de re-cálculo, o solo creamos la tabla como placeholder de anchor? Decisión: placeholder de anchor para esta task, cálculo de saldo amortizado en task derivada.
