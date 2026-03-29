import { afterEach, describe, expect, it, vi } from 'vitest'

const { resolveSecret } = vi.hoisted(() => ({
  resolveSecret: vi.fn()
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret
}))

import { decodeNuboxXmlPayload, listNuboxSales } from '@/lib/nubox/client'

describe('decodeNuboxXmlPayload', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    resolveSecret.mockReset()
  })

  it('returns raw xml bodies unchanged', () => {
    const xml = '<DTE><Folio>114</Folio></DTE>'

    expect(decodeNuboxXmlPayload(xml)).toBe(xml)
  })

  it('decodes Nubox json payloads with base64 xml', () => {
    const xml = '<DTE><Folio>114</Folio></DTE>'

    const payload = JSON.stringify({
      xml: Buffer.from(xml, 'utf8').toString('base64')
    })

    expect(decodeNuboxXmlPayload(payload)).toBe(xml)
  })

  it('uses the resolved secret when calling Nubox', async () => {
    vi.stubEnv('NUBOX_API_BASE_URL', 'https://nubox.example.com')
    vi.stubEnv('NUBOX_X_API_KEY', 'nubox-api-key')
    resolveSecret.mockResolvedValue({
      source: 'secret_manager',
      value: 'sm-token'
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
      headers: new Headers({
        'x-total-count': '0'
      })
    })

    vi.stubGlobal('fetch', fetchMock)

    await listNuboxSales('2026-03')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: 'Bearer sm-token',
        'x-api-key': 'nubox-api-key'
      })
    })
  })

  it('keeps legacy env fallback working when the helper resolves from env', async () => {
    vi.stubEnv('NUBOX_API_BASE_URL', 'https://nubox.example.com')
    vi.stubEnv('NUBOX_X_API_KEY', 'nubox-api-key')
    resolveSecret.mockResolvedValue({
      source: 'env',
      value: 'env-token'
    })

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
      headers: new Headers({
        'x-total-count': '0'
      })
    })

    vi.stubGlobal('fetch', fetchMock)

    await listNuboxSales('2026-03')

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: 'Bearer env-token'
      })
    })
  })

  it('throws a clear error when the token is unconfigured', async () => {
    vi.stubEnv('NUBOX_API_BASE_URL', 'https://nubox.example.com')
    vi.stubEnv('NUBOX_X_API_KEY', 'nubox-api-key')
    resolveSecret.mockResolvedValue({
      source: 'unconfigured',
      value: null
    })

    await expect(listNuboxSales('2026-03')).rejects.toThrow('NUBOX_BEARER_TOKEN is not configured')
  })
})
