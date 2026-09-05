import { createHash } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import { AUTH_SERVER_PERSON_AUTH_DEFAULTS, type AuthServerPersonAuthConfig } from './config'
import type { PersonDirectoryPort } from './magic-link'
import {
  buildPasskeyAmr,
  deriveRpId,
  finishPasskeyStepUp,
  startPasskeyStepUp,
  finishPasskeyAuthentication,
  finishPasskeyRegistration,
  isCounterRegression,
  startPasskeyAuthentication,
  startPasskeyRegistration,
  type PasskeyDeps
} from './passkeys'
import { createPersonAuthHandler } from './routes'
import { PASSKEY_IP_RULES, PASSKEY_REGISTER_SUBJECT_RULE, enforceRateLimit } from './rate-limit'
import { createInMemoryTotpCipher } from './totp-cipher'
import { resolveAuthLevel, createPersonSession } from './sessions'
import { InMemoryPersonAuthStore } from './store/memory-store'
import { SoftwareAuthenticator } from './test-support/software-authenticator'

/**
 * Ceremonias WebAuthn ejercitadas de verdad: el autenticador de software firma con una P-256 real y
 * la verificación la hace `@simplewebauthn/server`. Sin firma real, "el contador que retrocede
 * invalida la credencial" sería una afirmación, no una prueba.
 */

const ENVIRONMENT_ID = 'efeonce-auth'
const ISSUER = 'https://auth.efeonce.org'
const RP_ID = 'auth.efeonce.org'
const SUBJECT = 'subject-passkey'
const LINK_ID = 'ipsl-passkey-1'

const config: AuthServerPersonAuthConfig = { ...AUTH_SERVER_PERSON_AUTH_DEFAULTS, personAuthEnabled: true }

const buildDeps = (options: { linkActive?: boolean } = {}) => {
  const store = new InMemoryPersonAuthStore()
  const clock = { current: new Date('2026-09-04T12:00:00.000Z') }
  const linkActive = options.linkActive ?? true

  store.registerLink({
    linkId: LINK_ID,
    subject: SUBJECT,
    sourceSystem: `external_idp:${ENVIRONMENT_ID}`,
    active: linkActive
  })

  const directory: PersonDirectoryPort = {
    findBySubject: async ({ subject }) =>
      store.links.get(LINK_ID)?.active && subject === SUBJECT
        ? { linkId: LINK_ID, profileId: 'prof-1', subject: SUBJECT, email: 'persona@cliente.example' }
        : null,
    findByEmail: async () => null
  }

  const deps: PasskeyDeps = {
    store,
    config,
    directory,
    environmentId: ENVIRONMENT_ID,
    origin: ISSUER,
    rpId: RP_ID,
    now: () => clock.current
  }

  return { deps, store, clock }
}

const registerCredential = async (
  deps: PasskeyDeps,
  authenticator: SoftwareAuthenticator,
  deviceName = 'MacBook de prueba'
) => {
  const started = await startPasskeyRegistration(deps, {
    subject: SUBJECT,
    displayName: 'Persona de prueba',
    ipHash: null,
    correlationId: null
  })

  if (started.status !== 'ready') throw new Error(`registro no arrancó: ${started.status}`)

  const challenge = started.options.challenge

  return {
    challenge,
    result: await finishPasskeyRegistration(deps, {
      subject: SUBJECT,
      challenge,
      response: authenticator.register(challenge) as never,
      deviceName
    })
  }
}

describe('rpId', () => {
  it('es el host desnudo del emisor: con esquema el navegador rechaza la ceremonia', () => {
    expect(deriveRpId('https://auth.efeonce.org')).toBe('auth.efeonce.org')
    expect(deriveRpId('https://auth.efeonce.org:443/')).toBe('auth.efeonce.org')
  })
})

