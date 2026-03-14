import { NextResponse } from 'next/server'

import { getPayrollPeriod, updatePayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { normalizeNullableString, parsePayrollNumber } from '@/lib/payroll/shared'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { periodId } = await params
    const period = await getPayrollPeriod(periodId)

    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })
    }

    return NextResponse.json(period)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load payroll period.')
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { periodId } = await params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await updatePayrollPeriod(periodId, {
      ufValue:
        body.ufValue === undefined ? undefined : parsePayrollNumber(body.ufValue, 'ufValue', { allowNull: true, min: 0 }),
      taxTableVersion: body.taxTableVersion === undefined ? undefined : normalizeNullableString(body.taxTableVersion),
      notes: body.notes === undefined ? undefined : normalizeNullableString(body.notes)
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to update payroll period.')
  }
}
