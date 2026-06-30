import 'server-only'

/**
 * TASK-1229 — Growth Forms engine · reliability signals (prefijo `growth.forms.*`).
 *
 * 3 signals desde el motor (ventana 1 día salvo dead-letter, que es de estado vigente):
 *  - dead_letter_count: attempts REALES agotados y NO resueltos (steady=0; cualquier >0 = error →
 *    humano). SSOT en `countDeadLetterAttempts` (excluye el adapter de test + los ya resueltos por
 *    un `succeeded` posterior); ver store.ts. NO es un COUNT crudo de por vida (append-only TASK-1229);
 *  - destination_failure_rate: submissions cuya entrega falló (posture);
 *  - submission_rejection_rate: submissions rechazadas (honeypot/consent/surface) —
 *    rechazar es comportamiento de seguridad esperado (steady ok).
 * DB vacía / sin forms publicados → steady ok. Error de lectura → severity unknown.
 */
import { countDeadLetterAttempts } from '@/lib/growth/forms/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_FORMS_DEAD_LETTER_SIGNAL_ID = 'growth.forms.dead_letter_count'
export const GROWTH_FORMS_DESTINATION_FAILURE_SIGNAL_ID = 'growth.forms.destination_failure_rate'
export const GROWTH_FORMS_SUBMISSION_REJECTION_SIGNAL_ID = 'growth.forms.submission_rejection_rate'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthFormsSignals'

export const getGrowthFormsSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    // SSOT del conteo de dead-letters vigentes (real + no-resuelto, excluye fixtures de test).
    // Ver `countDeadLetterAttempts` en growth/forms/store.ts (append-only TASK-1229).
    const deadLetters = await countDeadLetterAttempts()

    const submissionRows = await runGreenhousePostgresQuery<{ total: number; failed: number; rejected: number }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('destination_failed', 'dead_letter'))::int AS failed,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
       FROM greenhouse_growth.form_submission
       WHERE created_at > NOW() - INTERVAL '1 day'`,
    )

    const total = Number(submissionRows[0]?.total ?? 0)
    const failed = Number(submissionRows[0]?.failed ?? 0)
    const rejected = Number(submissionRows[0]?.rejected ?? 0)

    return [
      {
        signalId: GROWTH_FORMS_DEAD_LETTER_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'dead_letter',
        source: SOURCE,
        label: 'Entregas de formularios en dead-letter (Growth Forms)',
        severity: deadLetters > 0 ? 'error' : 'ok',
        summary:
          deadLetters === 0
            ? 'Sin entregas en dead-letter.'
            : `${deadLetters} entrega(s) agotaron reintentos — requieren intervención humana.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'dead_letters', value: String(deadLetters) }],
      },
      {
        signalId: GROWTH_FORMS_DESTINATION_FAILURE_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: SOURCE,
        label: 'Entregas de formularios fallidas en 24 h (Growth Forms)',
        severity: failed > 0 ? 'warning' : 'ok',
        summary:
          total === 0
            ? 'Sin submissions en 24 h (esperado pre-launch).'
            : `${failed}/${total} submissions con entrega fallida en 24 h.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'failed', value: String(failed) },
          { kind: 'metric', label: 'total', value: String(total) },
        ],
      },
      {
        signalId: GROWTH_FORMS_SUBMISSION_REJECTION_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: SOURCE,
        label: 'Submissions rechazadas en 24 h (Growth Forms)',
        severity: 'ok', // rechazar (honeypot/consent/surface) es comportamiento de seguridad esperado.
        summary:
          total === 0 ? 'Sin submissions en 24 h.' : `${rejected} submissions rechazadas (spam/consent/surface) en 24 h.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'rejected', value: String(rejected) }],
      },
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_growth_forms' } })

    return [
      {
        signalId: GROWTH_FORMS_DEAD_LETTER_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'dead_letter' as const,
        source: SOURCE,
        label: 'Entregas de formularios en dead-letter (Growth Forms)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [{ kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }],
      },
    ]
  }
}
