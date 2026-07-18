import { NextResponse } from 'next/server'

import { publicCtasCorsHeaders, publicCtasOptionsResponse } from '@/app/api/public/growth/ctas/cors'
import { getArbitratedRenderContracts } from '@/lib/growth/ctas/readers'
import { recordServerErrorEventOncePerDay } from '@/lib/growth/ctas/store'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1339 — `GET /api/public/growth/ctas/render` (render contract arbitrado).
 *
 * El renderer pregunta "¿qué se muestra en esta surface + ruta?" y recibe el
 * resultado YA resuelto server-side: 0–1 interruptivo + N no-interruptivos,
 * browser-safe (arch §11 — nunca el candidate set ni la política). Autoriza por
 * surface binding + embed key (header `x-greenhouse-cta-embed-key`) + origin.
 * Gateado por `GROWTH_CTA_ENGINE_ENABLED` (default OFF → 404). SIN sesión.
 */
export const dynamic = 'force-dynamic'

const METHODS = 'GET, OPTIONS'

export function OPTIONS(request: Request) {
  return publicCtasOptionsResponse(request, METHODS)
}

export async function GET(request: Request) {
  const headers = await publicCtasCorsHeaders(request, METHODS)

  const { searchParams } = new URL(request.url)
  const surfaceId = searchParams.get('surfaceId')
  const route = searchParams.get('route')
  const embedKey = request.headers.get('x-greenhouse-cta-embed-key')
  const origin = request.headers.get('origin')

  if (!surfaceId || !route) {
    return NextResponse.json({ error: 'Faltan parámetros de la surface.' }, { status: 400, headers })
  }

  try {
    const resolved = await getArbitratedRenderContracts({ surfaceId, embedKey, origin, route })

    if (resolved.outcome === 'disabled') {
      return NextResponse.json({ error: 'No disponible.' }, { status: 404, headers })
    }

    if (resolved.outcome === 'surface_unauthorized') {
      return NextResponse.json({ error: 'Surface no autorizada.' }, { status: 403, headers })
    }

    return NextResponse.json(resolved.result, { status: 200, headers })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_public_render_route' } })

    // Breadcrumb PG best-effort (dedupe 1/día): fuente del signal growth.cta.render_error_rate.
    try {
      await recordServerErrorEventOncePerDay({ ctaId: null, ctaVersionId: null, surfaceId: null, reason: 'render_error' })
    } catch {
      // Sentry ya capturó el error primario; el breadcrumb jamás rompe la respuesta.
    }

    return NextResponse.json({ error: 'No fue posible resolver los CTAs.' }, { status: 502, headers })
  }
}
