import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdminTenantContext: vi.fn(),
  parsePublicSiteGithubCommandRequest: vi.fn(),
  runPublicSiteGithubCommand: vi.fn(),
  formatPublicSiteGithubCommandError: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: () => mocks.requireAdminTenantContext()
}))

vi.mock('@/lib/public-site/astro/github-control-plane/commands', () => ({
  PUBLIC_SITE_GITHUB_COMMAND_CONTRACT_VERSION: 'public-site-github-command-adapter.v1',
  parsePublicSiteGithubCommandRequest: (...args: unknown[]) => mocks.parsePublicSiteGithubCommandRequest(...args),
  runPublicSiteGithubCommand: (...args: unknown[]) => mocks.runPublicSiteGithubCommand(...args),
  formatPublicSiteGithubCommandError: (...args: unknown[]) => mocks.formatPublicSiteGithubCommandError(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mocks.captureWithDomain(...args)
}))

const ADMIN_TENANT = {
  userId: 'user-admin-1',
  organizationId: null,
  clientId: null,
  spaceId: null,
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['admin']
}

const RAW_BODY = {
  commandName: 'public_site.github.workflow.rerun_failed',
  reason: 'Rerun failed Public Site CI jobs',
  payload: { runId: 27657858751 }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminTenantContext.mockResolvedValue({ tenant: ADMIN_TENANT, errorResponse: null })
  mocks.parsePublicSiteGithubCommandRequest.mockReturnValue({ ...RAW_BODY, confirmation: null })
  mocks.runPublicSiteGithubCommand.mockResolvedValue({
    data: {
      contractVersion: 'public-site-github-command-adapter.v1',
      commandExecutionId: 'cmd-1',
      commandName: 'public_site.github.workflow.rerun_failed',
      status: 'accepted',
      githubOperationId: null,
      summary: {},
      redacted: true,
      warnings: [],
      sources: []
    },
    status: 200,
    headers: { 'idempotency-replayed': 'false' }
  })
  mocks.formatPublicSiteGithubCommandError.mockReturnValue({
    status: 409,
    body: {
      error: 'disabled',
      code: 'public_site_github_command_disabled'
    }
  })
})

describe('POST /api/admin/public-site/github-commands', () => {
  it('requires admin tenant context', async () => {
    mocks.requireAdminTenantContext.mockResolvedValueOnce({
      tenant: null,
      errorResponse: new Response('Unauthorized', { status: 401 })
    })

    const { POST } = await import('./route')

    const response = await POST(new Request('http://localhost/api/admin/public-site/github-commands', {
      method: 'POST',
      body: JSON.stringify(RAW_BODY)
    }))

    expect(response.status).toBe(401)
    expect(mocks.runPublicSiteGithubCommand).not.toHaveBeenCalled()
  })

  it('runs parsed GitHub command with contract header', async () => {
    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/admin/public-site/github-commands', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'idem-1' },
      body: JSON.stringify(RAW_BODY)
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Greenhouse-Contract')).toBe('public-site-github-command-adapter.v1')
    expect(json.commandExecutionId).toBe('cmd-1')
    expect(mocks.runPublicSiteGithubCommand).toHaveBeenCalledWith({
      request,
      tenant: ADMIN_TENANT,
      body: { ...RAW_BODY, confirmation: null }
    })
  })

  it('formats command errors and captures server-side failures', async () => {
    mocks.runPublicSiteGithubCommand.mockRejectedValueOnce(new Error('boom'))
    mocks.formatPublicSiteGithubCommandError.mockReturnValueOnce({
      status: 502,
      body: {
        error: '[redacted]',
        code: 'public_site_github_upstream_failed'
      }
    })

    const { POST } = await import('./route')

    const response = await POST(new Request('http://localhost/api/admin/public-site/github-commands', {
      method: 'POST',
      body: JSON.stringify(RAW_BODY)
    }))

    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.code).toBe('public_site_github_upstream_failed')
    expect(mocks.captureWithDomain).toHaveBeenCalled()
  })
})
