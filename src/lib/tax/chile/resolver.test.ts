import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TaxCodeRecord } from './types'

vi.mock('server-only', () => ({}))

vi.mock('./catalog', () => ({
  loadChileTaxCodes: vi.fn()
}))

const { loadChileTaxCodes } = await import('./catalog')

const { resolveChileTaxCode, tryResolveChileTaxCode, ChileTaxCodeNotFoundError } = await import(
  './resolver'
)

const loadMock = vi.mocked(loadChileTaxCodes)

const buildCode = (overrides: Partial<TaxCodeRecord> = {}): TaxCodeRecord => ({
  id: 'test-id',
  taxCode: 'cl_vat_19',
  jurisdiction: 'CL',
  kind: 'vat_output',
  rate: 0.19,
  recoverability: 'not_applicable',
  labelEs: 'IVA 19%',
  labelEn: null,
  description: null,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  spaceId: null,
  metadata: {},
  ...overrides
})

describe('resolveChileTaxCode', () => {
  beforeEach(() => {
    loadMock.mockReset()
  })

  it('returns the matching tax code record from the catalog', async () => {
    loadMock.mockResolvedValueOnce([
      buildCode({ taxCode: 'cl_vat_19' }),
      buildCode({ taxCode: 'cl_vat_exempt', kind: 'vat_exempt', rate: null })
    ])

    const result = await resolveChileTaxCode('cl_vat_19')

    expect(result.taxCode).toBe('cl_vat_19')
    expect(result.rate).toBe(0.19)
  })

  it('throws ChileTaxCodeNotFoundError when the code is not in the catalog', async () => {
    loadMock.mockResolvedValueOnce([])

    await expect(resolveChileTaxCode('cl_vat_19')).rejects.toBeInstanceOf(
      ChileTaxCodeNotFoundError
    )
  })

  it('propagates the space scope into the lookup context', async () => {
    loadMock.mockResolvedValueOnce([buildCode({ taxCode: 'cl_vat_19' })])

    await resolveChileTaxCode('cl_vat_19', { spaceId: 'space-123' })

    expect(loadMock).toHaveBeenCalledWith({ spaceId: 'space-123' })
  })
})

describe('tryResolveChileTaxCode', () => {
  beforeEach(() => {
    loadMock.mockReset()
  })

  it('returns null instead of throwing when the code is absent', async () => {
    loadMock.mockResolvedValueOnce([])

    const result = await tryResolveChileTaxCode('cl_vat_19')

    expect(result).toBeNull()
  })

  it('returns the record when present', async () => {
    loadMock.mockResolvedValueOnce([buildCode({ taxCode: 'cl_vat_exempt', rate: null })])

    const result = await tryResolveChileTaxCode('cl_vat_exempt')

    expect(result?.taxCode).toBe('cl_vat_exempt')
    expect(result?.rate).toBeNull()
  })
})
