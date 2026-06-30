import { NextResponse } from 'next/server'

import { publicFormsCorsHeaders, publicFormsOptionsResponse } from '@/app/api/public/growth/forms/cors'
import { verifyEmail } from '@/lib/growth/forms/email-verification'
import { allowVerifyRequest } from '@/lib/growth/forms/email-verification/rate-limit'
import { isFormsEmailVerificationEnabled, isFormsPublicApiEnabled } from '@/lib/growth/forms/flags'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1254 — `POST /api/public/growth/forms/{formSlug}/verify-email`.
 *
 * Endpoint público debounced que el cliente consume para habilitar/deshabilitar el submit
 * (UX). El cliente NUNCA llama al provider: el secreto vive server-only y solo este endpoint
 * (o `submitForm`) lo orquesta. La AUTORIDAD del gate es `submitForm` (re-verifica). Devuelve
 * un veredicto sanitizado (NUNCA el payload crudo del provider). Gateado por el master switch
 * `GROWTH_FORMS_PUBLIC_API_ENABLED` **Y** `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` (default OFF
 * → 404): no se expone independiente de la superficie pública de forms. Rate-limit por IP.
 */
export const dynamic = 'force-dynamic'

const METHODS = 'POST, OPTIONS'

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

export function OPTIONS(request: Request) {
  return publicFormsOptionsResponse(request, METHODS)
}

export async function POST(_request: Request, { params }: { params: Promise<{ formSlug: string }> }) {
  const headers = publicFormsCorsHeaders(_request, METHODS)

  await params // formSlug no se usa para verificar (la verificación es por email), pero mantiene la ruta consistente.

  if (!isFormsPublicApiEnabled() || !isFormsEmailVerificationEnabled()) {
    return NextResponse.json({ outcome: 'disabled', message: 'No disponible.' }, { status: 404, headers })
  }

  if (!allowVerifyRequest(getClientIp(_request))) {
    return NextResponse.json({ outcome: 'rate_limited', message: 'Demasiados intentos. Espera un momento.' }, { status: 429, headers })
  }

  let body: Record<string, unknown>

  try {
    body = (await _request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ outcome: 'invalid', message: 'Solicitud inválida.' }, { status: 400, headers })
  }

  const email = typeof body.email === 'string' ? body.email : ''

  try {
    const verdict = await verifyEmail(email)

    // Veredicto sanitizado para el cliente: nunca el payload crudo del provider ni el tier interno.
    return NextResponse.json(
      {
        outcome: 'ok',
        syntaxValid: verdict.syntaxValid,
        isCorporate: verdict.isCorporate,
        isDisposable: verdict.isDisposable,
        isRoleBased: verdict.isRoleBased,
        isFreeProvider: verdict.isFreeProvider,
        deliverable: verdict.deliverable,
        quality: verdict.quality,
        suggestion: verdict.suggestion,
        reasonCode: verdict.reasonCode,
      },
      { status: 200, headers },
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_verify_email_route' } })

    return NextResponse.json({ outcome: 'invalid', message: 'No fue posible verificar el correo.' }, { status: 502, headers })
  }
}
