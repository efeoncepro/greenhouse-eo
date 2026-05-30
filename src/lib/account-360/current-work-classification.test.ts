import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveCurrentWorkClassification } from './current-work-classification'

vi.mock('./person-legal-entity-relationships', () => ({
  resolveActivePersonLegalEntityRelationships: vi.fn()
}))

vi.mock('@/lib/contractor-engagements/self-service-projection', () => ({
  getActiveContractorEngagementForProfile: vi.fn()
}))

import { resolveActivePersonLegalEntityRelationships } from './person-legal-entity-relationships'
import { getActiveContractorEngagementForProfile } from '@/lib/contractor-engagements/self-service-projection'

const mockRelationships = vi.mocked(resolveActivePersonLegalEntityRelationships)
const mockEngagement = vi.mocked(getActiveContractorEngagementForProfile)

const rel = (relationshipType: string) => ({ relationshipType }) as never

describe('resolveCurrentWorkClassification (TASK-957 Slice B)', () => {
  beforeEach(() => {
    mockRelationships.mockReset()
    mockEngagement.mockReset()
  })

  it('resolves kind=employee when an active employee relationship exists', async () => {
    mockRelationships.mockResolvedValue([rel('employee')])

    const result = await resolveCurrentWorkClassification({ profileId: 'p1', memberContractType: 'indefinido' })

    expect(result.kind).toBe('employee')
    expect(result.source).toBe('active_employment_relationship')
    expect(result.employmentContractType).toBe('indefinido')
    expect(result.contractorSubtype).toBeNull()
    expect(result.displayLabel).toBe('Empleado · Contrato indefinido')
    expect(mockEngagement).not.toHaveBeenCalled()
  })

  it('resolves kind=contractor when active contractor relationship + non-terminal engagement (Valentina case)', async () => {
    mockRelationships.mockResolvedValue([rel('contractor')])
    mockEngagement.mockResolvedValue({
      status: 'draft',
      relationshipSubtype: 'honorarios_cl',
      classificationRiskStatus: 'needs_review'
    } as never)

    const result = await resolveCurrentWorkClassification({ profileId: 'p1', memberContractType: 'indefinido' })

    expect(result.kind).toBe('contractor')
    expect(result.source).toBe('active_contractor_engagement')
    expect(result.contractorSubtype).toBe('honorarios_cl')
    expect(result.classificationRiskStatus).toBe('needs_review')
    expect(result.displayLabel).toBe('Contractor · Honorarios')
    // employment history retained
    expect(result.employmentContractType).toBe('indefinido')
  })

  it('prioritizes employee over contractor when both active (data anomaly — conservative)', async () => {
    mockRelationships.mockResolvedValue([rel('employee'), rel('contractor')])

    const result = await resolveCurrentWorkClassification({ profileId: 'p1', memberContractType: 'indefinido' })

    expect(result.kind).toBe('employee')
    expect(mockEngagement).not.toHaveBeenCalled()
  })

  it('falls back to none (employment_history) when contractor relationship exists but engagement is terminal', async () => {
    mockRelationships.mockResolvedValue([rel('contractor')])
    mockEngagement.mockResolvedValue({
      status: 'ended',
      relationshipSubtype: 'honorarios_cl',
      classificationRiskStatus: 'clear'
    } as never)

    const result = await resolveCurrentWorkClassification({ profileId: 'p1', memberContractType: 'indefinido' })

    expect(result.kind).toBe('none')
    expect(result.source).toBe('employment_history')
    expect(result.contractorSubtype).toBeNull()
  })

  it('resolves kind=none source=none when no relationships and no employment history', async () => {
    mockRelationships.mockResolvedValue([])

    const result = await resolveCurrentWorkClassification({ profileId: 'p1', memberContractType: null })

    expect(result.kind).toBe('none')
    expect(result.source).toBe('none')
    expect(result.displayLabel).toBe('Sin clasificación vigente')
  })
})
