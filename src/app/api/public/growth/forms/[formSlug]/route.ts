import { NextResponse } from 'next/server'

import { publicFormsCorsHeaders, publicFormsOptionsResponse } from '@/app/api/public/growth/forms/cors'
import { isFormsPublicApiEnabled } from '@/lib/growth/forms/flags'
import { getPublishedRenderContractByRef } from '@/lib/growth/forms/readers'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1229 — `GET /api/public/growth/forms/{formSlug}` (render contract público).
 *
 * Devuelve SOLO el `render_contract` browser-safe (sin destination mapping, HubSpot
 * property names/GUIDs, URLs privadas, secrets ni scoring server-only). Valida la
 * surface (origin/slug), no basta el slug. Gateado por `GROWTH_FORMS_PUBLIC_API_ENABLED`
 * (default OFF → 404). SIN sesión.
 */
export const dynamic = 'force-dynamic'

const METHODS = 'GET, OPTIONS'

export function OPTIONS(request: Request) {
  return publicFormsOptionsResponse(request, METHODS)
}

export async function GET(request: Request, { params }: { params: Promise<{ formSlug: string }> }) {
  const headers = await publicFormsCorsHeaders(request, METHODS)

  if (!isFormsPublicApiEnabled()) {
    return NextResponse.json({ error: 'No disponible.' }, { status: 404, headers })
  }

  // `formSlug` es un formRef: acepta slug (alias legacy) o form_key (UUID, identidad estable).
  const { formSlug } = await params
  const { searchParams } = new URL(request.url)
  const surfaceId = searchParams.get('surfaceId')
  const origin = request.headers.get('origin')

  try {
    const contract = await getPublishedRenderContractByRef(formSlug, { surfaceId, origin })

    if (!contract) {
      return NextResponse.json({ error: 'Formulario no encontrado.' }, { status: 404, headers })
    }

    return NextResponse.json(contract, { status: 200, headers })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_public_render_route' } })

    return NextResponse.json({ error: 'No fue posible cargar el formulario.' }, { status: 502, headers })
  }
}
