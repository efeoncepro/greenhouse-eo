import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EmailVerificationResult } from '../orchestrator'

/**
 * TASK-1263 — `evaluateFormEmailGate`: el helper canónico del gate corporativo (un primitive,
 * 3 consumers). Cubre flag OFF, policy `off`, sintaxis inválida, block_field (rechazo
 * corporativo + desechable), y warn/tag_only (etiqueta sin rechazar). `verifyEmail` y el flag
 * van mockeados; `resolveEmailPolicy` es puro (se ejercita real desde el validation_schema).
 */

const state = {
  flagEnabled: true,
  verdict: {} as EmailVerificationResult,
}

vi.mock('../../flags', () => ({
  isFormsEmailVerificationEnabled: () => state.flagEnabled,
}))

vi.mock('../orchestrator', () => ({
  verifyEmail: async () => state.verdict,
}))

import { evaluateFormEmailGate } from '../gate'

const verdictFor = (over: Partial<EmailVerificationResult>): EmailVerificationResult => ({
  syntaxValid: true,
  isCorporate: true,
  isDisposable: false,
  isRoleBased: false,
  isFreeProvider: false,
  deliverable: 'unknown',
  suggestion: null,
  quality: 'unknown',
  reasonCode: null,
  verifiedTier: 'tier1',
  degraded: false,
  ...over,
})

const blockSchema = { emailPolicy: { mode: 'block_field', field: 'email' } }

beforeEach(() => {
  state.flagEnabled = true
  state.verdict = verdictFor({})
})

describe('evaluateFormEmailGate', () => {
  it('flag OFF ⇒ no gated (no opina)', async () => {
    state.flagEnabled = false
    const r = await evaluateFormEmailGate(blockSchema, { email: 'gmail@gmail.com' })

    expect(r).toEqual({ gated: false, rejected: false, rejectionClass: null, quality: null, domainClass: null })
  })

  it('policy mode off (validation_schema vacío) ⇒ no gated', async () => {
    const r = await evaluateFormEmailGate({}, { email: 'ana@gmail.com' })

    expect(r.gated).toBe(false)
  })

  it('sintaxis inválida ⇒ no gated (el gate corporativo no opina sobre sintaxis)', async () => {
    state.verdict = verdictFor({ syntaxValid: false, reasonCode: 'email_format' })
    const r = await evaluateFormEmailGate(blockSchema, { email: 'no-es-email' })

    expect(r.gated).toBe(false)
  })

  it('block_field + no corporativo (gmail) ⇒ rechazo email_not_corporate', async () => {
    state.verdict = verdictFor({ isCorporate: false, quality: 'suspect', reasonCode: 'email_not_corporate' })
    const r = await evaluateFormEmailGate(blockSchema, { email: 'ana@gmail.com' })

    expect(r).toMatchObject({ gated: true, rejected: true, rejectionClass: 'email_not_corporate', domainClass: 'personal' })
  })

  it('block_field + desechable ⇒ rechazo email_disposable', async () => {
    state.verdict = verdictFor({ isCorporate: false, isDisposable: true, quality: 'suspect', reasonCode: 'email_disposable' })
    const r = await evaluateFormEmailGate(blockSchema, { email: 'x@mailinator.com' })

    expect(r).toMatchObject({ gated: true, rejected: true, rejectionClass: 'email_disposable', domainClass: 'disposable' })
  })

  it('block_field + corporativo ⇒ gated pero NO rechazado (pasa) + etiqueta corporate', async () => {
    state.verdict = verdictFor({ isCorporate: true, quality: 'verified', reasonCode: null })
    const r = await evaluateFormEmailGate(blockSchema, { email: 'jefe@empresa.com' })

    expect(r).toMatchObject({ gated: true, rejected: false, rejectionClass: null, quality: 'verified', domainClass: 'corporate' })
  })

  it('warn ⇒ etiqueta suspect sin rechazar aunque sea gmail', async () => {
    state.verdict = verdictFor({ isCorporate: false, quality: 'suspect', reasonCode: 'email_not_corporate' })
    const r = await evaluateFormEmailGate({ emailPolicy: { mode: 'warn', field: 'email' } }, { email: 'ana@gmail.com' })

    expect(r).toMatchObject({ gated: true, rejected: false, quality: 'suspect', domainClass: 'personal' })
  })

  it('respeta policy.field (no asume "email")', async () => {
    state.verdict = verdictFor({ isCorporate: false, reasonCode: 'email_not_corporate' })

    const r = await evaluateFormEmailGate(
      { emailPolicy: { mode: 'block_field', field: 'workEmail' } },
      { workEmail: 'ana@gmail.com', email: 'ignored@empresa.com' },
    )

    expect(r.rejected).toBe(true)
  })
})
