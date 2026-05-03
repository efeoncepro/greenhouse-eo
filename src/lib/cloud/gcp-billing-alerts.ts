import 'server-only'

import { sendSlackAlert } from '@/lib/alerts/slack-notify'
import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
import { postTeamsCard } from '@/lib/integrations/teams/sender'
import type { TeamsAdaptiveCard } from '@/lib/integrations/teams/types'

import {
  hasRecentCloudCostAlertDispatch,
  recordCloudCostAlertDispatch,
  stableFingerprint
} from './finops-ai/persist'

export interface CloudCostAlertSweepSummary {
  startedAt: string
  finishedAt: string
  durationMs: number
  driversEvaluated: number
  alertsEligible: number
  alertsDispatched: number
  skippedReason: string | null
  channels: string[]
}

interface RunCloudCostAlertSweepArgs {
  dryRun?: boolean
}

const getCooldownHours = () => {
  const parsed = Number(process.env.CLOUD_COST_ALERT_COOLDOWN_HOURS)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12
}

const getPortalOrigin = () =>
  process.env.GREENHOUSE_PORTAL_ORIGIN?.replace(/\/$/, '') ||
  process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
  'https://greenhouse.efeoncepro.com'

const severityRank = { error: 0, warning: 1, ok: 2 }

const buildSummary = (
  startedAt: Date,
  overrides: Partial<CloudCostAlertSweepSummary>
): CloudCostAlertSweepSummary => {
  const finishedAt = new Date()

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    driversEvaluated: 0,
    alertsEligible: 0,
    alertsDispatched: 0,
    skippedReason: null,
    channels: [],
    ...overrides
  }
}

const buildTeamsCard = ({
  severity,
  title,
  body,
  portalUrl
}: {
  severity: 'warning' | 'error'
  title: string
  body: string
  portalUrl: string
}): TeamsAdaptiveCard => ({
  $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
  type: 'AdaptiveCard',
  version: '1.5',
  body: [
    {
      type: 'TextBlock',
      text: severity === 'error' ? 'Alerta crítica de costo cloud' : 'Alerta temprana de costo cloud',
      weight: 'Bolder',
      size: 'Medium',
      wrap: true
    },
    {
      type: 'TextBlock',
      text: title,
      weight: 'Bolder',
      wrap: true
    },
    {
      type: 'TextBlock',
      text: body,
      wrap: true
    }
  ],
  actions: [
    {
      type: 'Action.OpenUrl',
      title: 'Ver en Greenhouse',
      url: portalUrl
    }
  ]
})

const isMissingDispatchTable = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)

  return /cloud_cost_alert_dispatches|relation .* does not exist/i.test(message)
}

export const runCloudCostAlertSweep = async ({
  dryRun = false
}: RunCloudCostAlertSweepArgs = {}): Promise<CloudCostAlertSweepSummary> => {
  const startedAt = new Date()
  const overview = await getGcpBillingOverview({ days: 30, forceRefresh: true })

  if (overview.availability !== 'configured') {
    return buildSummary(startedAt, {
      skippedReason: `Billing Export availability=${overview.availability}`
    })
  }

  const eligible = (overview.topDrivers ?? [])
    .filter(driver => driver.severity === 'warning' || driver.severity === 'error')
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])

  if (eligible.length === 0) {
    return buildSummary(startedAt, {
      driversEvaluated: overview.topDrivers?.length ?? 0,
      skippedReason: 'Sin drivers warning/error'
    })
  }

  const severity = eligible.some(driver => driver.severity === 'error') ? 'error' : 'warning'

  const fingerprint = stableFingerprint({
    severity,
    latestUsageDate: overview.source.latestUsageDate,
    drivers: eligible.map(driver => ({
      driverId: driver.driverId,
      severity: driver.severity,
      currentCost: driver.currentCost,
      deltaPercent: driver.deltaPercent,
      share: driver.share
    }))
  })

  const title = eligible[0]?.summary ?? 'Costo cloud requiere revisión'

  const body = eligible
    .slice(0, 4)
    .map(driver => `- ${driver.summary}`)
    .join('\n')

  const channels: string[] = []

  if (dryRun) {
    return buildSummary(startedAt, {
      driversEvaluated: overview.topDrivers?.length ?? 0,
      alertsEligible: eligible.length,
      alertsDispatched: 0,
      channels,
      skippedReason: 'dryRun=true: no se consultó DB, no se despacharon notificaciones ni se persistió fingerprint'
    })
  }

  try {
    const alreadyDispatched = await hasRecentCloudCostAlertDispatch(fingerprint, getCooldownHours())

    if (alreadyDispatched) {
      return buildSummary(startedAt, {
        driversEvaluated: overview.topDrivers?.length ?? 0,
        alertsEligible: eligible.length,
        skippedReason: 'Fingerprint ya despachado dentro del cooldown'
      })
    }
  } catch (error) {
    if (isMissingDispatchTable(error)) {
      return buildSummary(startedAt, {
        driversEvaluated: overview.topDrivers?.length ?? 0,
        alertsEligible: eligible.length,
        skippedReason: 'Persistence table greenhouse_ai.cloud_cost_alert_dispatches no existe aún'
      })
    }

    throw error
  }

  const portalUrl = `${getPortalOrigin()}/admin/integrations`
  const teamsChannel = process.env.CLOUD_COST_ALERT_TEAMS_CHANNEL_CODE || 'ops-alerts'

  const teamsOutcome = await postTeamsCard(
    teamsChannel,
    buildTeamsCard({ severity, title, body, portalUrl }),
    {
      triggeredBy: 'cloud_cost_alert_sweep',
      correlationId: fingerprint,
      sourceObjectId: 'gcp_billing_export'
    }
  )

  if (teamsOutcome.ok) {
    channels.push(`teams:${teamsChannel}`)
  } else {
    const slackSent = await sendSlackAlert(
      `:warning: ${title}\n${body}\nGreenhouse: ${portalUrl}\nTeams fallback reason: ${teamsOutcome.reason}`
    )

    if (slackSent) {
      channels.push('slack:alerts')
    }
  }

  await recordCloudCostAlertDispatch({
    fingerprint,
    severity,
    summary: title,
    channels,
    driverIds: eligible.map(driver => driver.driverId)
  })

  return buildSummary(startedAt, {
    driversEvaluated: overview.topDrivers?.length ?? 0,
    alertsEligible: eligible.length,
    alertsDispatched: channels.length > 0 ? 1 : 0,
    channels,
    skippedReason: channels.length > 0 ? null : 'No se pudo despachar por Teams ni Slack'
  })
}
