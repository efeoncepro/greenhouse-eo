import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import fixture from './__fixtures__/complete.json'
import { generateXrayToken, isXrayToken, digestXrayToken, xrayContentHash, xrayShareUrl } from './token'
import { createXrayPublicReader } from './public-reader'
import { resolveAeoXrayIntent } from '@/lib/axis/aeo-xray/aeo-xray'
import { createXrayCommands, validateXrayIntent } from './commands'

const model = resolveAeoXrayIntent(fixture)

if (model.status !== 'resolved') throw new Error('invalid fixture')
describe('X-Ray security boundary', () => {
  it('generates opaque distinct token with no plaintext persistence digest', () => {
    const a = generateXrayToken()

    expect(isXrayToken(a)).toBe(true)
    expect(a).not.toBe(generateXrayToken())
    expect(digestXrayToken(a)).toMatch(/^[a-f0-9]{64}$/)
    expect(isXrayToken('sky-abc')).toBe(false)
  })
  it('allows draft protected references for issuance asset authorization', () => {
    const input = structuredClone(fixture) as any

    input.assets = [
      {
        id: 'image',
        ref: { kind: 'protected', assetId: 'storage-id' },
        alt: 'a',
        width: 1,
        height: 1,
        credit: 'a',
        sourceId: 'source',
        approval: 'approved'
      }
    ]
    expect(validateXrayIntent(input).assets[0].ref.kind).toBe('protected')
  })
  it('defaults off, no database touch', async () => {
    const read = vi.fn()
    const rate = vi.fn()

    expect(
      await createXrayPublicReader({ read, rate, now: Date.now })({
        token: generateXrayToken(),
        clientIp: 'local',
        env: {}
      })
    ).toEqual({ status: 'not_found' })
    expect(read).not.toHaveBeenCalled()
    expect(rate).not.toHaveBeenCalled()
  })
  it('handles expiry revoke withdraw rate and unavailable without leaking payload', async () => {
    const base = {
      expiresAt: '2026-10-30T00:00:00Z',
      revokedAt: null,
      withdrawnAt: null,
      editionId: 'edition',
      organizationId: 'org-a',
      caseId: 'case-a',
      manifest: model,
      contentHash: xrayContentHash(model),
      organizationActive: true,
      modelVersion: '1.0'
    }

    for (const [patch, status] of [
      [{ expiresAt: '2026-09-01T00:00:00Z' }, 'not_found'],
      [{ revokedAt: '2026-09-30' }, 'gone'],
      [{ withdrawnAt: '2026-09-30' }, 'gone'],
      [{ organizationActive: false }, 'not_found'],
      [{ contentHash: 'corrupted' }, 'unavailable']
    ] as const) {
      const r = createXrayPublicReader({
        read: async () => ({ ...base, ...patch }),
        rate: async () => true,
        now: () => Date.parse('2026-09-30')
      })

      expect(
        await r({ token: generateXrayToken(), clientIp: '127.0.0.1', env: { AEO_XRAY_SHARING_ENABLED: 'true' } })
      ).toEqual({ status })
    }

    const read = vi.fn()
    const r = createXrayPublicReader({ read, rate: async () => false, now: Date.now })

    expect(
      (await r({ token: generateXrayToken(), clientIp: null, env: { AEO_XRAY_SHARING_ENABLED: 'true' } })).status
    ).toBe('rate_limited')
    expect(read).not.toHaveBeenCalled()
  })
  it('returns only frozen client projection', async () => {
    const r = createXrayPublicReader({
      read: async () => ({
        expiresAt: '2026-10-30T00:00:00Z',
        revokedAt: null,
        withdrawnAt: null,
        editionId: 'edition',
        organizationId: 'org-a',
        caseId: 'case-a',
        manifest: model,
        contentHash: xrayContentHash(model),
        organizationActive: true,
        modelVersion: '1.0'
      }),
      rate: async () => true,
      now: () => Date.parse('2026-09-30')
    })

    const result = await r({ token: generateXrayToken(), clientIp: null, env: { AEO_XRAY_SHARING_ENABLED: 'true' } })

    expect(result.status).toBe('ok')
    if (result.status === 'ok')
      expect(Object.keys(result.body)).toEqual(['modelVersion', 'header', 'model', 'expiresAt'])
  })
})

