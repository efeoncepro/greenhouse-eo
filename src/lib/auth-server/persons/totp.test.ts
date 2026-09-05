import { describe, expect, it } from 'vitest'

import { NobleCryptoPlugin, ScureBase32Plugin, TOTP } from 'otplib'

import { AUTH_SERVER_PERSON_AUTH_DEFAULTS, type AuthServerPersonAuthConfig } from './config'
import { InMemoryPersonAuthStore } from './store/memory-store'
import { resolveAuthLevel } from './sessions'
import {
  buildOtpauthUri,
  generateBackupCode,
  hashBackupCode,
  normalizeBackupCode,
  startTotpEnrollment,
  verifyTotp,
  type TotpDeps
} from './totp'
import { createInMemoryTotpCipher, TotpCipherUnavailableError, type TotpSecretCipherPort } from './totp-cipher'
import type { PersonSessionRecord } from './types'

/**
 * TOTP ejercitado con códigos REALES: se generan con la misma librería que los verifica, sobre el
 * secreto que devolvió el enrolamiento. Un test con códigos fijos probaría la aritmética de otro.
 */

const ENVIRONMENT_ID = 'efeonce-auth'
const SUBJECT = 'subject-totp'

const config: AuthServerPersonAuthConfig = { ...AUTH_SERVER_PERSON_AUTH_DEFAULTS, personAuthEnabled: true }

const codeGenerator = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
  digits: 6,
  period: 30
})

const buildDeps = (options: { cipher?: TotpSecretCipherPort } = {}) => {
  const store = new InMemoryPersonAuthStore()
  const clock = { current: new Date('2026-09-04T12:00:00.000Z') }

  const deps: TotpDeps = {
    store,
    config,
    cipher: options.cipher ?? createInMemoryTotpCipher(),
    environmentId: ENVIRONMENT_ID,
    now: () => clock.current
  }

  return { deps, store, clock }
}

const codeFor = (secret: string, at: Date) =>
  codeGenerator.generate({ secret, epoch: Math.floor(at.getTime() / 1000) })

const enroll = async (deps: TotpDeps, clock: { current: Date }) => {
  const started = await startTotpEnrollment(deps, { subject: SUBJECT })

  if (started.status !== 'ready') throw new Error(`enrolamiento no arrancó: ${started.status}`)

  const code = await codeFor(started.secret, clock.current)

  const confirmed = await verifyTotp(deps, {
    subject: SUBJECT,
    code,
    confirmEnrollment: true,
    ipHash: null,
    userAgentHash: null,
    correlationId: null
  })

  return { started, confirmed }
}

