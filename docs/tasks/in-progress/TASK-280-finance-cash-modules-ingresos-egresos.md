# TASK-280 — Finance Cash Modules: Ingresos (Cobros) y Egresos (Pagos/Desembolsos)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementado — pendiente migracion DB`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-280-finance-cash-modules`
- GitHub Issue: `TBD`

## Summary

Crear los modulos reales de **Ingresos** (cobros / cash-in) y **Egresos** (pagos y desembolsos / cash-out) en Finance. Hoy el portal separa correctamente Ventas (documentos de venta) y Compras (documentos de compra), pero no existe una surface independiente para gestionar el flujo de caja real: dinero que entra (cobros de facturas, factoring, abonos) y dinero que sale (pagos a proveedores, desembolsos de nomina, pagos fiscales/previsionales, cargos bancarios). Esta task cierra ese gap construyendo las surfaces, APIs y — donde no exista — el storage necesario.

## Why This Task Exists

TASK-224 resolvio la confusion semantica: lo que antes se llamaba "Ingresos" ahora se llama "Ventas" (documentos), y lo que antes se llamaba "Egresos" ahora se llama "Compras" (documentos). Esto fue correcto, pero dejo un vacio funcional: **no existen modulos dedicados a la caja real**.

Situacion actual:

- **Cobros**: `income_payments` ya existe como tabla 1:N con ledger robusto, trigger de derivacion, deduplicacion, y outbox event. Pero los cobros solo se registran y visualizan **desde el detalle de una factura** (`IncomeDetailView.tsx:606-691`). No hay vista centralizada de cobros, ni busqueda transversal, ni KPIs de cobranza.
- **Pagos a proveedores**: expenses usa `payment_date` + `payment_status` embebidos directamente en el registro. No hay tabla `expense_payments` 1:N (gap documentado en TASK-194). No soporta pagos parciales ni auditoria individual.
- **Desembolsos de nomina**: payroll crea expense records reactivos, pero no registra el **pago neto real** a cada persona (transferencia bancaria). El P&L lee `payroll_entries` directamente.
- **Pagos fiscales/previsionales**: se registran como expenses con `tax_type` / `social_security_type`, pero no hay tracking del pago real al SII, Tesoreria, AFP, Fonasa, etc.
- **Cargos bancarios**: no existe concepto de comisiones, mantenciones, ni cargos automaticos de banco.
- **Posicion de caja**: no hay calculo de saldo real = cobros - pagos por cuenta bancaria.

Riesgo operativo: sin estos modulos, Finance no puede dar una respuesta confiable a "cuanto dinero tenemos", "cuanto nos deben" vs "cuanto hemos cobrado realmente", ni "cuanto hemos pagado vs cuanto debemos".

## Goal

- Surface centralizada de **Ingresos / Cobros** que consolide todo el dinero que entra, independiente de la factura origen
- Surface centralizada de **Egresos / Pagos** que consolide todo el dinero que sale, agrupado por tipo (proveedores, nomina, fiscal, previsional, bancario)
- Tabla `expense_payments` 1:N simetrica a `income_payments` (absorbe scope de TASK-194)
- Concepto de **desembolso de nomina** y **pago fiscal/previsional** como cash events trazables
- Dashboard de **posicion de caja** real (cobrado - pagado, por cuenta bancaria)
- Reutilizar el patron UI de registro de pagos existente en `IncomeDetailView.tsx` (Card con Monto/Fecha/Referencia + historial de pagos en tabla) para todos los tipos de pago

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- `income_payments` es la fuente de verdad para cobros del lado ventas — no duplicar ni reemplazar, solo exponer en surface nueva
- El trigger `trg_sync_income_amount_paid` sigue siendo el mecanismo canonico de derivacion `income.amount_paid`
- `expense_payments` debe seguir el mismo patron arquitectonico que `income_payments`: 1:N, trigger de derivacion, outbox event, deduplicacion por referencia
- El patron UI de "Registrar pago" (Card inline en `IncomeDetailView.tsx:606-646` con campos Monto/Fecha/Referencia + boton "Registrar pago" + tabla de historial debajo) debe reutilizarse y extraerse como componente compartido
- Toda tabla nueva en `greenhouse_finance` schema, owned by `greenhouse_ops`
- Migraciones via `pnpm migrate:create`, nunca timestamps manuales
- No romper P&L existente, cashflow existente, ni `client_economics` — los nuevos modulos son aditivos
- El P&L sigue leyendo devengo (accrual basis); las surfaces de caja son complementarias, no reemplazo

