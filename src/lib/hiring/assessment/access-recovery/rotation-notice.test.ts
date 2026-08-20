import { describe, expect, it, vi } from 'vitest'

import { decideAssessmentAccessRotationNotice } from './vocabulary'

vi.mock('server-only', () => ({}))

/**
 * TASK-1757 — el aviso al candidato de que su acceso fue rotado.
 *
 * Emitir un enlace seguro mata la credencial anterior y se la entrega en mano al operador. Si esa
 * entrega falla, el candidato queda sin acceso, sin saber por qué y con el plazo corriendo. Estos
 * tests fijan CUÁNDO se avisa — porque avisar mal es peor que no avisar.
 */

const base = {
  channel: 'secure_link' as const,
  outcome: 'link_issued' as const,
  reasonCode: 'alternate_channel_requested' as const,
  hasCandidateEmail: true,
  providerBlockStatus: null as string | null,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

describe('decideAssessmentAccessRotationNotice', () => {
  it('el caso base sí avisa: enlace emitido, buzón sano, credencial viva', () => {
    expect(decideAssessmentAccessRotationNotice(base)).toEqual({ notify: true })
  })

  it('el canal de correo NO genera un segundo mensaje: ya lo dice el de recuperación', () => {
    expect(decideAssessmentAccessRotationNotice({ ...base, channel: 'email', outcome: 'dispatch_accepted' }))
      .toEqual({ notify: false, skip: 'not_secure_link' })
  })

  it('un desenlace que no emitió enlace no rotó nada, así que no hay de qué avisar', () => {
    expect(decideAssessmentAccessRotationNotice({ ...base, outcome: 'dispatch_failed' }))
      .toEqual({ notify: false, skip: 'not_secure_link' })
  })

  it('sin correo registrado no hay a quién avisarle', () => {
    expect(decideAssessmentAccessRotationNotice({ ...base, hasCandidateEmail: false }))
      .toEqual({ notify: false, skip: 'no_candidate_email' })
  })

  /**
   * El command YA rechaza duro el canal de correo con esta misma evidencia. Si el aviso no la
   * honrara, el sistema le prohibiría al operador mandar un correo de recuperación a esa dirección
   * y acto seguido le mandaría un correo de aviso: un agujero en un control ya vigente.
   */
  it.each(['bounced', 'suppressed', 'complained'])(
    'con el buzón en %s no se insiste: quema la reputación de envío de todos los demás',
    (status) => {
      expect(decideAssessmentAccessRotationNotice({ ...base, providerBlockStatus: status }))
        .toEqual({ notify: false, skip: 'provider_blocked' })
    },
  )

  it('el bloqueo del proveedor gana sobre el motivo declarado por el operador', () => {
    // Un operador puede elegir "pidió otro canal" sobre un buzón que rebota. La evidencia del
    // proveedor manda sobre la declaración humana.
    expect(decideAssessmentAccessRotationNotice({
      ...base,
      reasonCode: 'alternate_channel_requested',
      providerBlockStatus: 'bounced',
    })).toEqual({ notify: false, skip: 'provider_blocked' })
  })

  it('si el operador declaró que el envío falló, no se insiste aunque el proveedor se vea limpio', () => {
    // El webhook del proveedor tarda: un rebote de hace un minuto todavía no figura. La declaración
    // del operador es evidencia MÁS FRESCA.
    expect(decideAssessmentAccessRotationNotice({ ...base, reasonCode: 'provider_delivery_failed' }))
      .toEqual({ notify: false, skip: 'operator_declared_delivery_failed' })
  })

  it('una credencial ya vencida no se avisa: informaría de algo que ya no sirve', () => {
    expect(decideAssessmentAccessRotationNotice({
      ...base,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    })).toEqual({ notify: false, skip: 'credential_already_expired' })
  })

  it('sin vencimiento legible NO se asume vigente', () => {
    expect(decideAssessmentAccessRotationNotice({ ...base, expiresAt: null }))
      .toEqual({ notify: false, skip: 'credential_already_expired' })
  })

  it('los motivos donde el buzón está sano SÍ avisan', () => {
    for (const reasonCode of [
      'candidate_reports_email_not_received',
      'candidate_reports_link_invalid',
      'alternate_channel_requested',
      'token_expired_before_start',
    ] as const) {
      expect(decideAssessmentAccessRotationNotice({ ...base, reasonCode })).toEqual({ notify: true })
    }
  })
})
