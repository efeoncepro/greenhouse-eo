import { describe, expect, it } from 'vitest'

import { resolveChannelBlockMessage, resolveRecoveryUnavailableMessage } from './AssessmentRecoveryCluster'
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
    email: { available: false, blockedBy: 'assessment_not_eligible', providerStatus: null, hasCandidateEmail: true },
    secureLink: { available: false, blockedBy: 'assessment_not_eligible' },
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

/**
 * Regresión del 2026-08-19 (auditoría adversarial del Slice 4): cuota agotada en los DOS canales
 * produce `eligible: false` con `eligibilityCode: null`, porque el presupuesto no es un defecto del
 * test. Sin rama propia caía al genérico "intenta de nuevo en unos minutos" — y la espera real es
 * de hasta 24 horas.
 */
describe('cuota agotada no se disfraza de falla transitoria', () => {
  it('sin código de elegibilidad, el mensaje es el de cuota, no el genérico', () => {
    const message = resolveRecoveryUnavailableMessage(
      availability({ eligibilityCode: null, rateLimit: { ...availability().rateLimit, usedIn24Hours: 3, limited: true } }),
      copy,
    )

    expect(message).toBe(copy.quotaExhaustedAll)
    expect(message).not.toBe(copy.errorGeneric)
  })
})

/**
 * Cada bloqueo de canal dice su causa. El `available: boolean` original colapsaba cinco remedios
 * distintos en un `false`, y todos terminaban en el mismo mensaje.
 */
describe('resolveChannelBlockMessage', () => {
  it('sin correo registrado dice eso, no "no tienes permiso"', () => {
    expect(resolveChannelBlockMessage('no_candidate_email', 'email', availability(), copy)).toBe(copy.emailMissing)
  })

  it('buzón bloqueado por el proveedor tiene su propio remedio', () => {
    expect(resolveChannelBlockMessage('provider_blocked', 'email', availability(), copy)).toBe(copy.emailBlocked)
  })

  it('cuota del correo deja ver que el enlace sigue disponible', () => {
    expect(resolveChannelBlockMessage('quota_exhausted', 'email', availability(), copy))
      .toBe(copy.quotaExhaustedEmail.replace('{max}', '3'))
  })

  it('el cooldown dice los segundos, no "más tarde"', () => {
    const until = new Date(Date.now() + 45_000).toISOString()

    const message = resolveChannelBlockMessage(
      'cooldown',
      'email',
      availability({ rateLimit: { ...availability().rateLimit, cooldownUntil: until } }),
      copy,
    )

    expect(message).toMatch(/4[45]/)
    expect(message).not.toBe(copy.errorRateLimited)
  })

  it('los cooldowns de los dos canales son independientes', () => {
    const until = new Date(Date.now() + 30_000).toISOString()

    const emailCooldown = availability({
      rateLimit: { ...availability().rateLimit, cooldownUntil: until, secureLinkCooldownUntil: null },
    })

    // El enlace seguro no hereda la espera del correo: son presupuestos separados.
    expect(resolveChannelBlockMessage('cooldown', 'secure_link', emailCooldown, copy)).toBe(
      copy.cooldown.replace('{seconds}', '0'),
    )
  })
})