## Normative Docs

- `docs/tasks/in-progress/TASK-224-finance-document-vs-cash-semantic-contract.md` — contrato semantico documento vs caja
- `docs/tasks/to-do/TASK-194-expense-payment-ledger-separation.md` — esta task absorbe su scope (expense_payments)

## Dependencies & Impact

### Depends on

- `greenhouse_finance.income_payments` — ya materializada, tabla canonnica de cobros
- `greenhouse_finance.income` — facturas de venta (devengo)
- `greenhouse_finance.expenses` — facturas de compra (obligaciones)
- `greenhouse_finance.accounts` — cuentas bancarias para posicion de caja
- `greenhouse_finance.bank_statement_rows` — reconciliacion bancaria
- `greenhouse_payroll.payroll_entries` + `greenhouse_payroll.payroll_periods` — datos de nomina para desembolsos
- `src/lib/finance/payment-ledger.ts` — patron existente de `recordPayment` a reutilizar/extender
- `src/views/greenhouse/finance/IncomeDetailView.tsx:606-691` — patron UI de registro + historial de pagos a extraer como componente compartido

### Blocks / Impacts

- `TASK-224` — esta task materializa la surface de caja que TASK-224 identifico como follow-on
- `TASK-194` — esta task absorbe su scope (expense_payments table + ledger)
- `TASK-179` — reconciliacion podra matchear `expense_payments` ademas de `income_payments`
- `TASK-178` — budget engine podra comparar presupuesto vs caja real
- `TASK-245` — signal engine podra detectar anomalias en flujo de caja
- Dashboard `Finance > Caja` (nomenclatura `flow`) — hoy sin implementar
- P&L dashboard — se agrega KPI de caja cobrada vs facturada (sin reemplazar accrual)
- `cashflow` endpoint — se reconecta a datos reales de `income_payments` + `expense_payments`

### Files owned

- `docs/tasks/to-do/TASK-280-finance-cash-modules-ingresos-egresos.md`
- `src/views/greenhouse/finance/CashInListView.tsx` (nuevo)
- `src/views/greenhouse/finance/CashOutListView.tsx` (nuevo)
- `src/views/greenhouse/finance/CashPositionView.tsx` (nuevo)
- `src/views/greenhouse/finance/components/PaymentRegistrationCard.tsx` (nuevo — extraido de IncomeDetailView)
- `src/views/greenhouse/finance/components/PaymentHistoryTable.tsx` (nuevo — extraido de IncomeDetailView)
- `src/lib/finance/expense-payment-ledger.ts` (nuevo)
- `src/app/api/finance/expenses/[id]/payment/route.ts` (nuevo)
- `src/app/api/finance/expenses/[id]/payments/route.ts` (nuevo)
- `src/app/api/finance/cash-in/route.ts` (nuevo)
- `src/app/api/finance/cash-out/route.ts` (nuevo)
- `src/app/api/finance/cash-position/route.ts` (nuevo)
- migraciones para `expense_payments` table + trigger

## Current Repo State

### Already exists

- `greenhouse_finance.income_payments` — tabla 1:N de cobros, con `payment_source`, `is_reconciled`, `reconciliation_row_id`, trigger `trg_sync_income_amount_paid`
- `src/lib/finance/payment-ledger.ts` — `recordPayment()`, `getPaymentsForIncome()`, `reconcilePaymentTotals()` con transacciones, locking, deduplicacion, outbox event
- `src/views/greenhouse/finance/IncomeDetailView.tsx:606-691` — UI Card de "Registrar pago" (Monto, Fecha, Referencia, boton) + tabla de historial de pagos. **Este patron es el que se reutiliza.**
- `POST /api/finance/income/[id]/payment` — endpoint de registro de cobro individual
- `POST /api/finance/income/reconcile-payments` — reconciliacion bulk de cobros
- `greenhouse_finance.accounts` — cuentas bancarias con `balance`
- `greenhouse_finance.bank_statement_rows` — extractos bancarios importados
- `greenhouse_finance.reconciliation_periods` — periodos de reconciliacion con `opening_balance` / `closing_balance`
- Nomenclatura: `flow: { label: 'Caja', subtitle: 'Cobros, pagos y cuentas' }` ya definida en `greenhouse-nomenclature.ts:70`
- `ExpenseDetailView.tsx` — muestra `paymentDate`, `paymentStatus`, `paymentMethod`, `paymentReference` como campos estaticos (sin formulario de registro de pago)
- Expense types ya soportan: `supplier`, `payroll`, `social_security`, `tax`, `bank_fee`, `gateway_fee`, `financial_cost`, `miscellaneous`

