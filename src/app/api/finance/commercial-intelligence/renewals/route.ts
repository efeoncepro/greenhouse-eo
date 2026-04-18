import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listPipelineSnapshots } from '@/lib/commercial-intelligence/intelligence-store'

export const dynamic = 'force-dynamic'

/**
 * TASK-351 — GET /api/finance/commercial-intelligence/renewals
 *
 * Returns quotes that are expiring soon or already expired — tenant-scoped,
 * sorted by expiry date ascending.
 *
 * Query: ?include=renewals|expired|all  (default: renewals)
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const include = searchParams.get('include') ?? 'renewals'
  const clientIdFilter = searchParams.get('clientId')
  const isInternal = tenant.tenantType === 'efeonce_internal'

  const base = {
    clientId: isInternal ? clientIdFilter || null : tenant.clientId,
    spaceId: tenant.spaceId ?? null
  }

  const renewals = include === 'expired' ? [] : await listPipelineSnapshots({ ...base, renewalsDueOnly: true })
  const expired = include === 'renewals' ? [] : await listPipelineSnapshots({ ...base, expiredOnly: true })

  return NextResponse.json({
    renewals: renewals.map(item => ({
      quotationId: item.quotationId,
      status: item.status,
      pipelineStage: item.pipelineStage,
      totalAmountClp: item.totalAmountClp,
      expiryDate: item.expiryDate,
      daysUntilExpiry: item.daysUntilExpiry,
      clientId: item.clientId,
      businessLineCode: item.businessLineCode,
      materializedAt: item.materializedAt
    })),
    expired: expired.map(item => ({
      quotationId: item.quotationId,
      status: item.status,
      totalAmountClp: item.totalAmountClp,
      expiryDate: item.expiryDate,
      expiredAt: item.expiredAt,
      clientId: item.clientId,
      businessLineCode: item.businessLineCode,
      materializedAt: item.materializedAt
    })),
    counts: {
      renewals: renewals.length,
      expired: expired.length
    }
  })
}
