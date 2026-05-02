# ISSUE-063 — Payment orders marcadas como pagadas sin afectar el banco origen

## Ambiente

production / staging / dev (mismo runtime; reproducido en dev)

## Estado

`resolved` — 2026-05-02

## Síntoma

El 2026-05-01, dos `payment_orders` fueron marcadas como `state='paid'` en el portal pero **el saldo de Santander CLP no rebajó** y la conciliación bancaria quedó incompleta:

- `por-66563173-bdda-4591-b9ef-f798ecc98b95` — Luis Reyes, Nómina 2026-04, $148,312.50 CLP
- `por-596043bd-1e80-4d9f-a932-515d44750b2e` — Humberly Henriquez, Nómina 2026-04, $254,250.00 CLP

Total impactado: **$402,562.50 CLP**.

Detección: el usuario notó que el saldo del banco no había cambiado tras marcar las órdenes como pagadas. Sin alerta automática previa.

## Causa raíz

Cadena de **3 fallas estructurales**:

1. **F1 — Wizard permitió `source_account_id=NULL`.** No había validación en UI ni en DB que exigiera la cuenta origen al marcar pagada. El CHECK `expense_payments_account_required_after_cutover` post 2026-04-28 habría rechazado el insert downstream igual.

2. **F2 — Materializer dead-letter.** La proyección reactiva `finance_expense_reactive_intake` falló al ejecutar `materializePayrollExpensesForExportedPeriod` para el período 2026-04 con error PG `INSERT has more target columns than expressions` (no recuperable). Consecuencia: 0 filas en `greenhouse_finance.expenses` para ese período. Sin expense, el resolver downstream no puede crear `expense_payment`.

3. **F3 — Skip silencioso.** La proyección `record_expense_payment_from_order` (consume el outbox event `finance.payment_order.paid`) llamó al resolver `recordPaymentForOrder`, que no encontró el expense lookup y devolvió `{recorded: 0, skipped: 1, reason: 'expense_not_found'}` sin emitir `error_class`. El reactive worker marcó la corrida como `completed` (no `failed`), sin dead-letter, sin alerta. La orden quedó zombie.

## Impacto

- **2 órdenes zombie** en `state='paid'` con downstream incompleto (0 `expense_payment`, 0 `settlement_leg`, 0 outflow en `account_balances`).
- **$402,562.50 CLP** sin reflejarse en el saldo bancario (el dinero salió de Santander CLP en la realidad pero el ledger del portal no lo registró).
- **Conciliación bancaria desalineada** hasta la resolución manual.
- **Cero alerta automática** — silent failure por 24+ horas hasta detección por usuario.

## Diagnóstico

Investigación documentada en sesión 2026-05-02 con `pnpm pg:connect` + queries directas a:

- `greenhouse_finance.payment_orders` → confirmado `state=paid, source_account_id=NULL` para ambas.
- `greenhouse_finance.payment_order_lines` → `expense_payment_id IS NULL` en ambas.
- `greenhouse_finance.expense_payments` → 0 filas con `payment_order_line_id IN (...)`.
- `greenhouse_finance.settlement_legs` → 0 filas en la ventana de los pagos.
- `greenhouse_sync.outbox_events` → eventos `finance.payment_order.paid` publicados ✅.
- `greenhouse_sync.outbox_reactive_log` → handler `record_expense_payment_from_order` corrió 3 veces, todas con `result='coalesced:recorded=0 skipped=1'`, cero `error_class`, cero retries.
- `greenhouse_sync.projection_refresh_queue` → `finance_expense_reactive_intake:finance_period:2026-04` en `status='dead'` con `error_message='INSERT has more target columns than expressions'` — root cause de F2.
- `greenhouse_finance.expenses` → 0 filas para `payroll_period_id='2026-04'` (era 8 para 2026-03, indicador del breakage del materializer).

Reproducción del materializer en dev confirmó que la cadena de INSERTs `createFinanceExpenseInPostgres` ya estaba balanceada (74↔74) — el error era stale (commit posterior corrigió el INSERT broken sin acknowledge del dead-letter row). Re-ejecutar el materializer creó las 7 filas faltantes en `expenses`.

## Solución aplicada

**TASK-765 — Payment Order ↔ Bank Settlement Resilience.** 8 slices entregados que convierten el path `payment_order.paid → bank impact` en un contrato resiliente, atómico y observable end-to-end. Ver `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md`.

Slices que cierran cada falla:

- **F1 cerrada por Slice 1**: hard-gate triple `source_account_id` (CHECK constraint DB + `assertSourceAccountForPaid` TS guard + UI banner + picker dialog en OrderDetailDrawer + tooltip explicativo).
- **F2 cerrada por Slice 2 + Slice 3**:
  - Slice 2 — universal column-parity test (`expense-insert-column-parity.test.ts`) que valida 14 INSERT sites canónicos en CI; cualquier futuro drift rompe build antes del deploy.
  - Slice 3 — endpoint admin `POST /api/admin/finance/payroll-expense-rematerialize` (capability `finance.payroll.rematerialize`) idempotente con dryRun para rerun manual cuando el materializer queda dead-letter.
