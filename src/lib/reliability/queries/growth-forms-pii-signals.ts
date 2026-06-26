import 'server-only'

/**
 * TASK-1255 — Growth Forms PII reveal · reliability signals (`growth.forms.pii_*`).
 *
 * `pii_reveal_without_reason` (steady=0): cuenta reveals de PII en 24 h con razón
 * nula o más corta que el mínimo. El command `revealSubmissionPiiField` EXIGE
 * reason ≥ 10, así que en runtime sano esto es siempre 0; cualquier >0 implica un
 * INSERT directo a la tabla que saltó el enforcement → requiere investigación.
 * La evidencia incluye el volumen total de reveals (visibilidad anti-scraping interno).
 * DB vacía / sin reveals → steady ok. Error de lectura → severity unknown.
 */
import { MIN_REVEAL_REASON_LENGTH } from '@/lib/growth/forms/pii/reveal'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_FORMS_PII_REVEAL_WITHOUT_REASON_SIGNAL_ID = 'growth.forms.pii_reveal_without_reason'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthFormsPiiSignals'

export const getGrowthFormsPiiSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<{ total: number; without_reason: number }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE reason IS NULL OR length(btrim(reason)) < $1)::int AS without_reason
       FROM greenhouse_growth.lead_pii_reveal_audit
       WHERE created_at > NOW() - INTERVAL '1 day'`,
      [MIN_REVEAL_REASON_LENGTH],
    )

    const total = Number(rows[0]?.total ?? 0)
    const withoutReason = Number(rows[0]?.without_reason ?? 0)

    return [
      {
        signalId: GROWTH_FORMS_PII_REVEAL_WITHOUT_REASON_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality',
        source: SOURCE,
        label: 'Reveals de PII sin razón válida en 24 h (Growth Forms)',
        severity: withoutReason > 0 ? 'error' : 'ok',
        summary:
          withoutReason === 0
            ? `Sin reveals de PII sin razón. ${total} reveal(s) auditado(s) en 24 h.`
            : `${withoutReason} reveal(s) de PII sin razón válida — el enforcement fue saltado, requiere investigación.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'without_reason', value: String(withoutReason) },
          { kind: 'metric', label: 'total_reveals_24h', value: String(total) },
        ],
      },
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_growth_forms_pii' } })

    return [
      {
        signalId: GROWTH_FORMS_PII_REVEAL_WITHOUT_REASON_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality' as const,
        source: SOURCE,
        label: 'Reveals de PII sin razón válida en 24 h (Growth Forms)',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [{ kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) }],
      },
    ]
  }
}
