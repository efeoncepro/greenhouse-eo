// Serie mensual extendida (2023-01..2026-11-04) con la MISMA definición que la auditoría 2026-10-23.
import { and, scope, organic, dims, mets } from './lib.mjs'

const FULL = [{ startDate: '2023-01-01', endDate: '2026-11-04' }]
const traffic = mets('sessions', 'engagedSessions', 'engagementRate', 'totalUsers', 'screenPageViews')

export default [
  { name: 'series-organic-scope-monthly', kind: 'report', body: { dateRanges: FULL, dimensions: dims('yearMonth'), metrics: traffic, dimensionFilter: and(scope, organic) } },
  { name: 'series-organic-scope-host-monthly', kind: 'report', body: { dateRanges: FULL, dimensions: dims('yearMonth', 'hostName'), metrics: mets('sessions'), dimensionFilter: and(scope, organic) } },
  { name: 'series-organic-scope-country-monthly', kind: 'report', body: { dateRanges: FULL, dimensions: dims('yearMonth', 'country'), metrics: mets('sessions'), dimensionFilter: and(scope, organic) } },
  { name: 'series-allchannels-scope-monthly', kind: 'report', body: { dateRanges: FULL, dimensions: dims('yearMonth', 'sessionDefaultChannelGroup'), metrics: mets('sessions'), dimensionFilter: scope } },
  { name: 'series-allchannels-scope-total-monthly', kind: 'report', body: { dateRanges: FULL, dimensions: dims('yearMonth'), metrics: traffic, dimensionFilter: scope } },
  // Control de reconciliación: mismas ventanas de la auditoría.
  { name: 'series-reconcile-windows', kind: 'report', body: { dateRanges: [
      { startDate: '2026-10-01', endDate: '2026-10-21' }, { startDate: '2025-10-01', endDate: '2025-10-21' },
      { startDate: '2026-11-01', endDate: '2026-11-04' }, { startDate: '2025-11-01', endDate: '2025-11-04' }],
    dimensions: [], metrics: mets('sessions'), dimensionFilter: and(scope, organic) } }
]
