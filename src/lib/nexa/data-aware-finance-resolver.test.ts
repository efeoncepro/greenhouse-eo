import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { GH_NEXA } from '@/lib/copy/nexa'

// Mock del reader canónico de ledger health.
const ledgerHealthMock = vi.fn()

vi.mock('@/lib/finance/ledger-health', () => ({
  getFinanceLedgerHealth: () => ledgerHealthMock()
}))

import { buildFinancePrompts, resolveFinancePrompts } from './data-aware-finance-resolver'

const COPY = GH_NEXA.floating.data_aware_prompts

describe('buildFinancePrompts (TASK-1143, mapper puro)', () => {
  it('ledger sano → []', () => {
    expect(buildFinancePrompts({ settlementDriftCount: 0, staleBalancesCount: 0, unanchoredCount: 0, degradedChecksCount: 0 })).toEqual([])
  })

  it('descuadre → anomalía con el count real', () => {
    const result = buildFinancePrompts({ settlementDriftCount: 4, staleBalancesCount: 0, unanchoredCount: 0, degradedChecksCount: 0 })

    expect(result[0]).toEqual({ text: COPY.finance_ledger_drift.replace('{count}', '4'), hint: 'anomaly' })
  })

  it('chequeos degradados → riesgo (sin count)', () => {
    const result = buildFinancePrompts({ settlementDriftCount: 0, staleBalancesCount: 0, unanchoredCount: 0, degradedChecksCount: 2 })

    expect(result[0].text).toBe(COPY.finance_ledger_degraded)
    expect(result[0].hint).toBe('risk')
  })

  it('orden por severidad: descuadre primero', () => {
    const result = buildFinancePrompts({ settlementDriftCount: 1, staleBalancesCount: 1, unanchoredCount: 1, degradedChecksCount: 1 })

    expect(result).toHaveLength(4)
    expect(result[0].text).toContain('descuadre')
  })

  it('NUNCA echa montos crudos al texto', () => {
    const result = buildFinancePrompts({ settlementDriftCount: 3, staleBalancesCount: 2, unanchoredCount: 1, degradedChecksCount: 0 })

    for (const prompt of result) {
      expect(prompt.text).not.toContain('$')
    }
  })
})

describe('resolveFinancePrompts (TASK-1143, anti-oracle)', () => {
  const makeInput = (routeGroups: string[]) =>
    ({
      subject: { userId: 'user-1' } as unknown as TenantEntitlementSubject,
      context: 'finance' as const,
      tenant: { routeGroups } as unknown as TenantContext
    })

  beforeEach(() => {
    ledgerHealthMock.mockReset()
    ledgerHealthMock.mockResolvedValue({
      healthy: false,
      settlementDrift: { driftedIncomesCount: 2, sampleDrifted: [] },
      phantoms: { incomePhantomsCount: 0, expensePhantomsCount: 0, samplePhantoms: [] },
      balanceFreshness: { accountsWithStaleBalances: [] },
      unanchoredExpenses: { count: 0, sample: [] },
      degradedChecks: []
    })
  })

  afterEach(() => ledgerHealthMock.mockReset())

  it('sin acceso `finance` → [] (no revela anomalías, anti-oracle)', async () => {
    const result = await resolveFinancePrompts(makeInput(['my']))

    expect(result).toEqual([])
    expect(ledgerHealthMock).not.toHaveBeenCalled()
  })

  it('con acceso `finance` → lee el ledger y mapea el descuadre', async () => {
    const result = await resolveFinancePrompts(makeInput(['finance']))

    expect(ledgerHealthMock).toHaveBeenCalledTimes(1)
    expect(result.some(p => p.text.includes('descuadre') && p.text.includes('2'))).toBe(true)
  })
})
