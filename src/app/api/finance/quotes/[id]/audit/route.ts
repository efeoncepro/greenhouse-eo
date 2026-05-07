import { NextResponse } from 'next/server'

import { listQuotationAudit } from '@/lib/commercial/governance/audit-log'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const limitParam = Number(searchParams.get('limit') ?? '200')
  const limit = Number.isFinite(limitParam) ? Math.min(500, Math.max(1, limitParam)) : 200

  const entries = await listQuotationAudit({
    quotationId: identity.quotationId,
    limit
  })

  return NextResponse.json({
    quotationId: identity.quotationId,
    items: entries,
    total: entries.length
  })
}
