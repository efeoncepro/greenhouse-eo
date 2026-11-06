// Consultas por mes (4 meses por request, dimensión dateRange) para evitar la pérdida por fila "(other)"
// (metadata.dataLossFromOtherRow=true) que afecta a yearMonth × country en rangos largos.
import fs from 'node:fs'

import { f, and, scope, organic, dims, mets } from './lib.mjs'

const months = []

for (let y = 2023; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
  if ((y === 2023 && m < 7) || (y === 2026 && m > 11)) continue
  const mm = String(m).padStart(2, '0'), last = y === 2026 && m === 11 ? 4 : new Date(Date.UTC(y, m, 0)).getUTCDate()

  months.push({ ym: `${y}-${mm}`, startDate: `${y}-${mm}-01`, endDate: `${y}-${mm}-${String(last).padStart(2, '0')}`, name: `${y}-${mm}` })
}

const chunk = (arr, n) => arr.reduce((a, x, i) => (i % n ? a[a.length - 1].push(x) : a.push([x]), a), [])
const paths = JSON.parse(fs.readFileSync(new URL('./blog_landing_paths.json', import.meta.url)))
const landing2 = { filter: { fieldName: 'landingPage', inListFilter: { values: paths, caseSensitive: true } } }
const landing1 = f('landingPage', 'FULL_REGEXP', '^/blog(/.*)?$')
const conv = mets('sessions', 'keyEvents:purchase', 'sessionKeyEventRate:purchase', 'transactions')
const out = []

for (const g of chunk(months, 4)) {
  const dr = g.map(m => ({ startDate: m.startDate, endDate: m.endDate, name: m.name }))
  const tag = `${g[0].ym}_${g[g.length - 1].ym}`

  out.push({ name: `pm-organic-total-${tag}`, kind: 'report', body: { dateRanges: dr, dimensions: [], metrics: mets('sessions'), dimensionFilter: and(scope, organic) } })
  out.push({ name: `pm-organic-country-${tag}`, kind: 'report', body: { dateRanges: dr, dimensions: dims('country'), metrics: mets('sessions'), dimensionFilter: and(scope, organic) } })
  out.push({ name: `pm-allch-channel-${tag}`, kind: 'report', body: { dateRanges: dr, dimensions: dims('sessionDefaultChannelGroup'), metrics: mets('sessions'), dimensionFilter: scope } })
  const g2 = g.filter(m => m.ym >= '2025-01' && m.ym <= '2026-10')

  if (g2.length) {
    const dr2 = g2.map(m => ({ startDate: m.startDate, endDate: m.endDate, name: m.name }))

    out.push({ name: `pm-site-conv-country-${tag}`, kind: 'report', body: { dateRanges: dr2, dimensions: dims('country'), metrics: conv } })
    out.push({ name: `pm-site-purchasers-country-${tag}`, kind: 'report', body: { dateRanges: dr2, dimensions: dims('country'), metrics: mets('activeUsers', 'totalPurchasers') } })
    const e1 = g2.filter(m => m.ym <= '2025-09'), e2 = g2.filter(m => m.ym >= '2025-10')

    if (e1.length) out.push({ name: `pm-blogland-conv-country-${tag}-e1`, kind: 'report', body: { dateRanges: e1.map(m => ({ startDate: m.startDate, endDate: m.endDate, name: m.name })), dimensions: dims('country'), metrics: conv, dimensionFilter: landing1 } })
    if (e2.length) out.push({ name: `pm-blogland-conv-country-${tag}-e2`, kind: 'report', body: { dateRanges: e2.map(m => ({ startDate: m.startDate, endDate: m.endDate, name: m.name })), dimensions: dims('country'), metrics: conv, dimensionFilter: landing2 } })
  }
}

export default out