### Gap

- No existe tabla `expense_payments` (pagos a expenses son campo embebido, sin ledger 1:N)
- No existe vista centralizada de cobros (solo se ven desde detalle de factura individual)
- No existe vista centralizada de pagos/desembolsos
- No existe posicion de caja real
- No existe concepto de desembolso de nomina (pago neto real a persona)
- No existe tracking de pago real a SII/Tesoreria/AFP/Fonasa
- No existe tracking de cargos bancarios automaticos como cash events
- El endpoint `cashflow` calcula con `invoice_date` (accrual) en vez de `payment_date` (caja real)
- El componente de registro de pago esta hardcoded en `IncomeDetailView.tsx`, no es reutilizable

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Expense Payment Ledger (absorbe TASK-194)

- Migracion: crear tabla `greenhouse_finance.expense_payments` simetrica a `income_payments`
  - Columnas: `payment_id`, `expense_id`, `payment_date`, `amount`, `currency`, `reference`, `payment_method`, `payment_account_id`, `payment_source`, `notes`, `recorded_by_user_id`, `recorded_at`, `is_reconciled`, `reconciliation_row_id`, `reconciled_at`, `created_at`
  - FK a `expenses(expense_id)`, indices en `expense_id`, `payment_date`, `reference`
- Migracion: trigger `trg_sync_expense_amount_paid` — recalcula `expenses.amount_paid` y `payment_status` desde `SUM(expense_payments.amount)`
- Migracion: agregar columna `amount_paid NUMERIC DEFAULT 0` a `expenses` si no existe, derivada del trigger
- Backend: `src/lib/finance/expense-payment-ledger.ts` — `recordExpensePayment()`, `getPaymentsForExpense()`, `reconcileExpensePaymentTotals()` siguiendo patron exacto de `payment-ledger.ts`
- API: `POST /api/finance/expenses/[id]/payment` — registrar pago contra expense
- API: `GET /api/finance/expenses/[id]/payments` — listar pagos de un expense
- Outbox event: `finance.expense_payment.recorded`
- Migrar datos existentes: para expenses con `payment_date IS NOT NULL AND payment_status = 'paid'`, crear registro en `expense_payments` con datos del campo embebido

### Slice 2 — Componente compartido de registro de pagos

- Extraer de `IncomeDetailView.tsx:606-691` un componente reutilizable:
  - `PaymentRegistrationCard` — Card con campos Monto, Fecha, Referencia, boton "Registrar pago"
    - Props: `onSubmit(amount, date, reference)`, `disabled`, `pendingBalance`, `currency`
  - `PaymentHistoryTable` — Tabla con columnas Fecha, Monto, Referencia, Metodo, Notas
    - Props: `payments[]`, `currency`, `emptyMessage`
- Refactorizar `IncomeDetailView.tsx` para usar los nuevos componentes
- Agregar `PaymentRegistrationCard` + `PaymentHistoryTable` a `ExpenseDetailView.tsx` (para expenses no pagados)

### Slice 3 — Surface de Ingresos / Cobros (Cash In)

- Vista `CashInListView.tsx`: lista consolidada de todos los cobros
  - Source: `income_payments` JOIN `income` para contexto de factura
  - Columnas: Fecha pago, Monto, Factura origen (link), Cliente, Referencia, Metodo, Reconciliado
  - Filtros: rango de fechas, cliente, estado de reconciliacion, fuente (client_direct, factoring, nubox_bank_sync)
  - KPIs en header: Total cobrado (periodo), Promedio diario, Cobros pendientes de reconciliar
- Ruta: `/finance/cash-in` (bajo seccion Caja en navegacion)
- API: `GET /api/finance/cash-in` — query consolidada de `income_payments` con joins y filtros

### Slice 4 — Surface de Egresos / Pagos (Cash Out)

- Vista `CashOutListView.tsx`: lista consolidada de todos los pagos/desembolsos
  - Source: `expense_payments` JOIN `expenses` para contexto de obligacion
  - Columnas: Fecha pago, Monto, Tipo (proveedor/nomina/fiscal/previsional/bancario), Documento origen (link), Beneficiario, Referencia
  - Filtros: rango de fechas, tipo de egreso, proveedor, estado de reconciliacion
  - Agrupacion visual por tipo de egreso (tabs o chips)
  - KPIs en header: Total pagado (periodo), Por tipo (proveedores, nomina, fiscal, otros)
