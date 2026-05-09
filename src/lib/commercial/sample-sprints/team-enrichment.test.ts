import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

import { query } from '@/lib/db'

import { enrichProposedTeam } from './team-enrichment'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockedQuery.mockReset()
})

describe('enrichProposedTeam (TASK-835 Slice 3)', () => {
  it('retorna team vacío sin consultar PG cuando proposedTeam es vacío', async () => {
    const result = await enrichProposedTeam([])

    expect(result.team).toEqual([])
    expect(result.hasUnresolvedMembers).toBe(false)
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('marca unresolved=true cuando member_id no resuelve en members activos', async () => {
    mockedQuery.mockResolvedValue([])

    const result = await enrichProposedTeam([
      { memberId: 'mem-stale', proposedFte: 0.5, role: 'Lead' }
    ])

    expect(result.team[0]!.unresolved).toBe(true)
    expect(result.team[0]!.displayName).toBeNull()
    expect(result.team[0]!.roleTitle).toBeNull()
    expect(result.team[0]!.commitmentRole).toBe('Lead')
    expect(result.hasUnresolvedMembers).toBe(true)
  })

  it('hidrata display_name + role_title desde members', async () => {
    mockedQuery.mockResolvedValue([
      { member_id: 'mem-1', display_name: 'Daniela España', role_title: 'Tech Lead' },
      { member_id: 'mem-2', display_name: 'Andrés Colombia', role_title: 'Designer' }
    ])

    const result = await enrichProposedTeam([
      { memberId: 'mem-1', proposedFte: 0.5, role: 'Lead' },
      { memberId: 'mem-2', proposedFte: 0.3, role: null }
    ])

    expect(result.team[0]!).toEqual({
      memberId: 'mem-1',
      displayName: 'Daniela España',
      roleTitle: 'Tech Lead',
      proposedFte: 0.5,
      commitmentRole: 'Lead',
      unresolved: false
    })
    expect(result.team[1]!.displayName).toBe('Andrés Colombia')
    expect(result.hasUnresolvedMembers).toBe(false)
  })

  it('hibrida resoluble + unresolved en mismo team y reporta hasUnresolvedMembers=true', async () => {
    mockedQuery.mockResolvedValue([
      { member_id: 'mem-1', display_name: 'A', role_title: null }
    ])

    const result = await enrichProposedTeam([
      { memberId: 'mem-1', proposedFte: 0.4, role: null },
      { memberId: 'mem-stale', proposedFte: 0.2, role: null }
    ])

    expect(result.team[0]!.unresolved).toBe(false)
    expect(result.team[1]!.unresolved).toBe(true)
    expect(result.hasUnresolvedMembers).toBe(true)
  })

  it('deduplica memberIds en el lookup query', async () => {
    mockedQuery.mockResolvedValue([])

    await enrichProposedTeam([
      { memberId: 'mem-1', proposedFte: 0.5, role: null },
      { memberId: 'mem-1', proposedFte: 0.3, role: 'Co-lead' }
    ])

    const [, params] = mockedQuery.mock.calls[0]!

    expect(params[0]).toEqual(['mem-1'])
  })
})
