import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type CaptchaVerifier } from '../public-intake/captcha'
import { type PublicGraderRunInput } from '../public-intake/contracts'

/**
 * TASK-1251 Slice 2b — Fachada del path convergente (`createPublicGraderRunViaFormsEngine`):
 * mismos accept/reject que el path a-medida, pero al aceptar persiste un SUBMISSION del
 * motor (no encola inline) y devuelve el `submission_id` como handle de poll. El run + el
 * lead los crea el reactive consumer. Estos tests cubren la frontera (disabled/invalid/
 * captcha/abuse/dedupe/accepted) + el invariante PII (email va al submission, no se encola).
 */

import type { PreparedMeasurement } from '@/lib/growth/measurement/contracts'
import type { EmailGateVerdict } from '@/lib/growth/forms/email-verification'

const NOT_GATED: EmailGateVerdict = { gated: false, rejected: false, rejectionClass: null, quality: null, domainClass: null }

const state = {
  intakeEnabled: true,
  abuse: { allowed: true, outcome: null as null | 'rate_limited' | 'cost_blocked' },
  duplicate: null as { submission_id: string } | null,
  // TASK-1263 — versión publicada resuelta por slug (FK anchor + emailPolicy) y veredicto del gate.
  publishedVersion: { form_id: 'fdef-ai-visibility-grader', form_version_id: 'fver-ai-visibility-grader-v2', validation_schema_json: {} } as
    | { form_id: string; form_version_id: string; validation_schema_json: unknown }
    | null,
  gate: NOT_GATED as EmailGateVerdict,
  measurement: null as PreparedMeasurement | null,
  measurementPersisted: false,
}

const spies = {
  persist: vi.fn(),
  recordEvent: vi.fn(),
  rejected: vi.fn(),
  prepare: vi.fn(),
  definition: vi.fn(),
}

vi.mock('../flags', () => ({
  isPublicIntakeEnabled: () => state.intakeEnabled,
}))

vi.mock('../public-intake/abuse-guard', () => ({
  ESTIMATED_PUBLIC_RUN_COST_USD: 0.1,
  hashIdentifier: (value: string | null) => (value ? `hash:${value}` : null),
  resolveIntakeLimits: () => ({ perEmailPerDay: 3, perIpPerDay: 10, globalDailyBudgetUsd: 25 }),
  checkIntakeAbuse: async () => state.abuse,
  recordIntakeEvent: async (input: unknown) => {
    spies.recordEvent(input)
  },
}))

vi.mock('@/lib/growth/forms/hash', () => ({
  dedupeFingerprint: () => 'fp-test',
}))

vi.mock('@/lib/growth/forms/email-verification', () => ({
  evaluateFormEmailGate: async () => state.gate,
}))

vi.mock('@/lib/growth/measurement/prepare', () => ({
  prepareMeasurementConversion: async (input: unknown) => { spies.prepare(input);

return state.measurement },
}))

vi.mock('@/lib/growth/forms/store', () => ({
  getFormDefinitionById: async () => spies.definition(),
  getPublishedVersionBySlug: async () => state.publishedVersion,
  findRecentDuplicate: async () => state.duplicate,
  insertRejectedSubmission: async (input: unknown) => {
    spies.rejected(input)

    return { submission_id: 'fsub-REJ' }
  },
  persistAcceptedSubmission: async (input: unknown) => {
    spies.persist(input)

    return { submission_id: 'fsub-NEW', form_id: 'fdef-ai-visibility-grader', measurementPersisted: state.measurementPersisted }
  },
}))

const okVerifier: CaptchaVerifier = { verify: async () => ({ ok: true, reason: 'verified' }) }
const failVerifier: CaptchaVerifier = { verify: async () => ({ ok: false, reason: 'rejected' }) }

const baseInput: PublicGraderRunInput = {
  brandName: 'Efeonce',
  websiteUrl: 'https://efeoncepro.com',
  market: 'CL',
  locale: 'es-CL',
  category: 'agencia de marketing',
  competitorsDeclared: ['Acme'],
  email: 'prospecto@empresa.com',
  firstName: 'Ana',
  lastName: 'Pérez',
  consent: true,
  industry: null,
  persona: null,
  companySize: null,
  mainChallenge: null,
}

beforeEach(() => {
  state.intakeEnabled = true
  state.abuse = { allowed: true, outcome: null }
  state.duplicate = null
  state.publishedVersion = { form_id: 'fdef-ai-visibility-grader', form_version_id: 'fver-ai-visibility-grader-v2', validation_schema_json: {} }
  state.gate = NOT_GATED
  spies.persist.mockClear()
  spies.recordEvent.mockClear()
  spies.rejected.mockClear()
  spies.prepare.mockClear()
  spies.definition.mockReset().mockReturnValue({ form_id: 'fdef-ai-visibility-grader', slug: 'ai-visibility-grader', form_key: '69cd5269-5f97-4d32-99c4-0b23f41aa2f5' })
  state.measurement = null
  state.measurementPersisted = false
})