describe('registro de passkey', () => {
  it('registra una credencial real y guarda sólo material público', async () => {
    const { deps, store } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER, userVerified: true })

    const { result } = await registerCredential(deps, authenticator)

    expect(result.status).toBe('registered')

    const stored = await store.getPasskeyCredential(authenticator.credentialIdB64)

    expect(stored?.subject).toBe(SUBJECT)
    expect(stored?.deviceName).toBe('MacBook de prueba')
    expect(stored?.publicKey.length).toBeGreaterThan(0)
    // Lo guardado es la clave PÚBLICA COSE: la privada no sale del autenticador ni existe acá.
    expect(JSON.stringify(stored)).not.toContain('PRIVATE')
  })

  it('el reto se consume una sola vez: un replay del registro no crea otra credencial', async () => {
    const { deps } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER })

    const { challenge } = await registerCredential(deps, authenticator)

    const replay = await finishPasskeyRegistration(deps, {
      subject: SUBJECT,
      challenge,
      response: authenticator.register(challenge) as never,
      deviceName: 'replay'
    })

    expect(replay.status).toBe('rejected')
    expect(replay.status === 'rejected' && replay.reason).toBe('challenge_invalid')
  })

  it('un reto de otra persona no sirve para injertar una credencial', async () => {
    const { deps } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER })

    const started = await startPasskeyRegistration(deps, {
      subject: SUBJECT,
      displayName: null,
      ipHash: null,
      correlationId: null
    })

    if (started.status !== 'ready') throw new Error('registro no arrancó')

    const result = await finishPasskeyRegistration(deps, {
      subject: 'otro-sujeto',
      challenge: started.options.challenge,
      response: authenticator.register(started.options.challenge) as never,
      deviceName: null
    })

    expect(result.status === 'rejected' && result.reason).toBe('challenge_subject_mismatch')
  })

  it('un origen distinto no verifica', async () => {
    const { deps } = buildDeps()
    const impostor = new SoftwareAuthenticator({ rpId: RP_ID, origin: 'https://evil.example' })
    const { result } = await registerCredential(deps, impostor)

    expect(result.status === 'rejected' && result.reason).toBe('verification_failed')
  })

  it('el tope de 5 credenciales corta la sexta', async () => {
    const { deps } = buildDeps()

    for (let index = 0; index < config.maxPasskeysPerPerson; index += 1) {
      const { result } = await registerCredential(deps, new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER }))

      expect(result.status).toBe('registered')
    }

    const started = await startPasskeyRegistration(deps, {
      subject: SUBJECT,
      displayName: null,
      ipHash: null,
      correlationId: null
    })

    expect(started.status).toBe('limit_reached')
  })
})

