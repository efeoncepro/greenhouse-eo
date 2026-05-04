import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockClearCache = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('./rollout-flags', () => ({
  __clearHomeRolloutFlagCache: () => mockClearCache()
}))

const {
  upsertHomeRolloutFlag,
  deleteHomeRolloutFlag,
  listHomeRolloutFlags,
  HomeRolloutFlagValidationError
} = await import('./rollout-flags-store')

const baseRow = {
  id: 1,
  flag_key: 'home_v2_shell',
  scope_type: 'global',
  scope_id: null,
  enabled: true,
  reason: 'TASK-780 cutover',
  created_at: '2026-05-04T00:00:00Z',
  updated_at: '2026-05-04T00:00:00Z'
}

describe('upsertHomeRolloutFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unknown flag keys', async () => {
    await expect(
      upsertHomeRolloutFlag({
        flagKey: 'unknown_flag' as 'home_v2_shell',
        scopeType: 'global',
        scopeId: null,
        enabled: true,
        reason: 'test'
      })
    ).rejects.toBeInstanceOf(HomeRolloutFlagValidationError)
  })

  it('rejects global scope with non-null scopeId', async () => {
    await expect(
      upsertHomeRolloutFlag({
        flagKey: 'home_v2_shell',
        scopeType: 'global',
        scopeId: 'tenant-a',
        enabled: true,
        reason: 'should fail'
      })
    ).rejects.toBeInstanceOf(HomeRolloutFlagValidationError)
  })

  it('rejects non-global scope without scopeId', async () => {
    await expect(
      upsertHomeRolloutFlag({
        flagKey: 'home_v2_shell',
        scopeType: 'tenant',
        scopeId: null,
        enabled: true,
        reason: 'should fail'
      })
    ).rejects.toBeInstanceOf(HomeRolloutFlagValidationError)
  })

  it('rejects empty reason (audit floor)', async () => {
    await expect(
      upsertHomeRolloutFlag({
        flagKey: 'home_v2_shell',
        scopeType: 'global',
        scopeId: null,
        enabled: true,
        reason: ''
      })
    ).rejects.toBeInstanceOf(HomeRolloutFlagValidationError)
  })

  it('upserts a valid global flag and clears cache', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([baseRow])

    const result = await upsertHomeRolloutFlag({
      flagKey: 'home_v2_shell',
      scopeType: 'global',
      scopeId: null,
      enabled: true,
      reason: 'TASK-780 cutover'
    })

    expect(result.flagKey).toBe('home_v2_shell')
    expect(result.scopeType).toBe('global')
    expect(result.scopeId).toBeNull()
    expect(result.enabled).toBe(true)
    expect(mockClearCache).toHaveBeenCalledTimes(1)
  })

  it('upserts a tenant-scoped flag', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { ...baseRow, scope_type: 'tenant', scope_id: 'client-globe-sky', enabled: false }
    ])

    const result = await upsertHomeRolloutFlag({
      flagKey: 'home_v2_shell',
      scopeType: 'tenant',
      scopeId: 'client-globe-sky',
      enabled: false,
      reason: 'Disable for Sky pilot'
    })

    expect(result.scopeType).toBe('tenant')
    expect(result.scopeId).toBe('client-globe-sky')
    expect(result.enabled).toBe(false)
  })
})

describe('deleteHomeRolloutFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes and clears cache', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([{ id: 1 }])

    const result = await deleteHomeRolloutFlag({
      flagKey: 'home_v2_shell',
      scopeType: 'tenant',
      scopeId: 'tenant-a'
    })

    expect(result.deleted).toBe(1)
    expect(mockClearCache).toHaveBeenCalledTimes(1)
  })

  it('returns deleted=0 when no row matches', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    const result = await deleteHomeRolloutFlag({
      flagKey: 'home_v2_shell',
      scopeType: 'tenant',
      scopeId: 'nonexistent-tenant'
    })

    expect(result.deleted).toBe(0)
  })

  it('rejects global scope with scopeId', async () => {
    await expect(
      deleteHomeRolloutFlag({
        flagKey: 'home_v2_shell',
        scopeType: 'global',
        scopeId: 'oops'
      })
    ).rejects.toBeInstanceOf(HomeRolloutFlagValidationError)
  })
})

describe('listHomeRolloutFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped rows', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([baseRow])

    const rows = await listHomeRolloutFlags()

    expect(rows).toHaveLength(1)
    expect(rows[0].flagKey).toBe('home_v2_shell')
    expect(rows[0].createdAt).toBe('2026-05-04T00:00:00Z')
  })

  it('filters by flagKey when provided', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([baseRow])

    await listHomeRolloutFlags('home_v2_shell')

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE flag_key = $1'),
      ['home_v2_shell']
    )
  })
})
