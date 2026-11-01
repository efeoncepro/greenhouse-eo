import type { EnvSource } from '@/types/env-source'

import type { OAuthHttpRequest, OAuthHttpResponse } from '../oauth/http'
import type { OAuthStorePort } from '../oauth/store/port'
import type { FirstPartyStore } from '../first-party/types'
import { parseClientCredentials } from '../oauth/clients'
import { safeEquals, sha256Hex } from '../oauth/primitives'
import { createHttpInvitationAuthority } from './authority-http'
import { createInvitationEmailOtp } from './core'
import { createInvitationOtpHandler } from './handler'
import type { InvitationOtpMailer, InvitationOtpStore, InvitationProofSigner } from './types'

/** Disabled means no config/DB/network access. Secrets are only read after the explicit gate. */
export function createInvitationOtpRuntime(input: {
  enabled: boolean; issuer: string; firstPartyStore: FirstPartyStore; store: InvitationOtpStore;
  mailer: InvitationOtpMailer; signer: InvitationProofSigner; auditStore: OAuthStorePort;
  env?: EnvSource; fetch?: typeof fetch
}): ((request: OAuthHttpRequest) => Promise<OAuthHttpResponse | null>) | undefined {
  if (!input.enabled) return undefined
  const env = input.env ?? process.env

  if (env.AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED !== 'true') return undefined
  const clientId = env.AUTH_SERVER_INVITATION_EMAIL_OTP_CLIENT_ID ?? ''
  const roomsOrigin = env.AUTH_SERVER_INVITATION_EMAIL_OTP_ROOMS_ORIGIN ?? ''
  const allowLocalDevelopment = env.AUTH_SERVER_INVITATION_EMAIL_OTP_LOCAL === 'true' && env.NODE_ENV !== 'production'

  if (!/^efeonce-rp-[a-z0-9][a-z0-9._-]{1,100}$/.test(clientId)) throw new Error('Invalid invitation OTP client configuration')

  const authority = createHttpInvitationAuthority({ roomsOrigin,
    serviceToken: env.ROOMS_INVITATION_AUTHORITY_TOKEN ?? '', allowLocalDevelopment, fetch: input.fetch })

  const core = createInvitationEmailOtp({ issuer: input.issuer, roomsOrigin, allowLocalDevelopment, authority,
    hmacSecret: env.AUTH_SERVER_INVITATION_EMAIL_OTP_HMAC_SECRET ?? '', store: input.store, mailer: input.mailer, signer: input.signer,
    audit: { record: async event => {
      await input.auditStore.recordAuditEvent({ eventType: 'authorize', outcome: event.outcome === 'accepted' ? 'success' : 'rejected',
        clientId: event.clientId, subjectHash: null, grantId: null, errorCode: null, ipHash: null, userAgentHash: null,
        correlationId: null, details: { surface: 'invitation_email_otp', action: event.action, outcome: event.outcome } })
    } }
  })

  return createInvitationOtpHandler(core, { authenticate: async request => {
    if (request.headers.get('origin') || request.headers.get('cookie')) return null
    let credentials: ReturnType<typeof parseClientCredentials>

    try {
      credentials = parseClientCredentials({ authorization: request.headers.get('authorization'), bodyClientId: null, bodyClientSecret: null })
    } catch { return null }

    if (credentials.method !== 'basic' || credentials.clientId !== clientId || !credentials.clientSecret) return null
    const client = await input.firstPartyStore.getClient(clientId)

    if (!client || client.status !== 'active' || client.product !== 'rooms' || client.tokenEndpointAuthMethod !== 'client_secret_basic' ||
      !client.redirectUris.some(uri => new URL(uri).origin === roomsOrigin) ||
      !safeEquals(sha256Hex(credentials.clientSecret), client.clientSecretHash)) return null

    return { clientId }
  } })
}
