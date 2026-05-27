import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetVercelBillingCacheForTesting,
  getVercelBillingOverview,
  parseVercelFocusJsonl
} from '@/lib/cloud/vercel-billing'
import { clearSecretManagerResolutionCache } from '@/lib/secrets/secret-manager'

const isoDaysAgo = (days: number): string => {
  const date = new Date()

  date.setUTCDate(date.getUTCDate() - days)

  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`
}

const line = (overrides: Record<string, unknown>) =>
  JSON.stringify({
    BilledCost: 10,
    BillingCurrency: 'USD',
    ChargeCategory: 'Usage',
    ChargePeriodStart: isoDaysAgo(2),
    EffectiveCost: 10,
    ServiceName: 'Functions',
    ServiceCategory: 'Compute',
    Tags: {
      ProjectId: 'prj_test',
      ProjectName: 'greenhouse-eo'
    },
    ...overrides
  })

describe('vercel-billing', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    __resetVercelBillingCacheForTesting()
    clearSecretManagerResolutionCache()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    __resetVercelBillingCacheForTesting()
    clearSecretManagerResolutionCache()
  })

  it('parses JSONL focus charges and rejects malformed lines', () => {
    expect(parseVercelFocusJsonl(`${line({ BilledCost: 12 })}\n\n${line({ BilledCost: 8 })}`)).toHaveLength(2)
    expect(() => parseVercelFocusJsonl('{"BilledCost":1}\nnot-json')).toThrow(
      /Invalid Vercel Billing JSONL at line 2/
    )
  })

  it('returns not_configured without calling Vercel when token or team scope is missing', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    const overview = await getVercelBillingOverview({ forceRefresh: true })

    expect(overview.availability).toBe('not_configured')
    expect(overview.source.tokenSource).toBe('unconfigured')
    expect(overview.notes.join(' ')).toContain('GREENHOUSE_VERCEL_API_TOKEN')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aggregates billed cost by day, service, project and category', async () => {
    vi.stubEnv('GREENHOUSE_VERCEL_API_TOKEN', 'test-token')
    vi.stubEnv('GREENHOUSE_VERCEL_TEAM_ID', 'team_test')
    vi.stubEnv('GREENHOUSE_VERCEL_BILLING_MONTHLY_WARN_USD', '100')
    vi.stubEnv('GREENHOUSE_VERCEL_BILLING_MONTHLY_CRITICAL_USD', '200')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          [
            line({ BilledCost: 20, EffectiveCost: 18, ServiceName: 'Functions' }),
            line({
              BilledCost: 5,
              EffectiveCost: 4,
              ServiceName: 'Edge Requests',
              ChargeCategory: 'Usage',
              Tags: { ProjectId: 'prj_edge', ProjectName: 'edge-app' }
            })
          ].join('\n')
      }))
    )

    const overview = await getVercelBillingOverview({ forceRefresh: true, days: 7 })

    expect(overview.availability).toBe('configured')
    expect(overview.totalBilledCost).toBe(25)
    expect(overview.totalEffectiveCost).toBe(22)
    expect(overview.costByService[0]).toMatchObject({ serviceName: 'Functions', billedCost: 20 })
    expect(overview.costByProject.map(project => project.projectName)).toContain('greenhouse-eo')
    expect(overview.costByCategory[0]).toMatchObject({ chargeCategory: 'Usage', billedCost: 25 })
    expect(overview.forecast?.thresholdStatus).not.toBe('unconfigured')
  })

  it('keeps thresholds unconfigured when budget env vars are absent', async () => {
    vi.stubEnv('GREENHOUSE_VERCEL_API_TOKEN', 'test-token')
    vi.stubEnv('GREENHOUSE_VERCEL_TEAM_SLUG', 'efeonce-7670142f')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => line({ BilledCost: 4, EffectiveCost: 4 })
      }))
    )

    const overview = await getVercelBillingOverview({ forceRefresh: true })

    expect(overview.forecast?.thresholdStatus).toBe('unconfigured')
    expect(overview.guardrails.monthlyWarnUsd).toBeNull()
    expect(overview.guardrails.monthlyCriticalUsd).toBeNull()
  })

  it('reports permission failures without exposing the token', async () => {
    vi.stubEnv('GREENHOUSE_VERCEL_API_TOKEN', 'sensitive-token-value')
    vi.stubEnv('GREENHOUSE_VERCEL_TEAM_ID', 'team_test')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403
      }))
    )

    const overview = await getVercelBillingOverview({ forceRefresh: true })

    expect(overview.availability).toBe('error')
    expect(overview.error).toBe('vercel_billing_http_403')
    expect(JSON.stringify(overview)).not.toContain('sensitive-token-value')
    expect(overview.notes[0]).toContain('sin permisos suficientes')
  })
})
