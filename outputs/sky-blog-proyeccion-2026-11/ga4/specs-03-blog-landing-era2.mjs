// (a)/(d) era blog.skyairline.com: sesiones cuya landingPage está en blog_landing_paths.json (classify_blog_landings.py).
import fs from 'node:fs'

import { and, organic, dims, mets } from './lib.mjs'

const paths = JSON.parse(fs.readFileSync(new URL('./blog_landing_paths.json', import.meta.url)))
const inList = { filter: { fieldName: 'landingPage', inListFilter: { values: paths, caseSensitive: true } } }
const R = [{ startDate: '2025-10-01', endDate: '2026-10-31' }]
const conv = mets('sessions', 'keyEvents:purchase', 'sessionKeyEventRate:purchase', 'ecommercePurchases', 'transactions', 'purchaseRevenue', 'keyEvents', 'sessionKeyEventRate')

export default [
  // Comparador de (b): tasa de compradores del sitio = totalPurchasers / totalUsers, por mes y país
  { name: 'conv-site-purchasers-country', kind: 'report', body: { dateRanges: [{ startDate: '2025-01-01', endDate: '2026-10-31' }], dimensions: dims('yearMonth', 'country'), metrics: mets('totalUsers', 'activeUsers', 'totalPurchasers') } },
  { name: 'conv-site-purchasers-total', kind: 'report', body: { dateRanges: [{ startDate: '2025-01-01', endDate: '2026-10-31' }], dimensions: dims('yearMonth'), metrics: mets('totalUsers', 'activeUsers', 'totalPurchasers') } },
  { name: 'conv-landing-blog-era2-monthly', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth'), metrics: conv, dimensionFilter: inList } },
  { name: 'conv-landing-blog-era2-monthly-country', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth', 'country'), metrics: conv, dimensionFilter: inList } },
  { name: 'conv-landing-blog-era2-monthly-organic', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth'), metrics: conv, dimensionFilter: and(inList, organic) } }
]
