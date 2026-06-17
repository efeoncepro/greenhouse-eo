import 'server-only'

import { executeApiPlatformCommand } from '@/lib/api-platform/core/commands'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { parseIdempotencyKey } from '@/lib/api-platform/core/idempotency'
import { redactErrorForResponse } from '@/lib/observability/redact'

import {
  fetchKortexGithubWorkflow,
  fetchKortexGithubWorkflowRun,
  postKortexGithubAction
} from './client'
import {
  getKortexGithubAllowedWorkflows,
  isKortexGithubCommandsEnabled,
  isKortexGithubRefAllowed,
  isKortexGithubWorkflowAllowed,
  isKortexGithubWorkflowDispatchEnabled
} from './flags'
import {
  getKortexGithubCommandDefinition,
  isKortexGithubCommandName
} from './registry'
import {
  KORTEX_GITHUB_COMMAND_CONTRACT_VERSION,
  type KortexGithubCommandExecutionInput,
  type KortexGithubCommandName,
  type KortexGithubCommandRequest,
  type KortexGithubCommandResponse,
  type KortexGithubCommandSummary
} from './types'

const FAILED_RUN_CONCLUSIONS = new Set(['failure', 'cancelled', 'timed_out', 'action_required'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const asString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)

  return null
}

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }

  return null
}

