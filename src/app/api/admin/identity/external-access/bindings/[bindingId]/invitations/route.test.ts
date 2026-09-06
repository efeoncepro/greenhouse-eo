import { describe, expect, it } from 'vitest'

import { buildIssueExternalInvitationResponse } from './route'

const invitation = {
  invitationId: 'xmi-1',
  bindingId: 'xob-1',
  profileId: null,
  email: 'ana@cliente.cl',
  designatedAdmin: false,
  status: 'issued' as const,
  reason: null,
  issuedBy: 'u',
  issuedAt: '2026-09-05T00:00:00.000Z',
  expiresAt: '2026-09-08T00:00:00.000Z',
  acceptedAt: null,
  linkedAt: null,
  linkId: null,
  revokedBy: null,
  revokedAt: null,
  revokeReason: null,
  deliveryStatus: 'sent' as const,
  deliveryAttempts: 1,
  lastDeliveryAt: '2026-09-05T00:00:01.000Z',
  lastDeliveryErrorCode: null
}

/**
 * TASK-1837 — Guard de regresión del contrato de respuesta: con entrega del sistema el campo `token`
 * NO EXISTE en el body (ni como null). Si alguien lo vuelve a agregar, este test falla.
 */
describe('TASK-1837 — issue invitation response contract', () => {
  it('omits the token entirely when the system delivered the email', () => {
    const body = buildIssueExternalInvitationResponse({
      invitation,
      token: 'secret-token',
      created: true,
      delivery: { mode: 'system', status: 'sent', attempts: 1, recipientMasked: 'a***@cliente.cl', errorCode: null }
    })

    expect(Object.keys(body).sort()).toEqual(['created', 'delivery', 'invitation'])
    expect(JSON.stringify(body)).not.toContain('secret-token')
    expect(JSON.stringify(body)).not.toContain('"token"')
  })

  it('keeps the legacy token field only in manual mode (flag OFF)', () => {
    const body = buildIssueExternalInvitationResponse({
      invitation: { ...invitation, deliveryStatus: 'not_attempted', deliveryAttempts: 0, lastDeliveryAt: null },
      token: 'secret-token',
      created: true,
      delivery: { mode: 'manual', status: 'not_attempted', attempts: 0, recipientMasked: 'a***@cliente.cl', errorCode: null }
    })

    expect(body.token).toBe('secret-token')
  })
})
