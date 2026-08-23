import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  wasSent: vi.fn(),
  claimIntent: vi.fn(),
  capture: vi.fn(),
  query: vi.fn(),
  getAssessment: vi.fn(),
  reissue: vi.fn(),
}))

vi.mock('@/lib/email/delivery', () => ({
  sendEmail: mocks.sendEmail,
  wasEmailAlreadySent: mocks.wasSent,
  claimTokenSensitiveEmailIntent: mocks.claimIntent,
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.capture }))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))
vi.mock('@/lib/hiring/assessment/instances', () => ({
  getAssessmentById: mocks.getAssessment,
  reissueCandidateTestTokenForEmailWithClient: mocks.reissue,
}))

import {
  sendHiringApplicationCreatedEmails,
  sendHiringAssessmentAccessRotatedEmail,
  sendHiringAssessmentAssignedEmail,
  sendHiringAssessmentSubmittedInternalEmail,
  sendHiringDecisionEmail,
  sendHiringStageAdvancedEmail,
} from '@/lib/hiring/notifications'
import { resolveTemplate } from '@/lib/email/templates'
import { findForbiddenKeys } from '@/lib/hiring/assessment/public-boundary.contract'

/**
 * TASK-1734 Slice 5 — Anti-leak de los emails del ciclo de Hiring.
 *
 * Ningún email del ciclo (candidate-facing NI el interno `hiring_assessment_submitted_internal`)
 * puede incluir score/resultado/rationale/proposal/review state en subject ni payload.
 * Las fuentes se envenenan (assessment/context con columnas de scoring) y se asserta que
 * el payload enviado a `sendEmail` y los templates renderizados quedan limpios.
 */

const SENTINELS = {
  autoScore: 8731,
  humanScore: 9642,
  rationale: 'SENTINEL-RATIONALE-nunca-en-email',
  reviewState: 'SENTINEL-REVIEW-mandatory_review',
  proposal: 'SENTINEL-PROPOSAL-aiprop-991',
  resultBand: 'SENTINEL-BAND-alto',
} as const

// Assessment "gordo": simula un reader futuro que arrastre scoring a la fila.
const poisonedAssessment = {
  assessmentId: 'hass-1',
  applicationId: 'happ-1',
  method: 'candidate_test',
  status: 'submitted',
  submittedAt: '2026-08-15T21:30:00.000Z',
  timeLimitMinutes: 90,
  autoScore: SENTINELS.autoScore,
  humanScore: SENTINELS.humanScore,
  aiRationale: SENTINELS.rationale,
  reviewState: SENTINELS.reviewState,
}

const poisonedContextRow = {
  application_id: 'happ-1',
  application_public_id: 'EO-APP-0001',
  stage: 'interview',
  source: 'public_careers',
  decision: 'selected',
  candidate_message: 'Me interesa el rol.',
  canonical_email: 'maria@ejemplo.com',
  full_name: 'María González',
  phone_e164: '+56912345678',
  residence_country_code: 'CL',
  portfolio_url: null,
  linkedin_url: null,
  opening_id: 'hopn-1',
  opening_public_id: 'EO-OPN-0061',
  internal_title: 'Content Creator (interno)',
  public_title: 'Content Creator',
  opening_status: 'active',
  published_at: '2026-08-01T00:00:00Z',
  // veneno: columnas de scoring que un SELECT futuro podría arrastrar al contexto
  auto_score: SENTINELS.autoScore,
  result_band: SENTINELS.resultBand,
  ai_rationale: SENTINELS.rationale,
}

const expectCleanSendEmailCalls = () => {
  expect(mocks.sendEmail).toHaveBeenCalled()

  for (const call of mocks.sendEmail.mock.calls) {
    const payload = call[0] as Record<string, unknown>
    const serialized = JSON.stringify(payload)

    // Ningún sentinel de scoring cruza al payload del email.
    for (const sentinel of Object.values(SENTINELS)) {
      expect(serialized).not.toContain(String(sentinel))
    }

    // Ninguna key del context/payload matchea la denylist canónica.
    expect(findForbiddenKeys(payload)).toEqual([])
  }
}

