import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import {
  getAssessmentAccessRecoveryAvailability,
  isAssessmentAccessRecoveryChannel,
  isAssessmentAccessRecoveryReason,
  recoverCandidateTestAccess,
} from '@/lib/hiring/assessment/access-recovery'
import { HiringNotFoundError, HiringValidationError } from '@/lib/hiring/errors'
import {
  hasExactSameOrigin,
  hasOnlyKeys,
  publicAssessmentResponseHeaders,
  readBoundedJsonObject,
} from '@/lib/hiring/assessment/public-session/http'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

const HUMAN_PROVIDER_AUTH_MODES: Record<string, ReadonlySet<string>> = {
  credentials: new Set(['credentials', 'both']),
  microsoft_sso: new Set(['microsoft_sso', 'both']),
  google_sso: new Set(['google_sso', 'both']),
}

const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{15,199}$/

const headers = {
  ...publicAssessmentResponseHeaders,
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
}

const json = (body: object, status: number) => NextResponse.json(body, {
  status,
  headers: status === 429 ? { ...headers, 'Retry-After': '60' } : headers,
})

const invalid = () => json({ ok: false, code: 'assessment_recovery_invalid_request' }, 400)
const unavailable = () => json({ ok: false, code: 'assessment_recovery_unavailable' }, 404)

const isHumanSession = (provider?: string | null, authMode?: string | null) => {
  const normalizedProvider = provider?.trim().toLowerCase() ?? ''
  const normalizedMode = authMode?.trim().toLowerCase() ?? ''

  return HUMAN_PROVIDER_AUTH_MODES[normalizedProvider]?.has(normalizedMode) === true
}

const safeReceipt = (receipt: {
  recoveryId: string
  assessmentId: string
  applicationId: string
  openingId: string
  channel: string
  reasonCode: string
  previousStatus: string
  resultingStatus: string
  issuedAt: string
  expiresAt: string
  outcome: string
  deliveryId: string | null
}) => ({
  recoveryId: receipt.recoveryId,
  assessmentId: receipt.assessmentId,
  applicationId: receipt.applicationId,
  openingId: receipt.openingId,
  channel: receipt.channel,
  reasonCode: receipt.reasonCode,
  previousStatus: receipt.previousStatus,
  resultingStatus: receipt.resultingStatus,
  issuedAt: receipt.issuedAt,
  expiresAt: receipt.expiresAt,
  outcome: receipt.outcome,
  deliveryId: receipt.deliveryId,
})

/**
 * TASK-1747 — lectura de disponibilidad de recuperación.
 *
 * Existe para que la disponibilidad sea un CONTRATO y no un privilegio de la página: Application
 * 360 la resuelve server-side, pero cualquier otro consumidor gobernado (Nexa, MCP, un runbook)
 * necesita poder preguntar "¿se puede recuperar el acceso de este test y por qué canal?" sin
 * ejecutar el command. Es de sólo lectura: NUNCA emite credencial ni consume cuota.
 *
 * `reason` es opcional y sí cambia la respuesta: la elegibilidad de un test `expired` depende del
 * motivo declarado (sólo `token_expired_before_start` puede probar el vencimiento previo al
 * inicio). Sin `reason`, se responde con el motivo por defecto.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? json({ ok: false, code: 'unauthorized' }, 401)

  if (!can(tenant, 'hiring.assessment.read', 'read', 'tenant')
    || !can(tenant, 'hiring.application.read', 'read', 'tenant')) {
    return json({ ok: false, code: 'forbidden' }, 403)
  }

  const reasonParam = new URL(request.url).searchParams.get('reason')

  if (reasonParam !== null && !isAssessmentAccessRecoveryReason(reasonParam)) return invalid()

  try {
    const { id } = await params

    const availability = reasonParam
      ? await getAssessmentAccessRecoveryAvailability(id, reasonParam)
      : await getAssessmentAccessRecoveryAvailability(id)

    if (!availability) return unavailable()

    return json({
      ok: true,
      availability,
      canRecoverByEmail: can(tenant, 'hiring.assessment.recover_access_email', 'execute', 'tenant'),
      canRevealSecureLink: can(tenant, 'hiring.assessment.reveal_access_link', 'execute', 'tenant'),
    }, 200)
  } catch (error) {
    captureWithDomain(error, 'hiring', {
      tags: { source: 'assessment_access_recovery_availability_api' },
    })

    return json({ ok: false, code: 'internal_error' }, 500)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasExactSameOrigin(request)) return json({ ok: false, code: 'forbidden' }, 403)

  const session = await getServerAuthSession()

  if (!session?.user) return json({ ok: false, code: 'unauthorized' }, 401)

  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? json({ ok: false, code: 'unauthorized' }, 401)

  if (!isHumanSession(session.user.provider, session.user.authMode || tenant.authMode)) {
    return json({ ok: false, code: 'forbidden' }, 403)
  }

  const body = await readBoundedJsonObject(request)
  const idempotencyKey = request.headers.get('x-idempotency-key')?.trim() ?? ''

  if (!body || !hasOnlyKeys(body, ['applicationId', 'channel', 'reasonCode'])
    || typeof body.applicationId !== 'string' || !body.applicationId.trim()
    || !isAssessmentAccessRecoveryChannel(body.channel)
    || !isAssessmentAccessRecoveryReason(body.reasonCode)
    || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return invalid()
  }

  const requiredChannelCapability = body.channel === 'email'
    ? 'hiring.assessment.recover_access_email'
    : 'hiring.assessment.reveal_access_link'

  // Capabilities are evaluated before resolving either assessment or application identifiers.
  if (!can(tenant, 'hiring.assessment.read', 'read', 'tenant')
    || !can(tenant, 'hiring.application.read', 'read', 'tenant')
    || !can(tenant, requiredChannelCapability, 'execute', 'tenant')) {
    return json({ ok: false, code: 'forbidden' }, 403)
  }

  const { id } = await params

  try {
    const target = await getAssessmentAccessRecoveryAvailability(id, body.reasonCode)

    if (!target || target.applicationId !== body.applicationId.trim()) return unavailable()

    const result = await recoverCandidateTestAccess({
      assessmentId: id,
      channel: body.channel,
      reasonCode: body.reasonCode,
      idempotencyKey,
      actorUserId: tenant.userId,
    })

    return json({
      ok: true,
      recovery: safeReceipt(result.receipt),
      replayed: result.replayed,
      linkRevealed: result.linkRevealed,
      ...(result.linkRevealed ? { accessUrl: result.accessUrl } : {}),
    }, result.replayed ? 200 : 201)
  } catch (error) {
    if (error instanceof HiringNotFoundError) return unavailable()

    if (error instanceof HiringValidationError) {
      if (error.statusCode === 429) return json({ ok: false, code: 'rate_limited' }, 429)

      if (error.code === 'assessment_recovery_idempotency_conflict') {
        return json({ ok: false, code: 'assessment_recovery_idempotency_conflict' }, 409)
      }

      if (error.code === 'assessment_recovery_email_provider_blocked') {
        return json({ ok: false, code: error.code }, 409)
      }

      return json({ ok: false, code: 'assessment_recovery_unavailable' }, 409)
    }

    captureWithDomain(error, 'hiring', {
      tags: { source: 'assessment_access_recovery_product_api' },
      extra: { channel: body.channel },
    })

    return json({ ok: false, code: 'internal_error' }, 500)
  }
}
