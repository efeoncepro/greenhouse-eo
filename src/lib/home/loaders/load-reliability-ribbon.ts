import 'server-only'

import { getReliabilityOverview } from '@/lib/reliability/get-reliability-overview'
import type { ReliabilitySeverity } from '@/types/reliability'

import type { HomeReliabilityModuleSummary, HomeReliabilityRibbonData, ReliabilityModuleStatus } from '../contract'
import type { HomeLoaderContext } from '../registry'

const STATUS_PRIORITY: Record<ReliabilityModuleStatus, number> = {
  down: 4,
  degraded: 3,
  unknown: 2,
  healthy: 1
}

const mapModuleStatus = (raw: ReliabilitySeverity | null | undefined): ReliabilityModuleStatus => {
  if (!raw) return 'unknown'

  if (raw === 'ok') return 'healthy'
  if (raw === 'error') return 'down'
  if (raw === 'warning') return 'degraded'

  return 'unknown'
}

const findLastIncidentAt = (signals: ReadonlyArray<{ kind: string; severity: ReliabilitySeverity; observedAt: string | null }>): string | null => {
  const incidents = signals
    .filter(signal => signal.kind === 'incident' && signal.severity !== 'ok')
    .map(signal => signal.observedAt)
    .filter((value): value is string => typeof value === 'string')

  if (incidents.length === 0) return null

  incidents.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return incidents[0]
}

export const loadHomeReliabilityRibbon = async (_ctx: HomeLoaderContext): Promise<HomeReliabilityRibbonData> => {
  const overview = await getReliabilityOverview()

  const modules: HomeReliabilityModuleSummary[] = overview.modules.map(snapshot => {
    const status = mapModuleStatus(snapshot.status)
    const incidentsOpen = snapshot.signals.filter(signal => signal.kind === 'incident' && signal.severity !== 'ok').length

    return {
      moduleKey: snapshot.moduleKey,
      label: snapshot.label,
      status,
      incidentsOpen,
      lastIncidentAt: findLastIncidentAt(snapshot.signals)
    }
  })

  const rollup = modules.reduce<ReliabilityModuleStatus>((acc, module) => {
    return STATUS_PRIORITY[module.status] > STATUS_PRIORITY[acc] ? module.status : acc
  }, 'healthy')

  return {
    rollup,
    modules,
    degradedSources: overview.notes ?? [],
    asOf: overview.generatedAt
  }
}
