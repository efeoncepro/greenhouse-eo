import { NextResponse } from 'next/server'

import { turnstileCaptchaVerifier } from '@/lib/growth/public-submission/captcha'
import {
  checkHiringIntakeAbuse,
  hashHiringEmail,
  hashHiringIp,
  recordHiringIntakeEvent,
  type HiringIntakeOutcome,
} from '@/lib/hiring/public-careers/abuse-guard'
import { isHiringPublicApplicationsEnabled } from '@/lib/hiring/public-careers/config'
import { parsePublicHiringApplication } from '@/lib/hiring/public-careers/schema'
import { submitPublicHiringApplication } from '@/lib/hiring/public-careers/submit-application'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1367 — `POST /api/public/hiring/applications` (PÚBLICO, sin sesión). Puerta de entrada de
 * candidatos. Pipeline: flag → parse → captcha (Turnstile) → rate-limit → validación → submit.
 * Respuestas SIEMPRE genéricas y seguras: nunca revelan dedupe/estado interno/existencia previa.
 * Flag OFF → 404 invisible. Consumer: la careers UI (TASK-354).
 */
export const dynamic = 'force-dynamic'

// Copy es-CL genérico (fallback; la careers UI de TASK-354 renderiza su propio copy).
const MESSAGES: Record<HiringIntakeOutcome | 'disabled' | 'error', string> = {
  accepted: '¡Gracias! Recibimos tu postulación. Si tu perfil avanza, te contactamos.',
  not_open: 'Esta vacante ya no está disponible.',
  rate_limited: 'Estás enviando demasiadas veces. Intenta de nuevo en unos minutos.',
  captcha_failed: 'No pudimos verificar que no eres un robot. Recarga la página e intenta de nuevo.',
  invalid: 'Revisa los datos del formulario e intenta de nuevo.',
  spam_rejected: '¡Gracias! Recibimos tu postulación. Si tu perfil avanza, te contactamos.',
  disabled: 'No encontrado.',
  error: 'No pudimos enviar tu postulación. Intenta de nuevo.',
}

const STATUS: Record<HiringIntakeOutcome, number> = {
  accepted: 202,
  spam_rejected: 202,
  not_open: 404,
  rate_limited: 429,
  captcha_failed: 403,
  invalid: 422,
}

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || null

const respond = (outcome: HiringIntakeOutcome) =>
  NextResponse.json({ outcome, message: MESSAGES[outcome] }, { status: STATUS[outcome] })

// El registro del evento es best-effort: nunca rompe la respuesta.
const safeRecord = async (input: Parameters<typeof recordHiringIntakeEvent>[0]): Promise<void> => {
  try {
    await recordHiringIntakeEvent(input)
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'hiring_intake_event_record' } })
  }
}

export async function POST(request: Request) {
  // Flag OFF → 404 invisible (no revela que el endpoint existe).
  if (!isHiringPublicApplicationsEnabled()) {
    return NextResponse.json({ outcome: 'disabled', message: MESSAGES.disabled }, { status: 404 })
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return respond('invalid')
  }

  const ip = getClientIp(request)
  const ipHash = hashHiringIp(ip)
  const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : null

  try {
    // 1. Captcha (Turnstile — fail-closed en prod sin secret).
    const captcha = await turnstileCaptchaVerifier().verify(captchaToken, ip)

    if (!captcha.ok) {
      await safeRecord({ emailHash: null, ipHash, openingPublicId: null, outcome: 'captcha_failed' })

      return respond('captcha_failed')
    }

    // 2. Validación (parse puro; null = invalid genérico, no revela qué campo).
    const parsed = parsePublicHiringApplication(body)

    if (!parsed) {
      await safeRecord({ emailHash: null, ipHash, openingPublicId: null, outcome: 'invalid' })

      return respond('invalid')
    }

    const emailHash = hashHiringEmail(parsed.email)

    // 3. Rate-limit (per-email → per-IP).
    const abuse = await checkHiringIntakeAbuse({ emailHash, ipHash })

    if (!abuse.allowed) {
      await safeRecord({ emailHash, ipHash, openingPublicId: parsed.openingPublicId, outcome: 'rate_limited' })

      return respond('rate_limited')
    }

    // 4. Submit gobernado (multi-step idempotente). Duplicado → 'accepted' genérico.
    const result = await submitPublicHiringApplication(parsed)

    await safeRecord({ emailHash, ipHash, openingPublicId: parsed.openingPublicId, outcome: result.outcome })

    return respond(result.outcome)
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'public_apply_intake' } })

    return NextResponse.json({ outcome: 'error', message: MESSAGES.error }, { status: 502 })
  }
}
