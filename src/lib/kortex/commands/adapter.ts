import 'server-only'

import { executeApiPlatformCommand } from '@/lib/api-platform/core/commands'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { parseIdempotencyKey } from '@/lib/api-platform/core/idempotency'
import { redactErrorForResponse } from '@/lib/observability/redact'

import { fetchKortexCommandJson } from './client'
import { isKortexCommandAdapterEnabled, isKortexCommandAdminEnabled, isKortexCommandLiveExecuteEnabled } from './flags'
import { resolveKortexCommandScope, verifyKortexDryRunPreview } from './preflight'
import {
  ADMIN_BREAKGLASS_CONFIRMATION_PHRASE,
  getKortexCommandDefinition,
  isKortexCommandName
} from './registry'
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

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    if (value.trim().toLowerCase() === 'true') return true
    if (value.trim().toLowerCase() === 'false') return false
  }

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

const requireNumber = (value: unknown, field: string) => {
  const normalized = asNumber(value)

  if (normalized === null) {
    throw new ApiPlatformError(`${field} is required.`, {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return normalized
}

const assertKnownCommandName = (value: unknown): KortexCommandName => {
  const commandName = asString(value)

  if (commandName && isKortexCommandName(commandName)) {
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
  const definition = getKortexCommandDefinition(body.commandName)
  const payload = body.payload ?? {}
  const correlationId = `greenhouse:${commandExecutionId}`
  const common = { initiated_by_user_id: actorUserId, correlation_id: correlationId }

  const portalDefaults = {
    portal_id: scope.resolvedPortalId,
    hubspot_portal_id: asNumber(scope.resolvedHubspotPortalId)
  }

  const withCommon = (value: Record<string, unknown>) => ({
    ...value,
    ...common
  })

  const withPortalDefaults = (value: Record<string, unknown>) => ({
    ...value,
    portal_id: asString(value.portal_id) ?? portalDefaults.portal_id,
    hubspot_portal_id: asNumber(value.hubspot_portal_id) ?? portalDefaults.hubspot_portal_id
  })

  const commandBase = {
    method: definition.method,
    operationKind: definition.operationKind,
    tier: definition.tier,
    deploymentMode: null,
    workspaceId: null,
    conversationId: null,
    releaseCandidateId: null
  } satisfies Omit<KortexUpstreamCommand, 'path' | 'body'>

  if (body.commandName === 'kortex.audit.run') {
    return {
      ...commandBase,
      path: '/api/v1/audits/run',
      body: {
        ...portalDefaults,
        audit_type: asString(payload.auditType) ?? 'greenhouse_command',
        trigger_source: 'greenhouse_command',
        correlation_id: correlationId,
        sector: asString(payload.sector),
        objective_summary: asString(payload.objectiveSummary),
        audit_objectives: Array.isArray(payload.auditObjectives) ? payload.auditObjectives : [],
        team_context: isRecord(payload.teamContext) ? payload.teamContext : {},
        revenue_motion: asString(payload.revenueMotion),
        customer_journey: asString(payload.customerJourney)
      }
    }
  }

  if (body.commandName === 'kortex.portal.hub_profile.put') {
    const hubspotPortalId = requireNumber(payload.hubspotPortalId ?? scope.resolvedHubspotPortalId, 'payload.hubspotPortalId')
    const hubs = payload.hubs

    if (!Array.isArray(hubs) || hubs.length === 0) {
      throw new ApiPlatformError('payload.hubs must be a non-empty array.', {
        statusCode: 400,
        errorCode: 'bad_request'
      })
    }

    return {
      ...commandBase,
      path: `/api/v1/portals/${encodeURIComponent(String(hubspotPortalId))}/hub-profile`,
      body: { hubs }
    }
  }

  if (body.commandName === 'kortex.admin.snapshots.trigger') {
    return {
      ...commandBase,
      path: '/api/v1/admin/snapshots/trigger',
      body: {
        portal_id: asString(payload.portalId) ?? scope.resolvedPortalId,
        hubspot_portal_id: asNumber(payload.hubspotPortalId) ?? asNumber(scope.resolvedHubspotPortalId)
      }
    }
  }

  if (
    body.commandName === 'kortex.admin.auth.verify' ||
    body.commandName === 'kortex.admin.users.seed' ||
    body.commandName === 'kortex.admin.users.bootstrap_e2e_agent'
  ) {
    return {
      ...commandBase,
      path: definition.pathTemplate,
      body: body.commandName === 'kortex.admin.users.bootstrap_e2e_agent' ? {} : payload
    }
  }

  if (body.commandName === 'kortex.strategy.normalize' || body.commandName === 'kortex.strategy.intake') {
    return {
      ...commandBase,
      path: definition.pathTemplate,
      body: withPortalDefaults({
        portal_id: asString(payload.portalId) ?? asString(payload.portal_id),
        hubspot_portal_id: asNumber(payload.hubspotPortalId) ?? asNumber(payload.hubspot_portal_id),
        authoring_mode: asString(payload.authoringMode ?? payload.authoring_mode) ?? 'agent',
        title: requireString(payload.title, 'payload.title'),
        objective_summary: asString(payload.objectiveSummary ?? payload.objective_summary),
        strategy_body: asString(payload.strategyBody ?? payload.strategy_body) ?? '',
        source_refs: Array.isArray(payload.sourceRefs) ? payload.sourceRefs : Array.isArray(payload.source_refs) ? payload.source_refs : [],
        constraints: isRecord(payload.constraints) ? payload.constraints : {},
        authorship: isRecord(payload.authorship) ? payload.authorship : {},
        business_objectives: Array.isArray(payload.businessObjectives)
          ? payload.businessObjectives
          : Array.isArray(payload.business_objectives)
            ? payload.business_objectives
            : [],
        target_object_model: isRecord(payload.targetObjectModel)
          ? payload.targetObjectModel
          : isRecord(payload.target_object_model)
            ? payload.target_object_model
            : {},
        schema_intents: Array.isArray(payload.schemaIntents)
          ? payload.schemaIntents
          : Array.isArray(payload.schema_intents)
            ? payload.schema_intents
            : [],
        workflow_intents: Array.isArray(payload.workflowIntents)
          ? payload.workflowIntents
          : Array.isArray(payload.workflow_intents)
            ? payload.workflow_intents
            : [],
        ui_extension_intents: Array.isArray(payload.uiExtensionIntents)
          ? payload.uiExtensionIntents
          : Array.isArray(payload.ui_extension_intents)
            ? payload.ui_extension_intents
            : [],
        adoption_kpis: Array.isArray(payload.adoptionKpis)
          ? payload.adoptionKpis
          : Array.isArray(payload.adoption_kpis)
            ? payload.adoption_kpis
            : [],
        assumptions: Array.isArray(payload.assumptions) ? payload.assumptions : [],
        open_questions: Array.isArray(payload.openQuestions)
          ? payload.openQuestions
          : Array.isArray(payload.open_questions)
            ? payload.open_questions
            : [],
        created_by_user_id: asString(payload.createdByUserId ?? payload.created_by_user_id) ?? actorUserId
      })
    }
  }

  if (body.commandName === 'kortex.strategy.seed_from_audit') {
    return {
      ...commandBase,
      path: '/api/v1/strategy/seed-from-audit',
      body: withPortalDefaults({
        audit_run_id: asString(payload.auditRunId ?? payload.audit_run_id),
        portal_id: asString(payload.portalId) ?? asString(payload.portal_id),
        hubspot_portal_id: asNumber(payload.hubspotPortalId) ?? asNumber(payload.hubspot_portal_id),
        title: asString(payload.title),
        objective_summary_override: asString(payload.objectiveSummaryOverride ?? payload.objective_summary_override),
        created_by_user_id: asString(payload.createdByUserId ?? payload.created_by_user_id) ?? actorUserId
      })
    }
  }

  if (body.commandName === 'kortex.strategy.workspace.update') {
    const workspaceId = requireString(payload.workspaceId, 'payload.workspaceId')

    return {
      ...commandBase,
      path: `/api/v1/strategy/workspaces/${encodeURIComponent(workspaceId)}`,
      workspaceId,
      body: {
        title: asString(payload.title),
        objective_summary: asString(payload.objectiveSummary ?? payload.objective_summary),
        workspace_status: asString(payload.workspaceStatus ?? payload.workspace_status),
        business_objectives: Array.isArray(payload.businessObjectives)
          ? payload.businessObjectives
          : Array.isArray(payload.business_objectives)
            ? payload.business_objectives
            : undefined,
        target_object_model: isRecord(payload.targetObjectModel)
          ? payload.targetObjectModel
          : isRecord(payload.target_object_model)
            ? payload.target_object_model
            : undefined,
        schema_intents: Array.isArray(payload.schemaIntents)
          ? payload.schemaIntents
          : Array.isArray(payload.schema_intents)
            ? payload.schema_intents
            : undefined,
        workflow_intents: Array.isArray(payload.workflowIntents)
          ? payload.workflowIntents
          : Array.isArray(payload.workflow_intents)
            ? payload.workflow_intents
            : undefined,
        ui_extension_intents: Array.isArray(payload.uiExtensionIntents)
          ? payload.uiExtensionIntents
          : Array.isArray(payload.ui_extension_intents)
            ? payload.ui_extension_intents
            : undefined,
        adoption_kpis: Array.isArray(payload.adoptionKpis)
          ? payload.adoptionKpis
          : Array.isArray(payload.adoption_kpis)
            ? payload.adoption_kpis
            : undefined,
        constraints: isRecord(payload.constraints) ? payload.constraints : undefined,
        assumptions: Array.isArray(payload.assumptions) ? payload.assumptions : undefined,
        open_questions: Array.isArray(payload.openQuestions)
          ? payload.openQuestions
          : Array.isArray(payload.open_questions)
            ? payload.open_questions
            : undefined,
        updated_by_user_id: asString(payload.updatedByUserId ?? payload.updated_by_user_id) ?? actorUserId
      }
    }
  }

  if (body.commandName === 'kortex.strategy.workspace.compilation_run.create') {
    const workspaceId = requireString(payload.workspaceId, 'payload.workspaceId')

    return {
      ...commandBase,
      path: `/api/v1/strategy/workspaces/${encodeURIComponent(workspaceId)}/compilation-runs`,
      workspaceId,
      body: withCommon({
        trigger_source: asString(payload.triggerSource ?? payload.trigger_source) ?? 'greenhouse_command',
        status: asString(payload.status) ?? 'queued',
        compiler_version: asString(payload.compilerVersion ?? payload.compiler_version),
        warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
        risk_flags: Array.isArray(payload.riskFlags)
          ? payload.riskFlags
          : Array.isArray(payload.risk_flags)
            ? payload.risk_flags
            : [],
        unresolved_questions: Array.isArray(payload.unresolvedQuestions)
          ? payload.unresolvedQuestions
          : Array.isArray(payload.unresolved_questions)
            ? payload.unresolved_questions
            : [],
        manifest_candidate: isRecord(payload.manifestCandidate)
          ? payload.manifestCandidate
          : isRecord(payload.manifest_candidate)
            ? payload.manifest_candidate
            : {},
        workflow_candidates: Array.isArray(payload.workflowCandidates)
          ? payload.workflowCandidates
          : Array.isArray(payload.workflow_candidates)
            ? payload.workflow_candidates
            : [],
        ui_extension_candidates: Array.isArray(payload.uiExtensionCandidates)
          ? payload.uiExtensionCandidates
          : Array.isArray(payload.ui_extension_candidates)
            ? payload.ui_extension_candidates
            : [],
        review_bundle: isRecord(payload.reviewBundle)
          ? payload.reviewBundle
          : isRecord(payload.review_bundle)
            ? payload.review_bundle
            : {}
      })
    }
  }

  if (body.commandName === 'kortex.strategy.compile') {
    const workspaceId = requireString(payload.workspaceId, 'payload.workspaceId')

    return {
      ...commandBase,
      path: `/api/v1/strategy/workspaces/${encodeURIComponent(workspaceId)}/compile`,
      workspaceId,
      body: {
        trigger_source: asString(payload.triggerSource ?? payload.trigger_source) ?? 'greenhouse_command',
        compiler_version: asString(payload.compilerVersion ?? payload.compiler_version),
        ...common
      }
    }
  }

  if (body.commandName === 'kortex.strategy.workspace.approval_decision.create') {
    const workspaceId = requireString(payload.workspaceId, 'payload.workspaceId')

    return {
      ...commandBase,
      path: `/api/v1/strategy/workspaces/${encodeURIComponent(workspaceId)}/approval-decisions`,
      workspaceId,
      body: {
        strategy_compilation_run_id: requireString(
          payload.strategyCompilationRunId ?? payload.strategy_compilation_run_id,
          'payload.strategyCompilationRunId'
        ),
        decision_status: requireString(payload.decisionStatus ?? payload.decision_status, 'payload.decisionStatus'),
        reviewer_user_id: asString(payload.reviewerUserId ?? payload.reviewer_user_id) ?? actorUserId,
        reviewer_identity: isRecord(payload.reviewerIdentity)
          ? payload.reviewerIdentity
          : isRecord(payload.reviewer_identity)
            ? payload.reviewer_identity
            : {},
        decision_summary: asString(payload.decisionSummary ?? payload.decision_summary),
        decision_notes: asString(payload.decisionNotes ?? payload.decision_notes),
        decision_payload: isRecord(payload.decisionPayload)
          ? payload.decisionPayload
          : isRecord(payload.decision_payload)
            ? payload.decision_payload
            : {},
        release_scope: asString(payload.releaseScope ?? payload.release_scope) ?? 'schema',
        release_label: asString(payload.releaseLabel ?? payload.release_label),
        release_notes: asString(payload.releaseNotes ?? payload.release_notes)
      }
    }
  }

  if (
    body.commandName === 'kortex.strategy.release_candidate.dry_run' ||
    body.commandName === 'kortex.strategy.release_candidate.execute' ||
    body.commandName === 'kortex.strategy.release_candidate.execute_workflows' ||
    body.commandName === 'kortex.strategy.release_candidate.execute_custom_objects'
  ) {
    const releaseCandidateId = requireString(payload.releaseCandidateId, 'payload.releaseCandidateId')
    const isDryRun = body.commandName === 'kortex.strategy.release_candidate.dry_run'
    const isSchemaExecute = body.commandName === 'kortex.strategy.release_candidate.execute'

    const suffix =
      body.commandName === 'kortex.strategy.release_candidate.execute_workflows'
        ? 'execute-workflows'
        : body.commandName === 'kortex.strategy.release_candidate.execute_custom_objects'
          ? 'execute-custom-objects'
          : 'execute'

    return {
      ...commandBase,
      path: `/api/v1/strategy/release-candidates/${encodeURIComponent(releaseCandidateId)}/${suffix}`,
      deploymentMode: isDryRun ? 'dry_run' : 'execute',
      releaseCandidateId,
      body: {
        deployment_mode: isDryRun ? 'dry_run' : asString(payload.deploymentMode ?? payload.deployment_mode) ?? 'execute',
        ...common,
        ...(isSchemaExecute ? {} : { confirm_partial_execution: asBoolean(payload.confirmPartialExecution) ?? undefined })
      }
    }
  }

  if (body.commandName === 'kortex.strategy.conversation.create') {
    return {
      ...commandBase,
      path: '/api/v1/strategy/conversations',
      body: withPortalDefaults({
        portal_id: asString(payload.portalId ?? payload.portal_id),
        hubspot_portal_id: asNumber(payload.hubspotPortalId ?? payload.hubspot_portal_id),
        workspace_id: asString(payload.workspaceId ?? payload.workspace_id),
        title: asString(payload.title),
        default_model_engine: asString(payload.defaultModelEngine ?? payload.default_model_engine) ?? 'claude',
        created_by_user_id: asString(payload.createdByUserId ?? payload.created_by_user_id) ?? actorUserId
      })
    }
  }

  if (body.commandName === 'kortex.strategy.chat.send') {
    const conversationId = requireString(payload.conversationId, 'payload.conversationId')

    return {
      ...commandBase,
      path: '/api/v1/strategy/chat',
      conversationId,
      body: withPortalDefaults({
        conversation_id: conversationId,
        message: requireString(payload.message, 'payload.message'),
        model_engine: asString(payload.modelEngine ?? payload.model_engine) ?? 'claude',
        portal_id: asString(payload.portalId ?? payload.portal_id),
        hubspot_portal_id: asNumber(payload.hubspotPortalId ?? payload.hubspot_portal_id)
      })
    }
  }

  if (body.commandName === 'kortex.strategy.operation.execute_internal') {
    const operationId = requireString(payload.operationId, 'payload.operationId')

    return {
      ...commandBase,
      path: `/api/v1/strategy/internal/operations/execute/${encodeURIComponent(operationId)}`,
      body: {}
    }
  }

  if (body.commandName === 'kortex.strategy.conversation.extract') {
    const conversationId = requireString(payload.conversationId, 'payload.conversationId')

    return {
      ...commandBase,
      path: `/api/v1/strategy/conversations/${encodeURIComponent(conversationId)}/extract`,
      conversationId,
      body: {
        model_engine: asString(payload.modelEngine ?? payload.model_engine) ?? 'claude',
        target_workspace_id: asString(payload.targetWorkspaceId ?? payload.target_workspace_id),
        extraction_mode: asString(payload.extractionMode ?? payload.extraction_mode) ?? 'create_new'
      }
    }
  }

  throw new ApiPlatformError('Unsupported Kortex command.', {
    statusCode: 400,
    errorCode: 'bad_request'
  })
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
  tier,
  result,
  scope,
  workspaceId,
  conversationId,
  releaseCandidateId,
  deploymentMode
}: {
  commandName: KortexCommandName
  operationKind: string
  tier: KortexCommandSummary['tier']
  result: unknown
  scope: KortexCommandScope
  workspaceId: string | null
  conversationId: string | null
  releaseCandidateId: string | null
  deploymentMode: KortexCommandSummary['deploymentMode']
}): KortexCommandSummary => {
  const root = isRecord(result) ? result : {}
  const auditRun = pickNestedRecord(root, 'audit_run', 'auditRun')
  const compilationRun = pickNestedRecord(root, 'compilation_run', 'compilationRun')
  const deploymentRun = pickNestedRecord(root, 'deployment_run', 'deploymentRun')
  const releaseCandidate = pickNestedRecord(root, 'release_candidate', 'releaseCandidate')
  const conversation = pickNestedRecord(root, 'conversation')

  const operationId =
    asString(auditRun.audit_run_id) ??
    asString(root.audit_run_id) ??
    asString(compilationRun.strategy_compilation_run_id) ??
    asString(compilationRun.compilation_run_id) ??
    asString(root.strategy_compilation_run_id) ??
    asString(deploymentRun.deployment_run_id) ??
    asString(root.deployment_run_id) ??
    asString(conversation.conversation_id) ??
    asString(root.conversation_id) ??
    asString(root.operation_id)

  return {
    commandName,
    operationId,
    operationKind,
    tier,
    portalId: scope.resolvedPortalId,
    hubspotPortalId: scope.resolvedHubspotPortalId,
    workspaceId: workspaceId ?? asString(root.workspace_id),
    conversationId: conversationId ?? asString(conversation.conversation_id) ?? asString(root.conversation_id),
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

const assertTierAllowed = async (body: KortexCommandRequest) => {
  const definition = getKortexCommandDefinition(body.commandName)

  if (definition.tier === 'admin_breakglass') {
    if (!isKortexCommandAdminEnabled()) {
      throw new ApiPlatformError('Kortex admin commands are disabled in this environment.', {
        statusCode: 409,
        errorCode: 'kortex_admin_command_disabled'
      })
    }

    if (
      body.confirmation?.confirmed !== true ||
      body.confirmation.phrase !== (definition.confirmationPhrase ?? ADMIN_BREAKGLASS_CONFIRMATION_PHRASE)
    ) {
      throw new ApiPlatformError('Kortex admin commands require explicit breakglass confirmation.', {
        statusCode: 409,
        errorCode: 'kortex_admin_confirmation_required'
      })
    }
  }

  if (definition.tier !== 'external_write') return

  if (!isKortexCommandLiveExecuteEnabled()) {
    throw new ApiPlatformError('Kortex live execute is disabled in this environment.', {
      statusCode: 409,
      errorCode: 'kortex_live_execute_disabled'
    })
  }

  if (body.confirmation?.confirmed !== true || body.confirmation.phrase !== definition.confirmationPhrase) {
    throw new ApiPlatformError('Kortex live execute requires explicit human confirmation.', {
      statusCode: 409,
      errorCode: 'kortex_confirmation_required'
    })
  }

  if (!definition.requiresDryRunPreview) return

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

  await assertTierAllowed(body)

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
        method: upstream.method,
        body: upstream.body,
        commandName: body.commandName,
        idempotencyKey,
        actorUserId: tenant.userId
      })

      const summary = summarizeKortexResponse({
        commandName: body.commandName,
        operationKind: upstream.operationKind,
        tier: upstream.tier,
        result,
        scope: preflight.scope,
        workspaceId: upstream.workspaceId,
        conversationId: upstream.conversationId,
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
