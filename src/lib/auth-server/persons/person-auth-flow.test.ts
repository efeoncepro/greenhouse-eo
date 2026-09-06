import { createHash, randomUUID } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_SERVER_PERSON_AUTH_DEFAULTS, type AuthServerPersonAuthConfig } from './config'
import type { InvitationAcceptancePort } from './invitations'
import type { MagicLinkMailerPort, PersonDirectoryPort } from './magic-link'
import { buildMagicLinkUrl, parseMagicLinkToken } from './magic-link'
import { createPersonAuthHandler, isPersonAuthPath } from './routes'
import { resolveAuthLevel } from './sessions'
import { InMemoryPersonAuthStore } from './store/memory-store'
import { createInMemoryTotpCipher } from './totp-cipher'
import { createPersonSubjectPort } from './subject-port'
import type { PersonSessionRecord } from './types'
import { headersFromRecord, type OAuthHttpRequest } from '../oauth/http'

/**
 * Flujo completo de la autenticación de personas (TASK-1830) contra el router REAL, con el store en
 * memoria. Lo que estos tests protegen no es el happy path: son las cuatro propiedades por las que
 * existe el diseño — indistinguibilidad, consumo único, muerte de la sesión al revocar el link, y
 * que `step_up` no se pueda declarar.
 */

const ENVIRONMENT_ID = 'efeonce-auth'
const SOURCE_SYSTEM = `external_idp:${ENVIRONMENT_ID}`
const ISSUER = 'https://auth.efeonce.org'
const LINK_ID = 'ipsl-test-1'
const SUBJECT = 'subject-abc'
const EMAIL = 'persona@cliente.example'

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

const config: AuthServerPersonAuthConfig = {
  ...AUTH_SERVER_PERSON_AUTH_DEFAULTS,
  personAuthEnabled: true
}

type Harness = {
  store: InMemoryPersonAuthStore
  handler: ReturnType<typeof createPersonAuthHandler>
  sent: Array<{ email: string; url: string }>
  clock: { current: Date }
  sleeps: number[]
  invitationEmail: string
  acceptedSubjects: string[]
}

const buildHarness = (
  options: { linkActive?: boolean; knownEmail?: boolean; internalLoginEnabled?: boolean; supersededOnAccept?: string[] } = {}
): Harness => {
  const supersededOnAccept = options.supersededOnAccept ?? []
  const store = new InMemoryPersonAuthStore()
  const sent: Array<{ email: string; url: string }> = []
  const sleeps: number[] = []
  const clock = { current: new Date('2026-09-04T12:00:00.000Z') }
  const acceptedSubjects: string[] = []
  const invitationEmail = 'invitada@cliente.example'

  store.registerLink({
    linkId: LINK_ID,
    subject: SUBJECT,
    sourceSystem: SOURCE_SYSTEM,
    active: options.linkActive ?? true
  })

  const person = { linkId: LINK_ID, profileId: 'prof-1', subject: SUBJECT, email: EMAIL }

  const directory: PersonDirectoryPort = {
    findBySubject: async ({ subject }) => {
      const link = store.links.get(LINK_ID)

      if (!link?.active || subject !== SUBJECT) return null

      return person
    },
    findByEmail: async ({ email }) => {
      if (options.knownEmail === false) return null

      return email === EMAIL ? person : null
    }
  }

  const mailer: MagicLinkMailerPort = {
    send: async ({ email, url }) => {
      sent.push({ email, url })
    }
  }

  const invitations: InvitationAcceptancePort = {
    accept: async ({ token, subject }) => {
      acceptedSubjects.push(subject)

      if (token !== 'invitation-token-valida-0123456789') return { status: 'rejected', reason: 'not_found' }

      return {
        status: 'linked',
        profileId: 'prof-2',
        linkId: 'ipsl-test-2',
        email: invitationEmail,
        supersededSubjects: supersededOnAccept
      }
    }
  }

  const handler = createPersonAuthHandler({
    internalLoginEnabled: () => options.internalLoginEnabled ?? false,
    store,
    config,
    directory,
    mailer,
    invitations,
    mintSubject: () => `minted-${randomUUID()}`,
    environmentId: ENVIRONMENT_ID,
    expectedSourceSystem: SOURCE_SYSTEM,
    issuer: ISSUER,
    rpId: 'auth.efeonce.org',
    totpCipher: createInMemoryTotpCipher(),
    now: () => clock.current,
    sleep: async ms => {
      sleeps.push(ms)
    }
  })

  return { store, handler, sent, clock, sleeps, invitationEmail, acceptedSubjects }
}

