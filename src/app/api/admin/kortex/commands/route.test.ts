import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdminTenantContext: vi.fn(),
  parseKortexCommandRequest: vi.fn(),
  runKortexAdminCommand: vi.fn(),
  formatKortexCommandError: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: () => mocks.requireAdminTenantContext()
}))

vi.mock('@/lib/kortex/commands', () => ({
  KORTEX_COMMAND_CONTRACT_VERSION: 'greenhouse-kortex-command-adapter.v1',
  parseKortexCommandRequest: (...args: unknown[]) => mocks.parseKortexCommandRequest(...args),
  runKortexAdminCommand: (...args: unknown[]) => mocks.runKortexAdminCommand(...args),
  formatKortexCommandError: (...args: unknown[]) => mocks.formatKortexCommandError(...args)
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

const VALID_BODY = {
  commandName: 'kortex.strategy.release_candidate.dry_run',
  reason: 'Validate release candidate before execution',
  payload: { releaseCandidateId: 'rc-1' }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminTenantContext.mockResolvedValue({ tenant: ADMIN_TENANT, errorResponse: null })
  mocks.parseKortexCommandRequest.mockReturnValue(VALID_BODY)
  mocks.runKortexAdminCommand.mockResolvedValue({
    status: 200,
    headers: { 'idempotency-replayed': 'false' },
    data: {
      contractVersion: 'greenhouse-kortex-command-adapter.v1',
      commandExecutionId: 'cmd-1',
      commandName: 'kortex.strategy.release_candidate.dry_run',
      status: 'completed',
      kortexOperationId: 'op-1',
      scope: {},
      summary: {},
      warnings: [],
      sources: [],
      redacted: true
    }
  })
  mocks.formatKortexCommandError.mockImplementation((error: Error & { statusCode?: number; errorCode?: string }) => ({
    status: error.statusCode ?? 500,
    body: { error: error.message, code: error.errorCode ?? 'internal_error' }
  }))
})

describe('POST /api/admin/kortex/commands', () => {
  it('requires admin tenant context', async () => {
    mocks.requireAdminTenantContext.mockResolvedValueOnce({
      tenant: null,
      errorResponse: new Response('Unauthorized', { status: 401 })
    })

    const { POST } = await import('./route')

    const response = await POST(new Request('http://localhost/api/admin/kortex/commands', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY)
    }))

    expect(response.status).toBe(401)
    expect(mocks.runKortexAdminCommand).not.toHaveBeenCalled()
  })

  it('dispatches a parsed command through the adapter', async () => {
    const { POST } = await import('./route')

    const request = new Request('http://localhost/api/admin/kortex/commands', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'idem-1' },
      body: JSON.stringify(VALID_BODY)
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Greenhouse-Contract')).toBe('greenhouse-kortex-command-adapter.v1')
    expect(response.headers.get('idempotency-replayed')).toBe('false')
    expect(json.commandExecutionId).toBe('cmd-1')
    expect(mocks.runKortexAdminCommand).toHaveBeenCalledWith({ request, body: VALID_BODY, tenant: ADMIN_TENANT })
  })

  it('returns governed parser errors without capturing as unexpected failures', async () => {
    const error = Object.assign(new Error('reason is required.'), {
      statusCode: 400,
      errorCode: 'bad_request'
    })

    mocks.parseKortexCommandRequest.mockImplementationOnce(() => {
      throw error
    })

    const { POST } = await import('./route')

    const response = await POST(new Request('http://localhost/api/admin/kortex/commands', {
      method: 'POST',
      body: '{}'
    }))

    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.code).toBe('bad_request')
    expect(mocks.captureWithDomain).not.toHaveBeenCalled()
  })

  it('captures unexpected adapter failures with redacted response shape', async () => {
    const error = new Error('upstream exploded')

    mocks.runKortexAdminCommand.mockRejectedValueOnce(error)

    const { POST } = await import('./route')

    const response = await POST(new Request('http://localhost/api/admin/kortex/commands', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY)
    }))

    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.code).toBe('internal_error')
    expect(mocks.captureWithDomain).toHaveBeenCalledWith(error, 'integrations.kortex', expect.any(Object))
  })
})
