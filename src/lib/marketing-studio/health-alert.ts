import 'server-only'

import { sendManualTeamsAnnouncement } from '@/lib/communications/manual-teams-announcements'
import { captureWithDomain } from '@/lib/observability/capture'
import { getMarketingStudioHealthSignal } from '@/lib/reliability/queries/marketing-studio-health'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1896 — Alerta determinista de la señal `platform.marketing_studio.health` (clase de TASK-1806).
 *
 * Se invoca UNA VEZ AL DÍA desde el ops-worker (Cloud Scheduler `ops-marketing-studio-health-watch`). Sólo en
 * severidad `error` envía un aviso a Teams (canal «EO - Admin», destino `marketing-studio-reliability-alerts`,
 * decisión del operador 2026-09-26). `ok`/`warning`/`unknown` no avisan: warning es degradación esperable y
 * `unknown` (Studio caído o credencial ausente) ya lo alertan el uptime check y Sentry de Studio por su cuenta.
 * La cadencia diaria ES el dedup: si el error persiste, el aviso se repite al día siguiente.
 *
 * Studio nunca recibe credenciales del bot de Teams: el aviso sale de Greenhouse, sobre la señal agregada.
 * Un fallo al enviar nunca revienta el caller: se reporta y se devuelve `alerted:false`.
 */
export interface MarketingStudioHealthAlertResult {
  severity: ReliabilitySignal['severity']
  summary: string
  alerted: boolean
  teamsError: string | null
}

export const MARKETING_STUDIO_ALERT_DESTINATION_KEY = 'marketing-studio-reliability-alerts'
const OPERATIONS_URL = 'https://greenhouse.efeoncepro.com/admin/operations'

export const checkAndAlertMarketingStudioHealth = async (
  now: Date = new Date(),
  deps: { getSignal?: () => Promise<ReliabilitySignal>; send?: typeof sendManualTeamsAnnouncement } = {}
): Promise<MarketingStudioHealthAlertResult> => {
  const signal = await (deps.getSignal ?? getMarketingStudioHealthSignal)()

  if (signal.severity !== 'error') {
    return { severity: signal.severity, summary: signal.summary, alerted: false, teamsError: null }
  }

  const paragraphs = [
    signal.summary,
    ...signal.evidence.filter(item => item.kind === 'metric').map(item => `${item.label}: ${item.value}`),
    'Detalle en Studio: GET /api/v1/health?deep=1 (bearer studio:health). Runbook: MARKETING_STUDIO_RUNTIME_HANDOFF.md.'
  ].slice(0, 10)

  try {
    const result = await (deps.send ?? sendManualTeamsAnnouncement)({
      destinationKey: MARKETING_STUDIO_ALERT_DESTINATION_KEY,
      title: '🔴 Marketing Studio con fallas',
      paragraphs,
      ctaUrl: OPERATIONS_URL,
      ctaLabel: 'Ver /admin/operations',
      triggeredBy: 'cloud_scheduler',
      correlationId: `marketing-studio-health-${now.toISOString().slice(0, 10)}`
    })

    if (!result.ok) {
      captureWithDomain(new Error(`teams_send_failed: ${result.reason} — ${result.detail}`), 'platform', {
        tags: { source: 'marketing_studio_health_alert' }
      })

      return { severity: signal.severity, summary: signal.summary, alerted: false, teamsError: `${result.reason}: ${result.detail}` }
    }

    return { severity: signal.severity, summary: signal.summary, alerted: true, teamsError: null }
  } catch (error) {
    captureWithDomain(error, 'platform', { tags: { source: 'marketing_studio_health_alert' } })

    return { severity: signal.severity, summary: signal.summary, alerted: false, teamsError: error instanceof Error ? error.message : String(error) }
  }
}
