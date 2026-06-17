import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  executeApiPlatformCommand: vi.fn(),
  parseIdempotencyKey: vi.fn(),
  fetchKortexGithubWorkflow: vi.fn(),
  fetchKortexGithubWorkflowRun: vi.fn(),
  postKortexGithubAction: vi.fn(),
  isKortexGithubCommandsEnabled: vi.fn(),
  isKortexGithubWorkflowDispatchEnabled: vi.fn(),
  getKortexGithubAllowedWorkflows: vi.fn(),
  isKortexGithubWorkflowAllowed: vi.fn(),
  isKortexGithubRefAllowed: vi.fn(),
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
  fetchKortexGithubWorkflow: (...args: unknown[]) => mocks.fetchKortexGithubWorkflow(...args),
  fetchKortexGithubWorkflowRun: (...args: unknown[]) => mocks.fetchKortexGithubWorkflowRun(...args),
  postKortexGithubAction: (...args: unknown[]) => mocks.postKortexGithubAction(...args)
}))

vi.mock('./flags', () => ({
  getKortexGithubAllowedWorkflows: () => mocks.getKortexGithubAllowedWorkflows(),
  isKortexGithubCommandsEnabled: () => mocks.isKortexGithubCommandsEnabled(),
  isKortexGithubWorkflowAllowed: (...args: unknown[]) => mocks.isKortexGithubWorkflowAllowed(...args),
  isKortexGithubRefAllowed: (...args: unknown[]) => mocks.isKortexGithubRefAllowed(...args),
  isKortexGithubWorkflowDispatchEnabled: () => mocks.isKortexGithubWorkflowDispatchEnabled()
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

const REQUEST = new Request('http://localhost/api/admin/kortex/github-commands', {
  method: 'POST',
  headers: { 'Idempotency-Key': 'idem-1' }
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isKortexGithubCommandsEnabled.mockReturnValue(false)
  mocks.isKortexGithubWorkflowDispatchEnabled.mockReturnValue(false)
  mocks.getKortexGithubAllowedWorkflows.mockReturnValue(['CI'])
  mocks.isKortexGithubWorkflowAllowed.mockReturnValue(true)
  mocks.isKortexGithubRefAllowed.mockReturnValue(true)
  mocks.parseIdempotencyKey.mockReturnValue('idem-1')
  mocks.fetchKortexGithubWorkflowRun.mockResolvedValue({
    id: 27681588991,
    name: 'CI',
    workflow_id: 245705338,
    head_branch: 'main',
    conclusion: 'failure'
  })
  mocks.fetchKortexGithubWorkflow.mockResolvedValue({
    id: 245705338,
    name: 'CI',
    path: '.github/workflows/ci.yml',
    state: 'active'
  })
  mocks.postKortexGithubAction.mockResolvedValue({
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

describe('Kortex GitHub command adapter', () => {
  it('parses every registry command name with an auditable reason', async () => {
    const { parseKortexGithubCommandRequest } = await import('./adapter')
    const { KORTEX_GITHUB_COMMAND_NAMES } = await import('./registry')

    for (const commandName of KORTEX_GITHUB_COMMAND_NAMES) {
      expect(parseKortexGithubCommandRequest({
        commandName,
        reason: `Run governed GitHub command ${commandName}`,
        payload: {}
      }).commandName).toBe(commandName)
    }

    expect(() => parseKortexGithubCommandRequest({
      commandName: 'kortex.github.unknown',
      reason: 'Run unknown command'
    })).toThrow(ApiPlatformError)
  })

  it('fails closed when GitHub commands are disabled', async () => {
    const { runKortexGithubCommand } = await import('./adapter')

    await expect(runKortexGithubCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.github.workflow.rerun_failed',
        reason: 'Rerun failed Kortex CI jobs',
        payload: { runId: 27681588991 },
        confirmation: null
      }
    })).rejects.toMatchObject({ errorCode: 'kortex_github_command_disabled' })

    expect(mocks.executeApiPlatformCommand).not.toHaveBeenCalled()
    expect(mocks.postKortexGithubAction).not.toHaveBeenCalled()
  })

  it('requires an idempotency key before dispatching upstream', async () => {
    mocks.isKortexGithubCommandsEnabled.mockReturnValueOnce(true)
    mocks.parseIdempotencyKey.mockReturnValueOnce(null)

    const { runKortexGithubCommand } = await import('./adapter')

    await expect(runKortexGithubCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.github.workflow.rerun_failed',
        reason: 'Rerun failed Kortex CI jobs',
        payload: { runId: 27681588991 },
        confirmation: null
      }
    })).rejects.toMatchObject({ errorCode: 'bad_request' })

    expect(mocks.executeApiPlatformCommand).not.toHaveBeenCalled()
  })

  it('reruns failed jobs for an allowlisted workflow run through API Platform audit', async () => {
    mocks.isKortexGithubCommandsEnabled.mockReturnValueOnce(true)

    const { runKortexGithubCommand } = await import('./adapter')

    const result = await runKortexGithubCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.github.workflow.rerun_failed',
        reason: 'Rerun failed Kortex CI jobs',
        payload: { runId: 27681588991 },
        confirmation: null
      }
    })

    expect(result.data.contractVersion).toBe('greenhouse-kortex-github-command-adapter.v1')
    expect(result.data.commandExecutionId).toBe('cmd-1')
    expect(result.data.summary.workflowName).toBe('CI')
    expect(mocks.executeApiPlatformCommand).toHaveBeenCalledWith(expect.objectContaining({
      routeKey: 'kortex.github.command.kortex.github.workflow.rerun_failed',
      request: REQUEST
    }))
    expect(mocks.postKortexGithubAction).toHaveBeenCalledWith({
      endpoint: '/repos/efeoncepro/kortex/actions/runs/27681588991/rerun-failed-jobs'
    })
  })

  it('blocks workflow dispatch unless the dispatch flag and confirmation are present', async () => {
    mocks.isKortexGithubCommandsEnabled.mockReturnValueOnce(true)

    const { runKortexGithubCommand } = await import('./adapter')

    await expect(runKortexGithubCommand({
      request: REQUEST,
      tenant: TENANT,
      body: {
        commandName: 'kortex.github.workflow.dispatch',
        reason: 'Dispatch Kortex CI workflow from Greenhouse',
        payload: { workflowId: '245705338', ref: 'main' },
        confirmation: {
          confirmed: true,
          phrase: 'DISPATCH KORTEX WORKFLOW'
        }
      }
    })).rejects.toMatchObject({ errorCode: 'kortex_github_command_disabled' })

    expect(mocks.postKortexGithubAction).not.toHaveBeenCalled()
  })
})
