import 'server-only'

import { getNotionDeliveryDataQualityOverview } from '@/lib/integrations/notion-delivery-data-quality'
import { getNotionRawFreshnessGate } from '@/lib/integrations/notion-readiness'
import { getNotionSyncOrchestrationOverview } from '@/lib/integrations/notion-sync-orchestration'
import type { NotionRawFreshnessGateResult } from '@/lib/integrations/notion-readiness'
import type { NotionSyncOrchestrationOverview } from '@/types/notion-sync-orchestration'
import type { IntegrationDataQualityOverview } from '@/types/integration-data-quality'

/**
 * Operational overview del flujo Notion end-to-end.
 *
 * COMPOSER: nunca duplica lógica. Combina los 3 readers existentes
 *  - getNotionRawFreshnessGate() (upstream notion-bq-sync inferido por _synced_at)
 *  - getNotionSyncOrchestrationOverview() (orquestación raw → conformed)
 *  - getNotionDeliveryDataQualityOverview() (drift checks)
 *
 * Output diseñado para que `Cloud & Integrations` muestre 1 card que responde:
 *   ¿el flujo Notion está sano hoy? ¿hace cuánto fue la última corrida exitosa?
 *
 * Nunca toca `notion-bq-sync` Cloud Run directamente — ese servicio no expone
 * un reader; usamos `_synced_at` en `notion_ops.*` como fuente de verdad de
 * "última corrida del upstream" (es lo que de hecho importa).
 */

export type NotionFlowStatus = 'healthy' | 'degraded' | 'broken' | 'awaiting_data' | 'unknown'

export interface NotionUpstreamSnapshot {
  freshestRawSyncedAt: string | null
  ageHours: number | null
  isStale: boolean
  staleSpaceCount: number
  activeSpaceCount: number
  ready: boolean
  reason: string
}

export interface NotionSyncOperationalOverview {
  generatedAt: string
  flowStatus: NotionFlowStatus
  summary: string
  upstream: NotionUpstreamSnapshot
  orchestration: {
    generatedAt: string
    totals: NotionSyncOrchestrationOverview['totals']
    pendingSpaces: number
    failedSpaces: number
  }
  dataQuality: {
    generatedAt: string
    totals: IntegrationDataQualityOverview['totals']
    latestRunCheckedAt: string | null
  }
  notes: string[]
}

const STALE_THRESHOLD_HOURS = 24

const computeAgeHours = (timestamp: string | null): number | null => {
  if (!timestamp) return null

  const parsed = Date.parse(timestamp)

  if (!Number.isFinite(parsed)) return null

  return Math.max(0, Math.round(((Date.now() - parsed) / 3_600_000) * 10) / 10)
}

const buildUpstreamSnapshot = (gate: NotionRawFreshnessGateResult): NotionUpstreamSnapshot => {
  const ageHours = computeAgeHours(gate.freshestRawSyncedAt)
  const isStale = ageHours !== null && ageHours > STALE_THRESHOLD_HOURS

  return {
    freshestRawSyncedAt: gate.freshestRawSyncedAt,
    ageHours,
    isStale,
    staleSpaceCount: gate.staleSpaces.length,
    activeSpaceCount: gate.activeSpaceCount,
    ready: gate.ready,
    reason: gate.reason
  }
}

const deriveFlowStatus = (
  upstream: NotionUpstreamSnapshot,
  orchestrationFailed: number,
  dqBroken: number,
  dqDegraded: number
): NotionFlowStatus => {
  if (upstream.activeSpaceCount === 0 && upstream.freshestRawSyncedAt === null) {
    return 'awaiting_data'
  }

  if (orchestrationFailed > 0 || dqBroken > 0) return 'broken'
  if (upstream.isStale || dqDegraded > 0 || !upstream.ready) return 'degraded'

  return 'healthy'
}

