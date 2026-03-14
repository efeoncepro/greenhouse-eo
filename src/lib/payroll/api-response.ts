import { NextResponse } from 'next/server'

import { PayrollValidationError } from '@/lib/payroll/shared'

export const toPayrollErrorResponse = (error: unknown, fallbackMessage = 'Payroll request failed.') => {
  if (error instanceof PayrollValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null
      },
      { status: error.statusCode }
    )
  }

  console.error(fallbackMessage, error)

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
