import { NextResponse } from 'next/server'

import { type PublicSubmitInput, type PublicSubmitOutcome } from '@/lib/growth/forms/contracts'
import { submitForm } from '@/lib/growth/forms/commands'
import { isFormsPublicApiEnabled } from '@/lib/growth/forms/flags'
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

const STATUS_BY_OUTCOME: Record<PublicSubmitOutcome, number> = {
  accepted: 202,
  invalid: 400,
  consent_required: 422,
  surface_unauthorized: 403,
  rate_limited: 429,
  spam_rejected: 422,
  form_not_published: 404,
  disabled: 404,
}

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

export async function POST(request: Request, { params }: { params: Promise<{ formSlug: string }> }) {
  if (!isFormsPublicApiEnabled()) {
    return NextResponse.json({ outcome: 'disabled', message: 'No disponible.' }, { status: 404 })
  }

  const { formSlug } = await params

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ outcome: 'invalid', message: 'Solicitud inválida.' }, { status: 400 })
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
      requestId: getClientIp(request),
    })

    return NextResponse.json(
      { outcome: result.outcome, submissionId: result.submissionId, message: result.reason },
      { status: STATUS_BY_OUTCOME[result.outcome] },
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_public_submit_route' } })

    return NextResponse.json({ outcome: 'invalid', message: 'No fue posible procesar tu solicitud.' }, { status: 502 })
  }
}
