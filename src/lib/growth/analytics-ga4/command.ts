import 'server-only'

import { Ga4AdminClient, Ga4ApiError } from '@/lib/growth/ga4/api-client'
import { captureWithDomain } from '@/lib/observability/capture'
import { createOrAddSecretVersion, resolveSecretByRef } from '@/lib/secrets/secret-manager'

import { disconnectGa4Connection, getGa4Connection, setGa4ConnectionStatus, setGa4Property, upsertPendingGa4Connection } from './connection-store'
import { GA4_READ_SCOPE, type Ga4Connection, type Ga4ConnectionError, type Ga4PropertyOption } from './contracts'
import { isGa4Enabled } from './flags'
import { buildGa4ConsentUrl, exchangeGa4Code, refreshGa4AccessToken, resolveGa4OAuthConfig } from './oauth-client'
import { consumeGa4OAuthState, createGa4OAuthState } from './state-store'

type Result<T> = { ok: true; value: T } | { ok: false; errorCode: Ga4ConnectionError; organizationId?: string }

const secretIdFor = (organizationId: string): string => {
  const slug = organizationId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

  if (!slug) throw new Error('Invalid GA4 organization id')

  return `ga4-token-${slug}`
}

const isRevoked = (error: unknown): boolean => {
  if (error instanceof Ga4ApiError) return error.status === 401 || error.status === 403

  const message = error instanceof Error ? error.message.toLowerCase() : ''

  return message.includes('invalid_grant') || message.includes('invalid grant')
}

export const startGa4Connection = async (organizationId: string, userId: string): Promise<Result<string>> => {
  if (!isGa4Enabled()) return { ok: false, errorCode: 'disabled' }

  const config = await resolveGa4OAuthConfig()

  if (!config) return { ok: false, errorCode: 'not_configured' }

  const state = await createGa4OAuthState(organizationId, userId)

  return { ok: true, value: buildGa4ConsentUrl(config, state) }
}

export const completeGa4Connection = async (state: string, code: string, userId: string): Promise<Result<Ga4Connection>> => {
  if (!isGa4Enabled()) return { ok: false, errorCode: 'disabled' }

  const consumed = await consumeGa4OAuthState(state)

  if (!consumed || consumed.userId !== userId) return { ok: false, errorCode: 'state_invalid' }

  const config = await resolveGa4OAuthConfig()

  if (!config) return { ok: false, errorCode: 'not_configured', organizationId: consumed.organizationId }

  try {
    const tokens = await exchangeGa4Code(config, code)

    if (!tokens.refreshToken || (tokens.scopes.length > 0 && !tokens.scopes.includes(GA4_READ_SCOPE))) {
      return { ok: false, errorCode: 'oauth_failed', organizationId: consumed.organizationId }
    }

    const secret = await createOrAddSecretVersion(secretIdFor(consumed.organizationId), tokens.refreshToken)

    if (!secret.ok) return { ok: false, errorCode: 'secret_write_failed', organizationId: consumed.organizationId }

    const connection = await upsertPendingGa4Connection({
      organizationId: consumed.organizationId,
      scopes: tokens.scopes.length > 0 ? tokens.scopes : [GA4_READ_SCOPE],
      tokenSecretRef: secret.secretId,
      connectedByUserId: userId
    })

    return { ok: true, value: connection }
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'ga4_oauth_callback' }, extra: { organizationId: consumed.organizationId } })

    return { ok: false, errorCode: 'oauth_failed', organizationId: consumed.organizationId }
  }
}

export const listGa4PropertiesForOrg = async (organizationId: string): Promise<Result<Ga4PropertyOption[]>> => {
  if (!isGa4Enabled()) return { ok: false, errorCode: 'disabled' }

  const connection = await getGa4Connection(organizationId)

  if (!connection?.tokenSecretRef || connection.status === 'revoked') return { ok: false, errorCode: 'not_connected' }

  const config = await resolveGa4OAuthConfig()

  if (!config) return { ok: false, errorCode: 'not_configured' }

  const refreshToken = await resolveSecretByRef(connection.tokenSecretRef)

  if (!refreshToken) {
    await setGa4ConnectionStatus(organizationId, 'revoked', 'token_secret_missing')

    return { ok: false, errorCode: 'token_unhealthy' }
  }

  try {
    const client = new Ga4AdminClient({ getAccessToken: () => refreshGa4AccessToken(config, refreshToken) })
    const accounts = await client.listAccountSummaries()

    const properties = accounts.flatMap(account => account.properties.map(property => ({
      propertyId: property.propertyId,
      displayName: property.displayName,
      accountName: account.displayName
    })))

    return { ok: true, value: properties }
  } catch (error) {
    if (isRevoked(error)) {
      await setGa4ConnectionStatus(organizationId, 'revoked', 'invalid_grant')

      return { ok: false, errorCode: 'token_unhealthy' }
    }

    captureWithDomain(error, 'growth', { tags: { source: 'ga4_list_properties' }, extra: { organizationId } })

    return { ok: false, errorCode: 'query_failed' }
  }
}

export const selectGa4Property = async (organizationId: string, propertyId: string): Promise<Result<Ga4Connection>> => {
  const listed = await listGa4PropertiesForOrg(organizationId)

  if (!listed.ok) return listed

  const selected = listed.value.find(property => property.propertyId === propertyId)

  if (!selected) return { ok: false, errorCode: 'property_not_accessible' }

  const connection = await setGa4Property(organizationId, selected.propertyId, selected.displayName)

  return connection ? { ok: true, value: connection } : { ok: false, errorCode: 'not_connected' }
}

export const disconnectGa4Property = async (organizationId: string): Promise<Result<true>> => {
  if (!isGa4Enabled()) return { ok: false, errorCode: 'disabled' }

  const disconnected = await disconnectGa4Connection(organizationId)

  return disconnected ? { ok: true, value: true } : { ok: false, errorCode: 'not_connected' }
}
