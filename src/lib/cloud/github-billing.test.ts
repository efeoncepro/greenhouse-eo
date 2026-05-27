import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetGitHubBillingCacheForTesting,
  aggregateGitHubBillingUsage,
  getGitHubBillingOverview
} from '@/lib/cloud/github-billing'
import { clearSecretManagerResolutionCache } from '@/lib/secrets/secret-manager'
import type { GitHubBillingPeriod } from '@/types/github-billing'

const period: GitHubBillingPeriod = {
  year: 2026,
  month: 5,
  day: null,
  startDate: '2026-05-01',
  endDate: '2026-05-24',
  days: 24,
  daysInMonth: 31
}

const usageItem = (overrides: Record<string, unknown>) => ({
  date: '2026-05-20',
  product: 'Actions',
  sku: 'Actions Linux',
  quantity: 100,
  unitType: 'Minutes',
  pricePerUnit: 0.006,
  grossAmount: 0.6,
  discountAmount: 0.6,
  netAmount: 0,
  organizationName: 'efeoncepro',
  repositoryName: 'greenhouse-eo',
  ...overrides
})

const summaryItem = (overrides: Record<string, unknown>) => ({
  product: 'Actions',
  sku: 'actions_linux',
  unitType: 'minutes',
  grossQuantity: 100,
  grossAmount: 0.6,
  discountQuantity: 100,
  discountAmount: 0.6,
  netQuantity: 0,
  netAmount: 0,
  ...overrides
})

describe('github-billing', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    __resetGitHubBillingCacheForTesting()
    clearSecretManagerResolutionCache()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    __resetGitHubBillingCacheForTesting()
    clearSecretManagerResolutionCache()
  })

  it('returns not_configured without calling GitHub when token or org is missing', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    const overview = await getGitHubBillingOverview({ forceRefresh: true })

    expect(overview.availability).toBe('not_configured')
    expect(overview.source.tokenSource).toBe('unconfigured')
    expect(overview.notes.join(' ')).toContain('GREENHOUSE_GITHUB_BILLING_TOKEN')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aggregates usage by day, product, sku and repository', () => {
    const overview = aggregateGitHubBillingUsage(
      [
        usageItem({ grossAmount: 92, discountAmount: 92, netAmount: 0, quantity: 15333 }),
        usageItem({
          sku: 'Actions storage',
          unitType: 'GigabyteHours',
          grossAmount: 1.15,
          discountAmount: 1.15,
          netAmount: 0,
          quantity: 3413.46
        }),
        usageItem({
          repositoryName: 'kortex',
          grossAmount: 0.024,
          discountAmount: 0.024,
          netAmount: 0,
          quantity: 4
        })
      ],
      [
        summaryItem({ sku: 'actions_linux', grossAmount: 92, discountAmount: 92, grossQuantity: 15333 }),
        summaryItem({
          sku: 'actions_storage',
          unitType: 'gigabyte-hours',
          grossAmount: 1.15,
          discountAmount: 1.15,
          grossQuantity: 3413.46
        })
      ],
      period,
      { org: 'efeoncepro', tokenSource: 'env' }
    )

    expect(overview.availability).toBe('configured')
    expect(overview.totalGrossAmount).toBe(93.17)
    expect(overview.totalNetAmount).toBe(0)
    expect(overview.byRepository[0]).toMatchObject({ repositoryName: 'greenhouse-eo', grossAmount: 93.15 })
    expect(overview.bySku[0]).toMatchObject({ sku: 'actions_linux', grossAmount: 92 })
    expect(overview.actions.minutes).toBe(15333)
    expect(overview.actions.storageGigabyteHours).toBe(3413.46)
  })

  it('keeps thresholds unconfigured when budget env vars are absent', async () => {
    vi.stubEnv('GREENHOUSE_GITHUB_BILLING_TOKEN', 'test-token')
    vi.stubEnv('GREENHOUSE_GITHUB_BILLING_ORG', 'efeoncepro')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ usageItems: [usageItem({})] })
      }))
    )

    const overview = await getGitHubBillingOverview({ forceRefresh: true, year: 2026, month: 5 })

    expect(overview.forecast?.thresholdStatus).toBe('unconfigured')
    expect(overview.guardrails.monthlyWarnUsd).toBeNull()
    expect(overview.guardrails.monthlyCriticalUsd).toBeNull()
  })

  it('passes supported filters to summary and filters detailed usage locally', async () => {
    vi.stubEnv('GREENHOUSE_GITHUB_BILLING_TOKEN', 'test-token')
    vi.stubEnv('GREENHOUSE_GITHUB_BILLING_ORG', 'efeoncepro')

    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('/summary')
          ? { usageItems: [summaryItem({})] }
          : { usageItems: [usageItem({ repositoryName: 'greenhouse-eo' }), usageItem({ repositoryName: 'kortex' })] }
    }))

    vi.stubGlobal('fetch', fetchMock)

    const overview = await getGitHubBillingOverview({
      forceRefresh: true,
      year: 2026,
      month: 5,
      repository: 'greenhouse-eo',
      product: 'Actions',
      sku: 'Actions Linux'
    })

    expect(fetchMock.mock.calls.some(call => String(call[0]).includes('repository=greenhouse-eo'))).toBe(true)
    expect(overview.byRepository).toHaveLength(1)
    expect(overview.byRepository[0]?.repositoryName).toBe('greenhouse-eo')
  })

  it('reports permission failures without exposing the token', async () => {
    vi.stubEnv('GREENHOUSE_GITHUB_BILLING_TOKEN', 'sensitive-token-value')
    vi.stubEnv('GREENHOUSE_GITHUB_BILLING_ORG', 'efeoncepro')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403
      }))
    )

    const overview = await getGitHubBillingOverview({ forceRefresh: true })

    expect(overview.availability).toBe('error')
    expect(overview.error).toBe('github_billing_http_403')
    expect(JSON.stringify(overview)).not.toContain('sensitive-token-value')
    expect(overview.notes[0]).toContain('sin permisos suficientes')
  })
})
