import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { authorDraftCta } from '@/lib/growth/ctas/commands'
import { listCtasAdmin } from '@/lib/growth/ctas/readers'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1339 — `GET/POST /api/admin/growth/ctas` (plano de gobernanza, Full API Parity).
 *
 * GET  → lista de CTAs (capability `growth.cta.read`).
 * POST → autora una versión draft (capability `growth.cta.author`; command puro —
 *        apto para el loop `propose → confirm → execute`: este endpoint ES la
 *        confirmación humana/autorizada; el LLM nunca muta directo).
 * Gateado por `GROWTH_CTA_ENGINE_ENABLED` (default OFF → 404 canónico).
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'growth.cta.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.cta.read' } })
  }

  try {
    const items = await listCtasAdmin()

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_admin_list', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  // TASK-1430: autorar un draft no expone nada público — no se gatea por el engine
  // flag (los drafts no se arbitran; publish/pause siguen gated por lifecycle).
  if (!can(tenant, 'growth.cta.author', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'growth.cta.author' } })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return canonicalErrorResponse('growth_cta_invalid_input')
  }

  if (!body || typeof body !== 'object') return canonicalErrorResponse('growth_cta_invalid_input')

  try {
    const input = body as Parameters<typeof authorDraftCta>[0]

    const result = await authorDraftCta({ ...input, createdBy: tenant.userId ?? null })

    if (!result.ok) {
      return canonicalErrorResponse('growth_cta_invalid_input', { extra: { details: result.details } })
    }

    return NextResponse.json(
      { ctaId: result.ctaId, ctaVersionId: result.ctaVersionId, version: result.version },
      { status: 201 },
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_cta_admin_author', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
