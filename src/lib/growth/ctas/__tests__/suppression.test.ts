import { describe, expect, it } from 'vitest'

import { evaluateCtaSuppression, parseSuppressionPolicy, type EvaluateCtaSuppressionInput } from '../suppression'

/**
 * TASK-1428 — decisión PURA de suppression/frequency capping (task §Visitor-experience
 * policy): taxonomía estable, fail-closed en policy inválida, fallback conservador sin
 * sujeto, ventanas per-CTA y global, y semántica dismiss/conversión.
 */

const NOW = new Date('2026-07-18T12:00:00Z')

const hoursAgo = (hours: number): Date => new Date(NOW.getTime() - hours * 3_600_000)
const daysAgo = (days: number): Date => hoursAgo(days * 24)

const baseInput = (overrides: Partial<EvaluateCtaSuppressionInput> = {}): EvaluateCtaSuppressionInput => ({
  policyJson: {},
  interruptive: true,
  hasSubject: true,
  state: null,
  globalWindow: null,
  globalInterruptiveCapPerDay: 3,
  now: NOW,
  ...overrides,
})

const stateWith = (overrides: Partial<NonNullable<EvaluateCtaSuppressionInput['state']>> = {}) => ({
  lastDismissedAt: null,
  convertedAt: null,
  windowStartedAt: null,
  impressionsInWindow: 0,
  ...overrides,
})

describe('parseSuppressionPolicy', () => {
  it('`{}` (el default de toda versión foundation) es válida con defaults conservadores', () => {
    const policy = parseSuppressionPolicy({})

    expect(policy).toEqual({
      dismissCooldownDays: 14,
      suppressAfterConversion: true,
      maxImpressionsPerWindow: 2,
      windowHours: 24,
    })
  })

  it('policy malformada retorna null (el caller falla closed)', () => {
    expect(parseSuppressionPolicy({ dismissCooldownDays: 'nope' })).toBeNull()
    expect(parseSuppressionPolicy({ maxImpressionsPerWindow: 0 })).toBeNull()
  })
})

describe('evaluateCtaSuppression', () => {
  it('sin estado previo y con sujeto → eligible', () => {
    expect(evaluateCtaSuppression(baseInput())).toEqual({ outcome: 'eligible', reason: null })
  })

  it('policy inválida → suppressed policy_invalid (fail-closed)', () => {
    const decision = evaluateCtaSuppression(baseInput({ policyJson: { windowHours: -1 } }))

    expect(decision).toEqual({ outcome: 'suppressed', reason: 'policy_invalid' })
  })

  it('dismiss dentro del cooldown → suppressed dismissed (cualquier placement)', () => {
    for (const interruptive of [true, false]) {
      const decision = evaluateCtaSuppression(
        baseInput({ interruptive, state: stateWith({ lastDismissedAt: daysAgo(3) }) }),
      )

      expect(decision).toEqual({ outcome: 'suppressed', reason: 'dismissed' })
    }
  })

  it('dismiss fuera del cooldown (default 14d) → vuelve a ser eligible', () => {
    const decision = evaluateCtaSuppression(baseInput({ state: stateWith({ lastDismissedAt: daysAgo(20) }) }))

    expect(decision).toEqual({ outcome: 'eligible', reason: null })
  })

  it('dismissCooldownDays=0 desactiva el cooldown', () => {
    const decision = evaluateCtaSuppression(
      baseInput({ policyJson: { dismissCooldownDays: 0 }, state: stateWith({ lastDismissedAt: hoursAgo(1) }) }),
    )

    expect(decision).toEqual({ outcome: 'eligible', reason: null })
  })

  it('conversión verificada → suppressed already_converted', () => {
    const decision = evaluateCtaSuppression(baseInput({ state: stateWith({ convertedAt: daysAgo(30) }) }))

    expect(decision).toEqual({ outcome: 'suppressed', reason: 'already_converted' })
  })

  it('suppressAfterConversion=false permite render post-conversión (policy explícita)', () => {
    const decision = evaluateCtaSuppression(
      baseInput({ policyJson: { suppressAfterConversion: false }, state: stateWith({ convertedAt: daysAgo(1) }) }),
    )

    expect(decision).toEqual({ outcome: 'eligible', reason: null })
  })

  it('interruptivo SIN sujeto → suppressed consent_or_identity_limited (fallback conservador)', () => {
    const decision = evaluateCtaSuppression(baseInput({ hasSubject: false }))

    expect(decision).toEqual({ outcome: 'suppressed', reason: 'consent_or_identity_limited' })
  })

  it('no-interruptivo SIN sujeto → eligible (vive en el flujo del contenido)', () => {
    const decision = evaluateCtaSuppression(baseInput({ interruptive: false, hasSubject: false }))

    expect(decision).toEqual({ outcome: 'eligible', reason: null })
  })

  it('ventana per-CTA llena → capped frequency_capped', () => {
    const decision = evaluateCtaSuppression(
      baseInput({ state: stateWith({ windowStartedAt: hoursAgo(2), impressionsInWindow: 2 }) }),
    )

    expect(decision).toEqual({ outcome: 'capped', reason: 'frequency_capped' })
  })

  it('ventana per-CTA expirada → eligible (la ventana es rodante)', () => {
    const decision = evaluateCtaSuppression(
      baseInput({ state: stateWith({ windowStartedAt: hoursAgo(30), impressionsInWindow: 5 }) }),
    )

    expect(decision).toEqual({ outcome: 'eligible', reason: null })
  })

  it('cap global del sujeto (cross-CTA, 24h) → capped frequency_capped', () => {
    const decision = evaluateCtaSuppression(
      baseInput({ globalWindow: { windowStartedAt: hoursAgo(5), impressionsInWindow: 3 } }),
    )

    expect(decision).toEqual({ outcome: 'capped', reason: 'frequency_capped' })
  })

  it('frequency caps NO aplican a placements no interruptivos', () => {
    const decision = evaluateCtaSuppression(
      baseInput({
        interruptive: false,
        state: stateWith({ windowStartedAt: hoursAgo(1), impressionsInWindow: 99 }),
        globalWindow: { windowStartedAt: hoursAgo(1), impressionsInWindow: 99 },
      }),
    )

    expect(decision).toEqual({ outcome: 'eligible', reason: null })
  })

  it('el orden de evaluación es determinista: dismissed gana sobre converted y caps', () => {
    const decision = evaluateCtaSuppression(
      baseInput({
        state: stateWith({
          lastDismissedAt: daysAgo(1),
          convertedAt: daysAgo(1),
          windowStartedAt: hoursAgo(1),
          impressionsInWindow: 99,
        }),
      }),
    )

    expect(decision).toEqual({ outcome: 'suppressed', reason: 'dismissed' })
  })
})
