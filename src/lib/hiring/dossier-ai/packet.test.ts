import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQueryMock = vi.fn()
const resolveDocumentsMock = vi.fn()
const getApplicationMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))

vi.mock('../documents', () => ({
  resolveHiringApplicationDocuments: (...args: unknown[]) => resolveDocumentsMock(...args)
}))

vi.mock('../store', () => ({
  getHiringApplicationById: (...args: unknown[]) => getApplicationMock(...args)
}))

const { assembleEvaluationDossierPacket, buildCompetencyNameMap, computeDossierInputDigest } = await import('./packet')

// Fixture sintética: la application y sus vecinos SÍ contienen PII prohibida en campos
// fuera de la allowlist — el test demuestra que el packet no la transporta.
const applicationFixture = {
  applicationId: 'happ-1',
  publicId: 'EO-APP-0078',
  openingId: 'hop-1',
  identityProfileId: 'idp-1',
  stage: 'assessment',
  score: 78.5,
  source: 'public_portal',
  notes: 'Contacto directo: maria.perez@example.com',
  candidateMessage: 'Escríbeme al +56 9 1234 5678, soy María Pérez González',
  decision: null,
  decisionAt: null,
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-15T12:00:00.000Z'
}

const dispatchQueries = () => {
  runQueryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('candidate_document_review_projection')) {
      return [
        {
          content_hash: 'hash-cv-1',
          status: 'ready',
          text_content: 'Experiencia: 5 años liderando campañas de marketing digital y SEO.'
        }
      ]
    }

    if (sql.includes('hiring_assessment_response')) {
      return [
        {
          response_id: 'resp-1',
          competency_key: 'seo',
          competency_name: 'SEO técnico',
          question_prompt: '¿Cómo estructuras una auditoría SEO?',
          answer_json: { text: 'Primero reviso el crawl y los logs del sitio.' },
          effective_score: 82,
          rationale_ref: 'aip-9'
        }
      ]
    }

    if (sql.includes('hiring_competency_result')) {
      return [{ competency_key: 'seo', competency_name: 'SEO técnico', score: '82.00' }]
    }

    return []
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  getApplicationMock.mockResolvedValue(applicationFixture)
  resolveDocumentsMock.mockResolvedValue({
    files: [{ kind: 'cv', assetId: 'asset-1', status: 'available', scan: { verdict: 'clean' } }],
    links: []
  })
  dispatchQueries()
})

describe('assembleEvaluationDossierPacket', () => {
  it('arma el packet allowlisted: CV redactado + assessment + journey', async () => {
    const packet = await assembleEvaluationDossierPacket('happ-1')

    expect(packet.schemaVersion).toBe('hiring_evaluation_dossier_packet.v1')
    expect(packet.cv.contentHash).toBe('hash-cv-1')
    expect(packet.cv.text).toContain('marketing digital')
    expect(packet.assessment.overallScore).toBe(78.5)
    expect(packet.assessment.responses).toEqual([
      {
        responseId: 'resp-1',
        competencyKey: 'seo',
        competencyName: 'SEO técnico',
        prompt: '¿Cómo estructuras una auditoría SEO?',
        answerText: 'Primero reviso el crawl y los logs del sitio.',
        effectiveScore: 82,
        rationaleRef: 'aip-9'
      }
    ])
    expect(packet.assessment.competencyResults).toEqual([
      { competencyKey: 'seo', competencyName: 'SEO técnico', score: 82 }
    ])
    expect(packet.journey.currentStage).toBe('assessment')
    expect(packet.journey.stages).toEqual([
      { stage: 'applied', at: '2026-08-01T12:00:00.000Z' },
      { stage: 'assessment', at: '2026-08-15T12:00:00.000Z' }
    ])
  })

  it('allowlist del provider: el packet serializado NO contiene nombre/email/teléfono ni campos fuera de la allowlist', async () => {
    const packet = await assembleEvaluationDossierPacket('happ-1')
    const serialized = JSON.stringify(packet)

    // PII prohibida presente en la fixture (notes/candidateMessage) — jamás en el packet.
    expect(serialized).not.toContain('maria.perez@example.com')
    expect(serialized).not.toContain('+56 9 1234 5678')
    expect(serialized).not.toContain('María Pérez')
    expect(serialized).not.toContain('candidateMessage')
    expect(serialized).not.toContain('identityProfileId')
    expect(serialized).not.toContain('idp-1')
  })

  it('ni siquiera consulta identidad: ninguna query toca identity_profiles', async () => {
    await assembleEvaluationDossierPacket('happ-1')

    for (const call of runQueryMock.mock.calls) {
      expect(String(call[0])).not.toContain('identity_profiles')
    }
  })

  it('falla honesto con hiring_dossier_cv_not_ready si la proyección no está ready', async () => {
    runQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('candidate_document_review_projection')) {
        return [{ content_hash: 'hash-cv-1', status: 'ocr_required', text_content: null }]
      }

      return []
    })

    await expect(assembleEvaluationDossierPacket('happ-1')).rejects.toMatchObject({
      code: 'hiring_dossier_cv_not_ready',
      statusCode: 409
    })
  })

  it('falla honesto si el CV está en cuarentena o sin scan limpio', async () => {
    resolveDocumentsMock.mockResolvedValue({
      files: [{ kind: 'cv', assetId: 'asset-1', status: 'quarantined', scan: { verdict: 'found' } }],
      links: []
    })

    await expect(assembleEvaluationDossierPacket('happ-1')).rejects.toMatchObject({
      code: 'hiring_dossier_cv_not_ready'
    })
  })
})

describe('buildCompetencyNameMap', () => {
  it('deriva el mapa key→nombre humano desde el packet (TASK-1737)', async () => {
    const packet = await assembleEvaluationDossierPacket('happ-1')

    expect(buildCompetencyNameMap(packet)).toEqual({ seo: 'SEO técnico' })
  })

  it('omite entradas cuyo nombre cayó al fallback de la key (sin traducción útil)', async () => {
    runQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('candidate_document_review_projection')) {
        return [{ content_hash: 'hash-cv-1', status: 'ready', text_content: 'CV' }]
      }

      if (sql.includes('hiring_competency_result')) {
        return [{ competency_key: 'seo', competency_name: null, score: '82.00' }]
      }

      return []
    })

    const packet = await assembleEvaluationDossierPacket('happ-1')

    expect(packet.assessment.competencyResults[0].competencyName).toBe('seo')
    expect(buildCompetencyNameMap(packet)).toEqual({})
  })
})

describe('computeDossierInputDigest', () => {
  it('es estable para el mismo estado de fuentes y cambia con el modelo efectivo', async () => {
    const packet = await assembleEvaluationDossierPacket('happ-1')

    const a = computeDossierInputDigest(packet, 'claude-sonnet-5', 'hiring_evaluation_dossier.v1')
    const b = computeDossierInputDigest(packet, 'claude-sonnet-5', 'hiring_evaluation_dossier.v1')
    const c = computeDossierInputDigest(packet, 'claude-opus-5', 'hiring_evaluation_dossier.v1')

    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })
})
