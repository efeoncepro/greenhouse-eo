import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ExposureModule from '../exposure'
import type * as StoreModule from '../store'

/**
 * TASK-1430 — métricas de marketing del cockpit (instrucción del operador):
 * los rates/deltas se resuelven ÍNTEGRAMENTE server-side en el reader; solo
 * `server_confirmed` (form_submitted/action_completed) cuenta como conversión;
 * denominador 0 ⇒ rates null (la UI muestra "sin datos", jamás un 0% falso);
 * y una falla del reader degrada `metrics` a null sin romper el detalle.
 */

const storeMock = vi.hoisted(() => ({
  summarizeConversionEventWindows: vi.fn(),
  summarizeAlignedEventCounts: vi.fn(),
  getLastAcceptedEventAt: vi.fn(),
  getCtaDefinitionById: vi.fn(),
  listVersionsForCta: vi.fn(),
  summarizeConversionEvents: vi.fn(),
}))

const exposureMock = vi.hoisted(() => ({ summarizeViewedExposureWindows: vi.fn(), getFirstViewedBucketAt: vi.fn() }))

const captureMock = vi.hoisted(() => ({ captureWithDomain: vi.fn() }))

vi.mock('../store', async importOriginal => ({
  ...(await importOriginal<typeof StoreModule>()),
  summarizeConversionEventWindows: storeMock.summarizeConversionEventWindows,
  summarizeAlignedEventCounts: storeMock.summarizeAlignedEventCounts,
  getLastAcceptedEventAt: storeMock.getLastAcceptedEventAt,
  getCtaDefinitionById: storeMock.getCtaDefinitionById,
  listVersionsForCta: storeMock.listVersionsForCta,
  summarizeConversionEvents: storeMock.summarizeConversionEvents,
}))

vi.mock('../exposure', async importOriginal => ({
  ...(await importOriginal<typeof ExposureModule>()),
  summarizeViewedExposureWindows: exposureMock.summarizeViewedExposureWindows,
  getFirstViewedBucketAt: exposureMock.getFirstViewedBucketAt,
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: captureMock.captureWithDomain }))

import { getCtaDetailAdmin, getCtaMarketingMetrics } from '../readers'

const CTA_ID = 'a0000000-0000-0000-0000-000000000001'

beforeEach(() => {
  vi.clearAllMocks()
  storeMock.getLastAcceptedEventAt.mockResolvedValue('2026-07-18 10:00:00+00')
  exposureMock.summarizeViewedExposureWindows.mockResolvedValue([])
  exposureMock.getFirstViewedBucketAt.mockResolvedValue('2020-01-01 00:00:00+00')
  storeMock.summarizeConversionEventWindows.mockResolvedValue([])
  storeMock.summarizeAlignedEventCounts.mockResolvedValue([])
})

