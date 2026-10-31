import { render } from '@react-email/render'
import { describe, expect, it, vi } from 'vitest'

import type { SendEmailInput, SendEmailResult } from '@/lib/email/types'
import { AGENCY_BRANDED_EMAIL_TYPES, isTokenSensitiveEmailType } from '@/lib/email/types'
import { resolveTemplate } from '@/lib/email/templates'

import { createGovernedInvitationOtpMailer } from './mailer'

const delivery = { email: 'synthetic@example.test', invitationUrl: `https://rooms.example.test/invite#token=${'a'.repeat(43)}`,
  roomLabel: 'Sala sintética', code: '123456', expiresInMinutes: 10, deliveryId: 'ea52cc41-0a92-43c1-9be8-111111111111' }

describe('Rooms invitation governed email', () => {
  it('uses a token-sensitive Efeonce type with safe persistence metadata', async () => {
    const sender = vi.fn<(input: SendEmailInput) => Promise<SendEmailResult>>(async () => ({
      deliveryId: 'fake-ledger-id', resendId: 'fake-provider-id', status: 'sent', dispatchOutcome: 'accepted'
    }))

    expect(await createGovernedInvitationOtpMailer(sender).send(delivery)).toEqual({ status: 'accepted' })
    const input = sender.mock.calls[0][0]

    expect(input.emailType).toBe('auth_server_rooms_invitation_otp')
    expect(isTokenSensitiveEmailType(input.emailType)).toBe(true)
    expect(AGENCY_BRANDED_EMAIL_TYPES.has(input.emailType)).toBe(true)
    expect(input.persistence).toEqual({ mode: 'token_sensitive', safeContext: { locale: 'es', timeLimitMinutes: 10 } })
    expect(JSON.stringify(input.persistence)).not.toContain(delivery.code)
    expect(input.sourceEventId).toBe(delivery.deliveryId)
  })
  it.each(['unknown', 'failed'] as const)('does not claim delivery for %s dispatch', async dispatchOutcome => {
    const sender = async (): Promise<SendEmailResult> => ({ deliveryId: 'fake', resendId: null, status: 'failed', dispatchOutcome })

    expect(await createGovernedInvitationOtpMailer(sender).send(delivery)).toEqual({ status: 'failed' })
  })
  it('renders one message containing code and exact link, with matching plain text', async () => {
    const template = resolveTemplate('auth_server_rooms_invitation_otp', delivery)
    const html = await render(template.react)

    expect(template.text).toContain(delivery.code)
    expect(template.text).toContain(delivery.invitationUrl)
    expect(html).toContain(delivery.code)
    expect(html).toContain(`href="${delivery.invitationUrl}"`)
    expect(html).toContain('Rooms')
    expect(html).not.toContain('MFA')
    expect(html).not.toContain('Greenhouse')
  })
})
