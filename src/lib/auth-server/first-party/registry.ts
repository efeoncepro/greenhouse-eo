import { OAuthProtocolError } from '../oauth/errors'
import { generateOpaqueToken, sha256Hex } from '../oauth/primitives'
import { FIRST_PARTY_CLIENT_PREFIX, FIRST_PARTY_PRODUCTS, type FirstPartyClient, type FirstPartyProduct, type FirstPartyStore } from './types'

export type RegisterFirstPartyClientInput = {
  clientId: string
  product: FirstPartyProduct
  redirectUris: readonly string[]
  tokenEndpointAuthMethod?: 'client_secret_basic' | 'client_secret_post'
  allowLocalDevelopment?: boolean
  sessionMaxAgeSeconds?: number
  actor: string
}

export const validateFirstPartyRedirect = (value: string, allowLocal: boolean): boolean => {
  try {
    const url = new URL(value)

    return !url.username && !url.password && !url.hash && !url.search && !value.includes('*') &&
      (url.protocol === 'https:' || (allowLocal && url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)))
  } catch { return false }
}

export const registerFirstPartyClient = async (input: RegisterFirstPartyClientInput, deps: {
  store: FirstPartyStore; now?: () => Date
}): Promise<{ client: FirstPartyClient; clientSecret: string | null; created: boolean }> => {
  if (!new RegExp(`^${FIRST_PARTY_CLIENT_PREFIX}[a-z0-9][a-z0-9._-]{1,100}$`).test(input.clientId) ||
    !Object.hasOwn(FIRST_PARTY_PRODUCTS, input.product) || !input.actor.trim()) {
    throw new OAuthProtocolError('invalid_client_metadata', { reason: 'first_party_registration_invalid' })
  }

  const redirects = [...new Set(input.redirectUris)]
  const allowLocalDevelopment = input.allowLocalDevelopment === true
  const sessionMaxAgeSeconds = input.sessionMaxAgeSeconds ?? 3600
  const method = input.tokenEndpointAuthMethod ?? 'client_secret_basic'

  if (redirects.length === 0 || redirects.length > 10 || redirects.some(uri => !validateFirstPartyRedirect(uri, allowLocalDevelopment)) ||
    !['client_secret_basic', 'client_secret_post'].includes(method) ||
    !Number.isInteger(sessionMaxAgeSeconds) || sessionMaxAgeSeconds < 60 || sessionMaxAgeSeconds > 86400) {
    throw new OAuthProtocolError('invalid_client_metadata', { reason: 'first_party_policy_invalid' })
  }

  const secret = generateOpaqueToken('efps', 32)

  const client: FirstPartyClient = {
    clientId: input.clientId, product: input.product, redirectUris: redirects,
    tokenEndpointAuthMethod: method, clientSecretHash: sha256Hex(secret), status: 'active',
    allowLocalDevelopment, sessionMaxAgeSeconds, createdBy: input.actor, createdAt: (deps.now ?? (() => new Date()))()
  }

  const created = await deps.store.insertClient(client)

  if (created) return { client, clientSecret: secret, created: true }
  const existing = await deps.store.getClient(input.clientId)

  if (!existing || existing.product !== client.product || existing.tokenEndpointAuthMethod !== method ||
    existing.allowLocalDevelopment !== allowLocalDevelopment || existing.sessionMaxAgeSeconds !== sessionMaxAgeSeconds ||
    JSON.stringify([...existing.redirectUris].sort()) !== JSON.stringify([...redirects].sort())) {
    throw new OAuthProtocolError('invalid_client_metadata', { reason: 'first_party_registration_conflict' })
  }

  return { client: existing, clientSecret: null, created: false }
}
