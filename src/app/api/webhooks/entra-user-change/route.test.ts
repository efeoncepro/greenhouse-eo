import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: vi.fn()
}))

vi.mock('@/lib/entra/graph-client', () => ({
  fetchEntraUsersWithManagers: vi.fn()
}))

vi.mock('@/lib/entra/profile-sync', () => ({
  syncEntraProfiles: vi.fn()
}))

vi.mock('@/lib/reporting-hierarchy/governance', () => ({
  runEntraHierarchyGovernanceScan: vi.fn()
}))

const { GET, POST } = await import('./route')

describe('/api/webhooks/entra-user-change', () => {
  it('echoes Microsoft Graph validation tokens on GET', async () => {
    const response = await GET(
      new Request('https://greenhouse.test/api/webhooks/entra-user-change?validationToken=probe-get')
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain')
    await expect(response.text()).resolves.toBe('probe-get')
  })

  it('echoes Microsoft Graph validation tokens on POST before payload parsing', async () => {
    const response = await POST(
      new Request('https://greenhouse.test/api/webhooks/entra-user-change?validationToken=probe-post', {
        method: 'POST'
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain')
    await expect(response.text()).resolves.toBe('probe-post')
  })
})
