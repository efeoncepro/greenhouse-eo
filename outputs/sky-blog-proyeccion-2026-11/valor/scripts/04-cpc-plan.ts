/** Read-only planning. Distinct (country, normalized query) with clicks>0 in the saved GSC inputs, minus keywords that
 * already have ANY snapshot (including provider NULLs) in greenhouse_growth.seo_keyword_market_data (es). Writes
 * keyword_overview/live payloads (≤700 kw) + plan.json with estimateMarketDataCost. Does not call DataForSEO. */
import fs from 'node:fs/promises'
import path from 'node:path'

import { loadGreenhouseToolEnv } from '../../../../scripts/lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres } from '../../../../src/lib/postgres/client'

const OUT = 'outputs/sky-blog-proyeccion-2026-11/valor'
const MARKETS = { chl: 2152, per: 2604 } as const
const SETS = (process.argv[2] ?? 'blog-2026-08,blog-2026-09,blog-2026-10,www-blog-2025-08').split(',')

async function main() {
  loadGreenhouseToolEnv()
  const { readKeywordMarketData, estimateMarketDataCost, MAX_KEYWORDS_PER_OVERVIEW_CALL } = await import('../../../../src/lib/growth/seo/keyword-market-data')
  const plan: Record<string, unknown>[] = []
  let total = 0

  for (const [country, loc] of Object.entries(MARKETS)) {
    const wanted = new Set<string>()
    const perSet: Record<string, number> = {}

    for (const s of SETS) {
      const input = JSON.parse(await fs.readFile(path.join(OUT, 'raw', `gsc-inputs-${s}.json`), 'utf8'))
      const kws = new Set<string>(input.rows.filter((r: any) => r.country === country && r.clicks > 0).map((r: any) => r.normalizedQuery))

      perSet[s] = kws.size
      kws.forEach(k => wanted.add(k))
    }

    const existing = await readKeywordMarketData({ keywords: [...wanted], locationCode: String(loc), languageCode: 'es' })
    const pending = [...wanted].filter(k => !existing.byKeyword.has(k)).sort()
    const est = estimateMarketDataCost(pending.length)

    total += est.estimatedCostUsd
    console.log(country, { perSet, distinct: wanted.size, alreadyHaveSnapshot: existing.byKeyword.size, pending: pending.length, est })

    for (let i = 0; i * MAX_KEYWORDS_PER_OVERVIEW_CALL < pending.length; i++) {
      const kw = pending.slice(i * MAX_KEYWORDS_PER_OVERVIEW_CALL, (i + 1) * MAX_KEYWORDS_PER_OVERVIEW_CALL)
      const file = path.join(OUT, 'dataforseo', `${country}-${i}-payload.json`)

      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, JSON.stringify([{ keywords: kw, location_code: loc, language_code: 'es' }]))
      plan.push({ country, locationCode: String(loc), file, receipt: file.replace('-payload', '-receipt'), keywords: kw.length, estimatedCostUsd: estimateMarketDataCost(kw.length).estimatedCostUsd })
    }
  }

  await fs.writeFile(path.join(OUT, 'dataforseo', 'plan.json'), JSON.stringify({ sets: SETS, ceilingUsd: 3, estimatedCostUsd: +total.toFixed(6), batches: plan }, null, 2))
  console.log('total estimated USD', total.toFixed(4), 'batches', plan.length)
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 }).finally(closeGreenhousePostgres)
