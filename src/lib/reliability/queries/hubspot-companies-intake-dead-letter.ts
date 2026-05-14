import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { buildReactiveHandlerKey } from '@/lib/sync/reactive-handler-key'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-878 Slice 2 — Reliability signal reader.
 *
 * Cuenta entries dead-letter en `outbox_reactive_log` para el handler crítico
 * `hubspot_companies_intake:commercial.hubspot_company.sync_requested` — la
 * projection canónica que sincroniza HubSpot companies + contacts a Greenhouse
 * post TASK-878 (path async que reemplaza el inline sync del webhook handler).
 *
 * Si esta projection se queda en dead-letter:
 *   - Companies HubSpot nuevos o modificados NO se reflejan en
 *     greenhouse_crm.companies / greenhouse_core.organizations / clients.
 *   - El portal sigue viendo datos stale hasta el daily cron diario (TASK-536)
 *     o un sync manual via Quote Builder (TASK-537).
 *   - Operadores comerciales no pueden adoptar el company nuevo en el portal.
 *
 * Solo cuenta dead-letters NO acknowledged y NO recovered, alineado con
 * `outbox_reactive_log_active_dead_letters_idx` (TASK 2026-04-26) y mismo
 * patrón que `getProviderBqSyncDeadLetterSignal` (TASK-771) y
 * `getPaymentOrdersDeadLetterSignal` (TASK-765).
 *
 * **Kind**: `dead_letter`. Steady state esperado = 0.
 * **Severidad**: `error` cuando count > 0. Significa que el reactor llegó al
 * límite de retries (maxRetries=3 en la projection) y nadie acuso recibo aún
 * — el path está roto. Típico de:
 *   - Cloud Run bridge `hubspot-greenhouse-integration` caído.
 *   - `HUBSPOT_ACCESS_TOKEN` secret corrupto o expirado.
 *   - Permisos OAuth de la app HubSpot revocados.
 *   - Schema PG drift que rechaza el UPSERT (raro post TASK-878 Slice 1).
 */
export const HUBSPOT_COMPANIES_INTAKE_DEAD_LETTER_SIGNAL_ID =
  'commercial.hubspot_company.intake_dead_letter'

const HANDLER = buildReactiveHandlerKey(
  'hubspot_companies_intake',
  'commercial.hubspot_company.sync_requested'
)

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.outbox_reactive_log
  WHERE handler = $1
    AND result = 'dead-letter'
    AND acknowledged_at IS NULL
    AND recovered_at IS NULL
`

export const getHubspotCompaniesIntakeDeadLetterSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL, [HANDLER])
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: HUBSPOT_COMPANIES_INTAKE_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'dead_letter',
      source: 'getHubspotCompaniesIntakeDeadLetterSignal',
      label: 'HubSpot companies intake dead-letter',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin dead-letters en hubspot_companies_intake. Sync async operativo.'
          : `${count} ${count === 1 ? 'entry' : 'entries'} en dead-letter. Webhooks HubSpot companies no están convergiendo — portal verá datos stale hasta resolver bridge / secret / OAuth.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `greenhouse_sync.outbox_reactive_log WHERE handler='${HANDLER}'`
        },
        {
          kind: 'metric',
          label: 'handler',
          value: HANDLER
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value:
            'docs/tasks/in-progress/TASK-878-hubspot-companies-webhook-async-outbox-decoupling.md (slice 2)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'integrations.hubspot', {
      tags: { source: 'reliability_signal_hubspot_companies_intake_dead_letter' }
    })

    return {
      signalId: HUBSPOT_COMPANIES_INTAKE_DEAD_LETTER_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'dead_letter',
      source: 'getHubspotCompaniesIntakeDeadLetterSignal',
      label: 'HubSpot companies intake dead-letter',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
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
