/**
 * TASK-1252 — AI Visibility Report Artifact · fixtures.
 *
 * Un `GraderReport` interno realista ("Globe") del que se derivan los DTOs
 * públicos/cliente con los builders REALES (`toPublicGraderReport` /
 * `toClientGraderReport`). Alimenta el harness del mockup y el no-leak visual
 * test (Slice C): así el render se ejercita contra el contrato real, no contra
 * un shape inventado. Ejercita `null ≠ 0` (message_alignment sin evidencia).
 */

import {
  AI_VISIBILITY_SCORE_VERSION,
  SCORE_DIMENSION_CONFIG_BY_KEY,
  type ScoreDimensionKey
} from '@/lib/growth/ai-visibility/scoring/config'
import {
  GROWTH_AI_VISIBILITY_RECOMMENDATION_PACK_VERSION,
  GROWTH_AI_VISIBILITY_REPORT_VERSION,
  toClientGraderReport,
  toPublicGraderReport,
  type GraderReport,
  type ReportDimension,
  type ReportRecommendation
} from '@/lib/growth/ai-visibility/report'
import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

const dim = (
  key: ScoreDimensionKey,
  score: number | null,
  severity: ReportDimension['severity'],
  recommendation: ReportRecommendation | null = null
): ReportDimension => ({
  key,
  label: SCORE_DIMENSION_CONFIG_BY_KEY[key].label,
  explainer: GH_GROWTH_AI_VISIBILITY.dimension_explainer[key],
  weight: SCORE_DIMENSION_CONFIG_BY_KEY[key].weight,
  score,
  max: 100,
  status: score === null ? 'empty' : 'ok',
  severity,
  reason: score === null ? 'Sin respuestas evaluables en este eje durante la muestra.' : null,
  recommendation
})

const citationRec: ReportRecommendation = {
  gapKey: 'weak_citation_quality',
  dimensionKey: 'citation_quality',
  title: GH_GROWTH_AI_VISIBILITY.recommendation.weak_citation_quality.title,
  action: GH_GROWTH_AI_VISIBILITY.recommendation.weak_citation_quality.action,
  motion: 'digital_pr_citations',
  severity: 'critico',
  priority: 0.92
}

const categoryRec: ReportRecommendation = {
  gapKey: 'low_category_ownership',
  dimensionKey: 'category_ownership',
  title: GH_GROWTH_AI_VISIBILITY.recommendation.low_category_ownership.title,
  action: GH_GROWTH_AI_VISIBILITY.recommendation.low_category_ownership.action,
  motion: 'category_authority',
  severity: 'atencion',
  priority: 0.61
}

const revenueRec: ReportRecommendation = {
  gapKey: 'weak_revenue_intent',
  dimensionKey: 'revenue_intent_coverage',
  title: GH_GROWTH_AI_VISIBILITY.recommendation.weak_revenue_intent.title,
  action: GH_GROWTH_AI_VISIBILITY.recommendation.weak_revenue_intent.action,
  motion: 'bottom_funnel_content',
  severity: 'atencion',
  priority: 0.44
}

