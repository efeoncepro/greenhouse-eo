/** Local QA only. Real first-party protocol, PostgreSQL authority and ES256; no cloud, email or production entrypoint. */
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'

import { exportJWK, generateKeyPair, jwtVerify, SignJWT } from 'jose'

import { query, closeGreenhousePostgres, withTransaction } from '../../src/lib/db'
import { createInvitationOtpRuntime } from '../../src/lib/auth-server/email-otp/runtime'
import { createPostgresInvitationOtpStore } from '../../src/lib/auth-server/email-otp/postgres-store'
import type { InvitationDelivery } from '../../src/lib/auth-server/email-otp/types'
import { INVITATION_PROOF_TYPE } from '../../src/lib/auth-server/email-otp/types'
import { INVITATION_AUTHORITY_PATH } from '../../src/lib/auth-server/email-otp/authority-http'
import { EMAIL_OTP_PREPARE_PATH, EMAIL_OTP_VERIFY_PATH } from '../../src/lib/auth-server/email-otp/handler'
import { createFirstPartyIdentityPort } from '../../src/lib/auth-server/first-party/identity'
import { PostgresFirstPartyStore } from '../../src/lib/auth-server/first-party/postgres-store'
import { createFirstPartyHandler } from '../../src/lib/auth-server/first-party/protocol'
import { registerFirstPartyClient } from '../../src/lib/auth-server/first-party/registry'
import { AUTH_SERVER_OAUTH_DEFAULTS } from '../../src/lib/auth-server/oauth/config'
import { createExternalAccessGrantsPort, createStaticGrantsPort } from '../../src/lib/auth-server/oauth/grants'
import { createOAuthHandler } from '../../src/lib/auth-server/oauth/handler'
import { buildOpenIdConfiguration } from '../../src/lib/auth-server/oauth/metadata'
import { headersFromRecord, jsonResponse, MAX_BODY_BYTES, type OAuthHttpResponse } from '../../src/lib/auth-server/oauth/http'
import { buildPkceChallenge, sha256Hex } from '../../src/lib/auth-server/oauth/primitives'
import { InMemoryOAuthStore } from '../../src/lib/auth-server/oauth/store/memory-store'
import { PostgresOAuthStore } from '../../src/lib/auth-server/oauth/store/postgres-store'

