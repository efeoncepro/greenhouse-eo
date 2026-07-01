import { describe, expect, it } from 'vitest'

import { type GraderReport, type PublicGraderReport } from '@/lib/growth/ai-visibility/report/contracts'
import { type PendingReportReview } from '@/lib/growth/ai-visibility/review/queries'

import { accuracyConfidenceToSeverity, buildReportDetailVM, providerLabel } from '../adapters'

// Fixtures mínimos: sólo los campos que el adapter lee (cast controlado para el resto).
const queueRow: Pick<
  PendingReportReview,
  'brandName' | 'websiteUrl' | 'market' | 'categoryLabel' | 'confidence' | 'evidenceCount'
> = {
  brandName: 'Sky Airlines',
  websiteUrl: 'https://skyairline.com',
  market: 'CL',
  categoryLabel: 'Aerolíneas de pasajeros',
  confidence: 0.9,
  evidenceCount: 16
}

const report = {
  runId: 'grun-abc',
  scoreVersion: 'ai_visibility_score_v1',
  gate: { status: 'review_required', reason: 'Exactitud baja', nextAction: 'Revisar hallazgos de marca' },
  overallScore: 36.1,
  overallSeverity: 'critico',
  providerPresence: [
    { provider: 'openai', resolved: 5, present: 2 },
    { provider: 'perplexity', resolved: 5, present: 0 }
  ],
  accuracyFindings: [
    { kind: 'brand_confusion', confidence: 'high', evidenceCount: 3, label: 'Confusión de marca', detail: 'Se confunde con Globe Telecom.' }
  ],
  providerFindings: [{ key: 'gemini', severity: 'atencion', text: 'Menciona a la marca sin citar fuentes.' }],
  provenance: {
    asOfDate: '2026-06-30',
    promptPackVersion: 'v1',
    scoreVersion: 'ai_visibility_score_v1',
    providersSampled: ['openai', 'perplexity', 'gemini'],
    promptCount: 12
  }
} as unknown as GraderReport

const publicReport = {
  headline: { dimensionKey: 'entity_clarity', metric: 'Claridad de entidad', value: '36/100', frame: 'Visibilidad limitada', severity: 'critico' },
  overallScore: 36.1,
  overallSeverity: 'critico',
  findings: [{ key: 'headline', severity: 'critico', text: 'La visibilidad de la marca en IA es limitada.' }],
  dimensions: [
    { key: 'entity_clarity', label: 'Claridad de entidad', explainer: '', score: 35, max: 100, status: 'ok', severity: 'critico' },
    { key: 'citation_quality', label: 'Calidad de citas', explainer: '', score: null, max: 100, status: 'empty', severity: 'sin_dato' }
  ]
} as unknown as PublicGraderReport

describe('buildReportDetailVM', () => {
  const vm = buildReportDetailVM(report, publicReport, queueRow)

  it('trae el contexto de la marca desde la fila de cola (el report interno no lo carga)', () => {
    expect(vm.brand).toBe('Sky Airlines')
    expect(vm.domain).toBe('https://skyairline.com')
    expect(vm.market).toBe('CL')
    expect(vm.categoryLabel).toBe('Aerolíneas de pasajeros')
  })

  it('propaga verdict + gate desde el report interno', () => {
    expect(vm.score).toBe(36.1)
    expect(vm.severity).toBe('critico')
    expect(vm.gateReason).toBe('Exactitud baja')
    expect(vm.gateNextAction).toBe('Revisar hallazgos de marca')
    expect(vm.abstained).toBe(false)
    expect(vm.evidenceIncomplete).toBe(false)
  })

  it('mapea presencia por motor (present = present>0) con label canónico', () => {
    expect(vm.perEngine).toHaveLength(2)
    expect(vm.perEngine[0]).toMatchObject({ provider: 'openai', label: 'ChatGPT (OpenAI)', present: true, resolved: 5 })
    expect(vm.perEngine[1]).toMatchObject({ provider: 'perplexity', present: false })
  })

  it('honra null ≠ 0 en dimensiones públicas (sin evidencia → null + sin_dato)', () => {
    const empty = vm.publicDimensions.find(d => d.label === 'Calidad de citas')

    expect(empty?.score).toBeNull()
    expect(empty?.severity).toBe('sin_dato')
  })

  it('junta la evidencia interna decisoria: accuracy (crítico si high) + narrativa por motor', () => {
    expect(vm.internalReasons).toHaveLength(2)
    expect(vm.internalReasons[0]).toMatchObject({ id: 'accuracy:brand_confusion', severity: 'critico', evidenceCount: 3 })
    expect(vm.internalReasons[1]).toMatchObject({ id: 'provider:gemini', title: 'Gemini (Google)', evidenceCount: null })
  })

  it('trae procedencia (motores consultados con label) + confianza/evidencia de la cola', () => {
    expect(vm.providersSampled).toEqual(['ChatGPT (OpenAI)', 'Perplexity', 'Gemini (Google)'])
    expect(vm.asOfDate).toBe('2026-06-30')
    expect(vm.confidence).toBe(0.9)
    expect(vm.evidenceCount).toBe(16)
  })
})

describe('accuracyConfidenceToSeverity', () => {
  it('confianza alta de inexactitud = lo más peligroso de publicar → crítico', () => {
    expect(accuracyConfidenceToSeverity('high')).toBe('critico')
    expect(accuracyConfidenceToSeverity('medium')).toBe('atencion')
    expect(accuracyConfidenceToSeverity('low')).toBe('atencion')
  })
})

describe('providerLabel', () => {
  it('usa el label canónico y hace fallback al id crudo', () => {
    expect(providerLabel('openai')).toBe('ChatGPT (OpenAI)')
    expect(providerLabel('desconocido')).toBe('desconocido')
  })
})
