/** First-party identity is a separate authority class, never a synthetic MCP consent. */
import { buildRequestAuditContext, enforceOAuthRateLimit, recordOAuthAudit } from '../oauth/audit'
import { parseClientCredentials } from '../oauth/clients'
import { OAuthProtocolError, isOAuthProtocolError } from '../oauth/errors'
import { jsonResponse, redirectResponse, type OAuthHttpRequest, type OAuthHttpResponse } from '../oauth/http'
import { generateOpaqueToken, isPkceToken, safeEquals, sha256Hex, verifyPkceS256 } from '../oauth/primitives'
import type { OAuthStorePort } from '../oauth/store/port'
import { parseTokenForm } from '../oauth/token'
import type { AccessTokenSigner } from '../oauth/tokens'
import { FIRST_PARTY_ACCESS_PREFIX, FIRST_PARTY_CLIENT_PREFIX, FIRST_PARTY_CODE_PREFIX, FIRST_PARTY_PRODUCTS,
  FIRST_PARTY_TOKEN_TTL_SECONDS, type FirstPartyClient, type FirstPartyConfig, type FirstPartyIdentity,
  type FirstPartyIdentityPort, type FirstPartyStore } from './types'

export type FirstPartyDeps = {
  config: FirstPartyConfig
  store: FirstPartyStore
  identity: FirstPartyIdentityPort
  signer: AccessTokenSigner
  auditStore: OAuthStorePort
  now?: () => Date
}
export type FirstPartyLoginContext = { product: 'rooms' | 'synthetic-rp'; displayName: string; returnUrl: string }

function fail(code: ConstructorParameters<typeof OAuthProtocolError>[0], reason: string): never {
  throw new OAuthProtocolError(code, { reason })
}

const param = (params: URLSearchParams, key: string, required = false): string | null => {
  const values = params.getAll(key)

  if (values.length > 1 || (required && (!values[0] || values[0].length > 2048))) fail('invalid_request', `first_party_${key}`)

  return values[0] ?? null
}

const assertClient = (client: FirstPartyClient | null, deps: FirstPartyDeps): FirstPartyClient => {
  if (!deps.config.enabled || !client || client.status !== 'active') return fail('unauthorized_client', 'first_party_disabled')

  return client
}

const parseAuthorization = (url: URL, client: FirstPartyClient) => {
  const redirectUri = param(url.searchParams, 'redirect_uri', true)!

  if (!client.redirectUris.includes(redirectUri)) fail('invalid_redirect_uri', 'first_party_redirect')
  if (param(url.searchParams, 'response_type') !== 'code') fail('unsupported_response_type', 'first_party_response_type')
  if (param(url.searchParams, 'scope') !== 'openid') fail('invalid_scope', 'first_party_scope')
  if (param(url.searchParams, 'resource') !== null || param(url.searchParams, 'audience') !== null) fail('invalid_target', 'first_party_resource')
  const state = param(url.searchParams, 'state', true)!
  const nonce = param(url.searchParams, 'nonce', true)!
  const challenge = param(url.searchParams, 'code_challenge', true)!

  if (!isPkceToken(challenge) || challenge.length !== 43 || param(url.searchParams, 'code_challenge_method') !== 'S256') {
    fail('invalid_request', 'first_party_pkce')
  }

  const prompt = param(url.searchParams, 'prompt')

  if (prompt !== null && !['none', 'login'].includes(prompt)) fail('invalid_request', 'first_party_prompt')
  const rawMaxAge = param(url.searchParams, 'max_age')

  if (rawMaxAge !== null && !/^\d{1,5}$/.test(rawMaxAge)) fail('invalid_request', 'first_party_max_age')

  return { redirectUri, state, nonce, challenge, prompt,
    maxAge: rawMaxAge === null ? client.sessionMaxAgeSeconds : Math.min(Number(rawMaxAge), client.sessionMaxAgeSeconds) }
}

const currentIdentity = (identity: FirstPartyIdentity | null, deps: FirstPartyDeps, client: FirstPartyClient, now: Date) =>
  identity && identity.environmentId === deps.config.environmentId && identity.expiresAt > now &&
  identity.authTime.getTime() <= now.getTime() + 60000 &&
  now.getTime() - identity.authTime.getTime() <= client.sessionMaxAgeSeconds * 1000 ? identity : null

