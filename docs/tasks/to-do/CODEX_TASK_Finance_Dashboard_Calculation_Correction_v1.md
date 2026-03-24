# CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1

## Summary

Corregir los cálculos y la presentación del dashboard de Finanzas (`/finance` → Resumen) para que refleje correctamente la posición financiera real: distinguir facturado vs. cobrado, incluir costo de personal consistentemente en egresos, calcular flujo de caja sobre movimientos reales, y migrar las fuentes de datos de BigQuery a Postgres-first.

## Why This Task Exists

El dashboard financiero es la vista consolidada principal de la operación financiera de Efeonce. Hoy tiene 6 problemas de cálculo que generan números engañosos:

### Problema 1: "Ingresos del mes" muestra facturado, no cobrado

La KPI card consume `incomeSummary.currentMonth.totalAmountClp` que es la serie **accrual** (sumada por `invoice_date`). Si se emitieron $6.9M en facturas pero se cobraron $2M, el dashboard dice "$6.9M de ingresos". El label no aclara que es facturado.

**Lo irónico:** La API `/api/finance/income/summary` (líneas 45-53, 96-107) **ya calcula la serie cash** (`cashCurrentMonth`, `cashMonthly`) usando `toIncomePaymentCashEntries()`. Pero `FinanceDashboardView.tsx` (línea 451) solo consume `incomeSummary?.monthly` (accrual) y nunca usa `cashMonthly`.

### Problema 2: "Egresos del mes" tiene dos caminos con resultados diferentes

```typescript
// FinanceDashboardView.tsx, línea 596
stats={formatCLP(pnl ? pnl.costs.totalExpenses : (expenseSummary?.currentMonth.totalAmountClp ?? 0))}
```

- **Path A (con P&L):** Incluye expenses + nómina no linkeada (`unlinkedPayrollCost`). Es el número correcto.
- **Path B (sin P&L):** Solo suma `expenses.total_amount_clp` de BigQuery, **sin incluir nómina**.

Si no hay nómina aprobada para el período (como se ve en el screenshot: "Sin nómina aprobada"), el Path A da un `totalExpenses` que omite el costo laboral completo. Egresos queda subestimado.

### Problema 3: "Flujo de caja" no es flujo de caja

```typescript
// FinanceDashboardView.tsx, línea 491
const cashFlowData = incomeData.map((inc, i) => inc - adjustedExpenseData[i])
```

Resta ingresos accrual menos egresos accrual por mes. Eso es **margen operativo contable**, no flujo de caja. Un flujo de caja real usa `payment_date` de cobros y pagos — cuándo entró y salió el dinero del banco, no cuándo se emitieron los documentos.

### Problema 4: Income Summary lee de BigQuery, P&L lee de Postgres

- `/api/finance/income/summary` → `runFinanceQuery()` → BigQuery `greenhouse.fin_income`
- `/api/finance/dashboard/pnl` → `runGreenhousePostgresQuery()` → Postgres `greenhouse_finance.income`

Si el sync BQ↔Postgres no está al día, "Ingresos del mes" ($6.9M en la KPI card) puede diferir de "Ingresos brutos" ($13.8M en Estado de Resultados). El usuario ve dos números de "ingresos" diferentes en la misma pantalla sin entender por qué.

### Problema 5: "Estado de Resultados" muestra Ingresos brutos sin contexto de cobro

El P&L calcula `totalRevenue` como `SUM(total_amount_clp)` por `invoice_date` (accrual). Es contablemente válido como P&L devengado, pero sin mostrar al lado cuánto de eso se cobró, el usuario no puede evaluar la posición de liquidez.

### Problema 6: Los gráficos del bar chart mezclan bases

El bar chart "Ingresos vs Egresos" usa:
- Ingresos: serie accrual de BigQuery (por `invoice_date`)
- Egresos: serie accrual de BigQuery, **excepto** el mes del P&L donde reemplaza con `pnl.costs.totalExpenses` de Postgres (que incluye nómina)

Esto crea un spike artificial en el mes corriente (egresos suben por nómina) que no es comparable con meses anteriores (sin nómina).

## Goal

