/** Persists the bought keyword_overview receipts with the canonical writer (parseKeywordOverviewItem +
 * persistKeywordMarketData, sourceEndpoint keyword_overview). Keywords the provider did not return are written with
 * NULL metrics (three-state rule). Cost of each batch is attributed to its first row. Idempotent per capture date. */
import fs from 'node:fs/promises'
import path from 'node:path'

import { loadGreenhouseToolEnv } from '../../../../scripts/lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres } from '../../../../src/lib/postgres/client'

const OUT = 'outputs/sky-blog-proyeccion-2026-11/valor/dataforseo'
const ORG = 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f'

async function main() {
  loadGreenhouseToolEnv()
  const kmd = await import('../../../../src/lib/growth/seo/keyword-market-data')
  const plan = JSON.parse(await fs.readFile(path.join(OUT, 'plan.json'), 'utf8'))
  const summary: Record<string, unknown>[] = []

  for (const b of plan.batches) {
    const rec = JSON.parse(await fs.readFile(b.receipt, 'utf8').catch(() => 'null'))

    if (!rec) { summary.push({ file: b.file, status: 'no_receipt' }); continue }
    const resp = rec.response
    const task = resp.tasks?.[0]

    if (resp.httpStatus !== 200 || task?.status_code !== 20000) throw new Error(`bad_receipt ${b.receipt}`)
    const payload = JSON.parse(await fs.readFile(b.file, 'utf8'))[0]
    const ctx = { locationCode: String(payload.location_code), languageCode: payload.language_code }
    const found = new Map<string, ReturnType<typeof kmd.parseKeywordOverviewItem>>()

    for (const item of task.result?.[0]?.items ?? []) {
      const d = kmd.parseKeywordOverviewItem(item, ctx)

      if (d) found.set(d.normalizedKeyword, d)
    }

    const data = (payload.keywords as string[]).map(k => {
      const n = kmd.normalizeMarketKeyword(k)

      
return found.get(n) ?? {
        normalizedKeyword: n, keyword: k, ...ctx, searchVolume: null, keywordDifficulty: null, competition: null,
        competitionLevel: null, cpcUsd: null, searchIntent: null, searchIntentProbability: null, coreKeyword: null,
        providerLastUpdatedAt: null, avgPageRank: null, avgMainDomainRank: null, avgBacklinks: null, avgReferringDomains: null
      }
    })

    // de-dup by normalized keyword (unique constraint per capture date)
    const uniq = [...new Map(data.map(d => [d.normalizedKeyword, d])).values()]
    const r = await kmd.persistKeywordMarketData({ data: uniq as any, sourceEndpoint: 'keyword_overview', capturedByOrganizationId: ORG, providerCostUsd: resp.costUsd })

    summary.push({ file: b.file, requested: payload.keywords.length, returned: found.size, withCpc: [...found.values()].filter(d => d?.cpcUsd !== null).length, rowsWritten: r.rowsWritten, costUsd: resp.costUsd })
    console.log(summary.at(-1))
  }

  await fs.writeFile(path.join(OUT, 'persist-summary.json'), JSON.stringify(summary, null, 2))
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 }).finally(closeGreenhousePostgres)
