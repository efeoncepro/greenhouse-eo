import 'server-only'

/**
 * TASK-1845 — adapter ICO/delivery (RpA y OTD). El dueño del cómputo es `ico-engine`
 * (`readSpaceMetrics`, materializado mensual); el adapter mapea org → spaces por
 * `greenhouse_core.spaces.organization_id`, exige meses calendario completos (grano del
 * dueño), hereda `dataStatus`/`suppressionReason` de RpA y conserva numerador/denominador
 * de OTD por space. Nunca promedia promedios ni porcentajes entre spaces.
 */

import { readSpaceMetrics } from '@/lib/ico-engine/read-metrics'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { EvidenceFactV1, EvidenceRejectionV1, EvidenceSourceV1 } from '../contracts/evidence'
import type { ResolvedInsightWindow } from '../window'
import { type AdapterCollectInput, type ModuleReportAdapterV1, factId } from './contract'

export const ICO_ADAPTER_VERSION = 'ico_report_adapter_v1'

interface SpaceRow extends Record<string, unknown> {
  space_id: string
  space_name: string
}

export const listOrganizationSpaces = async (organizationId: string): Promise<SpaceRow[]> =>
  runGreenhousePostgresQuery<SpaceRow>(
    `SELECT space_id, space_name FROM greenhouse_core.spaces
      WHERE organization_id = $1 AND active = true
      ORDER BY space_name COLLATE "C", space_id COLLATE "C"`,
    [organizationId]
  )

const collectForWindow = async (spaces: SpaceRow[], window: ResolvedInsightWindow, comparisonIds: Record<string, string | null>) => {
  const facts: EvidenceFactV1[] = []
  const rejections: EvidenceRejectionV1[] = []
  let source: EvidenceSourceV1 | null = null

  if (!window.wholeMonths) {
    rejections.push({ module: 'ico', metricId: null, reason: 'unsupported_window', detail: 'RpA/OTD se materializan por mes calendario; la ventana no es de meses completos', alternative: { granularity: 'month', note: 'Pedir un rango de meses completos para incluir ICO.' } })

    return { facts, rejections, source }
  }

  for (const month of window.months) {
    const [yearText, monthText] = month.split('-')
    const periodYear = Number(yearText)
    const periodMonth = Number(monthText)

    for (const space of spaces) {
      const snapshot = await readSpaceMetrics(space.space_id, periodYear, periodMonth)

      if (!snapshot) {
        rejections.push({ module: 'ico', metricId: null, reason: 'no_data', detail: `Sin snapshot ICO para ${space.space_name} en ${month}` })
        continue
      }

      const method = { name: 'ico_engine_monthly', version: snapshot.engineVersion }
      const asOf = snapshot.computedAt
      const dimension = `${space.space_id}.${month}`

      const base = {
        factVersion: 'evidence_fact_v1' as const,
        module: 'ico' as const,
        population: `Tareas del space ${space.space_name} en ${month}`,
        source: `ico_engine.metric_snapshots_monthly (${snapshot.source})`,
        method,
        freshness: { asOf },
        observation: 'observed' as const,
        window: { start: `${month}-01`, endExclusive: `${month}-01`, granularity: 'month' as const, partial: window.partial },
        evidenceRef: `space:${space.space_id}:${periodYear}-${String(periodMonth).padStart(2, '0')}`,
        dimension: { spaceId: space.space_id, spaceName: space.space_name, month }
      }

      const rpa = snapshot.metrics.find(metric => metric.metricId === 'rpa')
      const otd = snapshot.metrics.find(metric => metric.metricId === 'otd')

      if (rpa) {
        const suppressed = rpa.dataStatus === 'suppressed' || rpa.dataStatus === 'unavailable'

        if (suppressed) {
          rejections.push({ module: 'ico', metricId: 'rpa', reason: 'suppressed', detail: `RpA ${rpa.dataStatus} en ${space.space_name} ${month}: ${rpa.suppressionReason ?? 'sin motivo'}` })
        } else {
          facts.push({ ...base, factId: factId('ico', 'rpa', window, dimension), metricId: 'rpa', label: `RpA · ${space.space_name} · ${month}`, value: rpa.value, unit: 'ratio', numerator: null, denominator: null, coverage: { kind: rpa.dataStatus === 'low_confidence' ? 'partial' : 'complete', ratio: null, populationSize: rpa.evidence?.eligibleTasks ?? snapshot.context.completedTasks }, comparisonFactId: comparisonIds[`rpa.${space.space_id}`] ?? null })
        }
      }

      if (otd) {
        const numerator = snapshot.context.onTimeTasks
        const denominator = snapshot.context.onTimeTasks + snapshot.context.lateDropTasks + snapshot.context.overdueTasks

        if (denominator <= 0 || otd.value === null) {
          rejections.push({ module: 'ico', metricId: 'otd', reason: 'insufficient_data', detail: `OTD sin denominador en ${space.space_name} ${month} (0 tareas elegibles)` })
        } else {
          facts.push({ ...base, factId: factId('ico', 'otd', window, dimension), metricId: 'otd', label: `OTD · ${space.space_name} · ${month}`, value: otd.value, unit: 'percent', numerator, denominator, coverage: { kind: 'complete', ratio: 1, populationSize: denominator }, comparisonFactId: comparisonIds[`otd.${space.space_id}`] ?? null })
        }
      }

      source = source ?? { module: 'ico', adapterVersion: ICO_ADAPTER_VERSION, reader: 'readSpaceMetrics', asOf, method, coverage: { kind: 'complete', ratio: null, populationSize: spaces.length }, servedWindow: { start: `${window.months[0]}-01`, endExclusive: window.endExclusive, granularity: 'month', partial: window.partial } }
    }
  }

  return { facts, rejections, source }
}

export const icoReportAdapter: ModuleReportAdapterV1 = {
  describe: () => ({ module: 'ico', version: ICO_ADAPTER_VERSION, granularities: ['month'], dimensions: ['spaceId'], suggestedSections: ['entrega_a_tiempo', 'rendimiento_por_asignacion'] }),
  collect: async (input: AdapterCollectInput) => {
    const spaces = await listOrganizationSpaces(input.organizationId)

    if (spaces.length === 0) {
      return { facts: [], sources: [], rejections: [{ module: 'ico', metricId: null, reason: 'not_connected', detail: 'La organización no tiene spaces activos' }] }
    }

    const comparisonIds: Record<string, string | null> = {}
    let comparison: Awaited<ReturnType<typeof collectForWindow>> | null = null

    if (input.comparison) {
      comparison = await collectForWindow(spaces, input.comparison, {})

      // Comparable por space cuando el período anterior tiene UN mes (mismo grano); con varios meses
      // la comparación es por serie, no por par de hechos.
      if (input.comparison.months.length === 1) {
        for (const fact of comparison.facts) comparisonIds[`${fact.metricId}.${fact.dimension?.spaceId}`] = fact.factId
      }
    }

    const current = await collectForWindow(spaces, input.window, input.window.months.length === 1 ? comparisonIds : {})

    return {
      facts: [...current.facts, ...(comparison?.facts ?? [])],
      sources: [current.source, comparison?.source ?? null].filter((source): source is EvidenceSourceV1 => source !== null),
      rejections: [...current.rejections, ...(comparison?.rejections ?? [])]
    }
  }
}
