import { NextResponse } from 'next/server'

import { revokeQuoteShortLink } from '@/lib/finance/quote-share/short-link'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'
import { can } from '@/lib/entitlements/runtime'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/finance/quotes/[id]/share/[shortCode]
 *
 * Soft-revoke a short link. Body: { reason?: string }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; shortCode: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-1202 — gate fino de accion (capability != route-group).
  if (!can(tenant, 'commercial.quotation', 'export', 'tenant')) {
    return NextResponse.json({ error: 'No tienes permiso para revocar el compartido de una cotizacion.', code: 'forbidden' }, { status: 403 })
  }

  const { shortCode } = await params

  const body = (await request.json().catch(() => ({}))) as { reason?: string }

  const link = await revokeQuoteShortLink({
    shortCode,
    revokedBy: tenant.userId,
    reason: body.reason ?? null
  })

  if (!link) {
    return NextResponse.json({ error: 'Short link not found' }, { status: 404 })
  }

  return NextResponse.json({
    shortCode: link.shortCode,
    revokedAt: link.revokedAt,
    revokedBy: link.revokedBy,
    revocationReason: link.revocationReason
  })
}
