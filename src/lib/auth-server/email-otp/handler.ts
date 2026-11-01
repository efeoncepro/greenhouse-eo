import type { OAuthHttpRequest, OAuthHttpResponse } from '../oauth/http'
import type { InvitationEmailOtp } from './core'

export const EMAIL_OTP_PREPARE_PATH = '/auth/invitations/email-otp/prepare'
export const EMAIL_OTP_VERIFY_PATH = '/auth/invitations/email-otp/verify'
export interface InvitationOtpClientAuthenticator {
  /** Validates confidential client credentials, active registration and explicit invitation OTP permission. */
  authenticate(request: OAuthHttpRequest): Promise<{ clientId: string } | null>
}

const response = (status: number, body: unknown): OAuthHttpResponse => ({ status, body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' } })

/** No browser cookies or cross-host session writes. Hook into the issuer only after real ports are installed. */
export function createInvitationOtpHandler(core: InvitationEmailOtp, authenticator: InvitationOtpClientAuthenticator) {
  return async (request: OAuthHttpRequest): Promise<OAuthHttpResponse | null> => {
    if (![EMAIL_OTP_PREPARE_PATH, EMAIL_OTP_VERIFY_PATH].includes(request.url.pathname)) return null
    if (request.method !== 'POST') return response(405, { error: 'invalid_request' })
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') ||
      Buffer.byteLength(request.body) > 4096 || request.url.search) return response(400, { error: 'invalid_request' })

    try {
      const client = await authenticator.authenticate(request)

      if (!client) return response(401, { error: 'invalid_client' })
      const body: unknown = JSON.parse(request.body)

      if (!body || typeof body !== 'object' || Array.isArray(body)) return response(400, { error: 'invalid_request' })
      const values = body as Record<string, unknown>
      const isPrepare = request.url.pathname === EMAIL_OTP_PREPARE_PATH

      const allowed = ['invitationId', 'invitationVersion', 'recipientReference', 'requesterKey',
        ...(isPrepare ? ['requestId'] : ['challengeId', 'code', 'nonce'])]

      if (Object.keys(values).some(key => !allowed.includes(key)) || allowed.some(key => typeof values[key] !== 'string')) {
        return response(400, { error: 'invalid_request' })
      }

      const common = { clientId: client.clientId, invitationId: values.invitationId as string,
        invitationVersion: values.invitationVersion as string, recipientReference: values.recipientReference as string,
        requesterKey: values.requesterKey as string }

      const result = isPrepare
        ? await core.prepare({ ...common, requestId: values.requestId as string })
        : await core.verify({ ...common, challengeId: values.challengeId as string, code: values.code as string, nonce: values.nonce as string })

      return response(result.ok ? 200 : result.error === 'rate_limited' ? 429 :
        result.error === 'unavailable' || result.error === 'delivery_failed' ? 503 : 400, result)
    } catch { return response(503, { error: 'unavailable' }) }
  }
}