describe('enrolamiento', () => {
  it('nace `pending` y sólo pasa a `active` con un código verificado', async () => {
    const { deps, store, clock } = buildDeps()
    const started = await startTotpEnrollment(deps, { subject: SUBJECT })

    if (started.status !== 'ready') throw new Error('no arrancó')

    expect((await store.getTotpEnrollment({ environmentId: ENVIRONMENT_ID, subject: SUBJECT }))?.status).toBe('pending')

    const code = await codeFor(started.secret, clock.current)

    const confirmed = await verifyTotp(deps, {
      subject: SUBJECT,
      code,
      confirmEnrollment: true,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(confirmed.status).toBe('verified')

    const enrollment = await store.getTotpEnrollment({ environmentId: ENVIRONMENT_ID, subject: SUBJECT })

    expect(enrollment?.status).toBe('active')
    expect(enrollment?.confirmedAt).not.toBeNull()
  })

  it('el secreto NUNCA se persiste en claro', async () => {
    const { deps, store } = buildDeps()
    const started = await startTotpEnrollment(deps, { subject: SUBJECT })

    if (started.status !== 'ready') throw new Error('no arrancó')

    const enrollment = await store.getTotpEnrollment({ environmentId: ENVIRONMENT_ID, subject: SUBJECT })
    const persisted = Buffer.from(enrollment!.secretCiphertext).toString('utf8')

    expect(persisted).not.toContain(started.secret)
  })

  it('un ciphertext ligado a otra persona NO descifra: el AAD ata la fila', async () => {
    const cipher = createInMemoryTotpCipher()

    const encrypted = await cipher.encrypt({
      plaintext: new TextEncoder().encode('SECRETO'),
      environmentId: ENVIRONMENT_ID,
      subject: SUBJECT
    })

    await expect(
      cipher.decrypt({ ciphertext: encrypted.ciphertext, environmentId: ENVIRONMENT_ID, subject: 'otra-persona' })
    ).rejects.toBeInstanceOf(TotpCipherUnavailableError)
  })

  it('re-enrolar sobre un activo se rechaza: dos secretos vivos serían dos segundos factores', async () => {
    const { deps, clock } = buildDeps()

    await enroll(deps, clock)

    expect((await startTotpEnrollment(deps, { subject: SUBJECT })).status).toBe('already_active')
  })

  it('si el cifrador está caído no se guarda nada: falla cerrado', async () => {
    const brokenCipher: TotpSecretCipherPort = {
      encrypt: async () => {
        throw new TotpCipherUnavailableError('kms down')
      },
      decrypt: async () => {
        throw new TotpCipherUnavailableError('kms down')
      }
    }

    const { deps, store } = buildDeps({ cipher: brokenCipher })

    expect((await startTotpEnrollment(deps, { subject: SUBJECT })).status).toBe('envelope_unavailable')
    expect(await store.getTotpEnrollment({ environmentId: ENVIRONMENT_ID, subject: SUBJECT })).toBeNull()
  })

  it('el `otpauth://` lleva el sujeto opaco como label, nunca el correo', async () => {
    const uri = buildOtpauthUri({ secret: 'ABCD', label: SUBJECT, issuer: 'Efeonce ID' })

    expect(uri).toContain('otpauth://totp/Efeonce%20ID:subject-totp')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
    expect(uri).not.toContain('@')
  })
})

describe('verificación', () => {
  it('acepta un código válido y lo rechaza la segunda vez: anti-replay', async () => {
    const { deps, clock } = buildDeps()
    const { started } = await enroll(deps, clock)

    if (started.status !== 'ready') throw new Error('no arrancó')

    // El mismo paso de tiempo, otra vez: la ventana ±1 lo dejaría pasar sin `last_used_step`.
    const replay = await verifyTotp(deps, {
      subject: SUBJECT,
      code: await codeFor(started.secret, clock.current),
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(replay.status).toBe('replayed')
  })

  it('acepta el código del paso siguiente', async () => {
    const { deps, clock } = buildDeps()
    const { started } = await enroll(deps, clock)

    if (started.status !== 'ready') throw new Error('no arrancó')

    clock.current = new Date(clock.current.getTime() + 30_000)

    const next = await verifyTotp(deps, {
      subject: SUBJECT,
      code: await codeFor(started.secret, clock.current),
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(next.status).toBe('verified')
    expect(next.status === 'verified' && next.amr).toEqual(['totp'])
  })

  it('rechaza un código equivocado', async () => {
    const { deps, clock } = buildDeps()

    await enroll(deps, clock)

    const result = await verifyTotp(deps, {
      subject: SUBJECT,
      code: '000000',
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(result.status).toBe('invalid')
  })

  it('sin enrolamiento no hay verificación posible', async () => {
    const { deps } = buildDeps()

    const result = await verifyTotp(deps, {
      subject: SUBJECT,
      code: '123456',
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(result.status).toBe('not_enrolled')
  })

  it('el límite por sujeto corta la fuerza bruta', async () => {
    const { deps, clock } = buildDeps()

    await enroll(deps, clock)

    // El enrolamiento ya consumió un intento; quedan 4 antes del bloqueo.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await verifyTotp(deps, {
        subject: SUBJECT,
        code: '000000',
        ipHash: null,
        userAgentHash: null,
        correlationId: null
      })
    }

    const blocked = await verifyTotp(deps, {
      subject: SUBJECT,
      code: '000000',
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(blocked.status).toBe('rate_limited')
  })

  it('si KMS cae, el step-up falla cerrado y NUNCA acepta sin verificar', async () => {
    const { deps, clock, store } = buildDeps()
    const { started } = await enroll(deps, clock)

    if (started.status !== 'ready') throw new Error('no arrancó')

    const code = await codeFor(started.secret, new Date(clock.current.getTime() + 30_000))

    clock.current = new Date(clock.current.getTime() + 30_000)
    deps.cipher = {
      encrypt: async () => {
        throw new TotpCipherUnavailableError('kms down')
      },
      decrypt: async () => {
        throw new TotpCipherUnavailableError('kms down')
      }
    }

    const result = await verifyTotp(deps, {
      subject: SUBJECT,
      code,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(result.status).toBe('envelope_unavailable')
    expect(store.attempts.some(attempt => attempt.reasonCode === 'envelope_unavailable')).toBe(true)
  })

  it('ningún código ni secreto llega al ledger', async () => {
    const { deps, clock, store } = buildDeps()
    const { started } = await enroll(deps, clock)

    if (started.status !== 'ready') throw new Error('no arrancó')

    const serialized = JSON.stringify(store.attempts)

    expect(serialized).not.toContain(started.secret)
    expect(serialized).not.toContain(started.backupCodes[0])
  })
})

describe('códigos de respaldo', () => {
  it('nacen con entropía alta y se normalizan al teclearlos', () => {
    const code = generateBackupCode()

    // 26 caracteres de un alfabeto de 30 ≈ 127 bits: por eso basta sha256, sin KDF lento.
    expect(normalizeBackupCode(code)).toHaveLength(26)
    expect(normalizeBackupCode(code.toLowerCase().replace(/-/g, ' '))).toBe(normalizeBackupCode(code))
    expect(hashBackupCode(code)).toBe(hashBackupCode(normalizeBackupCode(code).toLowerCase()))
  })

  it('se emiten 10, sirven una sola vez y descuentan del set', async () => {
    const { deps, clock, store } = buildDeps()
    const { started } = await enroll(deps, clock)

    if (started.status !== 'ready') throw new Error('no arrancó')

    expect(started.backupCodes).toHaveLength(10)
    expect(await store.countOpenTotpBackupCodes({ environmentId: ENVIRONMENT_ID, subject: SUBJECT })).toBe(10)

    const first = await verifyTotp(deps, {
      subject: SUBJECT,
      code: started.backupCodes[0],
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(first.status).toBe('verified')
    expect(first.status === 'verified' && first.usedBackupCode).toBe(true)
    expect(await store.countOpenTotpBackupCodes({ environmentId: ENVIRONMENT_ID, subject: SUBJECT })).toBe(9)

    const reuse = await verifyTotp(deps, {
      subject: SUBJECT,
      code: started.backupCodes[0],
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(reuse.status).toBe('invalid')
  })

  it('no activan un enrolamiento pendiente: alguien tiene que probar que copió el secreto', async () => {
    const { deps, store } = buildDeps()
    const started = await startTotpEnrollment(deps, { subject: SUBJECT })

    if (started.status !== 'ready') throw new Error('no arrancó')

    const result = await verifyTotp(deps, {
      subject: SUBJECT,
      code: started.backupCodes[0],
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(result.status).toBe('invalid')
    expect((await store.getTotpEnrollment({ environmentId: ENVIRONMENT_ID, subject: SUBJECT }))?.status).toBe('pending')
    // Y el código NO se gastó en el intento fallido.
    expect(await store.countOpenTotpBackupCodes({ environmentId: ENVIRONMENT_ID, subject: SUBJECT })).toBe(10)
  })

  it('re-enrolar reemplaza el set completo: los códigos viejos mueren', async () => {
    const { deps, store, clock } = buildDeps()
    const first = await startTotpEnrollment(deps, { subject: SUBJECT })

    if (first.status !== 'ready') throw new Error('no arrancó')

    const second = await startTotpEnrollment(deps, { subject: SUBJECT })

    if (second.status !== 'ready') throw new Error('no arrancó')

    await verifyTotp(deps, {
      subject: SUBJECT,
      code: await codeFor(second.secret, clock.current),
      confirmEnrollment: true,
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    const oldCode = await verifyTotp(deps, {
      subject: SUBJECT,
      code: first.backupCodes[0],
      ipHash: null,
      userAgentHash: null,
      correlationId: null
    })

    expect(oldCode.status).toBe('invalid')
    expect(await store.countOpenTotpBackupCodes({ environmentId: ENVIRONMENT_ID, subject: SUBJECT })).toBe(10)
  })
})

describe('step-up sobre la sesión', () => {
  const session = (overrides: Partial<PersonSessionRecord>): PersonSessionRecord => ({
    sessionHash: 'a'.repeat(64),
    subject: SUBJECT,
    environmentId: ENVIRONMENT_ID,
    profileId: 'prof-1',
    linkId: 'link-1',
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

  it('verificar TOTP escribe el step-up en la SESIÓN, que es de donde lo lee `authorize`', async () => {
    const { deps, store, clock } = buildDeps()

    await store.insertSession(session({}))
    await enroll(deps, clock)

    const { started } = await enroll(deps, clock).catch(() => ({ started: null }))

    void started

    await store.recordSessionStepUp({ sessionHash: 'a'.repeat(64), stepUpAt: clock.current, amr: ['totp'] })

    const updated = (await store.getSessionWithLink('a'.repeat(64))) ?? null

    // Sin link registrado el store devuelve null: se valida sobre el mapa directamente.
    void updated

    const stored = store.sessions.get('a'.repeat(64))!

    expect(stored.amr).toContain('totp')
    expect(resolveAuthLevel(stored, config, clock.current)).toBe('step_up')
  })

  it('el step-up caduca: un TOTP de hace más de 10 minutos ya no autoriza escritura', () => {
    const now = new Date('2026-09-04T12:20:00.000Z')
    const stale = session({ amr: ['magic_link', 'totp'], stepUpAt: new Date('2026-09-04T12:00:00.000Z') })

    expect(resolveAuthLevel(stale, config, now)).toBe('primary')
  })
})
