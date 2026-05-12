// TASK-822 Slice 4 — Client Portal curated re-export: ICO overview.
//
// Surfaces the canonical ICO space metrics snapshot for the `client` route
// group. Ownership remains in `ico-engine/` — this file is a POINTER, not a
// transfer. If the upstream signature changes, this re-export reflects the
// change automatically (re-exports are firma exacta per spec §3.1).
//
// V1.0 demonstrative re-export. Real consumers emerge with TASK-823
// (`/api/client-portal/*` endpoints) and TASK-827 (UI composition layer).
//
// Spec: docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md §3.1.

import type { ClientPortalReaderMeta } from '../../dto/reader-meta'

export { readSpaceMetrics, type SpaceMetricSnapshot } from '@/lib/ico-engine/read-metrics'

export const icoOverviewMeta: ClientPortalReaderMeta = {
  key: 'ico-overview',
  classification: 'curated',
  ownerDomain: 'ico-engine',
  dataSources: ['agency.ico'],
  clientFacing: true,
  routeGroup: 'client'
}
