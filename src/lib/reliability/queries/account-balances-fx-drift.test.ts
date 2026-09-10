/**
 * TASK-774 Slice 4 — tests para getAccountBalancesFxDriftSignal.
 *
 * 4 paths cubiertos:
 *   1. count = 0 → severity 'ok' + summary "Sin drift"
 *   2. count > 0 → severity 'error' + recomienda backfill
 *   3. SQL lee VIEWs canónicas TASK-766 + COALESCE settlement_legs (no raw tables sin _clp)
 *   4. query throws → severity 'unknown' (degraded)
 *
 * TASK-1858 Slice 2 (ISSUE-169) — el detector cubre cuentas no-CLP.
 *
 * Sobre las aserciones textuales de este archivo: `query` está mockeado, así
 * que NINGÚN test de acá ejecuta el SQL. Lo que se afirma sobre el string es
 * (a) el contrato vigente —la expectativa se deriva en unidades de la cuenta
 * con la MISMA regla que `toAccountUnits` (`@/lib/finance/account-balances`),
 * que es la única autoridad de conversión— y (b) la regresión prohibida con
 * nombre: el filtro `a.currency = 'CLP'` de TASK-774 Slice 7b, que dejó a
 * USD/MXN fuera del detector y ocultó ISSUE-169. El verificador real de que
 * la regla SQL reproduce al materializer es correr el reader contra PostgreSQL
 * (proxy `pnpm pg:connect`) sobre las cuentas no-CLP reales
 * (`santander-usd-usd`, `global-66-mxn-mxn`) y comparar con `account_balances`
 * rematerializado; esa corrida es evidencia de cierre de TASK-1858, no algo
 * que un mock pueda sustituir.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  countAccountBalancesFxDriftRows,
  getAccountBalancesFxDriftSignal,
  listAccountBalancesFxDriftRows
} from './account-balances-fx-drift'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getAccountBalancesFxDriftSignal — TASK-774', () => {
  it('returns ok when count = 0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getAccountBalancesFxDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.kind).toBe('drift')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.signalId).toBe('finance.account_balances.fx_drift')
    expect(signal.summary).toContain('Sin drift FX')
  })

  it('returns error severity when count > 0 + recommends backfill', async () => {
    queryMock.mockResolvedValueOnce([{ n: 5 }])

    const signal = await getAccountBalancesFxDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('5 account_balances')
    expect(signal.summary).toContain('backfill-account-balances-fx-fix')
    expect(signal.evidence.find(e => e.label === 'count')?.value).toBe('5')
  })

  it('SQL reads from canonical VIEWs + COALESCE settlement_legs (anti-regresión)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await getAccountBalancesFxDriftSignal()

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    // Lee VIEWs canónicas TASK-766
    expect(sql).toContain('expense_payments_normalized')
    expect(sql).toContain('income_payments_normalized')
    expect(sql).toContain('payment_amount_clp')

    // settlement_legs con COALESCE (TASK-774 patrón inline)
    expect(sql).toContain('COALESCE(sl.amount_clp')

    // Filtros 3-axis supersede preservados
    expect(sql).toContain('superseded_at IS NULL')
    expect(sql).toContain('superseded_by_otb_id IS NULL')

    // Tolerancia parametrizada anti FP-noise, elegida por moneda de la cuenta
    expect(sql).toContain("> CASE WHEN ep.currency = 'CLP' THEN $2::numeric ELSE $3::numeric END")
    expect(queryMock.mock.calls[0]?.[1]).toEqual([90, 1, 0.05])
  })

  it('returns unknown when the query throws (degraded honestamente)', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getAccountBalancesFxDriftSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('No fue posible')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('connection refused')
  })

  it('exposes window_days=90 + tolerance_clp=1 + tolerance_native=0.05 metadata', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    const signal = await getAccountBalancesFxDriftSignal()

    expect(signal.evidence.find(e => e.label === 'window_days')?.value).toBe('90')
    expect(signal.evidence.find(e => e.label === 'tolerance_clp')?.value).toBe('1')
    expect(signal.evidence.find(e => e.label === 'tolerance_native')?.value).toBe('0.05')
  })

  it('returns detailed drift rows ordered by severity/date/account for remediation consumers', async () => {
    queryMock.mockResolvedValueOnce([
      {
        account_id: 'santander-clp',
        account_name: 'Santander CLP',
        currency: 'CLP',
        balance_date: '2026-05-01',
        is_period_closed: false,
        transaction_count: 0,
        persisted_inflows_clp: '0.00',
        persisted_outflows_clp: '0.00',
        persisted_closing_balance_clp: '1615054.57',
        expected_inflows_clp: '0',
        expected_outflows_clp: '402562.50',
        expected_closing_balance_clp: '1212492.07',
        drift_clp: '-402562.50',
        abs_drift_clp: '402562.50',
        settlement_leg_count: 2,
        income_payment_count: 0,
        expense_payment_count: 0,
        detected_at: '2026-05-09T12:00:00.000Z'
      }
    ])

    const rows = await listAccountBalancesFxDriftRows({ accountId: 'santander-clp', fromDate: '2026-05-01' })

    expect(rows).toEqual([
      {
        accountId: 'santander-clp',
        accountName: 'Santander CLP',
        currency: 'CLP',
        balanceDate: '2026-05-01',
        isPeriodClosed: false,
        transactionCount: 0,
        persistedInflowsClp: '0.00',
        persistedOutflowsClp: '0.00',
        persistedClosingBalanceClp: '1615054.57',
        expectedInflowsClp: '0',
        expectedOutflowsClp: '402562.50',
        expectedClosingBalanceClp: '1212492.07',
        driftClp: '-402562.50',
        absDriftClp: '402562.50',
        evidenceRefs: {
          settlementLegs: 2,
          incomePayments: 0,
          expensePayments: 0
        },
        detectedAt: '2026-05-09T12:00:00.000Z'
      }
    ])

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('ORDER BY abs_drift_clp DESC, balance_date DESC, account_id ASC')
    expect(sql).toContain('LIMIT 100')
    expect(queryMock.mock.calls[0]?.[1]).toEqual(['2026-05-01', 'santander-clp', 1, 0.05])
  })

  it('supports exact count without applying row limit', async () => {
    queryMock.mockResolvedValueOnce([{ n: 7 }])

    await expect(countAccountBalancesFxDriftRows({ windowDays: 30, toleranceClp: 0.5 })).resolves.toBe(7)

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('SELECT COUNT(*)::int AS n FROM drift_rows')
    expect(sql).not.toContain('LIMIT')
    expect(queryMock.mock.calls[0]?.[1]).toEqual([30, 0.5, 0.05])
  })
})

describe('non-CLP accounts — TASK-1858 Slice 2 (ISSUE-169)', () => {
  const usdRow = (overrides: Record<string, unknown>) => ({
    account_id: 'santander-usd-usd',
    account_name: 'Santander USD',
    currency: 'USD',
    balance_date: '2026-09-01',
    is_period_closed: false,
    transaction_count: 1,
    persisted_inflows_clp: '0.00',
    persisted_outflows_clp: '50.00',
    persisted_closing_balance_clp: '950.00',
    expected_inflows_clp: '0',
    expected_outflows_clp: '50.00',
    expected_closing_balance_clp: '950.00',
    drift_clp: '0',
    abs_drift_clp: '0',
    settlement_leg_count: 0,
    income_payment_count: 0,
    expense_payment_count: 1,
    detected_at: '2026-09-10T12:00:00.000Z',
    ...overrides
  })

  it('no longer excludes non-CLP accounts (the TASK-774 Slice 7b filter is a named regression)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await countAccountBalancesFxDriftRows({ accountId: 'santander-usd-usd' })

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    // Regresión prohibida: el filtro que dejó a USD/MXN fuera del detector.
    expect(sql).not.toMatch(/AND\s+a\.currency\s*=\s*'CLP'/)

    // Filtros que SÍ deben seguir (window + accountId), con ambas tolerancias detrás.
    expect(queryMock.mock.calls[0]?.[1]).toEqual([90, 'santander-usd-usd', 1, 0.05])
  })

  it('derives the expectation in ACCOUNT units with the toAccountUnits rule (legs + both payment views)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await countAccountBalancesFxDriftRows()

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    // Rama CLP intacta (contrato TASK-774) en los legs.
    expect(sql).toContain("WHEN a.currency = 'CLP'")
    expect(sql).toContain("COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)")

    // Rama nativa: leg en la moneda de la cuenta → nativo.
    expect(sql).toContain('WHEN sl.currency = a.currency OR sl.currency IS NULL THEN sl.amount')

    // Rama FX: leg en otra moneda con amount_clp → amount_clp / tasa persistida ESE día.
    expect(sql).toContain('WHEN sl.amount_clp IS NOT NULL AND ab.fx_rate_used > 0 THEN sl.amount_clp / ab.fx_rate_used')

    // Las dos VIEWs TASK-766 pasan por la misma regla con sus tres columnas.
    for (const alias of ['ipn', 'epn']) {
      expect(sql).toContain(`WHEN epd.currency = 'CLP' THEN ${alias}.payment_amount_clp`)
      expect(sql).toContain(
        `WHEN ${alias}.payment_currency = epd.currency OR ${alias}.payment_currency IS NULL`
      )
      expect(sql).toContain(`THEN ${alias}.payment_amount_native`)
      expect(sql).toContain(
        `WHEN ${alias}.payment_amount_clp IS NOT NULL AND epd.fx_rate_used > 0`
      )
      expect(sql).toContain(`THEN ${alias}.payment_amount_clp / epd.fx_rate_used`)
    }

    // El anti-patrón que reintrodujo ISSUE-169 en el materializer: sumar CLP a secas.
    expect(sql).not.toContain('SUM(ipn.payment_amount_clp)')
    expect(sql).not.toContain('SUM(epn.payment_amount_clp)')

    // Saldo persistido en unidades de la cuenta (no closing_balance_clp para USD).
    expect(sql).toContain("CASE WHEN a.currency = 'CLP' THEN ab.closing_balance_clp ELSE ab.closing_balance END")

    // Los 3-axis supersede + la exclusión NOT EXISTS de legs enlazados siguen intactos.
    expect(sql).toContain('sl.superseded_at IS NULL')
    expect(sql).toContain('sl.superseded_by_otb_id IS NULL')
    expect(sql.match(/NOT EXISTS \(/g)?.length).toBe(4)
    expect(sql).toContain("sl2.linked_payment_type = 'income_payment'")
    expect(sql).toContain("sl3.linked_payment_type = 'expense_payment'")
  })

  it('applies the native tolerance (0.05) to non-CLP accounts and keeps 1 CLP for CLP accounts', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await countAccountBalancesFxDriftRows({ toleranceClp: 2, toleranceNative: 0.01 })

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain("> CASE WHEN ep.currency = 'CLP' THEN $2::numeric ELSE $3::numeric END")
    expect(queryMock.mock.calls[0]?.[1]).toEqual([90, 2, 0.01])
  })

  it('USD account with a native USD payment → row is within tolerance and does not surface (count 0)', async () => {
    // Escenario: pago de 50.00 USD en santander-usd-usd, persistido 50.00 USD.
    // El SQL (rama "moneda del pago = moneda de la cuenta → nativo") produce
    // drift 0 y la fila no pasa el WHERE; el reader ve count 0.
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await expect(countAccountBalancesFxDriftRows({ accountId: 'santander-usd-usd' })).resolves.toBe(0)
  })

  it('USD account with a CLP-denominated payment converted via fx_rate_used → no drift (count 0)', async () => {
    // Escenario: pago de 45.000 CLP (amount_clp) desde santander-usd-usd con
    // fx_rate_used = 900 ese día → 50.00 USD esperados; persistido 50.00 USD.
    // Rama "otra moneda con amount_clp y tasa > 0 → amount_clp / fx_rate_used".
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await expect(countAccountBalancesFxDriftRows({ accountId: 'santander-usd-usd' })).resolves.toBe(0)
  })

  it('USD account whose persisted row summed CLP (ISSUE-169) → drift row surfaces in account units', async () => {
    // Escenario ISSUE-169: el materializer sumó 45.000 CLP como si fueran USD
    // dentro de santander-usd-usd. Esperado 50.00 USD, persistido 45000.00 →
    // drift de -44950.00 USD (unidades de la cuenta), muy por encima de 0.05.
    queryMock.mockResolvedValueOnce([
      usdRow({
        persisted_outflows_clp: '45000.00',
        persisted_closing_balance_clp: '-44000.00',
        expected_outflows_clp: '50.00',
        expected_closing_balance_clp: '950.00',
        drift_clp: '44950.00',
        abs_drift_clp: '44950.00'
      })
    ])

    const rows = await listAccountBalancesFxDriftRows({ accountId: 'santander-usd-usd', windowDays: 60 })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      accountId: 'santander-usd-usd',
      currency: 'USD',
      persistedOutflowsClp: '45000.00',
      expectedOutflowsClp: '50.00',
      driftClp: '44950.00',
      absDriftClp: '44950.00',
      evidenceRefs: { settlementLegs: 0, incomePayments: 0, expensePayments: 1 }
    })

    // El consumer lee la unidad desde `currency`; los nombres *Clp son contrato, no promesa de CLP.
    expect(rows[0]?.currency).not.toBe('CLP')
    expect(queryMock.mock.calls[0]?.[1]).toEqual([60, 'santander-usd-usd', 1, 0.05])
  })
})
