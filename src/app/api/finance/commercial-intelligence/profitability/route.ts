import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { listProfitabilitySnapshots } from '@/lib/commercial-intelligence/intelligence-store'
import type { DriftSeverity } from '@/lib/commercial-intelligence/contracts'

export const dynamic = 'force-dynamic'

const ALLOWED_SEVERITIES: ReadonlySet<DriftSeverity> = new Set(['aligned', 'warning', 'critical'])

const parseIntParam = (value: string | null): number | null => {
  if (!value) return null

  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : null
}

/**
 * TASK-351 — GET /api/finance/commercial-intelligence/profitability
 *
 * Returns tenant-scoped profitability snapshots by period + quote.
 *
 * Query: ?periodYear=YYYY&periodMonth=MM&quotationId=...&driftSeverity=critical|warning|aligned&clientId=...
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const periodYear = parseIntParam(searchParams.get('periodYear'))
  const periodMonth = parseIntParam(searchParams.get('periodMonth'))
  const quotationId = searchParams.get('quotationId')
  const severityParam = searchParams.get('driftSeverity')
  const clientIdFilter = searchParams.get('clientId')

  const driftSeverity = severityParam && ALLOWED_SEVERITIES.has(severityParam as DriftSeverity)
    ? (severityParam as DriftSeverity)
    : null

  const isInternal = tenant.tenantType === 'efeonce_internal'

  const items = await listProfitabilitySnapshots({
    clientId: isInternal ? clientIdFilter || null : tenant.clientId,
    spaceId: tenant.spaceId ?? null,
    quotationId: quotationId || null,
    periodYear,
    periodMonth,
    driftSeverity
  })

  return NextResponse.json({ items, count: items.length })
}
