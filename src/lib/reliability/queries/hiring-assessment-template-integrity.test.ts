/**
 * Señal de integridad de plantillas de assessment (módulos sin instrumento).
 *
 * Cubre: steady (ok), precursor (warning por competencias sin banco), rotura real
 * (error), precedencia entre ambos, y degradación honesta a `unknown` cuando la
 * query revienta. Los mocks fijan la FORMA del contrato; la validez del SQL contra
 * PG real se ejercitó reactivando temporalmente una plantilla archivada y
 * comprobando que la señal la detecta (no basta con verla devolver 'ok').
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQueryMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn(),
}))

import {
  HIRING_ASSESSMENT_TEMPLATE_INTEGRITY_SIGNAL_ID,
  getHiringAssessmentTemplateIntegritySignal,
} from './hiring-assessment-template-integrity'

const row = (over: Partial<Record<string, unknown>> = {}) => [
  {
    broken_active_templates: 0,
    blind_modules: 0,
    worst_blind_weight_pct: null,
    worst_template_id: null,
    competencies_without_questions: 0,
    ...over,
  },
]

beforeEach(() => {
  runQueryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getHiringAssessmentTemplateIntegritySignal', () => {
  it('steady: sin plantillas rotas ni competencias huérfanas → ok', async () => {
    runQueryMock.mockResolvedValue(row())

    const signal = await getHiringAssessmentTemplateIntegritySignal()

    expect(signal.signalId).toBe(HIRING_ASSESSMENT_TEMPLATE_INTEGRITY_SIGNAL_ID)
    expect(signal.severity).toBe('ok')
    expect(signal.moduleKey).toBe('hiring')
    expect(signal.kind).toBe('data_quality')
  })

  it('precursor: competencias sin preguntas pero ninguna plantilla activa las usa → warning', async () => {
    runQueryMock.mockResolvedValue(row({ competencies_without_questions: 6 }))

    const signal = await getHiringAssessmentTemplateIntegritySignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('6 competencia(s)')
  })

  it('rotura real: una plantilla activa con módulos ciegos → error, aunque sea UNA sola', async () => {
    runQueryMock.mockResolvedValue(
      row({
        broken_active_templates: 1,
        blind_modules: 4,
        worst_blind_weight_pct: 45,
        worst_template_id: 'atpl-dae66420',
        competencies_without_questions: 6,
      }),
    )

    const signal = await getHiringAssessmentTemplateIntegritySignal()

    // Una sola plantilla rota ya puede mandarle un examen encogido a un candidato:
    // no se degrada a warning por ser "solo una".
    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('45%')
    expect(signal.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'blind_modules', value: '4' }),
        expect.objectContaining({ label: 'worst_template_id', value: 'atpl-dae66420' }),
      ]),
    )
  })

  it('la rotura real manda sobre el precursor (no se reporta warning teniendo error)', async () => {
    runQueryMock.mockResolvedValue(
      row({ broken_active_templates: 2, blind_modules: 5, competencies_without_questions: 6 }),
    )

    expect((await getHiringAssessmentTemplateIntegritySignal()).severity).toBe('error')
  })

  it('la evidencia no filtra datos de candidato: sólo ids de plantilla y conteos', async () => {
    runQueryMock.mockResolvedValue(
      row({ broken_active_templates: 1, blind_modules: 1, worst_template_id: 'atpl-x' }),
    )

    const signal = await getHiringAssessmentTemplateIntegritySignal()
    const labels = signal.evidence?.map(e => e.label) ?? []

    expect(labels).toEqual([
      'broken_active_templates',
      'blind_modules',
      'worst_blind_weight_pct',
      'worst_template_id',
      'competencies_without_questions',
    ])
  })

  it('query caída → unknown honesto, nunca un ok falso', async () => {
    runQueryMock.mockRejectedValue(new Error('boom'))

    const signal = await getHiringAssessmentTemplateIntegritySignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.observedAt).toBeNull()
  })

  it('respuesta vacía de PG → ok sin reventar', async () => {
    runQueryMock.mockResolvedValue([])

    expect((await getHiringAssessmentTemplateIntegritySignal()).severity).toBe('ok')
  })
})
