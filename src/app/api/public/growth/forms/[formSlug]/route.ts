import { NextResponse } from 'next/server'

import { isFormsPublicApiEnabled } from '@/lib/growth/forms/flags'
import { getPublishedRenderContract } from '@/lib/growth/forms/readers'
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

export async function GET(request: Request, { params }: { params: Promise<{ formSlug: string }> }) {
  if (!isFormsPublicApiEnabled()) {
    return NextResponse.json({ error: 'No disponible.' }, { status: 404 })
  }

  const { formSlug } = await params
  const { searchParams } = new URL(request.url)
  const surfaceId = searchParams.get('surfaceId')
  const origin = request.headers.get('origin')

  try {
    const contract = await getPublishedRenderContract(formSlug, { surfaceId, origin })

    if (!contract) {
      return NextResponse.json({ error: 'Formulario no encontrado.' }, { status: 404 })
    }

    return NextResponse.json(contract, { status: 200 })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_public_render_route' } })

    return NextResponse.json({ error: 'No fue posible cargar el formulario.' }, { status: 502 })
  }
}