/** Reporte INTERNO completo de ejemplo ("Globe"). Incluye campos internal-only. */
export const SAMPLE_INTERNAL_REPORT: GraderReport = {
  reportVersion: GROWTH_AI_VISIBILITY_REPORT_VERSION,
  recommendationPackVersion: GROWTH_AI_VISIBILITY_RECOMMENDATION_PACK_VERSION,
  scoreVersion: AI_VISIBILITY_SCORE_VERSION,
  runId: 'run_globe_2026_05_19',
  audience: 'internal_sales',
  gate: {
    status: 'ready',
    reason: GH_GROWTH_AI_VISIBILITY.gate.ready.reason,
    nextAction: GH_GROWTH_AI_VISIBILITY.gate.ready.nextAction
  },
  headline: {
    dimensionKey: 'citation_quality',
    metric: 'Visibilidad estimada',
    value: '63/100',
    frame: GH_GROWTH_AI_VISIBILITY.headline_frame.atencion('Visibilidad en IA'),
    severity: 'atencion'
  },
  overallScore: 63,
  overallSeverity: 'atencion',
  findings: [
    { key: 'citation', severity: 'critico', text: 'Bajo nivel de citas verificables frente al benchmark.' },
    { key: 'sov', severity: 'atencion', text: 'Dos competidores aparecen más que la marca en respuestas de IA.' }
  ],
  dimensions: [
    dim('ai_visibility', 72, 'atencion'),
    dim('entity_clarity', 68, 'atencion'),
    dim('category_ownership', 54, 'atencion', categoryRec),
    dim('competitive_sov', 63, 'atencion'),
    dim('citation_quality', 32, 'critico', citationRec),
    dim('message_alignment', null, 'sin_dato'),
    dim('revenue_intent_coverage', 45, 'atencion', revenueRec)
  ],
  recommendations: [citationRec, categoryRec, revenueRec],
  primaryGap: citationRec,
  recommendedMotion: 'digital_pr_citations',
  competitiveSov: {
    brandMentions: 32,
    competitors: [
      { name: 'Competidor A', mentions: 48 },
      { name: 'Competidor B', mentions: 41 },
      { name: 'Competidor C', mentions: 23 }
    ]
  },
  sourceTypeSummary: [
    { sourceType: 'Medios y prensa', count: 18 },
    { sourceType: 'Directorios de industria', count: 12 },
    { sourceType: 'Sitio propio', count: 9 }
  ],
  providerPresence: [
    { provider: 'gemini', resolved: 24, present: 19 },
    { provider: 'openai', resolved: 24, present: 18 },
    { provider: 'anthropic', resolved: 24, present: 17 },
    { provider: 'perplexity', resolved: 24, present: 14 }
  ],
  providerFindings: [
    { key: 'perplexity_gap', severity: 'critico', text: 'INTERNAL: invisible en Perplexity en 10 de 24 respuestas.' }
  ],
  accuracyFindings: [
    {
      kind: 'entity_collision',
      confidence: 'medium',
      evidenceCount: 3,
      label: GH_GROWTH_AI_VISIBILITY.accuracy_kind_label.entity_collision,
      detail: 'INTERNAL: confusión con una marca homónima en 3 respuestas.'
    }
  ],
  citationInsight: {
    ownDomainShare: 32,
    findingsWithCitations: 100,
    findingsCitingOwnDomain: 32
  },
  citationSourceBreakdown: {
    domains: [
      { domain: 'g2.com', count: 18, engines: ['openai', 'perplexity'], classification: 'third_party' },
      { domain: 'reddit.com', count: 11, engines: ['perplexity'], classification: 'ugc' },
      { domain: 'globe.com', count: 9, engines: ['gemini', 'openai'], classification: 'own_domain' },
      { domain: 'competidor-a.com', count: 7, engines: ['anthropic'], classification: 'competitor' }
    ],
    totalCitations: 45,
    uniqueDomains: 4,
    reason: null
  },
  sentimentSummary: {
    positive: 38,
    neutral: 45,
    negative: 17,
    mixed: 0,
    evaluated: 100,
    net: 'neutral'
  },
  positionSummary: {
    best: 2,
    average: 3,
    ranked: 64
  },
  trend: {
    status: 'con_tendencia',
    reason: GH_GROWTH_AI_VISIBILITY.trend_status.con_tendencia,
    previousAsOf: '2026-05-04',
    overall: { current: 63, previous: 58, delta: 5, direction: 'subio' },
    dimensions: []
  },
  // TASK-1266 — readiness técnica (structural/agentic). El render del eje lo gobierna TASK-1252;
  // este fixture lo deja en null (no se probó el sitio) hasta que TASK-1252 lo materialice visualmente.
  readiness: null,
  provenance: {
    asOfDate: '2026-05-19',
    promptPackVersion: '2.3.1',
    scoreVersion: AI_VISIBILITY_SCORE_VERSION,
    providersSampled: ['gemini', 'openai', 'anthropic', 'perplexity'],
    promptCount: 24
  },
  disclaimer: GH_GROWTH_AI_VISIBILITY.disclaimer
}

/** DTO público derivado con el builder real (leak-safe por construcción). */
export const SAMPLE_PUBLIC_REPORT = toPublicGraderReport(SAMPLE_INTERNAL_REPORT)

/** DTO cliente derivado con el builder real (set completo de recomendaciones). */
export const SAMPLE_CLIENT_REPORT = toClientGraderReport(SAMPLE_INTERNAL_REPORT)
