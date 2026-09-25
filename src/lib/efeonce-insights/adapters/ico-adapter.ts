import 'server-only'

/**
 * TASK-1845 — adapter ICO/delivery (RpA y OTD). El dueño del cómputo es `ico-engine`
 * (`readSpaceMetrics`, materializado mensual); el adapter mapea org → spaces por
 * `greenhouse_core.spaces.organization_id`, exige meses calendario completos (grano del
 * dueño), hereda `dataStatus`/`suppressionReason` de RpA y conserva numerador/denominador
 * de OTD por space. Nunca promedia promedios ni porcentajes entre spaces.
 */

import { GH_INSIGHTS } from '@/lib/copy/insights'
import { getMetricById } from '@/lib/ico-engine/metric-registry'
import { readSpaceMetrics } from '@/lib/ico-engine/read-metrics'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { EvidenceFactV1, EvidenceRejectionV1, EvidenceSourceV1, EvidenceUnit } from '../contracts/evidence'
import type { ResolvedInsightWindow } from '../window'
import { type AdapterCollectInput, type ModuleReportAdapterV1, asComparisonRejections, evidenceWindow, factId } from './contract'

export const ICO_ADAPTER_VERSION = 'ico_report_adapter_v1'

interface SpaceRow extends Record<string, unknown> {
  space_id: string
  space_name: string
}

/**
 * Ids que este adapter lee del snapshot, tal como los declara el registro canónico del motor ICO
 * (`ICO_METRIC_REGISTRY`). El `metricId` del hecho de Insights (`rpa`, `otd`) es vocabulario propio;
 * el del snapshot NO. Se buscó `'otd'` cuando el motor lo llama `'otd_pct'`, y OTD no llegó a ningún
 * informe sin que nada fallara (TASK-1847 canary, 2026-09-22). Un test cruza estos ids con el registro.
 */
export const ICO_SNAPSHOT_METRIC_IDS = { rpa: 'rpa', otd: 'otd_pct', ftr: 'ftr_pct' } as const

/** TASK-1888 — métricas con meta oficial citable y su unidad en el documento. */
const TARGET_METRICS: ReadonlyArray<{ metricId: keyof typeof ICO_SNAPSHOT_METRIC_IDS; unit: EvidenceUnit }> = [
  { metricId: 'otd', unit: 'percent' },
  { metricId: 'ftr', unit: 'percent' },
  { metricId: 'rpa', unit: 'ratio' }
]

/**
 * TASK-1888 — la meta oficial de una métrica ICO, leída del registro dueño (`ICO_METRIC_REGISTRY`), NUNCA un
 * literal: el umbral inferior de la zona óptima si la métrica mejora al subir (OTD 90, FTR 80), el superior si
 * mejora al bajar (RpA 1,5). Es un hecho de REFERENCIA: se puede citar en un gráfico o una frase, no es un hallazgo.
 */
export const icoOfficialTarget = (metricId: keyof typeof ICO_SNAPSHOT_METRIC_IDS): { value: number; band: number; higherIsBetter: boolean } | null => {
  const definition = getMetricById(ICO_SNAPSHOT_METRIC_IDS[metricId])

  if (!definition) return null

  const { optimal, attention } = definition.thresholds

  // Banda «cerca de la meta» = el borde exterior de la zona `attention` del MISMO registro (OTD 70, FTR 60, RpA 2,5).
  return {
    value: definition.higherIsBetter ? optimal.min : optimal.max,
    band: definition.higherIsBetter ? attention.min : attention.max,
    higherIsBetter: definition.higherIsBetter
  }
}

export const listOrganizationSpaces = async (organizationId: string): Promise<SpaceRow[]> =>
  runGreenhousePostgresQuery<SpaceRow>(
    `SELECT space_id, space_name FROM greenhouse_core.spaces
      WHERE organization_id = $1 AND active = true
      ORDER BY space_name COLLATE "C", space_id COLLATE "C"`,
    [organizationId]
  )