/** Re-derive presentation from a fully validated issuer-local authorization continuation. */
export const resolveFirstPartyLoginContext = async (returnTo: string | null, deps: FirstPartyDeps): Promise<FirstPartyLoginContext | null> => {
  if (!returnTo || !deps.config.enabled) return null

  try {
    const url = new URL(returnTo, deps.config.issuer)

    if (url.origin !== new URL(deps.config.issuer).origin || url.pathname !== '/oauth/authorize' || url.hash) return null
    const client = assertClient(await deps.store.getClient(param(url.searchParams, 'client_id', true)!), deps)
    const request = await resolveAuthorization(url, client, deps, (deps.now ?? (() => new Date()))())

    return { product: client.product, displayName: FIRST_PARTY_PRODUCTS[client.product].displayName, returnUrl: new URL(request.args.redirectUri).origin }
  } catch { return null }
}

const resolveAuthorization = async (url: URL, client: FirstPartyClient, deps: FirstPartyDeps, now: Date) => {
  const raw = param(url.searchParams, 'first_party_request')

  if (!raw) return { args: parseAuthorization(url, client), transaction: null, hash: null }
  if ([...url.searchParams.keys()].some(key => !['client_id', 'first_party_request'].includes(key))) fail('invalid_request', 'first_party_transaction_parameters')
  const hash = sha256Hex(raw)
  const transaction = await deps.store.getLoginTransaction(hash)

  if (!transaction || transaction.clientId !== client.clientId || transaction.consumedAt || transaction.expiresAt <= now) fail('invalid_request', 'first_party_transaction_expired')

  return { args: parseAuthorization(new URL(transaction.authorizationUrl), client), transaction, hash }
}

const authorize = async (request: OAuthHttpRequest, client: FirstPartyClient, deps: FirstPartyDeps, now: Date) => {
  if (request.method !== 'GET') return jsonResponse(405, { error: 'invalid_request' }, { Allow: 'GET' })
  const resolved = await resolveAuthorization(request.url, client, deps, now)
  const { args, transaction } = resolved
  const rawIdentity = await deps.identity.resolveRequest(request, now)
  const identity = currentIdentity(rawIdentity, deps, client, now)
  const age = identity ? (now.getTime() - identity.authTime.getTime()) / 1000 : Infinity

  const freshEnough = transaction
    ? (!transaction.freshAfter || (identity && identity.authTime >= transaction.freshAfter && identity.sessionHash !== transaction.previousSessionHash)) &&
      (args.maxAge === 0 ? transaction.freshAfter !== null : args.maxAge !== 0 && age <= args.maxAge)
    : args.maxAge !== 0 && age <= args.maxAge

  if (!identity || !freshEnough || (!transaction && args.prompt === 'login')) {
    if (args.prompt === 'none') {
      const target = new URL(args.redirectUri)

      target.searchParams.set('error', 'login_required')
      target.searchParams.set('state', args.state)
      target.searchParams.set('iss', deps.config.issuer)

      return redirectResponse(target.toString())
    }

    let continuation = request.url.pathname + request.url.search

    if (!transaction) {
      const raw = generateOpaqueToken('efpt', 24)

      await deps.store.insertLoginTransaction({ transactionHash: sha256Hex(raw), clientId: client.clientId,
        authorizationUrl: request.url.toString(), previousSessionHash: rawIdentity?.sessionHash ?? null, freshAfter: args.prompt === 'login' || args.maxAge === 0 || age > args.maxAge ? new Date(Math.floor(now.getTime() / 1000) * 1000) : null,
        expiresAt: new Date(now.getTime() + 600000), consumedAt: null })
      continuation = '/oauth/authorize?' + new URLSearchParams({ client_id: client.clientId, first_party_request: raw })
    }

    return redirectResponse('/login?' + new URLSearchParams({ return_to: continuation }))
  }

  if (resolved.hash && !(await deps.store.consumeLoginTransaction(resolved.hash, now))) fail('invalid_request', 'first_party_transaction_replay')
  const code = generateOpaqueToken(FIRST_PARTY_CODE_PREFIX, 32)

  await deps.store.insertCode({ codeHash: sha256Hex(code), clientId: client.clientId, sessionHash: identity.sessionHash,
    subject: identity.subject, redirectUri: args.redirectUri, codeChallenge: args.challenge, nonce: args.nonce,
    authTime: identity.authTime, createdAt: now, consumedAt: null, invalidatedAt: null,
    expiresAt: new Date(Math.min(now.getTime() + 300000, identity.expiresAt.getTime())) })
  const target = new URL(args.redirectUri)

  target.searchParams.set('code', code)
  target.searchParams.set('state', args.state)
  target.searchParams.set('iss', deps.config.issuer)

  return redirectResponse(target.toString())
}

