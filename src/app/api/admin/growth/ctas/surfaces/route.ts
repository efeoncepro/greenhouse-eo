import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { registerCtaSurface, rotateCtaSurfaceEmbedKey } from '@/lib/growth/ctas/commands'
import { CTA_SURFACE_KINDS, type CtaSurfaceKind } from '@/lib/growth/ctas/contracts'
import { isCtaEngineEnabled } from '@/lib/growth/ctas/flags'
import { listCtaSurfacesAdmin } from '@/lib/growth/ctas/readers'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1339 — `GET/POST /api/admin/growth/ctas/surfaces` (surface bindings + embed keys).
 *
 * GET  → lista (capability `growth.cta.read`; NUNCA expone el hash de la credencial).
 * POST → `{ action: 'register', ... }` o `{ action: 'rotate_embed_key', surfaceId }`
 *        (capability `growth.cta.publish` — gestionar surfaces es gobernanza de
 *        publicación). El secreto se devuelve UNA sola vez en la respuesta.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!isCtaEngineEnabled()) return canonicalErrorResponse('growth_cta_engine_disabled')

  if (!can(tenant, 'growth.cta.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.cta.read' } })
  }

  try {
    const items = await listCtaSurfacesAdmin()

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_admin_surfaces', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!isCtaEngineEnabled()) return canonicalErrorResponse('growth_cta_engine_disabled')

  if (!can(tenant, 'growth.cta.publish', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.cta.publish' } })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return canonicalErrorResponse('growth_cta_invalid_input')
  }

  const payload = (body ?? {}) as {
    action?: string
    surfaceId?: string
    surfaceKind?: string
    surfaceName?: string
    originAllowlist?: unknown
    allowedCtaSlugs?: unknown
  }

  try {
    if (payload.action === 'rotate_embed_key') {
      if (!payload.surfaceId) return canonicalErrorResponse('growth_cta_invalid_input')

      const result = await rotateCtaSurfaceEmbedKey(payload.surfaceId)

      if (!result.ok) return canonicalErrorResponse('growth_cta_not_found')

      return NextResponse.json({
        surfaceId: payload.surfaceId,
        embedKeyId: result.embedKeyId,
        embedKeySecret: result.embedKeySecret,
      })
    }

    if (payload.action === 'register') {
      const origins = Array.isArray(payload.originAllowlist)
        ? payload.originAllowlist.filter((item): item is string => typeof item === 'string')
        : []

      const slugs = Array.isArray(payload.allowedCtaSlugs)
        ? payload.allowedCtaSlugs.filter((item): item is string => typeof item === 'string')
        : []

      if (
        !payload.surfaceKind ||
        !(CTA_SURFACE_KINDS as readonly string[]).includes(payload.surfaceKind) ||
        !payload.surfaceName ||
        origins.length === 0
      ) {
        return canonicalErrorResponse('growth_cta_invalid_input')
      }

      const result = await registerCtaSurface({
        surfaceKind: payload.surfaceKind as CtaSurfaceKind,
        surfaceName: payload.surfaceName,
        originAllowlist: origins,
        allowedCtaSlugs: slugs,
      })

      return NextResponse.json(
        { surfaceId: result.surfaceId, embedKeyId: result.embedKeyId, embedKeySecret: result.embedKeySecret },
        { status: 201 },
      )
    }

    return canonicalErrorResponse('growth_cta_invalid_input')
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_admin_surfaces', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
