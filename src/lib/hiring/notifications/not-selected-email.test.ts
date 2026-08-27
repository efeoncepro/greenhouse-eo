import { describe, expect, it } from 'vitest'

import { AGENCY_BRANDED_EMAIL_TYPES, CANDIDATE_REPLY_TO_EMAIL_TYPES, EMAIL_PRIORITY_MAP } from '@/lib/email/types'

import { isHiringCapacityFilledEmailEnabled, isHiringOpeningCapacityClosureEnabled } from './config'

/** `ProcessEnv` trae índices requeridos; los tests sólo declaran las claves que ejercitan. */
const env = (vars: Record<string, string> = {}): NodeJS.ProcessEnv => vars as NodeJS.ProcessEnv

/**
 * TASK-1762 Slice 4 — el correo de «sin selección» y sus tres frenos.
 *
 * Lo que estos tests fijan no es el copy: es que el tipo sea PROPIO y que los frenos sean
 * independientes. Ambas cosas se pierden con un refactor bienintencionado que "unifique" el
 * correo de decisión, y la pérdida es invisible hasta que alguien pausa el descarte y apaga sin
 * querer un cierre de cohorte — o al revés.
 */

describe('EmailType hiring_decision_not_selected', () => {
  it('es un tipo propio, distinto del de descarte', () => {
    // Si alguien lo colapsa en `hiring_decision_rejected`, el kill-switch por tipo deja de poder
    // pausar uno sin el otro, y el email log escribe «rechazado» sobre quien no lo fue.
    expect(EMAIL_PRIORITY_MAP.hiring_decision_not_selected).toBe('transactional')
    expect(EMAIL_PRIORITY_MAP.hiring_decision_rejected).toBe('transactional')
  })

  it('es candidate-facing: va con la marca de la agencia, no la del portal', () => {
    // El candidato conoce a Efeonce, no a Greenhouse. Un correo de decisión con marca de portal
    // le llega de un remitente que nunca vio.
    expect(AGENCY_BRANDED_EMAIL_TYPES.has('hiring_decision_not_selected')).toBe(true)
  })

  it('lleva Reply-To al buzón de People', () => {
    // Un correo que dice «elegimos a otra persona» genera respuestas. Sin Reply-To caerían en la
    // dirección verificada del proveedor, que nadie lee — y la persona creería que contestó.
    expect(CANDIDATE_REPLY_TO_EMAIL_TYPES.has('hiring_decision_not_selected')).toBe(true)
  })
})

describe('frenos del cierre por capacidad', () => {
  it('ambos flags están OFF por defecto y se leen por separado', () => {
    // Independientes a propósito: se puede cerrar una cohorte SIN notificarla (canary) apagando
    // sólo el de correo. Colapsarlos en uno haría imposible ese ensayo.
    expect(isHiringOpeningCapacityClosureEnabled(env())).toBe(false)
    expect(isHiringCapacityFilledEmailEnabled(env())).toBe(false)

    expect(isHiringOpeningCapacityClosureEnabled(env({ HIRING_OPENING_CAPACITY_CLOSURE_ENABLED: 'true' }))).toBe(true)
    // Prender el del cierre NO prende el del correo.
    expect(isHiringCapacityFilledEmailEnabled(env({ HIRING_OPENING_CAPACITY_CLOSURE_ENABLED: 'true' }))).toBe(false)
  })

  it('sólo `true` explícito prende: cualquier otro valor deja el freno puesto', () => {
    for (const value of ['false', '1', 'yes', 'TRUE ', '']) {
      const expected = value.trim().toLowerCase() === 'true'

      expect(isHiringCapacityFilledEmailEnabled(env({ HIRING_CAPACITY_FILLED_EMAIL_ENABLED: value }))).toBe(expected)
    }
  })
})
