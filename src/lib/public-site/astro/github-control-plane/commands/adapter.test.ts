import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  executeApiPlatformCommand: vi.fn(),
  parseIdempotencyKey: vi.fn(),
  fetchPublicSiteGithubWorkflow: vi.fn(),
  fetchPublicSiteGithubWorkflowRun: vi.fn(),
  postPublicSiteGithubAction: vi.fn(),
  isPublicSiteGithubCommandsEnabled: vi.fn(),
  isPublicSiteGithubWorkflowDispatchEnabled: vi.fn(),
  getPublicSiteGithubAllowedWorkflows: vi.fn(),
  isPublicSiteGithubWorkflowAllowed: vi.fn(),
  isPublicSiteGithubRefAllowed: vi.fn(),
  redactErrorForResponse: vi.fn((value?: unknown) => {
    void value

    return '[redacted]'
  })
}))

vi.mock('@/lib/api-platform/core/commands', () => ({
  executeApiPlatformCommand: (...args: unknown[]) => mocks.executeApiPlatformCommand(...args)
}))

vi.mock('@/lib/api-platform/core/idempotency', () => ({
  parseIdempotencyKey: (...args: unknown[]) => mocks.parseIdempotencyKey(...args)
}))

vi.mock('./client', () => ({
  fetchPublicSiteGithubWorkflow: (...args: unknown[]) => mocks.fetchPublicSiteGithubWorkflow(...args),
  fetchPublicSiteGithubWorkflowRun: (...args: unknown[]) => mocks.fetchPublicSiteGithubWorkflowRun(...args),
  postPublicSiteGithubAction: (...args: unknown[]) => mocks.postPublicSiteGithubAction(...args)
}))

vi.mock('./flags', () => ({
  getPublicSiteGithubAllowedWorkflows: () => mocks.getPublicSiteGithubAllowedWorkflows(),
  isPublicSiteGithubCommandsEnabled: () => mocks.isPublicSiteGithubCommandsEnabled(),
  isPublicSiteGithubWorkflowAllowed: (...args: unknown[]) => mocks.isPublicSiteGithubWorkflowAllowed(...args),
  isPublicSiteGithubRefAllowed: (...args: unknown[]) => mocks.isPublicSiteGithubRefAllowed(...args),
  isPublicSiteGithubWorkflowDispatchEnabled: () => mocks.isPublicSiteGithubWorkflowDispatchEnabled()
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: (value: unknown) => mocks.redactErrorForResponse(value)
}))

const TENANT = {
  userId: 'user-admin-1',
  organizationId: null,
  clientId: null,
  spaceId: null
}

const REQUEST = new Request('http://localhost/api/admin/public-site/github-commands', {
  method: 'POST',
  headers: { 'Idempotency-Key': 'idem-1' }
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isPublicSiteGithubCommandsEnabled.mockReturnValue(false)
  mocks.isPublicSiteGithubWorkflowDispatchEnabled.mockReturnValue(false)
  mocks.getPublicSiteGithubAllowedWorkflows.mockReturnValue(['CI'])
  mocks.isPublicSiteGithubWorkflowAllowed.mockReturnValue(true)
  mocks.isPublicSiteGithubRefAllowed.mockReturnValue(true)
  mocks.parseIdempotencyKey.mockReturnValue('idem-1')
  mocks.fetchPublicSiteGithubWorkflowRun.mockResolvedValue({
    id: 27657858751,
    name: 'CI',
    workflow_id: 259783595,
    head_branch: 'main',
    conclusion: 'failure'
  })
  mocks.fetchPublicSiteGithubWorkflow.mockResolvedValue({
    id: 259783595,
    name: 'CI',
    path: '.github/workflows/ci.yml',
    state: 'active'
  })
  mocks.postPublicSiteGithubAction.mockResolvedValue({
    statusCode: 201,
    body: null,
    observedKeys: []
  })
  mocks.executeApiPlatformCommand.mockImplementation(async options => {
    const result = await options.run({ commandExecutionId: 'cmd-1' })

    return {
      ...result,
      headers: { 'idempotency-replayed': 'false' }
    }
  })
})