describe('TASK-1734 Slice 5 — hiring lifecycle emails anti-leak', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.HIRING_LIFECYCLE_EMAILS_ENABLED = 'true'
    delete process.env.HIRING_INTERNAL_NOTIFICATIONS_EMAIL
    mocks.wasSent.mockResolvedValue(false)
    mocks.sendEmail.mockResolvedValue({ deliveryId: 'd-1', resendId: 'r-1', status: 'sent' })
    mocks.query.mockResolvedValue([poisonedContextRow])
    mocks.getAssessment.mockResolvedValue(poisonedAssessment)
    mocks.reissue.mockResolvedValue({ token: 'tok-abc', timeLimitMinutes: 90, tokenTtlDays: 14 })
    mocks.claimIntent.mockImplementation(async input => ({
      claimed: true,
      deliveryId: 'delivery-intent-1',
      value: await input.issueCredential({})
    }))
  })

  afterEach(() => {
    delete process.env.HIRING_LIFECYCLE_EMAILS_ENABLED
  })

  it('application created (interno + acuse): payloads sin scoring', async () => {
    await sendHiringApplicationCreatedEmails('happ-1', { _eventId: 'evt-1' })

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expectCleanSendEmailCalls()
  })

  it('assessment assigned (candidato): payload sin scoring, sólo acceso y tiempo', async () => {
    await sendHiringAssessmentAssignedEmail('hass-1', { method: 'candidate_test', _eventId: 'evt-2' })

    expectCleanSendEmailCalls()
  })

  it('assessment submitted (INTERNO): puede existir, pero SIN score/resultado/review state', async () => {
    await sendHiringAssessmentSubmittedInternalEmail('hass-1', { _eventId: 'evt-3' })

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)

    const payload = mocks.sendEmail.mock.calls[0][0] as { emailType: string; context: Record<string, unknown> }

    expect(payload.emailType).toBe('hiring_assessment_submitted_internal')

    // Allowlist exacto del contexto interno: identificación + tiempos + link, cero resultado.
    expect(Object.keys(payload.context).sort()).toEqual(
      ['applicationPublicId', 'applicationUrl', 'candidateName', 'openingTitle', 'submittedAt', 'timeLimitMinutes'].sort(),
    )
    expectCleanSendEmailCalls()
  })

  it('stage advanced y decisión (candidato): payloads sin scoring aun con contexto envenenado', async () => {
    await sendHiringStageAdvancedEmail('happ-1', { stage: 'interview', _eventId: 'evt-4' })
    await sendHiringDecisionEmail('happ-1', { decision: 'selected', decisionId: 'dec-1', _eventId: 'evt-5' })

    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expectCleanSendEmailCalls()
  })

  it('un payload de evento envenenado con scoring tampoco cruza (los senders re-leen PG por ID)', async () => {
    await sendHiringStageAdvancedEmail('happ-1', {
      stage: 'interview',
      _eventId: 'evt-6',
      score: SENTINELS.autoScore,
      rationale: SENTINELS.rationale,
    })

    expectCleanSendEmailCalls()
  })

  describe('templates renderizados (subject + text) con contexto envenenado', () => {
    const poison = {
      score: SENTINELS.autoScore,
      autoScore: SENTINELS.autoScore,
      rationale: SENTINELS.rationale,
      reviewState: SENTINELS.reviewState,
      resultBand: SENTINELS.resultBand,
    }

    const cases: Array<{ type: string; context: Record<string, unknown> }> = [
      {
        type: 'hiring_application_confirmation',
        context: { recipientName: 'María', openingTitle: 'Content Creator', locale: 'es', ...poison },
      },
      {
        type: 'hiring_assessment_assigned',
        context: {
          recipientName: 'María',
          openingTitle: 'Content Creator',
          assessmentUrl: 'https://greenhouse.efeoncepro.com/public/assessment/tok-abc',
          timeLimitMinutes: 90,
          tokenTtlDays: 14,
          locale: 'es',
          ...poison,
        },
      },
      {
        type: 'hiring_assessment_submitted_internal',
        context: {
          candidateName: 'María González',
          openingTitle: 'Content Creator',
          applicationPublicId: 'EO-APP-0001',
          submittedAt: '2026-08-15T21:30:00.000Z',
          timeLimitMinutes: 90,
          applicationUrl: 'https://greenhouse.efeoncepro.com/agency/hiring/applications/happ-1',
          ...poison,
        },
      },
      {
        type: 'hiring_stage_advanced',
        context: { recipientName: 'María', openingTitle: 'Content Creator', stageLabel: 'Entrevista', locale: 'es', ...poison },
      },
      {
        type: 'hiring_decision_selected',
        context: { recipientName: 'María', openingTitle: 'Content Creator', locale: 'es', ...poison },
      },
      {
        type: 'hiring_decision_rejected',
        context: { recipientName: 'María', openingTitle: 'Content Creator', locale: 'es', ...poison },
      },
    ]

    it.each(cases)('$type ignora score/rationale/review inyectados y no menciona puntajes', ({ type, context }) => {
      const template = resolveTemplate(type as never, context as never)
      const rendered = `${template.subject}\n${template.text}`.toLowerCase()

      for (const sentinel of Object.values(SENTINELS)) {
        expect(rendered).not.toContain(String(sentinel).toLowerCase())
      }

      for (const word of ['score', 'puntaje', 'puntuación', 'aprobado', 'reprobado', 'calificación']) {
        expect(rendered).not.toContain(word)
      }
    })
  })
})

