import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as StoreModule from '../store'

// Mock del data-access + del resolver de bucket (env-aware en runtime).
vi.mock('../store', async importOriginal => ({
  ...(await importOriginal<typeof StoreModule>()),
  getSubmissionById: vi.fn(),
  getActiveFormAsset: vi.fn(),
}))
vi.mock('@/lib/storage/greenhouse-assets', () => ({
  getGreenhousePrivateAssetsBucket: () => 'test-private-bucket',
}))

import { resolveFormAssetDelivery } from '../asset-delivery'
import * as store from '../store'

const getSubmissionById = store.getSubmissionById as unknown as ReturnType<typeof vi.fn>
const getActiveFormAsset = store.getActiveFormAsset as unknown as ReturnType<typeof vi.fn>

const submission = (over: Partial<StoreModule.FormSubmissionRow> = {}): StoreModule.FormSubmissionRow =>
  ({
    submission_id: 'fsub-abc',
    form_id: 'fdef-ebook',
    form_version_id: 'fver-1',
    surface_id: null,
    page_uri: null,
    page_name: null,
    lead_email_hash: null,
    normalized_fields_json: {},
    encrypted_fields_json: {},
    status: 'accepted',
    rejection_reason_class: null,
    dedupe_fingerprint: null,
    request_id: null,
    ip_hash: null,
    delivery_attempts: 0,
    next_attempt_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  }) as StoreModule.FormSubmissionRow

const asset = (over: Partial<StoreModule.FormAssetRow> = {}): StoreModule.FormAssetRow =>
  ({
    form_asset_id: 'fass-1',
    form_id: 'fdef-ebook',
    asset_kind: 'ebook',
    object_name: 'ebooks/web-agentica.pdf',
    file_name: 'El-fin-de-la-web.pdf',
    content_type: 'application/pdf',
    ttl_hours: 72,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  }) as StoreModule.FormAssetRow

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveFormAssetDelivery — gate de descarga del ebook', () => {
  it('entrega el descriptor (bucket privado + object server-only) para submission aceptada dentro de TTL', async () => {
    getSubmissionById.mockResolvedValue(submission())
    getActiveFormAsset.mockResolvedValue(asset())

    const out = await resolveFormAssetDelivery('fsub-abc')

    expect(out).toEqual({
      ok: true,
      bucketName: 'test-private-bucket',
      objectName: 'ebooks/web-agentica.pdf',
      fileName: 'El-fin-de-la-web.pdf',
      contentType: 'application/pdf',
    })
  })

  it('sin submission (handle inválido / no completó el form) → not_found', async () => {
    getSubmissionById.mockResolvedValue(null)
    expect(await resolveFormAssetDelivery('fsub-nope')).toEqual({ ok: false, reason: 'not_found' })
    expect(getActiveFormAsset).not.toHaveBeenCalled()
  })

  it('handle vacío o gigante → not_found sin tocar el store', async () => {
    expect(await resolveFormAssetDelivery('')).toEqual({ ok: false, reason: 'not_found' })
    expect(await resolveFormAssetDelivery('x'.repeat(201))).toEqual({ ok: false, reason: 'not_found' })
    expect(getSubmissionById).not.toHaveBeenCalled()
  })

  it('submission no aceptada (received/validated/rejected) → not_ready', async () => {
    for (const status of ['received', 'validated', 'rejected']) {
      getSubmissionById.mockResolvedValue(submission({ status }))
      expect(await resolveFormAssetDelivery('fsub-abc')).toEqual({ ok: false, reason: 'not_ready' })
    }
  })

  it('permite descarga en estados post-accept (routed/delivered)', async () => {
    getActiveFormAsset.mockResolvedValue(asset())

    for (const status of ['routed', 'delivered', 'retrying']) {
      getSubmissionById.mockResolvedValue(submission({ status }))
      const out = await resolveFormAssetDelivery('fsub-abc')

      expect(out.ok).toBe(true)
    }
  })

  it('form sin asset activo → no_asset', async () => {
    getSubmissionById.mockResolvedValue(submission())
    getActiveFormAsset.mockResolvedValue(null)
    expect(await resolveFormAssetDelivery('fsub-abc')).toEqual({ ok: false, reason: 'no_asset' })
  })

  it('fuera del TTL → expired', async () => {
    const old = new Date(Date.now() - 100 * 60 * 60 * 1000) // 100h atrás

    getSubmissionById.mockResolvedValue(submission({ created_at: old }))
    getActiveFormAsset.mockResolvedValue(asset({ ttl_hours: 72 }))
    expect(await resolveFormAssetDelivery('fsub-abc')).toEqual({ ok: false, reason: 'expired' })
  })
})