const request = (
  method: string,
  path: string,
  options: { body?: string; form?: boolean; cookie?: string; ip?: string; accept?: string } = {}
): OAuthHttpRequest => ({
  method,
  url: new URL(path, ISSUER),
  headers: headersFromRecord({
    origin: ISSUER,
    accept: options.accept ?? 'application/json',
    'content-type': options.form ? 'application/x-www-form-urlencoded' : 'application/json',
    'x-forwarded-for': options.ip ?? '203.0.113.10',
    ...(options.cookie ? { cookie: options.cookie } : {})
  }),
  body: options.body ?? ''
})

const requestMagicLinkFor = (harness: Harness, email: string, ip = '203.0.113.10') =>
  harness.handler(request('POST', '/auth/magic-link/request', { body: JSON.stringify({ email }), ip }))

describe('superficie de personas — enrutamiento y flag', () => {
  it('reconoce las rutas propias, incluidas las dinámicas', () => {
    expect(isPersonAuthPath('/login')).toBe(true)
    expect(isPersonAuthPath('/auth/magic-link/request')).toBe(true)
    expect(isPersonAuthPath('/m/abc.def')).toBe(true)
    expect(isPersonAuthPath('/i/token')).toBe(true)
    expect(isPersonAuthPath('/oauth/authorize')).toBe(false)
  })

  it('con el flag apagado responde 404, no 403: un 403 confirmaría que la ruta existe', async () => {
    const harness = buildHarness()

    const handler = createPersonAuthHandler({
      internalLoginEnabled: () => false,
      store: harness.store,
      config: { ...config, personAuthEnabled: false },
      directory: { findBySubject: async () => null, findByEmail: async () => null },
      mailer: { send: async () => undefined },
      invitations: { accept: async () => ({ status: 'rejected' as const, reason: 'disabled' }) },
      mintSubject: () => 'x',
      environmentId: ENVIRONMENT_ID,
      expectedSourceSystem: SOURCE_SYSTEM,
      issuer: ISSUER,
      rpId: 'auth.efeonce.org',
      totpCipher: createInMemoryTotpCipher(),
      now: () => new Date()
    })

    const response = await handler(request('GET', '/login'))

    expect(response?.status).toBe(404)
  })
})

describe('magic link — anti-enumeración', () => {
  it('un correo con acceso y uno sin acceso son indistinguibles en código, cuerpo y encabezados', async () => {
    const known = buildHarness()
    const unknown = buildHarness({ knownEmail: false })

    const knownResponse = await requestMagicLinkFor(known, EMAIL)
    const unknownResponse = await requestMagicLinkFor(unknown, 'nadie@cliente.example')

    expect(knownResponse?.status).toBe(202)
    expect(unknownResponse?.status).toBe(knownResponse?.status)
    expect(unknownResponse?.body).toBe(knownResponse?.body)
    expect(unknownResponse?.headers).toEqual(knownResponse?.headers)

    // Y la diferencia real ocurrió: uno emitió enlace, el otro no.
    expect(known.sent).toHaveLength(1)
    expect(unknown.sent).toHaveLength(0)
  })

  it('ambos caminos esperan hasta el mismo piso de latencia', async () => {
    const known = buildHarness()
    const unknown = buildHarness({ knownEmail: false })

    await requestMagicLinkFor(known, EMAIL)
    await requestMagicLinkFor(unknown, 'nadie@cliente.example')

    // El reloj inyectado no avanza, así que ambos esperan el piso completo: la propiedad que se
    // verifica es que el camino "no existe" TAMBIÉN espera, no el número exacto.
    expect(known.sleeps).toEqual([config.antiEnumerationFloorMs])
    expect(unknown.sleeps).toEqual([config.antiEnumerationFloorMs])
  })

  it('el cooldown por correo devuelve el mismo 202, no un 429 que delataría el bucket', async () => {
    const harness = buildHarness()

    const first = await requestMagicLinkFor(harness, EMAIL)
    const second = await requestMagicLinkFor(harness, EMAIL)

    expect(first?.status).toBe(202)
    expect(second?.status).toBe(202)
    expect(second?.body).toBe(first?.body)
    expect(harness.sent).toHaveLength(1)
  })

  it('el límite por IP sí responde 429: no depende del correo, así que no es un oráculo', async () => {
    const harness = buildHarness()

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await requestMagicLinkFor(harness, `persona${attempt}@cliente.example`)
    }

    const blocked = await requestMagicLinkFor(harness, 'otra@cliente.example')

    expect(blocked?.status).toBe(429)
    expect(blocked?.headers['Retry-After']).toBeDefined()
  })
})