1. **KPI cards que muestren facturado Y cobrado** con labels claros
2. **Egresos consistentes** que siempre incluyan costo de personal cuando hay nómina aprobada
3. **Flujo de caja real** basado en `payment_date` de cobros y pagos
4. **Fuente única Postgres-first** para todo el dashboard
5. **Bar chart comparable** mes a mes con la misma base de cálculo

## Dependencies & Impact

### Depends on
- `CODEX_TASK_Invoice_Payment_Ledger_Correction_v1.md` — prerequisito parcial: para que el flujo de caja sea preciso, los payments deben estar en `income_payments`. Pero los cambios de UI y unificación de fuente pueden hacerse antes.
- `src/views/greenhouse/finance/FinanceDashboardView.tsx` — componente principal
- `src/app/api/finance/income/summary/route.ts` — ya retorna accrual + cash
- `src/app/api/finance/expenses/summary/route.ts` — ya retorna accrual + cash
- `src/app/api/finance/dashboard/pnl/route.ts` — P&L desde Postgres
- `src/app/api/finance/accounts/route.ts` — saldos bancarios

### Impacts to
- `CODEX_TASK_Organization_Economics_Dashboard_v1.md` — org economics consumirá las mismas métricas; si el resumen está mal, economics hereda el error
- `CODEX_TASK_Financial_Intelligence_Layer_v2.md` — trends y analytics dependen de la base contable correcta
- `CODEX_TASK_Nubox_Finance_Reconciliation_Bridge_v1.md` — cobertura DTE necesita distinguir facturado de cobrado

### Files owned
- Modificación: `src/views/greenhouse/finance/FinanceDashboardView.tsx`
- Modificación: `src/app/api/finance/income/summary/route.ts` (migrar a Postgres-first)
- Modificación: `src/app/api/finance/expenses/summary/route.ts` (migrar a Postgres-first)
- Nuevo: `src/app/api/finance/dashboard/cashflow/route.ts` (flujo de caja real)
- Nuevo: `src/views/greenhouse/finance/components/FinanceKpiCardDual.tsx` (card facturado/cobrado)

## Current Repo State

### Ya existe y funciona parcialmente
- **API income/summary** ya calcula `accrualCurrentMonth` Y `cashCurrentMonth` (líneas 84-107 de route.ts). Cash usa `toIncomePaymentCashEntries()` que parsea el JSON `payments_received` de BigQuery.
- **API expenses/summary** ya calcula `accrualCurrentMonth`, `cashCurrentMonth` (lines 87-110). Cash filtra por `payment_status === 'paid'` y usa `payment_date`.
- **P&L API** calcula correctamente desde Postgres con deducción de payroll linkeado.
- **Dashboard component** tiene toda la plumería para recibir datos, pero solo consume las series `monthly` (accrual/legacy) ignorando `cashMonthly` y `accrualMonthly`.
- **`cashDataQuality`** ya se calcula en ambas APIs para detectar invoices pagadas sin eventos de pago.

### Lo que está roto o faltante
- Dashboard consume `incomeSummary?.monthly` (legacy accrual) en vez de usar las series separadas
- KPI card de ingresos muestra un solo número sin distinguir facturado vs. cobrado
- Egresos alternan entre Path A (con payroll) y Path B (sin payroll) sin transparencia
- Flujo de caja es `accrual_income - accrual_expense`, no cash real
- Income summary lee de BigQuery; P&L lee de Postgres — fuentes divergentes
- Bar chart mezcla bases (BQ para meses pasados, Postgres+payroll para mes corriente)

## Implementation Plan

### Slice 1 — Migrar Income/Expense Summary a Postgres-first

**Modificar `/api/finance/income/summary`:**
- Cambiar `runFinanceQuery()` (BigQuery) por `runGreenhousePostgresQuery()` (Postgres)
- Fuente: `greenhouse_finance.income` en vez de `greenhouse.fin_income`
- Cash: Leer de `greenhouse_finance.income_payments` (con `payment_date`) en vez de parsear JSON `payments_received`
- Mantener BigQuery como fallback con `shouldFallbackToLegacy()` (patrón existente)

**Modificar `/api/finance/expenses/summary`:**
- Cambiar a Postgres-first: `greenhouse_finance.expenses`
- Cash: Filtrar por `payment_date IS NOT NULL` para serie cash
- Mantener BigQuery fallback

