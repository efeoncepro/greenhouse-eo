/** Read-only. GSC monthly series (clicks/impr/CTR/position) for the blog property and the www /blog/ prefix,
 * split brand / non-brand (canonical SKY rule) and by country. aggregationType=byPage, type=web, dataState=all. */
import fs from 'node:fs/promises'
import path from 'node:path'

import { init, query, pageFilter, csv, BLOG, WWW, BRAND_RE2, type Row } from './gsc-lib'
import { closeGreenhousePostgres } from '../../../../src/lib/postgres/client'

const OUT = 'outputs/sky-blog-proyeccion-2026-11/valor'
const START = '2025-06-01'
const END = '2026-11-04'

async function main() {
  await init()
  const props = { blog: BLOG, www_blog: WWW }

  const seg: Record<string, Record<string, unknown>[]> = {
    total: [],
    brand: [{ dimension: 'query', operator: 'includingRegex', expression: BRAND_RE2 }],
    non_brand: [{ dimension: 'query', operator: 'excludingRegex', expression: BRAND_RE2 }]
  }

  const out: (string | number | null)[][] = [
    ['property', 'month', 'segment', 'country', 'country_basis', 'clicks', 'impressions', 'ctr', 'position', 'days_with_data', 'first_date', 'last_date', 'partial_month']
  ]

  for (const [pname, prop] of Object.entries(props)) {
    const data: Record<string, { byCountry: Row[]; byDate: Row[] }> = {}

    for (const [sname, filters] of Object.entries(seg)) {
      const base = { startDate: START, endDate: END, type: 'web', dataState: 'all', aggregationType: 'byPage', dimensionFilterGroups: pageFilter(prop.pageRegex, filters) }

      // GSC quirk (verified 05-11-2026, scripts/02b-country-probe.ts): with a page filter (byPage) the country dimension only
      // returns query-visible clicks (oct-26: 7.433 of 24.965). For the blog property (whole property = blog) the total
      // country split uses property aggregation without page filter; for www/blog only the visible-query split exists.
      const countryBase = pname === 'blog' && sname === 'total'
        ? { startDate: START, endDate: END, type: 'web', dataState: 'all', aggregationType: 'byProperty' }
        : base

      const byCountry = await query(prop.siteUrl, { ...countryBase, dimensions: ['date', 'country'] })
      const byDate = await query(prop.siteUrl, { ...base, dimensions: ['date'] })

      data[sname] = { byCountry, byDate }
      await fs.writeFile(path.join(OUT, 'raw', `gsc-daily-${pname}-${sname}.json`), JSON.stringify({ siteUrl: prop.siteUrl, base, byCountry, byDate }))
      console.log(pname, sname, byCountry.length, byDate.length)
    }

    type Acc = { c: number; i: number; pw: number; days: Set<string> }
    const acc = new Map<string, Acc>()

    const add = (k: string, r: Row, date: string) => {
      const a = acc.get(k) ?? { c: 0, i: 0, pw: 0, days: new Set() }

      a.c += r.clicks; a.i += r.impressions; a.pw += r.position * r.impressions; a.days.add(date)
      acc.set(k, a)
    }

    for (const [sname, d] of Object.entries(data)) {
      for (const r of d.byDate) add(`${r.keys[0].slice(0, 7)}|${sname}|all`, r, r.keys[0])

      for (const r of d.byCountry) {
        const cg = r.keys[1] === 'chl' ? 'chl' : r.keys[1] === 'per' ? 'per' : 'other'

        add(`${r.keys[0].slice(0, 7)}|${sname}|${cg}`, r, r.keys[0])
      }
    }

    const months = [...new Set([...acc.keys()].map(k => k.split('|')[0]))].sort()

    for (const m of months) {
      for (const cg of ['all', 'chl', 'per', 'other']) {
        for (const s of ['total', 'brand', 'non_brand']) {
          const a = acc.get(`${m}|${s}|${cg}`)

          if (!a) continue
          const days = [...a.days].sort()
          const lastDay = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate()
          const basis = cg === 'all' ? 'page_aggregated_control' : pname === 'blog' && s === 'total' ? 'property_aggregated_all_clicks' : 'page_filtered_query_visible_clicks_only'

          out.push([pname, m, s, cg, basis, a.c, a.i, a.i ? +(a.c / a.i).toFixed(4) : null, a.i ? +(a.pw / a.i).toFixed(2) : null, days.length, days[0], days.at(-1)!, days.length < lastDay ? 'yes' : 'no'])
        }

        const t = acc.get(`${m}|total|${cg}`), b = acc.get(`${m}|brand|${cg}`), n = acc.get(`${m}|non_brand|${cg}`)

        if (t && cg === 'all') out.push([pname, m, 'anonymized_residual', cg, 'page_aggregated_control', t.c - (b?.c ?? 0) - (n?.c ?? 0), t.i - (b?.i ?? 0) - (n?.i ?? 0), null, null, null, null, null, ''])
      }
    }
  }

  await fs.writeFile(path.join(OUT, 'gsc-serie-mensual.csv'), csv(out))
  console.log('rows', out.length)
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 }).finally(closeGreenhousePostgres)
