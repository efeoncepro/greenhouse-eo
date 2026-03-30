import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { runPayrollAutoCalculation } from '@/lib/payroll/auto-calculate-payroll'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const result = await runPayrollAutoCalculation()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await alertCronFailure('payroll-auto-calculate', error).catch(() => {})

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
