import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { FinanceValidationError, assertNonEmptyString, normalizeString } from '@/lib/finance/shared'
import {
  getReconciliationIntelligenceScope,
  reviewReconciliationAiSuggestion
} from '@/lib/finance/reconciliation-intelligence'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.reconciliation.ai_suggestions.review', 'update', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para revisar sugerencias asistidas.' }, { status: 403 })
  }

  if (!tenant.userId) {
    return NextResponse.json({ error: 'No pudimos identificar el usuario que revisa la sugerencia.' }, { status: 401 })
  }

  try {
    const { id: periodId, suggestionId } = await params
    const body = await request.json()
    const decision = normalizeString(body.decision)

    if (decision !== 'accepted' && decision !== 'rejected') {
      throw new FinanceValidationError('decision debe ser accepted o rejected.', 400)
    }

    const rejectionReason = decision === 'rejected' && body.rejectionReason
      ? assertNonEmptyString(body.rejectionReason, 'rejectionReason').slice(0, 500)
      : null

    const scope = await getReconciliationIntelligenceScope(periodId)

    const suggestion = await reviewReconciliationAiSuggestion({
      scope,
      suggestionId,
      decision,
      actorUserId: tenant.userId,
      rejectionReason
    })

    return NextResponse.json({ suggestion })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