async function main() {
  if (process.env.FIRST_PARTY_EPHEMERAL_TEST !== 'true' || process.env.GREENHOUSE_POSTGRES_HOST !== '127.0.0.1' ||
      !process.env.GREENHOUSE_POSTGRES_DATABASE?.startsWith('auth_first_party_')) throw new Error('isolated_local_database_required')
  const configPath = process.env.AUTH_FIRST_PARTY_HARNESS_CONFIG_PATH

  if (!configPath?.startsWith('/')) throw new Error('absolute_private_fixture_config_path_required')
  const port = Number(process.env.AUTH_FIRST_PARTY_HARNESS_PORT ?? 19334)

  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('invalid_local_port')
  const issuer = `http://127.0.0.1:${port}`
  const otpEnabled = process.env.AUTH_FIRST_PARTY_HARNESS_OTP === 'true'
  const smoke = process.env.AUTH_FIRST_PARTY_HARNESS_OTP_SMOKE === 'true'
  const mcpSmoke = process.env.AUTH_FIRST_PARTY_HARNESS_MCP_SMOKE === 'true'
  const twoRpSmoke = process.env.AUTH_FIRST_PARTY_HARNESS_TWO_RP_SMOKE === 'true'
  const mcpPg = process.env.AUTH_FIRST_PARTY_HARNESS_MCP_PG === 'true'
  const mcpAuthority = process.env.AUTH_FIRST_PARTY_HARNESS_MCP_AUTHORITY === 'true'
  const bindingRoute = mcpAuthority ? await import('../../src/app/api/platform/ecosystem/identity/binding/route') : null

  if (mcpAuthority && !mcpPg) throw new Error('local_mcp_authority_requires_pg')
  const authorityToken = randomBytes(32).toString('hex')
  const hmacSecret = randomBytes(32).toString('hex') // RAM only; never written to fixture config.
  let fakeAuthority: ReturnType<typeof createServer> | undefined

  if (smoke) {
    fakeAuthority = createServer(async (req, res) => {
      if (req.method !== 'POST' || req.url !== INVITATION_AUTHORITY_PATH || req.headers.authorization !== `Bearer ${authorityToken}`) { res.writeHead(403); res.end();

return }

      let raw = ''

      for await (const chunk of req) raw += chunk.toString()
      const binding = JSON.parse(raw)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ...binding, active: true, email: 'recipient@example.test', roomLabel: 'Local smoke',
        invitationUrl: `http://127.0.0.1:${(fakeAuthority!.address() as { port: number }).port}/invite#token=${'a'.repeat(43)}`, expiresAt: Date.now() + 600000 }))
    })
    await new Promise<void>(resolve => fakeAuthority!.listen(0, '127.0.0.1', resolve))
  }

  const redirectUri = fakeAuthority ? `http://127.0.0.1:${(fakeAuthority.address() as { port: number }).port}/auth/callback` : process.env.AUTH_FIRST_PARTY_HARNESS_REDIRECT_URI ?? 'http://127.0.0.1:19335/auth/callback'
  const redirect = new URL(redirectUri)

  if (redirect.protocol !== 'http:' || redirect.hostname !== '127.0.0.1') throw new Error('loopback_callback_required')
  const requestedSecondRedirect = process.env.AUTH_FIRST_PARTY_HARNESS_SECOND_REDIRECT_URI || null
  const secondPort = [19339, 19340, 19341].find(candidate => candidate !== port && candidate !== Number(redirect.port))!
  const secondRedirectUri = requestedSecondRedirect ?? `http://127.0.0.1:${secondPort}/auth/callback`
  const secondRedirect = new URL(secondRedirectUri)

  if ((twoRpSmoke || requestedSecondRedirect) && secondRedirect.origin === redirect.origin) {
    throw new Error('separate_loopback_second_rp_required')
  }

  if (requestedSecondRedirect && (secondRedirect.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost'].includes(secondRedirect.hostname) ||
      secondRedirect.hostname === redirect.hostname || secondRedirect.search || secondRedirect.hash ||
      secondRedirect.username || secondRedirect.password)) throw new Error('separate_loopback_second_rp_required')
  const environmentId = 'efeonce-auth-local-fixture'
  const profileId = 'person-local-recipient'
  const subject = 'local-recipient-subject'
  const cookieName = 'efeonce_auth_local_fixture'
  let rawSession = randomBytes(32).toString('hex')
  const controlKey = randomBytes(32).toString('hex')
  const bindingReaderKey = randomBytes(32).toString('hex')
  const store = new PostgresFirstPartyStore()

  const registration = await registerFirstPartyClient({ clientId: 'efeonce-rp-rooms-local', product: 'rooms',
    redirectUris: [redirectUri], allowLocalDevelopment: true, actor: 'ephemeral-local-harness' }, { store })

  const secondRegistration = (twoRpSmoke || requestedSecondRedirect) ? await registerFirstPartyClient({ clientId: 'efeonce-rp-second-local', product: 'synthetic-rp',
    redirectUris: [secondRedirectUri], allowLocalDevelopment: true, actor: 'ephemeral-local-harness' }, { store }) : null

  if (!registration.clientSecret || (secondRegistration && !secondRegistration.clientSecret)) throw new Error('fresh_database_required')
  await query(`INSERT INTO greenhouse_core.external_identity_environments(environment_id,status) VALUES ($1,'active')`, [environmentId])
  await query(`INSERT INTO greenhouse_core.identity_profiles(profile_id) VALUES ($1)`, [profileId])
  await query(`INSERT INTO greenhouse_core.identity_profile_source_links(link_id,profile_id,source_system,source_object_type,source_object_id)
    VALUES ($1,$1,$2,'subject',$3)`, [profileId, `external_idp:${environmentId}`, subject])
  const bindingId = 'binding-local-b10-authority'

  if (mcpAuthority) {
    await query(`INSERT INTO greenhouse_core.organizations(organization_id,public_id,active,status,is_operating_entity)
      VALUES ('org-local-b10','org-local-b10',TRUE,'active',FALSE)`)
    await query(`INSERT INTO greenhouse_core.external_organization_bindings
      (binding_id,organization_id,environment_id,external_organization_ref,population,binding_purpose,status,grants_version)
      VALUES ($1,'org-local-b10',$2,'external-org-local-b10','external','customer','active',7)`, [bindingId, environmentId])
    await query(`INSERT INTO greenhouse_core.external_member_invitations(invitation_id,binding_id,profile_id,status,linked_at)
      VALUES ('invitation-local-b10',$1,$2,'linked',now())`, [bindingId, profileId])
    await query(`INSERT INTO greenhouse_core.external_capability_grants(grant_id,binding_id,capability,status)
      VALUES ('grant-local-b10',$1,'growth.seo.observation.read','active')`, [bindingId])
    const machineTokenHash = sha256Hex(bindingReaderKey)

    await query(`INSERT INTO greenhouse_core.sister_platform_consumers
      (sister_platform_consumer_id,public_id,sister_platform_key,consumer_name,consumer_type,credential_status,
       token_prefix,token_hash,hash_algorithm,allowed_greenhouse_scope_types,rate_limit_per_minute,rate_limit_per_hour)
      VALUES ('consumer-local-b10','gateway-local-b10','efeonce-mcp-gateway','Local gateway','mcp_adapter','active',
        $1,$2,'sha256',ARRAY['internal'],1000,10000)`, [machineTokenHash.slice(0, 16), machineTokenHash])
    await query(`INSERT INTO greenhouse_core.sister_platform_bindings
      (sister_platform_binding_id,public_id,sister_platform_key,external_scope_type,external_scope_id,
       greenhouse_scope_type,binding_role,binding_status)
      VALUES ('sister-binding-local-b10','sister-binding-local-b10','efeonce-mcp-gateway','other',
        'efeonce-mcp-gateway','internal','primary','active')`)
  }

  const newSession = async () => {
    rawSession = randomBytes(32).toString('hex')
    await query(`INSERT INTO greenhouse_auth.sessions(session_hash,subject,profile_id,environment_id,link_id,amr,auth_time,expires_at,absolute_expires_at)
      VALUES ($1,$2,$3,$4,$3,ARRAY['magic_link'],now(),now()+interval '1 hour',now()+interval '1 hour')`,
    [sha256Hex(rawSession), subject, profileId, environmentId])
  }

  await newSession()
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const jwk = { ...await exportJWK(publicKey), kid: 'ephemeral-local-es256', alg: 'ES256', use: 'sig' }
  const mcpClientId = 'mcp-new-client-local'
  const mcpRedirectUri = new URL('/__b10/mcp-callback', redirectUri).toString()
  const mcpAudience = 'https://mcp.invalid/mcp'
  const oauthStore = mcpPg ? new PostgresOAuthStore() : new InMemoryOAuthStore()

  const mcpState = async () => {
    if (oauthStore instanceof InMemoryOAuthStore) return { consents: oauthStore.consents.length, codes: oauthStore.codes.size }
    const consents = await query<{ count: number }>('SELECT count(*)::integer AS count FROM greenhouse_auth.client_consents WHERE client_id=$1', [mcpClientId])
    const codes = await query<{ count: number }>('SELECT count(*)::integer AS count FROM greenhouse_auth.authorization_codes WHERE client_id=$1', [mcpClientId])

    return { consents: consents[0]?.count ?? -1, codes: codes[0]?.count ?? -1 }
  }

  const identity = createFirstPartyIdentityPort({ environmentId, sessionCookieName: cookieName })

  await oauthStore.upsertClient({
    clientId: mcpClientId, registrationKind: 'preregistered', clientType: 'public',
    clientName: 'Local B10 MCP client', redirectUris: [mcpRedirectUri],
    grantTypes: ['authorization_code'], responseTypes: ['code'], tokenEndpointAuthMethod: 'none',
    clientSecretHash: null, allowedScopes: ['efeonce.mcp.read', 'efeonce.mcp.seo.write'],
    status: 'active', metadata: {}, createdBy: 'ephemeral-local-harness',
    createdAt: new Date(), updatedAt: new Date()
  })

  const handler = createFirstPartyHandler({ config: { enabled: true, issuer, environmentId }, store,
    identity, auditStore: oauthStore,
    signer: payload => new SignJWT(payload).setProtectedHeader({ alg: 'ES256', kid: jwk.kid, typ: 'JWT' }).sign(privateKey) })

  const oauthHandler = createOAuthHandler({
    store: oauthStore,
    config: { ...AUTH_SERVER_OAUTH_DEFAULTS, issuer, environmentId, mcpAudience,
      oauthEnabled: true, firstPartyEnabled: true, allowLocalhostAlias: true },
    signer: payload => new SignJWT(payload).setProtectedHeader({ alg: 'ES256', kid: jwk.kid, typ: 'JWT' }).sign(privateKey),
    subjectPort: { resolve: async request => {
      const session = await identity.resolveRequest(request, new Date())

      return session ? { subject: session.subject, environmentId: session.environmentId,
        authLevel: 'primary', authTime: session.authTime } : null
    } },
    grantsPort: mcpAuthority ? createExternalAccessGrantsPort() :
      createStaticGrantsPort({ bound: true, grantsVersion: 1, profileId, memberships: 1 }),
    consentContextPort: { resolve: async () => ({ outcome: 'resolved', population: mcpAuthority ? 'external' : 'internal',
      organizations: [{ organizationName: 'Local B10', capabilities: mcpAuthority ? ['growth.seo.observation.read'] : [] }] }) },
    loadKeys: async () => [],
    cimd: { resolveAddresses: async () => [], fetcher: async () => { throw new Error('unexpected_cimd_fetch') } },
    firstParty: handler
  })

  const deliveries = new Map<string, InvitationDelivery>()

  const otp = createInvitationOtpRuntime({ enabled: otpEnabled, issuer, firstPartyStore: store,
    store: createPostgresInvitationOtpStore(withTransaction), auditStore: new InMemoryOAuthStore(),
    signer: { sign: (claims, header) => new SignJWT({ ...claims }).setProtectedHeader({ ...header, kid: jwk.kid }).sign(privateKey) },
    mailer: { send: async delivery => {
      if (!/^[^@\s]+@[^@\s]+\.(?:test|invalid)$/i.test(delivery.email) || deliveries.size >= 100) return { status: 'failed' }
      deliveries.set(delivery.deliveryId, structuredClone(delivery))

      return { status: 'accepted' }
    } },
    env: { NODE_ENV: 'test', AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED: 'true',
      AUTH_SERVER_INVITATION_EMAIL_OTP_CLIENT_ID: registration.client.clientId,
      AUTH_SERVER_INVITATION_EMAIL_OTP_ROOMS_ORIGIN: redirect.origin,
      AUTH_SERVER_INVITATION_EMAIL_OTP_LOCAL: 'true', ROOMS_INVITATION_AUTHORITY_TOKEN: authorityToken,
      AUTH_SERVER_INVITATION_EMAIL_OTP_HMAC_SECRET: hmacSecret }
  })

  const metadata = buildOpenIdConfiguration({ issuer, environmentId, oauthEnabled: true, firstPartyEnabled: true,
    mcpAudience, allowLocalhostAlias: true, ...AUTH_SERVER_OAUTH_DEFAULTS })

  const server = createServer(async (req, res) => {
    const respond = (response: OAuthHttpResponse) => { res.writeHead(response.status, response.headers); res.end(response.body) }

    try {
      if (req.headers.host !== `127.0.0.1:${port}`) return respond(jsonResponse(421, { error: 'loopback_host_required' }))
      const url = new URL(req.url ?? '/', issuer)

      if (mcpAuthority && req.method === 'GET' && url.pathname === '/__fixture/binding') {
        if (req.headers.cookie || req.headers.origin) return respond(jsonResponse(403, { error: 'machine_reader_only' }))
        const canonicalUrl = new URL('/api/platform/ecosystem/identity/binding', issuer)

        canonicalUrl.search = url.search

        const response = await bindingRoute!.GET(new Request(canonicalUrl, { headers: {
          authorization: req.headers.authorization ?? '',
          'x-greenhouse-sister-platform-key': 'efeonce-mcp-gateway',
          accept: 'application/json'
        } }))

        return respond({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() })
      }

      let body = ''

      for await (const chunk of req) {
        body += chunk.toString()
        if (Buffer.byteLength(body) > MAX_BODY_BYTES) return respond(jsonResponse(413, { error: 'body_too_large' }))
      }

      if (url.pathname.startsWith('/__fixture/')) {
        if (req.method !== 'POST' || url.search || req.headers.origin || req.headers.cookie || req.headers.authorization !== `Bearer ${controlKey}`) return respond(jsonResponse(403, { error: 'fixture_control_required' }))

        if (otpEnabled && url.pathname === '/__fixture/deliveries') {
          const input = body ? JSON.parse(body) : {}
          const deliveryId = typeof input.deliveryId === 'string' ? input.deliveryId : null

          return respond(jsonResponse(200, { deliveries: deliveryId ? (deliveries.has(deliveryId) ? [deliveries.get(deliveryId)] : []) : [...deliveries.values()].slice(-20) }))
        }

        if (otpEnabled && url.pathname === '/__fixture/deliveries/clear') {
          deliveries.clear()

          return respond(jsonResponse(200, { cleared: true }))
        }

        if (url.pathname === '/__fixture/session') {
          await newSession()

          return respond(jsonResponse(200, { subject }, { 'Set-Cookie': `${cookieName}=${rawSession}; Path=/; HttpOnly; SameSite=Lax` }))
        }

        if (url.pathname === '/__fixture/revoke') {
          await query('UPDATE greenhouse_auth.sessions SET revoked_at=now() WHERE profile_id=$1', [profileId])

          return respond(jsonResponse(200, { revoked: true }))
        }

        if (url.pathname === '/__fixture/deactivate-profile') {
          await query('UPDATE greenhouse_core.identity_profiles SET active=FALSE WHERE profile_id=$1', [profileId])

          return respond(jsonResponse(200, { active: false }))
        }

        if (mcpAuthority && url.pathname === '/__fixture/revoke-binding') {
          await query(`UPDATE greenhouse_core.external_organization_bindings
            SET status='revoked', revoked_at=now(), grants_version=grants_version+1 WHERE binding_id=$1`, [bindingId])

          return respond(jsonResponse(200, { revoked: true }))
        }
      }

      if (req.method === 'GET' && url.pathname === '/healthz') return respond(jsonResponse(200, { localFixture: true }))
      if (req.method === 'GET' && url.pathname === '/.well-known/jwks.json') return respond(jsonResponse(200, { keys: [jwk] }))
      if (req.method === 'GET' && ['/.well-known/openid-configuration','/.well-known/oauth-authorization-server'].includes(url.pathname)) return respond(jsonResponse(200, metadata))
      const request = { url, method: req.method ?? 'GET', headers: headersFromRecord(req.headers), body }
      const response = (otp ? await otp(request) : null) ?? await oauthHandler(request)

      return respond(response ?? jsonResponse(404, { error: 'not_found' }))
    } catch {
      return respond(jsonResponse(500, { error: 'local_harness_error' }))
    }
  })

  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve) })
  writeFileSync(configPath, JSON.stringify({ issuer, environmentId, clientId: registration.client.clientId, clientSecret: registration.clientSecret,
    redirectUri, subject, profileId, recipient: 'recipient@example.test', cookieName, sessionCookie: `${cookieName}=${rawSession}`,
    ...(secondRegistration ? { secondClientId: secondRegistration.client.clientId,
      secondClientSecret: secondRegistration.clientSecret, secondRedirectUri } : {}),
    mcpClientId, mcpRedirectUri, mcpAudience,
    fixtureControlKey: controlKey, fixtureSessionEndpoint: `${issuer}/__fixture/session`, fixtureRevokeEndpoint: `${issuer}/__fixture/revoke`,
    fixtureDeactivateProfileEndpoint: `${issuer}/__fixture/deactivate-profile`,
    ...(mcpAuthority ? { bindingReaderKey, fixtureBindingEndpoint: `${issuer}/__fixture/binding`,
      fixtureRevokeBindingEndpoint: `${issuer}/__fixture/revoke-binding` } : {}),
    ...(otpEnabled ? { authorityToken, roomsOrigin: redirect.origin, otpPrepareEndpoint: `${issuer}${EMAIL_OTP_PREPARE_PATH}`,
      otpVerifyEndpoint: `${issuer}${EMAIL_OTP_VERIFY_PATH}`, fixtureDeliveriesEndpoint: `${issuer}/__fixture/deliveries`,
      fixtureClearDeliveriesEndpoint: `${issuer}/__fixture/deliveries/clear` } : {}) }, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
  console.log(`Local first-party issuer ready: ${issuer}; private fixture config: ${configPath}`)

  if (twoRpSmoke) {
    const rooms = registration.client
    const second = secondRegistration!.client
    const sessionCookie = `${cookieName}=${rawSession}`
    const codeVerifier = 'v'.repeat(64)
    const basic = (clientId: string, secret: string) => 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64')
    const roomsBasic = basic(rooms.clientId, registration.clientSecret!)
    const secondBasic = basic(second.clientId, secondRegistration!.clientSecret!)

    const authorize = async (clientId: string, callbackUri: string) => {
      const url = new URL('/oauth/authorize', issuer)

      url.search = new URLSearchParams({ response_type: 'code', scope: 'openid', client_id: clientId,
        redirect_uri: callbackUri, state: 'local-cross-rp-state', nonce: 'local-cross-rp-nonce',
        code_challenge: buildPkceChallenge(codeVerifier), code_challenge_method: 'S256' }).toString()
      const response = await fetch(url, { redirect: 'manual', headers: { cookie: sessionCookie } })
      const location = new URL(response.headers.get('location') ?? '', callbackUri)

      if (response.status !== 302 || location.origin + location.pathname !== callbackUri || !location.searchParams.get('code')) {
        throw new Error('two_rp_authorization_failed')
      }

      return location.searchParams.get('code')!
    }

    const post = (path: string, values: Record<string, string>, authorization: string) =>
      fetch(issuer + path, { method: 'POST', redirect: 'manual', headers: {
        'content-type': 'application/x-www-form-urlencoded', authorization
      }, body: new URLSearchParams(values).toString() })

    const exchange = (code: string, callbackUri: string, authorization: string) => post('/oauth/token', {
      grant_type: 'authorization_code', code, code_verifier: codeVerifier, redirect_uri: callbackUri
    }, authorization)

    const introspect = async (token: string, authorization: string) => {
      const response = await post('/oauth/introspect', { token }, authorization)

      return response.status === 200 ? await response.json() as { active: boolean; aud?: string } : null
    }

    const roomsCode = await authorize(rooms.clientId, redirectUri)

    if ((await exchange(roomsCode, redirectUri, secondBasic)).status !== 400) throw new Error('two_rp_foreign_code_accepted')
    const roomsExchange = await exchange(roomsCode, redirectUri, roomsBasic)

    if (roomsExchange.status !== 200) throw new Error('two_rp_owner_code_rejected')
    const roomsTokens = await roomsExchange.json() as { id_token: string; access_token: string }

    await jwtVerify(roomsTokens.id_token, publicKey, { issuer, audience: rooms.clientId })

    try {
      await jwtVerify(roomsTokens.id_token, publicKey, { issuer, audience: second.clientId })
      throw new Error('two_rp_foreign_audience_accepted')
    } catch (error) {
      if (error instanceof Error && error.message === 'two_rp_foreign_audience_accepted') throw error
    }

    if ((await introspect(roomsTokens.access_token, secondBasic))?.active !== false ||
        (await introspect(roomsTokens.access_token, roomsBasic))?.aud !== rooms.clientId) throw new Error('two_rp_handle_boundary_failed')
    if ((await post('/oauth/revoke', { token: roomsTokens.access_token }, secondBasic)).status !== 200) throw new Error('two_rp_foreign_revoke_request_failed')
    if ((await introspect(roomsTokens.access_token, roomsBasic))?.active !== true) throw new Error('two_rp_foreign_revoke_accepted')

    const secondCode = await authorize(second.clientId, secondRedirectUri)

    if ((await exchange(secondCode, secondRedirectUri, roomsBasic)).status !== 400) throw new Error('two_rp_reverse_code_accepted')
    const secondExchange = await exchange(secondCode, secondRedirectUri, secondBasic)

    if (secondExchange.status !== 200) throw new Error('two_rp_second_code_rejected')
    const secondTokens = await secondExchange.json() as { id_token: string; access_token: string }

    await jwtVerify(secondTokens.id_token, publicKey, { issuer, audience: second.clientId })
    if ((await introspect(secondTokens.access_token, roomsBasic))?.active !== false ||
        (await introspect(secondTokens.access_token, secondBasic))?.aud !== second.clientId) throw new Error('two_rp_reverse_handle_boundary_failed')
    if ((await post('/oauth/revoke', { token: secondTokens.access_token }, secondBasic)).status !== 200 ||
        (await introspect(secondTokens.access_token, secondBasic))?.active !== false ||
        (await introspect(roomsTokens.access_token, roomsBasic))?.active !== true) throw new Error('two_rp_selective_revoke_failed')

    const records = await query<{ client_id: string; count: number }>(`
      SELECT client_id,count(*)::integer AS count FROM greenhouse_auth.first_party_access_handles
      WHERE client_id IN ($1,$2) GROUP BY client_id ORDER BY client_id`, [rooms.clientId, second.clientId])

    if (records.length !== 2 || records.some(record => record.count !== 1)) throw new Error('two_rp_sql_boundary_failed')
    console.log('PASS local two-RP HTTP+PG: separate clients, redirects, codes, audiences, handles and selective revoke; shared issuer SSO session; no consumer browser or production.')
    await new Promise<void>(resolve => server.close(() => resolve()))
    await closeGreenhousePostgres()

    return
  }

  if (smoke) {
    const basic = 'Basic ' + Buffer.from(registration.client.clientId + ':' + registration.clientSecret).toString('base64')

    const firstPartyState = async () => {
      const result = await query<{ sessions: number; transactions: number; codes: number; handles: number }>(`
        SELECT (SELECT count(*) FROM greenhouse_auth.sessions)::int AS sessions,
          (SELECT count(*) FROM greenhouse_auth.first_party_login_transactions)::int AS transactions,
          (SELECT count(*) FROM greenhouse_auth.first_party_codes)::int AS codes,
          (SELECT count(*) FROM greenhouse_auth.first_party_access_handles)::int AS handles`)

      return result[0]
    }

    const unauthenticatedAuthorize = async () => {
      const url = new URL('/oauth/authorize', issuer)

      url.search = new URLSearchParams({ client_id: registration.client.clientId, response_type: 'code',
        redirect_uri: redirectUri, scope: 'openid', state: 'otp-no-sso-state', nonce: 'otp-no-sso-nonce',
        code_challenge_method: 'S256', code_challenge: buildPkceChallenge('v'.repeat(64)), prompt: 'none' }).toString()
      const response = await fetch(url, { redirect: 'manual' })
      const location = new URL(response.headers.get('location') ?? '', redirectUri)

      return response.status === 302 && location.searchParams.get('error') === 'login_required' &&
        !location.searchParams.has('code') && response.headers.get('set-cookie') === null
    }

    const post = async (path: string, body: unknown, authorization = basic) => {
      const response = await fetch(issuer + path, { method: 'POST', headers: { authorization, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      return { status: response.status, setCookie: response.headers.get('set-cookie'), body: await response.json() as Record<string, any> }
    }

    const stateBeforeOtp = await firstPartyState()

    if (JSON.stringify(stateBeforeOtp) !== JSON.stringify({ sessions: 1, transactions: 0, codes: 0, handles: 0 }) ||
        !await unauthenticatedAuthorize()) throw new Error('otp_smoke_initial_session_boundary_failed')

    const input = { invitationId: 'local-invitation', invitationVersion: '1', recipientReference: 'local-recipient',
      requesterKey: 'local-requester-key-0001', requestId: 'local-idempotency-key-0001' }

    const prepared = await post(EMAIL_OTP_PREPARE_PATH, input)
    const repeated = await post(EMAIL_OTP_PREPARE_PATH, input)
    const captured = await post('/__fixture/deliveries', {}, `Bearer ${controlKey}`)

    if (prepared.status !== 200 || repeated.body.challengeId !== prepared.body.challengeId || captured.body.deliveries?.length !== 1) throw new Error('otp_smoke_prepare_failed')
    const binding = { invitationId: input.invitationId, invitationVersion: input.invitationVersion, recipientReference: input.recipientReference, requesterKey: input.requesterKey }
    const verification = { ...binding, challengeId: prepared.body.challengeId, code: captured.body.deliveries[0].code, nonce: 'local-proof-nonce-at-least-32-characters' }
    const verified = await post(EMAIL_OTP_VERIFY_PATH, verification)

    if (verified.status !== 200) throw new Error('otp_smoke_verify_failed')
    const checked = await jwtVerify(verified.body.proof, publicKey, { issuer, audience: registration.client.clientId, algorithms: ['ES256'], typ: INVITATION_PROOF_TYPE })

    if (checked.payload.nonce !== verification.nonce || checked.payload.sub || (await post(EMAIL_OTP_VERIFY_PATH, verification)).status !== 400) throw new Error('otp_smoke_proof_or_replay_failed')
    if (prepared.setCookie || repeated.setCookie || verified.setCookie ||
        JSON.stringify(await firstPartyState()) !== JSON.stringify(stateBeforeOtp) ||
        !await unauthenticatedAuthorize()) throw new Error('otp_smoke_global_sso_boundary_failed')
    console.log('PASS local OTP HTTP: PG migration, canonical authority, one memory delivery/idempotency, ES256 scoped proof, replay denial, no global session/cookie/silent Rooms authorization; no external email.')
    deliveries.clear()
    await new Promise<void>(resolve => server.close(() => resolve()))
    await new Promise<void>(resolve => fakeAuthority!.close(() => resolve()))
    await closeGreenhousePostgres()

    return
  }

  if (mcpSmoke) {
    const cookie = `${cookieName}=${rawSession}`
    const codeVerifier = 'v'.repeat(64)
    const challenge = buildPkceChallenge(codeVerifier)

    const authorize = (clientId: string, callbackUri: string, scope: string, extra: Record<string, string> = {}) => {
      const url = new URL('/oauth/authorize', issuer)

      url.search = new URLSearchParams({ response_type: 'code', client_id: clientId,
        redirect_uri: callbackUri, scope, state: 'local-b10-state', code_challenge_method: 'S256',
        code_challenge: challenge, ...extra }).toString()

      return url
    }

    const formPost = (path: string, values: Record<string, string>, extraHeaders: Record<string, string> = {}) =>
      fetch(issuer + path, { method: 'POST', redirect: 'manual', headers: {
        'content-type': 'application/x-www-form-urlencoded', cookie, ...extraHeaders
      }, body: new URLSearchParams(values).toString() })

    const roomsUrl = authorize(registration.client.clientId, redirectUri, 'openid', { nonce: 'local-b10-nonce' })
    const roomsResponse = await fetch(roomsUrl, { headers: { cookie }, redirect: 'manual' })

    const roomsCode = roomsResponse.status === 302
      ? new URL(roomsResponse.headers.get('location') ?? '', redirectUri).searchParams.get('code') : null

    if (!roomsCode) throw new Error('mcp_smoke_rooms_authorize_failed')

    const basic = 'Basic ' + Buffer.from(registration.client.clientId + ':' + registration.clientSecret).toString('base64')

    const roomsExchange = await formPost('/oauth/token', { grant_type: 'authorization_code', code: roomsCode,
      code_verifier: codeVerifier, redirect_uri: redirectUri }, { authorization: basic })

    const beforeMcp = await mcpState()

    if (roomsExchange.status !== 200 || beforeMcp.consents || beforeMcp.codes) throw new Error('mcp_smoke_rooms_boundary_failed')

    const mcpReadUrl = authorize(mcpClientId, mcpRedirectUri, 'efeonce.mcp.read', { resource: mcpAudience })
    const mcpWriteUrl = authorize(mcpClientId, mcpRedirectUri, 'efeonce.mcp.seo.write', { resource: mcpAudience })
    const readConsent = await fetch(mcpReadUrl, { headers: { cookie }, redirect: 'manual' })
    const writeDenied = await fetch(mcpWriteUrl, { headers: { cookie }, redirect: 'manual' })

    const beforeConsent = await mcpState()

    if (readConsent.status !== 200 || !(await readConsent.text()).includes('action="/oauth/consent"') ||
        writeDenied.status !== 403 || !(await writeDenied.text()).includes('/login/step-up?') ||
        beforeConsent.consents || beforeConsent.codes) throw new Error('mcp_smoke_preconsent_boundary_failed')

    const approved = await formPost('/oauth/consent', { client_id: mcpClientId,
      scope: 'efeonce.mcp.read', return_to: mcpReadUrl.pathname + mcpReadUrl.search, decision: 'allow' },
    { origin: issuer, 'sec-fetch-site': 'same-origin' })

    const readAuthorization = await fetch(mcpReadUrl, { headers: { cookie }, redirect: 'manual' })

    const mcpCode = readAuthorization.status === 302
      ? new URL(readAuthorization.headers.get('location') ?? '', mcpRedirectUri).searchParams.get('code') : null

    const afterConsent = await mcpState()

    if (approved.status !== 302 || !mcpCode || afterConsent.consents !== 1 || afterConsent.codes !== 1) throw new Error('mcp_smoke_read_consent_failed')

    const mcpExchange = await formPost('/oauth/token', { grant_type: 'authorization_code', client_id: mcpClientId,
      code: mcpCode, code_verifier: codeVerifier, redirect_uri: mcpRedirectUri })

    const tokens = mcpExchange.status === 200 ? await mcpExchange.json() as Record<string, string> : null

    const claims = tokens?.access_token ? (await jwtVerify(tokens.access_token, publicKey, {
      issuer, audience: mcpAudience, algorithms: ['ES256'] })).payload : null

    const replay = await formPost('/oauth/token', { grant_type: 'authorization_code', client_id: mcpClientId,
      code: mcpCode, code_verifier: codeVerifier, redirect_uri: mcpRedirectUri })

    const replayBody = replay.status === 400 ? await replay.json() as Record<string, string> : null
    const writeAfterRead = await fetch(mcpWriteUrl, { headers: { cookie }, redirect: 'manual' })

    const afterToken = await mcpState()

    const persisted = mcpPg ? {
      consumed: (await query<{ consumed_at: Date | null }>(
        'SELECT consumed_at FROM greenhouse_auth.authorization_codes WHERE code_hash=$1', [sha256Hex(mcpCode)]))[0]?.consumed_at != null,
      accessCount: (await query<{ count: number }>(
        'SELECT count(*)::integer AS count FROM greenhouse_auth.access_tokens WHERE client_id=$1', [mcpClientId]))[0]?.count
    } : null

    if (mcpExchange.status !== 200 || tokens?.scope !== 'efeonce.mcp.read' ||
        claims?.scope !== 'efeonce.mcp.read' || claims.azp !== mcpClientId ||
        (mcpAuthority && claims.gv !== 7) ||
        replay.status !== 400 || replayBody?.error !== 'invalid_grant' ||
        (persisted && (!persisted.consumed || persisted.accessCount !== 1)) ||
        writeAfterRead.status !== 403 || afterToken.consents !== 1 || afterToken.codes !== 1) throw new Error('mcp_smoke_token_or_step_up_failed')

    if (mcpAuthority) {
      await query(`UPDATE greenhouse_core.external_organization_bindings
        SET status='revoked', revoked_at=now(), grants_version=8 WHERE binding_id=$1`, [bindingId])

      const revokedAuthorization = await fetch(mcpReadUrl, { headers: { cookie }, redirect: 'manual' })
      const revokedLocation = revokedAuthorization.headers.get('location')
      const denied = revokedLocation ? new URL(revokedLocation, mcpRedirectUri) : null

      const denials = await query<{ count: number }>(`SELECT count(*)::integer AS count
        FROM greenhouse_core.external_access_resolution_log WHERE outcome='revoked' AND binding_id=$1`, [bindingId])

      if (revokedAuthorization.status !== 302 || denied?.searchParams.get('error') !== 'access_denied' ||
          (denials[0]?.count ?? 0) < 1) throw new Error('mcp_smoke_real_authority_revocation_failed')
    }

    console.log(`PASS local B10 HTTP+PG session: Rooms code/token, no implicit MCP consent, write step-up, explicit read consent, MCP code/token read-only, replay denied; MCP OAuth store ${mcpPg ? 'PostgreSQL' : 'in memory'}; ${mcpAuthority ? 'real external-access reader, gv=7, revoked binding denied' : 'static grants fixture'}; no browser or gateway dispatch.`)
    await new Promise<void>(resolve => server.close(() => resolve()))
    await closeGreenhousePostgres()

    return
  }

  const shutdown = () => { server.close(() => { void closeGreenhousePostgres().finally(() => process.exit(0)) }) }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

void main().catch(error => {
  const safeSmokeFailure = error instanceof Error && /^(?:otp|mcp)_smoke_[a-z_]+$/.test(error.message) ? error.message : null

  console.error(safeSmokeFailure ?? 'Local first-party harness failed; no credentials printed.')
  process.exit(1)
})