describe('Public Site GitHub command adapter', () => {
  it('parses every registry command name with an auditable reason', async () => {
    const { parsePublicSiteGithubCommandRequest } = await import('./adapter')
    const { PUBLIC_SITE_GITHUB_COMMAND_NAMES } = await import('./registry')

    for (const commandName of PUBLIC_SITE_GITHUB_COMMAND_NAMES) {
      expect(parsePublicSiteGithubCommandRequest({
        commandName,
        reason: `Run governed GitHub command ${commandName}`,
        payload: {}
      }).commandName).toBe(commandName)
    }

    expect(() => parsePublicSiteGithubCommandRequest({
      commandName: 'public_site.github.unknown',
      reason: 'Run unknown command'
    })).toThrow(ApiPlatformError)
  })

  it('fails closed when GitHub commands are disabled', async () => {
    const { runPublicSiteGithubCommand } = await import('./adapter')

    await expect(runPublicSiteGithubCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'public_site.github.workflow.rerun_failed',
        reason: 'Rerun failed Public Site CI jobs',
        payload: { runId: 27657858751 },
        confirmation: null
      }
    })).rejects.toMatchObject({ errorCode: 'public_site_github_command_disabled' })

    expect(mocks.executeApiPlatformCommand).not.toHaveBeenCalled()
    expect(mocks.postPublicSiteGithubAction).not.toHaveBeenCalled()
  })

  it('requires an idempotency key before dispatching upstream', async () => {
    mocks.isPublicSiteGithubCommandsEnabled.mockReturnValueOnce(true)
    mocks.parseIdempotencyKey.mockReturnValueOnce(null)

    const { runPublicSiteGithubCommand } = await import('./adapter')

    await expect(runPublicSiteGithubCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'public_site.github.workflow.rerun_failed',
        reason: 'Rerun failed Public Site CI jobs',
        payload: { runId: 27657858751 },
        confirmation: null
      }
    })).rejects.toMatchObject({ errorCode: 'bad_request' })

    expect(mocks.executeApiPlatformCommand).not.toHaveBeenCalled()
  })

  it('reruns failed jobs for an allowlisted workflow run through API Platform audit', async () => {
    mocks.isPublicSiteGithubCommandsEnabled.mockReturnValueOnce(true)

    const { runPublicSiteGithubCommand } = await import('./adapter')

    const result = await runPublicSiteGithubCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'public_site.github.workflow.rerun_failed',
        reason: 'Rerun failed Public Site CI jobs',
        payload: { runId: 27657858751 },
        confirmation: null
      }
    })

    expect(result.data.contractVersion).toBe('public-site-github-command-adapter.v1')
    expect(result.data.commandExecutionId).toBe('cmd-1')
    expect(result.data.summary.workflowName).toBe('CI')
    expect(mocks.executeApiPlatformCommand).toHaveBeenCalledWith(expect.objectContaining({
      routeKey: 'public_site.github.command.public_site.github.workflow.rerun_failed',
      request: REQUEST
    }))
    expect(mocks.postPublicSiteGithubAction).toHaveBeenCalledWith({
      endpoint: '/repos/efeoncepro/efeonce-web/actions/runs/27657858751/rerun-failed-jobs'
    })
  })

  it('blocks rerun for a successful workflow run', async () => {
    mocks.isPublicSiteGithubCommandsEnabled.mockReturnValueOnce(true)
    mocks.fetchPublicSiteGithubWorkflowRun.mockResolvedValueOnce({
      id: 27657858751,
      name: 'CI',
      workflow_id: 259783595,
      head_branch: 'main',
      conclusion: 'success'
    })

    const { runPublicSiteGithubCommand } = await import('./adapter')

    await expect(runPublicSiteGithubCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'public_site.github.workflow.rerun_failed',
        reason: 'Rerun failed Public Site CI jobs',
        payload: { runId: 27657858751 },
        confirmation: null
      }
    })).rejects.toMatchObject({
      errorCode: 'public_site_github_command_not_allowed',
      details: { conclusion: 'success' }
    })
  })

  it('blocks workflow dispatch unless the dispatch flag and confirmation are present', async () => {
    mocks.isPublicSiteGithubCommandsEnabled.mockReturnValueOnce(true)

    const { runPublicSiteGithubCommand } = await import('./adapter')

    await expect(runPublicSiteGithubCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'public_site.github.workflow.dispatch',
        reason: 'Dispatch Public Site CI workflow from Greenhouse',
        payload: { workflowId: '259783595', ref: 'main' },
        confirmation: {
          confirmed: true,
          phrase: 'EXECUTE PUBLIC SITE GITHUB WORKFLOW'
        }
      }
    })).rejects.toMatchObject({ errorCode: 'public_site_github_command_disabled' })

    expect(mocks.postPublicSiteGithubAction).not.toHaveBeenCalled()
  })
})
