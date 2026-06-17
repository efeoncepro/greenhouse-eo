import 'server-only'

import { executeApiPlatformCommand } from '@/lib/api-platform/core/commands'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { parseIdempotencyKey } from '@/lib/api-platform/core/idempotency'
import { redactErrorForResponse } from '@/lib/observability/redact'

import { fetchKortexCommandJson } from './client'
import { isKortexCommandAdapterEnabled, isKortexCommandLiveExecuteEnabled } from './flags'
import { resolveKortexCommandScope, verifyKortexDryRunPreview } from './preflight'
import {
  KORTEX_COMMAND_CONTRACT_VERSION,
  type KortexCommandExecutionInput,
  type KortexCommandName,
  type KortexCommandRequest,
  type KortexCommandResponse,
  type KortexCommandScope,
  type KortexCommandSummary,
  type KortexUpstreamCommand
} from './types'

const LIVE_EXECUTE_CONFIRMATION_PHRASE = 'EXECUTE KORTEX RELEASE'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const asString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)

  return null
}

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)

  return null
}

const requireString = (value: unknown, field: string) => {
  const normalized = asString(value)

  if (!normalized) {
    throw new ApiPlatformError(`${field} is required.`, {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return normalized
}

const assertKnownCommandName = (value: unknown): KortexCommandName => {
  const commandName = asString(value)

  if (
    commandName === 'kortex.audit.run' ||
    commandName === 'kortex.strategy.compile' ||
    commandName === 'kortex.strategy.release_candidate.dry_run' ||
    commandName === 'kortex.strategy.release_candidate.execute'
  ) {
    return commandName
  }

  throw new ApiPlatformError('Unsupported Kortex command.', {
    statusCode: 400,
    errorCode: 'bad_request'
  })
}

export const parseKortexCommandRequest = (raw: unknown): KortexCommandRequest => {
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
    portalId: asString(raw.portalId),
    hubspotPortalId: asString(raw.hubspotPortalId),
    bindingId: asString(raw.bindingId),
    reason,
    payload: isRecord(raw.payload) ? raw.payload : {},
    confirmation: isRecord(raw.confirmation)
      ? {
          confirmed: raw.confirmation.confirmed === true,
          phrase: asString(raw.confirmation.phrase),
          previewCommandExecutionId: asString(raw.confirmation.previewCommandExecutionId)
        }
      : null
  }
}

const buildKortexUpstreamCommand = ({
  body,
  scope,
  commandExecutionId,
  actorUserId
}: {
  body: KortexCommandRequest
  scope: KortexCommandScope
  commandExecutionId: string
  actorUserId: string
}): KortexUpstreamCommand => {
  const payload = body.payload ?? {}
  const correlationId = `greenhouse:${commandExecutionId}`
  const common = { initiated_by_user_id: actorUserId, correlation_id: correlationId }

  if (body.commandName === 'kortex.audit.run') {
    return {
      path: '/api/v1/audits/run',
      operationKind: 'audit_run',
      deploymentMode: null,
      workspaceId: null,
      releaseCandidateId: null,
      body: {
        portal_id: scope.resolvedPortalId,
        hubspot_portal_id: asNumber(scope.resolvedHubspotPortalId),
        audit_type: asString(payload.auditType) ?? 'greenhouse_command',
        trigger_source: 'greenhouse_command',
        correlation_id: correlationId
      }
    }
  }

  if (body.commandName === 'kortex.strategy.compile') {
    const workspaceId = requireString(payload.workspaceId, 'payload.workspaceId')

    return {
      path: `/api/v1/strategy/workspaces/${encodeURIComponent(workspaceId)}/compile`,
      operationKind: 'strategy_compile',
      deploymentMode: null,
      workspaceId,
      releaseCandidateId: null,
      body: {
        trigger_source: 'greenhouse_command',
        compiler_version: asString(payload.compilerVersion),
        ...common
      }
    }
  }

  const releaseCandidateId = requireString(payload.releaseCandidateId, 'payload.releaseCandidateId')
  const isExecute = body.commandName === 'kortex.strategy.release_candidate.execute'

  return {
    path: `/api/v1/strategy/release-candidates/${encodeURIComponent(releaseCandidateId)}/execute`,
    operationKind: isExecute ? 'release_candidate_execute' : 'release_candidate_dry_run',
    deploymentMode: isExecute ? 'execute' : 'dry_run',
    workspaceId: null,
    releaseCandidateId,
    body: {
      deployment_mode: isExecute ? 'execute' : 'dry_run',
      ...common
    }
  }
}

const pickNestedRecord = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = source[key]

    if (isRecord(value)) return value
  }

  return {}
}

