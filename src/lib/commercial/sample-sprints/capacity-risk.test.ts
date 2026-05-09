import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('./capacity-checker', () => ({
  getMemberCapacityForPeriod: vi.fn()
}))

import { getMemberCapacityForPeriod } from './capacity-checker'

import { resolveCapacityRiskForSprint } from './capacity-risk'

const mockedGetCapacity = getMemberCapacityForPeriod as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockedGetCapacity.mockReset()
})

const buildMember = (overrides: Partial<Parameters<typeof Object.assign>[0]> = {}) => ({
  memberId: 'mem-1',
  displayName: 'A',
  roleTitle: 'Lead',
  proposedFte: 0.5,
  commitmentRole: 'Lead',
  unresolved: false,
  ...overrides
})

describe('resolveCapacityRiskForSprint (TASK-835 Slice 3)', () => {
  it('retorna null cuando team está vacío', async () => {
    const result = await resolveCapacityRiskForSprint({
      team: [],
      startDate: '2026-05-01',
      targetEndDate: '2026-05-30'
    })

    expect(result.capacityRisk).toBeNull()
    expect(result.allLookupsFailed).toBe(false)
    expect(mockedGetCapacity).not.toHaveBeenCalled()
  })

  it('retorna null cuando faltan startDate o targetEndDate', async () => {
    const result = await resolveCapacityRiskForSprint({
      team: [buildMember()],
      startDate: null,
      targetEndDate: '2026-05-30'
    })

    expect(result.capacityRisk).toBeNull()
    expect(mockedGetCapacity).not.toHaveBeenCalled()
  })

  it('retorna severity=ok cuando ningún miembro está overcommit', async () => {
    mockedGetCapacity.mockResolvedValue({
      memberId: 'mem-1',
      totalFte: 1.0,
      allocatedFte: 0.3,
      availableFte: 0.7,
      conflictingAssignments: []
    })

    const result = await resolveCapacityRiskForSprint({
      team: [buildMember({ proposedFte: 0.5 })],
      startDate: '2026-05-01',
      targetEndDate: '2026-05-30'
    })

    expect(result.capacityRisk?.severity).toBe('ok')
    expect(result.capacityRisk?.overcommittedMemberIds).toEqual([])
  })

  it('retorna severity=warning cuando overcommit pequeño (≤ 0.25)', async () => {
    mockedGetCapacity.mockResolvedValue({
      memberId: 'mem-1',
      totalFte: 1.0,
      allocatedFte: 0.7,
      availableFte: 0.3,
      conflictingAssignments: []
    })

    const result = await resolveCapacityRiskForSprint({
      team: [buildMember({ proposedFte: 0.5 })], // 0.7 + 0.5 = 1.2 → overcommit 0.2
      startDate: '2026-05-01',
      targetEndDate: '2026-05-30'
    })

    expect(result.capacityRisk?.severity).toBe('warning')
    expect(result.capacityRisk?.overcommittedMemberIds).toEqual(['mem-1'])
  })

  it('retorna severity=critical cuando overcommit > 0.25', async () => {
    mockedGetCapacity.mockResolvedValue({
      memberId: 'mem-1',
      totalFte: 1.0,
      allocatedFte: 0.8,
      availableFte: 0.2,
      conflictingAssignments: []
    })

    const result = await resolveCapacityRiskForSprint({
      team: [buildMember({ proposedFte: 0.6 })], // 0.8 + 0.6 = 1.4 → overcommit 0.4
      startDate: '2026-05-01',
      targetEndDate: '2026-05-30'
    })

    expect(result.capacityRisk?.severity).toBe('critical')
    expect(result.capacityRisk?.overcommittedMemberIds).toEqual(['mem-1'])
  })

  it('marca allLookupsFailed=true cuando todos los lookups rechazan', async () => {
    mockedGetCapacity.mockRejectedValue(new Error('PG down'))

    const result = await resolveCapacityRiskForSprint({
      team: [buildMember({ memberId: 'mem-1' }), buildMember({ memberId: 'mem-2' })],
      startDate: '2026-05-01',
      targetEndDate: '2026-05-30'
    })

    expect(result.capacityRisk).toBeNull()
    expect(result.allLookupsFailed).toBe(true)
  })

  it('omite miembros con unresolved=true del cálculo', async () => {
    const result = await resolveCapacityRiskForSprint({
      team: [buildMember({ unresolved: true })],
      startDate: '2026-05-01',
      targetEndDate: '2026-05-30'
    })

    expect(result.capacityRisk).toBeNull()
    expect(mockedGetCapacity).not.toHaveBeenCalled()
  })
})
