import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { reviewAndMaybeApplyExpenseDistributionSuggestion } from '@/lib/finance/expense-distribution-intelligence'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.expense_distribution.ai_suggestions.review', 'update', 'tenant')) {
    return NextResponse.json({ error: 'No tienes permiso para revisar sugerencias de distribución.' }, { status: 403 })
  }

  if (!tenant.userId) {
    return NextResponse.json({ error: 'No pudimos identificar el usuario revisor.' }, { status: 401 })
  }

  try {
    const { suggestionId } = await params
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const decision = normalizeString(body.decision)

    if (decision !== 'approved' && decision !== 'rejected') {
      throw new FinanceValidationError('decision debe ser approved o rejected.', 400)
    }

    const result = await reviewAndMaybeApplyExpenseDistributionSuggestion({
      suggestionId,
      decision,
      actorUserId: tenant.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
