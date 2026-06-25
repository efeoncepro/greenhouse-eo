import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type CaptchaVerifier } from '../public-intake/captcha'
import { type PublicGraderRunInput } from '../public-intake/contracts'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const state = {
  intakeEnabled: true,
  abuse: { allowed: true, outcome: null as null | 'rate_limited' | 'cost_blocked' },
  idempotentHit: false
}

const spies = {
  enqueue: vi.fn(),
  insertLead: vi.fn(),
  recordEvent: vi.fn()
}

vi.mock('../flags', () => ({
  isPublicIntakeEnabled: () => state.intakeEnabled
}))

vi.mock('../commands', () => ({
  enqueueGraderDiagnostic: async (input: unknown) => {
    spies.enqueue(input)

    return {
      run: { runId: 'grun-1', publicId: 'EO-GRUN-09999', pollToken: 'gpt-test-9999', profileId: 'gprf-1' },
      idempotentHit: state.idempotentHit
    }
  }
}))

vi.mock('../public-intake/abuse-guard', () => ({
  ESTIMATED_PUBLIC_RUN_COST_USD: 0.1,
  hashIdentifier: (value: string | null) => (value ? `hash:${value}` : null),
  resolveIntakeLimits: () => ({ perEmailPerDay: 3, perIpPerDay: 10, globalDailyBudgetUsd: 25 }),
  checkIntakeAbuse: async () => state.abuse,
  recordIntakeEvent: async (input: unknown) => {
    spies.recordEvent(input)
  }
}))

vi.mock('../public-intake/store', () => ({
  insertGraderLead: async (input: unknown) => {
    spies.insertLead(input)

    return 'glead-1'
  }
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
  mainChallenge: null
}

beforeEach(() => {
  state.intakeEnabled = true
  state.abuse = { allowed: true, outcome: null }
  state.idempotentHit = false
  spies.enqueue.mockClear()
  spies.insertLead.mockClear()
  spies.recordEvent.mockClear()
})

describe('growth/ai-visibility — public run intake (TASK-1240)', () => {
  it('flag OFF → disabled (no toca DB ni encola)', async () => {
    state.intakeEnabled = false
    const { createPublicGraderRun } = await import('../public-intake/create-public-run')
    const res = await createPublicGraderRun(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    expect(res.outcome).toBe('disabled')
    expect(spies.enqueue).not.toHaveBeenCalled()
  })

  it('sin consent o email inválido → invalid', async () => {
    const { createPublicGraderRun } = await import('../public-intake/create-public-run')

    expect((await createPublicGraderRun({ ...baseInput, consent: false }, { ip: null, captchaToken: 't', verifier: okVerifier })).outcome).toBe('invalid')
    expect((await createPublicGraderRun({ ...baseInput, email: 'no-email' }, { ip: null, captchaToken: 't', verifier: okVerifier })).outcome).toBe('invalid')
    expect(spies.enqueue).not.toHaveBeenCalled()
  })

  it('captcha falla → captcha_failed + evento registrado, no encola', async () => {
    const { createPublicGraderRun } = await import('../public-intake/create-public-run')
    const res = await createPublicGraderRun(baseInput, { ip: '1.2.3.4', captchaToken: 'bad', verifier: failVerifier })

    expect(res.outcome).toBe('captcha_failed')
    expect(spies.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'captcha_failed' }))
    expect(spies.enqueue).not.toHaveBeenCalled()
  })

  it('rate-limit / cost → outcome del guard, no encola', async () => {
    state.abuse = { allowed: false, outcome: 'rate_limited' }
    const { createPublicGraderRun } = await import('../public-intake/create-public-run')
    const res = await createPublicGraderRun(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    expect(res.outcome).toBe('rate_limited')
    expect(spies.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'rate_limited' }))
    expect(spies.enqueue).not.toHaveBeenCalled()
  })

  it('accepted: encola + persiste lead + evento; el EMAIL NUNCA va al enqueue (PII)', async () => {
    const { createPublicGraderRun } = await import('../public-intake/create-public-run')
    const res = await createPublicGraderRun(baseInput, { ip: '1.2.3.4', captchaToken: 't', verifier: okVerifier })

    expect(res.outcome).toBe('accepted')
    expect(res.runPublicId).toBe('EO-GRUN-09999')
    // TASK-1245 — el handle de poll de alta entropía (NO el public_id secuencial) viaja al cliente.
    expect(res.pollToken).toBe('gpt-test-9999')

    // PII NUNCA en el input del enqueue (sólo marca/categoría/mercado).
    const enqueueArg = spies.enqueue.mock.calls[0][0] as Record<string, unknown>

    expect(JSON.stringify(enqueueArg)).not.toContain('prospecto@empresa.com')
    // TASK-1257 — nombre/apellido (PII) NUNCA al enqueue del run.
    expect(JSON.stringify(enqueueArg)).not.toContain('Ana')
    expect(JSON.stringify(enqueueArg)).not.toContain('Pérez')
    expect(enqueueArg.runKind).toBe('public_diagnostic')
    expect(enqueueArg.mode).toBe('light')

    // El email + nombre/apellido SÍ van al lead (con consent).
    expect(spies.insertLead).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'prospecto@empresa.com', firstName: 'Ana', lastName: 'Pérez', consent: true, runId: 'grun-1' })
    )
    expect(spies.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'accepted', runId: 'grun-1' }))
  })

  it('doble-submit idempotente → no doble lead ni doble evento de costo', async () => {
    state.idempotentHit = true
    const { createPublicGraderRun } = await import('../public-intake/create-public-run')
    const res = await createPublicGraderRun(baseInput, { ip: '1.2.3.4', captchaToken: 't', idempotencyKey: 'k1', verifier: okVerifier })

    expect(res.outcome).toBe('accepted')
    expect(spies.insertLead).not.toHaveBeenCalled()
    expect(spies.recordEvent).not.toHaveBeenCalled()
  })
})
