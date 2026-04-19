import { NextResponse } from 'next/server'

import type { DriftSeverity } from '@/lib/commercial-intelligence/contracts'
import {
  getFinanceContractDetail,
  listContractProfitabilitySnapshots
} from '@/lib/commercial/contracts-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const ALLOWED_SEVERITIES: ReadonlySet<DriftSeverity> = new Set(['aligned', 'warning', 'critical'])

const parseIntParam = (value: string | null): number | null => {
  if (!value) return null

  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const contract = await getFinanceContractDetail({
    tenant,
    contractId: id
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const periodYear = parseIntParam(searchParams.get('periodYear'))
  const periodMonth = parseIntParam(searchParams.get('periodMonth'))
  const severityParam = searchParams.get('driftSeverity')

  const driftSeverity = severityParam && ALLOWED_SEVERITIES.has(severityParam as DriftSeverity)
    ? (severityParam as DriftSeverity)
    : null

  const items = await listContractProfitabilitySnapshots({
    tenant,
    contractId: contract.contractId,
    periodYear,
    periodMonth,
    driftSeverity
  })

  return NextResponse.json({ items, count: items.length })
}
