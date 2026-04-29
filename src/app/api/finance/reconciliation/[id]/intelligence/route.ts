import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import {
  generateReconciliationSuggestions,
  getReconciliationIntelligenceScope,
  listCurrentReconciliationSuggestions
} from '@/lib/finance/reconciliation-intelligence'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

import type { ReconciliationIntelligenceMode } from '@/lib/finance/reconciliation-intelligence'

export const dynamic = 'force-dynamic'

const INTELLIGENCE_MODES = new Set<string>(['statement_rows', 'drift', 'closure_review', 'import_mapping'])

const parseIntelligenceMode = (value: unknown): ReconciliationIntelligenceMode => {
  const normalized = normalizeString(value) || 'statement_rows'

  if (!INTELLIGENCE_MODES.has(normalized)) {
    throw new FinanceValidationError('Modo de inteligencia de conciliacion no soportado.', 400)
  }

  return normalized as ReconciliationIntelligenceMode
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.reconciliation.ai_suggestions.read', 'read', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para ver sugerencias asistidas.' }, { status: 403 })
  }

  try {
    const { id: periodId } = await params
    const scope = await getReconciliationIntelligenceScope(periodId)
    const suggestions = await listCurrentReconciliationSuggestions(periodId)

    return NextResponse.json({
      enabled: process.env.FINANCE_RECONCILIATION_AI_ENABLED === 'true',
      periodId: scope.periodId,
      accountId: scope.accountId,
      spaceId: scope.spaceId,
      suggestions
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.reconciliation.ai_suggestions.generate', 'create', 'space')) {
    return NextResponse.json({ error: 'No tienes permiso para generar sugerencias asistidas.' }, { status: 403 })
  }

  try {
    const { id: periodId } = await params
    const body = await request.json().catch(() => ({}))
    const mode = parseIntelligenceMode(body.mode)

    const result = await generateReconciliationSuggestions({
      periodId,
      mode,
      actorUserId: tenant.userId || null,
      forceRefresh: body.forceRefresh === true
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