describe('magic link — consumo', () => {
  const extractToken = (harness: Harness): string => {
    const url = harness.sent[0]?.url ?? ''

    return url.slice(`${ISSUER}/m/`.length)
  }

  it('abre sesión, entrega la cookie `__Host-` y deja el enlace consumido', async () => {
    const harness = buildHarness()

    await requestMagicLinkFor(harness, EMAIL)

    const token = extractToken(harness)

    const response = await harness.handler(
      request('POST', '/auth/magic-link/consume', { body: JSON.stringify({ token }) })
    )

    expect(response?.status).toBe(200)

    const cookie = response?.headers['Set-Cookie'] ?? ''

    expect(cookie).toContain('__Host-efeonce_auth=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
    expect(cookie).not.toContain('Domain=')

    expect(harness.store.sessions.size).toBe(1)
    expect([...harness.store.magicLinks.values()][0]?.consumedAt).not.toBeNull()
  })

  it('un segundo consumo del mismo enlace falla: el UPDATE condicional gana la carrera', async () => {
    const harness = buildHarness()

    await requestMagicLinkFor(harness, EMAIL)

    const token = extractToken(harness)

    await harness.handler(request('POST', '/auth/magic-link/consume', { body: JSON.stringify({ token }) }))

    const second = await harness.handler(
      request('POST', '/auth/magic-link/consume', { body: JSON.stringify({ token }) })
    )

    expect(second?.status).toBe(400)
    expect(harness.store.sessions.size).toBe(1)
  })

  it('un verificador equivocado sobre un tokenId válido QUEMA el enlace', async () => {
    const harness = buildHarness()

    await requestMagicLinkFor(harness, EMAIL)

    const parsed = parseMagicLinkToken(extractToken(harness))

    expect(parsed).not.toBeNull()

    const tampered = `${parsed!.tokenId}.${'A'.repeat(43)}`

    const response = await harness.handler(
      request('POST', '/auth/magic-link/consume', { body: JSON.stringify({ token: tampered }) })
    )

    expect(response?.status).toBe(400)
    expect(harness.store.sessions.size).toBe(0)
    // Quemado: el enlace legítimo ya no sirve. Es la respuesta segura a un sondeo.
    expect([...harness.store.magicLinks.values()][0]?.consumedAt).not.toBeNull()
  })

  it('el enlace vencido no abre sesión', async () => {
    const harness = buildHarness()

    await requestMagicLinkFor(harness, EMAIL)

    const token = extractToken(harness)

    harness.clock.current = new Date(harness.clock.current.getTime() + (config.magicLinkTtlSeconds + 1) * 1000)

    const response = await harness.handler(
      request('POST', '/auth/magic-link/consume', { body: JSON.stringify({ token }) })
    )

    expect(response?.status).toBe(400)
    expect(harness.store.sessions.size).toBe(0)
  })

  it('si el acceso se revocó entre la emisión y el consumo, no nace sesión', async () => {
    const harness = buildHarness()

    await requestMagicLinkFor(harness, EMAIL)

    const token = extractToken(harness)
    const link = harness.store.links.get(LINK_ID)!

    link.active = false

    const response = await harness.handler(
      request('POST', '/auth/magic-link/consume', { body: JSON.stringify({ token }) })
    )

    expect(response?.status).toBe(403)
    expect(harness.store.sessions.size).toBe(0)
  })

  it('el `return_to` sólo puede ser un path propio: un `//host` no redirige fuera', async () => {
    const harness = buildHarness()

    await harness.handler(
      request('POST', '/auth/magic-link/request', {
        body: JSON.stringify({ email: EMAIL, return_to: '//evil.example/steal' })
      })
    )

    const stored = [...harness.store.magicLinks.values()][0]

    expect(stored?.returnTo).toBeNull()
  })

  it('la URL del enlace tiene la forma `<issuer>/m/<tokenId>.<verificador>`', async () => {
    const harness = buildHarness()

    await requestMagicLinkFor(harness, EMAIL)

    const parsed = parseMagicLinkToken(extractToken(harness))

    expect(parsed).not.toBeNull()
    expect(harness.sent[0]?.url).toBe(buildMagicLinkUrl(ISSUER, parsed!.tokenId, parsed!.verifier))
  })
})

describe('invitación — bootstrap del sujeto', () => {
  it('acuña el sujeto, liga la persona y manda el enlace al correo DEL OPERADOR, no al de la request', async () => {
    const harness = buildHarness()

    const response = await harness.handler(
      request('POST', '/auth/invitations/accept', {
        body: JSON.stringify({ token: 'invitation-token-valida-0123456789', email: 'atacante@evil.example' })
      })
    )

    expect(response?.status).toBe(202)
    expect(harness.acceptedSubjects).toHaveLength(1)
    expect(harness.acceptedSubjects[0]).toMatch(/^minted-/)
    expect(harness.sent[0]?.email).toBe(harness.invitationEmail)
  })

  it('aceptar NO abre sesión: entrar sigue exigiendo el buzón', async () => {
    const harness = buildHarness()

    const response = await harness.handler(
      request('POST', '/auth/invitations/accept', {
        body: JSON.stringify({ token: 'invitation-token-valida-0123456789' })
      })
    )

    expect(response?.headers['Set-Cookie']).toBeUndefined()
    expect(harness.store.sessions.size).toBe(0)
  })

  it('un token inválido responde igual que uno inexistente', async () => {
    const harness = buildHarness()

    const response = await harness.handler(
      request('POST', '/auth/invitations/accept', { body: JSON.stringify({ token: 'no-existe-0123456789' }) })
    )

    expect(response?.status).toBe(400)
    expect(harness.sent).toHaveLength(0)
  })
})

describe('sesión — vida y muerte', () => {
  const openSession = async (harness: Harness): Promise<string> => {
    await requestMagicLinkFor(harness, EMAIL)

    const token = harness.sent[0]!.url.slice(`${ISSUER}/m/`.length)

    const response = await harness.handler(
      request('POST', '/auth/magic-link/consume', { body: JSON.stringify({ token }) })
    )

    return (response?.headers['Set-Cookie'] ?? '').split(';')[0] ?? ''
  }

  it('`/auth/session` describe la sesión sin devolver el `sub` crudo', async () => {
    const harness = buildHarness()
    const cookie = await openSession(harness)

    const response = await harness.handler(request('GET', '/auth/session', { cookie }))
    const body = JSON.parse(response?.body ?? '{}')

    expect(response?.status).toBe(200)
    expect(body.status).toBe('authenticated')
    expect(body.authLevel).toBe('primary')
    expect(body.amr).toEqual(['magic_link'])
    expect(JSON.stringify(body)).not.toContain(SUBJECT)
    expect(body.subjectRef).toBe(sha256(SUBJECT).slice(0, 32))
  })

  it.each(['magic_link', 'entra_oidc'] as const)('shows the authenticated HTML landing and logout for %s', async method => {
    const harness = buildHarness({ internalLoginEnabled: true })
    const cookie = await openSession(harness)

    for (const session of harness.store.sessions.values()) session.amr = [method]
    const page = await harness.handler(request('GET', '/auth/session', { cookie, accept: 'text/html' }))

    expect(page?.status).toBe(200)
    expect(page?.headers['Content-Type']).toContain('text/html')
    expect(page?.headers.Vary).toBe('Accept')
    expect(page?.body).toContain('Tu sesión de Efeonce ID está activa')
    expect(page?.body).toContain('action="/auth/session/logout"')
    expect(page?.body).not.toContain(SUBJECT)
    expect(page?.body).not.toContain('subjectRef')
    const api = await harness.handler(request('GET', '/auth/session', { cookie, accept: 'text/html;q=0,application/json' }))

    expect(JSON.parse(api!.body).status).toBe('authenticated')
    await harness.handler(request('POST', '/auth/session/logout', { cookie, form: true }))
    const revoked = await harness.handler(request('GET', '/auth/session', { cookie, accept: 'text/html' }))

    expect(revoked?.status).toBe(401)
    expect(revoked?.body).toContain('Continuar con Microsoft')
    expect(revoked?.body).not.toContain('Tu sesión de Efeonce ID está activa')
  })

  it('never displays an active session for an anonymous browser', async () => {
    const page = await buildHarness({ internalLoginEnabled: true }).handler(request('GET', '/auth/session', { accept: 'text/html' }))

    expect(page?.status).toBe(401)
    expect(page?.body).not.toContain('Tu sesión de Efeonce ID está activa')
    expect(page?.body).toContain('href="/auth/internal/login"')
  })

  it('revocar el source link mata la sesión EN EL SIGUIENTE request', async () => {
    const harness = buildHarness()
    const cookie = await openSession(harness)

    expect((await harness.handler(request('GET', '/auth/session', { cookie })))?.status).toBe(200)

    harness.store.links.get(LINK_ID)!.active = false

    const after = await harness.handler(request('GET', '/auth/session', { cookie }))

    expect(after?.status).toBe(401)

    // No basta con responder 401: la sesión queda revocada en el store, no vuelve si el link revive.
    const session = [...harness.store.sessions.values()][0]

    expect(session?.revokedAt).not.toBeNull()
    expect(session?.revokeReason).toBe('source_link_revoked')
  })

  it('el `SubjectSessionPort` devuelve la persona a `authorize`, y `null` cuando el link murió', async () => {
    const harness = buildHarness()
    const cookie = await openSession(harness)
    const invalidations: string[] = []

    const port = createPersonSubjectPort({
      store: harness.store,
      config,
      environmentId: ENVIRONMENT_ID,
      expectedSourceSystem: SOURCE_SYSTEM,
      now: () => harness.clock.current,
      onInvalidSession: status => invalidations.push(status)
    })

    const authorized = await port.resolve(request('GET', '/oauth/authorize', { cookie }))

    expect(authorized?.subject).toBe(SUBJECT)
    expect(authorized?.environmentId).toBe(ENVIRONMENT_ID)
    expect(authorized?.authLevel).toBe('primary')

    harness.store.links.get(LINK_ID)!.active = false

    expect(await port.resolve(request('GET', '/oauth/authorize', { cookie }))).toBeNull()
    expect(invalidations).toEqual(['link_revoked'])
  })

  it('con el flag apagado el port devuelve `null` aunque la cookie sea válida', async () => {
    const harness = buildHarness()
    const cookie = await openSession(harness)

    const port = createPersonSubjectPort({
      store: harness.store,
      config: { ...config, personAuthEnabled: false },
      environmentId: ENVIRONMENT_ID,
      expectedSourceSystem: SOURCE_SYSTEM,
      now: () => harness.clock.current
    })

    expect(await port.resolve(request('GET', '/oauth/authorize', { cookie }))).toBeNull()
  })

  it('el logout revoca la sesión y limpia la cookie', async () => {
    const harness = buildHarness()
    const cookie = await openSession(harness)

    const response = await harness.handler(request('POST', '/auth/session/logout', { cookie }))

    expect(response?.status).toBe(200)
    expect(response?.headers['Set-Cookie']).toContain('Max-Age=0')
    expect([...harness.store.sessions.values()][0]?.revokeReason).toBe('logout')
  })
})

describe('step-up — no se declara, se demuestra', () => {
  const baseSession = (overrides: Partial<PersonSessionRecord>): PersonSessionRecord => ({
    sessionHash: 'x'.repeat(64),
    subject: SUBJECT,
    environmentId: ENVIRONMENT_ID,
    profileId: 'prof-1',
    linkId: LINK_ID,
    amr: ['magic_link'],
    authTime: new Date('2026-09-04T12:00:00.000Z'),
    stepUpAt: null,
    createdAt: new Date('2026-09-04T12:00:00.000Z'),
    lastSeenAt: new Date('2026-09-04T12:00:00.000Z'),
    expiresAt: new Date('2026-09-05T00:00:00.000Z'),
    absoluteExpiresAt: new Date('2026-09-11T12:00:00.000Z'),
    revokedAt: null,
    revokeReason: null,
    ipHash: null,
    userAgentHash: null,
    correlationId: null,
    ...overrides
  })

  const now = new Date('2026-09-04T12:05:00.000Z')

  it('un magic link reciente NUNCA es step-up: no es un segundo factor', () => {
    expect(resolveAuthLevel(baseSession({ amr: ['magic_link'] }), config, now)).toBe('primary')
  })

  it('un passkey SIN user verification tampoco alcanza', () => {
    expect(resolveAuthLevel(baseSession({ amr: ['passkey'] }), config, now)).toBe('primary')
  })

  it('un passkey con `uv` reciente sí, y un TOTP reciente también', () => {
    expect(resolveAuthLevel(baseSession({ amr: ['passkey', 'uv'] }), config, now)).toBe('step_up')
    expect(resolveAuthLevel(baseSession({ amr: ['magic_link', 'totp'], stepUpAt: now }), config, now)).toBe('step_up')
  })

  it('un factor fuerte VIEJO deja de valer: un TOTP de ayer no autoriza mover dinero hoy', () => {
    const stale = new Date(now.getTime() - (config.stepUpMaxAgeSeconds + 60) * 1000)

    expect(resolveAuthLevel(baseSession({ amr: ['totp'], stepUpAt: stale }), config, now)).toBe('primary')
  })
})

describe('ledger de intentos', () => {
  let harness: Harness

  beforeEach(() => {
    harness = buildHarness()
  })

  it('registra cada intento sin PII: sujeto hasheado y ningún correo en claro', async () => {
    await requestMagicLinkFor(harness, EMAIL)

    const serialized = JSON.stringify(harness.store.attempts)

    expect(harness.store.attempts).toHaveLength(1)
    expect(harness.store.attempts[0]?.subjectHash).toBe(sha256(SUBJECT))
    expect(serialized).not.toContain(EMAIL)
    expect(serialized).not.toContain(SUBJECT)
  })

  it('un correo desconocido también deja rastro, con su motivo, para que el forense exista', async () => {
    const unknown = buildHarness({ knownEmail: false })

    await requestMagicLinkFor(unknown, 'nadie@cliente.example')

    expect(unknown.store.attempts[0]?.outcome).toBe('rejected')
    expect(unknown.store.attempts[0]?.reasonCode).toBe('unknown_email')
    expect(unknown.store.attempts[0]?.subjectHash).toBeNull()
  })

  it('ningún token ni verificador llega al ledger', async () => {
    await requestMagicLinkFor(harness, EMAIL)

    const token = harness.sent[0]!.url.slice(`${ISSUER}/m/`.length)
    const verifier = parseMagicLinkToken(token)!.verifier

    await harness.handler(request('POST', '/auth/magic-link/consume', { body: JSON.stringify({ token }) }))

    expect(JSON.stringify(harness.store.attempts)).not.toContain(verifier)
  })
})

describe('rate limit — bloqueo progresivo', () => {
  it('el segundo bloqueo espera más que el primero', async () => {
    const store = new InMemoryPersonAuthStore()
    const now = new Date('2026-09-04T12:00:00.000Z')

    const hit = (at: Date) =>
      store.hitRateLimitBucket({
        bucketKey: `magic_link_request:ip:${'a'.repeat(64)}`,
        now: at,
        windowSeconds: 60,
        limit: 2,
        lockoutBaseSeconds: 60,
        lockoutMaxSeconds: 3600
      })

    await hit(now)
    await hit(now)

    const first = await hit(now)

    expect(first.allowed).toBe(false)
    expect(first.allowed === false && first.retryAfterSeconds).toBe(60)

    // Pasada la ventana Y el bloqueo, un nuevo exceso castiga más fuerte.
    const later = new Date(now.getTime() + 120_000)

    await hit(later)
    await hit(later)

    const second = await hit(later)

    expect(second.allowed === false && second.retryAfterSeconds).toBe(120)
  })
})

describe('ergonomía del navegador', () => {
  it('el GET del enlace sólo pinta un formulario: un escáner de correo no consume nada', async () => {
    const harness = buildHarness()

    await requestMagicLinkFor(harness, EMAIL)

    const token = harness.sent[0]!.url.slice(`${ISSUER}/m/`.length)
    const response = await harness.handler(request('GET', `/m/${token}`))

    expect(response?.status).toBe(200)
    expect(response?.headers['Content-Type']).toContain('text/html')
    expect(response?.body).toContain('method="post"')
    expect([...harness.store.magicLinks.values()][0]?.consumedAt).toBeNull()
  })

  it('offers Microsoft on direct login without inventing an OAuth client or return', async () => {
    const page = await buildHarness({ internalLoginEnabled: true }).handler(request('GET', '/login'))

    expect(page?.status).toBe(200)
    expect(page?.body).toContain('href="/auth/internal/login"')
    expect(page?.body).toContain('Continuar con Microsoft')
    expect(page?.body).not.toContain('name="return_to"')
    expect((await buildHarness().handler(request('GET', '/login')))?.body).not.toContain('/auth/internal/login')
  })

  it('offers corporate login only when enabled with a safe OAuth return, preserving all parameters', async () => {
    const returnTo = '/oauth/authorize?' + new URLSearchParams({ client_id: 'https://client.example/id', state: 'state&"value', resource: 'https://mcp.example/mcp', code_challenge: 'pkce', code_challenge_method: 'S256' })
    const path = '/login?' + new URLSearchParams({ return_to: returnTo })
    const enabled = buildHarness({ internalLoginEnabled: true })
    const page = await enabled.handler(request('GET', path))
    const href = page!.body.match(/href="([^"]*\/auth\/internal\/login[^"]*)"/)?.[1]

    expect(href).toBeTruthy()
    expect(new URL(href!, ISSUER).searchParams.get('return_to')).toBe(returnTo)
    expect(page!.body).toContain('name="email"')
    expect((await buildHarness().handler(request('GET', path)))!.body).not.toContain('/auth/internal/login')
    const invalid = await enabled.handler(request('POST', '/auth/magic-link/request', { form: true, body: new URLSearchParams({ email: 'invalid', return_to: returnTo }).toString() }))

    expect(invalid!.status).toBe(400)
    expect(invalid!.body).toContain('/auth/internal/login')
  })

  it.each(['https://evil.example/oauth/authorize', '//evil.example/oauth/authorize', '/other', '/oauth/authorize#fragment', '/\\evil.example'])('does not advertise corporate login for tampered return %s', async returnTo => {
    const harness = buildHarness({ internalLoginEnabled: true })
    const response = await harness.handler(request('GET', '/login?' + new URLSearchParams({ return_to: returnTo })))

    expect(response!.body).not.toContain('/auth/internal/login')
  })

  it('el formulario de acceso pide correo y nada más: no hay contraseña que escribir', async () => {
    const harness = buildHarness()
    const response = await harness.handler(request('GET', '/login'))

    expect(response?.status).toBe(200)
    expect(response?.body).toContain('name="email"')
    expect(response?.body).not.toContain('type="password"')
  })

  it('blocks login CSRF with a valid magic link before claiming it or creating a session', async () => {
    const harness = buildHarness()

    await requestMagicLinkFor(harness, EMAIL)
    const token = harness.sent[0]!.url.slice(`${ISSUER}/m/`.length)
    const claim = vi.spyOn(harness.store, 'claimMagicLink')
    const submit = request('POST', '/auth/magic-link/consume', { form: true, body: new URLSearchParams({ token }).toString() })
    const hostile = await harness.handler({ ...submit, headers: headersFromRecord({ origin: 'https://attacker.example', 'content-type': 'application/x-www-form-urlencoded' }) })

    expect(hostile?.status).toBe(403)
    expect(hostile?.headers['Set-Cookie']).toBeUndefined()
    expect(claim).not.toHaveBeenCalled()
    expect(harness.store.sessions.size).toBe(0)
    expect([...harness.store.magicLinks.values()][0]?.consumedAt).toBeNull()
    const landing = await harness.handler(request('GET', '/m/' + token))

    expect(landing?.status).toBe(200)
    expect(claim).not.toHaveBeenCalled()
    const accepted = await harness.handler(submit)

    expect(accepted?.status).toBe(200)
    expect(accepted?.headers['Set-Cookie']).toContain('__Host-efeonce_auth=')
    expect(claim).toHaveBeenCalledOnce()
    expect(harness.store.sessions.size).toBe(1)
  })

  it('el consumo por form redirige al `return_to` con la cookie puesta', async () => {
    const harness = buildHarness()

    await harness.handler(
      request('POST', '/auth/magic-link/request', {
        form: true,
        body: new URLSearchParams({ email: EMAIL, return_to: '/oauth/authorize?client_id=abc' }).toString()
      })
    )

    const token = harness.sent[0]!.url.slice(`${ISSUER}/m/`.length)

    const response = await harness.handler(
      request('POST', '/auth/magic-link/consume', {
        form: true,
        body: new URLSearchParams({ token }).toString()
      })
    )

    expect(response?.status).toBe(302)
    expect(response?.headers.Location).toBe('/oauth/authorize?client_id=abc')
    expect(response?.headers['Set-Cookie']).toContain('__Host-efeonce_auth=')
  })

  it('los métodos equivocados no ejecutan nada', async () => {
    const harness = buildHarness()

    expect((await harness.handler(request('GET', '/auth/magic-link/request')))?.status).toBe(405)
    expect((await harness.handler(request('POST', '/login')))?.status).toBe(405)
    expect(vi.isMockFunction(harness.handler)).toBe(false)
  })
})

describe('recuperación por re-invitación', () => {
  it('la re-invitación mata sesión, passkeys y TOTP del subject anterior', async () => {
    const OLD_SUBJECT = 'subject-viejo'
    const harness = buildHarness({ supersededOnAccept: [OLD_SUBJECT] })
    const now = new Date('2026-09-04T12:00:00.000Z')

    // Estado del subject viejo: una sesión viva, un passkey y un TOTP activo.
    harness.store.registerLink({
      linkId: 'ipsl-viejo',
      subject: OLD_SUBJECT,
      sourceSystem: SOURCE_SYSTEM,
      active: true
    })
    await harness.store.insertSession({
      sessionHash: 'f'.repeat(64),
      subject: OLD_SUBJECT,
      environmentId: ENVIRONMENT_ID,
      profileId: 'prof-2',
      linkId: 'ipsl-viejo',
      amr: ['passkey', 'uv'],
      authTime: now,
      stepUpAt: now,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + 3_600_000),
      absoluteExpiresAt: new Date(now.getTime() + 7 * 86_400_000),
      revokedAt: null,
      revokeReason: null,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })
    await harness.store.insertPasskeyCredential({
      credentialId: 'cred-viejo',
      environmentId: ENVIRONMENT_ID,
      subject: OLD_SUBJECT,
      publicKey: new Uint8Array(new ArrayBuffer(4)),
      counter: 3,
      transports: [],
      deviceName: 'Teléfono perdido',
      deviceType: 'multiDevice',
      backedUp: true,
      aaguid: null,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
      revokeReason: null
    })
    await harness.store.upsertTotpEnrollment({
      environmentId: ENVIRONMENT_ID,
      subject: OLD_SUBJECT,
      secretCiphertext: new Uint8Array(new ArrayBuffer(8)),
      kmsKeyName: 'test',
      status: 'active',
      lastUsedStep: 1,
      createdAt: now,
      confirmedAt: now,
      lastVerifiedAt: now,
      revokedAt: null,
      revokeReason: null
    })

    const response = await harness.handler(
      request('POST', '/auth/invitations/accept', {
        body: JSON.stringify({ token: 'invitation-token-valida-0123456789' })
      })
    )

    expect(response?.status).toBe(202)

    expect(harness.store.sessions.get('f'.repeat(64))?.revokeReason).toBe('superseded_by_reinvitation')
    expect((await harness.store.getPasskeyCredential('cred-viejo'))?.revokedAt).not.toBeNull()
    expect(
      (await harness.store.getTotpEnrollment({ environmentId: ENVIRONMENT_ID, subject: OLD_SUBJECT }))?.status
    ).toBe('revoked')

    // Y queda rastro en el ledger, con el sujeto hasheado.
    const revocation = harness.store.attempts.find(attempt => attempt.method === 'recovery')

    expect(revocation?.stage).toBe('revoke')
    expect(revocation?.subjectHash).toBe(sha256(OLD_SUBJECT))
    expect(JSON.stringify(revocation)).not.toContain(OLD_SUBJECT)
  })

  it('sin subjects anteriores no revoca nada: una invitación normal no es una recuperación', async () => {
    const harness = buildHarness()

    await harness.handler(
      request('POST', '/auth/invitations/accept', {
        body: JSON.stringify({ token: 'invitation-token-valida-0123456789' })
      })
    )

    expect(harness.store.attempts.some(attempt => attempt.method === 'recovery')).toBe(false)
  })
})