Esto unifica la fuente con el P&L (ambos Postgres) y elimina discrepancias.

### Slice 2 — KPI Cards duales (facturado/cobrado)

**Modificar FinanceDashboardView.tsx:**

1. **"Ingresos del mes"** → Mostrar dos líneas:
   - Principal: "Facturado: $X" (accrual, por invoice_date)
   - Secundaria: "Cobrado: $Y" (cash, por payment_date en income_payments)
   - Si cobrado < facturado, indicador visual de cuenta por cobrar

2. **"Egresos del mes"** → Siempre usar lógica del P&L:
   - Calcular `totalExpenses` = expenses del período + unlinked payroll cost
   - No alternar entre Path A y Path B
   - Si no hay nómina aprobada, mostrarlo como nota pero igual incluir los expenses existentes
   - Mostrar breakdown: "Operacional: $X | Personal: $Y"

3. **Labels:**
   - Cambiar "Ingresos del mes" → "Facturación del mes" (con subtotal cobrado)
   - Cambiar "Egresos del mes" → "Costos del mes" (con breakdown)

### Slice 3 — Flujo de caja real

**Crear `/api/finance/dashboard/cashflow`:**

```sql
-- Cobros: payment_date de income_payments
SELECT payment_date, SUM(amount) AS total_in
FROM greenhouse_finance.income_payments
WHERE payment_date >= $1 AND payment_date <= $2
GROUP BY payment_date

-- Pagos: payment_date de expenses (status='paid')
SELECT payment_date, SUM(total_amount_clp) AS total_out
FROM greenhouse_finance.expenses
WHERE payment_status = 'paid' AND payment_date >= $1 AND payment_date <= $2
GROUP BY payment_date
```

- Agregar por mes: cash_in, cash_out, net_flow, cumulative_balance
- Punto de inicio: `SUM(accounts.opening_balance)` o balance más antiguo disponible

**Modificar chart "Flujo de caja":**
- Reemplazar `incomeData[i] - adjustedExpenseData[i]` por datos reales del endpoint cashflow
- Mostrar como area chart con cash_in (verde), cash_out (rojo), balance acumulado (línea)

### Slice 4 — Bar chart consistente

**Modificar gráfico "Ingresos vs Egresos":**

1. Usar serie Postgres-first para ambos ejes (ya migrada en Slice 1)
2. Para egresos, incluir estimación de payroll en TODOS los meses (no solo el del P&L):
   - Opción A: Leer payroll de todos los 6 meses históricos (query adicional)
   - Opción B: Solo incluir payroll en meses con status 'approved'/'exported'
3. Agregar toggle "Base devengada / Base caja" que alterne entre series accrual y cash
4. Eliminar el patch de `adjustedExpenseData` que reemplaza un solo mes

### Slice 5 — Estado de Resultados mejorado

**En la sección P&L:**
1. Agregar línea "Cobrado del período" debajo de "Ingresos brutos"
2. Agregar "Cuentas por cobrar" = Facturado - Cobrado
3. Si no hay nómina aprobada, mostrar "Costo de Personal: Pendiente de aprobación de nómina" en vez de omitirlo silenciosamente
4. Agregar indicador de completitud: "Este P&L está completo" vs. "Este P&L tiene datos parciales (falta nómina)"

## Acceptance Criteria

- [ ] Income summary migrado a Postgres-first con BigQuery fallback
- [ ] Expense summary migrado a Postgres-first con BigQuery fallback
- [ ] KPI card de ingresos muestra facturado Y cobrado
- [ ] KPI card de egresos siempre incluye costo de personal (cuando hay nómina aprobada)
- [ ] Flujo de caja calcula sobre payment_date real, no sobre invoice_date
- [ ] Bar chart usa misma base para todos los meses (sin patch de un solo mes)
- [ ] Estado de Resultados muestra indicador de completitud
- [ ] No hay discrepancia entre KPI card y Estado de Resultados por fuente de datos diferente
- [ ] Labels usan "Facturación" en vez de "Ingresos" donde corresponda
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] Al menos 3 tests: (1) income summary Postgres-first, (2) cashflow calculation, (3) expense totals con/sin payroll
