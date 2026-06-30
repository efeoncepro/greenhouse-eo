import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { createHostSurface } from '@/lib/growth/forms/commands'
import { SURFACE_KINDS, type SurfaceKind } from '@/lib/growth/forms/contracts'
import { listHostSurfacesAdmin } from '@/lib/growth/forms/readers'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1229 — `/api/admin/growth/forms/surfaces` — host surfaces (WordPress/Astro/
 * Next). GET lista (capability `growth.forms.read`); POST crea (capability
 * `growth.forms.surfaces.manage`).
 */
export const dynamic = 'force-dynamic'

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

export async function GET() {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.read' } })
  }

  try {
    const items = await listHostSurfacesAdmin()

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_surfaces', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.forms.surfaces.manage', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.forms.surfaces.manage' } })
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return canonicalErrorResponse('growth_form_invalid_input')
  }

  const surfaceKind = typeof body.surfaceKind === 'string' ? body.surfaceKind : ''
  const surfaceName = typeof body.surfaceName === 'string' ? body.surfaceName : ''

  if (!SURFACE_KINDS.includes(surfaceKind as SurfaceKind) || !surfaceName) {
    return canonicalErrorResponse('growth_form_invalid_input')
  }

  try {
    const surface = await createHostSurface({
      surfaceKind,
      surfaceName,
      originAllowlist: asStringArray(body.originAllowlist),
      allowedFormSlugs: asStringArray(body.allowedFormSlugs),
      rendererChannel: typeof body.rendererChannel === 'string' ? body.rendererChannel : undefined,
      cspRequirements: body.cspRequirements,
    })

    return NextResponse.json({ surfaceId: surface.surface_id }, { status: 201 })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_admin_surfaces', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