describe('TASK-1251 — createPublicGraderRunViaFormsEngine (fachada del motor)', () => {
  it('flag OFF (intake disabled) → disabled, no persiste', async () => {
    state.intakeEnabled = false
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const res = await createPublicGraderRunViaFormsEngine(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    expect(res.outcome).toBe('disabled')
    expect(spies.persist).not.toHaveBeenCalled()
  })

  it('input inválido → invalid (mismo validador que el path a-medida)', async () => {
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')

    expect((await createPublicGraderRunViaFormsEngine({ ...baseInput, consent: false }, { ip: null, captchaToken: 't', verifier: okVerifier })).outcome).toBe('invalid')
    expect((await createPublicGraderRunViaFormsEngine({ ...baseInput, email: 'nope' }, { ip: null, captchaToken: 't', verifier: okVerifier })).outcome).toBe('invalid')
    expect(spies.persist).not.toHaveBeenCalled()
  })

  it('captcha falla → captcha_failed + evento, no persiste', async () => {
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const res = await createPublicGraderRunViaFormsEngine(baseInput, { ip: '1.2.3.4', captchaToken: 'bad', verifier: failVerifier })

    expect(res.outcome).toBe('captcha_failed')
    expect(spies.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'captcha_failed' }))
    expect(spies.persist).not.toHaveBeenCalled()
  })

  it('abuse/cost → outcome del guard, no persiste', async () => {
    state.abuse = { allowed: false, outcome: 'cost_blocked' }
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const res = await createPublicGraderRunViaFormsEngine(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    expect(res.outcome).toBe('cost_blocked')
    expect(spies.persist).not.toHaveBeenCalled()
  })

  it('doble-submit (dedupe) → accepted con el submission previo, no persiste de nuevo', async () => {
    state.duplicate = { submission_id: 'fsub-PREV' }
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const res = await createPublicGraderRunViaFormsEngine(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    expect(res.outcome).toBe('accepted')
    expect(res.submissionId).toBe('fsub-PREV')
    expect(spies.persist).not.toHaveBeenCalled()
  })

  it('accepted: persiste submission del grader-form + devuelve submissionId; el EMAIL va al submission (no se encola)', async () => {
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const res = await createPublicGraderRunViaFormsEngine(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    expect(res.outcome).toBe('accepted')
    expect(res.submissionId).toBe('fsub-NEW')
    expect(res.runPublicId).toBeNull() // el run lo crea el reactive consumer, no la fachada

    const persistArg = spies.persist.mock.calls[0][0] as Record<string, unknown>

    expect(persistArg.formId).toBe('fdef-ai-visibility-grader')
    expect(persistArg.formVersionId).toBe('fver-ai-visibility-grader-v2')
    // El email + nombre/apellido viven en el normalized_fields del submission (PII entregable en PG con consent).
    expect((persistArg.normalizedFields as Record<string, unknown>).email).toBe('prospecto@empresa.com')
    expect((persistArg.normalizedFields as Record<string, unknown>).firstName).toBe('Ana')
    expect((persistArg.normalizedFields as Record<string, unknown>).lastName).toBe('Pérez')
    expect((persistArg.consent as Record<string, unknown>).consentPolicyVersion).toBe('ai-visibility-grader-consent-v1')
    expect(spies.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'accepted' }))
  })

  it('TASK-1263 — gate rechaza (gmail/temporal) → email_not_corporate, NO persiste, registra rechazo + evento', async () => {
    state.gate = { gated: true, rejected: true, rejectionClass: 'email_not_corporate', quality: 'suspect', domainClass: 'personal' }
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const res = await createPublicGraderRunViaFormsEngine(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    expect(res.outcome).toBe('email_not_corporate')
    expect(spies.persist).not.toHaveBeenCalled() // NO acepta el lead ni encola → no gasta AI
    expect(spies.rejected).toHaveBeenCalledWith(expect.objectContaining({ reasonClass: 'email_not_corporate' }))
    expect(spies.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'email_not_corporate' }))
  })

  it('TASK-1263 — gate pasa (corporativo) → accepted + persiste con email_quality/domain_class', async () => {
    state.gate = { gated: true, rejected: false, rejectionClass: null, quality: 'verified', domainClass: 'corporate' }
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const res = await createPublicGraderRunViaFormsEngine(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    expect(res.outcome).toBe('accepted')
    const persistArg = spies.persist.mock.calls[0][0] as Record<string, unknown>

    expect(persistArg.emailQuality).toBe('verified')
    expect(persistArg.emailDomainClass).toBe('corporate')
    expect(spies.rejected).not.toHaveBeenCalled()
  })

  it('TASK-1263 — el FK anchor sigue a la versión publicada resuelta por slug (no un constante)', async () => {
    state.publishedVersion = { form_id: 'fdef-ai-visibility-grader', form_version_id: 'fver-ai-visibility-grader-v3', validation_schema_json: {} }
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')

    await createPublicGraderRunViaFormsEngine(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    const persistArg = spies.persist.mock.calls[0][0] as Record<string, unknown>

    expect(persistArg.formVersionId).toBe('fver-ai-visibility-grader-v3')
  })
})


describe('Grader commercial measurement handoff (all persistence mocked)', () => {
  const context = { ip: '192.0.2.1', captchaToken: 'offline', verifier: okVerifier,
    origin: 'https://think.efeoncepro.com', pageUri: 'https://think.efeoncepro.com/brand-visibility',
    userAgent: 'Offline unit fixture', measurementContext: { advertisement: true }, requestGlobalPrivacyControl: true }

  const prepared = (): PreparedMeasurement => {
    const issued = Date.now()

    return { policyRevisionId: 'policy', eventId: '11111111-1111-4111-8111-111111111111', occurredAt: new Date(issued).toISOString(),
      consent: {} as PreparedMeasurement['consent'], encryptedPayload: { v: 1, iv: '', tag: '', ciphertext: '' }, destinations: [],
      googleAdsConversion: { version: 1, transactionId: '11111111-1111-4111-8111-111111111111', conversionKey: 'commercial_lead',
        issuedAt: new Date(issued).toISOString(), expiresAt: new Date(issued + 600_000).toISOString() } }
  }

  it('uses canonical UUID/current version and visitor privacy boundary; receipt only after persisted measurement', async () => {
    state.measurement = prepared()
    state.measurementPersisted = true
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const response = await createPublicGraderRunViaFormsEngine(baseInput, context)

    expect(spies.prepare).toHaveBeenCalledWith(expect.objectContaining({
      scope: expect.objectContaining({ sourceKey: '69cd5269-5f97-4d32-99c4-0b23f41aa2f5', sourceVersion: 'fver-ai-visibility-grader-v2',
        surfaceId: 'fhsf-ai-visibility-grader', origin: context.origin, pageUri: context.pageUri }),
      requestGlobalPrivacyControl: true, measurementContext: context.measurementContext, ip: context.ip, userAgent: context.userAgent,
    }))
    expect(spies.persist).toHaveBeenCalledWith(expect.objectContaining({ measurement: state.measurement, pageUri: context.pageUri }))
    expect(response.googleAdsConversion).toEqual(state.measurement.googleAdsConversion)
    expect(response.submissionId).toBe('fsub-NEW')
  })

  it('does not reissue a receipt for a duplicate', async () => {
    state.measurement = prepared()
    state.measurementPersisted = true
    state.duplicate = { submission_id: 'fsub-PREV' }
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const response = await createPublicGraderRunViaFormsEngine(baseInput, context)

    expect(response.googleAdsConversion).toBeUndefined()
    expect(spies.prepare).not.toHaveBeenCalled()
    expect(spies.persist).not.toHaveBeenCalled()
  })

  it('accepts the submission without receipt when measurement savepoint failed', async () => {
    state.measurement = prepared()
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const response = await createPublicGraderRunViaFormsEngine(baseInput, context)

    expect(response.outcome).toBe('accepted')
    expect(response.googleAdsConversion).toBeUndefined()
  })

  it.each(['missing-version', 'missing-definition', 'identity-mismatch', 'lookup-failure'])('fails closed for measurement without breaking acceptance: %s', async scenario => {
    state.measurement = prepared()
    state.measurementPersisted = true
    if (scenario === 'missing-version') state.publishedVersion = null
    if (scenario === 'missing-definition') spies.definition.mockReturnValue(null)
    if (scenario === 'identity-mismatch') spies.definition.mockReturnValue({ form_id: 'another-form', slug: 'ai-visibility-grader', form_key: 'another-key' })
    if (scenario === 'lookup-failure') spies.definition.mockRejectedValue(new Error('unavailable'))
    const { createPublicGraderRunViaFormsEngine } = await import('../public-intake/forms-engine-binding')
    const response = await createPublicGraderRunViaFormsEngine(baseInput, context)

    expect(response.outcome).toBe('accepted')
    expect(response.googleAdsConversion).toBeUndefined()
    expect(spies.prepare).not.toHaveBeenCalled()
    expect(spies.persist).toHaveBeenCalledWith(expect.objectContaining({ measurement: null }))
  })
})
