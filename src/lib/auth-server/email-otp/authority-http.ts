import { z } from 'zod'

import type { InvitationAuthority } from './types'
import { isCanonicalRoomsInvitationUrl } from './invitation-url'

export const INVITATION_AUTHORITY_PATH = '/api/internal/auth/invitation-authority/resolve'

const responseSchema = z.object({
  active: z.literal(true), clientId: z.string().min(1).max(256), invitationId: z.string().min(1).max(256),
  invitationVersion: z.string().min(1).max(256), recipientReference: z.string().min(1).max(256),
  email: z.string().email().max(320), invitationUrl: z.string().url().max(2048),
  roomLabel: z.string().min(1).max(200), expiresAt: z.number().finite()
}).strict()

/** Fixed server-configured origin and path; no caller-provided URLs or positive cache. */
export function createHttpInvitationAuthority(input: {
  roomsOrigin: string; serviceToken: string; allowLocalDevelopment?: boolean; fetch?: typeof fetch; now?: () => number
}): InvitationAuthority {
  const origin = new URL(input.roomsOrigin)

  if (origin.origin !== input.roomsOrigin || origin.username || origin.password ||
    (origin.protocol !== 'https:' && !(input.allowLocalDevelopment && origin.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(origin.hostname))) ||
    !/^[A-Za-z0-9_-]{32,256}$/.test(input.serviceToken)) throw new Error('Invalid invitation authority configuration')

  const fetcher = input.fetch ?? fetch
  const endpoint = new URL(INVITATION_AUTHORITY_PATH, origin)

  return {
    async resolve(binding) {
      try {
        const response = await fetcher(endpoint, {
          method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(3000),
          headers: { Authorization: `Bearer ${input.serviceToken}`, 'Content-Type': 'application/json',
            Accept: 'application/json', 'X-Efeonce-Audience': origin.origin },
          body: JSON.stringify({ clientId: binding.clientId, invitationId: binding.invitationId,
            invitationVersion: binding.invitationVersion, recipientReference: binding.recipientReference })
        })

        if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('application/json') ||
          Number(response.headers.get('content-length') ?? 0) > 8192 || !response.body) return null
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let size = 0

        try {
          while (true) {
            const next = await reader.read()

            if (next.done) break
            size += next.value.byteLength

            if (size > 8192) { await reader.cancel();

return null }

            chunks.push(next.value)
          }
        } finally { reader.releaseLock() }

        const parsed = responseSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')))

        if (!parsed.success) return null
        const value = parsed.data

        if (value.clientId !== binding.clientId || value.invitationId !== binding.invitationId ||
          value.invitationVersion !== binding.invitationVersion || value.recipientReference !== binding.recipientReference ||
          value.expiresAt <= (input.now ?? Date.now)() || !isCanonicalRoomsInvitationUrl(value.invitationUrl, origin.origin)) return null

        return { clientId: value.clientId, invitationId: value.invitationId, invitationVersion: value.invitationVersion,
          recipientReference: value.recipientReference, email: value.email, invitationUrl: value.invitationUrl,
          roomLabel: value.roomLabel, expiresAt: value.expiresAt }
      } catch { return null }
    }
  }
}
