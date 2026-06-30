import { NextResponse } from 'next/server'

import { publicFormsCorsHeaders, publicFormsOptionsResponse } from '@/app/api/public/growth/forms/cors'
import { type PublicSubmitInput, type PublicSubmitOutcome } from '@/lib/growth/forms/contracts'
import { submitForm } from '@/lib/growth/forms/commands'
import { isFormsPublicApiEnabled } from '@/lib/growth/forms/flags'
import { resolveFormSlugFromRef } from '@/lib/growth/forms/readers'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1229 — `POST /api/public/growth/forms/{formSlug}/submit`.
 *
 * Único WRITE público del motor. SIN sesión: honeypot + surface-auth + consent gate
 * + dedupe en el command. NUNCA acepta destination mapping desde el browser. Acepta +
 * persiste submission/consent + emite outbox event; la entrega es async (dispatcher),
 * NUNCA inline. Gateado por `GROWTH_FORMS_PUBLIC_API_ENABLED` (default OFF → 404).
 */
export const dynamic = 'force-dynamic'

const METHODS = 'POST, OPTIONS'

const STATUS_BY_OUTCOME: Record<PublicSubmitOutcome, number> = {
  accepted: 202,
  invalid: 400,
  consent_required: 422,
  surface_unauthorized: 403,
  rate_limited: 429,
  spam_rejected: 422,
  captcha_failed: 403,
  form_not_published: 404,
  disabled: 404,
  error: 503,
}

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

export function OPTIONS(request: Request) {
  return publicFormsOptionsResponse(request, METHODS)
}

export async function POST(request: Request, { params }: { params: Promise<{ formSlug: string }> }) {
  const headers = publicFormsCorsHeaders(request, METHODS)

  if (!isFormsPublicApiEnabled()) {
    return NextResponse.json({ outcome: 'disabled', message: 'No disponible.' }, { status: 404, headers })
  }

  // `formSlug` es un formRef: acepta slug (alias legacy) o form_key (UUID). El resto del
  // command opera por slug (surface allowlist, dedupe), así que resolvemos primero.
  const { formSlug: formRef } = await params
  const formSlug = await resolveFormSlugFromRef(formRef)

  if (!formSlug) {
    return NextResponse.json({ outcome: 'form_not_published', message: 'Formulario no encontrado.' }, { status: 404, headers })
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ outcome: 'invalid', message: 'Solicitud inválida.' }, { status: 400, headers })
  }

  // El browser nunca manda destination mapping; sólo lo declarado por el contrato.
  const input: PublicSubmitInput = {
    formSlug,
    surfaceId: typeof body.surfaceId === 'string' ? body.surfaceId : undefined,
    embedKey: typeof body.embedKey === 'string' ? body.embedKey : undefined,
    formVersionId: typeof body.formVersionId === 'string' ? body.formVersionId : undefined,
    fields: (body.fields && typeof body.fields === 'object' ? body.fields : {}) as PublicSubmitInput['fields'],
    consent: body.consent === true,
    consentCheckboxes: Array.isArray(body.consentCheckboxes)
      ? body.consentCheckboxes.filter((v): v is string => typeof v === 'string')
      : [],
    pageUri: typeof body.pageUri === 'string' ? body.pageUri : undefined,
    pageName: typeof body.pageName === 'string' ? body.pageName : undefined,
    referrer: typeof body.referrer === 'string' ? body.referrer : undefined,
    honeypot: typeof body.honeypot === 'string' ? body.honeypot : undefined,
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
  }

  try {
    const result = await submitForm(input, {
      origin: request.headers.get('origin'),
      ip: getClientIp(request),
      captchaToken: typeof body.captchaToken === 'string' ? body.captchaToken : null,
      requestId: null,
    })

    return NextResponse.json(
      { outcome: result.outcome, submissionId: result.submissionId, message: result.reason },
      { status: STATUS_BY_OUTCOME[result.outcome], headers },
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_public_submit_route' } })

    return NextResponse.json({ outcome: 'invalid', message: 'No fue posible procesar tu solicitud.' }, { status: 502, headers })
  }
}
