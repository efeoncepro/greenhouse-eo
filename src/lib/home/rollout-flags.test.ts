import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

const { resolveHomeRolloutFlag, isHomeV2EnabledForSubject, __clearHomeRolloutFlagCache } = await import(
  './rollout-flags'
)

const subject = (overrides: Partial<Parameters<typeof resolveHomeRolloutFlag>[1]> = {}) => ({
  userId: 'user-1',
  tenantId: 'tenant-a',
  roleCodes: ['collaborator'],
  ...overrides
})

describe('resolveHomeRolloutFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __clearHomeRolloutFlagCache()
    delete process.env.HOME_V2_ENABLED
  })

  afterEach(() => {
    delete process.env.HOME_V2_ENABLED
  })

  it('uses global PG row when no narrower scope matches', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { flag_key: 'home_v2_shell', scope_type: 'global', scope_id: null, enabled: true }
    ])

    const result = await resolveHomeRolloutFlag('home_v2_shell', subject())

    expect(result).toEqual({ enabled: true, source: 'pg', scopeType: 'global' })
  })

  it('user scope wins over role/tenant/global (precedence)', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { flag_key: 'home_v2_shell', scope_type: 'global', scope_id: null, enabled: true },
      { flag_key: 'home_v2_shell', scope_type: 'tenant', scope_id: 'tenant-a', enabled: true },
      { flag_key: 'home_v2_shell', scope_type: 'role', scope_id: 'collaborator', enabled: true },
      { flag_key: 'home_v2_shell', scope_type: 'user', scope_id: 'user-1', enabled: false }
    ])

    const result = await resolveHomeRolloutFlag('home_v2_shell', subject())

    expect(result).toEqual({ enabled: false, source: 'pg', scopeType: 'user' })
  })

  it('role scope wins over tenant/global when no user row exists', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { flag_key: 'home_v2_shell', scope_type: 'global', scope_id: null, enabled: true },
      { flag_key: 'home_v2_shell', scope_type: 'role', scope_id: 'collaborator', enabled: false }
    ])

    const result = await resolveHomeRolloutFlag('home_v2_shell', subject())

    expect(result).toEqual({ enabled: false, source: 'pg', scopeType: 'role' })
  })

  it('tenant scope ignored when subject tenantId is null', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { flag_key: 'home_v2_shell', scope_type: 'tenant', scope_id: 'tenant-a', enabled: true }
    ])

    const result = await resolveHomeRolloutFlag('home_v2_shell', subject({ tenantId: null }))

    expect(result.enabled).toBe(false)
    expect(result.source).toBe('default')
  })

  it('PG failure → env fallback when HOME_V2_ENABLED=true', async () => {
    process.env.HOME_V2_ENABLED = 'true'
    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(new Error('connection refused'))

    const result = await resolveHomeRolloutFlag('home_v2_shell', subject())

    expect(result).toEqual({ enabled: true, source: 'env_fallback', scopeType: null })
  })

  it('PG failure + no env var → conservative default disabled', async () => {
    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(new Error('PG down'))

    const result = await resolveHomeRolloutFlag('home_v2_shell', subject())

    expect(result).toEqual({ enabled: false, source: 'default', scopeType: null })
  })

  it('PG returns no rows → default disabled (operators must opt in explicitly)', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])

    const result = await resolveHomeRolloutFlag('home_v2_shell', subject())

    expect(result).toEqual({ enabled: false, source: 'default', scopeType: null })
  })

  it('cache hits do not re-query PG within TTL', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { flag_key: 'home_v2_shell', scope_type: 'global', scope_id: null, enabled: true }
    ])

    const subj = subject()
    const first = await resolveHomeRolloutFlag('home_v2_shell', subj)
    const second = await resolveHomeRolloutFlag('home_v2_shell', subj)

    expect(first).toEqual(second)
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
  })

  it('different subjects are cached independently', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        { flag_key: 'home_v2_shell', scope_type: 'user', scope_id: 'user-1', enabled: true }
      ])
      .mockResolvedValueOnce([
        { flag_key: 'home_v2_shell', scope_type: 'user', scope_id: 'user-2', enabled: false }
      ])

    const a = await resolveHomeRolloutFlag('home_v2_shell', subject({ userId: 'user-1' }))
    const b = await resolveHomeRolloutFlag('home_v2_shell', subject({ userId: 'user-2' }))

    expect(a.enabled).toBe(true)
    expect(b.enabled).toBe(false)
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
  })

  it('isHomeV2EnabledForSubject returns the boolean directly', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { flag_key: 'home_v2_shell', scope_type: 'global', scope_id: null, enabled: true }
    ])

    expect(await isHomeV2EnabledForSubject(subject())).toBe(true)
  })

  it('env fallback respects falsy values', async () => {
    process.env.HOME_V2_ENABLED = 'off'
    mockRunGreenhousePostgresQuery.mockRejectedValueOnce(new Error('PG down'))

    const result = await resolveHomeRolloutFlag('home_v2_shell', subject())

    expect(result).toEqual({ enabled: false, source: 'env_fallback', scopeType: null })
  })

  it('rejects rows with non-matching flag_key (defense in depth)', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      { flag_key: 'some_other_flag', scope_type: 'global', scope_id: null, enabled: true }
    ])

    const result = await resolveHomeRolloutFlag('home_v2_shell', subject())

    expect(result.source).toBe('default')
  })
})
