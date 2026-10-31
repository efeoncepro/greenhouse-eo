/** TASK-2067. All ports are server-only. None of the delivery fields belong in HTTP responses/logs. */
export type InvitationBinding = {
  clientId: string
  invitationId: string
  invitationVersion: string
  recipientReference: string
}
export type AuthorizedInvitation = InvitationBinding & {
  email: string
  invitationUrl: string
  roomLabel: string
  expiresAt: number
}
export interface InvitationAuthority {
  /** Authenticated canonical lookup; null for revoked, stale, foreign or expired invitations. */
  resolve(binding: InvitationBinding): Promise<AuthorizedInvitation | null>
}
export type InvitationDelivery = {
  email: string
  invitationUrl: string
  roomLabel: string
  code: string
  expiresInMinutes: number
  deliveryId: string
}
export interface InvitationOtpMailer {
  /** Must use governed token_sensitive delivery, no durable payload/retry or raw error logging. */
  send(input: InvitationDelivery): Promise<{ status: 'accepted' | 'failed' }>
}
export const INVITATION_PROOF_TYPE = 'rooms-invitation-proof+jwt' as const
export type InvitationProofClaims = InvitationBinding & {
  iss: string
  aud: string
  iat: number
  exp: number
  jti: string
  nonce: string
  amr: ['email_otp']
}
export interface InvitationProofSigner {
  sign(claims: InvitationProofClaims, header: { alg: 'ES256'; typ: typeof INVITATION_PROOF_TYPE }): Promise<string>
}
export type ChallengeState = {
  binding: InvitationBinding
  challengeId: string
  requestIdHash: string
  requestHistory: Array<{ hash: string; expiresAt: number }>
  codeMac: string
  recipientHash: string
  createdAt: number
  expiresAt: number
  status: 'pending_delivery' | 'ready' | 'failed' | 'consumed'
}
export type BudgetState = { startedAt: number; count: number; expiresAt: number }
export interface OtpTransaction {
  getChallenge(key: string): Promise<ChallengeState | null>
  saveChallenge(key: string, value: ChallengeState): Promise<void>
  getBudget(key: string): Promise<BudgetState | null>
  saveBudget(key: string, value: BudgetState): Promise<void>
}
export interface InvitationOtpStore {
  /** Atomic transaction locking every named key in stable order, including missing records. */
  transaction<T>(keys: string[], work: (tx: OtpTransaction) => Promise<T>): Promise<T>
}
export type OtpError = 'invalid_request' | 'invalid_invitation' | 'invalid_code' | 'rate_limited' | 'delivery_failed' | 'unavailable'
export type OtpFailure = { ok: false; error: OtpError }
export type PrepareInput = InvitationBinding & { requestId: string; requesterKey: string }
export type VerifyInput = InvitationBinding & { challengeId: string; code: string; nonce: string; requesterKey: string }
export type PrepareResult = OtpFailure | {
  ok: true
  challengeId: string
  expiresAt: number
  deliveryStatus: 'pending' | 'accepted'
}
export type VerifyResult = OtpFailure | { ok: true; proof: string; expiresAt: number }
export interface InvitationOtpAudit {
  /** Do not include exception objects, request bodies, codes, URLs, email or proof. */
  record(event: { action: 'prepare' | 'verify'; outcome: string; clientId: string }): Promise<void>
}
