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
import { buildOpenIdConfiguration } from '../../src/lib/auth-server/oauth/metadata'
import { headersFromRecord, jsonResponse, MAX_BODY_BYTES, type OAuthHttpResponse } from '../../src/lib/auth-server/oauth/http'
import { sha256Hex } from '../../src/lib/auth-server/oauth/primitives'
import { InMemoryOAuthStore } from '../../src/lib/auth-server/oauth/store/memory-store'

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
  const environmentId = 'efeonce-auth-local-fixture'
  const profileId = 'person-local-recipient'
  const subject = 'local-recipient-subject'
  const cookieName = 'efeonce_auth_local_fixture'
  let rawSession = randomBytes(32).toString('hex')
  const controlKey = randomBytes(32).toString('hex')
  const store = new PostgresFirstPartyStore()

  const registration = await registerFirstPartyClient({ clientId: 'efeonce-rp-rooms-local', product: 'rooms',
    redirectUris: [redirectUri], allowLocalDevelopment: true, actor: 'ephemeral-local-harness' }, { store })

  if (!registration.clientSecret) throw new Error('fresh_database_required')
  await query(`INSERT INTO greenhouse_core.external_identity_environments VALUES ($1,'active')`, [environmentId])
  await query(`INSERT INTO greenhouse_core.identity_profiles(profile_id) VALUES ($1)`, [profileId])
  await query(`INSERT INTO greenhouse_core.identity_profile_source_links(link_id,profile_id,source_system,source_object_type,source_object_id)
    VALUES ($1,$1,$2,'subject',$3)`, [profileId, `external_idp:${environmentId}`, subject])

  const newSession = async () => {
    rawSession = randomBytes(32).toString('hex')
    await query(`INSERT INTO greenhouse_auth.sessions(session_hash,subject,profile_id,environment_id,link_id,amr,auth_time,expires_at,absolute_expires_at)
      VALUES ($1,$2,$3,$4,$3,ARRAY['magic_link'],now(),now()+interval '1 hour',now()+interval '1 hour')`,
    [sha256Hex(rawSession), subject, profileId, environmentId])
  }

  await newSession()
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const jwk = { ...await exportJWK(publicKey), kid: 'ephemeral-local-es256', alg: 'ES256', use: 'sig' }

  const handler = createFirstPartyHandler({ config: { enabled: true, issuer, environmentId }, store,
    identity: createFirstPartyIdentityPort({ environmentId, sessionCookieName: cookieName }), auditStore: new InMemoryOAuthStore(),
    signer: payload => new SignJWT(payload).setProtectedHeader({ alg: 'ES256', kid: jwk.kid, typ: 'JWT' }).sign(privateKey) })

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
    mcpAudience: 'https://mcp.invalid/mcp', allowLocalhostAlias: true, ...AUTH_SERVER_OAUTH_DEFAULTS })

  const server = createServer(async (req, res) => {
    const respond = (response: OAuthHttpResponse) => { res.writeHead(response.status, response.headers); res.end(response.body) }

    try {
      if (req.headers.host !== `127.0.0.1:${port}`) return respond(jsonResponse(421, { error: 'loopback_host_required' }))
      const url = new URL(req.url ?? '/', issuer)
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
      }

      if (req.method === 'GET' && url.pathname === '/healthz') return respond(jsonResponse(200, { localFixture: true }))
      if (req.method === 'GET' && url.pathname === '/.well-known/jwks.json') return respond(jsonResponse(200, { keys: [jwk] }))
      if (req.method === 'GET' && ['/.well-known/openid-configuration','/.well-known/oauth-authorization-server'].includes(url.pathname)) return respond(jsonResponse(200, metadata))
      const request = { url, method: req.method ?? 'GET', headers: headersFromRecord(req.headers), body }
      const response = (otp ? await otp(request) : null) ?? await handler(request)

      return respond(response ?? jsonResponse(404, { error: 'not_found' }))
    } catch {
      return respond(jsonResponse(500, { error: 'local_harness_error' }))
    }
  })

  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve) })
  writeFileSync(configPath, JSON.stringify({ issuer, clientId: registration.client.clientId, clientSecret: registration.clientSecret,
    redirectUri, subject, profileId, recipient: 'recipient@example.test', cookieName, sessionCookie: `${cookieName}=${rawSession}`,
    fixtureControlKey: controlKey, fixtureSessionEndpoint: `${issuer}/__fixture/session`, fixtureRevokeEndpoint: `${issuer}/__fixture/revoke`,
    fixtureDeactivateProfileEndpoint: `${issuer}/__fixture/deactivate-profile`,
    ...(otpEnabled ? { authorityToken, roomsOrigin: redirect.origin, otpPrepareEndpoint: `${issuer}${EMAIL_OTP_PREPARE_PATH}`,
      otpVerifyEndpoint: `${issuer}${EMAIL_OTP_VERIFY_PATH}`, fixtureDeliveriesEndpoint: `${issuer}/__fixture/deliveries`,
      fixtureClearDeliveriesEndpoint: `${issuer}/__fixture/deliveries/clear` } : {}) }, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
  console.log(`Local first-party issuer ready: ${issuer}; private fixture config: ${configPath}`)

  if (smoke) {
    const basic = 'Basic ' + Buffer.from(registration.client.clientId + ':' + registration.clientSecret).toString('base64')

    const post = async (path: string, body: unknown, authorization = basic) => {
      const response = await fetch(issuer + path, { method: 'POST', headers: { authorization, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      return { status: response.status, body: await response.json() as Record<string, any> }
    }

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
    console.log('PASS local OTP HTTP: PG migration, canonical authority, one memory delivery/idempotency, ES256 scoped proof, replay denial; no external email.')
    deliveries.clear()
    await new Promise<void>(resolve => server.close(() => resolve()))
    await new Promise<void>(resolve => fakeAuthority!.close(() => resolve()))
    await closeGreenhousePostgres()

    return
  }

  const shutdown = () => { server.close(() => { void closeGreenhousePostgres().finally(() => process.exit(0)) }) }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

void main().catch(() => { console.error('Local first-party harness failed; no credentials printed.'); process.exit(1) })
