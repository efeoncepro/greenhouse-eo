import type { SendEmailInput, SendEmailResult } from '@/lib/email/types'

import type { InvitationOtpMailer } from './types'

type GovernedSender = (input: SendEmailInput) => Promise<SendEmailResult>

/** Inject only fake senders in tests; production uses the existing governed delivery pipeline. */
export function createGovernedInvitationOtpMailer(sender?: GovernedSender): InvitationOtpMailer {
  return {
    async send({ email, invitationUrl, roomLabel, code, expiresInMinutes, deliveryId }) {
      try {
        const send = sender ?? (await import('@/lib/email/delivery')).sendEmail

        const result = await send({
          emailType: 'auth_server_rooms_invitation_otp', domain: 'identity', recipients: [{ email }],
          context: { invitationUrl, roomLabel, code, expiresInMinutes, locale: 'es' },
          persistence: { mode: 'token_sensitive', safeContext: { locale: 'es', timeLimitMinutes: expiresInMinutes } },
          sourceEntity: 'auth_server_rooms_invitation', sourceEventId: deliveryId
        })

        // sent is the local ledger state, not delivered/read. Unknown provider outcomes fail closed.
        return { status: result.status === 'sent' && result.dispatchOutcome === 'accepted' ? 'accepted' : 'failed' }
      } catch { return { status: 'failed' } }
    }
  }
}
