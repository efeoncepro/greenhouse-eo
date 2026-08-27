import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  getSeoUrlVisibilityStalenessSignal,
  SEO_URL_VISIBILITY_STALENESS_SIGNAL_ID
} from '../seo-url-visibility-staleness'

beforeEach(() => {
  queryMock.mockReset()
})

describe('getSeoUrlVisibilityStalenessSignal', () => {
  it('rollout pendiente reporta ok con summary explícito, no warning permanente', async () => {
    queryMock.mockResolvedValue([
      { normalized_subject: 'cliente.cl', age_days: null },
      { normalized_subject: 'competidor.cl', age_days: null }
    ])

    const signal = await getSeoUrlVisibilityStalenessSignal()

    expect(signal.signalId).toBe(SEO_URL_VISIBILITY_STALENESS_SIGNAL_ID)
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('sin rollout')
  })

  it('sujeto stale con otros capturados → warning; todos stale con historia → error', async () => {
    queryMock.mockResolvedValue([
      { normalized_subject: 'cliente.cl', age_days: 10 },
      { normalized_subject: 'nuevo.cl', age_days: 80 }
    ])

    expect((await getSeoUrlVisibilityStalenessSignal()).severity).toBe('warning')

    queryMock.mockResolvedValue([
      { normalized_subject: 'cliente.cl', age_days: 70 },
      { normalized_subject: 'nuevo.cl', age_days: 80 }
    ])

    const dead = await getSeoUrlVisibilityStalenessSignal()

    expect(dead.severity).toBe('error')
    expect(dead.summary).toContain('GROWTH_SEO_URL_VISIBILITY_ENABLED')
  })

  it('error de lectura → unknown; la query usa ::int y SEO_MODULE_KEYS_READ', async () => {
    queryMock.mockRejectedValue(new Error('caída'))
    expect((await getSeoUrlVisibilityStalenessSignal()).severity).toBe('unknown')

    queryMock.mockReset()
    queryMock.mockResolvedValue([])
    await getSeoUrlVisibilityStalenessSignal()

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain('::int')
    expect(sql).not.toContain('EXTRACT(EPOCH')
    expect(params[0]).toEqual(['seo_v2'])
  })
})
