import { NextResponse } from 'next/server'

import {
  declareReconciliationSnapshot,
  listReconciliationHistory,
  type ReconciliationSourceKind,
  type DriftStatus
} from '@/lib/finance/reconciliation/snapshots'
import { FinanceValidationError, assertNonEmptyString, toNumber } from '@/lib/finance/shared'
import { requireBankTreasuryTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const VALID_SOURCES: readonly ReconciliationSourceKind[] = [
  'cartola_xlsx',
  'officebanking_screenshot',
  'statement_pdf',
  'manual_declaration',
  'api_webhook'
] as const

const VALID_DRIFT_STATUSES: readonly DriftStatus[] = ['open', 'accepted', 'reconciled'] as const

const parseOptionalAmount = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const num = Number(value)

  if (!Number.isFinite(num)) {
    throw new FinanceValidationError('Numeric field must be a valid number.')
  }

  return num
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireBankTreasuryTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')

  if (!accountId) {
    return NextResponse.json({ error: 'accountId query parameter is required' }, { status: 400 })
  }

  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 100)
  const history = await listReconciliationHistory(accountId, limit)

  return NextResponse.json({ snapshots: history })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireBankTreasuryTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const accountId = assertNonEmptyString(body.accountId, 'accountId')
    const snapshotAt = assertNonEmptyString(body.snapshotAt, 'snapshotAt')
    const bankClosingBalance = toNumber(body.bankClosingBalance)
    const sourceKind = assertNonEmptyString(body.sourceKind, 'sourceKind') as ReconciliationSourceKind

    if (!VALID_SOURCES.includes(sourceKind)) {
      throw new FinanceValidationError(`sourceKind must be one of: ${VALID_SOURCES.join(', ')}`)
    }

    const driftStatus = body.driftStatus ? (body.driftStatus as DriftStatus) : undefined

    if (driftStatus && !VALID_DRIFT_STATUSES.includes(driftStatus)) {
      throw new FinanceValidationError(`driftStatus must be one of: ${VALID_DRIFT_STATUSES.join(', ')}`)
    }

    const result = await declareReconciliationSnapshot({
      accountId,
      snapshotAt,
      bankClosingBalance,
      bankAvailableBalance: parseOptionalAmount(body.bankAvailableBalance),
      bankHoldsAmount: parseOptionalAmount(body.bankHoldsAmount),
      bankCreditLimit: parseOptionalAmount(body.bankCreditLimit),
      driftStatus,
      driftExplanation: body.driftExplanation || null,
      sourceKind,
      sourceEvidenceRef: body.sourceEvidenceRef || null,
      declaredByUserId: tenant.userId || null
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    throw error
  }
}
