import { z } from 'zod'

import { OAuthProtocolError } from '../oauth/errors'
import type { RegisterFirstPartyClientInput } from './registry'

const registrationSchema = z.object({
  clientId: z.string().min(1).max(160),
  product: z.enum(['rooms', 'synthetic-rp']),
  redirectUris: z.array(z.string().min(1).max(2048)).min(1).max(10),
  tokenEndpointAuthMethod: z.enum(['client_secret_basic', 'client_secret_post']).optional(),
  allowLocalDevelopment: z.boolean().optional(),
  sessionMaxAgeSeconds: z.number().int().min(60).max(86400).optional()
}).strict()

/** Actor comes from the authenticated operator, never from request JSON. */
export const parseFirstPartyRegistration = (body: unknown, actor: string): RegisterFirstPartyClientInput => {
  const parsed = registrationSchema.safeParse(body)

  if (!parsed.success || !actor.trim()) {
    throw new OAuthProtocolError('invalid_client_metadata', { reason: 'first_party_registration_invalid' })
  }

  return { ...parsed.data, actor }
}
