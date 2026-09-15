import 'server-only'

/**
 * TASK-1845 — adapter AEO (AI Visibility Grader). Un run del grader es un snapshot PUNTUAL:
 * el adapter sólo lo usa si su corte (`provenance.asOfDate`) cae dentro de la ventana; jamás
 * proyecta el último score como histórico. Respeta `review_required` e `insufficient_data`
 * del gate del reporte cliente (arquitectura §5).
 */

import { ClientGraderReportError, readClientGraderReport } from '@/lib/growth/ai-visibility/client/command'

import type { EvidenceFactV1, EvidenceRejectionV1, EvidenceSourceV1 } from '../contracts/evidence'
import type { ResolvedInsightWindow } from '../window'
import { type AdapterCollectInput, type ModuleReportAdapterV1, evidenceWindow, factId } from './contract'

export const AEO_ADAPTER_VERSION = 'aeo_report_adapter_v1'

const collectForWindow = async (organizationId: string, window: ResolvedInsightWindow, comparisonIds: Record<string, string | null>) => {
  const facts: EvidenceFactV1[] = []
  const rejections: EvidenceRejectionV1[] = []

  let report

  try {
    report = (await readClientGraderReport({ organizationId })).report
  } catch (error) {
    if (error instanceof ClientGraderReportError) {
      rejections.push({ module: 'aeo', metricId: null, reason: error.code === 'not_found' ? 'not_connected' : 'no_data', detail: `Grader: ${error.code}` })

      return { facts, rejections, source: null as EvidenceSourceV1 | null }
    }

    throw error
  }

  const asOf = report.provenance.asOfDate

  if (!asOf || asOf < window.start || asOf >= window.endExclusive) {
    rejections.push({ module: 'aeo', metricId: null, reason: 'unsupported_window', detail: `El último análisis AEO es del ${asOf ?? 'sin fecha'}; la ventana ${window.start}–${window.endInclusive} no tiene un run propio`, alternative: { granularity: 'period', note: 'Correr el grader dentro del período o elegir una ventana que contenga un run.' } })

    return { facts, rejections, source: null as EvidenceSourceV1 | null }
  }

  if (report.gate.status === 'insufficient_data' || report.gate.status === 'review_required') {
    rejections.push({ module: 'aeo', metricId: 'overall_score', reason: report.gate.status, detail: report.gate.reason })

    return { facts, rejections, source: null as EvidenceSourceV1 | null }
  }

  const method = { name: 'ai_visibility_grader', version: `${report.provenance.scoreVersion}/${report.provenance.promptPackVersion}` }
  const coverage = { kind: report.gate.status === 'partial' ? ('partial' as const) : ('complete' as const), ratio: null, populationSize: report.provenance.promptCount }

  const base = {
    factVersion: 'evidence_fact_v1' as const,
    module: 'aeo' as const,
    population: `${report.provenance.promptCount} prompts sobre ${report.provenance.providersSampled.length} motores`,
    source: 'greenhouse_growth.grader_runs',
    method,
    coverage,
    freshness: { asOf },
    observation: 'observed' as const,
    window: evidenceWindow(window, 'period'),
    evidenceRef: `grader_report:${organizationId}:${asOf}:${report.provenance.scoreVersion}`
  }

  facts.push({ ...base, factId: factId('aeo', 'overall_score', window), metricId: 'overall_score', label: 'Score de visibilidad en IA', value: report.overallScore, unit: 'score', numerator: null, denominator: null, comparisonFactId: comparisonIds.overall_score ?? null })

  for (const dimension of report.dimensions) {
    const key = `dimension.${dimension.key}`

    facts.push({ ...base, factId: factId('aeo', key, window), metricId: key, label: dimension.label, value: dimension.score, unit: 'score', numerator: null, denominator: null, comparisonFactId: comparisonIds[key] ?? null, dimension: { dimension: dimension.key } })
  }

  for (const presence of report.providerPresence) {
    const key = `presence.${presence.provider}`

    facts.push({ ...base, factId: factId('aeo', key, window), metricId: key, label: `Presencia en ${presence.provider}`, value: presence.present, unit: 'count', numerator: presence.present, denominator: presence.resolved, comparisonFactId: comparisonIds[key] ?? null, dimension: { provider: presence.provider } })
  }

  return { facts, rejections, source: { module: 'aeo', adapterVersion: AEO_ADAPTER_VERSION, reader: 'readClientGraderReport', asOf, method, coverage, servedWindow: { start: asOf, endExclusive: asOf, granularity: 'period', partial: false } } as EvidenceSourceV1 }
}

export const aeoReportAdapter: ModuleReportAdapterV1 = {
  describe: () => ({ module: 'aeo', version: AEO_ADAPTER_VERSION, granularities: ['period'], dimensions: [], suggestedSections: ['visibilidad_ia', 'presencia_por_motor'] }),
  collect: async (input: AdapterCollectInput) => {
    const comparisonIds: Record<string, string | null> = {}
    let comparison: Awaited<ReturnType<typeof collectForWindow>> | null = null

    if (input.comparison) {
      comparison = await collectForWindow(input.organizationId, input.comparison, {})

      for (const fact of comparison.facts) comparisonIds[fact.metricId] = fact.factId
    }

    const current = await collectForWindow(input.organizationId, input.window, comparisonIds)

    return {
      facts: [...current.facts, ...(comparison?.facts ?? [])],
      sources: [current.source, comparison?.source ?? null].filter((source): source is EvidenceSourceV1 => source !== null),
      rejections: [...current.rejections, ...(comparison?.rejections ?? [])]
    }
  }
}
