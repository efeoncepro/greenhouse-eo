import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/commercial/quote-to-cash/flags', () => ({ CONTRACT_ONLY_SLA_DAYS: 14 }))

import { query } from '@/lib/db'
import {
  getQ2cConvertedWithoutIncomeSignal,
  getQ2cConvertedWithoutAuditSignal,
  getQ2cIssuedWithoutDealSignal,
  getQ2cContractOnlySlaBreachSignal,
  getQ2cDuplicateIncomeSignal
} from './commercial-quote-to-cash-health'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('Q2C reliability signals', () => {
  it('reports ok when steady (count = 0)', async () => {
    mockedQuery.mockResolvedValue([{ n: 0 }])

    for (const fn of [
      getQ2cConvertedWithoutIncomeSignal,
      getQ2cConvertedWithoutAuditSignal,
      getQ2cIssuedWithoutDealSignal,
      getQ2cContractOnlySlaBreachSignal,
      getQ2cDuplicateIncomeSignal
    ]) {
      const signal = await fn()

      expect(signal.severity).toBe('ok')
      expect(signal.moduleKey).toBe('commercial')
    }
  })

  it('escalates the money-critical signals to error when count > 0', async () => {
    mockedQuery.mockResolvedValue([{ n: 3 }])

    for (const fn of [getQ2cConvertedWithoutIncomeSignal, getQ2cContractOnlySlaBreachSignal, getQ2cDuplicateIncomeSignal]) {
      const signal = await fn()

      expect(signal.severity).toBe('error')
    }
  })

  it('keeps the convergence signals as warning when count > 0', async () => {
    mockedQuery.mockResolvedValue([{ n: 5 }])

    for (const fn of [getQ2cConvertedWithoutAuditSignal, getQ2cIssuedWithoutDealSignal]) {
      const signal = await fn()

      expect(signal.severity).toBe('warning')
    }
  })

  it('degrades to unknown on a query error', async () => {
    mockedQuery.mockRejectedValue(new Error('boom'))

    const signal = await getQ2cDuplicateIncomeSignal()

    expect(signal.severity).toBe('unknown')
  })
})
