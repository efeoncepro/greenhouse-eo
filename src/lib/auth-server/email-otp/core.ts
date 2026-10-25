import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'

import type {
  AuthorizedInvitation, ChallengeState, InvitationBinding, InvitationOtpAudit, InvitationAuthority,
  InvitationOtpMailer, InvitationOtpStore, InvitationProofSigner, OtpFailure, OtpTransaction,
  PrepareInput, PrepareResult, VerifyInput, VerifyResult
} from './types'
import { INVITATION_PROOF_TYPE } from './types'
import { isCanonicalRoomsInvitationUrl } from './invitation-url'

const HOUR = 3_600_000
const TTL = 600_000
const fail = (error: OtpFailure['error']): OtpFailure => ({ ok: false, error })

const bounded = (value: unknown, min = 1, max = 256): value is string =>
  typeof value === 'string' && value.length >= min && value.length <= max && !/[\x00-\x1f\x7f]/.test(value)

const validBinding = (b: InvitationBinding) =>
  bounded(b.clientId) && bounded(b.invitationId) && bounded(b.invitationVersion) && bounded(b.recipientReference)

const sameBinding = (a: InvitationBinding, b: InvitationBinding) =>
  a.clientId === b.clientId && a.invitationId === b.invitationId && a.invitationVersion === b.invitationVersion &&
  a.recipientReference === b.recipientReference

const bindingOnly = (b: InvitationBinding): InvitationBinding => ({ clientId: b.clientId, invitationId: b.invitationId,
  invitationVersion: b.invitationVersion, recipientReference: b.recipientReference })

