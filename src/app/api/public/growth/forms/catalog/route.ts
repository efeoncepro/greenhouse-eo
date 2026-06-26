import { NextResponse } from 'next/server'

import { resolveExternalFormCatalog } from '@/lib/growth/forms/commands'
import { isFormsCatalogApiEnabled } from '@/lib/growth/forms/flags'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1258 — `GET /api/public/growth/forms/catalog` (catálogo externo de forms insertables).
 *
 * Precondición backend de TASK-1259: un reader, muchos consumers (plugin WordPress,
 * Nexa/MCP, futuros hosts). Devuelve SOLO metadata editor-safe (displayName, slug,
 * versión publicada, surfaces, destinationReadiness) — NUNCA GUIDs HubSpot, property
 * names, mapping ni secretos.
 *
 * Auth (Opción A, decisión Safety): credencial per-site = embed key de la surface +
 * origin allowlist. El secreto se presenta server-side por el plugin (header
 * `x-greenhouse-embed-key`); NUNCA debe venir del browser. Gateado por
 * `GROWTH_FORMS_CATALOG_API_ENABLED` (default OFF → 404). SIN sesión.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isFormsCatalogApiEnabled()) {
    return NextResponse.json({ error: 'No disponible.' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const surfaceId = searchParams.get('surfaceId')
  const embedKeySecret = request.headers.get('x-greenhouse-embed-key')
  const origin = request.headers.get('origin')

  try {
    const result = await resolveExternalFormCatalog({ surfaceId, embedKeySecret, origin })

    if (!result.ok) {
      // missing_credentials ⇒ 400 (falta input); unauthorized ⇒ 401 (genérico, anti-enumeración).
      const status = result.reason === 'missing_credentials' ? 400 : 401

      return NextResponse.json({ error: 'No autorizado.' }, { status })
    }

    return NextResponse.json({ items: result.entries, total: result.entries.length }, { status: 200 })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_external_catalog_route' } })

    return NextResponse.json({ error: 'No fue posible cargar el catálogo.' }, { status: 502 })
  }
}
