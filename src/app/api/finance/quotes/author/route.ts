import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'
import {
  submitQuoteFromBuilder,
  SubmitQuoteError
} from '@/lib/commercial/submit-quote-from-builder'
import { submitQuoteFromBuilderPayloadSchema } from '@/lib/commercial/submit-quote-from-builder-schema'

export const dynamic = 'force-dynamic'

/**
 * TASK-1212 — POST /api/finance/quotes/author
 *
 * Endpoint canónico de AUTORÍA/EMISIÓN del cotizador: parsea el payload con el
 * contrato Zod, agrega `subject`/`actor` desde la sesión (identidad NUNCA del body) y
 * delega en el command único `submitQuoteFromBuilder` (create/edit + issueAfterSave en
 * UNA llamada). Es el cliente HTTP del MISMO primitive que consume la Nexa governed
 * action (Slice 4) — la UI deja de ser source of truth del pricing.
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || canonicalErrorResponse('unauthorized')
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud no es un JSON válido.', code: 'invalid_payload', actionable: false },
      { status: 400 }
    )
  }

  const parsed = submitQuoteFromBuilderPayloadSchema.safeParse(rawBody)

  if (!parsed.success) {
    const issue = parsed.error.issues[0]

    // Solo surfaceamos el mensaje del refine es-CL (path quotationId); el resto de
    // errores de forma quedan en un mensaje genérico es-CL para no filtrar prosa en inglés.
    const message =
      issue?.path?.[0] === 'quotationId' && issue.message
        ? issue.message
        : 'El payload de la cotización no es válido. Revisa los campos requeridos.'

    return NextResponse.json({ error: message, code: 'invalid_payload', actionable: false }, { status: 400 })
  }

  try {
    const result = await submitQuoteFromBuilder({
      ...parsed.data,
      subject: tenant,
      actor: { userId: tenant.userId, name: tenant.clientName || tenant.userId }
    })

    return NextResponse.json(result, { status: parsed.data.mode === 'create' ? 201 : 200 })
  } catch (error) {
    if (error instanceof SubmitQuoteError) {
      // Errores de negocio → 4xx canónico es-CL, sin filtrar internals.
      const status = error.code === 'forbidden' ? 403 : error.code === 'idempotency_conflict' ? 409 : 422

      return NextResponse.json({ error: error.message, code: error.code, actionable: error.actionable }, { status })
    }

    captureWithDomain(error, 'commercial', {
      tags: { source: 'quote_author_endpoint' },
      extra: { detail: redactErrorForResponse(error), userId: tenant.userId }
    })

    return canonicalErrorResponse('internal_error')
  }
}
