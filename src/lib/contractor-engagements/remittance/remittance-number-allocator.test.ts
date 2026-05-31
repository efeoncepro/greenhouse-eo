import { afterEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

import {
  allocateRemittanceAdviceNumber,
  getRemittanceAdviceNumber
} from './remittance-number-allocator'

afterEach(() => {
  queryMock.mockReset()
})

describe('allocateRemittanceAdviceNumber', () => {
  it('calls the canonical SQL function with issuer + payable and maps the row', async () => {
    queryMock.mockResolvedValueOnce([
      { remittance_number: 'EO-RA-000142', sequential_value: 142, format_version: 1 }
    ])

    const result = await allocateRemittanceAdviceNumber({
      issuerOrganizationId: 'org-efeonce',
      contractorPayableId: 'cpay-abc'
    })

    expect(queryMock).toHaveBeenCalledTimes(1)
    const [sql, params] = queryMock.mock.calls[0]

    expect(sql).toContain('greenhouse_hr.allocate_remittance_advice_number($1, $2)')
    expect(params).toEqual(['org-efeonce', 'cpay-abc'])
    expect(result).toEqual({ remittanceNumber: 'EO-RA-000142', sequentialValue: 142, formatVersion: 1 })
  })

  it('coerces string numerics returned by pg to numbers', async () => {
    queryMock.mockResolvedValueOnce([
      { remittance_number: 'EO-RA-000001', sequential_value: '1', format_version: '1' }
    ])

    const result = await allocateRemittanceAdviceNumber({
      issuerOrganizationId: 'org-efeonce',
      contractorPayableId: 'cpay-1'
    })

    expect(result.sequentialValue).toBe(1)
    expect(result.formatVersion).toBe(1)
  })

  it('throws when the function returns no row', async () => {
    queryMock.mockResolvedValueOnce([])

    await expect(
      allocateRemittanceAdviceNumber({ issuerOrganizationId: 'org', contractorPayableId: 'cpay' })
    ).rejects.toThrow(/returned no row/)
  })

  it('shares a transaction client when provided (no global query)', async () => {
    const clientQuery = vi.fn().mockResolvedValueOnce({
      rows: [{ remittance_number: 'EO-RA-000010', sequential_value: 10, format_version: 1 }]
    })

    const result = await allocateRemittanceAdviceNumber({
      issuerOrganizationId: 'org',
      contractorPayableId: 'cpay',
      client: { query: clientQuery } as never
    })

    expect(clientQuery).toHaveBeenCalledTimes(1)
    expect(queryMock).not.toHaveBeenCalled()
    expect(result.remittanceNumber).toBe('EO-RA-000010')
  })
})

describe('getRemittanceAdviceNumber', () => {
  it('returns the persisted number for a payable', async () => {
    queryMock.mockResolvedValueOnce([
      { remittance_number: 'EO-RA-000099', sequential_value: 99, format_version: 1 }
    ])

    const result = await getRemittanceAdviceNumber('cpay-x')

    expect(result).toEqual({ remittanceNumber: 'EO-RA-000099', sequentialValue: 99, formatVersion: 1 })
  })

  it('returns null when the payable has no number yet', async () => {
    queryMock.mockResolvedValueOnce([])

    expect(await getRemittanceAdviceNumber('cpay-none')).toBeNull()
  })
})
