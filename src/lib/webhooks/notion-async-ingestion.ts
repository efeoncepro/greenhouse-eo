import 'server-only'

import { createHash } from 'node:crypto'

import { createGoogleAuth, getGoogleProjectId } from '@/lib/google-credentials'
import { isNotionStatusTransitionsWebhookEnabled } from '@/lib/notion-metrics/status-transitions-flags'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

import { extractNotionVerificationToken, validateNotionSignature } from './notion-auth'

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
const DEFAULT_QUEUE = 'notion-webhook-ingestion'
const DEFAULT_LOCATION = 'us-east4'
const MAX_RAW_BODY_BYTES = 750_000

export const ASYNC_NOTION_ENDPOINTS = [
  'notion-tasks-demo',
  'notion-status-transitions'
] as const

export type AsyncNotionEndpoint = (typeof ASYNC_NOTION_ENDPOINTS)[number]

export interface NotionWebhookTaskEnvelope {
  endpointKey: AsyncNotionEndpoint
  rawBody: string
  signature: string
  contentType: string
  enqueuedAt: string
}

interface AsyncIngestionResult {
  status: number
  body: Record<string, unknown>
}

const endpointSet = new Set<string>(ASYNC_NOTION_ENDPOINTS)

export const isAsyncNotionEndpoint = (endpointKey: string): endpointKey is AsyncNotionEndpoint =>
  endpointSet.has(endpointKey)

export const isNotionWebhookAsyncIngestionEnabled = (
  env: NodeJS.ProcessEnv = process.env
): boolean => env.NOTION_WEBHOOK_ASYNC_INGESTION_ENABLED?.trim().toLowerCase() === 'true'

const parsePayload = (rawBody: string): unknown => {
  try {
    return rawBody ? JSON.parse(rawBody) : null
  } catch {
    return null
  }
}

const extractSourceEventId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null

  const obj = payload as Record<string, unknown>
  const candidate = obj.event_id || obj.eventId || obj.id || obj.messageId

  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
}

const resolveSigningSecretRef = (
  endpointKey: AsyncNotionEndpoint,
  env: NodeJS.ProcessEnv
): string | null => {
  const value = endpointKey === 'notion-tasks-demo'
    ? env.NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF
    : env.NOTION_STATUS_TRANSITIONS_WEBHOOK_SIGNING_SECRET_REF

  return value?.trim() || null
}

const resolveTargetBaseUrl = (env: NodeJS.ProcessEnv): string => {
  const candidate = env.NOTION_WEBHOOK_TASKS_TARGET_BASE_URL?.trim()
    || env.GREENHOUSE_PUBLIC_BASE_URL?.trim()
    || env.NEXTAUTH_URL?.trim()

  if (!candidate) {
    throw new Error('Notion webhook Cloud Tasks target base URL is not configured')
  }

  const parsed = new URL(candidate)

  if (parsed.protocol !== 'https:') {
    throw new Error('Notion webhook Cloud Tasks target base URL must use HTTPS')
  }

  return parsed.toString().replace(/\/$/u, '')
}

export const getNotionWebhookWorkerUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  `${resolveTargetBaseUrl(env)}/api/internal/webhooks/notion-ingestion`

const buildTaskName = (
  endpointKey: AsyncNotionEndpoint,
  rawBody: string,
  sourceEventId: string | null
): string => {
  const hash = createHash('sha256')
    .update(`${endpointKey}:${sourceEventId || rawBody}`)
    .digest('hex')

  return `notion-${hash}`
}

const isAlreadyExistsError = (error: unknown): boolean => {
  const responseStatus = (error as { response?: { status?: unknown } })?.response?.status
  const code = (error as { code?: unknown })?.code

  return responseStatus === 409 || code === 409
}

