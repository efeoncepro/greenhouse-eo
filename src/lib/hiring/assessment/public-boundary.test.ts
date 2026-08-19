import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  resolveByToken: vi.fn(),
  getById: vi.fn(),
  listResponses: vi.fn(),
  saveResponse: vi.fn(),
  startAssessment: vi.fn(),
  submitAssessment: vi.fn(),
  selfIdCapture: vi.fn(),
  selfIdSubject: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.query,
  withGreenhousePostgresTransaction: mocks.transaction,
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))
vi.mock('./instances', () => ({
  resolveAssessmentByToken: mocks.resolveByToken,
  resolveAssessmentByTokenWithClient: mocks.resolveByToken,
  getAssessmentById: mocks.getById,
  getAssessmentByIdWithClient: mocks.getById,
  listResponses: mocks.listResponses,
  listResponsesWithClient: mocks.listResponses,
  saveResponse: mocks.saveResponse,
  saveResponseWithClient: mocks.saveResponse,
  startAssessment: mocks.startAssessment,
  startAssessmentWithClient: mocks.startAssessment,
}))
vi.mock('./scoring', () => ({
  submitAssessment: mocks.submitAssessment,
  submitAssessmentWithClient: mocks.submitAssessment,
}))
vi.mock('./fairness/capture-self-id', () => ({
  captureVoluntaryDemographicSelfIdWithClient: mocks.selfIdCapture,
  getSelfIdSubjectByAssessmentWithClient: mocks.selfIdSubject,
}))

import {
  buildPublicAssessmentView,
  capturePublicAssessmentSelfId,
  resolvePublicAssessmentViewByToken,
  savePublicAssessmentResponse,
  submitPublicAssessment,
} from './public-taking'
import { findForbiddenKeys, PUBLIC_ASSESSMENT_FORBIDDEN_FIELDS } from './public-boundary.contract'

/**
 * TASK-1734 Slice 5 — Contrato ejecutable anti-leak del boundary candidato.
 *
 * Las FUENTES (assessment row, responses, question rows) se construyen ENVENENADAS con
 * scores, rationale, proposals, review state, answer key y rubric. El DTO público
 * (`PublicAssessmentView`) jamás puede contener ninguno de esos campos ni sus valores.
 * La denylist canónica vive en `public-boundary.contract.ts` y se re-exporta acá:
 * un campo nuevo de resultado se agrega ALLÁ y estas suites lo cubren solas.
 */
export { PUBLIC_ASSESSMENT_FORBIDDEN_FIELDS }

// ── Sentinels: si alguno aparece serializado en el DTO público, hay leak ──
const SENTINELS = {
  rationale: 'SENTINEL-RATIONALE-nunca-al-candidato',
  answerKey: 'SENTINEL-ANSWER-KEY-b',
  rubric: 'SENTINEL-RUBRIC-criterio-interno',
  reviewState: 'SENTINEL-REVIEW-mandatory_review',
  proposal: 'SENTINEL-PROPOSAL-aiprop-991',
  scoredBy: 'SENTINEL-SCORER-user-eval-77',
  autoScore: 8731,
  humanScore: 9642,
  competencyScore: 5157,
} as const

// Assessment "gordo": simula un read futuro que arrastre columnas de scoring a la fila.
const poisonedAssessment = {
  assessmentId: 'hass-1',
  publicId: 'EO-ASM-0001',
  applicationId: 'happ-1',
  templateId: 'tpl-1',
  method: 'candidate_test',
  evaluatorUserId: null,
  status: 'in_progress',
  timeLimitMinutes: 45,
  accommodations: {},
  startedAt: '2026-08-16T10:00:00.000Z',
  submittedAt: null,
  createdBy: null,
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-16T10:00:00.000Z',
  // veneno (campos que NO existen en el tipo pero podrían llegar de un SELECT * futuro)
  autoScore: SENTINELS.autoScore,
  aiRationale: SENTINELS.rationale,
  reviewState: SENTINELS.reviewState,
} as never

const poisonedResponses = [
  {
    responseId: 'resp-1',
    assessmentId: 'hass-1',
    questionId: 'qst-1',
    competencyId: 'cmp-1',
    answer: { selected: 'a' },
    autoScore: SENTINELS.autoScore,
    needsHumanRating: true,
    humanScore: SENTINELS.humanScore,
    scoredBy: SENTINELS.scoredBy,
    scoredAt: '2026-08-16T11:00:00.000Z',
    createdAt: '2026-08-16T10:05:00.000Z',
    updatedAt: '2026-08-16T10:05:00.000Z',
  },
]