/**
 * TASK-1757 — el aviso de rotación NUNCA puede llevar la credencial.
 *
 * El canal `secure_link` existe para entregar el acceso por una vía donde el operador VERIFICA
 * IDENTIDAD. Si el correo de aviso llevara el enlace, cualquiera con acceso al buzón entraría sin
 * esa verificación y el diseño entero se cae. Es una regla que hay que hacer cumplir con un test:
 * agregar "y de paso mándale el link" es la cosa más natural del mundo para quien lea este código
 * dentro de seis meses sin conocer el porqué.
 */
describe('TASK-1757 — aviso de rotación sin credencial', () => {
  const TOKEN_SENTINEL = 'SENTINEL-TOKEN-jamas-en-el-aviso'

  const rotationRow = (over: Record<string, unknown> = {}) => ({
    channel: 'secure_link',
    outcome: 'link_issued',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    assessment_status: 'in_progress',
    effective_deadline_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    candidate_email: 'candidata@example.com',
    candidate_name: 'María González',
    opening_title: 'Content Creator',
    provider_block_status: null,
    // Veneno: si alguien mapea la fila entera al contexto, el token viaja.
    access_token: TOKEN_SENTINEL,
    access_url: `https://greenhouse.efeoncepro.com/public/assessment/access#access=${TOKEN_SENTINEL}`,
    token_hash: TOKEN_SENTINEL,
    ...over,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.HIRING_LIFECYCLE_EMAILS_ENABLED = 'true'
    mocks.wasSent.mockResolvedValue(false)
    mocks.sendEmail.mockResolvedValue({ status: 'sent', deliveryId: 'del-1' })
  })

  it('el payload enviado no contiene el token ni la URL por ningún lado', async () => {
    mocks.query.mockResolvedValue([rotationRow()])

    await sendHiringAssessmentAccessRotatedEmail('harc-1', { reasonCode: 'alternate_channel_requested' })

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)

    const serialized = JSON.stringify(mocks.sendEmail.mock.calls[0][0])

    expect(serialized).not.toContain(TOKEN_SENTINEL)
    expect(serialized).not.toContain('/public/assessment/access')
    expect(serialized).not.toContain('#access=')
  })

  it('el correo renderizado tampoco lo contiene', async () => {
    mocks.query.mockResolvedValue([rotationRow()])

    await sendHiringAssessmentAccessRotatedEmail('harc-1', { reasonCode: 'alternate_channel_requested' })

    const payload = mocks.sendEmail.mock.calls[0][0] as { context: Record<string, unknown> }
    const rendered = await resolveTemplate('hiring_assessment_access_rotated', payload.context)

    expect(JSON.stringify(rendered)).not.toContain(TOKEN_SENTINEL)
    expect(rendered.text).not.toContain('#access=')
  })

  it('NO usa el carril token-sensitive: no hay credencial que ligar', async () => {
    mocks.query.mockResolvedValue([rotationRow()])

    await sendHiringAssessmentAccessRotatedEmail('harc-1', { reasonCode: 'alternate_channel_requested' })

    expect(mocks.claimIntent).not.toHaveBeenCalled()
  })

  it('con el buzón bloqueado por el proveedor no se envía nada', async () => {
    mocks.query.mockResolvedValue([rotationRow({ provider_block_status: 'complained' })])

    const result = await sendHiringAssessmentAccessRotatedEmail('harc-1', { reasonCode: 'alternate_channel_requested' })

    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(result).toContain('provider_blocked')
  })

  it('el canal de correo no genera un segundo mensaje', async () => {
    mocks.query.mockResolvedValue([rotationRow({ channel: 'email', outcome: 'dispatch_accepted' })])

    const result = await sendHiringAssessmentAccessRotatedEmail('harc-1', { reasonCode: 'alternate_channel_requested' })

    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(result).toContain('not_secure_link')
  })

  it('la llave de dedupe es la RECUPERACIÓN, no el evento', async () => {
    mocks.query.mockResolvedValue([rotationRow()])

    // Un re-delivery del mismo evento trae un `_eventId` distinto. Si el dedupe colgara de él,
    // el candidato recibiría el mismo aviso dos veces.
    await sendHiringAssessmentAccessRotatedEmail('harc-1', {
      reasonCode: 'alternate_channel_requested',
      _eventId: 'outbox-distinto-cada-vez',
    })

    expect(mocks.wasSent).toHaveBeenCalledWith(
      'hiring-assessment-access-rotated:harc-1',
      'harc-1',
      'candidata@example.com',
    )
  })
})