export function createInvitationEmailOtp(deps: {
  store: InvitationOtpStore
  authority: InvitationAuthority
  mailer: InvitationOtpMailer
  signer: InvitationProofSigner
  audit: InvitationOtpAudit
  hmacSecret: string
  issuer: string
  roomsOrigin: string
  allowLocalDevelopment?: boolean
  now?: () => number
}) {
  if (!deps.hmacSecret || Buffer.byteLength(deps.hmacSecret) < 32) throw new Error('OTP HMAC secret must contain at least 32 bytes')
  const rooms = new URL(deps.roomsOrigin)
  const issuer = new URL(deps.issuer)

  if (rooms.origin !== deps.roomsOrigin || rooms.username || rooms.password ||
    (rooms.protocol !== 'https:' && !(deps.allowLocalDevelopment && rooms.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(rooms.hostname)))) {
    throw new Error('Invalid Rooms origin')
  }

  if (issuer.protocol !== 'https:' && !(deps.allowLocalDevelopment && issuer.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(issuer.hostname))) {
    throw new Error('Invalid issuer')
  }

  const now = deps.now ?? Date.now
  const mac = (...values: unknown[]) => createHmac('sha256', deps.hmacSecret).update(JSON.stringify(values)).digest('hex')
  const chainKey = (b: InvitationBinding) => mac('invitation', b.clientId, b.invitationId)
  const codeMac = (b: InvitationBinding, id: string, code: string) => mac('code', bindingOnly(b), id, code)

  const validAuthority = (a: AuthorizedInvitation | null, b: InvitationBinding): a is AuthorizedInvitation => {
    if (!a || !sameBinding(a, b) || !Number.isFinite(a.expiresAt) || a.expiresAt <= now() ||
      !bounded(a.email, 3, 320) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email) || !bounded(a.roomLabel, 1, 200)) return false

    return isCanonicalRoomsInvitationUrl(a.invitationUrl, rooms.origin)
  }

  const recipientHash = (a: AuthorizedInvitation) => mac('recipient', a.email.trim().toLowerCase())

  const receipt = (r: ChallengeState): PrepareResult => r.status === 'failed' || r.status === 'consumed' || r.expiresAt <= now()
    ? fail('invalid_code')
    : { ok: true, challengeId: r.challengeId, expiresAt: r.expiresAt, deliveryStatus: r.status === 'ready' ? 'accepted' : 'pending' }

  const budget = async (tx: OtpTransaction, key: string, limit: number, timestamp: number) => {
    const prior = await tx.getBudget(key)
    const next = prior && prior.expiresAt > timestamp ? { ...prior } : { startedAt: timestamp, expiresAt: timestamp + HOUR, count: 0 }

    if (next.count >= limit) return false
    next.count += 1
    await tx.saveBudget(key, next)

    return true
  }

  // Record only whitelisted fields. Audit failures deny the result; no exception is exposed to callers.
  const audited = async <T extends PrepareResult | VerifyResult>(action: 'prepare' | 'verify', clientId: string, result: T): Promise<T | OtpFailure> => {
    try { await deps.audit.record({ action, clientId, outcome: result.ok ? 'accepted' : result.error }) }
    catch { return fail('unavailable') }

    return result
  }

  async function prepare(input: PrepareInput): Promise<PrepareResult> {
    if (!validBinding(input) || !bounded(input.requestId, 16) || !bounded(input.requesterKey, 16)) return fail('invalid_request')

    try {
      const authority = await deps.authority.resolve(bindingOnly(input))

      if (!validAuthority(authority, input)) return fail('invalid_invitation')
      const key = chainKey(input)
      const emailHash = recipientHash(authority)
      const requestHash = mac('request', input.requestId)

      const buckets: Array<[string, number]> = [
        [mac('send', key), 3], [mac('send-email', emailHash), 10],
        [mac('send-requester', input.clientId, input.requesterKey), 50], [mac('send-rp', input.clientId), 500]
      ]

      const generated = String(randomInt(0, 1_000_000)).padStart(6, '0')

      const candidate = await deps.store.transaction([key, ...buckets.map(([k]) => k)], async tx => {
        const prior = await tx.getChallenge(key)
        const timestamp = now()

        if (prior?.requestIdHash === requestHash) {
          return { result: sameBinding(prior.binding, input) && prior.recipientHash === emailHash ? receipt(prior) : fail('invalid_invitation') }
        }

        if (prior?.requestHistory.some(request => request.hash === requestHash && request.expiresAt > timestamp)) return { result: fail('invalid_code') }
        if (prior && timestamp - prior.createdAt < 60_000) return { result: fail('rate_limited') }

        for (const [bucketKey, limit] of buckets) {
          if (!await budget(tx, bucketKey, limit, timestamp)) return { result: fail('rate_limited') }
        }

        const challengeId = randomUUID()

        const row: ChallengeState = { binding: bindingOnly(input), challengeId, requestIdHash: requestHash,
          requestHistory: [...(prior?.requestHistory ?? []).filter(request => request.expiresAt > timestamp),
            { hash: requestHash, expiresAt: timestamp + 24 * HOUR }],
          codeMac: codeMac(input, challengeId, generated), recipientHash: emailHash, createdAt: timestamp,
          expiresAt: Math.min(timestamp + TTL, authority.expiresAt), status: 'pending_delivery' }

        await tx.saveChallenge(key, row)

        return { row }
      })

      if ('result' in candidate) return await audited('prepare', input.clientId, candidate.result!)
      const row = candidate.row
      let accepted = false

      try {
        // Delivery is outside the DB transaction. Unknown outcomes are never retried automatically.
        accepted = (await deps.mailer.send({ email: authority.email, invitationUrl: authority.invitationUrl,
          roomLabel: authority.roomLabel, code: generated, expiresInMinutes: Math.max(1, Math.ceil((row.expiresAt - now()) / 60_000)),
          deliveryId: row.challengeId })).status === 'accepted'
      } catch { accepted = false }

      const result = await deps.store.transaction([key], async tx => {
        const current = await tx.getChallenge(key)

        if (!current || current.challengeId !== row.challengeId || current.status !== 'pending_delivery') return fail('invalid_code')
        current.status = accepted ? 'ready' : 'failed'
        await tx.saveChallenge(key, current)

        return accepted ? receipt(current) : fail('delivery_failed')
      })

      return await audited('prepare', input.clientId, result)
    } catch { return fail('unavailable') }
  }

  async function verify(input: VerifyInput): Promise<VerifyResult> {
    if (!validBinding(input) || !bounded(input.challengeId, 16) || !bounded(input.requesterKey, 16) ||
      !bounded(input.nonce, 32) || !/^[0-9]{6}$/.test(input.code)) return fail('invalid_request')

    try {
      const authority = await deps.authority.resolve(bindingOnly(input))

      if (!validAuthority(authority, input)) return fail('invalid_invitation')
      const key = chainKey(input)

      const buckets: Array<[string, number]> = [[mac('verify', key), 5],
        [mac('verify-requester', input.clientId, input.requesterKey), 50], [mac('verify-rp', input.clientId), 1000]]

      const result = await deps.store.transaction([key, ...buckets.map(([k]) => k)], async tx => {
        const timestamp = now()

        for (const [bucketKey, limit] of buckets) {
          if (!await budget(tx, bucketKey, limit, timestamp)) return fail('rate_limited')
        }

        const row = await tx.getChallenge(key)

        if (!row || row.status !== 'ready' || row.challengeId !== input.challengeId || row.expiresAt <= timestamp ||
          !sameBinding(row.binding, input) || row.recipientHash !== recipientHash(authority)) return fail('invalid_code')
        const expected = Buffer.from(row.codeMac, 'hex')
        const actual = Buffer.from(codeMac(input, row.challengeId, input.code), 'hex')

        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return fail('invalid_code')
        row.status = 'consumed'
        await tx.saveChallenge(key, row)

        return { ok: true as const }
      })

      if (!result.ok) return await audited('verify', input.clientId, result)
      const fresh = await deps.authority.resolve(bindingOnly(input))

      if (!validAuthority(fresh, input) || recipientHash(fresh) !== recipientHash(authority)) return fail('invalid_invitation')
      const issued = Math.floor(now() / 1000)
      const expires = Math.min(issued + 120, Math.floor(fresh.expiresAt / 1000))

      if (expires <= issued) return fail('invalid_invitation')

      const proof = await deps.signer.sign({ ...bindingOnly(input), iss: deps.issuer, aud: input.clientId, iat: issued,
        exp: expires, jti: randomUUID(), nonce: input.nonce, amr: ['email_otp'] }, { alg: 'ES256', typ: INVITATION_PROOF_TYPE })

      return await audited('verify', input.clientId, { ok: true, proof, expiresAt: expires * 1000 })
    } catch { return fail('unavailable') }
  }

  return { prepare, verify }
}

export type InvitationEmailOtp = ReturnType<typeof createInvitationEmailOtp>
