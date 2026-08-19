import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  withSession: vi.fn(),
  getAssessment: vi.fn(),
  buildView: vi.fn(),
  start: vi.fn(),
  save: vi.fn(),
  submit: vi.fn(),
  getSubject: vi.fn(),
  captureSelfId: vi.fn(),
  capture: vi.fn(),
}))

vi.mock('@/lib/hiring/assessment/public-session/service', () => ({
  withPublicAssessmentSession: mocks.withSession,
}))
vi.mock('@/lib/hiring/assessment/instances', () => ({ getAssessmentByIdWithClient: mocks.getAssessment }))
vi.mock('@/lib/hiring/assessment/public-taking', () => ({
  buildPublicAssessmentViewWithClient: mocks.buildView,
  startPublicAssessmentWithClient: mocks.start,
  savePublicAssessmentResponseWithClient: mocks.save,
  submitPublicAssessmentWithClient: mocks.submit,
}))
vi.mock('@/lib/hiring/assessment/fairness/capture-self-id', () => ({
  getSelfIdSubjectByAssessmentWithClient: mocks.getSubject,
  captureVoluntaryDemographicSelfIdWithClient: mocks.captureSelfId,
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.capture }))

const { GET, POST } = await import('./route')

const cleanView = {
  assessment: { assessmentId: 'asmt-1', publicId: 'EO-ASM-1', status: 'in_progress' },
  timing: { databaseNowAt: '2026-08-19T10:00:00.000Z' },
  competencies: [], questions: [], responses: [],
}

const session = { assessmentId: 'asmt-1', accessTokenVersionId: 'atv-secret' }
const client = { query: vi.fn() }

const sessionRequest = (method = 'GET', body?: unknown, origin = 'https://greenhouse.local') => new NextRequest(
  'https://greenhouse.local/api/public/assessment/session',
  {
    method,
    headers: {
      cookie: '__Host-gh-assessment-session=session-secret',
      ...(method === 'POST' ? { origin, 'content-type': 'application/json' } : {}),
    },
    ...(body === undefined ? {} : {
      body: JSON.stringify(body && typeof body === 'object' && !Array.isArray(body)
        ? { expectedAssessmentPublicId: 'EO-ASM-1', ...body }
        : body),
    }),
  },
)

describe('/api/public/assessment/session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.withSession.mockImplementation(async (
      _raw: string,
      callback: (transactionClient: typeof client, context: typeof session) => unknown,
    ) => callback(client, session))
    mocks.getAssessment.mockResolvedValue({ assessmentId: 'asmt-1', publicId: 'EO-ASM-1' })
    mocks.buildView.mockResolvedValue(cleanView)
    mocks.start.mockResolvedValue({ outcome: 'ok', value: { assessmentId: 'asmt-1' } })
    mocks.save.mockResolvedValue({ outcome: 'ok', value: undefined })
    mocks.submit.mockResolvedValue({ outcome: 'ok', value: undefined })
    mocks.getSubject.mockResolvedValue({ identityProfileId: 'ip-1', applicationId: 'app-1' })
    mocks.captureSelfId.mockResolvedValue({ recorded: 1, unchanged: 0 })
  })

  it('deriva la evaluación solo de la cookie y no filtra sesión/version/hash en el DTO', async () => {
    const response = await GET(sessionRequest())
    const payload = await response.json()

    expect(mocks.withSession).toHaveBeenCalledWith('session-secret', expect.any(Function))
    expect(mocks.getAssessment).toHaveBeenCalledWith(client, 'asmt-1')
    expect(JSON.stringify(payload)).not.toMatch(/session-secret|accessTokenVersionId|token_hash|sessionToken/i)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('rechaza mutaciones sin Origin exacto antes de resolver la sesión', async () => {
    const response = await POST(sessionRequest('POST', { action: 'start' }, 'https://evil.test'))

    expect(response.status).toBe(403)
    expect(mocks.withSession).not.toHaveBeenCalled()
  })

  it('usa las primitives WithClient dentro de la misma sesión transaccional', async () => {
    const response = await POST(sessionRequest('POST', { action: 'start' }))

    expect(response.status).toBe(200)
    expect(mocks.start).toHaveBeenCalledWith(client, 'asmt-1')
    expect(mocks.buildView).toHaveBeenCalledWith(client, expect.objectContaining({ assessmentId: 'asmt-1' }))
  })

  it('tab A no puede mutar B cuando la cookie global cambió entre pestañas', async () => {
    mocks.getAssessment.mockResolvedValue({ assessmentId: 'asmt-B', publicId: 'EO-ASM-B' })

    const response = await POST(sessionRequest('POST', {
      action: 'start',
      expectedAssessmentPublicId: 'EO-ASM-A',
    }))

    expect(response.status).toBe(404)
    expect(mocks.start).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.submit).not.toHaveBeenCalled()
    expect(mocks.captureSelfId).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: 'assessment_unavailable',
      message: 'La evaluación no está disponible.',
    })
  })

  it('adapta save y submit con el mismo client y conserva el DTO público limpio', async () => {
    const saveResponse = await POST(sessionRequest('POST', {
      action: 'save',
      questionId: 'qst-1',
      answer: { selected: 'a' },
    }))

    const submitResponse = await POST(sessionRequest('POST', { action: 'submit' }))

    expect(saveResponse.status).toBe(200)
    expect(submitResponse.status).toBe(200)
    expect(mocks.save).toHaveBeenCalledWith(client, expect.objectContaining({ assessmentId: 'asmt-1' }), {
      questionId: 'qst-1',
      answer: { selected: 'a' },
    })
    expect(mocks.submit).toHaveBeenCalledWith(client, expect.objectContaining({ assessmentId: 'asmt-1' }))

    for (const response of [saveResponse, submitResponse]) {
      const payload = await response.json()

      expect(JSON.stringify(payload)).not.toMatch(/session-secret|accessTokenVersionId|token_hash|sessionToken/i)
    }
  })

  it('adapta SELF-ID con subject y escritura en la misma transacción de sesión', async () => {
    const response = await POST(sessionRequest('POST', {
      action: 'self_id',
      consentGranted: true,
      consentPolicyVersion: 'fairness-v1',
      selections: [{ dimensionKey: 'gender', categoryKey: 'woman' }],
    }))

    expect(response.status).toBe(201)
    expect(mocks.getSubject).toHaveBeenCalledWith(client, 'asmt-1')
    expect(mocks.captureSelfId).toHaveBeenCalledWith(client, expect.objectContaining({
      identityProfileId: 'ip-1',
      applicationId: 'app-1',
      actorKind: 'candidate_token',
    }))
  })

  it('colapsa grace/expired de save o submit al unavailable genérico', async () => {
    mocks.save.mockResolvedValueOnce({ outcome: 'expired' })

    const saveResponse = await POST(sessionRequest('POST', {
      action: 'save',
      questionId: 'qst-1',
      answer: { selected: 'a' },
    }))

    mocks.submit.mockResolvedValueOnce({ outcome: 'expired' })

    const submitResponse = await POST(sessionRequest('POST', { action: 'submit' }))

    for (const response of [saveResponse, submitResponse]) {
      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toEqual({
        ok: false,
        code: 'assessment_unavailable',
        message: 'La evaluación no está disponible.',
      })
    }
  })

  it('una sesión rotada o no disponible colapsa al mismo 404 genérico', async () => {
    mocks.withSession.mockResolvedValue(null)

    const response = await GET(sessionRequest())

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: 'assessment_unavailable',
      message: 'La evaluación no está disponible.',
    })
  })
})
