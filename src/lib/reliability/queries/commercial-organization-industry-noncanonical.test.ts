/**
 * TASK-997 Slice 1 — test del signal `commercial.organization.industry_noncanonical`.
 * count=0 → 'ok'; count>0 → 'warning' (data quality, soft); SQL anti-regresión
 * (filtra industria no-canónica vía param array); query throws → 'unknown'.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getCommercialOrganizationIndustryNoncanonicalSignal } from './commercial-organization-industry-noncanonical'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getCommercialOrganizationIndustryNoncanonicalSignal — TASK-997 Slice 1', () => {
  it('ok cuando count=0 (steady state)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    const s = await getCommercialOrganizationIndustryNoncanonicalSignal()

    expect(s.severity).toBe('ok')
    expect(s.kind).toBe('data_quality')
    expect(s.moduleKey).toBe('commercial')
    expect(s.signalId).toBe('commercial.organization.industry_noncanonical')
  })

  it('warning cuando count>0 (data quality soft, no breakage estructural)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 2 }])
    const s = await getCommercialOrganizationIndustryNoncanonicalSignal()

    expect(s.severity).toBe('warning')
    expect(s.summary).toContain('2 organizations')
    expect(s.evidence.find(e => e.label === 'count')?.value).toBe('2')
  })

  it('SQL filtra industria no-NULL fuera del enum canónico (param array)', async () => {
    queryMock.mockResolvedValueOnce([{ n: 0 }])
    await getCommercialOrganizationIndustryNoncanonicalSignal()
    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')
    const params = queryMock.mock.calls[0]?.[1] as unknown[]

    expect(sql).toContain("NULLIF(TRIM(industry), '') IS NOT NULL")
    expect(sql).toContain('industry <> ALL($1::text[])')
    expect(Array.isArray(params?.[0])).toBe(true)
    expect((params?.[0] as string[]).length).toBeGreaterThan(100)
    expect((params?.[0] as string[])).toContain('RETAIL')
  })

  it('unknown cuando la query falla', async () => {
    queryMock.mockRejectedValueOnce(new Error('pg down'))
    const s = await getCommercialOrganizationIndustryNoncanonicalSignal()

    expect(s.severity).toBe('unknown')
  })
})