const authenticate = (request: OAuthHttpRequest, form: Map<string, string>, client: FirstPartyClient) => {
  const credentials = parseClientCredentials({ authorization: request.headers.get('authorization'),
    bodyClientId: form.get('client_id') ?? null, bodyClientSecret: form.get('client_secret') ?? null })

  const method = credentials.method === 'basic' ? 'client_secret_basic' : 'client_secret_post'

  if (credentials.clientId !== client.clientId || !credentials.clientSecret || method !== client.tokenEndpointAuthMethod ||
    !safeEquals(sha256Hex(credentials.clientSecret), client.clientSecretHash) ||
    (form.has('client_id') && form.get('client_id') !== client.clientId)) fail('invalid_client', 'first_party_client_auth')
}

const token = async (form: Map<string, string>, client: FirstPartyClient, deps: FirstPartyDeps, now: Date) => {
  if (form.get('grant_type') !== 'authorization_code') fail('unsupported_grant_type', 'first_party_code_only')
  if (form.has('resource') || form.has('audience') || (form.has('scope') && form.get('scope') !== 'openid')) fail('invalid_scope', 'first_party_token_scope')
  const rawCode = form.get('code') ?? ''
  const verifier = form.get('code_verifier') ?? ''

  if (!rawCode.startsWith(FIRST_PARTY_CODE_PREFIX + '_') || !isPkceToken(verifier)) fail('invalid_grant', 'first_party_code')
  const consumed = await deps.store.consumeCode(sha256Hex(rawCode), client.clientId, now)

  if (!consumed || consumed.code.clientId !== client.clientId) fail('invalid_grant', 'first_party_code_client')

  if (consumed.status === 'reused') {
    await deps.store.revokeCodeHandles(consumed.code.codeHash, now)
    fail('invalid_grant', 'first_party_code_reuse')
  }

  const code = consumed.code

  if (consumed.status !== 'consumed' || code.redirectUri !== form.get('redirect_uri') ||
    !client.redirectUris.includes(code.redirectUri) || !verifyPkceS256(verifier, code.codeChallenge)) fail('invalid_grant', 'first_party_code_binding')
  const identity = currentIdentity(await deps.identity.resolveSession(code.sessionHash, now), deps, client, now)

  if (!identity || identity.subject !== code.subject || identity.authTime.getTime() !== code.authTime.getTime()) fail('invalid_grant', 'first_party_identity_revoked')
  const iat = Math.floor(now.getTime() / 1000)

  const exp = Math.min(iat + FIRST_PARTY_TOKEN_TTL_SECONDS, Math.floor(identity.expiresAt.getTime() / 1000),
    Math.floor(identity.authTime.getTime() / 1000) + client.sessionMaxAgeSeconds)

  if (exp <= iat) fail('invalid_grant', 'first_party_session_expired')

  const idToken = await deps.signer({ iss: deps.config.issuer, sub: code.subject, aud: client.clientId,
    iat, exp, auth_time: Math.floor(code.authTime.getTime() / 1000), nonce: code.nonce })

  const accessToken = generateOpaqueToken(FIRST_PARTY_ACCESS_PREFIX, 32)

  const inserted = await deps.store.insertAccessHandle({ tokenHash: sha256Hex(accessToken), codeHash: code.codeHash,
    clientId: client.clientId, sessionHash: identity.sessionHash, subject: identity.subject,
    authTime: identity.authTime, createdAt: now, expiresAt: new Date(exp * 1000), revokedAt: null })

  if (!inserted) fail('invalid_grant', 'first_party_code_reuse')

  return jsonResponse(200, { id_token: idToken, access_token: accessToken, token_type: 'Bearer', expires_in: exp - iat, scope: 'openid' })
}

