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

const state = {
  intakeEnabled: true,
  abuse: { allowed: true, outcome: null as null | 'rate_limited' | 'cost_blocked' },
  duplicate: null as { submission_id: string } | null,
}

const spies = {
  persist: vi.fn(),
  recordEvent: vi.fn(),
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

vi.mock('@/lib/growth/forms/store', () => ({
  findRecentDuplicate: async () => state.duplicate,
  persistAcceptedSubmission: async (input: unknown) => {
    spies.persist(input)

    return { submission_id: 'fsub-NEW', form_id: 'fdef-ai-visibility-grader' }
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
  spies.persist.mockClear()
  spies.recordEvent.mockClear()
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
})