describe('autenticación por passkey', () => {
  it('abre sesión con una aserción firmada de verdad', async () => {
    const { deps, store } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER, userVerified: true })

    await registerCredential(deps, authenticator)

    const started = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })

    const result = await finishPasskeyAuthentication(deps, {
      challenge: started.options.challenge,
      response: authenticator.authenticate(started.options.challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(result.status).toBe('authenticated')
    expect(result.status === 'authenticated' && result.subject).toBe(SUBJECT)
    expect(store.sessions.size).toBe(1)
  })

  it('NO pide `allowCredentials`: la lista de credenciales de alguien sería un oráculo de existencia', async () => {
    const { deps } = buildDeps()
    const started = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })

    expect(started.options.allowCredentials ?? []).toHaveLength(0)
  })

  it('con user verification real abre en `step_up`; sin ella, sólo `primary`', async () => {
    const verified = buildDeps()
    const unverified = buildDeps()
    const withUv = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER, userVerified: true })
    const withoutUv = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER, userVerified: false })

    await registerCredential(verified.deps, withUv)
    await registerCredential(unverified.deps, withoutUv)

    const startedA = await startPasskeyAuthentication(verified.deps, { ipHash: null, correlationId: null })

    const resultA = await finishPasskeyAuthentication(verified.deps, {
      challenge: startedA.options.challenge,
      response: withUv.authenticate(startedA.options.challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    const startedB = await startPasskeyAuthentication(unverified.deps, { ipHash: null, correlationId: null })

    const resultB = await finishPasskeyAuthentication(unverified.deps, {
      challenge: startedB.options.challenge,
      response: withoutUv.authenticate(startedB.options.challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(resultA.status === 'authenticated' && resultA.amr).toEqual(['passkey', 'uv'])
    expect(resultB.status === 'authenticated' && resultB.amr).toEqual(['passkey'])

    const now = new Date('2026-09-04T12:00:00.000Z')

    expect(resultA.status === 'authenticated' && resolveAuthLevel(resultA.session.record, config, now)).toBe('step_up')
    expect(resultB.status === 'authenticated' && resolveAuthLevel(resultB.session.record, config, now)).toBe('primary')
  })

  it('un contador que RETROCEDE invalida la credencial: es un clon', async () => {
    const { deps, store } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER })

    await registerCredential(deps, authenticator)

    // Primer uso legítimo: el contador avanza a 1 y queda persistido.
    const first = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })

    await finishPasskeyAuthentication(deps, {
      challenge: first.options.challenge,
      response: authenticator.authenticate(first.options.challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect((await store.getPasskeyCredential(authenticator.credentialIdB64))?.counter).toBe(1)

    // El clon firma con el mismo material pero un contador viejo.
    authenticator.setCounter(0)

    const second = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })

    const cloned = await finishPasskeyAuthentication(deps, {
      challenge: second.options.challenge,
      response: authenticator.authenticate(second.options.challenge, { incrementCounter: false }) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(cloned.status).toBe('counter_regression')

    const revoked = await store.getPasskeyCredential(authenticator.credentialIdB64)

    expect(revoked?.revokedAt).not.toBeNull()
    expect(revoked?.revokeReason).toBe('counter_regression')
    // Y no abrió sesión.
    expect(store.sessions.size).toBe(1)
  })

  it('una credencial revocada ya no autentica', async () => {
    const { deps, store } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER })

    await registerCredential(deps, authenticator)
    await store.revokePasskeyCredential({
      credentialId: authenticator.credentialIdB64,
      now: new Date('2026-09-04T12:00:00.000Z'),
      reason: 'operator'
    })

    const started = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })

    const result = await finishPasskeyAuthentication(deps, {
      challenge: started.options.challenge,
      response: authenticator.authenticate(started.options.challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(result.status === 'rejected' && result.reason).toBe('unknown_credential')
  })

  it('si el acceso se revocó, la aserción válida NO abre sesión', async () => {
    const { deps, store } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER })

    await registerCredential(deps, authenticator)
    store.links.get(LINK_ID)!.active = false

    const started = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })

    const result = await finishPasskeyAuthentication(deps, {
      challenge: started.options.challenge,
      response: authenticator.authenticate(started.options.challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(result.status).toBe('access_revoked')
    expect(store.sessions.size).toBe(0)
  })

  it('el reto de autenticación no se puede reusar', async () => {
    const { deps } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER })

    await registerCredential(deps, authenticator)

    const started = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })
    const challenge = started.options.challenge

    await finishPasskeyAuthentication(deps, {
      challenge,
      response: authenticator.authenticate(challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    const replay = await finishPasskeyAuthentication(deps, {
      challenge,
      response: authenticator.authenticate(challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(replay.status === 'rejected' && replay.reason).toBe('challenge_invalid')
  })

  it('un reto de registro no vale para autenticar (ni al revés)', async () => {
    const { deps } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER })

    await registerCredential(deps, authenticator)

    const registration = await startPasskeyRegistration(deps, {
      subject: SUBJECT,
      displayName: null,
      ipHash: null,
      correlationId: null
    })

    if (registration.status !== 'ready') throw new Error('registro no arrancó')

    const result = await finishPasskeyAuthentication(deps, {
      challenge: registration.options.challenge,
      response: authenticator.authenticate(registration.options.challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(result.status === 'rejected' && result.reason).toBe('challenge_invalid')
  })

  it('un reto vencido no verifica', async () => {
    const { deps, clock } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER })

    await registerCredential(deps, authenticator)

    const started = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })

    clock.current = new Date(clock.current.getTime() + (config.passkeyChallengeTtlSeconds + 1) * 1000)

    const result = await finishPasskeyAuthentication(deps, {
      challenge: started.options.challenge,
      response: authenticator.authenticate(started.options.challenge) as never,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(result.status === 'rejected' && result.reason).toBe('challenge_invalid')
  })
})

describe('regla del contador', () => {
  it('un contador que se queda en 0 NO es regresión: los passkeys sincronizados no lo mueven', () => {
    expect(isCounterRegression(0, 0)).toBe(false)
    expect(isCounterRegression(0, 5)).toBe(false)
  })

  it('retroceder o repetir un contador que ya avanzó SÍ lo es', () => {
    expect(isCounterRegression(5, 4)).toBe(true)
    expect(isCounterRegression(5, 5)).toBe(true)
    expect(isCounterRegression(5, 6)).toBe(false)
  })
})

describe('amr', () => {
  it('`uv` sale del flag de la aserción, nunca de lo que declare el cliente', () => {
    expect(buildPasskeyAmr({ userVerified: true })).toEqual(['passkey', 'uv'])
    expect(buildPasskeyAmr({ userVerified: false })).toEqual(['passkey'])
  })
})

describe('almacenamiento del reto', () => {
  it('sólo se guarda el sha256 del reto, nunca el valor crudo', async () => {
    const { deps, store } = buildDeps()
    const started = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })
    const stored = [...store.challenges.values()][0]

    expect(stored?.challengeHash).toBe(createHash('sha256').update(started.options.challenge).digest('hex'))
    expect(JSON.stringify([...store.challenges.values()])).not.toContain(started.options.challenge)
  })
})

