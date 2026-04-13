import { afterEach, describe, expect, it, vi } from 'vitest'

const { resolveSecret } = vi.hoisted(() => ({
  resolveSecret: vi.fn()
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret
}))

import {
  decodeNuboxXmlPayload,
  fetchAllPages,
  getNuboxSalePdf,
  getNuboxSaleXml,
  listNuboxSales
} from '@/lib/nubox/client'

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

  it('sanitizes quoted tokens with trailing literal newline markers', async () => {
    vi.stubEnv('NUBOX_API_BASE_URL', 'https://nubox.example.com')
    vi.stubEnv('NUBOX_X_API_KEY', 'nubox-api-key')
    resolveSecret.mockResolvedValue({
      source: 'secret_manager',
      value: '"env-token\\n"'
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

  it('normalizes config and sends explicit binary Accept headers for PDF/XML downloads', async () => {
    vi.stubEnv('NUBOX_API_BASE_URL', 'https://nubox.example.com/\n')
    vi.stubEnv('NUBOX_X_API_KEY', 'nubox-api-key\n')
    resolveSecret.mockResolvedValue({
      source: 'env',
      value: 'env-token'
    })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(8)
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<xml />'
      })

    vi.stubGlobal('fetch', fetchMock)

    await getNuboxSalePdf(114)
    await getNuboxSaleXml(114)

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://nubox.example.com/sales/114/pdf?template=TEMPLATE_A4',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer env-token',
          'x-api-key': 'nubox-api-key',
          Accept: 'application/pdf'
        })
      })
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://nubox.example.com/sales/114/xml',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer env-token',
          'x-api-key': 'nubox-api-key',
          Accept: 'application/xml,text/xml,application/json'
        })
      })
    )
  })

  it('keeps paginating when Nubox omits x-total-count but pages are still full', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 2 }, (_, index) => ({ id: index + 1 })),
        totalCount: 0
      })
      .mockResolvedValueOnce({
        data: [{ id: 3 }],
        totalCount: 0
      })

    const rows = await fetchAllPages(fetcher, '2026-03', 2)

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(rows).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })
})