it('share URL is exact and rejects credential or path injection', () => {
  const token = generateXrayToken()

  expect(xrayShareUrl(token, {})).toBe(`https://think.efeoncepro.com/aeo-xray/r/${token}`)
  for (const base of [
    'http://example.com',
    'https://u:p@example.com',
    'https://example.com/path',
    'https://example.com/?a=1'
  ])
    expect(() => xrayShareUrl(token, { AEO_XRAY_PUBLIC_BASE_URL: base })).toThrow()
})

it('asset ownership failure prevents edition creation', async () => {
  const insertEdition = vi.fn()

  const assertAssets = vi.fn(async () => {
    throw new Error('asset_not_owned')
  })

  const session = {
    findCase: async () => ({ caseId: 'case' }),
    findEdition: async () => null,
    draft: async () => ({ revision: 1, intent: fixture }),
    insertEdition
  }

  const store = { transaction: async (_authority: unknown, fn: (session: unknown) => Promise<unknown>) => fn(session) }
  const commands = createXrayCommands(store as never, assertAssets)

  await expect(
    commands.issueXrayEdition({ organizationId: 'org', actorUserId: 'actor' }, '00000000-0000-0000-0000-000000000001', {
      expectedRevision: 1,
      idempotencyKey: 'test-issue-key'
    })
  ).rejects.toThrow('asset_not_owned')
  expect(assertAssets).toHaveBeenCalledOnce()
  expect(insertEdition).not.toHaveBeenCalled()
})

it('default issuance hook rejects mutable public media', async () => {
  const intent = structuredClone(fixture) as any

  intent.assets = [
    {
      id: 'hero',
      ref: { kind: 'public', url: 'https://example.com/image.webp' },
      alt: 'Illustration',
      width: 100,
      height: 100,
      credit: 'Example',
      sourceId: 'source',
      approval: 'approved'
    }
  ]
  const insertEdition = vi.fn()

  const session = {
    findCase: async () => ({ caseId: 'case' }),
    findEdition: async () => null,
    draft: async () => ({ revision: 1, intent }),
    insertEdition
  }

  const store = { transaction: async (_authority: unknown, fn: (session: unknown) => Promise<unknown>) => fn(session) }

  await expect(
    createXrayCommands(store as never).issueXrayEdition(
      { organizationId: 'org', actorUserId: 'actor' },
      '00000000-0000-0000-0000-000000000001',
      { expectedRevision: 1, idempotencyKey: 'issue-public-asset' }
    )
  ).rejects.toMatchObject({ code: 'not_ready', status: 409 })
  expect(insertEdition).not.toHaveBeenCalled()
})

it('draft permits incomplete original experience, issuance fails closed', async () => {
  const intent = structuredClone(fixture) as any

  delete intent.artifacts[0].experience
  expect(validateXrayIntent(intent).status).toBe('resolved')
  const insertEdition = vi.fn()

  const session = {
    findCase: async () => ({ caseId: 'case' }),
    findEdition: async () => null,
    draft: async () => ({ revision: 1, intent }),
    insertEdition
  }

  const store = { transaction: async (_authority: unknown, fn: (session: unknown) => Promise<unknown>) => fn(session) }

  await expect(
    createXrayCommands(store as never).issueXrayEdition(
      { organizationId: 'org', actorUserId: 'actor' },
      '00000000-0000-0000-0000-000000000001',
      { expectedRevision: 1, idempotencyKey: 'issue-incomplete' }
    )
  ).rejects.toMatchObject({ code: 'not_ready', status: 409 })
  expect(insertEdition).not.toHaveBeenCalled()
})