- Ruta: `/finance/cash-out`
- API: `GET /api/finance/cash-out` — query consolidada de `expense_payments` con joins y filtros
- Incluir pagos de nomina: cuando `expense.expense_type = 'payroll'`, mostrar con etiqueta de nomina y link al periodo

### Slice 5 — Posicion de Caja y Cashflow real

- Vista `CashPositionView.tsx`: dashboard de posicion de caja
  - Saldo actual por cuenta bancaria (de `accounts.balance` o derivado)
  - Flujo neto del periodo: SUM(income_payments) - SUM(expense_payments)
  - Grafico de 12 meses: cobros vs pagos vs flujo neto (usando datos reales de payment_date, no accrual)
  - Cuentas por cobrar reales: facturas pendientes de cobro (`income WHERE payment_status != 'paid'`)
  - Cuentas por pagar reales: expenses pendientes de pago (`expenses WHERE payment_status != 'paid'`)
- Ruta: `/finance/cash-position`
- API: `GET /api/finance/cash-position` — KPIs de posicion de caja
- Reconectar endpoint `cashflow` existente para que use `income_payments.payment_date` y `expense_payments.payment_date` en vez de accrual dates

## Out of Scope

- Renombrar tablas `income` / `expenses` fisicamente (permanecen como ledger de documentos)
- Rehacer el P&L engine — sigue en base accrual, las surfaces de caja son complementarias
- Integracion directa con bancos (API bancaria) — reconciliacion sigue siendo via CSV o Nubox
- Conciliacion automatica de pagos de nomina (el registro es manual o reactivo desde payroll)
- Multi-moneda avanzada (FX gain/loss en pagos) — usa tipo de cambio del expense
- Factoring operations como surface independiente (schema existe pero no es scope de esta task)

## Detailed Spec

### Schema: `expense_payments`

```sql
CREATE TABLE greenhouse_finance.expense_payments (
  payment_id        TEXT PRIMARY KEY DEFAULT 'exp-pay-' || gen_random_uuid(),
  expense_id        TEXT NOT NULL REFERENCES greenhouse_finance.expenses(expense_id),
  payment_date      DATE NOT NULL,
  amount            NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency          TEXT NOT NULL DEFAULT 'CLP',
  reference         TEXT,
  payment_method    TEXT,
  payment_account_id TEXT REFERENCES greenhouse_finance.accounts(bank_account_id),
  payment_source    TEXT NOT NULL DEFAULT 'manual',
  notes             TEXT,
  recorded_by_user_id TEXT,
  recorded_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_reconciled     BOOLEAN DEFAULT FALSE,
  reconciliation_row_id TEXT,
  reconciled_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expense_payments_expense_id ON greenhouse_finance.expense_payments(expense_id);
CREATE INDEX idx_expense_payments_payment_date ON greenhouse_finance.expense_payments(payment_date);
CREATE UNIQUE INDEX idx_expense_payments_dedup ON greenhouse_finance.expense_payments(expense_id, reference) WHERE reference IS NOT NULL;
```

### Trigger: derivacion de `amount_paid`

```sql
CREATE OR REPLACE FUNCTION greenhouse_finance.fn_sync_expense_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
  v_sum   NUMERIC;
  v_status TEXT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_sum
  FROM greenhouse_finance.expense_payments
  WHERE expense_id = COALESCE(NEW.expense_id, OLD.expense_id);

  SELECT total_amount INTO v_total
  FROM greenhouse_finance.expenses
  WHERE expense_id = COALESCE(NEW.expense_id, OLD.expense_id);

  IF v_sum >= v_total THEN v_status := 'paid';
  ELSIF v_sum > 0 THEN v_status := 'partial';
  ELSE v_status := 'pending';
  END IF;

  UPDATE greenhouse_finance.expenses
  SET amount_paid = v_sum, payment_status = v_status, updated_at = CURRENT_TIMESTAMP
  WHERE expense_id = COALESCE(NEW.expense_id, OLD.expense_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_expense_amount_paid
AFTER INSERT OR UPDATE OR DELETE ON greenhouse_finance.expense_payments
FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.fn_sync_expense_amount_paid();
```

### Patron UI reutilizable

El componente `PaymentRegistrationCard` extraido de `IncomeDetailView.tsx:606-646`:

