import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

const { listPendingIntakeMembers } = await import('./list-pending-members')

describe('TASK-873 Slice 1 — listPendingIntakeMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty result when no members are pending', async () => {
    queryMock.mockResolvedValueOnce([]) // page rows
    queryMock.mockResolvedValueOnce([{ n: 0 }]) // count approx

    const result = await listPendingIntakeMembers()

    expect(result.items).toHaveLength(0)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
    expect(result.totalApprox).toBe(0)
  })

  it('maps PG rows to canonical shape', async () => {
    const createdAt = new Date('2026-05-01T00:00:00Z')

    queryMock.mockResolvedValueOnce([
      {
        member_id: 'mem-1',
        display_name: 'Felipe Zurita',
        primary_email: 'felipe@example.com',
        workforce_intake_status: 'pending_intake',
        identity_profile_id: 'identity-felipe',
        created_at: createdAt,
        active: true,
        age_days: 5
      }
    ])
    queryMock.mockResolvedValueOnce([{ n: 1 }])

    const result = await listPendingIntakeMembers()

    expect(result.items).toEqual([
      {
        memberId: 'mem-1',
        displayName: 'Felipe Zurita',
        primaryEmail: 'felipe@example.com',
        workforceIntakeStatus: 'pending_intake',
        identityProfileId: 'identity-felipe',
        createdAt: createdAt.toISOString(),
        ageDays: 5,
        active: true
      }
    ])
    expect(result.totalApprox).toBe(1)
  })

  it('detects hasMore when page rows exceed pageSize and emits keyset cursor', async () => {
    const rows = Array.from({ length: 51 }, (_, i) => ({
      member_id: `mem-${i}`,
      display_name: `Member ${i}`,
      primary_email: null,
      workforce_intake_status: 'pending_intake',
      identity_profile_id: null,
      created_at: new Date(`2026-05-01T00:00:${String(i).padStart(2, '0')}Z`),
      active: true,
      age_days: i
    }))

    queryMock.mockResolvedValueOnce(rows) // 51 = pageSize(50)+1
    queryMock.mockResolvedValueOnce([{ n: 100 }])

    const result = await listPendingIntakeMembers({ pageSize: 50 })

    expect(result.items).toHaveLength(50)
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).toEqual({
      createdAt: rows[49].created_at.toISOString(),
      memberId: 'mem-49'
    })
  })

  it('applies status filter when provided', async () => {
    queryMock.mockResolvedValueOnce([])
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await listPendingIntakeMembers({ statusFilter: 'in_review' })

    // First call = page query with status filter param
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('workforce_intake_status = $'),
      expect.arrayContaining(['in_review'])
    )
  })

  it('honors cursor pagination (keyset on created_at + member_id)', async () => {
    queryMock.mockResolvedValueOnce([])

    await listPendingIntakeMembers({
      cursor: { createdAt: '2026-05-01T00:00:00.000Z', memberId: 'mem-49' }
    })

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/m\.created_at, m\.member_id\)/),
      expect.arrayContaining(['2026-05-01T00:00:00.000Z', 'mem-49'])
    )
    // Cursor pagination skips the count approx query.
    expect(queryMock).toHaveBeenCalledTimes(1)
  })

  it('returns totalApprox=null when count query fails (degraded honest)', async () => {
    queryMock.mockResolvedValueOnce([])
    queryMock.mockRejectedValueOnce(new Error('PG timeout'))

    const result = await listPendingIntakeMembers()

    expect(result.totalApprox).toBeNull()
    expect(result.items).toHaveLength(0)
  })

  it('clamps pageSize to MAX_PAGE_SIZE (200) and minimum 1', async () => {
    queryMock.mockResolvedValueOnce([])
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await listPendingIntakeMembers({ pageSize: 9999 })

    // Limit param should be 201 (200 + 1 for hasMore detection)
    const firstCall = queryMock.mock.calls[0]
    const params = firstCall[1] as unknown[]

    expect(params).toContain(201)
  })

  it('defaults statusFilter to "all" with WHERE != completed', async () => {
    queryMock.mockResolvedValueOnce([])
    queryMock.mockResolvedValueOnce([{ n: 0 }])

    await listPendingIntakeMembers()

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("workforce_intake_status != 'completed'"),
      expect.any(Array)
    )
  })
})
