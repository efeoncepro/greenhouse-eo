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
  getSeoDomainOverviewStalenessSignal,
  SEO_DOMAIN_OVERVIEW_STALENESS_SIGNAL_ID
} from '../seo-domain-overview-staleness'

beforeEach(() => {
  queryMock.mockReset()
})

describe('getSeoDomainOverviewStalenessSignal', () => {
  it('sin sujetos elegibles → ok', async () => {
    queryMock.mockResolvedValue([])

    const signal = await getSeoDomainOverviewStalenessSignal()

    expect(signal.signalId).toBe(SEO_DOMAIN_OVERVIEW_STALENESS_SIGNAL_ID)
    expect(signal.severity).toBe('ok')
  })

  it('rollout pendiente (ningún sujeto capturado jamás) → ok con summary honesto, no warning permanente', async () => {
    queryMock.mockResolvedValue([
      { normalized_domain: 'cliente.cl', age_days: null },
      { normalized_domain: 'competidor.cl', age_days: null }
    ])

    const signal = await getSeoDomainOverviewStalenessSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('sin rollout')
  })

  it('todos frescos → ok', async () => {
    queryMock.mockResolvedValue([
      { normalized_domain: 'cliente.cl', age_days: 12 },
      { normalized_domain: 'competidor.cl', age_days: 30 }
    ])

    const signal = await getSeoDomainOverviewStalenessSignal()

    expect(signal.severity).toBe('ok')
  })

  it('sujeto stale habiendo otros capturados → warning', async () => {
    queryMock.mockResolvedValue([
      { normalized_domain: 'cliente.cl', age_days: 12 },
      { normalized_domain: 'nuevo.cl', age_days: null },
      { normalized_domain: 'viejo.cl', age_days: 75 }
    ])

    const signal = await getSeoDomainOverviewStalenessSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('2 de 3')
  })

  it('TODOS stale con data histórica → error (la captura murió, p. ej. flag borrado por deploy)', async () => {
    queryMock.mockResolvedValue([
      { normalized_domain: 'cliente.cl', age_days: 70 },
      { normalized_domain: 'competidor.cl', age_days: 90 }
    ])

    const signal = await getSeoDomainOverviewStalenessSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED')
  })

  it('error de lectura → unknown, jamás un falso sano', async () => {
    queryMock.mockRejectedValue(new Error('conexión caída'))

    const signal = await getSeoDomainOverviewStalenessSignal()

    expect(signal.severity).toBe('unknown')
  })

  it('la query usa el patrón ::int de date-math y consume SEO_MODULE_KEYS_READ', async () => {
    queryMock.mockResolvedValue([])

    await getSeoDomainOverviewStalenessSignal()

    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain('(CURRENT_DATE - MAX(o.capture_date))::int')
    expect(sql).not.toContain('EXTRACT(EPOCH')
    expect(params[0]).toEqual(['seo_v2'])
  })
})
