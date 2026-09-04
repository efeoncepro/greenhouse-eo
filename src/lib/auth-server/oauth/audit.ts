/**
 * Audit + rate limit del protocolo (TASK-1829).
 *
 * El rate limit por IP / `client_id` cuenta sobre `oauth_audit_events` (patrón
 * `party-endpoint-rate-limit.ts`): ventana fija de 60 s, sin tabla extra. Cloud Armor es la primera
 * capa; esto es la segunda. Nunca se guarda IP, UA, sujeto ni token en claro.
 */

import { OAuthProtocolError } from './errors'
import { hashSensitiveValue, isValidCorrelationId, sha256Hex } from './primitives'
import type { OAuthAuditEvent, OAuthAuditEventType, OAuthStorePort } from './store/port'

export type OAuthRequestAuditContext = {
  ipHash: string | null
  userAgentHash: string | null
  correlationId: string
}

export const buildRequestAuditContext = (headers: {
  get(name: string): string | null | undefined
}): OAuthRequestAuditContext => {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || null
  const requested = headers.get('x-correlation-id')?.trim() || null

  return {
    ipHash: hashSensitiveValue(forwarded),
    userAgentHash: hashSensitiveValue(headers.get('user-agent')?.trim() || null),
    correlationId: isValidCorrelationId(requested) ? requested : crypto.randomUUID()
  }
}

/** Hash truncado del `sub` para audit/logs. NUNCA el sujeto crudo. */
export const hashSubject = (subject: string): string => sha256Hex(subject).slice(0, 32)

export type RecordAuditInput = Omit<OAuthAuditEvent, 'ipHash' | 'userAgentHash' | 'correlationId' | 'details' | 'subjectHash'> & {
  subject?: string | null
  details?: Record<string, unknown>
}

export const recordOAuthAudit = async (
  store: OAuthStorePort,
  context: OAuthRequestAuditContext,
  input: RecordAuditInput
): Promise<void> => {
  try {
    await store.recordAuditEvent({
      eventType: input.eventType,
      outcome: input.outcome,
      clientId: input.clientId ?? null,
      subjectHash: input.subject ? hashSubject(input.subject) : null,
      grantId: input.grantId ?? null,
      errorCode: input.errorCode ?? null,
      ipHash: context.ipHash,
      userAgentHash: context.userAgentHash,
      correlationId: context.correlationId,
      details: input.details ?? {}
    })
  } catch {
    // El audit nunca rompe el flujo del protocolo; la observabilidad es del caller (captureWithDomain).
  }
}

export type RateLimitRule = {
  eventTypes: readonly OAuthAuditEventType[]
  windowSeconds: number
  /** Máximo por IP en la ventana (`null` = sin límite por IP). */
  perIp: number | null
  /** Máximo por `client_id` en la ventana (`null` = sin límite por cliente). */
  perClient: number | null
}

export const enforceOAuthRateLimit = async (
  store: OAuthStorePort,
  context: OAuthRequestAuditContext,
  input: { rule: RateLimitRule; clientId?: string | null; now: Date }
): Promise<void> => {
  const since = new Date(input.now.getTime() - input.rule.windowSeconds * 1000)
  const checks: Array<Promise<boolean>> = []

  if (context.ipHash && input.rule.perIp !== null) {
    const limit = input.rule.perIp

    checks.push(
      store.countAuditEvents({ eventTypes: input.rule.eventTypes, since, ipHash: context.ipHash }).then(count => count >= limit)
    )
  }

  if (input.clientId && input.rule.perClient !== null) {
    const limit = input.rule.perClient

    checks.push(
      store.countAuditEvents({ eventTypes: input.rule.eventTypes, since, clientId: input.clientId }).then(count => count >= limit)
    )
  }

  const exceeded = (await Promise.all(checks)).some(Boolean)

  if (exceeded) {
    await recordOAuthAudit(store, context, {
      eventType: 'rate_limited',
      outcome: 'rejected',
      clientId: input.clientId ?? null,
      grantId: null,
      errorCode: 'slow_down'
    })

    throw new OAuthProtocolError('slow_down', { description: 'too many requests', reason: 'rate_limited' })
  }
}
