import { describe, expect, it, vi } from 'vitest'

import {
  AGENCY_BRANDED_EMAIL_TYPES,
  CANDIDATE_REPLY_TO_EMAIL_TYPES,
  resolveCandidateReplyToAddress,
} from './types'

vi.mock('server-only', () => ({}))

/**
 * TASK-1757 — una salida de emergencia que nadie atiende es peor que no ofrecer ninguna.
 *
 * Varios correos candidate-facing le piden a la persona que responda; el aviso de rotación termina
 * literalmente en «responde este correo y lo reponemos». Sin `Reply-To`, esa respuesta llega a la
 * dirección de ENVÍO del proveedor, que no es un buzón que alguien lea: la persona cree que pidió
 * ayuda y se queda esperando.
 */

describe('reply-to de correos a candidatos', () => {
  it('cada tipo candidate-facing responde a un buzón atendido', () => {
    expect(CANDIDATE_REPLY_TO_EMAIL_TYPES.size).toBeGreaterThan(0)

    for (const emailType of CANDIDATE_REPLY_TO_EMAIL_TYPES) {
      // La marca dice quién firma; el reply-to dice a quién le llega la respuesta. Un correo a un
      // candidato que no sale con marca de agencia sería incoherente.
      expect(AGENCY_BRANDED_EMAIL_TYPES.has(emailType), `${emailType} no está agency-branded`).toBe(true)
    }
  })

  it('el aviso de rotación está incluido: es el que más explícitamente pide respuesta', () => {
    expect(CANDIDATE_REPLY_TO_EMAIL_TYPES.has('hiring_assessment_access_rotated')).toBe(true)
  })

  it('la dirección es configurable por env y NO se hardcodea en templates', () => {
    expect(resolveCandidateReplyToAddress({ HIRING_CANDIDATE_REPLY_TO_EMAIL: 'talento@efeoncepro.com' } as unknown as NodeJS.ProcessEnv))
      .toBe('talento@efeoncepro.com')
  })

  it('sin env configurada cae al buzón de People, nunca a la dirección de envío', () => {
    const resolved = resolveCandidateReplyToAddress({} as unknown as NodeJS.ProcessEnv)

    expect(resolved).toBe('people@efeoncepro.com')
    expect(resolved).not.toContain('greenhouse@')
  })

  it('un valor en blanco no deja al candidato sin buzón', () => {
    expect(resolveCandidateReplyToAddress({ HIRING_CANDIDATE_REPLY_TO_EMAIL: '   ' } as unknown as NodeJS.ProcessEnv))
      .toBe('people@efeoncepro.com')
  })
})