const summarizeKortexResponse = ({
  commandName,
  operationKind,
  result,
  scope,
  workspaceId,
  releaseCandidateId,
  deploymentMode
}: {
  commandName: KortexCommandName
  operationKind: string
  result: unknown
  scope: KortexCommandScope
  workspaceId: string | null
  releaseCandidateId: string | null
  deploymentMode: KortexCommandSummary['deploymentMode']
}): KortexCommandSummary => {
  const root = isRecord(result) ? result : {}
  const auditRun = pickNestedRecord(root, 'audit_run', 'auditRun')
  const compilationRun = pickNestedRecord(root, 'compilation_run', 'compilationRun')
  const deploymentRun = pickNestedRecord(root, 'deployment_run', 'deploymentRun')
  const releaseCandidate = pickNestedRecord(root, 'release_candidate', 'releaseCandidate')

  const operationId =
    asString(auditRun.audit_run_id) ??
    asString(root.audit_run_id) ??
    asString(compilationRun.strategy_compilation_run_id) ??
    asString(compilationRun.compilation_run_id) ??
    asString(root.strategy_compilation_run_id) ??
    asString(deploymentRun.deployment_run_id) ??
    asString(root.deployment_run_id) ??
    asString(root.operation_id)

  return {
    commandName,
    operationId,
    operationKind,
    portalId: scope.resolvedPortalId,
    hubspotPortalId: scope.resolvedHubspotPortalId,
    workspaceId: workspaceId ?? asString(root.workspace_id),
    releaseCandidateId:
      releaseCandidateId ??
      asString(releaseCandidate.strategy_release_candidate_id),
    deploymentMode,
    status: asString(root.status) ?? asString(auditRun.status) ?? asString(deploymentRun.status),
    observedKeys: Object.keys(root).sort().slice(0, 20)
  }
}

const commandStatusFromSummary = (summary: KortexCommandSummary): KortexCommandResponse['status'] => {
  if (summary.status === 'failed' || summary.status === 'error') return 'failed'
  if (summary.status === 'queued' || summary.status === 'running') return 'accepted'

  return 'completed'
}

const assertLiveExecuteAllowed = async (body: KortexCommandRequest) => {
  if (body.commandName !== 'kortex.strategy.release_candidate.execute') return

  if (!isKortexCommandLiveExecuteEnabled()) {
    throw new ApiPlatformError('Kortex live execute is disabled in this environment.', {
      statusCode: 409,
      errorCode: 'kortex_live_execute_disabled'
    })
  }

  if (body.confirmation?.confirmed !== true || body.confirmation.phrase !== LIVE_EXECUTE_CONFIRMATION_PHRASE) {
    throw new ApiPlatformError('Kortex live execute requires explicit human confirmation.', {
      statusCode: 409,
      errorCode: 'kortex_confirmation_required'
    })
  }

  const releaseCandidateId = requireString(body.payload?.releaseCandidateId, 'payload.releaseCandidateId')

  await verifyKortexDryRunPreview({
    previewCommandExecutionId: body.confirmation.previewCommandExecutionId,
    releaseCandidateId
  })
}

export const runKortexAdminCommand = async ({
  request,
  body,
  tenant
}: KortexCommandExecutionInput): Promise<{ data: KortexCommandResponse; status?: number; headers?: Record<string, string> }> => {
  if (!isKortexCommandAdapterEnabled()) {
    throw new ApiPlatformError('Kortex command adapter is disabled.', {
      statusCode: 409,
      errorCode: 'kortex_command_adapter_disabled'
    })
  }

  const idempotencyKey = parseIdempotencyKey(request)

  if (!idempotencyKey) {
    throw new ApiPlatformError('Idempotency-Key is required for Kortex commands.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  await assertLiveExecuteAllowed(body)

  const preflight = await resolveKortexCommandScope({ body, tenant })

  const command = await executeApiPlatformCommand<KortexCommandResponse>({
    principal: {
      lane: 'internal',
      principalKind: 'internal_actor',
      principalId: tenant.userId,
      userId: tenant.userId
    },
    scope: {
      greenhouseScopeType: preflight.scope.greenhouseScopeType,
      organizationId: preflight.scope.organizationId,
      clientId: preflight.scope.clientId,
      spaceId: preflight.scope.spaceId
    },
    routeKey: `kortex.command.${body.commandName}`,
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

      const upstream = buildKortexUpstreamCommand({
        body,
        scope: preflight.scope,
        commandExecutionId,
        actorUserId: tenant.userId
      })

      const result = await fetchKortexCommandJson<unknown>({
        path: upstream.path,
        body: upstream.body,
        commandName: body.commandName,
        idempotencyKey,
        actorUserId: tenant.userId
      })

      const summary = summarizeKortexResponse({
        commandName: body.commandName,
        operationKind: upstream.operationKind,
        result,
        scope: preflight.scope,
        workspaceId: upstream.workspaceId,
        releaseCandidateId: upstream.releaseCandidateId,
        deploymentMode: upstream.deploymentMode
      })

      return {
        data: {
          contractVersion: KORTEX_COMMAND_CONTRACT_VERSION,
          commandExecutionId,
          commandName: body.commandName,
          status: commandStatusFromSummary(summary),
          kortexOperationId: summary.operationId,
          scope: preflight.scope,
          summary,
          warnings: preflight.warnings,
          sources: [
            preflight.source,
            {
              source: 'kortex_command_api',
              status: 'ok',
              checkedAt: new Date().toISOString(),
              note: `Upstream response redacted; observed keys: ${summary.observedKeys.join(', ') || 'none'}`
            }
          ],
          redacted: true
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

export const formatKortexCommandError = (error: unknown) => {
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
