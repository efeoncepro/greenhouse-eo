// Impacto en conversión: qué puede probar GA4. Todo read-only. Ejecutar DESPUÉS de specs-00-discovery
// (confirma el nombre real del evento de compra y los key events; si no es "purchase", cambiar PURCHASE).
import { f, and, not, scope, organic, dims, mets } from './lib.mjs'

const PURCHASE = process.env.SKY_PURCHASE_EVENT ?? 'purchase'
const R = [{ startDate: '2025-01-01', endDate: '2026-10-31' }]
const months = []

for (let y = 2025; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
  if (y === 2026 && m > 10) break
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate(), mm = String(m).padStart(2, '0')

  months.push({ ym: `${y}-${mm}`, startDate: `${y}-${mm}-01`, endDate: `${y}-${mm}-${last}` })
}

// Key events de la propiedad: purchase y vpv_bv (vista virtual, ~178M/22 meses). Se usa la variante :purchase.
const conv = mets('sessions', 'keyEvents:purchase', 'sessionKeyEventRate:purchase', 'ecommercePurchases', 'transactions', 'purchaseRevenue', 'totalRevenue', 'keyEvents', 'sessionKeyEventRate')
// Paso de funnel "vio una página del blog" (ambos hosts), en sintaxis funnelFieldFilter.
const ff = (fieldName, matchType, value) => ({ funnelFieldFilter: { fieldName, stringFilter: { matchType, value, caseSensitive: false } } })
// pagePath/fullPageUrl no se admiten en pasos de funnel; pageLocation (URL completa) sí.
const blogStep = ff('pageLocation', 'FULL_REGEXP', '^https?://(blog\\.skyairline\\.com|www\\.skyairline\\.com/blog)([/?#].*)?$')
const blogOrganicStep = { andGroup: { expressions: [blogStep, ff('sessionDefaultChannelGroup', 'EXACT', 'Organic Search')] } }
const purchaseStep = { funnelEventFilter: { eventName: PURCHASE } }

const funnel = (name, m, step1, within) => ({
  name, kind: 'funnel', body: {
    dateRanges: [{ startDate: m.startDate, endDate: m.endDate }],
    funnel: { isOpenFunnel: false, steps: [{ name: 'blog', filterExpression: step1 }, { name: 'purchase', filterExpression: purchaseStep, ...(within ? { withinDurationFromPriorStep: within } : {}) }] },
    funnelBreakdown: { breakdownDimension: { name: 'country' }, limit: '6' }
  }
})

// Landing en el blog: landingPage es de sesión (sin host). En la era www (hasta 2025-09) "^/blog" es inequívoco.
const landingBlogWww = f('landingPage', 'FULL_REGEXP', '^/blog(/.*)?$')

export default [
  // Inventario de key events y compras del sitio
  { name: 'conv-site-events-keyevents', kind: 'report', body: { dateRanges: R, dimensions: dims('eventName'), metrics: mets('eventCount', 'keyEvents', 'eventValue') } },
  { name: 'conv-site-monthly', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth'), metrics: conv } },
  { name: 'conv-site-monthly-country', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth', 'country'), metrics: conv } },
  { name: 'conv-site-monthly-organic', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth'), metrics: conv, dimensionFilter: organic } },
  { name: 'conv-purchase-by-host', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth', 'hostName'), metrics: mets('eventCount', 'keyEvents', 'eventValue'), dimensionFilter: f('eventName', 'EXACT', PURCHASE) } },
  // (a)/(d) sesiones con landing en el blog (era www, inequívoca) y su tasa de key event / ingresos, total y por país
  { name: 'conv-landing-blog-www-monthly', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth'), metrics: conv, dimensionFilter: landingBlogWww } },
  { name: 'conv-landing-blog-www-monthly-country', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth', 'country'), metrics: conv, dimensionFilter: landingBlogWww } },
  { name: 'conv-landing-blog-www-monthly-organic', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth'), metrics: conv, dimensionFilter: and(landingBlogWww, organic) } },
  // (a) era blog.skyairline.com: landingPage × hostName para detectar sesiones que empiezan en el blog y luego tocan otros hosts
  { name: 'conv-landing-host-matrix', kind: 'report', body: { dateRanges: [{ startDate: '2025-10-01', endDate: '2026-10-31' }], dimensions: dims('landingPage', 'hostName'), metrics: mets('sessions'), dimensionFilter: f('hostName', 'EXACT', 'blog.skyairline.com'), limit: '250000' } },
  { name: 'conv-landing-totals', kind: 'report', body: { dateRanges: [{ startDate: '2025-10-01', endDate: '2026-10-31' }], dimensions: dims('landingPage'), metrics: mets('sessions'), limit: '250000' } },
  { name: 'conv-site-item-revenue', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth'), metrics: mets('itemRevenue', 'itemsPurchased') } },
  { name: 'conv-site-purchasers', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth'), metrics: mets('totalPurchasers', 'grossPurchaseRevenue', 'totalRevenue') } },
  // (c) páginas de www vistas con referrer = blog, y sesiones nuevas atribuidas al blog (auto-referral)
  { name: 'conv-www-pages-referrer-blog', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth', 'hostName', 'pagePath'), metrics: mets('screenPageViews', 'eventCount'), dimensionFilter: and(f('pageReferrer', 'PARTIAL_REGEXP', 'blog\\.skyairline\\.com|skyairline\\.com/blog'), not(scope)), limit: '250000' } },
  { name: 'conv-sessions-source-blog', kind: 'report', body: { dateRanges: R, dimensions: dims('yearMonth', 'sessionSource', 'sessionMedium'), metrics: conv, dimensionFilter: f('sessionSource', 'PARTIAL_REGEXP', 'blog\\.skyairline\\.com') } },
  // (b) usuarios que vieron el blog y compraron en el mismo mes (funnel cerrado, usuario) + misma visita (<=30 min)
  ...months.flatMap(m => [
    funnel(`funnel-user-blog-then-purchase-${m.ym}`, m, blogStep),
    funnel(`funnel-user-blogorganic-then-purchase-${m.ym}`, m, blogOrganicStep),
    funnel(`funnel-30min-blog-then-purchase-${m.ym}`, m, blogStep, '1800s')
  ])
]