- **F3 cerrada por Slice 4 + Slice 5 + Slice 7**:
  - Slice 4 — resolver loud: skip silencioso → throw + outbox `finance.payment_order.settlement_blocked` (5 reasons tipadas) + `captureWithDomain('finance')`.
  - Slice 5 — atomicidad transaccional `markPaymentOrderPaidAtomic`: state + audit log + per-line `recordExpensePayment(client)` + settlement_legs + outbox events EN UNA SOLA TX. Rollback completo si cualquier step falla — la order vuelve a `submitted`, nunca queda zombie.
  - Slice 7 — 3 reliability signals nuevos en `RELIABILITY_REGISTRY` (`paid_orders_without_expense_payment`, `payment_orders_dead_letter`, `payroll_expense_materialization_lag`) + UI banner reason-aware en OrderDetailDrawer con CTA "Recuperar orden".

Defense in depth adicional:

- **Slice 6** — state machine hardening: tabla `payment_order_state_transitions` append-only + trigger `payment_orders_anti_zombie_trigger` valida 3 invariantes (paid_at NOT NULL + source_account_id NOT NULL + transition matrix canónica).
- **Slice 8** — endpoint admin `POST /api/admin/finance/payment-orders/[orderId]/recover` (capability `finance.payment_orders.recover`) para reparar órdenes zombie legacy.

## Recovery del incidente

Ejecutado el 2026-05-02 contra producción via `scripts/finance/task-765-recover-incident-orders.ts`:

- 2 `expense_payments` creados (`exp-pay-e693835f` Luis $148,312.50 + `exp-pay-741ed17f` Humberly $254,250.00) con `payment_account_id=santander-clp`.
- 2 `settlement_legs` creados (`stlleg-exp-pay-e693835f` + `stlleg-exp-pay-741ed17f`) `direction=outgoing`, `instrument_id=santander-clp`, `transaction_date=2026-05-01`.
- 2 audit log rows en `payment_order_state_transitions` con `reason='recovery_TASK-765_incident_2026-05-01'`.
- 2 outbox events `finance.payment_order.paid` republicados con `payload.replay=true`.
- Dead-letter row del materializer 2026-05-01 acknowledged + recovered con `resolution_note` documentando el cierre.
- `account_balances` rematerializado para Santander CLP desde 2026-05-01 (63 días). **Closing balance al 2026-05-02: $3,750,478.50.**

## Verificación

Reliability signals POST-recovery (queries SQL ejecutadas contra producción):

- `paid_orders_without_expense_payment`: **n=0** (era 2)
- `payment_orders_dead_letter`: **n=0** (era 1, acknowledged)
- `payroll_expense_materialization_lag`: **n=0**

## Lecciones operativas

- **Skip silencioso es el peor anti-patrón.** Una proyección que devuelve `recorded=0 skipped=1` sin error_class oculta el breakage detrás de un éxito aparente. Cualquier proyección crítica debe throw + emitir outbox event `*_blocked` cuando precondición falle.
- **Errores de schema drift en INSERTs SQL embebidos son difíciles de detectar runtime.** El test universal de paridad columna↔placeholder (slice 2) es la red de seguridad anti-regresión. Detectó y arregló un bug latente en `createFinanceIncomeInPostgres` durante la implementación misma.
- **Atomicidad importa cuando el dinero está en juego.** El path canónico `state=paid → expense_payment → settlement_leg → account_balances` debe vivir en una sola tx. Outbox + reactor son safety net, no path crítico.
- **State machine triggers PG son red de seguridad última.** Los TS guards pueden bypasarse (admin SQL, future autosched bug, mal merge). Triggers PG son el contrato terminal.
- **Reliability signals con steady=0 son contratos vivos.** Cualquier valor > 0 es señal de breakage; el operador ve el problema antes que el usuario lo reporte.

## Referencias

- TASK origen: `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md`
- Plan ejecutado: `docs/tasks/plans/TASK-765-plan.md`
- PR: [#102](https://github.com/efeoncepro/greenhouse-eo/pull/102) (squash-merged a `develop` 2026-05-02)
- Spec arquitectónica actualizada: `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- Outbox events nuevos: `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta 2026-05-02)
- CLAUDE.md: sección "Finance — Payment order ↔ bank settlement invariants (TASK-765)"
- Doc funcional: `docs/documentation/finance/payment-orders-bank-settlement-resilience.md`
- Manual de uso (recuperación): `docs/manual-de-uso/finance/recuperar-orden-de-pago-zombie.md`
