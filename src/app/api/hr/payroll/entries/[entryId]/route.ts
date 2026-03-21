import { NextResponse } from 'next/server'

import { recalculatePayrollEntry } from '@/lib/payroll/recalculate-entry'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { normalizeNullableString, parsePayrollNumber } from '@/lib/payroll/shared'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { entryId } = await params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await recalculatePayrollEntry({
      entryId,
      input: {
        bonusOtdAmount:
          body.bonusOtdAmount === undefined ? undefined : parsePayrollNumber(body.bonusOtdAmount, 'bonusOtdAmount', { min: 0 }) ?? undefined,
        bonusRpaAmount:
          body.bonusRpaAmount === undefined ? undefined : parsePayrollNumber(body.bonusRpaAmount, 'bonusRpaAmount', { min: 0 }) ?? undefined,
        bonusOtherAmount:
          body.bonusOtherAmount === undefined
            ? undefined
            : parsePayrollNumber(body.bonusOtherAmount, 'bonusOtherAmount', { min: 0 }) ?? undefined,
        bonusOtherDescription: body.bonusOtherDescription === undefined ? undefined : normalizeNullableString(body.bonusOtherDescription),
        chileTaxAmount:
          body.chileTaxAmount === undefined
            ? undefined
            : parsePayrollNumber(body.chileTaxAmount, 'chileTaxAmount', { allowNull: true, min: 0 }),
        manualOverride: body.manualOverride === undefined ? undefined : Boolean(body.manualOverride),
        manualOverrideNote: body.manualOverrideNote === undefined ? undefined : normalizeNullableString(body.manualOverrideNote),
        netTotal: body.netTotal === undefined ? undefined : parsePayrollNumber(body.netTotal, 'netTotal', { min: 0 }) ?? undefined,
        kpiOtdPercent:
          body.kpiOtdPercent === undefined
            ? undefined
            : parsePayrollNumber(body.kpiOtdPercent, 'kpiOtdPercent', { allowNull: true, min: 0, max: 100 }),
        kpiRpaAvg:
          body.kpiRpaAvg === undefined
            ? undefined
            : parsePayrollNumber(body.kpiRpaAvg, 'kpiRpaAvg', { allowNull: true, min: 0 }),
        kpiTasksCompleted:
          body.kpiTasksCompleted === undefined
            ? undefined
            : parsePayrollNumber(body.kpiTasksCompleted, 'kpiTasksCompleted', {
                allowNull: true,
                integer: true,
                min: 0
              }),
        kpiDataSource:
          body.kpiDataSource === 'manual'
            ? 'manual'
            : body.kpiDataSource === 'ico'
              ? 'ico'
              : body.kpiDataSource === 'notion_ops'
                ? 'notion_ops'
                : undefined
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to update payroll entry.')
  }
}
