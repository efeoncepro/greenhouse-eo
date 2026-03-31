# TASK-175 — Finance Core Test Coverage & Regression Safety Net

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseno` |
| Domain | Finance / Quality |
| Sequence | Independiente — puede ejecutarse en paralelo con cualquier task |

## Summary

Los dos archivos mas criticos del modulo de Finance — `postgres-store-slice2.ts` (~1,800 LOC) y `postgres-reconciliation.ts` (~900 LOC) — no tienen test coverage. Estos archivos contienen la logica de CRUD de income, expenses, payments, y la reconciliacion bancaria completa. Un refactor o bugfix en estos archivos hoy no tiene red de seguridad. Esta task crea tests unitarios y de integracion para estos archivos y agrega un test end-to-end del flujo P&L.

## Why This Task Exists

### Estado actual de test coverage Finance

| Archivo | LOC | Tests | Coverage |
|---------|-----|-------|----------|
| `shared.ts` | 350 | 13 tests | Alta |
| `exchange-rates.ts` | 280 | 8 tests | Alta |
| `economic-indicators.ts` | 320 | 6 tests | Alta |
| `auto-allocation-rules.ts` | 180 | 5 tests | Alta |
| `canonical.ts` | 200 | 4 tests | Alta |
| `payroll-cost-allocation.ts` | 150 | 3 tests | Alta |
| `client-economics-presentation.ts` | 120 | 4 tests | Alta |
| **`postgres-store-slice2.ts`** | **1,800** | **0 tests** | **0%** |
| **`postgres-reconciliation.ts`** | **900** | **0 tests** | **0%** |
| **`postgres-store-intelligence.ts`** | **600** | **1 test file** | **Parcial** |
| **`postgres-store.ts`** | **500** | **0 tests** | **0%** |
| **`payment-ledger.ts`** | **300** | **0 tests** | **0%** |

**Patron:** La logica pura (validators, calculators, presenters) tiene buena cobertura. La logica de persistencia (stores, ledger, reconciliation) tiene 0%.

### Riesgo concreto

Si alguien modifica la query de `listFinanceIncomeFromPostgres()` y rompe el JOIN con `income_payments`, no hay test que lo detecte. El error llega a produccion.

## Dependencies & Impact

- **Depende de:**
  - `src/test/render.tsx` (helper de render existente)
  - Vitest + jsdom configurados (ya existen)
  - Mocking de PostgreSQL pool (`vi.mock`)
- **Impacta a:**
  - TASK-174 (data integrity — tests de concurrencia pueden agregarse aqui)
  - TASK-179 (reconciliation cutover — tests validan pre/post migracion)
  - CI pipeline (mas tests = mas confianza en deploys)
- **Archivos owned:**
  - `src/lib/finance/__tests__/postgres-store-slice2.test.ts` (nuevo)
  - `src/lib/finance/__tests__/postgres-reconciliation.test.ts` (nuevo)
  - `src/lib/finance/__tests__/postgres-store.test.ts` (nuevo)
  - `src/lib/finance/__tests__/payment-ledger.test.ts` (nuevo)
  - `src/lib/finance/__tests__/finance-pnl-e2e.test.ts` (nuevo)

## Scope

### Slice 1 — postgres-store-slice2.ts unit tests (~4h)

Testear las funciones de negocio con PostgreSQL mockeado:

**Income CRUD:**
- [ ] `createFinanceIncomeInPostgres()` — valida INSERT query, parametros, outbox event
- [ ] `listFinanceIncomeFromPostgres()` — valida filtros (status, client, date range, service line)
- [ ] `getFinanceIncomeFromPostgres()` — valida lookup por ID, normalizacion de response
- [ ] `updateFinanceIncomeInPostgres()` — valida UPDATE parcial, outbox event

**Expense CRUD:**
- [ ] `createFinanceExpenseInPostgres()` — valida INSERT, ID generation con `buildMonthlySequenceIdFromPostgres()`
- [ ] `listFinanceExpensesFromPostgres()` — valida filtros, client resolution
- [ ] `updateFinanceExpenseInPostgres()` — valida UPDATE parcial, outbox event

**Normalizacion:**
- [ ] Response normalization (dates, numbers, booleans)
- [ ] Currency conversion (subtotal * exchangeRate = totalAmountClp)
- [ ] Tax calculation (subtotal * taxRate = taxAmount)

**Estrategia de mock:**
```typescript
vi.mock('@/lib/db/postgres/client', () => ({
  getGreenhousePool: vi.fn(() => ({
    query: mockQuery,
    connect: vi.fn(() => mockClient),
  })),
  withGreenhousePostgresTransaction: vi.fn(async (fn) => fn(mockClient)),
}))
```

### Slice 2 — postgres-reconciliation.ts unit tests (~3h)

**Period CRUD:**
- [ ] `createReconciliationPeriodInPostgres()` — valida duplicate check (409), INSERT
- [ ] `listReconciliationPeriodsFromPostgres()` — valida filtros (accountId, status)
- [ ] `getReconciliationPeriodDetailFromPostgres()` — valida JOIN con statement rows

**Match operations:**
- [ ] `setReconciliationLink()` — valida UPDATE de match_status, matched_id
- [ ] `removeReconciliationLink()` — valida reset de match fields
- [ ] `validateReconciledTransitionFromPostgres()` — valida state machine (open→reconciled ok, reconciled→open ok, closed→open blocked)

**Candidatos:**
- [ ] `getReconciliationCandidatesFromPostgres()` — valida time-window +-45 dias, exclusion de ya-matched

### Slice 3 — payment-ledger.ts unit tests (~2h)

- [ ] `recordPayment()` — valida INSERT payment + UPDATE income.amount_paid
- [ ] `listPaymentsForIncome()` — valida filtro por income_id
- [ ] `reconcilePaymentTotals()` — valida SUM(payments) vs income.amount_paid
- [ ] Edge cases: payment > total_amount, negative payment, zero payment

### Slice 4 — P&L end-to-end integration test (~3h)

Test que valida el flujo completo de calculo P&L sin dependencias externas:

```typescript
describe('P&L Calculation E2E', () => {
  it('computes client economics from income + expenses + payroll', async () => {
    // Setup: mock income records for client
    // Setup: mock expense records (direct + allocated)
    // Setup: mock payroll cost allocation
    // Setup: mock exchange rate
    
    // Act: computeClientEconomicsSnapshots(year, month)
    
    // Assert:
    //   totalRevenueClp = sum(income.total_amount_clp)
    //   directCostsClp = sum(allocated labor + direct expenses)
    //   grossMarginClp = revenue - direct costs
    //   grossMarginPercent = (grossMargin / revenue) * 100
    //   revenuePerFte = revenue / headcount_fte
  })

  it('handles zero-revenue client correctly (cost-only)', async () => { ... })
  it('handles multi-currency income with FX conversion', async () => { ... })
  it('excludes internal assignments from commercial cost', async () => { ... })
})
```

### Slice 5 — postgres-store.ts baseline tests (~2h)

- [ ] `createFinanceAccountInPostgres()` — INSERT + outbox event
- [ ] `upsertFinanceExchangeRateInPostgres()` — MERGE semantics
- [ ] `upsertFinanceEconomicIndicatorInPostgres()` — MERGE semantics
- [ ] `seedFinanceSupplierInPostgres()` — INSERT + provider sync side-effect

## Acceptance Criteria

- [ ] `postgres-store-slice2.test.ts` cubre CRUD de income y expenses (min 12 tests)
- [ ] `postgres-reconciliation.test.ts` cubre period lifecycle y match ops (min 8 tests)
- [ ] `payment-ledger.test.ts` cubre recording y reconciliation (min 4 tests)
- [ ] `finance-pnl-e2e.test.ts` valida calculo P&L completo (min 4 tests)
- [ ] `postgres-store.test.ts` cubre accounts, FX, indicators (min 4 tests)
- [ ] Todos los tests pasan con `pnpm test`
- [ ] `pnpm build` pasa
- [ ] Total nuevos tests: >30

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/finance/__tests__/postgres-store-slice2.test.ts` | **Nuevo** — income/expense CRUD tests |
| `src/lib/finance/__tests__/postgres-reconciliation.test.ts` | **Nuevo** — reconciliation tests |
| `src/lib/finance/__tests__/postgres-store.test.ts` | **Nuevo** — accounts/FX/indicators tests |
| `src/lib/finance/__tests__/payment-ledger.test.ts` | **Nuevo** — payment recording tests |
| `src/lib/finance/__tests__/finance-pnl-e2e.test.ts` | **Nuevo** — P&L integration test |
