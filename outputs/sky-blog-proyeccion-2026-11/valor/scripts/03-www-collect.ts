/** Read-only. Mirrors collectOrganicTrafficValueInputs (src/lib/growth/seo/organic-traffic-value/collect.ts) for the
 * www.skyairline.com property restricted to /blog/ pages (pre-migration history), because the canonical collector only
 * reads the org's connected property (the blog). Same params: type=web, dataState=final, aggregationType=byPage,
 * controls without query, paginated page×query×country detail. Writes canonical-shape input JSON + history CSVs. */
import fs from 'node:fs/promises'
import path from 'node:path'

import { init, query, pageFilter, csv, ORG, WWW } from './gsc-lib'
import { normalizeMarketKeyword } from '../../../../src/lib/growth/seo/keyword-market-data'
import { closeGreenhousePostgres } from '../../../../src/lib/postgres/client'

const OUT = 'outputs/sky-blog-proyeccion-2026-11/valor'

const MONTHS: [string, string, string][] = [
  ['2025-07', '2025-07-01', '2025-07-31'],
  ['2025-08', '2025-08-01', '2025-08-31'],
  ['2025-09', '2025-09-01', '2025-09-30'],
  ['2025-09-pre', '2025-09-01', '2025-09-25']
]

async function main() {
  await init()
  const pageCsv: (string | number | null)[][] = [['month', 'page', 'clicks', 'impressions', 'ctr', 'position']]
  const qCsv: (string | number | null)[][] = [['month', 'page', 'query', 'country', 'clicks', 'impressions', 'ctr', 'position']]

  for (const [label, startDate, endDate] of MONTHS) {
    const common = { startDate, endDate, type: 'web', dataState: 'final', aggregationType: 'byPage', dimensionFilterGroups: pageFilter(WWW.pageRegex) }
    const totalRows = await query(WWW.siteUrl, { ...common, dimensions: [] }, 1)
    const pageRows = await query(WWW.siteUrl, { ...common, dimensions: ['page'] })
    const queryRows = await query(WWW.siteUrl, { ...common, dimensions: ['page', 'query', 'country'] })

    const input = {
      scope: { rules: [{ kind: 'prefix', value: '/blog/' }], note: 'www property, page regex ' + WWW.pageRegex },
      organizationId: ORG,
      siteUrl: WWW.siteUrl,
      hostname: 'www.skyairline.com',
      range: { startDate, endDate },
      capturedAt: new Date().toISOString(),
      queryPaginationExhausted: true,
      providerCompleteness: 'top_rows_only_privacy_and_provider_limits_apply',
      totalClicks: totalRows[0]?.clicks ?? 0,
      totalImpressions: totalRows[0]?.impressions ?? 0,
      controls: pageRows.map(r => ({ page: r.keys[0], clicks: r.clicks })),
      rows: queryRows.filter(r => r.clicks > 0).map(r => ({
        page: r.keys[0], query: r.keys[1], normalizedQuery: normalizeMarketKeyword(r.keys[1]), country: r.keys[2].toLowerCase(), clicks: r.clicks
      }))
    }

    await fs.writeFile(path.join(OUT, 'raw', `gsc-inputs-www-blog-${label}.json`), JSON.stringify(input))

    if (!label.endsWith('-pre')) {
      for (const r of pageRows) pageCsv.push([label, r.keys[0], r.clicks, r.impressions, +r.ctr.toFixed(4), +r.position.toFixed(2)])
      for (const r of queryRows) qCsv.push([label, r.keys[0], r.keys[1], r.keys[2], r.clicks, r.impressions, +r.ctr.toFixed(4), +r.position.toFixed(2)])
    }

    console.log(label, { total: input.totalClicks, pages: pageRows.length, queryRows: queryRows.length, withClicks: input.rows.length,
      controlSum: pageRows.reduce((a, r) => a + r.clicks, 0) })
  }

  await fs.writeFile(path.join(OUT, 'historia-www-blog-paginas-mensual.csv'), csv(pageCsv))
  await fs.writeFile(path.join(OUT, 'historia-www-blog-consultas-pagina-pais-mensual.csv'), csv(qCsv))
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 }).finally(closeGreenhousePostgres)
