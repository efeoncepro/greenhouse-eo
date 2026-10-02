import 'server-only'

/**
 * TASK-1845 — adapter AEO (AI Visibility Grader). Un run del grader es un snapshot PUNTUAL:
 * el adapter sólo lo usa si su corte (`provenance.asOfDate`) cae dentro de la ventana; jamás
 * proyecta el último score como histórico. Respeta `review_required` e `insufficient_data`
 * del gate del reporte cliente (arquitectura §5).
 */

import { ClientGraderReportError, readClientGraderReport } from '@/lib/growth/ai-visibility/client/command'
import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'
import { GH_INSIGHTS } from '@/lib/copy/insights'
import { buildCompetitiveBenchmark } from '@/lib/growth/ai-visibility/report/view-facts'

import { channelForAeoProvider } from '../contracts/channels'
import type { EvidenceFactV1, EvidenceRejectionV1, EvidenceSourceV1 } from '../contracts/evidence'
import type { ResolvedInsightWindow } from '../window'
import { type AdapterCollectInput, type ModuleReportAdapterV1, asComparisonRejections, evidenceWindow, factId } from './contract'

// v2 (TASK-1957): tasa de mención por motor, Share of Model, Share of Voice y citation share en vez de conteos de presencia.
export const AEO_ADAPTER_VERSION = 'aeo_report_adapter_v2'