const contextRow = {
  assessment_id: 'hass-1',
  application_public_id: 'EO-APP-0001',
  template_name: 'Assessment Content Creator',
  template_role_hint: 'Content',
  opening_public_id: 'EO-OPN-0061',
  opening_title: 'Content Creator',
  public_area: 'Marketing',
  public_seniority: 'Semi-senior',
  requested_role: 'Content Creator',
}

// Fila de pregunta envenenada: aunque el SQL real no seleccione answer_key/rubric,
// el mapper debe seguir siendo allowlist-only si un refactor futuro las arrastra.
const questionRow = {
  module_id: 'mod-1',
  weight: 3,
  target_level: 'intermedio',
  competency_id: 'cmp-1',
  competency_key: 'seo',
  competency_name: 'SEO',
  competency_category: 'craft',
  competency_description: 'Posicionamiento orgánico',
  question_id: 'qst-1',
  level: 'intermedio',
  type: 'single_choice',
  prompt: '¿Cuál es la mejor práctica X?',
  options_json: JSON.stringify([{ id: 'a', label: 'Opción A' }]),
  question_rank: 1,
  module_rank: 1,
  // veneno
  answer_key_json: JSON.stringify({ correct: SENTINELS.answerKey }),
  rubric_json: JSON.stringify({ criteria: SENTINELS.rubric }),
  auto_score: SENTINELS.autoScore,
  ai_proposal_id: SENTINELS.proposal,
}

const wireQueries = () => {
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM greenhouse_hiring.hiring_assessment a')) return [contextRow]
    if (sql.includes('hiring_assessment_template_module')) return [questionRow]

    return []
  })
}

const expectCleanPublicView = (view: unknown) => {
  // 1. Ninguna key (a cualquier profundidad) matchea la denylist.
  expect(findForbiddenKeys(view)).toEqual([])

  // 2. Ningún VALOR de las fuentes envenenadas cruza serializado.
  const serialized = JSON.stringify(view)

  for (const sentinel of Object.values(SENTINELS)) {
    expect(serialized).not.toContain(String(sentinel))
  }
}

