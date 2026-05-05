import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-759e — Rate limit canonico para self-service resend del recibo de nomina
 * desde `/my/payroll`. NO crea tabla nueva: la fuente de verdad es
 * `greenhouse_payroll.payslip_deliveries` (TASK-759 V2). Cuenta cuantas
 * filas con `delivery_kind='manual_resend'` y `status IN ('queued','sent')`
 * tiene el (entry_id, member_id) en la ventana solicitada.
 *
 * Default: 1 reenvio por hora (rate-limit conservador). Cualquier consumer
 * puede sobrescribir el default con `windowMinutes`.
 *
 * Idempotente y stateless. Sin caches, sin Redis. La unica fuente es la tabla.
 */

export interface AssertCanResendInput {
  memberId: string
  entryId: string
  windowMinutes?: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number | null
  lastResendAt: string | null
}

const DEFAULT_WINDOW_MINUTES = 60

interface RateLimitRow {
  last_resend_at: string | null
  [key: string]: unknown
}

export const checkPayslipResendRateLimit = async (
  input: AssertCanResendInput
): Promise<RateLimitResult> => {
  const windowMinutes = input.windowMinutes ?? DEFAULT_WINDOW_MINUTES

  const rows = await query<RateLimitRow>(
    `SELECT MAX(created_at)::text AS last_resend_at
       FROM greenhouse_payroll.payslip_deliveries
      WHERE entry_id = $1
        AND member_id = $2
        AND delivery_kind = 'manual_resend'
        AND status IN ('queued', 'sent')
        AND created_at > NOW() - ($3 || ' minutes')::interval`,
    [input.entryId, input.memberId, String(windowMinutes)]
  )

  const lastResendAt = rows[0]?.last_resend_at ?? null

  if (!lastResendAt) {
    return { allowed: true, retryAfterSeconds: null, lastResendAt: null }
  }

  const lastMs = new Date(lastResendAt).getTime()
  const windowMs = windowMinutes * 60 * 1000
  const now = Date.now()
  const elapsedMs = now - lastMs
  const retryAfterMs = Math.max(0, windowMs - elapsedMs)

  return {
    allowed: false,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    lastResendAt
  }
}
