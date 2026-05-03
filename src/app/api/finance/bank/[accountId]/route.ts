import { NextResponse } from 'next/server'

import {
  closeAccountBalancePeriod,
  getBankAccountDetail
} from '@/lib/finance/account-balances'
import { FinanceValidationError } from '@/lib/finance/shared'
import type { TemporalMode } from '@/lib/finance/instrument-presentation'
import { resolveTemporalWindow } from '@/lib/finance/temporal-window'
import { requireBankTreasuryTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const VALID_TEMPORAL_MODES: readonly TemporalMode[] = ['snapshot', 'period', 'audit']

const parsePositiveInteger = (value: unknown, fieldName: string) => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new FinanceValidationError(`${fieldName} must be a positive integer.`)
  }

  return parsed
}

const parseTemporalMode = (value: string | null): TemporalMode | null => {
  if (!value) return null

  if ((VALID_TEMPORAL_MODES as readonly string[]).includes(value)) {
    return value as TemporalMode
  }

  throw new FinanceValidationError(
    `mode must be one of: ${VALID_TEMPORAL_MODES.join(', ')}. Received: ${value}`
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { tenant, errorResponse } = await requireBankTreasuryTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { accountId } = await params
    const url = new URL(request.url)
    const yearParam = url.searchParams.get('year')
    const monthParam = url.searchParams.get('month')
    const year = yearParam ? parsePositiveInteger(yearParam, 'year') : null
    const month = monthParam ? parsePositiveInteger(monthParam, 'month') : null

    // TASK-776 — temporal mode contract canonico.
    // - Si caller envia ?mode=snapshot|period|audit → resuelve ventana via helper.
    // - Si NO envia mode pero envia year+month → backward compat (mode='period').
    // - Si NO envia ninguno → caller (drawer) hereda el default declarativo
    //   del profile via instrument-presentation.ts; este endpoint NO asume.
    const modeParam = parseTemporalMode(url.searchParams.get('mode'))
    const windowDaysParam = url.searchParams.get('windowDays')
    const windowDays = windowDaysParam ? parsePositiveInteger(windowDaysParam, 'windowDays') : undefined
    const anchorDateParam = url.searchParams.get('anchorDate')
    const anchorDate = anchorDateParam && /^\d{4}-\d{2}-\d{2}$/.test(anchorDateParam) ? anchorDateParam : null

    let movementsWindow: { fromDate: string; toDate: string; mode: TemporalMode; label: string } | undefined

    if (modeParam) {
      const resolved = resolveTemporalWindow({
        mode: modeParam,
        year: year ?? undefined,
        month: month ?? undefined,
        anchorDate,
        windowDays
      })

      movementsWindow = {
        fromDate: resolved.fromDate,
        toDate: resolved.toDate,
        mode: resolved.modeResolved,
        label: resolved.label
      }
    }

    // TASK-705 — pure read path:
    // - materialize: 'skip' (NO recomputar inline; lanes reactivas mantienen snapshots).
    // - historySource: 'monthly_read_model' (lee account_balances_monthly precomputed).
    // El response incluye freshness.isStale=true cuando el snapshot es viejo;
    // la UI muestra banner "Actualizado hace X" sin disparar recompute síncrono.
    const detail = await getBankAccountDetail({
      accountId,
      year,
      month,
      actorUserId: tenant.userId || null,
      materialize: 'skip',
      historySource: 'monthly_read_model',
      movementsWindow
    })

    // TASK-776 — echo back de la ventana usada (para chip header del drawer).
    // Si caller no envió mode, refleja el period del overview (legacy behavior).
    const responseWithWindow = {
      ...detail,
      movementsWindow: movementsWindow ?? {
        fromDate: detail.currentBalance.balanceDate, // approximate fallback
        toDate: detail.currentBalance.balanceDate,
        mode: 'period' as TemporalMode,
        label: 'Período actual'
      }
    }

    return NextResponse.json(responseWithWindow)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { tenant, errorResponse } = await requireBankTreasuryTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { accountId } = await params
    const body = await request.json()

    if (body?.action !== 'close-period') {
      throw new FinanceValidationError('Unsupported action for treasury account detail route.', 400)
    }

    const year = parsePositiveInteger(body.year, 'year')
    const month = parsePositiveInteger(body.month, 'month')

    const balance = await closeAccountBalancePeriod({
      accountId,
      year,
      month,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json({
      accountId,
      closed: true,
      balance
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
