import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockIsConfigured = vi.fn<() => boolean>()
const mockPgQuery = vi.fn()
const mockBqQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  isGreenhousePostgresConfigured: () => mockIsConfigured(),
  runGreenhousePostgresQuery: (...args: unknown[]) => mockPgQuery(...args)
}))

vi.mock('@/lib/bigquery', () => ({
  getBigQueryProjectId: () => 'test-project',
  getBigQueryClient: () => ({
    query: (...args: unknown[]) => mockBqQuery(...args)
  })
}))

import { getUserAvatarAssetPath } from '@/lib/admin/media-assets'

beforeEach(() => {
  vi.clearAllMocks()
  mockIsConfigured.mockReturnValue(true)
})

describe('getUserAvatarAssetPath', () => {
  it('resolves user avatars from Postgres Person 360 first', async () => {
    mockPgQuery.mockResolvedValueOnce([
      { avatar_url: 'gs://greenhouse-media/users/user-1/avatar.jpg' }
    ])

    await expect(getUserAvatarAssetPath('user-1')).resolves.toBe('gs://greenhouse-media/users/user-1/avatar.jpg')

    expect(mockPgQuery).toHaveBeenCalledWith(expect.stringContaining('greenhouse_serving.person_360'), ['user-1'])
    expect(mockBqQuery).not.toHaveBeenCalled()
  })

  it('serves the latest Entra-synced avatar path written to Postgres', async () => {
    mockPgQuery.mockResolvedValueOnce([
      { avatar_url: 'gs://greenhouse-media/users/user-1/avatar-1778769999999.jpg' }
    ])

    await expect(getUserAvatarAssetPath('user-1')).resolves.toBe(
      'gs://greenhouse-media/users/user-1/avatar-1778769999999.jpg'
    )

    expect(mockBqQuery).not.toHaveBeenCalled()
  })

  it('falls back to the legacy BigQuery mirror when Postgres has no gs asset', async () => {
    mockPgQuery.mockResolvedValueOnce([{ avatar_url: null }])
    mockBqQuery.mockResolvedValueOnce([
      [{ avatar_url: 'gs://greenhouse-media/users/user-1/avatar-legacy.jpg' }]
    ])

    await expect(getUserAvatarAssetPath('user-1')).resolves.toBe('gs://greenhouse-media/users/user-1/avatar-legacy.jpg')
  })

  it('does not return proxy URLs as storage asset paths', async () => {
    mockPgQuery.mockResolvedValueOnce([
      { avatar_url: '/api/media/users/user-1/avatar' }
    ])
    mockBqQuery.mockResolvedValueOnce([
      [{ avatar_url: '/api/media/users/user-1/avatar' }]
    ])

    await expect(getUserAvatarAssetPath('user-1')).resolves.toBeNull()
  })
})
