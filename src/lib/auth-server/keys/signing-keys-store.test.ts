import { generateKeyPairSync, sign as nodeSign } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const KEY_NAME = 'projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256'

type Row = {
  kid: string
  kms_key_version: string
  algorithm: 'ES256'
  public_jwk: Record<string, string>
  state: 'active' | 'retiring' | 'retired'
  activated_at: Date
  retiring_at: Date | null
  retired_at: Date | null
  created_by: string
}

/**
 * In-memory stand-in for `greenhouse_auth.signing_keys` + `signing_key_events`.
 * Interpreta sólo las sentencias que el store emite; cualquier otra falla loud.
 */
const createFakeDb = () => {
  const keys = new Map<string, Row>()
  const events: Array<{ kid: string; event_type: string; actor: string; details: unknown }> = []

  const rowsOrdered = () => [...keys.values()].sort((a, b) => b.activated_at.getTime() - a.activated_at.getTime())

  const run = async (text: string, values: unknown[] = []) => {
    const sql = text.replace(/\s+/gu, ' ').trim()

    if (sql.startsWith('SELECT pg_advisory_xact_lock')) return { rows: [] }

    if (sql.includes('FROM greenhouse_auth.signing_keys WHERE kms_key_version = $1 OR kid = $2')) {
      const [version, kid] = values as [string, string]
      const row = [...keys.values()].find(r => r.kms_key_version === version || r.kid === kid)

      return { rows: row ? [row] : [] }
    }

    if (sql.includes("WHERE state = 'active'") && sql.includes('FROM greenhouse_auth.signing_keys')) {
      return { rows: rowsOrdered().filter(r => r.state === 'active') }
    }

    if (sql.includes("WHERE state IN ('active', 'retiring')")) {
      return {
        rows: rowsOrdered()
          .filter(r => r.state !== 'retired')
          .sort((a, b) => Number(b.state === 'active') - Number(a.state === 'active'))
      }
    }

    if (sql.startsWith('SELECT kid, kms_key_version') && sql.includes('WHERE kid = $1 FOR UPDATE')) {
      const row = keys.get(values[0] as string)

      return { rows: row ? [row] : [] }
    }

    if (sql.startsWith('SELECT kid, kms_key_version') && sql.endsWith('ORDER BY activated_at DESC')) {
      return { rows: rowsOrdered() }
    }

    if (sql.startsWith("UPDATE greenhouse_auth.signing_keys SET state = 'retiring'")) {
      const row = keys.get(values[0] as string)

      if (row) {
        row.state = 'retiring'
        row.retiring_at = new Date()
      }

      return { rows: [] }
    }

    if (sql.startsWith("UPDATE greenhouse_auth.signing_keys SET state = 'retired'")) {
      const row = keys.get(values[0] as string)

      if (!row) return { rows: [] }
      row.state = 'retired'
      row.retired_at = values[1] as Date

      return { rows: [row] }
    }

    if (sql.startsWith('INSERT INTO greenhouse_auth.signing_keys')) {
      const [kid, version, jwk, state, actor] = values as [string, string, string, Row['state'], string]
      const existing = keys.get(kid)

      if (existing) {
        existing.state = state

        if (state === 'active') {
          existing.activated_at = new Date()
          existing.retiring_at = null
        }

        return { rows: [existing] }
      }

      if ([...keys.values()].some(r => r.state === 'active') && state === 'active') {
        throw new Error('unique violation: signing_keys_single_active_idx')
      }

      const row: Row = {
        kid,
        kms_key_version: version,
        algorithm: 'ES256',
        public_jwk: JSON.parse(jwk),
        state,
        activated_at: new Date(),
        retiring_at: state === 'retiring' ? new Date() : null,
        retired_at: null,
        created_by: actor
      }

      keys.set(kid, row)

      return { rows: [row] }
    }

    if (sql.startsWith('INSERT INTO greenhouse_auth.signing_key_events')) {
      const [kid, event_type, actor, details] = values as [string, string, string, string]

      events.push({ kid, event_type, actor, details: JSON.parse(details) })

      return { rows: [] }
    }

    throw new Error(`Unexpected SQL in fake db: ${sql}`)
  }

  return { keys, events, run }
}

const fake = createFakeDb()

vi.mock('@/lib/db', () => ({
  // Contrato real: `query` devuelve las filas; `client.query` (tx) devuelve `{ rows }`.
  query: async (text: string, values?: unknown[]) => (await fake.run(text, values)).rows,
  withTransaction: async (callback: (client: { query: typeof fake.run }) => Promise<unknown>) =>
    callback({ query: fake.run })
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const createSigner = (version: string) => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })

  return {
    version,
    signer: {
      getPublicKeyPem: async () => publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      signDigest: async (_v: string, input: { sha256: Buffer; signingInput: Buffer }) =>
        nodeSign('sha256', input.signingInput, { key: privateKey, dsaEncoding: 'der' }),
      listEnabledVersions: async () => [version]
    }
  }
}

