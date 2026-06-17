import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdminTenantContext: vi.fn(),
  parseKortexGithubCommandRequest: vi.fn(),
  runKortexGithubCommand: vi.fn(),
  formatKortexGithubCommandError: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: () => mocks.requireAdminTenantContext()
}))

vi.mock('@/lib/kortex/github-control-plane/commands', () => ({
  KORTEX_GITHUB_COMMAND_CONTRACT_VERSION: 'greenhouse-kortex-github-command-adapter.v1',
  parseKortexGithubCommandRequest: (...args: unknown[]) => mocks.parseKortexGithubCommandRequest(...args),
  runKortexGithubCommand: (...args: unknown[]) => mocks.runKortexGithubCommand(...args),
  formatKortexGithubCommandError: (...args: unknown[]) => mocks.formatKortexGithubCommandError(...args)
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
  commandName: 'kortex.github.workflow.rerun_failed',
  reason: 'Rerun failed Kortex CI jobs',
  payload: { runId: 27681588991 }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminTenantContext.mockResolvedValue({ tenant: ADMIN_TENANT, errorResponse: null })
  mocks.parseKortexGithubCommandRequest.mockReturnValue({ ...RAW_BODY, confirmation: null })
  mocks.runKortexGithubCommand.mockResolvedValue({
    data: {
      contractVersion: 'greenhouse-kortex-github-command-adapter.v1',
      commandExecutionId: 'cmd-1',
      commandName: 'kortex.github.workflow.rerun_failed',
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
  mocks.formatKortexGithubCommandError.mockReturnValue({
    status: 409,
    body: {
      error: 'disabled',
      code: 'kortex_github_command_disabled'
    }
  })
})

describe('POST /api/admin/kortex/github-commands', () => {
  it('requires admin tenant context', async () => {
    mocks.requireAdminTenantContext.mockResolvedValueOnce({
      tenant: null,
      errorResponse: new Response('Unauthorized', { status: 401 })
    })

    const { POST } = await import('./route')

    const response = await POST(new Request('http://localhost/api/admin/kortex/github-commands', {
      method: 'POST',
      body: JSON.stringify(RAW_BODY)
    }))

    expect(response.status).toBe(401)
    expect(mocks.runKortexGithubCommand).not.toHaveBeenCalled()
  })

  it('runs parsed GitHub command with contract header', async () => {
    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/admin/kortex/github-commands', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'idem-1' },
      body: JSON.stringify(RAW_BODY)
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Greenhouse-Contract')).toBe('greenhouse-kortex-github-command-adapter.v1')
    expect(json.commandExecutionId).toBe('cmd-1')
    expect(mocks.runKortexGithubCommand).toHaveBeenCalledWith({
      request,
      tenant: ADMIN_TENANT,
      body: { ...RAW_BODY, confirmation: null }
    })
  })

  it('formats command errors and captures server-side failures', async () => {
    mocks.runKortexGithubCommand.mockRejectedValueOnce(new Error('boom'))
    mocks.formatKortexGithubCommandError.mockReturnValueOnce({
      status: 502,
      body: {
        error: '[redacted]',
        code: 'kortex_github_upstream_failed'
      }
    })

    const { POST } = await import('./route')

    const response = await POST(new Request('http://localhost/api/admin/kortex/github-commands', {
      method: 'POST',
      body: JSON.stringify(RAW_BODY)
    }))

    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.code).toBe('kortex_github_upstream_failed')
    expect(mocks.captureWithDomain).toHaveBeenCalled()
  })
})
