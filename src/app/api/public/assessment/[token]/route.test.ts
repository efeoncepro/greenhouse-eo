import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  resolveView: vi.fn(),
  start: vi.fn(),
  save: vi.fn(),
  submit: vi.fn(),
  selfId: vi.fn(),
  capture: vi.fn(),
}))

vi.mock('@/lib/hiring/assessment', () => ({
  resolvePublicAssessmentViewByToken: mocks.resolveView,
  startPublicAssessment: mocks.start,
  savePublicAssessmentResponse: mocks.save,
  submitPublicAssessment: mocks.submit,
  capturePublicAssessmentSelfId: mocks.selfId,
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.capture }))

import { HiringNotFoundError, HiringValidationError } from '@/lib/hiring/errors'
import { findForbiddenKeys } from '@/lib/hiring/assessment/public-boundary.contract'

const { GET, POST } = await import('./route')

/**
 * TASK-1734 Slice 5 — Route público del assessment: anti-leak + errores genéricos + anti-oracle.
 * Cobertura previa: CERO (Delta 2026-08-16 punto 6). GET y POST (start/save/submit) con mocks.
 */

const token = 'tok-'.concat('a'.repeat(40))
const params = { params: Promise.resolve({ token }) }

const cleanView = {
  assessment: {
    assessmentId: 'hass-1',
    publicId: 'EO-ASM-0001',
    applicationPublicId: 'EO-APP-0001',
    status: 'in_progress',
    roleTitle: 'Content Creator',
    templateName: 'Assessment Content Creator',
    openingPublicId: 'EO-OPN-0061',
    area: 'Marketing',
    seniority: 'Semi-senior',
  },
  timing: {
    baseMinutes: 45,
    extraMinutes: 0,
    effectiveMinutes: 45,
    hasAccommodation: false,
    startedAt: '2026-08-16T10:00:00.000Z',
    submittedAt: null,
    expiresAt: '2026-08-16T10:45:00.000Z',
    remainingSeconds: 1200,
  },
  competencies: [],
  questions: [{ questionId: 'qst-1', competencyId: 'cmp-1', level: 'intermedio', type: 'single_choice', prompt: '¿X?', options: [] }],
  responses: [{ responseId: 'resp-1', questionId: 'qst-1', competencyId: 'cmp-1', answer: { selected: 'a' }, updatedAt: '2026-08-16T10:05:00.000Z' }],
}

const postRequest = (body: unknown) =>
  new Request('https://greenhouse.local/api/public/assessment/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

describe('/api/public/assessment/[token] — TASK-1734 Slice 5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveView.mockResolvedValue(cleanView)
    mocks.start.mockResolvedValue(cleanView)
    mocks.save.mockResolvedValue(cleanView)
    mocks.submit.mockResolvedValue({ ...cleanView, assessment: { ...cleanView.assessment, status: 'submitted' } })
  })

  describe('GET', () => {
    it('devuelve la vista pública sin ningún campo prohibido', async () => {
      const response = await GET(new Request('https://greenhouse.local/x'), params)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(findForbiddenKeys(body)).toEqual([])
    })

    it('token desconocido → 404 con mensaje genérico (no revela existencia)', async () => {
      mocks.resolveView.mockResolvedValue(null)

      const response = await GET(new Request('https://greenhouse.local/x'), params)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body).toEqual({ ok: false, code: 'assessment_unavailable', message: 'La evaluación no está disponible.' })
    })

    it('un HiringNotFoundError interno colapsa al MISMO 404 genérico que un token inexistente (anti-oracle)', async () => {
      mocks.resolveView.mockRejectedValue(new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found'))

      const response = await GET(new Request('https://greenhouse.local/x'), params)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.message).toBe('La evaluación no está disponible.')
      expect(Object.keys(body).sort()).toEqual(['code', 'message', 'ok'])
    })

    it('un error inesperado responde 502 genérico SIN el mensaje interno (va a observabilidad)', async () => {
      mocks.resolveView.mockRejectedValue(new Error('pg: column auto_score does not exist SECRET-INTERNAL'))

      const response = await GET(new Request('https://greenhouse.local/x'), params)
      const body = await response.json()

      expect(response.status).toBe(502)
      expect(JSON.stringify(body)).not.toContain('SECRET-INTERNAL')
      expect(body).toEqual({ ok: false, code: 'assessment_public_error', message: 'No pudimos completar la operación.' })
      expect(mocks.capture).toHaveBeenCalledTimes(1)
    })
  })

  describe('POST', () => {
    it('start/save/submit responden vistas sin campos prohibidos', async () => {
      for (const body of [
        { action: 'start' },
        { action: 'save', questionId: 'qst-1', answer: { selected: 'a' } },
        { action: 'submit' },
      ]) {
        const response = await POST(postRequest(body), params)
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(findForbiddenKeys(payload)).toEqual([])
      }
    })

    it('submit confirma el envío con status, jamás con un resultado', async () => {
      const response = await POST(postRequest({ action: 'submit' }), params)
      const payload = await response.json()

      expect(payload.assessment.assessment.status).toBe('submitted')
      expect(JSON.stringify(payload).toLowerCase()).not.toMatch(/score|rationale|proposal|review_state|rubric/)
    })

    it('los errores de validación exponen SOLO {ok, code, message} con mensaje genérico — nunca el message ni details internos', async () => {
      mocks.submit.mockRejectedValue(
        new HiringValidationError('La evaluación tiene respuestas pendientes.', 'assessment_incomplete', 400, {
          missingQuestionId: 'qst-secreta-interna',
        }),
      )

      const response = await POST(postRequest({ action: 'submit' }), params)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(Object.keys(body).sort()).toEqual(['code', 'message', 'ok'])
      expect(body.message).toBe('No pudimos procesar la solicitud.')
      expect(JSON.stringify(body)).not.toContain('qst-secreta-interna')
      expect(JSON.stringify(body)).not.toContain('respuestas pendientes')
    })

    it('body inválido y acción desconocida responden 400 genéricos', async () => {
      const invalidJson = await POST(postRequest('{no-json'), params)

      expect(invalidJson.status).toBe(400)
      expect((await invalidJson.json()).code).toBe('assessment_invalid_body')

      const invalidAction = await POST(postRequest({ action: 'reveal_score' }), params)
      const body = await invalidAction.json()

      expect(invalidAction.status).toBe(400)
      expect(body).toEqual({ ok: false, code: 'assessment_invalid_action', message: 'No pudimos procesar la solicitud.' })
      expect(mocks.resolveView).not.toHaveBeenCalled()
    })

    it('save sin questionId responde 400 sin tocar el dominio', async () => {
      const response = await POST(postRequest({ action: 'save' }), params)

      expect(response.status).toBe(400)
      expect((await response.json()).code).toBe('assessment_question_required')
      expect(mocks.save).not.toHaveBeenCalled()
    })
  })
})
