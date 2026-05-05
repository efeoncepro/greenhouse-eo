import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-784 Slice 7 — Reliability signal:
 * Active members en payroll Chile dependent SIN CL_RUT verificado.
 *
 * Bloquea emision formal de finiquito. Steady state esperado = 0 cuando todos
 * los members tienen su documento verificado. Backfill legacy genera filas
 * pending_review (no verified), que esta query cuenta.
 */

export const IDENTITY_LEGAL_PROFILE_PAYROLL_BLOCKING_SIGNAL_ID =
  'identity.legal_profile.payroll_chile_blocking_finiquito'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.members m
  WHERE m.active = TRUE
    AND COALESCE(m.pay_regime, 'chile') = 'chile'
    AND m.identity_profile_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_core.person_identity_documents d
      WHERE d.profile_id = m.identity_profile_id
        AND d.document_type = 'CL_RUT'
        AND d.country_code = 'CL'
        AND d.verification_status = 'verified'
    )
`

export const getIdentityLegalProfilePayrollBlockingSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number; [key: string]: unknown }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_LEGAL_PROFILE_PAYROLL_BLOCKING_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getIdentityLegalProfilePayrollBlockingSignal',
      label: 'Members Chile activos sin CL_RUT verificado',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todos los members payroll Chile dependent activos tienen CL_RUT verificado.'
          : `${count} member${count === 1 ? '' : 's'} payroll Chile dependent sin CL_RUT verificado — bloquea emision formal de finiquito. Run scripts/identity/coverage-audit.ts para detalle.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'See identity-legal-profile-payroll-blocking.ts'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_identity_legal_profile_payroll_blocking' }
    })

    return {
      signalId: IDENTITY_LEGAL_PROFILE_PAYROLL_BLOCKING_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getIdentityLegalProfilePayrollBlockingSignal',
      label: 'Members Chile activos sin CL_RUT verificado',
      severity: 'unknown',
      summary: 'No fue posible leer el signal.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
