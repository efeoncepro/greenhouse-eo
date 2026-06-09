import 'server-only'

import { captureWithDomain, type CaptureDomain } from '@/lib/observability/capture'

/**
 * Account 360 facet query observability — anti silent-drift contract.
 *
 * Canonical facet readers (src/lib/account-360/facets/*) historically wrapped each sub-query in
 * `.catch(() => [])`. That swallows real failures (a renamed column, a wrong JOIN key, a schema
 * drift) and makes them INDISTINGUISHABLE from "this org genuinely has no rows" — which is exactly
 * how the empty Team / Delivery tabs lived undetected. See CLAUDE.md "SQL Signal Reader Schema
 * Validation Gate".
 *
 * Two honest handlers replace the silent catch:
 *
 * - `observeAndRethrow`: for PRIMARY data a facet cannot fake. Captures to Sentry (domain rollup)
 *   then re-throws so the 360 resolver records it in `_meta.errors` and OMITS the facet. A broken
 *   facet must be VISIBLE (absent + error), never half-rendered with silent zeros.
 *
 * - `observeAndDegrade`: for OPTIONAL enrichment that has a legitimate "no value" state or a
 *   downstream fallback (e.g. ICO metrics: null is honest, and a canonical BigQuery source is
 *   tried next). Captures, then returns the provided fallback so the rest of the facet still
 *   resolves.
 */

export const observeAndRethrow =
  (domain: CaptureDomain, source: string) =>
  (err: unknown): never => {
    captureWithDomain(err, domain, { tags: { source } })

    throw err
  }

export const observeAndDegrade =
  <T>(domain: CaptureDomain, source: string, fallback: T) =>
  (err: unknown): T => {
    captureWithDomain(err, domain, { tags: { source } })

    return fallback
  }
