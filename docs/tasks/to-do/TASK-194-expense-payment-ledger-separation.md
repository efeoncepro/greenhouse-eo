# TASK-194 — Expense Payment Ledger Separation

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`

## Summary

Separar los campos de pago embebidos en `greenhouse_finance.expenses` a una tabla dedicada `greenhouse_finance.expense_payments` (1:N), simétrica a `income_payments`. Hoy cada expense almacena su pago como campos inline (`payment_date`, `payment_method`, `payment_provider`, `payment_rail`, `payment_status`), lo que impide pagos parciales, audit trail, y conciliación bancaria uniforme.

## Why This Task Exists

El modelo de expenses fusiona dos conceptos distintos en un solo registro:

1. **La obligación (accrual)**: "debemos $X al proveedor Y por el servicio Z, vence el día D"
2. **El movimiento de caja (payment)**: "el día D' se pagó $X desde la cuenta A, con transferencia, ref #123"

Esto genera problemas reales:

- **Sin pagos parciales**: un gasto pagado en cuotas (arriendo trimestral, licencia anual pagada mensual) no se puede representar
- **Sin audit trail**: un UPDATE a `payment_status = 'paid'` pierde el estado previo — no hay registro de quién pagó, cuándo, ni desde qué cuenta
- **Conciliación bancaria asimétrica**: income tiene `income_payments` para matchear contra líneas bancarias, expenses no — requiere lógica ad-hoc
- **Cash flow forecasting limitado**: sin registros de pago separados, proyectar flujo programado vs ejecutado es inviable
- **Asimetría conceptual**: income ya resolvió esto con `income_payments` (1:N), expenses no

## Goal

1. Crear tabla `greenhouse_finance.expense_payments` simétrica a `income_payments`
2. Migrar datos de pago existentes de `expenses` a `expense_payments` (backfill)
3. Convertir `expenses.payment_status` en campo derivado (pending/partial/paid basado en suma de pagos)
4. Unificar la mecánica de registro de pagos entre income y expenses
5. Habilitar pagos parciales y audit trail nativo para egresos

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — Finance module canonical spec
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — dual-store patterns
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — migration framework

Reglas obligatorias:

- Migración ANTES del deploy (Vercel no ejecuta migraciones)
- Columnas nullable primero, constraints después
- Expense aggregate sigue siendo el owner del accrual; `expense_payments` es un child entity
- `payment_status` en expenses pasa a ser derivado pero se mantiene como columna materializada (trigger o app-level) para evitar joins en queries de listado
- `source_type` del expense (`manual`, `payroll_generated`, etc.) no cambia — la fuente del accrual es independiente del pago

## Dependencies & Impact

### Depends on

- `greenhouse_finance.expenses` — tabla existente con campos de pago embebidos
- `greenhouse_finance.income_payments` — modelo de referencia para simetría
- `src/lib/finance/contracts.ts` — enums de payment methods, providers, rails
- `TASK-184` (complete) — migration framework operativo

### Impacts to

- `TASK-003` (Invoice Payment Ledger Correction) — la corrección de income payments se beneficia de simetría
- `TASK-013` (Nubox Finance Reconciliation Bridge) — conciliación bancaria necesita payment records uniformes en ambos lados
- `TASK-070` (Cost Intelligence Finance UI) — P&L y período de cierre usan expense payment_status
- `TASK-004` (Finance Dashboard Calculation Correction) — dashboards leen payment_status de expenses
- `TASK-176` (Labor Provisions Fully Loaded Cost) — provisiones laborales generan expenses que se pagan en cuotas

### Files owned

- `migrations/YYYYMMDDHHMMSS_create-expense-payments.sql` (nueva)
- `src/lib/finance/expense-payment-ledger.ts` (nueva)
- `src/lib/finance/contracts.ts` (extensión: ExpensePayment types)
- `src/app/api/finance/expenses/[id]/payments/route.ts` (nueva)
- `src/views/greenhouse/finance/ExpenseDetailView.tsx` (UI de pagos)

## Current Repo State

### Ya existe

- `greenhouse_finance.expenses` con campos inline: `payment_date`, `payment_method`, `payment_provider`, `payment_rail`, `payment_status`, `payment_account_id`, `payment_reference`
- `greenhouse_finance.income_payments` como modelo probado de payment ledger (1:N con `income`)
- `src/lib/finance/payment-ledger.ts` — funciones `recordPayment()`, `getPaymentsForIncome()`, `reconcilePaymentTotals()` (solo para income)
- `src/lib/finance/contracts.ts` — enums compartidos: `PAYMENT_METHODS`, `EXPENSE_PAYMENT_STATUSES`
- `CreateExpenseDrawer.tsx` — formulario de expense con campos de pago embebidos
- `ExpenseDetailView.tsx` — vista de detalle sin timeline de pagos
- `ExpensesListView.tsx` — listado con filtro por `payment_status`

### Gap actual

- No existe tabla `expense_payments` — pagos viven como campos en `expenses`
- No hay endpoint para registrar pagos contra un expense
- `ExpenseDetailView` no tiene timeline de pagos (como sí lo tiene `IncomeDetailView`)
- No hay soporte para pagos parciales en expenses
- Conciliación bancaria no puede matchear payment records de egresos (solo ingresos)
- `payment_status` se setea manualmente, no se deriva de la realidad de pagos

## Scope

### Slice 1 — Schema & Migration

- Crear tabla `greenhouse_finance.expense_payments` con:
  - `payment_id` (PK, UUID)
  - `expense_id` (FK → expenses)
  - `amount` (numeric, NOT NULL)
  - `currency` (text, nullable)
  - `payment_date` (timestamptz, nullable)
  - `payment_method` (text, nullable)
  - `payment_provider` (text, nullable)
  - `payment_rail` (text, nullable)
  - `payment_account_id` (text, nullable)
  - `reference` (text, nullable)
  - `notes` (text, nullable)
  - `payment_source` (text, default 'manual')
  - `is_reconciled` (boolean, default false)
  - `reconciliation_row_id` (text, nullable)
  - `reconciled_at` (timestamptz, nullable)
  - `reconciled_by_user_id` (text, nullable)
  - `recorded_by_user_id` (text, nullable)
  - `recorded_at` (timestamptz, default now)
  - `created_at`, `updated_at` (timestamps)
- Backfill: INSERT INTO `expense_payments` FROM expenses WHERE `payment_status = 'paid'` OR `payment_date IS NOT NULL`
- Mantener campos legacy en `expenses` durante transición (no borrar aún)

### Slice 2 — Domain Logic & API

- Crear `src/lib/finance/expense-payment-ledger.ts` simétrico a `payment-ledger.ts`:
  - `recordExpensePayment(expenseId, payment)`
  - `getPaymentsForExpense(expenseId)`
  - `reconcileExpensePaymentTotals(expenseId)`
  - `deriveExpensePaymentStatus(expenseId)` → pending | partial | paid
- Crear endpoint `POST /api/finance/expenses/[id]/payments` — registrar pago
- Crear endpoint `GET /api/finance/expenses/[id]/payments` — listar pagos
- Actualizar `expenses.payment_status` como campo derivado al registrar pago

### Slice 3 — UI (ExpenseDetailView)

- Agregar timeline de pagos en `ExpenseDetailView` (simétrico a `IncomeDetailView`)
- Formulario inline para registrar nuevo pago contra el expense
- Chip de estado derivado (pending / partial / paid)
- Mantener filtro por `payment_status` en `ExpensesListView` (lee campo materializado)

### Slice 4 — Cleanup & Deprecation

- Marcar campos `payment_*` en `expenses` como deprecated en comments de migración
- Migrar `CreateExpenseDrawer` para que el pago se registre como `expense_payment` separado (post-creación)
- Actualizar `src/lib/finance/contracts.ts` con types de `ExpensePayment`
- Evaluar remoción de campos legacy cuando no haya queries directas

## Out of Scope

- Refactorear `income_payments` — ya funciona bien
- Conciliación bancaria automatizada — será una task futura que consume ambos ledgers
- Cash flow forecasting UI — task separada que se habilita con este cambio
- Cambios al modelo de costo o P&L engine — `payment_status` derivado produce los mismos valores

## Acceptance Criteria

- [ ] Tabla `greenhouse_finance.expense_payments` creada con migración versionada
- [ ] Backfill de expenses con pago existente genera registros en `expense_payments`
- [ ] `POST /api/finance/expenses/:id/payments` registra pago y actualiza `payment_status` derivado
- [ ] `GET /api/finance/expenses/:id/payments` retorna timeline de pagos
- [ ] `ExpenseDetailView` muestra timeline de pagos con formulario de registro
- [ ] Un expense puede tener múltiples pagos (parciales)
- [ ] `payment_status` se deriva automáticamente: pending (sin pagos), partial (suma < total), paid (suma >= total)
- [ ] Filtro por `payment_status` en `ExpensesListView` sigue funcionando con campo materializado
- [ ] `pnpm build` y `pnpm lint` pasan
- [ ] `pnpm test` pasa (tests unitarios para derive logic y ledger functions)

## Verification

- `pnpm migrate:up` aplica limpio
- `pnpm db:generate-types` regenera `db.d.ts` con `GreenhouseFinanceExpensePayments`
- `pnpm build` sin errores de tipo
- `pnpm lint` limpio
- `pnpm test` — tests de `expense-payment-ledger.ts` y derive logic
- Validación manual: crear expense → registrar pago parcial → verificar status `partial` → registrar segundo pago → verificar status `paid`
- Verificar backfill: expenses existentes con `payment_status = 'paid'` tienen su registro en `expense_payments`
