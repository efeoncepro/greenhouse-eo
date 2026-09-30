import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AxisAeoXrayManifest } from '@/lib/axis/aeo-xray/aeo-xray'
import { assertXrayAssets, readPublicXrayAsset, uploadXrayAsset } from './assets'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  store: vi.fn(),
  download: vi.fn(),
  grant: vi.fn(),
  scope: vi.fn(),
  findCase: vi.fn()
}))

vi.mock('@/lib/storage/greenhouse-assets', () => ({
  getAssetById: mocks.get,
  storeSystemGeneratedPrivateAsset: mocks.store,
  downloadPrivateAsset: mocks.download
}))
vi.mock('./public-reader', () => ({ resolvePublicXray: mocks.grant }))
vi.mock('./store', () => ({
  readXrayByDigest: mocks.scope,
  xrayStore: {
    transaction: async (_: unknown, callback: (session: unknown) => unknown) => callback({ findCase: mocks.findCase })
  }
}))

const authority = { organizationId: 'owner', actorUserId: 'operator' }
const bytes = new Uint8Array([1, 2, 3, 4])
const sha256 = createHash('sha256').update(bytes).digest('hex')

const descriptor = {
  id: 'hero',
  ref: { kind: 'protected' as const, assetId: 'managed-asset', sha256 },
  width: 100,
  height: 80
}

const manifest = { assets: [descriptor] } as AxisAeoXrayManifest

const record = () => ({
  assetId: 'managed-asset',
  visibility: 'private',
  status: 'attached',
  ownerAggregateType: 'xray_source',
  ownerAggregateId: 'case',
  mimeType: 'image/webp',
  sizeBytes: 4,
  metadata: { organizationId: 'owner', sha256, width: 100, height: 80 }
})

describe('X-Ray protected media', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get.mockResolvedValue(record())
    mocks.scope.mockResolvedValue({
      organizationId: 'owner',
      caseId: 'case',
      organizationActive: true,
      expiresAt: '2099-01-01',
      revokedAt: null,
      withdrawnAt: null
    })
    mocks.grant.mockResolvedValue({ status: 'ok', body: { model: manifest, header: { editionId: 'edition' } } })
    mocks.download.mockResolvedValue({ file: { arrayBuffer: bytes.buffer } })
    mocks.findCase.mockResolvedValue({ caseId: 'case' })
    mocks.store.mockResolvedValue({ assetId: 'new-asset' })
  })

  it('admits only media bound to this owner/case/hash and dimensions', async () => {
    await assertXrayAssets(authority, 'case', manifest)

    for (const change of [
      { visibility: 'public' },
      { status: 'quarantined' },
      { ownerAggregateType: 'payroll_receipt' },
      { ownerAggregateId: 'other-case' },
      { metadata: { ...record().metadata, organizationId: 'other-owner' } },
      { metadata: { ...record().metadata, sha256: 'f'.repeat(64) } },
      { metadata: { ...record().metadata, width: 200 } }
    ]) {
      mocks.get.mockResolvedValue({ ...record(), ...change })
      await expect(assertXrayAssets(authority, 'case', manifest)).rejects.toMatchObject({ code: 'not_ready' })
    }

    await expect(
      assertXrayAssets(authority, 'case', {
        assets: [{ ...descriptor, ref: { kind: 'public', url: 'https://example.org/changing.webp' } }]
      } as AxisAeoXrayManifest)
    ).rejects.toMatchObject({ code: 'not_ready' })
  })

  it('revalidates grant and requested logical asset before touching storage', async () => {
    for (const status of ['gone', 'not_found', 'rate_limited', 'unavailable']) {
      mocks.grant.mockResolvedValue({ status })
      expect(await readPublicXrayAsset({ token: 'secret', assetId: 'hero', clientIp: null })).toEqual({ status })
    }

    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.download).not.toHaveBeenCalled()
    mocks.grant.mockResolvedValue({ status: 'ok', body: { model: manifest } })
    expect(await readPublicXrayAsset({ token: 'secret', assetId: '../foreign', clientIp: null })).toEqual({
      status: 'not_found'
    })
    expect(mocks.download).not.toHaveBeenCalled()
  })

  it('returns exact frozen bytes and denies corruption or a newly revoked grant', async () => {
    expect((await readPublicXrayAsset({ token: 'secret', assetId: 'hero', clientIp: null })).status).toBe('ok')
    mocks.download.mockResolvedValue({ file: { arrayBuffer: new Uint8Array([9]).buffer } })
    expect(await readPublicXrayAsset({ token: 'secret', assetId: 'hero', clientIp: null })).toEqual({
      status: 'unavailable'
    })
    mocks.download.mockClear()
    mocks.scope.mockResolvedValue({ revokedAt: '2026-09-30' })
    expect(await readPublicXrayAsset({ token: 'secret', assetId: 'hero', clientIp: null })).toEqual({ status: 'gone' })
    expect(mocks.download).not.toHaveBeenCalled()
  })

  it('decodes real pixels, strips input metadata and creates a fresh private identity', async () => {
    const { default: sharp } = await import('sharp')

    const original = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#ffffff' } })
      .png()
      .toBuffer()

    const result = await uploadXrayAsset(authority, 'case', original)

    expect(result).toMatchObject({ ref: { kind: 'protected', assetId: 'new-asset' }, width: 8, height: 6 })
    expect(result.ref.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(mocks.store.mock.calls[0][0]).toMatchObject({
      ownerAggregateType: 'xray_source',
      ownerAggregateId: 'case',
      mimeType: 'image/webp',
      metadata: { organizationId: 'owner' }
    })
    expect(mocks.store.mock.calls[0][0]).not.toHaveProperty('assetId')
    await expect(
      uploadXrayAsset(authority, 'case', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))
    ).rejects.toMatchObject({ code: 'invalid_input' })
  })
})
