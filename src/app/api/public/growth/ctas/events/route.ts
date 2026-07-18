import { NextResponse } from 'next/server'

import { publicCtasCorsHeaders, publicCtasOptionsResponse } from '@/app/api/public/growth/ctas/cors'
import { ingestCtaEvent } from '@/lib/growth/ctas/ingest'
import type { CtaPublicEventOutcome } from '@/lib/growth/ctas/contracts'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1339 — `POST /api/public/growth/ctas/events` (ingest de evidencia Tier A).
 *
 * Write forjable tratado como untrusted (arch §16.1): surface binding + embed key +
 * origin + cross-check `cta_version ↔ surface_id` + rate-limit + idempotencia viven
 * en el primitive (`ingestCtaEvent`); acá solo transporte, body cap y mapping de
 * outcome → HTTP. Todo lo aceptado entra `browser_reported` (la conversión-verdad
 * es server_confirmed por otro path). Gateado por `GROWTH_CTA_ENGINE_ENABLED`
 * (default OFF → 404). SIN sesión.
 */
export const dynamic = 'force-dynamic'

const METHODS = 'POST, OPTIONS'

/** Un evento Tier A es chico; 32KB acota payloads maliciosos sin tocar el caso legítimo. */
const MAX_BODY_BYTES = 32_000

const STATUS_BY_OUTCOME: Record<CtaPublicEventOutcome, number> = {
  accepted: 202,
  invalid: 400,
  surface_unauthorized: 403,
  rate_limited: 429,
  disabled: 404,
  error: 503,
}

const MESSAGE_BY_OUTCOME: Partial<Record<CtaPublicEventOutcome, string>> = {
  invalid: 'El evento no tiene el formato esperado.',
  surface_unauthorized: 'Surface no autorizada.',
  rate_limited: 'Demasiados eventos. Intenta más tarde.',
  disabled: 'No disponible.',
  error: 'No fue posible registrar el evento.',
}

export function OPTIONS(request: Request) {
  return publicCtasOptionsResponse(request, METHODS)
}

export async function POST(request: Request) {
  const headers = await publicCtasCorsHeaders(request, METHODS)

  const raw = await request.text()

  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'El evento excede el tamaño permitido.' }, { status: 413, headers })
  }

  let body: unknown

  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: MESSAGE_BY_OUTCOME.invalid }, { status: 400, headers })
  }

  const origin = request.headers.get('origin')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  try {
    const result = await ingestCtaEvent(body, { origin, ip })
    const status = STATUS_BY_OUTCOME[result.outcome]

    if (result.outcome === 'accepted') {
      return NextResponse.json({ outcome: 'accepted', eventId: result.eventId }, { status, headers })
    }

    return NextResponse.json(
      { outcome: result.outcome, error: MESSAGE_BY_OUTCOME[result.outcome] ?? 'No disponible.' },
      { status, headers },
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_public_events_route' } })

    return NextResponse.json({ error: MESSAGE_BY_OUTCOME.error }, { status: 503, headers })
  }
}