const collectForWindow = async (spaces: SpaceRow[], window: ResolvedInsightWindow, comparisonIds: Record<string, string | null>, editorialV2 = false) => {
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

      const rpa = snapshot.metrics.find(metric => metric.metricId === ICO_SNAPSHOT_METRIC_IDS.rpa)
      const otd = snapshot.metrics.find(metric => metric.metricId === ICO_SNAPSHOT_METRIC_IDS.otd)

      if (rpa) {
        const suppressed = rpa.dataStatus === 'suppressed' || rpa.dataStatus === 'unavailable'

        if (suppressed) {
          rejections.push({ module: 'ico', metricId: 'rpa', reason: 'suppressed', detail: `RpA ${rpa.dataStatus} en ${space.space_name} ${month}: ${rpa.suppressionReason ?? 'sin motivo'}` })
        } else {
          facts.push({ ...base, factId: factId('ico', 'rpa', window, dimension), metricId: 'rpa', label: `RpA · ${space.space_name} · ${month}`, value: rpa.value, unit: 'ratio', numerator: null, denominator: null, coverage: { kind: rpa.dataStatus === 'low_confidence' ? 'partial' : 'complete', ratio: null, populationSize: rpa.evidence?.eligibleTasks ?? snapshot.context.completedTasks }, comparisonFactId: comparisonIds[`rpa.${space.space_id}`] ?? null })
        }
      } else {
        // Una métrica esperada que el snapshot no trae se NARRA como límite: omitirla en silencio haría que el
        // informe calle justo lo que no pudo medir.
        rejections.push({ module: 'ico', metricId: 'rpa', reason: 'no_data', detail: `El snapshot ICO de ${space.space_name} en ${month} no trae RpA` })
      }

      if (otd) {
        const numerator = snapshot.context.onTimeTasks
        const denominator = snapshot.context.onTimeTasks + snapshot.context.lateDropTasks + snapshot.context.overdueTasks

        if (denominator <= 0 || otd.value === null) {
          rejections.push({ module: 'ico', metricId: 'otd', reason: 'insufficient_data', detail: `OTD sin denominador en ${space.space_name} ${month} (0 tareas elegibles)` })
        } else {
          facts.push({ ...base, factId: factId('ico', 'otd', window, dimension), metricId: 'otd', label: `OTD · ${space.space_name} · ${month}`, value: otd.value, unit: 'percent', numerator, denominator, coverage: { kind: 'complete', ratio: 1, populationSize: denominator }, comparisonFactId: comparisonIds[`otd.${space.space_id}`] ?? null })
        }
      } else {
        rejections.push({ module: 'ico', metricId: 'otd', reason: 'no_data', detail: `El snapshot ICO de ${space.space_name} en ${month} no trae OTD` })
      }

      // TASK-1888 — FTR ya lo calcula el motor ICO (`ftr_pct`): el adapter sólo lo lee. Sólo con el contrato v2, para
      // que la evidencia v1 quede idéntica con el flag apagado.
      if (editorialV2) {
        const ftr = snapshot.metrics.find(metric => metric.metricId === ICO_SNAPSHOT_METRIC_IDS.ftr)

        if (ftr && ftr.value !== null) {
          facts.push({ ...base, factId: factId('ico', 'ftr', window, dimension), metricId: 'ftr', label: `FTR · ${space.space_name} · ${month}`, value: ftr.value, unit: 'percent', numerator: null, denominator: null, coverage: { kind: ftr.qualityGateStatus === 'degraded' ? 'partial' : 'complete', ratio: null, populationSize: ftr.trustEvidence?.sampleSize ?? null }, comparisonFactId: comparisonIds[`ftr.${space.space_id}`] ?? null })
        } else {
          rejections.push({ module: 'ico', metricId: 'ftr', reason: ftr ? 'insufficient_data' : 'no_data', detail: ftr ? `FTR sin valor en ${space.space_name} ${month}` : `El snapshot ICO de ${space.space_name} en ${month} no trae FTR` })
        }
      }

      source = source ?? { module: 'ico', adapterVersion: ICO_ADAPTER_VERSION, reader: 'readSpaceMetrics', asOf, method, coverage: { kind: 'complete', ratio: null, populationSize: spaces.length }, servedWindow: { start: `${window.months[0]}-01`, endExclusive: window.endExclusive, granularity: 'month', partial: window.partial } }
    }
  }

  return { facts, rejections, source }
}

/** Una meta por métrica medida en la ventana actual (misma meta para todo space y mes: la define el registro). */
const targetFacts = (measured: EvidenceFactV1[], window: ResolvedInsightWindow): EvidenceFactV1[] =>
  TARGET_METRICS.flatMap(({ metricId, unit }) => {
    const target = icoOfficialTarget(metricId)

    if (!target || !measured.some(fact => fact.metricId === metricId)) return []

    const reference = (kind: 'target' | 'band', value: number): EvidenceFactV1 => ({
      factVersion: 'evidence_fact_v1' as const,
      factId: factId('ico', `${kind}.${metricId}`, window),
      module: 'ico' as const,
      metricId: `${kind}.${metricId}`,
      label: (kind === 'target' ? GH_INSIGHTS.targets : GH_INSIGHTS.bands)[metricId] ?? metricId,
      value,
      unit,
      numerator: null,
      denominator: null,
      population: 'Meta oficial del registro de métricas de entrega',
      source: 'ico_engine.ICO_METRIC_REGISTRY',
      method: { name: 'ico_metric_registry', version: ICO_ADAPTER_VERSION },
      coverage: { kind: 'complete' as const, ratio: 1, populationSize: null },
      freshness: { asOf: null },
      observation: 'observed' as const,
      window: evidenceWindow(window, 'period'),
      evidenceRef: `ico_metric_registry:${ICO_SNAPSHOT_METRIC_IDS[metricId]}`,
      comparisonFactId: null,
      dimension: { metric: metricId, direction: target.higherIsBetter ? 'higher_is_better' : 'lower_is_better' },
      role: 'reference' as const
    })

    return [reference('target', target.value), reference('band', target.band)]
  })

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
      comparison = await collectForWindow(spaces, input.comparison, {}, input.editorialV2 === true)

      // Comparable por space cuando el período anterior tiene UN mes (mismo grano); con varios meses
      // la comparación es por serie, no por par de hechos.
      if (input.comparison.months.length === 1) {
        for (const fact of comparison.facts) comparisonIds[`${fact.metricId}.${fact.dimension?.spaceId}`] = fact.factId
      }
    }

    const current = await collectForWindow(spaces, input.window, input.window.months.length === 1 ? comparisonIds : {}, input.editorialV2 === true)
    const targets = input.editorialV2 === true ? targetFacts(current.facts, input.window) : []

    return {
      facts: [...current.facts, ...targets, ...(comparison?.facts ?? [])],
      sources: [current.source, comparison?.source ?? null].filter((source): source is EvidenceSourceV1 => source !== null),
      rejections: [...current.rejections, ...asComparisonRejections(comparison?.rejections ?? [])]
    }
  }
}
