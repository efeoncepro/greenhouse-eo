import { NextResponse } from 'next/server'

import { listSignals } from '@/lib/finance/external-cash-signals'
import type { ExternalCashSignalResolutionStatus } from '@/lib/finance/external-cash-signals'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const VALID_STATUSES: Array<ExternalCashSignalResolutionStatus | 'all'> = [
  'all',
  'unresolved',
  'resolved_high_confidence',
  'resolved_low_confidence',
  'adopted',
  'superseded',
  'dismissed'
]

/**
 * TASK-708 Slice 6 — Admin queue de external_cash_signals.
 *
 * Lista paginada con counts agregados para los KPI cards. Solo lectura;
 * adopcion/descarte viven en `[id]/adopt` y `[id]/dismiss`.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const statusParam = normalizeString(searchParams.get('status') || 'unresolved') as ExternalCashSignalResolutionStatus | 'all'
    const status = VALID_STATUSES.includes(statusParam) ? statusParam : 'unresolved'
    const sourceSystem = normalizeString(searchParams.get('sourceSystem') || '') || null
    const spaceId = normalizeString(searchParams.get('spaceId') || '') || null
    const search = normalizeString(searchParams.get('search') || '') || null
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '50')))
    const offset = Math.max(0, Number(searchParams.get('offset') || '0'))

    const result = await listSignals({ status, sourceSystem, spaceId, search, limit, offset })

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    captureWithDomain(error, 'finance', { tags: { source: 'finance_admin', op: 'external_signals_list' } })

    return NextResponse.json({ error: 'Error al cargar señales externas.' }, { status: 500 })
  }
}
