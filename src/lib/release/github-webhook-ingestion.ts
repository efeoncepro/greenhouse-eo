import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'
import {
  ensureWebhookSchema,
  getEndpointByKey,
  insertInboxEvent,
  updateInboxEventStatus
} from '@/lib/webhooks/store'

import {
  resolveGithubReleaseWebhookSecret,
  verifyGithubWebhookSignature
} from './github-webhook-signature'
import {
  reconcileGithubReleaseWebhookEvent,
  type GithubReleaseWebhookReconcileResult,
  type NormalizedGithubReleaseWebhookEvent
} from './github-webhook-reconciler'

export const GITHUB_RELEASE_ENDPOINT_KEY = 'github-release-events'
export const GITHUB_RELEASE_PROVIDER_CODE = 'github'
export const GITHUB_RELEASE_WEBHOOK_MAX_BYTES = 2_000_000

export const GITHUB_RELEASE_WEBHOOK_EVENTS = [
  'ping',
  'workflow_run',
  'workflow_job',
  'deployment_status',
  'check_suite',
  'check_run'
] as const

type GithubReleaseWebhookEventName = (typeof GITHUB_RELEASE_WEBHOOK_EVENTS)[number]
type GithubReleaseReconcilerEventName = Exclude<GithubReleaseWebhookEventName, 'ping'>

export interface GithubReleaseWebhookResponse {
  status: number
  body: Record<string, unknown>
}

export const handleGithubReleaseWebhookRequest = async (
  request: Request
): Promise<GithubReleaseWebhookResponse> => {
  const rawBody = await request.text()

  if (Buffer.byteLength(rawBody, 'utf8') > GITHUB_RELEASE_WEBHOOK_MAX_BYTES) {
    return response(400, 'payload_too_large', { maxBytes: GITHUB_RELEASE_WEBHOOK_MAX_BYTES })
  }

  const signatureHeader = request.headers.get('x-hub-signature-256')
  const secret = await resolveGithubReleaseWebhookSecret()

  if (!secret) {
    return response(500, 'webhook_secret_not_configured')
  }

  const signature = verifyGithubWebhookSignature({
    secret,
    rawBody,
    signatureHeader
  })

  if (!signature.ok) {
    return response(401, 'invalid_signature', { reason: signature.reason })
  }

  const deliveryId = request.headers.get('x-github-delivery')?.trim() || null
  const eventName = request.headers.get('x-github-event')?.trim() || null

  if (!deliveryId) {
    return response(400, 'missing_delivery_id')
  }

  if (!isAllowedGithubReleaseEvent(eventName)) {
    return response(400, 'event_not_allowlisted', { eventName })
  }

  let payload: Record<string, unknown>

  try {
    const parsed = JSON.parse(rawBody)

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return response(400, 'invalid_payload_shape')
    }

    payload = parsed as Record<string, unknown>
  } catch {
    return response(400, 'invalid_json')
  }

  if (eventName === 'ping') {
    return response(202, 'ping_accepted', {
      deliveryId,
      repositoryFullName: stringValue(asRecord(payload.repository)?.full_name)
    })
  }

  await ensureWebhookSchema()
  const endpoint = await getEndpointByKey(GITHUB_RELEASE_ENDPOINT_KEY)

  if (!endpoint) {
    return response(500, 'webhook_endpoint_not_configured')
  }

  const normalized = normalizeGithubReleaseWebhook({
    deliveryId,
    eventName,
    payload
  })

  const inbox = await insertInboxEvent({
    endpointId: endpoint.webhook_endpoint_id,
    providerCode: GITHUB_RELEASE_PROVIDER_CODE,
    sourceEventId: deliveryId,
    idempotencyKey: buildGithubDeliveryIdempotencyKey(deliveryId),
    headersJson: redactGithubWebhookHeaders(request.headers),
    payloadJson: normalized.redactedPayload,
    rawBodyText: null,
    signatureVerified: true
  })

  if (inbox.isDuplicate) {
    return response(202, 'duplicate_delivery', {
      deliveryId,
      inboxEventId: inbox.id,
      duplicate: true
    })
  }

  const event = {
    ...normalized,
    inboxEventId: inbox.id
  }

  await insertGithubReleaseWebhookEvent(event)
  await updateInboxEventStatus(inbox.id, 'processing')

  try {
    const result = await reconcileGithubReleaseWebhookEvent(event)

    await updateGithubReleaseWebhookEvent(event.id, result)
    await updateInboxEventStatus(inbox.id, 'processed')

    return response(202, 'accepted', {
      deliveryId,
      inboxEventId: inbox.id,
      githubReleaseWebhookEventId: event.id,
      processingStatus: result.processingStatus,
      releaseId: result.releaseId,
      transitionApplied: result.transitionApplied
    })
  } catch (error) {
    const message = redactErrorMessage(error)

    await updateGithubReleaseWebhookEvent(event.id, {
      processingStatus: 'failed',
      releaseId: null,
      matchedBy: null,
      transitionApplied: false,
      transitionFromState: null,
      transitionToState: null,
      errorCode: 'processing_failed',
      errorMessage: message,
      evidence: {
        ...event.evidence,
        processingFailed: true
      }
    })
    await updateInboxEventStatus(inbox.id, 'failed', message)

    return response(500, 'processing_failed')
  }
}

