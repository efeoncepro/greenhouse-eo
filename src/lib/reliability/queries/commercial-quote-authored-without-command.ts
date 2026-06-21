import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1212 — Reliability signal: cotizaciones autoradas/emitidas fuera del command atómico.
 *
 * Detecta el SÍNTOMA observable de haber bypasseado el command canónico
 * `submitQuoteFromBuilder` (que garantiza header + líneas + versión en una transacción):
 * cotizaciones en estado terminal de venta (`issued`/`sent`/`approved`/`converted`) cuya
 * versión vigente NO tiene NINGUNA línea. Una cotización emitida SIEMPRE tiene líneas; cero
 * líneas en estado emitido sólo puede surgir de un camino de autoría no-atómico (la "zombie"
 * que el command previene). Es el contrato anti-zombie del ADR `GREENHOUSE_QUOTE_API_PARITY`.
 *
 * **Kind**: `data_quality`. **Severidad**: `error` cuando count > 0 (cotización rota, visible
 * al cliente sin contenido). Steady state esperado = 0.
 *
 * Pattern reference: `commercial-organization-type-lifecycle-drift.ts` (TASK-991).
 */
export const COMMERCIAL_QUOTE_AUTHORED_WITHOUT_COMMAND_SIGNAL_ID = 'commercial.quote.authored_without_command'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_commercial.quotations q
  WHERE q.status IN ('issued', 'sent', 'approved', 'converted')
    -- Solo cotizaciones autoradas por el builder/command (origen interno). Los documentos
    -- importados (nubox/hubspot) son espejos de facturacion externa: legitimamente no
    -- tienen lineas de pricing del builder y NO pasan por submitQuoteFromBuilder.
    AND q.source_system = 'manual'
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_commercial.quotation_line_items li
      WHERE li.quotation_id = q.quotation_id
        AND li.version_number = q.current_version
    )
`

export const getCommercialQuoteAuthoredWithoutCommandSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: COMMERCIAL_QUOTE_AUTHORED_WITHOUT_COMMAND_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'data_quality',
      source: 'getCommercialQuoteAuthoredWithoutCommandSignal',
      label: 'Cotizaciones emitidas sin líneas (autoría fuera del command atómico)',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Toda cotización emitida/enviada/aprobada/convertida tiene líneas en su versión vigente (command atómico respetado).'
          : `${count} cotización${count === 1 ? '' : 'es'} en estado terminal con CERO líneas en su versión vigente. Síntoma de autoría no-atómica (bypass de submitQuoteFromBuilder / la "zombie" del ADR QUOTE_API_PARITY). Revisar el camino de autoría/emisión.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "SELECT COUNT(*) FROM greenhouse_commercial.quotations q WHERE q.status IN ('issued','sent','approved','converted') AND q.source_system='manual' AND NOT EXISTS (SELECT 1 FROM greenhouse_commercial.quotation_line_items li WHERE li.quotation_id=q.quotation_id AND li.version_number=q.current_version)"
        },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1212-quote-write-parity-author-issue-command.md (Slice 5)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_commercial_quote_authored_without_command' }
    })

    return {
      signalId: COMMERCIAL_QUOTE_AUTHORED_WITHOUT_COMMAND_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'data_quality',
      source: 'getCommercialQuoteAuthoredWithoutCommandSignal',
      label: 'Cotizaciones emitidas sin líneas (autoría fuera del command atómico)',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
      ]
    }
  }
}