const inspect = async (form: Map<string, string>, client: FirstPartyClient, deps: FirstPartyDeps, now: Date, revoke: boolean) => {
  const raw = form.get('token') ?? ''

  if (revoke) {
    await deps.store.revokeAccessHandle(sha256Hex(raw), client.clientId, now)

    return jsonResponse(200, {})
  }

  const handle = raw.startsWith(FIRST_PARTY_ACCESS_PREFIX + '_') ? await deps.store.getAccessHandle(sha256Hex(raw)) : null

  if (!handle || handle.clientId !== client.clientId || handle.revokedAt || handle.expiresAt <= now) return jsonResponse(200, { active: false })
  const identity = currentIdentity(await deps.identity.resolveSession(handle.sessionHash, now), deps, client, now)

  if (!identity || identity.subject !== handle.subject || identity.authTime.getTime() !== handle.authTime.getTime()) return jsonResponse(200, { active: false })

  return jsonResponse(200, { active: true, iss: deps.config.issuer, sub: handle.subject, client_id: client.clientId,
    aud: client.clientId, scope: 'openid', token_type: 'Bearer', iat: Math.floor(handle.createdAt.getTime() / 1000),
    exp: Math.floor(handle.expiresAt.getTime() / 1000), auth_time: Math.floor(handle.authTime.getTime() / 1000) })
}

/** null means an ordinary MCP request; registered/reserved RP requests never fall through. */
export const createFirstPartyHandler = (deps: FirstPartyDeps) => async (request: OAuthHttpRequest): Promise<OAuthHttpResponse | null> => {
  const path = request.url.pathname

  if (!['/oauth/authorize', '/oauth/token', '/oauth/introspect', '/oauth/revoke', '/oauth/consent'].includes(path)) return null
  const preview = new URLSearchParams(request.body)
  let clientId = request.url.searchParams.get('client_id') ?? preview.get('client_id') ?? ''

  try {
    if (path === '/oauth/authorize') {
      clientId = param(request.url.searchParams, 'client_id', true)!
    } else {
    const basic = parseClientCredentials({ authorization: request.headers.get('authorization'), bodyClientId: preview.get('client_id'), bodyClientSecret: preview.get('client_secret') })

    clientId = basic.clientId ?? clientId
    }
  } catch {
    if (clientId.startsWith(FIRST_PARTY_CLIENT_PREFIX) || [...preview.values()].some(v => v.startsWith(FIRST_PARTY_CODE_PREFIX + '_'))) return jsonResponse(400, { error: 'invalid_request' })

    return null
  }

  const ownArtifact = [preview.get('code'), preview.get('token'), preview.get('refresh_token')].some(v => v?.startsWith(FIRST_PARTY_CODE_PREFIX + '_') || v?.startsWith(FIRST_PARTY_ACCESS_PREFIX + '_'))

  if (!clientId.startsWith(FIRST_PARTY_CLIENT_PREFIX) && !ownArtifact) return null
  // OFF deploys precede the additive migration: never query a new table on the MCP lane or while OFF.
  if (!deps.config.enabled) return jsonResponse(400, { error: 'unauthorized_client' })
  const now = (deps.now ?? (() => new Date()))()
  const audit = buildRequestAuditContext(request.headers)
  const eventType = path === '/oauth/authorize' ? 'authorize' : path === '/oauth/introspect' ? 'introspect' : path === '/oauth/revoke' ? 'revoke' : 'token'

  try {
    await enforceOAuthRateLimit(deps.auditStore, audit, { rule: { eventTypes: [eventType], windowSeconds: 60, perIp: 60, perClient: 120 }, clientId, now })
    const client = assertClient(await deps.store.getClient(clientId), deps)
    let response: OAuthHttpResponse

    if (path === '/oauth/authorize') {
      param(request.url.searchParams, 'client_id', true)
      response = await authorize(request, client, deps, now)
    } else {
      const form = parseTokenForm(request)

      authenticate(request, form, client)
      if (path === '/oauth/consent') fail('invalid_request', 'first_party_no_consent')
      response = path === '/oauth/token' ? await token(form, client, deps, now) : await inspect(form, client, deps, now, path === '/oauth/revoke')
    }

    await recordOAuthAudit(deps.auditStore, audit, { eventType, outcome: 'success', clientId, grantId: null, errorCode: null,
      details: { flowClass: 'first_party_sign_in', product: client.product, status: response.status } })

    return response
  } catch (error) {
    if (!isOAuthProtocolError(error)) throw error
    if (error.code !== 'slow_down') await recordOAuthAudit(deps.auditStore, audit, { eventType, outcome: 'rejected', clientId,
      grantId: null, errorCode: error.code, details: { flowClass: 'first_party_sign_in', reason: error.reason } })

    return jsonResponse(error.statusCode, error.toBody(), error.code === 'invalid_client' ? { 'WWW-Authenticate': 'Basic realm="oauth"' } : {})
  }
}
