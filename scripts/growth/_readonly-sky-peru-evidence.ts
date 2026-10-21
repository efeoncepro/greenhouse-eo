/**
 * Lectura puntual (read-only) de evidencia de Perú en el Blog de SKY para el complemento a Pibank (21-10-2026).
 * Usa las conexiones GSC y GA4 ya consentidas por SKY; no cambia estado de conexión, scopes ni datos.
 * Salida: JSON en la ruta del primer argumento.
 */
import fs from 'node:fs/promises'

import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const ORG = 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f'
const BLOG_HOST = 'blog.skyairline.com'
const AI_SOURCES = 'chatgpt|openai|gemini|perplexity|copilot|claude|deepseek|meta\\.ai|grok|you\\.com'

const main = async () => {
  const out = process.argv[2]

  if (!out) throw Error('Falta la ruta de salida')
  const { resolveSecretByRef } = await import('@/lib/secrets/secret-manager')
  const { getSearchConsoleConnection } = await import('@/lib/growth/search-console/connection-store')
  const { resolveSearchConsoleOAuthConfig, refreshAccessToken } = await import('@/lib/growth/search-console/oauth-client')
  const { getGa4Connection } = await import('@/lib/growth/analytics-ga4/connection-store')
  const { resolveGa4OAuthConfig, refreshGa4AccessToken } = await import('@/lib/growth/analytics-ga4/oauth-client')
  const { Ga4DataClient } = await import('@/lib/growth/ga4/api-client')

  const gsc = await getSearchConsoleConnection(ORG)
  const ga4 = await getGa4Connection(ORG)

  if (gsc?.status !== 'active' || !gsc.tokenSecretRef || !gsc.siteUrl) throw Error('GSC no activa')
  if (ga4?.status !== 'active' || !ga4.tokenSecretRef || !ga4.propertyId) throw Error('GA4 no activa')
  const gscToken = await refreshAccessToken((await resolveSearchConsoleOAuthConfig())!, (await resolveSecretByRef(gsc.tokenSecretRef))!)
  const ga4Refresh = (await resolveSecretByRef(ga4.tokenSecretRef))!
  const ga4Config = (await resolveGa4OAuthConfig())!
  const data = new Ga4DataClient({ getAccessToken: () => refreshGa4AccessToken(ga4Config, ga4Refresh) })

  const gscQuery = async (body: Record<string, unknown>) => {
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gsc.siteUrl!)}/searchAnalytics/query`,
      { method: 'POST', headers: { Authorization: `Bearer ${gscToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'web', rowLimit: 25000, ...body }) }
    )

    if (!res.ok) throw Error(`GSC ${res.status}: ${(await res.text()).slice(0, 300)}`)

    return ((await res.json()) as { rows?: Array<{ keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }> }).rows ?? []
  }

  const peru = { dimension: 'country', operator: 'equals', expression: 'per' }
  const range = { startDate: '2025-10-01', endDate: '2026-10-19' }

  const host = { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: BLOG_HOST } } }
  const country = { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'Peru' } } }
  const ai = { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'PARTIAL_REGEXP', value: AI_SOURCES, caseSensitive: false } } }
  const and = (...e: unknown[]) => ({ andGroup: { expressions: e } })

  const report = async (dims: string[], metrics: string[], filter: unknown, dateRange = { startDate: '2025-10-01', endDate: '2026-09-30' }) => {
    const r = await data.runReport(ga4.propertyId!, {
      dateRanges: [dateRange],
      dimensions: dims.map(name => ({ name })),
      metrics: metrics.map(name => ({ name })),
      dimensionFilter: filter as Record<string, unknown>,
      limit: '10000'
    })

    return {
      rowCount: r.rowCount ?? 0,
      rows: (r.rows ?? []).map(row => ({
        ...Object.fromEntries(dims.map((d, i) => [d, row.dimensionValues?.[i]?.value])),
        ...Object.fromEntries(metrics.map((m, i) => [m, Number(row.metricValues?.[i]?.value)]))
      }))
    }
  }

  const traffic = ['sessions', 'engagedSessions', 'totalUsers', 'screenPageViews', 'averageSessionDuration']

  const result = {
    capturedAt: new Date().toISOString(),
    gsc: {
      siteUrl: gsc.siteUrl,
      dailyAll: await gscQuery({ ...range, dimensions: ['date'], dataState: 'final' }),
      dailyPeru: await gscQuery({ ...range, dimensions: ['date'], dataState: 'final', dimensionFilterGroups: [{ filters: [peru] }] }),
      queriesPeruAugSep: await gscQuery({ startDate: '2026-08-01', endDate: '2026-09-30', dimensions: ['query'], dataState: 'final', rowLimit: 1000, dimensionFilterGroups: [{ filters: [peru] }] }),
      pagesPeruAugSep: await gscQuery({ startDate: '2026-08-01', endDate: '2026-09-30', dimensions: ['page'], dataState: 'final', rowLimit: 200, dimensionFilterGroups: [{ filters: [peru] }] }),
      countries12m: await gscQuery({ startDate: '2025-10-01', endDate: '2026-09-30', dimensions: ['country'], dataState: 'final', rowLimit: 50 }),
      pagesPeru12m: await gscQuery({ startDate: '2025-10-01', endDate: '2026-09-30', dimensions: ['page'], dataState: 'final', rowLimit: 300, dimensionFilterGroups: [{ filters: [peru] }] })
    },
    ga4: {
      propertyId: ga4.propertyId,
      peruMonthly: await report(['yearMonth'], traffic, and(host, country)),
      allMonthly: await report(['yearMonth'], traffic, host),
      peruChannels12m: await report(['sessionDefaultChannelGroup'], ['sessions', 'engagedSessions'], and(host, country)),
      aiMonthlyAll: await report(['yearMonth', 'sessionSource'], ['sessions', 'engagedSessions', 'screenPageViews'], and(host, ai), { startDate: '2025-10-01', endDate: '2026-10-19' }),
      aiMonthlyPeru: await report(['yearMonth', 'sessionSource'], ['sessions', 'engagedSessions', 'screenPageViews'], and(host, country, ai), { startDate: '2025-10-01', endDate: '2026-10-19' }),
      aiCountries12m: await report(['country'], ['sessions', 'engagedSessions'], and(host, ai)),
      aiLandingsPeru12m: await report(['landingPage'], ['sessions'], and(host, country, ai)),
      peruCities12m: await report(['city'], ['sessions'], and(host, country))
    }
  }

  await fs.writeFile(out, JSON.stringify(result, null, 2))
  console.log('ok', out)
  process.exit(0)
}

main().catch(e => {
  console.error('FAILED:', e instanceof Error ? e.message : e)
  process.exit(1)
})
