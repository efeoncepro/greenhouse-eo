import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

import {
  getCurrentAfpRate,
  getCurrentChileanPrevisionalRate,
  getCurrentUnemploymentRate
} from '@/lib/commercial/payroll-rates-bridge'

describe('payroll-rates-bridge', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns the latest common Chile payroll snapshot for a date', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        period_year: 2026,
        period_month: 3,
        afp_avg_rate: '0.1144',
        sis_rate: '0.0188',
        tope_afp_uf: '87.8',
        tope_cesantia_uf: '131.8'
      }
    ])

    const snapshot = await getCurrentChileanPrevisionalRate('2026-03-31')

    expect(snapshot).toEqual({
      periodYear: 2026,
      periodMonth: 3,
      periodDate: '2026-03-01',
      afpAvgRate: 0.1144,
      sisRate: 0.0188,
      topeAfpUf: 87.8,
      topeCesantiaUf: 131.8,
      source: 'greenhouse_payroll'
    })
  })

  it('returns null when no snapshot exists yet', async () => {
    mockQuery.mockResolvedValueOnce([])

    await expect(getCurrentChileanPrevisionalRate('2026-03-31')).resolves.toBeNull()
  })

  it('matches AFP rate by normalized name inside the latest period', async () => {
    const latestRows = [
      { afp_name: 'Capital', total_rate: '0.1144', period_year: 2026, period_month: 3 },
      { afp_name: 'Habitat', total_rate: '0.1116', period_year: 2026, period_month: 3 },
      { afp_name: 'Capital', total_rate: '0.1130', period_year: 2026, period_month: 2 }
    ]

    mockQuery.mockResolvedValue(latestRows)

    await expect(getCurrentAfpRate('capital', '2026-03-31')).resolves.toBe(0.1144)
    await expect(getCurrentAfpRate('hábitat', '2026-03-31')).resolves.toBe(0.1116)
    await expect(getCurrentAfpRate('modelo', '2026-03-31')).resolves.toBeNull()
  })

  it('mirrors current unemployment rules for supported payroll contract types', async () => {
    await expect(getCurrentUnemploymentRate('indefinido', '2026-03-31')).resolves.toBe(0.006)
    await expect(getCurrentUnemploymentRate('plazo_fijo', '2026-03-31')).resolves.toBe(0.03)
    await expect(getCurrentUnemploymentRate('contractor', '2026-03-31')).resolves.toBeNull()
  })
})