export const buildGithubDeliveryIdempotencyKey = (deliveryId: string): string => {
  return `github:${deliveryId}`
}

export const normalizeGithubReleaseWebhook = (params: {
  deliveryId: string
  eventName: GithubReleaseReconcilerEventName
  payload: Record<string, unknown>
}): Omit<NormalizedGithubReleaseWebhookEvent, 'inboxEventId'> => {
  const payload = params.payload
  const repository = asRecord(payload.repository)
  const workflowRun = asRecord(payload.workflow_run)
  const workflowJob = asRecord(payload.workflow_job)
  const deployment = asRecord(payload.deployment)
  const deploymentStatus = asRecord(payload.deployment_status)
  const checkSuite = asRecord(payload.check_suite)
  const checkRun = asRecord(payload.check_run)

  const targetSha = normalizeSha(
    stringValue(workflowRun?.head_sha) ??
    stringValue(workflowJob?.head_sha) ??
    stringValue(deployment?.sha) ??
    stringValue(checkSuite?.head_sha) ??
    stringValue(checkRun?.head_sha) ??
    stringValue(payload.after) ??
    null
  )

  const workflowName =
    stringValue(workflowRun?.name) ??
    stringValue(workflowJob?.workflow_name) ??
    stringValue(checkRun?.name) ??
    null

  const workflowRunEvent = stringValue(workflowRun?.event)

  const githubStatus =
    stringValue(workflowRun?.status) ??
    stringValue(workflowJob?.status) ??
    stringValue(deploymentStatus?.state) ??
    stringValue(checkSuite?.status) ??
    stringValue(checkRun?.status) ??
    null

  const githubConclusion =
    stringValue(workflowRun?.conclusion) ??
    stringValue(workflowJob?.conclusion) ??
    stringValue(checkSuite?.conclusion) ??
    stringValue(checkRun?.conclusion) ??
    null

  const normalized = {
    id: `gh-rel-wh-${randomUUID()}`,
    deliveryId: params.deliveryId,
    eventName: params.eventName,
    action: stringValue(payload.action),
    repositoryFullName: stringValue(repository?.full_name),
    workflowName,
    workflowRunEvent,
    workflowRunId:
      numberValue(workflowRun?.id) ??
      numberValue(workflowJob?.run_id) ??
      numberValue(checkRun?.run_id) ??
      null,
    workflowJobId: numberValue(workflowJob?.id),
    checkSuiteId:
      numberValue(checkSuite?.id) ??
      numberValue(asRecord(checkRun?.check_suite)?.id) ??
      null,
    checkRunId: numberValue(checkRun?.id),
    deploymentId: numberValue(deployment?.id),
    targetSha,
    githubStatus,
    githubConclusion,
    redactedPayload: redactGithubWebhookPayload(payload),
    evidence: {
      deliveryId: params.deliveryId,
      eventName: params.eventName,
      action: stringValue(payload.action),
      repositoryFullName: stringValue(repository?.full_name),
      workflowName,
      workflowRunEvent,
      targetSha,
      githubStatus,
      githubConclusion
    }
  }

  return normalized
}

export const redactGithubWebhookHeaders = (headers: Headers): Record<string, unknown> => {
  const allowed = [
    'content-type',
    'user-agent',
    'x-github-delivery',
    'x-github-event',
    'x-github-hook-id',
    'x-github-hook-installation-target-id'
  ]

  return Object.fromEntries(
    allowed
      .map(key => [key, headers.get(key)] as const)
      .filter(([, value]) => Boolean(value))
  )
}

