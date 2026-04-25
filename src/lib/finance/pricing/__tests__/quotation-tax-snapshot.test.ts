import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockResolveChileTaxCode = vi.fn()

vi.mock('@/lib/tax/chile', async () => {
  const actual = (await vi.importActual('@/lib/tax/chile')) as Record<string, unknown>

  return {
    ...actual,
    resolveChileTaxCode: (...args: unknown[]) => mockResolveChileTaxCode(...args)
  }
})

import {
  DEFAULT_QUOTE_TAX_CODE,
  buildQuotationTaxSnapshot,
  isQuoteTaxCode,
  parsePersistedTaxSnapshot
} from '../quotation-tax-snapshot'

const FAKE_VAT_19 = {
  id: 'cl_vat_19_v1',
  taxCode: 'cl_vat_19',
  jurisdiction: 'CL',
  kind: 'vat_output' as const,
  rate: 0.19,
  recoverability: 'not_applicable' as const,
  labelEs: 'IVA 19%',
  labelEn: 'VAT 19%',
  description: null,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  spaceId: null,
  metadata: {}
}

const FAKE_EXEMPT = { ...FAKE_VAT_19, taxCode: 'cl_vat_exempt', kind: 'vat_exempt' as const, rate: null, labelEs: 'IVA Exento' }

describe('buildQuotationTaxSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the default tax code when none supplied', async () => {
    mockResolveChileTaxCode.mockResolvedValueOnce(FAKE_VAT_19)

    const result = await buildQuotationTaxSnapshot({ netAmount: 1_000_000 })

    expect(mockResolveChileTaxCode).toHaveBeenCalledWith(
      DEFAULT_QUOTE_TAX_CODE,
      expect.objectContaining({ spaceId: null })
    )
    expect(result.taxCode).toBe('cl_vat_19')
    expect(result.rateSnapshot).toBe(0.19)
    expect(result.taxAmountSnapshot).toBe(190_000)
    expect(result.isTaxExempt).toBe(false)
    expect(result.snapshot.totalAmount).toBe(1_190_000)
  })

  it('marks exempt codes as isTaxExempt=true and keeps tax amount at 0', async () => {
    mockResolveChileTaxCode.mockResolvedValueOnce(FAKE_EXEMPT)

    const result = await buildQuotationTaxSnapshot({
      netAmount: 500_000,
      taxCode: 'cl_vat_exempt'
    })

    expect(result.isTaxExempt).toBe(true)
    expect(result.taxAmountSnapshot).toBe(0)
    expect(result.snapshot.taxableAmount).toBe(500_000)
    expect(result.snapshot.totalAmount).toBe(500_000)
  })

  it('freezes the snapshot with the provided issuedAt', async () => {
    mockResolveChileTaxCode.mockResolvedValueOnce(FAKE_VAT_19)

    const result = await buildQuotationTaxSnapshot({
      netAmount: 100,
      issuedAt: '2026-04-21T10:00:00Z'
    })

    expect(result.snapshot.frozenAt).toBe('2026-04-21T10:00:00.000Z')
  })

  it('propagates spaceId to the resolver for tenant-scoped overrides', async () => {
    mockResolveChileTaxCode.mockResolvedValueOnce(FAKE_VAT_19)

    await buildQuotationTaxSnapshot({ netAmount: 100, spaceId: 'space-1' })

    expect(mockResolveChileTaxCode).toHaveBeenCalledWith(
      'cl_vat_19',
      expect.objectContaining({ spaceId: 'space-1' })
    )
  })
})

describe('parsePersistedTaxSnapshot', () => {
  it('returns null for null / undefined / non-objects', () => {
    expect(parsePersistedTaxSnapshot(null)).toBeNull()
    expect(parsePersistedTaxSnapshot(undefined)).toBeNull()
    expect(parsePersistedTaxSnapshot('string')).toBeNull()
    expect(parsePersistedTaxSnapshot(42)).toBeNull()
  })

  it('rejects payloads with the wrong version', () => {
    expect(parsePersistedTaxSnapshot({ version: '2', taxCode: 'cl_vat_19' })).toBeNull()
  })

  it('rejects payloads missing required string fields', () => {
    expect(parsePersistedTaxSnapshot({ version: '1' })).toBeNull()
    expect(parsePersistedTaxSnapshot({
      version: '1',
      taxCode: 'cl_vat_19'

      // missing jurisdiction + kind + labelEs + effectiveFrom + frozenAt
    })).toBeNull()
  })

  it('parses a complete snapshot', () => {
    const raw = {
      version: '1',
      taxCode: 'cl_vat_19',
      jurisdiction: 'CL',
      kind: 'vat_output',
      rate: 0.19,
      recoverability: 'not_applicable',
      labelEs: 'IVA 19%',
      effectiveFrom: '2026-01-01',
      frozenAt: '2026-04-21T10:00:00Z',
      taxableAmount: 100,
      taxAmount: 19,
      totalAmount: 119,
      metadata: { source: 'test' }
    }

    const parsed = parsePersistedTaxSnapshot(raw)

    expect(parsed).not.toBeNull()
    expect(parsed?.taxCode).toBe('cl_vat_19')
    expect(parsed?.totalAmount).toBe(119)
    expect(parsed?.metadata).toEqual({ source: 'test' })
  })

  it('coerces numeric fields and fills metadata default', () => {
    const parsed = parsePersistedTaxSnapshot({
      version: '1',
      taxCode: 'cl_vat_19',
      jurisdiction: 'CL',
      kind: 'vat_output',
      rate: 0.19,
      labelEs: 'IVA 19%',
      effectiveFrom: '2026-01-01',
      frozenAt: '2026-04-21T10:00:00Z',
      taxableAmount: '100',
      taxAmount: '19',
      totalAmount: '119'
    })

    expect(parsed?.taxableAmount).toBe(100)
    expect(parsed?.taxAmount).toBe(19)
    expect(parsed?.totalAmount).toBe(119)
    expect(parsed?.metadata).toEqual({})
  })
})

describe('isQuoteTaxCode', () => {
  it('recognises canonical values', () => {
    expect(isQuoteTaxCode('cl_vat_19')).toBe(true)
    expect(isQuoteTaxCode('cl_vat_exempt')).toBe(true)
    expect(isQuoteTaxCode('cl_vat_non_billable')).toBe(true)
  })

  it('rejects other values', () => {
    expect(isQuoteTaxCode('cl_input_vat_credit_19')).toBe(false)
    expect(isQuoteTaxCode(null)).toBe(false)
    expect(isQuoteTaxCode(undefined)).toBe(false)
    expect(isQuoteTaxCode(0.19)).toBe(false)
  })
})