describe('getCtaMarketingMetrics', () => {
  it('computa CTR, tasa de conversión y deltas server-side', async () => {
    exposureMock.summarizeViewedExposureWindows.mockResolvedValue([
      { window: 'current', viewed: 1000, lastBucketAt: '2026-07-18 09:00:00+00' },
      { window: 'previous', viewed: 800, lastBucketAt: '2026-06-20 09:00:00+00' },
    ])
    storeMock.summarizeConversionEventWindows.mockResolvedValue([
      { window: 'current', eventKind: 'clicked', trustLevel: 'browser_reported', total: 50 },
      { window: 'previous', eventKind: 'clicked', trustLevel: 'browser_reported', total: 32 },
      { window: 'current', eventKind: 'form_submitted', trustLevel: 'server_confirmed', total: 20 },
      { window: 'previous', eventKind: 'form_submitted', trustLevel: 'server_confirmed', total: 8 },
    ])

    const metrics = await getCtaMarketingMetrics(CTA_ID, 30)

    expect(metrics.impressions).toEqual({ current: 1000, previous: 800, deltaPct: 25 })
    expect(metrics.clicks.current).toBe(50)
    expect(metrics.conversions).toEqual({ current: 20, previous: 8, deltaPct: 150 })
    expect(metrics.ctr.current).toBeCloseTo(0.05)
    expect(metrics.ctr.previous).toBeCloseTo(0.04)
    expect(metrics.ctr.deltaPp).toBeCloseTo(1)
    expect(metrics.conversionRate.current).toBeCloseTo(0.02)
    expect(metrics.conversionRate.deltaPp).toBeCloseTo(1)
    expect(metrics.coverage).toBe('ok')
    expect(metrics.lastEventAt).toBe('2026-07-18 10:00:00+00')
  })

  it('cobertura parcial ⇒ CTR/tasa sobre la ventana ALINEADA (desde el primer viewed)', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    exposureMock.getFirstViewedBucketAt.mockResolvedValue(ayer)
    exposureMock.summarizeViewedExposureWindows.mockResolvedValue([
      { window: 'current', viewed: 2, lastBucketAt: ayer },
    ])
    storeMock.summarizeConversionEventWindows.mockResolvedValue([
      // 3 clics en la ventana COMPLETA (2 son anteriores al tracking de viewed)
      { window: 'current', eventKind: 'clicked', trustLevel: 'browser_reported', total: 3 },
    ])
    storeMock.summarizeAlignedEventCounts.mockResolvedValue([
      { eventKind: 'clicked', trustLevel: 'browser_reported', total: 1 },
    ])

    const metrics = await getCtaMarketingMetrics(CTA_ID)

    expect(metrics.coverage).toBe('aligned_partial')
    expect(metrics.coverageSince).toBe(ayer)
    expect(metrics.clicks.current).toBe(3) // conteo de card = ventana completa
    expect(metrics.ctr.current).toBeCloseTo(0.5) // rate = alineado: 1/2
    expect(metrics.ctr.previous).toBeNull()
  })

  it('cobertura parcial pero alineado clicks > viewed ⇒ sigue undercounted', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    exposureMock.getFirstViewedBucketAt.mockResolvedValue(ayer)
    exposureMock.summarizeViewedExposureWindows.mockResolvedValue([
      { window: 'current', viewed: 1, lastBucketAt: ayer },
    ])
    storeMock.summarizeConversionEventWindows.mockResolvedValue([
      { window: 'current', eventKind: 'clicked', trustLevel: 'browser_reported', total: 5 },
    ])
    storeMock.summarizeAlignedEventCounts.mockResolvedValue([
      { eventKind: 'clicked', trustLevel: 'browser_reported', total: 4 },
    ])

    const metrics = await getCtaMarketingMetrics(CTA_ID)

    expect(metrics.coverage).toBe('impressions_undercounted')
    expect(metrics.ctr.current).toBeNull()
  })

  it('clicks > impressions con cobertura completa ⇒ impressions_undercounted', async () => {
    exposureMock.summarizeViewedExposureWindows.mockResolvedValue([
      { window: 'current', viewed: 2, lastBucketAt: '2026-07-18 09:00:00+00' },
    ])
    storeMock.summarizeConversionEventWindows.mockResolvedValue([
      { window: 'current', eventKind: 'clicked', trustLevel: 'browser_reported', total: 3 },
    ])

    const metrics = await getCtaMarketingMetrics(CTA_ID)

    expect(metrics.coverage).toBe('impressions_undercounted')
  })

  it('solo server_confirmed form_submitted/action_completed cuenta como conversión', async () => {
    storeMock.summarizeConversionEventWindows.mockResolvedValue([
      // browser_reported jamás es conversión aunque el kind coincida
      { window: 'current', eventKind: 'form_submitted', trustLevel: 'browser_reported', total: 40 },
      // los breadcrumbs `error` server_confirmed tampoco
      { window: 'current', eventKind: 'error', trustLevel: 'server_confirmed', total: 3 },
      { window: 'current', eventKind: 'action_completed', trustLevel: 'server_confirmed', total: 7 },
    ])

    const metrics = await getCtaMarketingMetrics(CTA_ID)

    expect(metrics.conversions.current).toBe(7)
  })

  it('denominador 0 ⇒ rates y deltas null (jamás un 0% falso)', async () => {
    storeMock.summarizeConversionEventWindows.mockResolvedValue([
      { window: 'current', eventKind: 'clicked', trustLevel: 'browser_reported', total: 5 },
    ])

    const metrics = await getCtaMarketingMetrics(CTA_ID)

    expect(metrics.impressions.current).toBe(0)
    expect(metrics.ctr.current).toBeNull()
    expect(metrics.ctr.deltaPp).toBeNull()
    expect(metrics.conversionRate.current).toBeNull()
    expect(metrics.impressions.deltaPct).toBeNull()
  })
})

describe('getCtaDetailAdmin — degradación honesta de métricas', () => {
  it('una falla del reader de métricas deja metrics=null sin romper el detalle', async () => {
    storeMock.getCtaDefinitionById.mockResolvedValue({
      cta_id: CTA_ID,
      slug: 'demo',
      name: 'Demo',
      purpose: 'lead_magnet',
      owner_team: null,
      campaign_slug: null,
      status: 'active',
      default_locale: 'es-CL',
    })
    storeMock.listVersionsForCta.mockResolvedValue([])
    storeMock.summarizeConversionEvents.mockResolvedValue([])
    storeMock.summarizeConversionEventWindows.mockRejectedValue(new Error('pg down'))

    const detail = await getCtaDetailAdmin(CTA_ID)

    expect(detail).not.toBeNull()
    expect(detail?.metrics).toBeNull()
    expect(captureMock.captureWithDomain).toHaveBeenCalledOnce()
  })
})
