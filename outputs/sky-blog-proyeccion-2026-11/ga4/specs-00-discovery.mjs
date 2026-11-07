import { f, scope, dims, mets } from './lib.mjs'

const R = [{ startDate: '2025-01-01', endDate: '2026-10-31' }]

export default [
  { name: 'admin-property', kind: 'get', path: 'https://analyticsadmin.googleapis.com/v1beta/properties/{pid}' },
  { name: 'admin-keyEvents', kind: 'get', path: 'https://analyticsadmin.googleapis.com/v1beta/properties/{pid}/keyEvents?pageSize=200' },
  { name: 'admin-dataStreams', kind: 'get', path: 'https://analyticsadmin.googleapis.com/v1beta/properties/{pid}/dataStreams?pageSize=200' },
  { name: 'admin-customDimensions', kind: 'get', path: 'https://analyticsadmin.googleapis.com/v1beta/properties/{pid}/customDimensions?pageSize=200' },
  { name: 'admin-dataRetention', kind: 'get', path: 'https://analyticsadmin.googleapis.com/v1beta/properties/{pid}/dataRetentionSettings' },
  { name: 'admin-attribution', kind: 'get', path: 'https://analyticsadmin.googleapis.com/v1alpha/properties/{pid}/attributionSettings' },
  { name: 'metadata', kind: 'get', path: 'https://analyticsdata.googleapis.com/v1beta/properties/{pid}/metadata' },
  { name: 'site-events-2025-2026', kind: 'report', body: { dateRanges: R, dimensions: dims('eventName'), metrics: mets('eventCount', 'keyEvents', 'totalUsers', 'eventValue') } },
  { name: 'site-monthly-totals', kind: 'report', body: { dateRanges: [{ startDate: '2023-01-01', endDate: '2026-11-04' }], dimensions: dims('yearMonth'), metrics: mets('sessions', 'totalUsers', 'keyEvents', 'ecommercePurchases', 'transactions', 'purchaseRevenue', 'totalRevenue', 'sessionKeyEventRate') } },
  { name: 'site-hosts-2025-2026', kind: 'report', body: { dateRanges: R, dimensions: dims('hostName'), metrics: mets('sessions', 'eventCount', 'keyEvents', 'ecommercePurchases', 'purchaseRevenue') } },
  { name: 'site-purchase-hosts', kind: 'report', body: { dateRanges: R, dimensions: dims('hostName', 'eventName'), metrics: mets('eventCount', 'keyEvents', 'eventValue'), dimensionFilter: f('eventName', 'PARTIAL_REGEXP', 'purchase|checkout|payment|booking|reserva|add_to_cart|begin|search|select') } },
  { name: 'blog-earliest-daily', kind: 'report', body: { dateRanges: [{ startDate: '2020-01-01', endDate: '2024-02-01' }], dimensions: dims('yearMonth'), metrics: mets('sessions'), dimensionFilter: scope } },
  { name: 'blog-landing-by-host-2025', kind: 'report', body: { dateRanges: [{ startDate: '2025-01-01', endDate: '2025-01-31' }], dimensions: dims('hostName', 'landingPage'), metrics: mets('sessions'), dimensionFilter: scope, limit: '50', orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] } },
  { name: 'blog-landing-by-host-2026', kind: 'report', body: { dateRanges: [{ startDate: '2026-09-01', endDate: '2026-09-30' }], dimensions: dims('hostName', 'landingPage'), metrics: mets('sessions'), dimensionFilter: scope, limit: '50', orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] } }
]