const buildSummary = (
  status: NotionFlowStatus,
  upstream: NotionUpstreamSnapshot,
  orchestrationFailed: number,
  dqBroken: number,
  dqDegraded: number
): string => {
  if (status === 'awaiting_data') {
    return 'No hay spaces activos con sync Notion habilitado.'
  }

  const ageLabel =
    upstream.ageHours === null
      ? 'sin timestamp de raw'
      : upstream.ageHours < 1
        ? `raw fresco (${Math.round(upstream.ageHours * 60)} min)`
        : `raw hace ${upstream.ageHours} h`

  if (status === 'broken') {
    const parts: string[] = []

    if (orchestrationFailed > 0) {
      parts.push(`${orchestrationFailed} space${orchestrationFailed === 1 ? '' : 's'} en sync_failed`)
    }

    if (dqBroken > 0) parts.push(`${dqBroken} con DQ broken`)

    return `Flujo Notion roto. ${parts.join(' · ')}.`
  }

  if (status === 'degraded') {
    const parts: string[] = []

    if (upstream.isStale) parts.push(`upstream stale (>${STALE_THRESHOLD_HOURS}h)`)
    if (dqDegraded > 0) parts.push(`${dqDegraded} con DQ degraded`)
    if (!upstream.ready) parts.push(upstream.reason)

    return `Atención: ${parts.join(' · ') || ageLabel}.`
  }

  return `Flujo Notion sano · ${ageLabel} · ${upstream.activeSpaceCount} space${upstream.activeSpaceCount === 1 ? '' : 's'} activos.`
}

export const getNotionSyncOperationalOverview = async (): Promise<NotionSyncOperationalOverview> => {
  const [freshness, orchestration, dataQuality] = await Promise.all([
    getNotionRawFreshnessGate().catch(error => {
      console.warn('[notion-operational] freshness gate failed', { error: (error as Error).message })

      return {
        ready: false,
        reason: `Freshness gate error: ${(error as Error).message}`,
        checkedAt: new Date().toISOString(),
        boundaryStartAt: new Date().toISOString(),
        freshestRawSyncedAt: null,
        activeSpaceCount: 0,
        staleSpaces: [],
        spaces: []
      } as NotionRawFreshnessGateResult
    }),
    getNotionSyncOrchestrationOverview({ limit: 1 }).catch(error => {
      console.warn('[notion-operational] orchestration overview failed', {
        error: (error as Error).message
      })

      return null
    }),
    getNotionDeliveryDataQualityOverview({ limit: 1 }).catch(error => {
      console.warn('[notion-operational] data quality overview failed', {
        error: (error as Error).message
      })

      return null
    })
  ])

  const upstream = buildUpstreamSnapshot(freshness)
  const orchestrationFailed = orchestration?.totals.syncFailed ?? 0

  const orchestrationPending = orchestration
    ? orchestration.totals.openSpaces +
      orchestration.totals.waitingForRaw +
      orchestration.totals.retryScheduled +
      orchestration.totals.retryRunning
    : 0

  const dqBroken = dataQuality?.totals.brokenSpaces ?? 0
  const dqDegraded = dataQuality?.totals.degradedSpaces ?? 0

  const flowStatus = deriveFlowStatus(upstream, orchestrationFailed, dqBroken, dqDegraded)

  const notes: string[] = []

  if (!orchestration) notes.push('Orchestration overview no disponible (consulta falló).')
  if (!dataQuality) notes.push('Data quality overview no disponible (consulta falló).')

  return {
    generatedAt: new Date().toISOString(),
    flowStatus,
    summary: buildSummary(flowStatus, upstream, orchestrationFailed, dqBroken, dqDegraded),
    upstream,
    orchestration: {
      generatedAt: orchestration?.generatedAt ?? new Date().toISOString(),
      totals: orchestration?.totals ?? {
        totalSpaces: 0,
        openSpaces: 0,
        waitingForRaw: 0,
        retryScheduled: 0,
        retryRunning: 0,
        syncCompleted: 0,
        syncFailed: 0,
        cancelled: 0,
        unknownSpaces: 0
      },
      pendingSpaces: orchestrationPending,
      failedSpaces: orchestrationFailed
    },
    dataQuality: {
      generatedAt: dataQuality?.generatedAt ?? new Date().toISOString(),
      totals: dataQuality?.totals ?? {
        totalSpaces: 0,
        healthySpaces: 0,
        degradedSpaces: 0,
        brokenSpaces: 0,
        unknownSpaces: 0,
        autoRecoverableSpaces: 0
      },
      latestRunCheckedAt: dataQuality?.recentRuns[0]?.checkedAt ?? null
    },
    notes
  }
}
