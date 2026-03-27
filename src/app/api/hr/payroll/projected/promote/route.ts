import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { promoteProjectedPayrollToOfficialDraft } from '@/lib/payroll/promote-projected-payroll'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type PromoteBody = {
  year?: number
  month?: number
  mode?: 'actual_to_date' | 'projected_month_end'
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as PromoteBody
    const session = await getServerSession(authOptions)

    const year = Number(body.year)
    const month = Number(body.month)
    const mode = body.mode === 'actual_to_date' ? 'actual_to_date' : 'projected_month_end'

    if (!Number.isInteger(year) || year < 2024) {
      return NextResponse.json({ error: 'Invalid year.' }, { status: 400 })
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month.' }, { status: 400 })
    }

    const result = await promoteProjectedPayrollToOfficialDraft({
      year,
      month,
      mode,
      actorIdentifier: session?.user?.email || tenant.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to promote projected payroll.')
  }
}
