import { NextResponse } from 'next/server'

import { createPayrollPeriod, listPayrollPeriods } from '@/lib/payroll/get-payroll-periods'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { normalizeNullableString, parsePayrollNumber } from '@/lib/payroll/shared'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await listPayrollPeriods()

    return NextResponse.json(data)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load payroll periods.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const created = await createPayrollPeriod({
      year: parsePayrollNumber(body.year, 'year', { integer: true, min: 2024 }) ?? 0,
      month: parsePayrollNumber(body.month, 'month', { integer: true, min: 1, max: 12 }) ?? 0,
      ufValue: parsePayrollNumber(body.ufValue, 'ufValue', { allowNull: true, min: 0 }),
      taxTableVersion: normalizeNullableString(body.taxTableVersion),
      notes: normalizeNullableString(body.notes)
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to create payroll period.')
  }
}