describe('TASK-1734 Slice 5 — PublicAssessmentView anti-leak (contrato ejecutable)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wireQueries()
    mocks.listResponses.mockResolvedValue(poisonedResponses)
    mocks.resolveByToken.mockResolvedValue(poisonedAssessment)
    mocks.getById.mockResolvedValue(poisonedAssessment)
    mocks.saveResponse.mockResolvedValue({ outcome: 'ok', value: poisonedResponses[0] })
    mocks.startAssessment.mockResolvedValue({ outcome: 'ok', value: poisonedAssessment })
    mocks.submitAssessment.mockResolvedValue({ outcome: 'ok', value: undefined })
    mocks.selfIdSubject.mockResolvedValue({ applicationId: 'happ-1', identityProfileId: 'hip-1' })
    mocks.selfIdCapture.mockResolvedValue({
      recorded: 1, unchanged: 0, consentPolicyVersion: 'policy-v1', retentionExpiresAt: '2027-08-19T00:00:00.000Z',
    })
    mocks.transaction.mockImplementation(async callback => callback({
      query: async (sql: string) => ({ rows: await mocks.query(sql) }),
    }))
  })

  it('buildPublicAssessmentView NUNCA expone score/proposal/rationale/review/answerKey/rubric', async () => {
    const view = await buildPublicAssessmentView(poisonedAssessment)

    expectCleanPublicView(view)
  })

  it('el bloque assessment expone EXACTAMENTE el allowlist candidate-facing', async () => {
    const view = await buildPublicAssessmentView(poisonedAssessment)

    expect(Object.keys(view.assessment).sort()).toEqual(
      ['area', 'applicationPublicId', 'assessmentId', 'openingPublicId', 'publicId', 'roleTitle', 'seniority', 'status', 'templateName'].sort(),
    )
  })

  it('cada response pública expone EXACTAMENTE responseId/questionId/competencyId/answer/updatedAt', async () => {
    const view = await buildPublicAssessmentView(poisonedAssessment)

    expect(view.responses).toHaveLength(1)
    expect(Object.keys(view.responses[0]).sort()).toEqual(
      ['answer', 'competencyId', 'questionId', 'responseId', 'updatedAt'].sort(),
    )
  })

  it('timing expone deadlines y fase sin material sensible', async () => {
    const view = await buildPublicAssessmentView(poisonedAssessment)

    expect(Object.keys(view.timing).sort()).toEqual([
      'answerDeadlineAt', 'baseMinutes', 'closeDeadlineAt', 'databaseNowAt', 'effectiveMinutes', 'expiresAt',
      'extraMinutes', 'hasAccommodation', 'hasTimeLimit', 'phase', 'remainingSeconds',
      'startedAt', 'submittedAt',
    ].sort())
  })

  it('cada pregunta pública nace de buildPublicQuestion (sin answerKey/rubric aunque la fila los traiga)', async () => {
    const view = await buildPublicAssessmentView(poisonedAssessment)

    expect(view.questions).toHaveLength(1)

    const question = view.questions[0] as unknown as Record<string, unknown>

    expect(question).not.toHaveProperty('answerKey')
    expect(question).not.toHaveProperty('rubric')
    expect(question).not.toHaveProperty('answer_key_json')
    expect(question).not.toHaveProperty('rubric_json')
    expect(question.prompt).toBe('¿Cuál es la mejor práctica X?')
  })

  it('un token inválido resuelve null (el route lo convierte en el 404 genérico anti-oracle)', async () => {
    mocks.resolveByToken.mockResolvedValue(null)

    await expect(resolvePublicAssessmentViewByToken('token-desconocido')).resolves.toBeNull()
  })

  it.each(['terminal application', 'withdrawn consent'])(
    'SELF-ID no escribe con bearer inelegible por %s',
    async () => {
      mocks.resolveByToken.mockResolvedValue(null)

      await expect(capturePublicAssessmentSelfId('tok-1', {
        consentGranted: true,
        consentPolicyVersion: 'policy-v1',
        selections: [{ dimensionKey: 'gender', categoryKey: 'woman' }],
      })).rejects.toMatchObject({ code: 'assessment_selfid_unavailable' })

      expect(mocks.selfIdSubject).not.toHaveBeenCalled()
      expect(mocks.selfIdCapture).not.toHaveBeenCalled()
    },
  )

  it('SELF-ID conserva el mismo client bloqueado hasta insert y audit', async () => {
    await capturePublicAssessmentSelfId('tok-1', {
      consentGranted: true,
      consentPolicyVersion: 'policy-v1',
      selections: [{ dimensionKey: 'gender', categoryKey: 'woman' }],
    })

    const lockedClient = mocks.resolveByToken.mock.calls[0]?.[0]

    expect(mocks.selfIdSubject.mock.calls[0]?.[0]).toBe(lockedClient)
    expect(mocks.selfIdCapture.mock.calls[0]?.[0]).toBe(lockedClient)
    expect(mocks.resolveByToken.mock.invocationCallOrder[0]).toBeLessThan(mocks.selfIdSubject.mock.invocationCallOrder[0])
    expect(mocks.selfIdSubject.mock.invocationCallOrder[0]).toBeLessThan(mocks.selfIdCapture.mock.invocationCallOrder[0])
  })

  it('save y submit devuelven vistas igual de limpias (mismo builder, mismo contrato)', async () => {
    const saved = await savePublicAssessmentResponse('tok-1', { questionId: 'qst-1', answer: { selected: 'a' } })

    expectCleanPublicView(saved)
    expect(mocks.saveResponse.mock.calls[0]?.[0]).toBe(mocks.resolveByToken.mock.calls[0]?.[0])

    mocks.getById.mockResolvedValue({ ...(poisonedAssessment as object), status: 'submitted', submittedAt: '2026-08-16T11:00:00.000Z' } as never)

    const submitted = await submitPublicAssessment('tok-1')

    expectCleanPublicView(submitted)
    expect(mocks.submitAssessment.mock.calls[0]?.[0]).toBe(mocks.resolveByToken.mock.calls[1]?.[0])

    // El candidato ve la confirmación de envío (status), jamás un resultado.
    expect(submitted.assessment.status).toBe('submitted')
  })

  it('la denylist exportada cubre los campos críticos declarados en la spec', () => {
    for (const required of ['score', 'proposal', 'rationale', 'confidence', 'risk_class', 'answer_key', 'rubric', 'review_state']) {
      expect(PUBLIC_ASSESSMENT_FORBIDDEN_FIELDS).toContain(required)
    }
  })
})
