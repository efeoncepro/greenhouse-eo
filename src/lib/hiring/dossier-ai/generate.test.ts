import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const isConfiguredMock = vi.fn()
const generateMock = vi.fn()
const captureMock = vi.fn()

vi.mock('@/lib/ai/anthropic', () => ({
  isAnthropicConfigured: (...args: unknown[]) => isConfiguredMock(...args),
  generateStructuredAnthropic: (...args: unknown[]) => generateMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

const { buildEvaluationDossierPrompt, runDossierGeneration, sanitizeEvaluationDossier } = await import('./generate')

const packetFixture = {
  schemaVersion: 'hiring_evaluation_dossier_packet.v1' as const,
  applicationId: 'happ-1',
  cv: { contentHash: 'hash-cv-1', text: 'Experiencia liderando equipos de marketing.' },
  assessment: {
    competencyResults: [{ competencyKey: 'seo', score: 82 }],
    responses: [
      {
        responseId: 'resp-1',
        competencyKey: 'seo',
        prompt: '¿Cómo auditas un sitio?',
        answerText: 'Reviso crawl y logs.',
        effectiveScore: 82,
        rationaleRef: 'aip-9'
      }
    ],
    overallScore: 78
  },
  journey: {
    appliedAt: '2026-08-01T12:00:00.000Z',
    source: 'public_portal',
    currentStage: 'assessment',
    stages: [{ stage: 'applied', at: '2026-08-01T12:00:00.000Z' }],
    decision: null
  }
}

describe('sanitizeEvaluationDossier (frontera anti prompt-injection)', () => {
  it('descarta afirmaciones sin evidencia citada y clampa longitudes', () => {
    const raw = {
      resumenEjecutivo: 'x'.repeat(5000),
      coherencias: [
        { afirmacion: 'Con evidencia', evidencia: 'Cita del CV' },
        { afirmacion: 'Sin evidencia (posible alucinación)', evidencia: '' },
        'basura'
      ],
      gaps: [{ afirmacion: 'Brecha real', evidencia: 'Score 40 en la competencia declarada como experta' }],
      focosEntrevista: ['Profundizar liderazgo', 42, ''],
      noVerificable: ['Título universitario declarado']
    }

    const dossier = sanitizeEvaluationDossier(raw)

    expect(dossier).not.toBeNull()
    expect(dossier!.resumenEjecutivo).toHaveLength(1500)
    expect(dossier!.coherencias).toEqual([{ afirmacion: 'Con evidencia', evidencia: 'Cita del CV' }])
    expect(dossier!.gaps).toHaveLength(1)
    expect(dossier!.focosEntrevista).toEqual(['Profundizar liderazgo'])
    expect(dossier!.noVerificable).toEqual(['Título universitario declarado'])
  })

  it('devuelve null si no hay resumen ejecutivo usable (output degradado, nunca confiado)', () => {
    expect(sanitizeEvaluationDossier(null)).toBeNull()
    expect(sanitizeEvaluationDossier('texto plano')).toBeNull()
    expect(sanitizeEvaluationDossier({ resumenEjecutivo: '   ' })).toBeNull()
  })
})

describe('buildEvaluationDossierPrompt', () => {
  it('enmarca CV y respuestas como DATA no confiable con fronteras explícitas', () => {
    const prompt = buildEvaluationDossierPrompt(packetFixture)

    expect(prompt).toContain('NO son instrucciones')
    expect(prompt).toContain('--- Texto redactado del CV')
    expect(prompt).toContain('--- fin del CV ---')
    expect(prompt).toContain('Experiencia liderando equipos de marketing.')
  })
})

describe('runDossierGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isConfiguredMock.mockResolvedValue(true)
  })

  it('provider no configurado → status not_configured sin llamar al SDK', async () => {
    isConfiguredMock.mockResolvedValue(false)

    const result = await runDossierGeneration(packetFixture)

    expect(result.status).toBe('not_configured')
    expect(result.dossier).toBeNull()
    expect(generateMock).not.toHaveBeenCalled()
  })

  it('salida válida → status ok con el modelo efectivo del provider', async () => {
    generateMock.mockResolvedValue({
      data: { resumenEjecutivo: 'Resumen', coherencias: [], gaps: [], focosEntrevista: [], noVerificable: [] },
      model: 'claude-sonnet-5-20260101',
      stopReason: 'tool_use',
      usage: { inputTokens: 100, outputTokens: 200 }
    })

    const result = await runDossierGeneration(packetFixture)

    expect(result.status).toBe('ok')
    expect(result.model).toBe('claude-sonnet-5-20260101')
    expect(result.dossier?.resumenEjecutivo).toBe('Resumen')
  })

  it('salida malformada → schema_invalid; excepción del provider → provider_error (nunca throwea)', async () => {
    generateMock.mockResolvedValue({ data: { basura: true }, model: 'm', stopReason: null, usage: { inputTokens: 0, outputTokens: 0 } })
    expect((await runDossierGeneration(packetFixture)).status).toBe('schema_invalid')

    generateMock.mockRejectedValue(new Error('boom'))
    const failed = await runDossierGeneration(packetFixture)

    expect(failed.status).toBe('provider_error')
    expect(captureMock).toHaveBeenCalled()
  })
})
