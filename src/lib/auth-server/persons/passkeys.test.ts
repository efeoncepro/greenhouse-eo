import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { AUTH_SERVER_PERSON_AUTH_DEFAULTS, type AuthServerPersonAuthConfig } from './config'
import type { PersonDirectoryPort } from './magic-link'
import {
  buildPasskeyAmr,
  deriveRpId,
  finishPasskeyAuthentication,
  finishPasskeyRegistration,
  isCounterRegression,
  startPasskeyAuthentication,
  startPasskeyRegistration,
  type PasskeyDeps
} from './passkeys'
import { resolveAuthLevel } from './sessions'
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

  store.registerLink({ linkId: LINK_ID, subject: SUBJECT, sourceSystem: `external_idp:${ENVIRONMENT_ID}`, active: linkActive })

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

    expect(
      resultA.status === 'authenticated' && resolveAuthLevel(resultA.session.record, config, now)
    ).toBe('step_up')
    expect(
      resultB.status === 'authenticated' && resolveAuthLevel(resultB.session.record, config, now)
    ).toBe('primary')
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
