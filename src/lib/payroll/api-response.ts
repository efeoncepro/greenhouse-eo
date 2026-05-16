import { NextResponse } from 'next/server'

import { captureWithDomain } from '@/lib/observability/capture'
import { PayrollValidationError } from '@/lib/payroll/shared'

/**
 * TASK-729 — Canonical error response for payroll API routes.
 *
 * Si el error es un `PayrollValidationError` (input/business rule conocido), retorna 4xx
 * sin loggear a Sentry — esos no son incidentes, son flujos esperados.
 *
 * Si NO es un PayrollValidationError, captura via `captureWithDomain(err, 'payroll', ...)`
 * con tag de dominio para que aparezca filtrable en el módulo Payroll del Reliability
 * Control Plane. Con eso, los handlers `calculate`, `approve`, `close` y cualquier otro
 * route de payroll que use este helper quedan instrumentados sin duplicar código.
 *
 * Pasar `extra` para enriquecer el contexto del incident (periodId, actorUserId, etc.).
 */
export const toPayrollErrorResponse = (
  error: unknown,
  fallbackMessage = 'Payroll request failed.',
  extra?: Record<string, unknown>
) => {
  if (error instanceof PayrollValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code ?? null,
        details: error.details ?? null
      },
      { status: error.statusCode }
    )
  }

  captureWithDomain(error, 'payroll', {
    level: 'error',
    extra: {
      fallbackMessage,
      ...(extra ?? {})
    }
  })

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}
