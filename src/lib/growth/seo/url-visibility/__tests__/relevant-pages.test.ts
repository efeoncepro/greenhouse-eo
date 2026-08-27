import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1776 — Colectores on-demand de concentración (`relevant_pages` / `subdomains`).
 *
 * Cubre: cada página/subdominio devuelto queda como fila con su subject_kind, la corrida
 * fresca no se re-compra, y el dominio desconocido deja fila-marcador con NULLs.
 */

vi.mock('server-only', () => ({}))

const state = {
  freshRows: [] as Array<{ found: number }>,
  inserts: [] as Array<{ sql: string; params: unknown[] }>
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('INSERT INTO greenhouse_growth.seo_url_visibility_snapshots')) {
      state.inserts.push({ sql, params })

      return []
    }

    if (sql.includes('FROM greenhouse_growth.seo_url_visibility_snapshots')) {
      return state.freshRows
    }

    return []
  }
}))

const gateMock = vi.fn()

vi.mock('../../entitlement', () => ({
  SEO_MODULE_KEY: 'seo_v2',
  SEO_MODULE_KEYS_READ: ['seo_v2'],
  enforceSeoRunEntitlement: (...args: unknown[]) => gateMock(...args)
}))

const providerMock = vi.fn()

vi.mock('@/lib/ai/dataforseo', () => ({
  postDataForSeoTask: (...args: unknown[]) => providerMock(...args)
}))

vi.mock('../../flags', () => ({
  isSeoModuleEnabled: () => true,
  isSeoUrlVisibilityEnabled: () => true
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

import { captureRelevantPages, captureSubdomains, normalizePageAddress } from '../relevant-pages'

const pagesResponse = (items: Array<Record<string, unknown>>, cost = 0.0241) => ({
  ok: true,
  httpStatus: 200,
  cost,
  tasks: [{ status_code: 20000, result: [{ items }] }]
})

beforeEach(() => {
  state.freshRows = []
  state.inserts = []
  gateMock.mockReset()
  gateMock.mockResolvedValue({ allowed: true, budgetRemainingUsd: 50, blockedReason: null })
  providerMock.mockReset()
})

describe('normalizePageAddress', () => {
  it('host sin www + path sin trailing slash; la raíz queda como el host', () => {
    expect(normalizePageAddress('https://www.Cliente.CL/guia/')).toBe('cliente.cl/guia')
    expect(normalizePageAddress('https://cliente.cl/')).toBe('cliente.cl')
  })
})

describe('captureRelevantPages', () => {
  it('cada página queda como fila subject_kind=url con métricas del item', async () => {
    providerMock.mockResolvedValue(
      pagesResponse([
        { page_address: 'https://cliente.cl/guia', metrics: { organic: { count: 90, etv: 700.5, pos_1: 1 } } },
        { page_address: 'https://cliente.cl/blog/post', metrics: { organic: { count: 10, etv: 50 } } }
      ])
    )

    const result = await captureRelevantPages({
      organizationId: 'org-1',
      domain: 'cliente.cl',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.status).toBe('captured')
    expect(result.rowsWritten).toBe(2)
    expect(state.inserts[0].params[0]).toBe('url')
    expect(state.inserts[0].params[1]).toBe('cliente.cl/guia')
    expect(state.inserts[0].params[5]).toBe('relevant_pages')
  })

  it('corrida fresca dentro del ciclo no se re-compra', async () => {
    state.freshRows = [{ found: 1 }]

    const result = await captureRelevantPages({
      organizationId: 'org-1',
      domain: 'cliente.cl',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.status).toBe('fresh')
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('dominio desconocido deja fila-marcador con NULLs (no se re-compra el ciclo)', async () => {
    providerMock.mockResolvedValue(pagesResponse([]))

    const result = await captureRelevantPages({
      organizationId: 'org-1',
      domain: 'desconocido.cl',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.status).toBe('no_market_data')
    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0].params[0]).toBe('domain')
  })

  it('un dominio con path se rechaza explícito', async () => {
    const result = await captureRelevantPages({
      organizationId: 'org-1',
      domain: 'cliente.cl/blog',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result).toEqual({ ok: false, errorCode: 'invalid_domain', status: null })
  })
})

describe('captureSubdomains', () => {
  it('cada subdominio queda como fila subject_kind=subdomain', async () => {
    providerMock.mockResolvedValue(
      pagesResponse([{ subdomain: 'Blog.cliente.cl', metrics: { organic: { count: 40, etv: 300 } } }])
    )

    const result = await captureSubdomains({
      organizationId: 'org-1',
      domain: 'cliente.cl',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rowsWritten).toBe(1)
    expect(state.inserts[0].params[0]).toBe('subdomain')
    expect(state.inserts[0].params[1]).toBe('blog.cliente.cl')
    expect(state.inserts[0].params[5]).toBe('subdomains')
  })

  it('gate bloqueado no gasta', async () => {
    gateMock.mockResolvedValue({ allowed: false, budgetRemainingUsd: 0, blockedReason: 'quota_exhausted' })

    const result = await captureSubdomains({
      organizationId: 'org-1',
      domain: 'cliente.cl',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result).toEqual({ ok: false, errorCode: 'quota_exhausted', status: null })
    expect(providerMock).not.toHaveBeenCalled()
  })
})