```tsx
// Props
interface PaymentRegistrationCardProps {
  onSubmit: (amount: number, date: string, reference: string) => Promise<void>
  pendingBalance: number
  currency: string
  disabled?: boolean
  title?: string        // default: "Registrar pago"
  submitLabel?: string  // default: "Registrar pago"
}
```

El componente `PaymentHistoryTable` extraido de `IncomeDetailView.tsx:648-691`:

```tsx
interface PaymentHistoryTableProps {
  payments: Array<{
    paymentId: string
    paymentDate: string | null
    amount: number
    currency?: string
    reference: string | null
    paymentMethod: string | null
    notes: string | null
  }>
  currency: string
  emptyMessage?: string  // default: "Sin pagos registrados"
  title?: string         // default: "Historial de pagos"
}
```

### Navegacion

Bajo la seccion "Caja" (ya definida en nomenclatura como `flow`):

```
Finance
  Resumen (dashboard)
  Ventas (income docs)
  Compras (expense docs)
  Caja
    Cobros (cash-in)        ← NUEVO
    Pagos (cash-out)        ← NUEVO
    Posicion de caja        ← NUEVO
    Cuentas
    Reconciliacion
  Clientes
  Proveedores
  ...
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Tabla `expense_payments` creada con trigger de derivacion `amount_paid` + `payment_status`
- [ ] Backend `recordExpensePayment()` sigue patron de `recordPayment()`: transaccion, locking, deduplicacion, outbox event
- [ ] API `POST /api/finance/expenses/[id]/payment` funcional
- [ ] Datos existentes migrados: expenses con `payment_status = 'paid'` tienen registro en `expense_payments`
- [ ] Componentes `PaymentRegistrationCard` y `PaymentHistoryTable` extraidos y reutilizados en `IncomeDetailView` y `ExpenseDetailView`
- [ ] Vista `CashInListView` muestra todos los cobros de `income_payments` con filtros y KPIs
- [ ] Vista `CashOutListView` muestra todos los pagos de `expense_payments` con filtros, agrupacion por tipo, y KPIs
- [ ] Vista `CashPositionView` muestra saldo por cuenta, flujo neto del periodo, y grafico 12 meses con datos reales de caja
- [ ] Navegacion de Finance incluye seccion "Caja" con Cobros, Pagos, y Posicion de caja
- [ ] P&L, `client_economics`, y `operational_pl_snapshots` siguen funcionando sin regresion
- [ ] `pnpm build` y `pnpm lint` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- `pnpm test`
- Validacion manual:
  - Registrar pago en expense desde `ExpenseDetailView` usando el componente compartido
  - Verificar que `expense.amount_paid` y `payment_status` se actualizan via trigger
  - Navegar a `/finance/cash-in` y ver cobros consolidados
  - Navegar a `/finance/cash-out` y ver pagos consolidados por tipo
  - Navegar a `/finance/cash-position` y ver posicion de caja con grafico real
  - Verificar que P&L dashboard no cambio (sigue en base accrual)

## Closing Protocol

- [ ] Marcar TASK-194 como absorbida por TASK-280 en `docs/tasks/README.md` y en su archivo
- [ ] Actualizar TASK-224 con nota delta indicando que la surface de caja fue materializada
- [ ] Actualizar `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` con schema de `expense_payments` y nuevos endpoints
- [ ] Actualizar `project_context.md` con nuevos modulos de caja
- [ ] Actualizar `greenhouse-nomenclature.ts` si se agregan nuevos labels

## Follow-ups

- Automatizar registro de desembolsos de nomina desde `payroll_period.exported` → `expense_payments` automatico
- Automatizar pagos fiscales/previsionales desde declaraciones → `expense_payments`
- Integracion directa con APIs bancarias para importar cargos automaticos
- Extender reconciliacion para matchear `expense_payments` contra `bank_statement_rows`
- Signal engine (TASK-245) con deteccion de anomalias en flujo de caja
- Dashboard ejecutivo de cash runway / burn rate
- Factoring operations como surface independiente bajo Caja

## Open Questions

- Definir si desembolsos de nomina se registran automaticamente al exportar periodo, o manualmente por Finance
- Definir si pagos fiscales (SII, Tesoreria) se registran desde un formulario dedicado o desde el expense generico
- Definir granularidad de cargos bancarios: registro manual mensual vs importacion automatica desde extracto
- Evaluar si `cash-position` debe calcular saldo en tiempo real o materializar snapshots diarios
