import { NextResponse } from 'next/server'

import { HiringValidationError } from '@/lib/hiring/errors'
import {
  checkTalentPoolPublicRequestAllowed,
  deriveTalentPoolAccess,
  recordTalentPoolConsent,
  resolveTalentPoolSelfServiceToken,
  revokeTalentPoolSelfServiceTokens,
  talentPoolFlags,
  updateTalentAvailability,
  withdrawTalentPoolConsent
} from '@/lib/hiring/talent-pool'

import { clientIp, TALENT_POOL_PUBLIC_HEADERS, toTalentPoolPublicError, unavailable } from '../_shared'

export const dynamic = 'force-dynamic'
const MAX_BODY_BYTES = 4 * 1024

type PublicAction = 'confirm' | 'availability' | 'withdraw'
interface Body {
  action?: PublicAction
  availability?: string
  idempotencyKey?: string
}

const rateLimited = () =>
  NextResponse.json(
    { ok: false, code: 'rate_limited', message: 'Demasiados intentos. Espera un momento e intenta nuevamente.' },
    { status: 429, headers: TALENT_POOL_PUBLIC_HEADERS }
  )

const idempotencyKey = (body: Body) => {
  const key = body.idempotencyKey?.trim() ?? ''

  if (!/^[A-Za-z0-9:_-]{8,100}$/.test(key)) {
    throw new HiringValidationError('Idempotency key inválida.', 'talent_pool_invalid_request')
  }

  return key
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!talentPoolFlags().selfService) return unavailable()
  if (!(await checkTalentPoolPublicRequestAllowed(clientIp(request), 'read'))) return rateLimited()
  const { token } = await params

  try {
    const resolved = await resolveTalentPoolSelfServiceToken(token)

    return NextResponse.json({ ok: true, profile: resolved.profile }, { headers: TALENT_POOL_PUBLIC_HEADERS })
  } catch (error) {
    return toTalentPoolPublicError(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!talentPoolFlags().selfService) return unavailable()
  if (!(await checkTalentPoolPublicRequestAllowed(clientIp(request), 'write'))) return rateLimited()
  const { token } = await params

  try {
    const text = await request.text()

    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, code: 'talent_pool_invalid_request', message: 'No pudimos procesar esta solicitud.' },
        { status: 413, headers: TALENT_POOL_PUBLIC_HEADERS }
      )
    }

    const body = JSON.parse(text) as Body
    const key = idempotencyKey(body)
    const resolved = await resolveTalentPoolSelfServiceToken(token)

    if (body.action === 'confirm') {
      if (!resolved.profile.access.allowedActions.includes('grant_future_consent')) {
        throw new HiringValidationError(
          'El perfil no admite esta acción.',
          'talent_pool_consent_action_not_allowed',
          409
        )
      }

      const currentExpiry = resolved.profile.futureConsentExpiresAt

      if (
        resolved.profile.lifecycleStatus === 'pool_eligible' &&
        currentExpiry &&
        new Date(currentExpiry).getTime() > Date.now() + 30 * 86_400_000
      ) {
        throw new HiringValidationError(
          'El consentimiento ya está vigente.',
          'talent_pool_consent_already_current',
          409
        )
      }

      const result = await recordTalentPoolConsent({
        talentProfileId: resolved.profile.talentProfileId,
        purpose: 'future_opportunities',
        source: 'candidate_self_service',
        actorType: 'candidate',
        evidenceRef: `self-service:${resolved.profile.talentProfileId}`,
        idempotencyKey: key
      })

      const readback = await resolveTalentPoolSelfServiceToken(token)

      return NextResponse.json(
        { ok: true, action: body.action, receiptId: result.receiptId, profile: readback.profile },
        { headers: TALENT_POOL_PUBLIC_HEADERS }
      )
    }

    if (body.action === 'availability') {
      if (!resolved.profile.access.allowedActions.includes('update_availability')) {
        throw new HiringValidationError(
          'El perfil no admite esta acción.',
          'talent_pool_availability_not_allowed',
          409
        )
      }

      const result = await updateTalentAvailability({
        talentProfileId: resolved.profile.talentProfileId,
        availability: body.availability ?? '',
        idempotencyKey: key
      })

      const readback = await resolveTalentPoolSelfServiceToken(token)

      return NextResponse.json(
        { ok: true, action: body.action, idempotent: result.idempotent, profile: readback.profile },
        { headers: TALENT_POOL_PUBLIC_HEADERS }
      )
    }

    if (body.action === 'withdraw') {
      if (!resolved.profile.access.allowedActions.includes('withdraw')) {
        throw new HiringValidationError(
          'El perfil no admite esta acción.',
          'talent_pool_withdraw_not_allowed',
          409
        )
      }

      const result = await withdrawTalentPoolConsent({
        talentProfileId: resolved.profile.talentProfileId,
        source: 'candidate_self_service',
        actorType: 'candidate',
        idempotencyKey: key
      })

      const profile =
        result.lifecycleStatus === 'active_process'
          ? (await resolveTalentPoolSelfServiceToken(token)).profile
          : {
              ...resolved.profile,
              lifecycleStatus: result.lifecycleStatus,
              futureConsentExpiresAt: null,
              access: deriveTalentPoolAccess({ lifecycleStatus: result.lifecycleStatus, futureConsentExpiresAt: null }),
              receipts: [
                {
                  receiptId: result.receiptId,
                  purpose: 'future_opportunities',
                  action: 'withdrawn',
                  occurredAt: new Date().toISOString(),
                  expiresAt: null
                },
                ...resolved.profile.receipts
              ]
            }

      if (result.lifecycleStatus === 'withdrawn') {
        await revokeTalentPoolSelfServiceTokens(resolved.membershipId)
      }

      return NextResponse.json(
        { ok: true, action: body.action, receiptId: result.receiptId, profile },
        { headers: TALENT_POOL_PUBLIC_HEADERS }
      )
    }

    return NextResponse.json(
      { ok: false, code: 'talent_pool_invalid_request', message: 'No pudimos procesar esta solicitud.' },
      { status: 400, headers: TALENT_POOL_PUBLIC_HEADERS }
    )
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, code: 'talent_pool_invalid_request', message: 'No pudimos procesar esta solicitud.' },
        { status: 400, headers: TALENT_POOL_PUBLIC_HEADERS }
      )
    }

    return toTalentPoolPublicError(error)
  }
}