describe('public passkey rate limits', () => {
  const harness = () => {
    const { deps, store, clock } = buildDeps()

    const handler = createPersonAuthHandler({
      internalLoginEnabled: () => false,
      ...deps,
      issuer: ISSUER,
      expectedSourceSystem: `external_idp:${ENVIRONMENT_ID}`,
      mailer: { send: async () => undefined },
      invitations: { accept: async () => ({ status: 'rejected', reason: 'not_found' }) },
      mintSubject: () => 'unused',
      totpCipher: createInMemoryTotpCipher(),
      sleep: async () => undefined
    })

    const request = (action: string, ip: string | null = '203.0.113.44', cookie = '') =>
      handler({
        method: 'POST',
        url: new URL(`/auth/passkeys/${action.replace('step_up', 'step-up').replace('_', '/')}`, ISSUER),
        headers: new Headers({ origin: ISSUER, ...(ip ? { 'x-forwarded-for': ip } : {}), cookie }),
        body: '{}'
      })

    return { deps, store, clock, request, handler }
  }

  it('blocks a valid assertion submitted from a hostile HTTP origin before consuming the challenge', async () => {
    const { deps, store, handler } = harness()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER })

    await registerCredential(deps, authenticator)
    const started = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })
    const claim = vi.spyOn(store, 'claimPasskeyChallenge')
    const body = JSON.stringify({ challenge: started.options.challenge, response: authenticator.authenticate(started.options.challenge), padding: '=' })
    const submit = (origin: string) => handler({ method: 'POST', url: new URL('/auth/passkeys/authenticate/finish', ISSUER), headers: new Headers({ origin, 'content-type': 'text/plain' }), body })
    const hostile = await submit('https://attacker.example')

    expect(hostile?.status).toBe(403)
    expect(hostile?.headers['Set-Cookie']).toBeUndefined()
    expect(claim).not.toHaveBeenCalled()
    expect(store.sessions.size).toBe(0)
    const accepted = await submit(ISSUER)

    expect(accepted?.status).toBe(200)
    expect(accepted?.headers['Set-Cookie']).toContain('__Host-efeonce_auth=')
    expect(claim).toHaveBeenCalledOnce()
    expect(store.sessions.size).toBe(1)
  })

  it('returns 429 before challenge insertion or challenge consumption on all public ceremonies', async () => {
    for (const [action, rule] of Object.entries(PASSKEY_IP_RULES)) {
      const { deps, store, clock, request } = harness()
      const insert = vi.spyOn(store, 'insertPasskeyChallenge')
      const consume = vi.spyOn(store, 'claimPasskeyChallenge')

      for (let count = 0; count < rule.limit; count++) {
        await enforceRateLimit({ store, config: deps.config, rule, value: '203.0.113.44', now: clock.current })
      }

      const result = await request(action)

      expect(result?.status).toBe(429)
      expect(Number(result?.headers['Retry-After'])).toBeGreaterThan(0)
      expect(insert).not.toHaveBeenCalled()
      expect(consume).not.toHaveBeenCalled()
      expect(store.attempts.at(-1)).toMatchObject({
        method: 'passkey',
        outcome: 'rate_limited',
        details: { dimension: 'ip', action: rule.action }
      })
      expect(JSON.stringify(store.attempts)).not.toContain('203.0.113.44')
    }
  })

  it('keeps registration bound by subject even when the caller changes IP', async () => {
    const { deps, store, clock, request } = harness()

    const session = await createPersonSession({
      store,
      config: deps.config,
      now: clock.current,
      input: {
        subject: SUBJECT,
        environmentId: ENVIRONMENT_ID,
        profileId: 'prof-1',
        linkId: LINK_ID,
        amr: ['magic_link'],
        authTime: clock.current,
        ipHash: null,
        userAgentHash: null,
        correlationId: null
      }
    })

    for (let count = 0; count < PASSKEY_REGISTER_SUBJECT_RULE.limit; count++) {
      await enforceRateLimit({
        store,
        config: deps.config,
        rule: PASSKEY_REGISTER_SUBJECT_RULE,
        value: SUBJECT,
        now: clock.current
      })
    }

    const insert = vi.spyOn(store, 'insertPasskeyChallenge')

    const response = await request(
      'register_start',
      '203.0.113.99',
      `${deps.config.sessionCookieName}=${session.sessionId}`
    )

    expect(response?.status).toBe(429)
    expect(insert).not.toHaveBeenCalled()
    expect(store.attempts.at(-1)).toMatchObject({ outcome: 'rate_limited', details: { dimension: 'subject' } })
    expect(JSON.stringify(store.attempts)).not.toContain(SUBJECT)
  })

  it('bounds anonymous start allocations with a real limiter and puts missing IPs in a shared bucket', async () => {
    const { store, request } = harness()

    for (let count = 0; count < PASSKEY_IP_RULES.authenticate_start.limit; count++) {
      expect((await request('authenticate_start', null))?.status).toBe(200)
    }

    const allocated = store.challenges.size

    expect((await request('authenticate_start', null))?.status).toBe(429)
    expect(store.challenges.size).toBe(allocated)
    expect((await request('authenticate_start', '203.0.113.45'))?.status).toBe(200)
  })
})

