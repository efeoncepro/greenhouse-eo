import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => true,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

const {
  listPayrollTaxTableVersionsForMonth,
  resolvePayrollTaxTableVersion
} = await import('./tax-table-version')

describe('resolvePayrollTaxTableVersion', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
  })

  it('prefers the canonical gael version for the requested month', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([
      { tax_table_version: 'gael-2026-04' },
      { tax_table_version: 'manual-2026-04' }
      ])

    const resolved = await resolvePayrollTaxTableVersion({ year: 2026, month: 4 })

    expect(resolved).toBe('gael-2026-04')
  })

  it('returns the sole available version when the canonical one does not exist', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ tax_table_version: 'manual-2026-04' }])

    const resolved = await resolvePayrollTaxTableVersion({ year: 2026, month: 4 })

    expect(resolved).toBe('manual-2026-04')
  })

  it('accepts an explicit version only when it exists for the requested month', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ tax_table_version: 'gael-2026-04' }])

    const resolved = await resolvePayrollTaxTableVersion({
      year: 2026,
      month: 4,
      requestedVersion: 'gael-2026-04'
    })

    expect(resolved).toBe('gael-2026-04')
  })

  it('can recover from a stale requested version when there is exactly one version for the month', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ tax_table_version: 'gael-2026-04' }])

    const resolved = await resolvePayrollTaxTableVersion({
      year: 2026,
      month: 4,
      requestedVersion: 'SII-2026-04',
      allowMonthFallbackForRequestedVersion: true
    })

    expect(resolved).toBe('gael-2026-04')
  })

  it('returns null when an explicit invalid version is provided and no fallback is allowed', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ tax_table_version: 'gael-2026-04' }])

    const resolved = await resolvePayrollTaxTableVersion({
      year: 2026,
      month: 4,
      requestedVersion: 'SII-2026-04'
    })

    expect(resolved).toBeNull()
  })

  it('returns an empty list when no versions are materialized for the month', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([])

    const versions = await listPayrollTaxTableVersionsForMonth({ year: 2026, month: 4 })

    expect(versions).toEqual([])
  })

  it('fails soft when the Chile tax table relation is not deployed yet', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ exists: false }])

    const versions = await listPayrollTaxTableVersionsForMonth({ year: 2026, month: 4 })

    expect(versions).toEqual([])
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
  })

  it('still fails soft if the relation disappears between the probe and the read', async () => {
    const missingRelationError = Object.assign(new Error('relation "greenhouse_payroll.chile_tax_brackets" does not exist'), {
      code: '42P01'
    })

    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([{ exists: true }])
      .mockRejectedValueOnce(missingRelationError)

    const versions = await listPayrollTaxTableVersionsForMonth({ year: 2026, month: 4 })

    expect(versions).toEqual([])
  })
})