/** Clave estable de un competidor para comparar ediciones (sin tildes ni signos). */
const competitorSlug = (name: string): string =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const collectForWindow = async (organizationId: string, window: ResolvedInsightWindow, comparisonIds: Record<string, string | null>, editorialV2 = false) => {
  const facts: EvidenceFactV1[] = []
  const rejections: EvidenceRejectionV1[] = []

  let report

  try {
    // El análisis que corresponde al período: terminó dentro de la ventana. El último de la organización podía ser
    // posterior y dejaba el capítulo vacío (Berel, corrida del 2026-10-02 frente a la edición de septiembre).
    report = (await readClientGraderReport({ organizationId, finishedWithin: { startUtc: window.startUtc, endUtc: window.endUtc } })).report
  } catch (error) {
    if (error instanceof ClientGraderReportError) {
      // Sin análisis dentro del período: si la organización sí tiene análisis (fuera de la ventana), es una ventana sin
      // run propio, no un Grader desconectado.
      const outsideWindow = error.code === 'not_found' && (await readClientGraderReport({ organizationId }).then(() => true, () => false))

      rejections.push(
        outsideWindow
          ? { module: 'aeo', metricId: null, reason: 'unsupported_window', detail: `Sin análisis AEO terminado entre ${window.start} y ${window.endInclusive}`, alternative: { granularity: 'period', note: 'Correr el grader dentro del período o elegir una ventana que contenga un run.' } }
          : { module: 'aeo', metricId: null, reason: error.code === 'not_found' ? 'not_connected' : 'no_data', detail: `Grader: ${error.code}` }
      )

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

  // TASK-1957 — sin competidores detectados, el Grader puntúa `competitive_sov` con 100 (marca / (marca + 0)): no es una
  // medición frente a nadie y en un informe se lee como liderazgo. No entra como hecho; el límite de Share of Voice lo
  // declara. Y como esa dimensión pesa en el puntaje global, un global con ella puntuada sin competidores arrastra puntos
  // que nadie midió: tampoco entra (límite propio). Corrección de raíz del puntaje: follow-up del Grader.
  const hasCompetitors = (report.competitiveSov?.competitors ?? []).length > 0
  const inflatedOverall = !hasCompetitors && report.dimensions.some(dimension => dimension.key === 'competitive_sov' && (dimension.score ?? 0) > 0)

  if (inflatedOverall) {
    rejections.push({ module: 'aeo', metricId: 'overall_score', reason: 'insufficient_data', detail: 'El puntaje global incluye participación frente a competencia sin competidores detectados' })
  } else {
    facts.push({ ...base, factId: factId('aeo', 'overall_score', window), metricId: 'overall_score', label: GH_INSIGHTS.metrics.overall_score!, value: report.overallScore, unit: 'score', numerator: null, denominator: null, comparisonFactId: comparisonIds.overall_score ?? null })
  }

  for (const dimension of report.dimensions) {
    if (dimension.key === 'competitive_sov' && !hasCompetitors) continue

    const key = `dimension.${dimension.key}`

    // El label del contrato del grader es inglés («Entity Clarity»); el documento usa el label es-CL que el propio grader
    // declara para superficies de cliente. Sin entrada, el del contrato (nunca la key cruda).
    const label = (GH_GROWTH_AI_VISIBILITY.dimension_label as Readonly<Record<string, string>>)[dimension.key] ?? dimension.label

    facts.push({ ...base, factId: factId('aeo', key, window), metricId: key, label, value: dimension.score, unit: 'score', numerator: null, denominator: null, comparisonFactId: comparisonIds[key] ?? null, dimension: { dimension: dimension.key } })
  }

  // TASK-1957 — indicadores estándar de visibilidad en motores de respuesta (skill seo-aeo §07), con la MISMA
  // definición que el informe del Grader: la tasa de mención es su `mentionRate` (present / resolved) y el Share of Voice
  // sale de su `buildCompetitiveBenchmark`. Un indicador, una fórmula.
  //  - Tasa de mención por motor: % de respuestas de ese motor que mencionan la marca (antes: conteo «2 de 6»).
  //  - Share of Model: % de respuestas que mencionan la marca en todos los motores medidos.
  //  - Share of Voice: menciones de la marca frente a las de los competidores en el mismo panel.
  //  - Citation share: % de respuestas con citas que citan el sitio propio.
  const round1 = (value: number) => Math.round(value * 10) / 10
  // Un motor sin respuestas resueltas no tiene tasa (sin dato ≠ 0 %). Un proveedor fuera del registro conserva su fila
  // con el nombre crudo y sin isotipo (contrato de `contracts/channels.ts`).
  const measured = report.providerPresence.filter(presence => presence.resolved > 0)
  const providerLabels = GH_GROWTH_AI_VISIBILITY.provider_display_label as Readonly<Record<string, string>>

  for (const presence of measured) {
    const key = `mention_rate.${presence.provider}`
    // TASK-1888 — canal estable del motor; un proveedor fuera del registro queda sin channelId (nombre sin isotipo).
    const channelId = channelForAeoProvider(presence.provider)

    facts.push({ ...base, factId: factId('aeo', key, window), metricId: key, label: `Mención en ${providerLabels[presence.provider] ?? presence.provider}`, value: round1((presence.present / presence.resolved) * 100), unit: 'percent', numerator: presence.present, denominator: presence.resolved, comparisonFactId: comparisonIds[key] ?? null, dimension: { provider: presence.provider }, ...(channelId ? { channelId } : {}) })
  }

  const totalResolved = measured.reduce((sum, presence) => sum + presence.resolved, 0)
  const totalPresent = measured.reduce((sum, presence) => sum + presence.present, 0)

  if (totalResolved > 0) {
    facts.push({ ...base, factId: factId('aeo', 'share_of_model', window), metricId: 'share_of_model', label: GH_INSIGHTS.metrics.share_of_model!, value: round1((totalPresent / totalResolved) * 100), unit: 'percent', numerator: totalPresent, denominator: totalResolved, comparisonFactId: comparisonIds.share_of_model ?? null })
  }

  const benchmark = buildCompetitiveBenchmark(report.competitiveSov ?? { brandMentions: 0, competitors: [] })

  // Share of Voice sólo con competidores en el panel: contra nadie, el 100 % no dice nada.
  if (benchmark.totalMentions > 0 && benchmark.rows.some(row => !row.isBrand)) {
    const brand = benchmark.rows.find(row => row.isBrand)

    if (brand) {
      facts.push({ ...base, factId: factId('aeo', 'sov.brand', window), metricId: 'sov.brand', label: GH_INSIGHTS.metrics['sov.brand']!, value: round1((brand.mentions / benchmark.totalMentions) * 100), unit: 'percent', numerator: brand.mentions, denominator: benchmark.totalMentions, comparisonFactId: comparisonIds['sov.brand'] ?? null, dimension: { competitor: 'brand' } })
    }

    // Los cinco competidores con más menciones; el resto queda en la evidencia del Grader.
    for (const row of benchmark.rows.filter(item => !item.isBrand).slice(0, 5)) {
      const key = `sov.competitor.${competitorSlug(row.name)}`

      facts.push({ ...base, factId: factId('aeo', key, window), metricId: key, label: row.name, value: round1((row.mentions / benchmark.totalMentions) * 100), unit: 'percent', numerator: row.mentions, denominator: benchmark.totalMentions, comparisonFactId: comparisonIds[key] ?? null, dimension: { competitor: row.name } })
    }
  }

  // Sin competidores en el panel no hay Share of Voice: se declara como límite, nunca se omite en silencio.
  if (!benchmark.rows.some(row => !row.isBrand)) {
    rejections.push({ module: 'aeo', metricId: 'share_of_voice', reason: 'insufficient_data', detail: 'El panel del Grader no detectó competidores con menciones' })
  }

  const citations = report.citationInsight

  if (citations && citations.ownDomainShare !== null && citations.findingsWithCitations > 0) {
    facts.push({ ...base, factId: factId('aeo', 'citation_share', window), metricId: 'citation_share', label: GH_INSIGHTS.metrics.citation_share!, value: round1((citations.findingsCitingOwnDomain / citations.findingsWithCitations) * 100), unit: 'percent', numerator: citations.findingsCitingOwnDomain, denominator: citations.findingsWithCitations, comparisonFactId: comparisonIds.citation_share ?? null })
  }

  // TASK-1962 — lo que el MISMO informe del Grader ya mide y el de Insights no usaba (contrato de contenido): qué sitios
  // citan los motores y de qué tipo son («¿por qué?»: de dónde sale lo que dicen) y con qué tono hablan de la marca. Sólo
  // con contrato v2, para que la evidencia v1 quede idéntica. Conteos del Grader tal cual; nada se recalcula.
  if (editorialV2) {
    const breakdown = report.citationSourceBreakdown

    if (breakdown && breakdown.totalCitations > 0) {
      breakdown.domains.slice(0, 5).forEach((source, index) => {
        const key = `cited_source.${index + 1}`

        facts.push({ ...base, factId: factId('aeo', key, window), metricId: key, label: source.domain, value: source.count, unit: 'count', numerator: source.count, denominator: breakdown.totalCitations, comparisonFactId: comparisonIds[key] ?? null, dimension: { domain: source.domain, classification: source.classification, rank: String(index + 1) } })
      })
    }

    for (const type of report.sourceTypeSummary ?? []) {
      if (type.count <= 0) continue

      const key = `source_type.${type.sourceType}`

      facts.push({ ...base, factId: factId('aeo', key, window), metricId: key, label: GH_INSIGHTS.aeoSourceTypes[type.sourceType] ?? type.sourceType, value: type.count, unit: 'count', numerator: null, denominator: null, comparisonFactId: comparisonIds[key] ?? null, dimension: { sourceType: type.sourceType } })
    }

    const sentiment = report.sentimentSummary

    if (sentiment && sentiment.evaluated > 0) {
      for (const tone of ['positive', 'neutral', 'negative', 'mixed'] as const) {
        const key = `sentiment.${tone}`

        facts.push({ ...base, factId: factId('aeo', key, window), metricId: key, label: GH_INSIGHTS.aeoSentiments[tone]!, value: sentiment[tone], unit: 'count', numerator: sentiment[tone], denominator: sentiment.evaluated, comparisonFactId: comparisonIds[key] ?? null, dimension: { tone } })
      }
    }
  }

  return { facts, rejections, source: { module: 'aeo', adapterVersion: AEO_ADAPTER_VERSION, reader: 'readClientGraderReport', asOf, method, coverage, servedWindow: { start: asOf, endExclusive: asOf, granularity: 'period', partial: false } } as EvidenceSourceV1 }
}

export const aeoReportAdapter: ModuleReportAdapterV1 = {
  describe: () => ({ module: 'aeo', version: AEO_ADAPTER_VERSION, granularities: ['period'], dimensions: [], suggestedSections: ['visibilidad_ia', 'presencia_por_motor'] }),
  collect: async (input: AdapterCollectInput) => {
    const comparisonIds: Record<string, string | null> = {}
    let comparison: Awaited<ReturnType<typeof collectForWindow>> | null = null

    if (input.comparison) {
      comparison = await collectForWindow(input.organizationId, input.comparison, {}, input.editorialV2 === true)

      for (const fact of comparison.facts) comparisonIds[fact.metricId] = fact.factId
    }

    const current = await collectForWindow(input.organizationId, input.window, comparisonIds, input.editorialV2 === true)

    return {
      facts: [...current.facts, ...(comparison?.facts ?? [])],
      sources: [current.source, comparison?.source ?? null].filter((source): source is EvidenceSourceV1 => source !== null),
      rejections: [...current.rejections, ...asComparisonRejections(comparison?.rejections ?? [])]
    }
  }
}
