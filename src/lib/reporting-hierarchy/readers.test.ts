import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

const { getEffectiveSupervisor } = await import('./readers')

const reportingLineRow = {
  reporting_line_id: 'rl-1',
  member_id: 'andres-carlosama',
  member_name: 'Andrés',
  member_active: true,
  supervisor_member_id: 'daniela-ferreira',
  supervisor_name: 'Daniela',
  supervisor_active: true,
  effective_from: '2026-04-01T00:00:00.000Z',
  effective_to: null,
  source_system: 'greenhouse_manual',
  source_metadata: null,
  change_reason: 'seed',
  changed_by_user_id: null
}

const delegateRow = {
  responsibility_id: 'resp-2de74ab9',
  delegate_member_id: 'valentina-hoyos',
  delegate_member_name: 'Valentina',
  scope_type: 'member',
  scope_id: 'daniela-ferreira',
  effective_from: '2026-04-10T00:00:00.000Z',
  effective_to: null
}

describe('getEffectiveSupervisor — TASK-1020 delegationPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("delegationPolicy='ignore' returns the FORMAL supervisor and never queries delegates", async () => {
    mockQuery.mockResolvedValueOnce([reportingLineRow]) // getCurrentReportingLine

    const result = await getEffectiveSupervisor('andres-carlosama', { delegationPolicy: 'ignore' })

    expect(result?.effectiveSupervisorMemberId).toBe('daniela-ferreira')
    expect(result?.supervisorMemberId).toBe('daniela-ferreira')
    expect(result?.delegated).toBe(false)
    expect(result?.delegation).toBeNull()
    // solo la query de la línea formal: NUNCA se consulta el approval_delegate.
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it("delegationPolicy='generic' (default) still returns the active generic delegate", async () => {
    mockQuery
      .mockResolvedValueOnce([reportingLineRow]) // getCurrentReportingLine
      .mockResolvedValueOnce([delegateRow]) // delegate lookup

    const result = await getEffectiveSupervisor('andres-carlosama', { delegationPolicy: 'generic' })

    expect(result?.effectiveSupervisorMemberId).toBe('valentina-hoyos')
    expect(result?.delegated).toBe(true)
    expect(result?.delegation?.responsibilityId).toBe('resp-2de74ab9')
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('default policy (no opts) preserves the legacy generic-delegate behavior', async () => {
    mockQuery
      .mockResolvedValueOnce([reportingLineRow])
      .mockResolvedValueOnce([delegateRow])

    const result = await getEffectiveSupervisor('andres-carlosama')

    expect(result?.effectiveSupervisorMemberId).toBe('valentina-hoyos')
    expect(result?.delegated).toBe(true)
  })
})