const requireString = (value: unknown, field: string): string => {
  const normalized = asString(value)

  if (!normalized) {
    throw new ApiPlatformError(`${field} is required.`, {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return normalized
}

const requireNumber = (value: unknown, field: string): number => {
  const normalized = asNumber(value)

  if (normalized === null) {
    throw new ApiPlatformError(`${field} is required.`, {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return normalized
}

const assertKnownCommandName = (value: unknown): KortexGithubCommandName => {
  const commandName = asString(value)

  if (commandName && isKortexGithubCommandName(commandName)) return commandName

  throw new ApiPlatformError('Unsupported Kortex GitHub command.', {
    statusCode: 400,
    errorCode: 'bad_request'
  })
}

export const parseKortexGithubCommandRequest = (raw: unknown): KortexGithubCommandRequest => {
  if (!isRecord(raw)) {
    throw new ApiPlatformError('JSON body is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const commandName = assertKnownCommandName(raw.commandName)
  const reason = requireString(raw.reason, 'reason')

  if (reason.length < 10) {
    throw new ApiPlatformError('reason must be at least 10 characters.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return {
    commandName,
    reason,
    payload: isRecord(raw.payload) ? raw.payload : {},
    confirmation: isRecord(raw.confirmation)
      ? {
          confirmed: raw.confirmation.confirmed === true,
          phrase: asString(raw.confirmation.phrase)
        }
      : null
  }
}

const assertGlobalCommandFlag = (): void => {
  if (!isKortexGithubCommandsEnabled()) {
    throw new ApiPlatformError('Kortex GitHub commands are disabled in this environment.', {
      statusCode: 409,
      errorCode: 'kortex_github_command_disabled'
    })
  }
}

const assertWorkflowAllowed = (workflow: string | number): void => {
  if (!isKortexGithubWorkflowAllowed(workflow)) {
    throw new ApiPlatformError('Kortex GitHub workflow is not allowlisted.', {
      statusCode: 409,
      errorCode: 'kortex_github_command_not_allowed',
      details: {
        allowedWorkflows: getKortexGithubAllowedWorkflows()
      }
    })
  }
}

const assertDispatchConfirmation = (body: KortexGithubCommandRequest): void => {
  const definition = getKortexGithubCommandDefinition(body.commandName)

  if (body.confirmation?.confirmed !== true || body.confirmation.phrase !== definition.confirmationPhrase) {
    throw new ApiPlatformError('Kortex GitHub workflow dispatch requires explicit confirmation.', {
      statusCode: 409,
      errorCode: 'kortex_github_confirmation_required'
    })
  }
}

const assertDispatchFlag = (): void => {
  if (!isKortexGithubWorkflowDispatchEnabled()) {
    throw new ApiPlatformError('Kortex GitHub workflow dispatch is disabled in this environment.', {
      statusCode: 409,
      errorCode: 'kortex_github_command_disabled'
    })
  }
}

const buildSummary = ({
  body,
  operationKind,
  tier,
  workflowId,
  workflowName,
  ref,
  runId,
  statusCode,
  observedKeys
}: {
  body: KortexGithubCommandRequest
  operationKind: string
  tier: KortexGithubCommandSummary['tier']
  workflowId: string | number | null
  workflowName: string | null
  ref: string | null
  runId: number | null
  statusCode: number
  observedKeys: string[]
}): KortexGithubCommandSummary => ({
  commandName: body.commandName,
  operationKind,
  tier,
  workflowId,
  workflowName,
  ref,
  runId,
  statusCode,
  observedKeys
})

const executeGithubCommand = async (body: KortexGithubCommandRequest) => {
  const definition = getKortexGithubCommandDefinition(body.commandName)

  if (body.commandName === 'kortex.github.workflow.rerun_failed') {
    const runId = requireNumber(body.payload.runId, 'payload.runId')

    const run = await fetchKortexGithubWorkflowRun(runId).catch(error => {
      throw new ApiPlatformError('Kortex GitHub workflow run preflight failed.', {
        statusCode: 409,
        errorCode: 'kortex_github_preflight_failed',
        details: { error: redactErrorForResponse(error) }
      })
    })

    if (!run.workflow_id) {
      throw new ApiPlatformError('Kortex GitHub workflow run does not expose workflow_id.', {
        statusCode: 409,
        errorCode: 'kortex_github_preflight_failed'
      })
    }

    const workflowName = run.workflow_name ?? run.name ?? null

    assertWorkflowAllowed(workflowName ?? run.workflow_id)

    if (!run.conclusion || !FAILED_RUN_CONCLUSIONS.has(run.conclusion)) {
      throw new ApiPlatformError('Kortex GitHub workflow run is not eligible for failed-job rerun.', {
        statusCode: 409,
        errorCode: 'kortex_github_command_not_allowed',
        details: { conclusion: run.conclusion ?? null }
      })
    }

    const response = await postKortexGithubAction({
      endpoint: `/repos/efeoncepro/kortex/actions/runs/${runId}/rerun-failed-jobs`
    }).catch(error => {
      throw new ApiPlatformError('Kortex GitHub rerun command failed upstream.', {
        statusCode: 502,
        errorCode: 'kortex_github_upstream_failed',
        details: { error: redactErrorForResponse(error) }
      })
    })

    return {
      response,
      summary: buildSummary({
        body,
        operationKind: definition.operationKind,
        tier: definition.tier,
        workflowId: run.workflow_id,
        workflowName,
        ref: run.head_branch ?? null,
        runId,
        statusCode: response.statusCode,
        observedKeys: response.observedKeys
      })
    }
  }

  assertDispatchFlag()
  assertDispatchConfirmation(body)

  const workflowId = requireString(body.payload.workflowId, 'payload.workflowId')
  const ref = requireString(body.payload.ref, 'payload.ref')

  if (!isKortexGithubRefAllowed(ref)) {
    throw new ApiPlatformError('Kortex GitHub workflow ref is not allowlisted.', {
      statusCode: 409,
      errorCode: 'kortex_github_command_not_allowed'
    })
  }

  const workflow = await fetchKortexGithubWorkflow(workflowId).catch(error => {
    throw new ApiPlatformError('Kortex GitHub workflow preflight failed.', {
      statusCode: 409,
      errorCode: 'kortex_github_preflight_failed',
      details: { error: redactErrorForResponse(error) }
    })
  })

  assertWorkflowAllowed(workflow.name)

  const inputs = isRecord(body.payload.inputs) ? body.payload.inputs : {}

  const response = await postKortexGithubAction({
    endpoint: `/repos/efeoncepro/kortex/actions/workflows/${encodeURIComponent(workflowId)}/dispatches`,
    body: { ref, inputs }
  }).catch(error => {
    throw new ApiPlatformError('Kortex GitHub dispatch command failed upstream.', {
      statusCode: 502,
      errorCode: 'kortex_github_upstream_failed',
      details: { error: redactErrorForResponse(error) }
    })
  })

  return {
    response,
    summary: buildSummary({
      body,
      operationKind: definition.operationKind,
      tier: definition.tier,
      workflowId: workflow.id,
      workflowName: workflow.name,
      ref,
      runId: asNumber((response.body as Record<string, unknown> | null)?.id),
      statusCode: response.statusCode,
      observedKeys: response.observedKeys
    })
  }
}

export const runKortexGithubCommand = async ({
  request,
  tenant,
  body
}: KortexGithubCommandExecutionInput): Promise<{
  data: KortexGithubCommandResponse
  status?: number
  headers?: Record<string, string>
}> => {
  assertGlobalCommandFlag()

  const idempotencyKey = parseIdempotencyKey(request)

  if (!idempotencyKey) {
    throw new ApiPlatformError('Idempotency-Key is required for Kortex GitHub commands.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const command = await executeApiPlatformCommand<KortexGithubCommandResponse>({
    principal: {
      lane: 'internal',
      principalKind: 'internal_actor',
      principalId: tenant.userId,
      userId: tenant.userId
    },
    scope: {
      greenhouseScopeType: 'global',
      organizationId: tenant.organizationId ?? null,
      clientId: tenant.clientId ?? null,
      spaceId: tenant.spaceId ?? null
    },
    routeKey: `kortex.github.command.${body.commandName}`,
    request,
    body,
    run: async execution => {
      const commandExecutionId = execution?.commandExecutionId

      if (!commandExecutionId) {
        throw new ApiPlatformError('Command execution id was not provided by the audit foundation.', {
          statusCode: 500,
          errorCode: 'internal_error'
        })
      }

      const { summary } = await executeGithubCommand(body)

      return {
        data: {
          contractVersion: KORTEX_GITHUB_COMMAND_CONTRACT_VERSION,
          commandExecutionId,
          commandName: body.commandName,
          status: summary.statusCode === 202 || summary.statusCode === 201 ? 'accepted' : 'completed',
          githubOperationId: summary.runId ? String(summary.runId) : null,
          summary,
          redacted: true,
          warnings: [],
          sources: [
            {
              source: 'github_actions_api',
              status: 'ok',
              checkedAt: new Date().toISOString(),
              note: `GitHub response redacted; observed keys: ${summary.observedKeys.join(', ') || 'none'}`
            }
          ]
        },
        status: 200
      }
    }
  })

  return {
    data: {
      ...command.data,
      status: command.headers?.['idempotency-replayed'] === 'true' ? 'replayed' : command.data.status
    },
    status: command.status,
    headers: command.headers
  }
}

export const formatKortexGithubCommandError = (error: unknown) => {
  if (error instanceof ApiPlatformError) {
    return {
      status: error.statusCode,
      body: {
        error: error.message,
        code: error.errorCode,
        details: error.details ?? undefined
      }
    }
  }

  return {
    status: 500,
    body: {
      error: redactErrorForResponse(error),
      code: 'internal_error'
    }
  }
}