export const redactGithubWebhookPayload = (
  payload: Record<string, unknown>
): Record<string, unknown> => {
  const repository = asRecord(payload.repository)
  const sender = asRecord(payload.sender)
  const workflowRun = asRecord(payload.workflow_run)
  const workflowJob = asRecord(payload.workflow_job)
  const deployment = asRecord(payload.deployment)
  const deploymentStatus = asRecord(payload.deployment_status)
  const checkSuite = asRecord(payload.check_suite)
  const checkRun = asRecord(payload.check_run)

  return removeNullish({
    action: stringValue(payload.action),
    repository: removeNullish({
      id: numberValue(repository?.id),
      full_name: stringValue(repository?.full_name),
      default_branch: stringValue(repository?.default_branch)
    }),
    sender: removeNullish({
      id: numberValue(sender?.id),
      login: stringValue(sender?.login),
      type: stringValue(sender?.type)
    }),
    workflow_run: workflowRun ? removeNullish({
      id: numberValue(workflowRun.id),
      name: stringValue(workflowRun.name),
      head_sha: normalizeSha(stringValue(workflowRun.head_sha)),
      status: stringValue(workflowRun.status),
      conclusion: stringValue(workflowRun.conclusion),
      event: stringValue(workflowRun.event),
      run_attempt: numberValue(workflowRun.run_attempt),
      html_url: stringValue(workflowRun.html_url)
    }) : null,
    workflow_job: workflowJob ? removeNullish({
      id: numberValue(workflowJob.id),
      run_id: numberValue(workflowJob.run_id),
      workflow_name: stringValue(workflowJob.workflow_name),
      head_sha: normalizeSha(stringValue(workflowJob.head_sha)),
      status: stringValue(workflowJob.status),
      conclusion: stringValue(workflowJob.conclusion),
      html_url: stringValue(workflowJob.html_url)
    }) : null,
    deployment: deployment ? removeNullish({
      id: numberValue(deployment.id),
      sha: normalizeSha(stringValue(deployment.sha)),
      environment: stringValue(deployment.environment),
      task: stringValue(deployment.task)
    }) : null,
    deployment_status: deploymentStatus ? removeNullish({
      id: numberValue(deploymentStatus.id),
      state: stringValue(deploymentStatus.state),
      environment: stringValue(deploymentStatus.environment),
      target_url: stringValue(deploymentStatus.target_url),
      log_url: stringValue(deploymentStatus.log_url)
    }) : null,
    check_suite: checkSuite ? removeNullish({
      id: numberValue(checkSuite.id),
      head_sha: normalizeSha(stringValue(checkSuite.head_sha)),
      status: stringValue(checkSuite.status),
      conclusion: stringValue(checkSuite.conclusion)
    }) : null,
    check_run: checkRun ? removeNullish({
      id: numberValue(checkRun.id),
      name: stringValue(checkRun.name),
      head_sha: normalizeSha(stringValue(checkRun.head_sha)),
      status: stringValue(checkRun.status),
      conclusion: stringValue(checkRun.conclusion),
      html_url: stringValue(checkRun.html_url)
    }) : null
  })
}

const insertGithubReleaseWebhookEvent = async (
  event: Omit<NormalizedGithubReleaseWebhookEvent, 'inboxEventId'> & { inboxEventId: string }
): Promise<void> => {
  await query(
    `INSERT INTO greenhouse_sync.github_release_webhook_events (
       github_release_webhook_event_id,
       webhook_inbox_event_id,
       delivery_id,
       event_name,
       action,
       repository_full_name,
       workflow_name,
       workflow_run_id,
       workflow_job_id,
       check_suite_id,
       check_run_id,
       deployment_id,
       target_sha,
       github_status,
       github_conclusion,
       processing_status,
       redacted_payload_json,
       evidence_json
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11, $12, $13, $14, $15,
       'received', $16::jsonb, $17::jsonb
     )`,
    [
      event.id,
      event.inboxEventId,
      event.deliveryId,
      event.eventName,
      event.action,
      event.repositoryFullName,
      event.workflowName,
      event.workflowRunId,
      event.workflowJobId,
      event.checkSuiteId,
      event.checkRunId,
      event.deploymentId,
      event.targetSha,
      event.githubStatus,
      event.githubConclusion,
      JSON.stringify(event.redactedPayload),
      JSON.stringify(event.evidence)
    ]
  )
}

const updateGithubReleaseWebhookEvent = async (
  eventId: string,
  result: GithubReleaseWebhookReconcileResult
): Promise<void> => {
  await query(
    `UPDATE greenhouse_sync.github_release_webhook_events
        SET processing_status = $1,
            release_id = $2,
            matched_by = $3,
            transition_applied = $4,
            transition_from_state = $5,
            transition_to_state = $6,
            error_code = $7,
            error_message = $8,
            evidence_json = $9::jsonb,
            processed_at = NOW()
      WHERE github_release_webhook_event_id = $10`,
    [
      result.processingStatus,
      result.releaseId,
      result.matchedBy,
      result.transitionApplied,
      result.transitionFromState,
      result.transitionToState,
      result.errorCode,
      result.errorMessage,
      JSON.stringify(result.evidence),
      eventId
    ]
  )
}

const isAllowedGithubReleaseEvent = (
  value: string | null
): value is GithubReleaseWebhookEventName => {
  return Boolean(value && (GITHUB_RELEASE_WEBHOOK_EVENTS as readonly string[]).includes(value))
}

const response = (
  status: number,
  code: string,
  extra: Record<string, unknown> = {}
): GithubReleaseWebhookResponse => ({
  status,
  body: {
    ok: status >= 200 && status < 300,
    code,
    ...extra
  }
})

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  return value as Record<string, unknown>
}

const stringValue = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

const numberValue = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(number) ? number : null
}

const normalizeSha = (value: string | null): string | null => {
  const normalized = value?.trim().toLowerCase() || null

  return normalized && /^[0-9a-f]{7,40}$/.test(normalized) ? normalized : null
}

const removeNullish = (value: Record<string, unknown>): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry == null) return false

      if (typeof entry === 'object' && !Array.isArray(entry)) {
        return Object.keys(entry).length > 0
      }

      return true
    })
  )
}

const redactErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.slice(0, 500)
  }

  return 'Unknown GitHub release webhook processing error.'
}
