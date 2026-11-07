/** Read-only valuation with the canonical calculator (calculateOrganicTrafficValue, method gsc_clicks_country_cpc_v1).
 * CPC = stored snapshots (readKeywordMarketData, latest per keyword) + the keyword_overview receipts bought on
 * 2026-11-05 for keywords that had no snapshot (parsed with parseKeywordOverviewItem). The receipts are NOT yet
 * persisted to PG (write blocked in this session; run 06-persist-cpc.ts to persist). After persisting, the CLI
 * scripts/seo/organic-traffic-value.ts --input=raw/gsc-inputs-<set>.json reproduces these numbers. */
import fs from 'node:fs/promises'
import path from 'node:path'

import { loadGreenhouseToolEnv } from '../../../../scripts/lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres } from '../../../../src/lib/postgres/client'

const V = 'outputs/sky-blog-proyeccion-2026-11/valor'
const MARKETS = [{ country: 'chl', locationCode: '2152' }, { country: 'per', locationCode: '2604' }]
const SETS = ['blog-2026-08', 'blog-2026-09', 'blog-2026-10', 'www-blog-2025-07', 'www-blog-2025-08', 'www-blog-2025-09', 'www-blog-2025-09-pre']
const BRAND = /\bsky\b|skyairlines?/i

async function main() {
  loadGreenhouseToolEnv()
  const kmd = await import('../../../../src/lib/growth/seo/keyword-market-data')
  const { calculateOrganicTrafficValue } = await import('../../../../src/lib/growth/seo/organic-traffic-value/calculate')
  // receipts → Map per country
  const plan = JSON.parse(await fs.readFile(path.join(V, 'dataforseo/plan.json'), 'utf8'))
  const bought = new Map<string, Map<string, any>>()

  for (const b of plan.batches) {
    const rec = JSON.parse(await fs.readFile(b.receipt, 'utf8'))
    const task = rec.response.tasks[0]

    if (rec.response.httpStatus !== 200 || task.status_code !== 20000) throw new Error('bad_receipt ' + b.receipt)
    const payload = JSON.parse(await fs.readFile(b.file, 'utf8'))[0]
    const ctx = { locationCode: String(payload.location_code), languageCode: 'es' }
    const m = bought.get(b.country) ?? new Map()
    const found = new Map<string, any>()

    for (const item of task.result?.[0]?.items ?? []) { const d = kmd.parseKeywordOverviewItem(item, ctx);

 if (d) found.set(d.normalizedKeyword, d) }

    for (const k of payload.keywords as string[]) {
      const n = kmd.normalizeMarketKeyword(k)

      m.set(n, { cpcUsd: found.get(n)?.cpcUsd ?? null, providerUpdatedAt: found.get(n)?.providerLastUpdatedAt ?? null })
    }

    bought.set(b.country, m)
  }

  for (const set of SETS) {
    const input = JSON.parse(await fs.readFile(path.join(V, 'raw', `gsc-inputs-${set}.json`), 'utf8'))
    const cpc: any[] = []
    const marketReads: any[] = []

    for (const mk of MARKETS) {
      const kws = [...new Set<string>(input.rows.filter((r: any) => r.country === mk.country).map((r: any) => kmd.normalizeMarketKeyword(r.query)))]
      const stored = await kmd.readKeywordMarketData({ keywords: kws, locationCode: mk.locationCode, languageCode: 'es' })
      let fromStored = 0, fromReceipt = 0

      for (const k of kws) {
        const s = stored.byKeyword.get(k)

        if (s) { cpc.push({ normalizedQuery: k, country: mk.country, cpcUsd: s.cpcUsd, capturedAt: s.capturedAt, providerUpdatedAt: s.providerLastUpdatedAt }); fromStored++; continue }
        const b = bought.get(mk.country)?.get(k)

        if (b) { cpc.push({ normalizedQuery: k, country: mk.country, cpcUsd: b.cpcUsd, capturedAt: '2026-11-05', providerUpdatedAt: b.providerUpdatedAt }); fromReceipt++ }
      }

      marketReads.push({ ...mk, keywords: kws.length, fromStoredSnapshot: fromStored, fromReceipt20261105: fromReceipt, latestStoredCapture: stored.freshness.latestCaptureDate })
    }

    const result = calculateOrganicTrafficValue({ ...input, gscCapturedAt: input.capturedAt, brandPattern: BRAND, cpc })

    const out = { organizationId: input.organizationId, siteUrl: input.siteUrl, hostname: input.hostname, range: input.range, scope: input.scope ?? null,
      brandPattern: BRAND.source, generatedAt: new Date().toISOString(), gscCapturedAt: input.capturedAt, providerCompleteness: input.providerCompleteness,
      marketReads, cpcTemporalBasis: 'snapshot_prices_as_of_capture_not_historical_month_prices', ...result }

    await fs.writeFile(path.join(V, 'canonical', `valor-${set}.json`), JSON.stringify(out, null, 1))
    console.log(set, JSON.stringify(result.summary), JSON.stringify(result.brands.map(b => [b.brand, b.estimatedValueUsd, b.valuedClicks])), JSON.stringify(marketReads))
  }
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 }).finally(closeGreenhousePostgres)
