/**
 * TASK-1247 — Admin Review UI del AEO Grader · adapters DTO→VM (PUROS, sin IO).
 *
 * Mapean los contratos reales (`GraderReport` interno + `PublicGraderReport`) y la fila de
 * cola enriquecida (`PendingReportReview`) a los view-models que consume el drawer. Puros y
 * testeables — el rendering (shared.tsx) no toma decisiones de dominio, sólo pinta el VM.
 *
 * Regla load-bearing (mirror del contrato de report): `null ≠ 0`. Un score/dimensión sin
 * evidencia se propaga como `null` + severidad `sin_dato`, NUNCA como 0. La evidencia interna
 * decisoria (accuracy + narrativa por motor) es INTERNAL-ONLY: nunca sale del drawer al público.
 */

import { type AccuracyConfidence } from '@/lib/growth/ai-visibility/accuracy/contracts'
import {
  type GraderReport,
  type GraderReportSeverity,
  type PublicGraderReport
} from '@/lib/growth/ai-visibility/report/contracts'
import { type PendingReportReview } from '@/lib/growth/ai-visibility/review/queries'
import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

// ─── View-models ────────────────────────────────────────────────────────────────────

export interface EnginePresenceVM {
  provider: string
  label: string
  present: boolean
  /** Respuestas resueltas del motor (denominador de la presencia). */
  resolved: number
}

export interface DimensionVM {
  label: string
  score: number | null
  severity: GraderReportSeverity
}

export interface InternalReasonVM {
  id: string
  title: string
  severity: GraderReportSeverity
  detail: string
  evidenceCount: number | null
}

export interface ReportDetailVM {
  runId: string
  scoreVersion: string
  // Contexto del sujeto (viene de la fila de cola; el report interno NO carga marca).
  brand: string
  domain: string | null
  market: string
  categoryLabel: string | null
  // Verdict
  score: number | null
  severity: GraderReportSeverity
  gateStatus: string
  gateReason: string
  gateNextAction: string
  abstained: boolean
  evidenceIncomplete: boolean
  // Evidencia
  perEngine: EnginePresenceVM[]
  publicHeadlineMetric: string
  publicHeadlineValue: string | null
  publicHeadlineFrame: string
  publicSummary: string
  publicDimensions: DimensionVM[]
  internalReasons: InternalReasonVM[]
  // Procedencia
  confidence: number
  evidenceCount: number
  providersSampled: string[]
  asOfDate: string | null
  promptCount: number
}

// ─── Helpers puros ──────────────────────────────────────────────────────────────────

const PROVIDER_LABELS = GH_GROWTH_AI_VISIBILITY.provider_label as Record<string, string>

export const providerLabel = (provider: string): string => PROVIDER_LABELS[provider] ?? provider

/**
 * Confianza de un hallazgo de exactitud → severidad. Un hallazgo ALTO-confianza de que la IA
 * se equivoca sobre la marca es lo MÁS peligroso de publicar (difamación/YMYL) → `critico`.
 */
export const accuracyConfidenceToSeverity = (c: AccuracyConfidence): GraderReportSeverity =>
  c === 'high' ? 'critico' : c === 'medium' ? 'atencion' : 'atencion'

// ─── Builder principal ──────────────────────────────────────────────────────────────

/**
 * Construye el VM del drawer desde el reporte real + la fila de cola (contexto del sujeto).
 * `report` = interno (evidencia decisoria); `publicReport` = WYSIWYG que se publicaría.
 */
export const buildReportDetailVM = (
  report: GraderReport,
  publicReport: PublicGraderReport,
  queueRow: Pick<PendingReportReview, 'brandName' | 'websiteUrl' | 'market' | 'categoryLabel' | 'confidence' | 'evidenceCount'>
): ReportDetailVM => {
  const perEngine: EnginePresenceVM[] = report.providerPresence.map(p => ({
    provider: p.provider,
    label: providerLabel(p.provider),
    present: p.present > 0,
    resolved: p.resolved
  }))

  const publicDimensions: DimensionVM[] = publicReport.dimensions.map(d => ({
    label: d.label,
    score: d.score,
    severity: d.severity
  }))

  // Evidencia interna decisoria = exactitud de marca (TASK-1238) + narrativa cruda por motor
  // (TASK-1237). Ambas son internal-only: la señal pública es el gate, nunca el detalle.
  const accuracyReasons: InternalReasonVM[] = report.accuracyFindings.map(a => ({
    id: `accuracy:${a.kind}`,
    title: a.label,
    severity: accuracyConfidenceToSeverity(a.confidence),
    detail: a.detail,
    evidenceCount: a.evidenceCount
  }))

  const providerReasons: InternalReasonVM[] = report.providerFindings.map(f => ({
    id: `provider:${f.key}`,
    title: providerLabel(f.key),
    severity: f.severity,
    detail: f.text,
    evidenceCount: null
  }))

  return {
    runId: report.runId,
    scoreVersion: report.scoreVersion,
    brand: queueRow.brandName,
    domain: queueRow.websiteUrl,
    market: queueRow.market,
    categoryLabel: queueRow.categoryLabel,
    score: report.overallScore,
    severity: report.overallSeverity,
    gateStatus: report.gate.status,
    gateReason: report.gate.reason,
    gateNextAction: report.gate.nextAction,
    abstained: report.gate.status === 'insufficient_data',
    evidenceIncomplete: report.gate.status === 'partial',
    perEngine,
    publicHeadlineMetric: publicReport.headline.metric,
    publicHeadlineValue: publicReport.headline.value,
    publicHeadlineFrame: publicReport.headline.frame,
    publicSummary: publicReport.findings[0]?.text ?? publicReport.headline.frame,
    publicDimensions,
    internalReasons: [...accuracyReasons, ...providerReasons],
    confidence: queueRow.confidence,
    evidenceCount: queueRow.evidenceCount,
    providersSampled: report.provenance.providersSampled.map(providerLabel),
    asOfDate: report.provenance.asOfDate,
    promptCount: report.provenance.promptCount
  }
}
