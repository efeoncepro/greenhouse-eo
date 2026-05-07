import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryCalls: Array<{ text: string; values: unknown[] }> = []

const baseOffboardingCase = {
  offboarding_case_id: 'offboarding-case-valentina',
  public_id: 'EO-OFF-2026-VAL',
  profile_id: 'profile-valentina',
  member_id: 'member-valentina',
  person_legal_entity_relationship_id: 'pler-employee',
  legal_entity_organization_id: 'org-efeonce',
  space_id: 'space-efeonce',
  relationship_type: 'employee',
  contract_type_snapshot: 'indefinido',
  pay_regime_snapshot: 'chile',
  payroll_via_snapshot: 'internal',
  separation_type: 'resignation',
  status: 'executed',
  rule_lane: 'internal_payroll',
  effective_date: '2026-04-30',
  last_working_day: '2026-04-30'
}

const baseEmployeeRelationship = {
  relationship_id: 'pler-employee',
  public_id: 'EO-PLR-0001',
  profile_id: 'profile-valentina',
  legal_entity_organization_id: 'org-efeonce',
  space_id: 'space-efeonce',
  relationship_type: 'employee',
  status: 'active',
  source_of_truth: 'manual_hr',
  source_record_type: 'member',
  source_record_id: 'member-valentina',
  role_label: 'Diseñadora',
  notes: null,
  effective_from: '2024-01-01',
  effective_to: null,
  metadata_json: {},
  created_by_user_id: 'user-hr',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
}

const closedEmployeeRelationship = {
  ...baseEmployeeRelationship,
  status: 'ended',
  effective_to: '2026-04-30',
  updated_at: '2026-05-07T00:00:00.000Z'
}

const openedContractorRelationship = {
  relationship_id: 'pler-contractor',
  public_id: 'EO-PLR-0002',
  profile_id: 'profile-valentina',
  legal_entity_organization_id: 'org-efeonce',
  space_id: 'space-efeonce',
  relationship_type: 'contractor',
  status: 'active',
  source_of_truth: 'workforce_relationship_transition',
  source_record_type: 'work_relationship_offboarding_case',
  source_record_id: 'offboarding-case-valentina',
  role_label: 'Diseñadora',
  notes: 'Nueva etapa por servicios profesionales',
  effective_from: '2026-05-04',
  effective_to: null,
  metadata_json: { relationshipSubtype: 'honorarios' },
  created_by_user_id: 'user-hr',
  created_at: '2026-05-07T00:00:00.000Z',
  updated_at: '2026-05-07T00:00:00.000Z'
}

let offboardingCaseRow = baseOffboardingCase
let existingContractorRows: unknown[] = []

const client = {
  query: vi.fn(async (text: string, values: unknown[] = []) => {
    queryCalls.push({ text, values })

    if (text.includes('FROM greenhouse_hr.work_relationship_offboarding_cases')) {
      return { rows: [offboardingCaseRow] }
    }

    if (text.includes("relationship_type = 'contractor'")) {
      return { rows: existingContractorRows }
    }

    if (text.includes('FROM greenhouse_core.person_legal_entity_relationships') && text.includes('WHERE relationship_id = $1')) {
      return { rows: [baseEmployeeRelationship] }
    }

    if (text.includes('UPDATE greenhouse_core.person_legal_entity_relationships')) {
      return { rows: [closedEmployeeRelationship] }
    }

    if (text.includes('INSERT INTO greenhouse_core.person_legal_entity_relationships')) {
      return { rows: [openedContractorRelationship] }
    }

    return { rows: [] }
  })
}

vi.mock('@/lib/db', () => ({
  withTransaction: async (callback: (txClient: typeof client) => Promise<unknown>) => callback(client),
  query: vi.fn()
}))

describe('transitionEmployeeToContractor', () => {
  beforeEach(() => {
    queryCalls.length = 0
    client.query.mockClear()
    offboardingCaseRow = baseOffboardingCase
    existingContractorRows = []
  })

  it('closes the employee relationship and opens a separate honorarios contractor relationship', async () => {
    const { transitionEmployeeToContractor } = await import('./employee-to-contractor')

    const result = await transitionEmployeeToContractor({
      offboardingCaseId: 'offboarding-case-valentina',
      contractorEffectiveFrom: '2026-05-04',
      contractorSubtype: 'honorarios',
      actorUserId: 'user-hr',
      reason: 'Nueva relacion honorarios posterior al finiquito',
      notes: 'Nueva etapa por servicios profesionales'
    })

    expect(result.closedEmployeeRelationship.relationshipId).toBe('pler-employee')
    expect(result.closedEmployeeRelationship.status).toBe('ended')
    expect(result.openedContractorRelationship.relationshipId).toBe('pler-contractor')
    expect(result.openedContractorRelationship.metadata.relationshipSubtype).toBe('honorarios')

    const executedSql = queryCalls.map(call => call.text).join('\n')

    expect(executedSql).not.toContain('greenhouse_payroll.compensation_versions')
    expect(executedSql).not.toContain('UPDATE greenhouse_core.members')
  })

  it('blocks non-executed offboarding cases', async () => {
    offboardingCaseRow = { ...baseOffboardingCase, status: 'scheduled' }

    const { transitionEmployeeToContractor } = await import('./employee-to-contractor')

    await expect(transitionEmployeeToContractor({
      offboardingCaseId: 'offboarding-case-valentina',
      contractorEffectiveFrom: '2026-05-04',
      contractorSubtype: 'contractor',
      actorUserId: 'user-hr',
      reason: 'Nueva relacion contractor validada por HR'
    })).rejects.toThrow(/executed offboarding case/)
  })

  it('blocks overlapping active contractor relationships', async () => {
    existingContractorRows = [openedContractorRelationship]

    const { transitionEmployeeToContractor } = await import('./employee-to-contractor')

    await expect(transitionEmployeeToContractor({
      offboardingCaseId: 'offboarding-case-valentina',
      contractorEffectiveFrom: '2026-05-04',
      contractorSubtype: 'contractor',
      actorUserId: 'user-hr',
      reason: 'Nueva relacion contractor validada por HR'
    })).rejects.toThrow(/active contractor relationship already exists/)
  })
})