describe('TASK-1836 explicit UV step-up on existing corporate session', () => {
  const corporateSession = async (deps: PasskeyDeps) =>
    createPersonSession({
      store: deps.store,
      config: deps.config,
      now: deps.now(),
      input: {
        subject: SUBJECT,
        environmentId: ENVIRONMENT_ID,
        profileId: 'prof-1',
        linkId: LINK_ID,
        amr: ['entra_oidc'],
        authTime: deps.now(),
        stepUp: false,
        ipHash: null,
        userAgentHash: null,
        correlationId: null
      }
    })

  it('verifies a real UV signature without changing session hash, primary auth time or corporate provenance', async () => {
    const { deps, store, clock } = buildDeps()
    const authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER, userVerified: true })

    await registerCredential(deps, authenticator)

    const existing = await corporateSession(deps),
      before = store.sessions.get(existing.record.sessionHash)!

    const authTime = before.authTime.getTime(),
      sessionHash = before.sessionHash

    clock.current = new Date(clock.current.getTime() + 60000)
    const started = await startPasskeyStepUp(deps, { sessionHash, ipHash: null, correlationId: null })

    if (started.status !== 'ready') throw new Error('stepup_not_ready')
    expect(started.options.userVerification).toBe('required')
    const response = authenticator.authenticate(started.options.challenge)

    const result = await finishPasskeyStepUp(deps, {
      sessionHash,
      challenge: started.options.challenge,
      response: response as never
    })

    expect(result.status).toBe('verified')
    expect(store.sessions.size).toBe(1)
    const after = store.sessions.get(sessionHash)!

    expect(after.amr).toEqual(expect.arrayContaining(['entra_oidc', 'passkey', 'uv']))
    expect(after.authTime.getTime()).toBe(authTime)
    expect(after.stepUpAt?.getTime()).toBe(clock.current.getTime())
    expect(resolveAuthLevel(after, config, clock.current)).toBe('step_up')
    expect(
      (
        await finishPasskeyStepUp(deps, {
          sessionHash,
          challenge: started.options.challenge,
          response: response as never
        })
      ).status
    ).toBe('rejected')
  })
  it('cannot spend a challenge in a different session for the same person', async () => {
    const { deps, store } = buildDeps(),
      authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER, userVerified: true })

    await registerCredential(deps, authenticator)

    const a = await corporateSession(deps),
      b = await corporateSession(deps)

    const started = await startPasskeyStepUp(deps, {
      sessionHash: a.record.sessionHash,
      ipHash: null,
      correlationId: null
    })

    if (started.status !== 'ready') throw new Error('stepup_not_ready')
    expect(
      (
        await finishPasskeyStepUp(deps, {
          sessionHash: b.record.sessionHash,
          challenge: started.options.challenge,
          response: authenticator.authenticate(started.options.challenge) as never
        })
      ).status
    ).toBe('rejected')
    expect(store.sessions.get(b.record.sessionHash)?.stepUpAt).toBeNull()
  })
  it('requires genuine UV and rejects a normal login challenge used as step-up', async () => {
    const { deps } = buildDeps(),
      authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER, userVerified: false })

    await registerCredential(deps, authenticator)
    const session = await corporateSession(deps)

    const started = await startPasskeyStepUp(deps, {
      sessionHash: session.record.sessionHash,
      ipHash: null,
      correlationId: null
    })

    if (started.status !== 'ready') throw new Error('stepup_not_ready')
    expect(
      (
        await finishPasskeyStepUp(deps, {
          sessionHash: session.record.sessionHash,
          challenge: started.options.challenge,
          response: authenticator.authenticate(started.options.challenge) as never
        })
      ).status
    ).toBe('rejected')
    const login = await startPasskeyAuthentication(deps, { ipHash: null, correlationId: null })

    expect(
      (
        await finishPasskeyStepUp(deps, {
          sessionHash: session.record.sessionHash,
          challenge: login.options.challenge,
          response: authenticator.authenticate(login.options.challenge) as never
        })
      ).status
    ).toBe('rejected')
  })
  it('cannot elevate another person with a valid credential or use step-up as a login', async () => {
    const { deps, store } = buildDeps(),
      authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER, userVerified: true })

    await registerCredential(deps, authenticator)
    store.registerLink({
      linkId: 'other-link',
      subject: 'other-person',
      sourceSystem: `external_idp:${ENVIRONMENT_ID}`,
      active: true
    })

    const other = await createPersonSession({
      store,
      config,
      now: deps.now(),
      input: {
        subject: 'other-person',
        environmentId: ENVIRONMENT_ID,
        profileId: 'other-profile',
        linkId: 'other-link',
        amr: ['entra_oidc'],
        authTime: deps.now(),
        stepUp: false,
        ipHash: null,
        userAgentHash: null,
        correlationId: null
      }
    })

    const started = await startPasskeyStepUp(deps, {
      sessionHash: other.record.sessionHash,
      ipHash: null,
      correlationId: null
    })

    if (started.status !== 'ready') throw new Error('stepup_not_ready')
    expect(
      (
        await finishPasskeyStepUp(deps, {
          sessionHash: other.record.sessionHash,
          challenge: started.options.challenge,
          response: authenticator.authenticate(started.options.challenge) as never
        })
      ).status
    ).toBe('rejected')
    expect(store.sessions.get(other.record.sessionHash)?.stepUpAt).toBeNull()
    const own = await corporateSession(deps)

    const another = await startPasskeyStepUp(deps, {
      sessionHash: own.record.sessionHash,
      ipHash: null,
      correlationId: null
    })

    if (another.status !== 'ready') throw new Error('stepup_not_ready')
    expect(
      (
        await finishPasskeyAuthentication(deps, {
          challenge: another.options.challenge,
          response: authenticator.authenticate(another.options.challenge) as never,
          ipHash: null,
          userAgentHash: null,
          correlationId: null
        })
      ).status
    ).toBe('rejected')
    expect(store.sessions.size).toBe(2)
  })
  it('does not report success when revocation wins after WebAuthn verification', async () => {
    const { deps, store } = buildDeps(),
      authenticator = new SoftwareAuthenticator({ rpId: RP_ID, origin: ISSUER, userVerified: true })

    await registerCredential(deps, authenticator)
    const session = await corporateSession(deps)

    const started = await startPasskeyStepUp(deps, {
      sessionHash: session.record.sessionHash,
      ipHash: null,
      correlationId: null
    })

    if (started.status !== 'ready') throw new Error('stepup_not_ready')
    const apply = store.recordBoundSessionStepUp.bind(store)

    vi.spyOn(store, 'recordBoundSessionStepUp').mockImplementation(async input => {
      await store.revokeSession({ sessionHash: input.sessionHash, now: deps.now(), reason: 'concurrent_revoke' })

      return apply(input)
    })
    expect(
      (
        await finishPasskeyStepUp(deps, {
          sessionHash: session.record.sessionHash,
          challenge: started.options.challenge,
          response: authenticator.authenticate(started.options.challenge) as never
        })
      ).status
    ).toBe('access_revoked')
    expect(store.sessions.get(session.record.sessionHash)?.stepUpAt).toBeNull()
  })
})