export const enqueueNotionWebhookRequest = async (
  endpointKey: AsyncNotionEndpoint,
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): Promise<AsyncIngestionResult> => {
  const rawBody = await request.text()

  if (Buffer.byteLength(rawBody, 'utf8') > MAX_RAW_BODY_BYTES) {
    return { status: 413, body: { received: false, queued: false, error: 'Payload too large' } }
  }

  const parsedPayload = parsePayload(rawBody)

  // Preserve the existing kill-switch behavior without touching PostgreSQL.
  if (
    endpointKey === 'notion-status-transitions'
    && !extractNotionVerificationToken(parsedPayload)
    && !isNotionStatusTransitionsWebhookEnabled()
  ) {
    return { status: 200, body: { received: true, queued: false, disabled: true } }
  }

  const signature = request.headers.get('x-notion-signature')?.trim() || ''

  // Notion verification requests establish the signing secret, so they are
  // queued without HMAC validation and persisted by the canonical inbox worker.
  if (!extractNotionVerificationToken(parsedPayload)) {
    const secretRef = resolveSigningSecretRef(endpointKey, env)
    const secret = secretRef ? await resolveSecretByRef(secretRef) : null

    if (!secret) {
      throw new Error(`Signing secret is not configured for ${endpointKey}`)
    }

    if (!validateNotionSignature(rawBody, signature, secret)) {
      return { status: 401, body: { received: false, queued: false, error: 'Invalid webhook signature' } }
    }
  }

  const projectId = getGoogleProjectId(env)
  const location = env.NOTION_WEBHOOK_TASKS_LOCATION?.trim() || DEFAULT_LOCATION
  const queue = env.NOTION_WEBHOOK_TASKS_QUEUE?.trim() || DEFAULT_QUEUE
  const serviceAccountEmail = env.NOTION_WEBHOOK_TASKS_SERVICE_ACCOUNT_EMAIL?.trim()

  if (!serviceAccountEmail) {
    throw new Error('NOTION_WEBHOOK_TASKS_SERVICE_ACCOUNT_EMAIL is not configured')
  }

  const workerUrl = getNotionWebhookWorkerUrl(env)
  const audience = env.NOTION_WEBHOOK_TASKS_OIDC_AUDIENCE?.trim() || workerUrl
  const sourceEventId = extractSourceEventId(parsedPayload)
  const taskId = buildTaskName(endpointKey, rawBody, sourceEventId)
  const queueResource = `projects/${projectId}/locations/${location}/queues/${queue}`

  const envelope: NotionWebhookTaskEnvelope = {
    endpointKey,
    rawBody,
    signature,
    contentType: request.headers.get('content-type') || 'application/json',
    enqueuedAt: new Date().toISOString()
  }

  const auth = createGoogleAuth({ env, scopes: [CLOUD_PLATFORM_SCOPE] })

  try {
    await auth.request({
      url: `https://cloudtasks.googleapis.com/v2/${queueResource}/tasks`,
      method: 'POST',
      data: {
        task: {
          name: `${queueResource}/tasks/${taskId}`,
          httpRequest: {
            httpMethod: 'POST',
            url: workerUrl,
            headers: { 'Content-Type': 'application/json' },
            body: Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64'),
            oidcToken: {
              serviceAccountEmail,
              audience
            }
          }
        }
      }
    })
  } catch (error) {
    // Deterministic names make provider retries idempotent at the queue edge.
    if (!isAlreadyExistsError(error)) {
      throw error
    }

    return { status: 200, body: { received: true, queued: true, duplicate: true } }
  }

  return { status: 200, body: { received: true, queued: true } }
}

export const parseNotionWebhookTaskEnvelope = (payload: unknown): NotionWebhookTaskEnvelope | null => {
  if (!payload || typeof payload !== 'object') return null

  const candidate = payload as Partial<NotionWebhookTaskEnvelope>

  if (
    !candidate.endpointKey
    || !isAsyncNotionEndpoint(candidate.endpointKey)
    || typeof candidate.rawBody !== 'string'
    || typeof candidate.signature !== 'string'
    || typeof candidate.contentType !== 'string'
    || typeof candidate.enqueuedAt !== 'string'
  ) {
    return null
  }

  return candidate as NotionWebhookTaskEnvelope
}
