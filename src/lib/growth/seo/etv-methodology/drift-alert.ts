import 'server-only'

import { sendManualTeamsAnnouncement } from '@/lib/communications/manual-teams-announcements'
import { captureWithDomain } from '@/lib/observability/capture'
import { getSeoEtvMethodologyDriftSignal } from '@/lib/reliability/queries/seo-etv-methodology-drift'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1806 — Alerta determinista de la señal `seo.etv_methodology.drift`.
 *
 * No hay hoy ningún canal push para señales de confiabilidad de este módulo: `/admin/operations`
 * es pull (alguien tiene que abrirlo). Este módulo cierra ese hueco para UNA señal puntual, con el
 * costo/alcance mínimo — no un dispatcher genérico de confiabilidad ni una máquina de estados de
 * dedup (eso es `src/lib/release/watchdog-alerts-dispatcher.ts`, con su propia tabla y semántica de
 * escalamiento; no se generaliza acá sin que otra señal lo necesite).
 *
 * Semántica deliberadamente simple: se invoca UNA VEZ AL DÍA (Cloud Scheduler); si la severidad es
 * `error`, envía un aviso a Teams. Si el cron corre diario y el error persiste, el aviso se repite
 * cada día — es un recordatorio aceptado, no spam (comparable al "daily reminder" del watchdog de
 * release). No hay estado de "ya avisado hoy" que mantener: la cadencia del cron ES el dedup.
 * `ok`/`warning`/`awaiting_data`/`unknown` no alertan — awaiting_data y warning son estados
 * esperados de la foundation (ver el docblock de la señal).
 *
 * Fallo al enviar a Teams NUNCA revienta el caller: se degrada honesto (captureWithDomain) y se
 * devuelve `alerted:false, teamsError:<mensaje>` — el cron sigue siendo `ok` para Cloud Scheduler.
 */
export interface SeoEtvMethodologyDriftAlertResult {
  severity: ReliabilitySignal['severity']
  summary: string
  alerted: boolean
  teamsError: string | null
}

const DESTINATION_KEY = 'growth-seo-reliability-alerts'
const OPERATIONS_URL = 'https://greenhouse.efeoncepro.com/admin/operations'

export const checkAndAlertSeoEtvMethodologyDrift = async (
  now: Date = new Date()
): Promise<SeoEtvMethodologyDriftAlertResult> => {
  const signal = await getSeoEtvMethodologyDriftSignal(now)

  if (signal.severity !== 'error') {
    return { severity: signal.severity, summary: signal.summary, alerted: false, teamsError: null }
  }

  const paragraphs = [
    signal.summary,
    ...signal.evidence.map(item => `${item.label}: ${item.value}`)
  ]

  try {
    const result = await sendManualTeamsAnnouncement({
      destinationKey: DESTINATION_KEY,
      title: '🔴 Drift de metodología ETV (growth/SEO)',
      paragraphs,
      ctaUrl: OPERATIONS_URL,
      ctaLabel: 'Ver /admin/operations',
      triggeredBy: 'cloud_scheduler',
      correlationId: `seo-etv-methodology-drift-${now.toISOString().slice(0, 10)}`
    })

    if (!result.ok) {
      captureWithDomain(new Error(`teams_send_failed: ${result.reason} — ${result.detail}`), 'growth', {
        tags: { source: 'seo_etv_methodology_drift_alert' }
      })

      return { severity: signal.severity, summary: signal.summary, alerted: false, teamsError: `${result.reason}: ${result.detail}` }
    }

    return { severity: signal.severity, summary: signal.summary, alerted: true, teamsError: null }
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'seo_etv_methodology_drift_alert' } })

    return {
      severity: signal.severity,
      summary: signal.summary,
      alerted: false,
      teamsError: error instanceof Error ? error.message : String(error)
    }
  }
}
