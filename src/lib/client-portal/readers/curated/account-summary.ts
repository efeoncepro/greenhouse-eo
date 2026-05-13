// TASK-822 Slice 4 — Client Portal curated re-export: account summary.
//
// Surfaces the canonical organization executive snapshot for the `client`
// route group. Ownership remains in `account-360/` — this file is a POINTER,
// not a transfer. If the upstream signature changes, this re-export reflects
// the change automatically (re-exports are firma exacta per spec §3.1).
//
// V1.0 demonstrative re-export. Real consumers emerge with TASK-823
// (`/api/client-portal/*` endpoints) and TASK-827 (UI composition layer).
//
// Spec: docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md §3.1.

import type { ClientPortalReaderMeta } from '../../dto/reader-meta'

export {
  getOrganizationExecutiveSnapshot,
  type OrganizationExecutiveSnapshot
} from '@/lib/account-360/organization-executive'

export const accountSummaryMeta: ClientPortalReaderMeta = {
  key: 'account-summary',
  classification: 'curated',
  ownerDomain: 'account-360',
  dataSources: [
    'account_360.summary',
    'account_360.economics',
    'commercial.engagements',
    'finance.invoices',
    'agency.ico'
  ],
  clientFacing: true,
  routeGroup: 'client'
}
