import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { FinanceValidationError } from '@/lib/finance/shared'

interface DismissSignalInput {
  signalId: string
  actorUserId: string
  reason: string
}

export interface DismissSignalResult {
  signalId: string
  status: 'dismissed'
}

/**
 * TASK-708 — Descarta una signal documentando que no hay cash real correspondiente.
 *
 * Reglas duras:
 *   - razon obligatoria, minimo 8 caracteres (audit-grade).
 *   - signal debe estar en estado descartable (unresolved/resolved_*).
 *   - rechazar si ya fue `adopted` (no se puede descartar lo que ya creo cash).
 *   - solo marca el row; preserva audit (no DELETE).
 */
export const dismissSignal = async (input: DismissSignalInput): Promise<DismissSignalResult> => {
  const reason = input.reason?.trim() ?? ''

  if (reason.length < 8) {
    throw new FinanceValidationError('La razon de descarte debe tener al menos 8 caracteres.', 400)
  }

  const updated = await runGreenhousePostgresQuery<{ signal_id: string; account_resolution_status: string }>(
    `
      UPDATE greenhouse_finance.external_cash_signals
      SET account_resolution_status = 'dismissed',
          superseded_at = NOW(),
          superseded_reason = $1,
          resolved_by_user_id = $2,
          updated_at = NOW()
      WHERE signal_id = $3
        AND account_resolution_status NOT IN ('adopted', 'dismissed', 'superseded')
      RETURNING signal_id, account_resolution_status
    `,
    [reason, input.actorUserId, input.signalId]
  )

  if (updated.length === 0) {
    const existing = await runGreenhousePostgresQuery<{ account_resolution_status: string }>(
      `SELECT account_resolution_status FROM greenhouse_finance.external_cash_signals WHERE signal_id = $1 LIMIT 1`,
      [input.signalId]
    )

    if (existing.length === 0) {
      throw new FinanceValidationError(`Signal ${input.signalId} no existe.`, 404)
    }

    throw new FinanceValidationError(
      `Signal ${input.signalId} esta en estado ${existing[0]?.account_resolution_status}, no se puede descartar.`,
      409
    )
  }

  return { signalId: input.signalId, status: 'dismissed' }
}
