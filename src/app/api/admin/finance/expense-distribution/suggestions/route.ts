import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import {
  generateExpenseDistributionSuggestions,
  isExpenseDistributionAiEnabled,
  listCurrentExpenseDistributionSuggestions
} from '@/lib/finance/expense-distribution-intelligence'
import { listExpenseDistributionReviewQueue } from '@/lib/finance/expense-distribution/repository'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parsePeriodFromUrl = (url: string) => {
  const { searchParams } = new URL(url)
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))
  const limit = Number(searchParams.get('limit') ?? 50)

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new FinanceValidationError('year inválido.', 400)
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new FinanceValidationError('month inválido.', 400)
  }

  return { year, month, limit: Number.isInteger(limit) ? limit : 50 }
}

const parsePeriodFromBody = (body: Record<string, unknown>) => {
  const year = Number(body.year)
  const month = Number(body.month)
  const limit = Number(body.limit ?? 50)

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new FinanceValidationError('year inválido.', 400)
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new FinanceValidationError('month inválido.', 400)
  }

  return { year, month, limit: Number.isInteger(limit) ? limit : 50 }
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.expense_distribution.ai_suggestions.read', 'read', 'tenant')) {
    return NextResponse.json({ error: 'No tienes permiso para ver sugerencias de distribución.' }, { status: 403 })
  }

  try {
    const { year, month, limit } = parsePeriodFromUrl(request.url)

    const [queue, suggestions] = await Promise.all([
      listExpenseDistributionReviewQueue({ period: { year, month }, limit }),
      listCurrentExpenseDistributionSuggestions({ year, month, limit })
    ])

    return NextResponse.json({
      enabled: isExpenseDistributionAiEnabled(),
      year,
      month,
      queue,
      suggestions
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.expense_distribution.ai_suggestions.generate', 'create', 'tenant')) {
    return NextResponse.json({ error: 'No tienes permiso para generar sugerencias de distribución.' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const { year, month, limit } = parsePeriodFromBody(body)
    const forceRefresh = body.forceRefresh === true || normalizeString(body.forceRefresh) === 'true'

    const result = await generateExpenseDistributionSuggestions({
      year,
      month,
      limit,
      actorUserId: tenant.userId || null,
      forceRefresh
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
