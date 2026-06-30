import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as StoreModule from '../store'

import { hashEmbedKeySecret, mintEmbedKey } from '../embed-key'

// Mock del data-access: el catálogo es read path puro sobre el store. Spread del real
// (commands.ts aliasea varios exports a module-load) + override de las lecturas usadas.
vi.mock('../store', async importOriginal => ({
  ...(await importOriginal<typeof StoreModule>()),
  listFormDefinitions: vi.fn(),
  listHostSurfaces: vi.fn(),
  getPublishedVersionBySlug: vi.fn(),
  listDestinationsForVersion: vi.fn(),
  getHostSurfaceById: vi.fn(),
}))

import { resolveExternalFormCatalog } from '../commands'
import { listInsertableFormCatalog, resolveDestinationReadiness } from '../readers'
import * as store from '../store'

const SECRET = mintEmbedKey().secret
const SECRET_HASH = hashEmbedKeySecret(SECRET)

const surfaceWp = {
  surface_id: 'surf-wp',
  surface_kind: 'wordpress',
  surface_name: 'WP público',
  origin_allowlist_json: ['https://efeoncepro.com'],
  allowed_form_slugs_json: ['lead-gen-web'],
  embed_key_id: 'ehk_test',
  embed_key_hash: SECRET_HASH,
  renderer_channel: 'stable',
  csp_requirements_json: {},
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
}

const surfaceOpen = { ...surfaceWp, surface_id: 'surf-open', allowed_form_slugs_json: [] }

const defReady = {
  form_id: 'f1',
  slug: 'lead-gen-web',
  name: 'Lead Gen - Web',
  form_kind: 'lead_magnet',
  purpose: 'lead',
  risk_profile: 'low',
  owner_team: null,
  status: 'active',
  default_locale: 'es-CL',
  created_by: null,
  created_at: new Date(),
  updated_at: new Date(),
}

const defDraftOnly = { ...defReady, form_id: 'f2', slug: 'draft-form', name: 'Draft Only' }

beforeEach(() => {
  vi.mocked(store.listFormDefinitions).mockResolvedValue([defReady, defDraftOnly] as never)
  vi.mocked(store.listHostSurfaces).mockResolvedValue([surfaceWp, surfaceOpen] as never)
  vi.mocked(store.getPublishedVersionBySlug).mockImplementation((async (slug: string) =>
    slug === 'lead-gen-web' ? ({ form_version_id: 'v1', form_id: 'f1', version: 1 } as never) : null) as never)
  vi.mocked(store.listDestinationsForVersion).mockResolvedValue([{ enabled: true, delivery_mode: 'direct' }] as never)
  vi.mocked(store.getHostSurfaceById).mockImplementation((async (id: string) =>
    id === 'surf-wp' ? (surfaceWp as never) : null) as never)
})

describe('resolveDestinationReadiness (honest-degradation TASK-1258)', () => {
  it('clasifica cada estado de entrega', () => {
    expect(resolveDestinationReadiness([])).toBe('no_destination')
    expect(resolveDestinationReadiness([{ enabled: false, delivery_mode: 'direct' }])).toBe('destination_disabled')
    expect(resolveDestinationReadiness([{ enabled: true, delivery_mode: 'disabled' }])).toBe('destination_disabled')
    expect(resolveDestinationReadiness([{ enabled: true, delivery_mode: 'direct' }])).toBe('ready')
    expect(resolveDestinationReadiness([{ enabled: true, delivery_mode: 'after_review' }])).toBe('review_only')
    expect(resolveDestinationReadiness([{ enabled: true, delivery_mode: 'manual_only' }])).toBe('manual_only')
  })
})

describe('listInsertableFormCatalog (TASK-1258)', () => {
  it('devuelve solo forms con versión publicada, acotado al allowlist de la surface', async () => {
    const entries = await listInsertableFormCatalog(surfaceWp)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      formSlug: 'lead-gen-web',
      displayName: 'Lead Gen - Web',
      version: 1,
      versionStatus: 'published',
      destinationReadiness: 'ready',
    })
    // surfaceIds = surfaces activas que permiten el slug (allowlist incluye o vacía).
    expect(entries[0].surfaceIds).toEqual(expect.arrayContaining(['surf-wp', 'surf-open']))
    // No expone GUID/mapping/property names.
    expect(JSON.stringify(entries[0])).not.toMatch(/de4593c3|mapping|portalId/i)
  })

  it('surface con allowlist vacío ve todos los publicados (draft-only excluido)', async () => {
    const entries = await listInsertableFormCatalog(surfaceOpen)

    expect(entries.map(e => e.formSlug)).toEqual(['lead-gen-web'])
  })
})

describe('resolveExternalFormCatalog (auth Opción A — embed key + origin)', () => {
  it('autoriza con surfaceId + secret correcto + origin permitido', async () => {
    const result = await resolveExternalFormCatalog({ surfaceId: 'surf-wp', embedKeySecret: SECRET, origin: 'https://efeoncepro.com' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.entries).toHaveLength(1)
  })

  it('rechaza (unauthorized) origin no permitido', async () => {
    const result = await resolveExternalFormCatalog({ surfaceId: 'surf-wp', embedKeySecret: SECRET, origin: 'https://evil.com' })

    expect(result).toEqual({ ok: false, reason: 'unauthorized' })
  })

  it('rechaza (unauthorized) secreto equivocado', async () => {
    const result = await resolveExternalFormCatalog({ surfaceId: 'surf-wp', embedKeySecret: 'ghek_malo', origin: 'https://efeoncepro.com' })

    expect(result).toEqual({ ok: false, reason: 'unauthorized' })
  })

  it('rechaza (unauthorized) surface sin embed key provisionada', async () => {
    vi.mocked(store.getHostSurfaceById).mockResolvedValueOnce({ ...surfaceWp, embed_key_hash: null } as never)
    const result = await resolveExternalFormCatalog({ surfaceId: 'surf-wp', embedKeySecret: SECRET, origin: 'https://efeoncepro.com' })

    expect(result).toEqual({ ok: false, reason: 'unauthorized' })
  })

  it('rechaza (unauthorized) surface inexistente', async () => {
    const result = await resolveExternalFormCatalog({ surfaceId: 'nope', embedKeySecret: SECRET, origin: 'https://efeoncepro.com' })

    expect(result).toEqual({ ok: false, reason: 'unauthorized' })
  })

  it('missing_credentials si falta surfaceId o secret', async () => {
    expect(await resolveExternalFormCatalog({ surfaceId: null, embedKeySecret: SECRET, origin: 'https://efeoncepro.com' })).toEqual({ ok: false, reason: 'missing_credentials' })
    expect(await resolveExternalFormCatalog({ surfaceId: 'surf-wp', embedKeySecret: null, origin: 'https://efeoncepro.com' })).toEqual({ ok: false, reason: 'missing_credentials' })
  })
})
