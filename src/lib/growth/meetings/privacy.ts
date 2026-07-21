import 'server-only'

import { createHash, createHmac } from 'node:crypto'

import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

const SECRET_ENV = 'GROWTH_MEETING_HMAC_SECRET'
const SECRET_REF = 'growth-meeting-hmac-secret'

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`
}

export interface MeetingPrivacyHasher {
  keyVersion: string
  hmac(domain: 'idempotency' | 'email' | 'ip' | 'booking' | 'receipt', value: string): string
  fingerprint(value: unknown): string
}

export const createMeetingPrivacyHasher = (secret: string, keyVersion = 'v1'): MeetingPrivacyHasher => {
  if (secret.length < 32) throw new Error('meeting_hmac_secret_invalid')

  return {
    keyVersion,
    hmac: (domain, value) => createHmac('sha256', secret).update(`meeting:${keyVersion}:${domain}:${value}`).digest('hex'),
    fingerprint: value => createHash('sha256').update(stableStringify(value)).digest('hex'),
  }
}

export const resolveMeetingPrivacyHasher = async (
  env: NodeJS.ProcessEnv = process.env,
): Promise<MeetingPrivacyHasher> => {
  const secret = env[SECRET_ENV]?.trim() || await resolveSecretByRef(SECRET_REF)

  if (!secret) throw new Error('meeting_hmac_secret_unavailable')

  return createMeetingPrivacyHasher(secret, env.GROWTH_MEETING_HMAC_KEY_VERSION?.trim() || 'v1')
}
