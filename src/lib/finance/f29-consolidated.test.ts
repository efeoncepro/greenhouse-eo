import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const getVatMonthlyPosition = vi.fn()
const getRetentionMonthlyPosition = vi.fn()
const getPpmMonthlyPosition = vi.fn()

vi.mock('@/lib/finance/vat-ledger', () => ({
  getVatMonthlyPosition: (...args: unknown[]) => getVatMonthlyPosition(...args)
}))

vi.mock('@/lib/finance/retention-ledger', () => ({
  getRetentionMonthlyPosition: (...args: unknown[]) => getRetentionMonthlyPosition(...args)
}))

vi.mock('@/lib/finance/ppm-ledger', () => ({
  getPpmMonthlyPosition: (...args: unknown[]) => getPpmMonthlyPosition(...args)
}))

import { buildF29PeriodId, getF29ConsolidatedMonthlyPosition } from '@/lib/finance/f29-consolidated'

const vatRecord = { vatPositionId: 'EO-VMP-x', periodId: '2026-06', netVatPositionClp: 190000 }
const retentionRecord = { retentionPositionId: 'EO-RMP-x', periodId: '2026-06', totalRetentionAmountClp: 45000 }
const ppmRecord = { ppmPositionId: 'EO-PMP-x', periodId: '2026-06', ppmAmountClp: 14500 }

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  getVatMonthlyPosition.mockResolvedValue(vatRecord)
  getRetentionMonthlyPosition.mockResolvedValue(retentionRecord)
  getPpmMonthlyPosition.mockResolvedValue(ppmRecord)
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('buildF29PeriodId', () => {
  it('formatea period_id YYYY-MM con mes padded', () => {
    expect(buildF29PeriodId(2026, 6)).toBe('2026-06')
    expect(buildF29PeriodId(2026, 11)).toBe('2026-11')
  })
})

describe('getF29ConsolidatedMonthlyPosition', () => {
  it('compone los 3 readers canónicos sin recomputar (pasa la misma salida tal cual)', async () => {
    const result = await getF29ConsolidatedMonthlyPosition({
      legalEntityOrganizationId: 'org-efeonce',
      year: 2026,
      month: 6
    })

    // Llama exactamente los 3 readers canónicos, con el mismo scope (entidad legal).
    const expectedArgs = { legalEntityOrganizationId: 'org-efeonce', year: 2026, month: 6 }

    expect(getVatMonthlyPosition).toHaveBeenCalledTimes(1)
    expect(getVatMonthlyPosition).toHaveBeenCalledWith(expectedArgs)
    expect(getRetentionMonthlyPosition).toHaveBeenCalledTimes(1)
    expect(getRetentionMonthlyPosition).toHaveBeenCalledWith(expectedArgs)
    expect(getPpmMonthlyPosition).toHaveBeenCalledTimes(1)
    expect(getPpmMonthlyPosition).toHaveBeenCalledWith(expectedArgs)

    // Composición pura: cada línea es el objeto que su reader devolvió, sin transformar.
    expect(result.vat).toBe(vatRecord)
    expect(result.retention).toBe(retentionRecord)
    expect(result.ppm).toBe(ppmRecord)
    expect(result.periodId).toBe('2026-06')
    expect(result.legalEntityOrganizationId).toBe('org-efeonce')
  })

  it('degrada honesto: cada línea es null si no hay posición materializada', async () => {
    getRetentionMonthlyPosition.mockResolvedValue(null)
    getPpmMonthlyPosition.mockResolvedValue(null)

    const result = await getF29ConsolidatedMonthlyPosition({
      legalEntityOrganizationId: 'org-efeonce',
      year: 2026,
      month: 6
    })

    expect(result.vat).toBe(vatRecord)
    expect(result.retention).toBeNull()
    expect(result.ppm).toBeNull()
  })

  it('propaga enabled por línea: IVA siempre oficial; retención/PPM gated por flag', async () => {
    delete process.env.RETENTION_POSITION_ENABLED
    delete process.env.PPM_POSITION_ENABLED

    const shadow = await getF29ConsolidatedMonthlyPosition({
      legalEntityOrganizationId: 'org-efeonce',
      year: 2026,
      month: 6
    })

    expect(shadow.enabledByLine).toEqual({ vat: true, retention: false, ppm: false })

    process.env.RETENTION_POSITION_ENABLED = 'true'
    process.env.PPM_POSITION_ENABLED = 'true'

    const official = await getF29ConsolidatedMonthlyPosition({
      legalEntityOrganizationId: 'org-efeonce',
      year: 2026,
      month: 6
    })

    expect(official.enabledByLine).toEqual({ vat: true, retention: true, ppm: true })
  })
})