describe('signing-keys-store', () => {
  beforeEach(() => {
    fake.keys.clear()
    fake.events.length = 0
    process.env.AUTH_SERVER_KMS_KEY = KEY_NAME
  })

  it('registers the first version as active and is idempotent on re-registration', async () => {
    const { registerSigningKeyVersion, getActiveSigningKey, listSigningKeys } = await import('./signing-keys-store')
    const v1 = createSigner(`${KEY_NAME}/cryptoKeyVersions/1`)

    const first = await registerSigningKeyVersion({ signer: v1.signer, versionName: v1.version, actor: 'test' })

    expect(first.key.state).toBe('active')
    expect(first.previousActiveKid).toBeNull()
    expect(first.alreadyRegistered).toBe(false)

    const again = await registerSigningKeyVersion({ signer: v1.signer, versionName: v1.version, actor: 'test' })

    expect(again.alreadyRegistered).toBe(true)
    expect((await listSigningKeys())).toHaveLength(1)
    expect((await getActiveSigningKey())?.kid).toBe(first.key.kid)
    expect(fake.events.map(e => e.event_type)).toEqual(['registered', 'activated'])
  })

  it('rotates: new version becomes active, previous goes to retiring, JWKS publishes both', async () => {
    const { registerSigningKeyVersion, getPublishableSigningKeys, buildPublishedJwks } = await import(
      './signing-keys-store'
    )

    const v1 = createSigner(`${KEY_NAME}/cryptoKeyVersions/1`)
    const v2 = createSigner(`${KEY_NAME}/cryptoKeyVersions/2`)

    const first = await registerSigningKeyVersion({ signer: v1.signer, versionName: v1.version, actor: 'test' })
    const second = await registerSigningKeyVersion({ signer: v2.signer, versionName: v2.version, actor: 'rotator' })

    expect(second.key.state).toBe('active')
    expect(second.previousActiveKid).toBe(first.key.kid)
    expect(fake.keys.get(first.key.kid)?.state).toBe('retiring')

    const publishable = await getPublishableSigningKeys()

    expect(publishable.map(k => k.state)).toEqual(['active', 'retiring'])

    const jwks = buildPublishedJwks(publishable)

    expect(jwks.keys.map(k => k.kid)).toEqual([second.key.kid, first.key.kid])
    expect(jwks.keys.every(k => !('d' in k))).toBe(true)
  })

  it('refuses to retire before the overlap window unless forced, and never re-activates a retired key', async () => {
    const { registerSigningKeyVersion, retireSigningKey } = await import('./signing-keys-store')
    const v1 = createSigner(`${KEY_NAME}/cryptoKeyVersions/1`)
    const v2 = createSigner(`${KEY_NAME}/cryptoKeyVersions/2`)

    const first = await registerSigningKeyVersion({ signer: v1.signer, versionName: v1.version, actor: 'test' })

    await expect(retireSigningKey({ kid: first.key.kid, actor: 'test' })).rejects.toThrow(/retiring/u)

    await registerSigningKeyVersion({ signer: v2.signer, versionName: v2.version, actor: 'test' })

    await expect(retireSigningKey({ kid: first.key.kid, actor: 'test' })).rejects.toThrow(/overlap/u)

    const retired = await retireSigningKey({ kid: first.key.kid, actor: 'incident', force: true })

    expect(retired.state).toBe('retired')
    expect(fake.events.at(-1)).toMatchObject({ event_type: 'retired', details: { force: true } })

    await expect(
      registerSigningKeyVersion({ signer: v1.signer, versionName: v1.version, actor: 'test' })
    ).rejects.toThrow(/retired/u)
  })

  it('rejects a version that does not belong to the configured key', async () => {
    const { registerSigningKeyVersion } = await import('./signing-keys-store')
    const foreign = createSigner('projects/x/locations/y/keyRings/z/cryptoKeys/other/cryptoKeyVersions/1')

    await expect(
      registerSigningKeyVersion({ signer: foreign.signer, versionName: foreign.version, actor: 'test' })
    ).rejects.toThrow(/does not belong/u)
  })

  it('signs with the active key and fails loud without one', async () => {
    const { registerSigningKeyVersion, signWithActiveKey } = await import('./signing-keys-store')
    const v1 = createSigner(`${KEY_NAME}/cryptoKeyVersions/1`)

    await expect(signWithActiveKey({ signer: v1.signer, payload: { sub: 'x' } })).rejects.toThrow(/No active/u)

    await registerSigningKeyVersion({ signer: v1.signer, versionName: v1.version, actor: 'test' })

    const jws = await signWithActiveKey({ signer: v1.signer, payload: { sub: 'x', exp: 4102444800 } })

    expect(jws.split('.')).toHaveLength(3)
  })
})
