// TASK-822 Slice 1 — Client Portal BFF reader metadata contract.
//
// Single source of truth for reader classification + data sources of every
// export under src/lib/client-portal/readers/. Compile-checked + grep-able +
// consumable by TASK-824 (modules catalog parity).
//
// Spec: docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md §3.1.
//
// Hard rules (canonized in spec §3.1):
//   - `classification: 'curated'` ALWAYS has `ownerDomain` non-null (the
//     domain that retains canonical ownership of the underlying reader).
//   - `classification: 'native'` ALWAYS has `ownerDomain: null` (the reader
//     was born in client_portal because no other domain claims it).
//   - `dataSources` enumerates upstream producers; values match the closed
//     `ClientPortalDataSource` union. TASK-824 parity test will cross-check
//     this union against `greenhouse_client_portal.modules.data_sources[]`
//     once that table exists.

/**
 * Closed enumeration of producer domains that a Client Portal BFF reader may
 * consume. Mirrors the catalog of `data_sources` declared per module in the
 * canonical spec §5.5. Add new entries here ONLY when a new producer domain
 * emerges with a stable read surface; coordinate with TASK-824 to keep DB
 * enum in sync.
 */
export type ClientPortalDataSource =
  | 'commercial.engagements'
  | 'commercial.deals'
  | 'commercial.quotes'
  | 'finance.invoices'
  | 'finance.payments'
  | 'agency.ico'
  | 'agency.csc'
  | 'agency.brand_intelligence'
  | 'agency.creative_hub'
  | 'agency.revenue_enabled'
  | 'agency.pulse'
  | 'account_360.summary'
  | 'account_360.economics'
  | 'delivery.tasks'
  | 'delivery.projects'
  | 'assigned_team.assignments'
  | 'identity.organizations'

/**
 * Closed enumeration of producer domains that may *own* a BFF curated
 * re-export. Match the folder name under `src/lib/<owner>/`. Used to enforce
 * the invariant that a curated re-export always declares its canonical home.
 */
export type ClientPortalReaderOwnerDomain =
  | 'account-360'
  | 'agency'
  | 'ico-engine'
  | 'commercial'
  | 'finance'
  | 'delivery'
  | 'identity'

/**
 * Reader classification per spec §3.1. Mutually exclusive.
 *
 * - `curated`: pure re-export from a producer domain. The reader continues
 *   to live (and evolve) in its owner domain. The BFF surfaces it for the
 *   client portal route group without owning its semantics.
 * - `native`: born in client_portal. No upstream owner; client_portal owns
 *   the signature. V1.0 ships ZERO native readers; first candidate will be
 *   the resolver of TASK-825.
 */
export type ClientPortalReaderClassification = 'curated' | 'native'

/**
 * Route group that consumes the reader primarily. Useful for downstream
 * audits (e.g. lint rule could one day cross-check `routeGroup` against the
 * importing file path).
 */
export type ClientPortalRouteGroup = 'client' | 'agency' | 'admin'

export interface ClientPortalReaderMeta {
  /**
   * Stable identifier matching the file name (kebab-case). Example:
   * `account-summary` for `readers/curated/account-summary.ts`.
   */
  readonly key: string

  /** Curated re-export vs native BFF helper. See spec §3.1. */
  readonly classification: ClientPortalReaderClassification

  /**
   * Owner domain when curated; `null` for native readers.
   * Invariant enforced at runtime by `assertReaderMeta()`.
   */
  readonly ownerDomain: ClientPortalReaderOwnerDomain | null

  /**
   * Producer domains that feed this reader. Non-empty; mirrors the
   * `modules.data_sources[]` catalog (TASK-824 will validate parity).
   */
  readonly dataSources: readonly ClientPortalDataSource[]

  /**
   * Whether the read crosses a client-facing boundary. V1.0 readers all
   * declare `true`; admin/agency-only re-exports do NOT belong in client_portal.
   */
  readonly clientFacing: boolean

  /** Primary route group consumer. */
  readonly routeGroup: ClientPortalRouteGroup
}

/**
 * Runtime invariant check for a `ClientPortalReaderMeta` instance. Throws if
 * the meta violates spec §3.1 (curated requires `ownerDomain`, native forbids
 * it). Used by smoke tests; not called from hot paths.
 */
export const assertReaderMeta = (meta: ClientPortalReaderMeta): void => {
  if (meta.classification === 'curated' && meta.ownerDomain === null) {
    throw new Error(
      `[client-portal/dto] reader '${meta.key}' is curated but ownerDomain is null. ` +
        `Curated re-exports must declare their canonical owner domain (spec §3.1).`
    )
  }

  if (meta.classification === 'native' && meta.ownerDomain !== null) {
    throw new Error(
      `[client-portal/dto] reader '${meta.key}' is native but declares ownerDomain='${meta.ownerDomain}'. ` +
        `Native readers must set ownerDomain=null because client_portal owns them (spec §3.1).`
    )
  }

  if (meta.dataSources.length === 0) {
    throw new Error(
      `[client-portal/dto] reader '${meta.key}' declares zero dataSources. Every BFF reader must ` +
        `enumerate the upstream producers it consumes (spec §3.1).`
    )
  }
}
