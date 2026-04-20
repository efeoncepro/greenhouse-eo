import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockGetEmploymentTypeByCode = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/commercial/sellable-roles-store', () => ({
  getEmploymentTypeByCode: (...args: unknown[]) => mockGetEmploymentTypeByCode(...args)
}))

import {
  resolveEmploymentTypeAlias,
  resolvePayrollContractTypeToEmploymentType
} from '@/lib/commercial/employment-type-alias-store'

describe('employment-type-alias-store', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockGetEmploymentTypeByCode.mockReset()
  })

  it('resolves payroll aliases into canonical commercial employment types', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        source_system: 'greenhouse_payroll.contract_type',
        source_value: 'indefinido',
        source_value_normalized: 'indefinido',
        employment_type_code: 'indefinido_clp',
        resolution_status: 'mapped',
        confidence: 'canonical',
        notes: 'Payroll contract type canonical mapping',
        active: true,
        created_at: '2026-04-18T00:00:00Z',
        updated_at: '2026-04-18T00:00:00Z'
      }
    ])

    mockGetEmploymentTypeByCode.mockResolvedValueOnce({
      employmentTypeCode: 'indefinido_clp',
      labelEs: 'Indefinido CLP'
    })

    const result = await resolvePayrollContractTypeToEmploymentType('indefinido')

    expect(result.matched).toBe(true)
    expect(result.employmentTypeCode).toBe('indefinido_clp')
    expect(result.confidence).toBe('canonical')
    expect(result.employmentType).toMatchObject({
      employmentTypeCode: 'indefinido_clp'
    })
  })

  it('returns needs_review when no alias mapping exists', async () => {
    mockQuery.mockResolvedValueOnce([])

    const result = await resolveEmploymentTypeAlias({
      sourceSystem: 'greenhouse_payroll.contract_type',
      sourceValue: 'misterioso'
    })

    expect(result).toMatchObject({
      matched: false,
      normalizedSourceValue: 'misterioso',
      resolutionStatus: 'needs_review',
      warning: 'alias_not_found'
    })
    expect(mockGetEmploymentTypeByCode).not.toHaveBeenCalled()
  })

  it('flags empty input without hitting the database', async () => {
    const result = await resolveEmploymentTypeAlias({
      sourceSystem: 'greenhouse_payroll.contract_type',
      sourceValue: '   '
    })

    expect(result.warning).toBe('empty_source_value')
    expect(mockQuery).not.toHaveBeenCalled()
  })
})
