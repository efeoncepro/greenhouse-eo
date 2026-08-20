import { describe, expect, it } from 'vitest'

import { resolveRecoveryUnavailableMessage } from './AssessmentRecoveryCluster'
import { getMicrocopy } from '@/lib/copy'

import type { AssessmentAccessRecoveryAvailability } from '@/lib/hiring/assessment/access-recovery/vocabulary'

/**
 * TASK-1747 — un test CANCELADO y uno YA RENDIDO caen en el mismo `eligibilityCode`
 * (`status_not_allowed`), pero el remedio es distinto: el cancelado se reasigna, el rendido no
 * tiene salida. Colapsarlos le mentiría al operador sobre el único de los dos que sí es accionable.
 */

const copy = getMicrocopy('es-CL').hiringDesk.application.accessRecovery

const availability = (over: Partial<AssessmentAccessRecoveryAvailability> = {}): AssessmentAccessRecoveryAvailability => ({
  assessmentId: 'asm-1',
  applicationId: 'happ-1',
  openingId: 'hop-1',
  status: 'submitted',
  eligible: false,
  eligibilityCode: 'assessment_recovery_status_not_allowed',
  channels: {
    email: { available: false, providerStatus: null, hasCandidateEmail: true },
    secureLink: { available: false },
  },
  rateLimit: {
    maxPer24Hours: 3,
    usedIn24Hours: 0,
    cooldownUntil: null,
    secureLinkCooldownUntil: null,
    limited: false,
  },
  ...over,
})

describe('resolveRecoveryUnavailableMessage', () => {
  it('un test elegible no produce mensaje de bloqueo', () => {
    expect(resolveRecoveryUnavailableMessage(availability({ eligible: true, eligibilityCode: null }), copy)).toBeNull()
  })

  it('cancelado dice el remedio real (reasignar), no "ya se rindió"', () => {
    const message = resolveRecoveryUnavailableMessage(availability({ status: 'cancelled' }), copy)

    expect(message).toBe(copy.unavailable.assessment_recovery_status_cancelled)
    expect(message).not.toBe(copy.unavailable.assessment_recovery_status_not_allowed)
  })

  it('rendido conserva su propio mensaje', () => {
    expect(resolveRecoveryUnavailableMessage(availability({ status: 'submitted' }), copy))
      .toBe(copy.unavailable.assessment_recovery_status_not_allowed)
  })

  it('cada código de elegibilidad tiene su frase; ninguno cae al genérico', () => {
    const codes = Object.keys(copy.unavailable).filter((code) => code !== 'assessment_recovery_status_cancelled')

    for (const code of codes) {
      expect(resolveRecoveryUnavailableMessage(availability({ eligibilityCode: code }), copy))
        .toBe(copy.unavailable[code as keyof typeof copy.unavailable])
    }
  })

  it('un código desconocido degrada al genérico en vez de renderizar vacío', () => {
    expect(resolveRecoveryUnavailableMessage(availability({ eligibilityCode: 'codigo_que_no_existe' }), copy))
      .toBe(copy.errorGeneric)
  })
})
