import 'server-only'

import { loadHubSpotOwnerBindingByOwnerId } from '@/lib/commercial/hubspot-owner-identity'
import { query } from '@/lib/db'

import type { HubSpotGreenhouseProductProfile } from '@/lib/integrations/hubspot-greenhouse-service'

// ─────────────────────────────────────────────────────────────
// TASK-604 — Inbound rehydration of v2 fields into product_catalog.
//
// `sync-hubspot-products.ts` first writes to `greenhouse_finance.products`
// (legacy store), then `syncCanonicalFinanceProduct` bridges scalar fields
// into `greenhouse_commercial.product_catalog`. This hydrator runs AFTER
// the bridge and writes ONLY the v2 inbound-writable fields:
//
//   - commercial_owner_assigned_at       (always-write; HS audit trail)
//   - commercial_owner_member_id         (conflict resolution, see below)
//   - marketing_url                      (first-sync only; preserve if set)
//   - image_urls                         (first-sync only; preserve if set)
//   - description_rich_html              (first-sync only; preserve if set)
//
// GH-SoT fields are NEVER written here (prices, category/unit/tax codes,
// product_type, pricing_model, classification, bundle_type, is_recurring,
// recurring_billing_*). Those drift through the outbound; TASK-603 is the
// writer, TASK-604 only reads for drift reports.
//
// Owner conflict resolution (soft-SoT during pre-admin-UI window):
//   1. If `owner_gh_authoritative = TRUE` → GH wins. Preserve existing.
//   2. If `hs_lastmodifieddate > gh_last_write_at` → HS wins. Upsert member.
//   3. Else → GH wins. Preserve existing.
//
// After TASK-605 lands admin UI, governance flips to GH-wins always and
// `owner_gh_authoritative` defaults to TRUE. That change is outside this
// module's scope.
// ─────────────────────────────────────────────────────────────

export type HydrationOutcome =
  | { kind: 'updated'; productId: string; fieldsWritten: string[] }
  | { kind: 'no_changes'; productId: string }
  | { kind: 'skipped_no_row'; productId: string }
  | { kind: 'owner_unmapped'; productId: string; hubspotOwnerId: string }

interface ProductCatalogRow extends Record<string, unknown> {
  product_id: string
  gh_last_write_at: string | null
  owner_gh_authoritative: boolean | null
  commercial_owner_member_id: string | null
  commercial_owner_assigned_at: string | null
  marketing_url: string | null
  image_urls: string[] | null
  description_rich_html: string | null
}

const readRow = async (productId: string): Promise<ProductCatalogRow | null> => {
  const rows = await query<ProductCatalogRow>(
    `SELECT product_id,
            gh_last_write_at::text AS gh_last_write_at,
            owner_gh_authoritative,
            commercial_owner_member_id,
            commercial_owner_assigned_at::text AS commercial_owner_assigned_at,
            marketing_url,
            image_urls,
            description_rich_html
       FROM greenhouse_commercial.product_catalog
      WHERE product_id = $1
      LIMIT 1`,
    [productId]
  )

  return rows[0] ?? null
}

/**
 * Returns `true` if HubSpot's last-modified timestamp is newer than
 * Greenhouse's last-write timestamp. A missing GH timestamp counts as
 * "GH never wrote" → HS always wins.
 */
const isHubSpotNewerThanGreenhouse = (
  hubspotLastModifiedAt: string | null | undefined,
  greenhouseLastWriteAt: string | null
): boolean => {
  if (!hubspotLastModifiedAt) return false
  const hs = Date.parse(hubspotLastModifiedAt)

  if (!Number.isFinite(hs)) return false
  if (!greenhouseLastWriteAt) return true
  const gh = Date.parse(greenhouseLastWriteAt)

  if (!Number.isFinite(gh)) return true

  return hs > gh
}

export interface HydrateProductCatalogOptions {

  /**
   * Test hook — injects a stub for the owner bridge so unit tests don't
   * need a live PG connection. Production callers pass `undefined`.
   */
  loadOwnerBinding?: typeof loadHubSpotOwnerBindingByOwnerId
}

/**
 * Upserts the 5 v2 inbound-writable fields to `product_catalog`.
 * Returns an outcome describing what changed (for logging + tests).
 *
 * `productId` here is the commercial `product_catalog.product_id`, not
 * the HubSpot id or the finance id — caller resolves the bridge first.
 */
export const hydrateProductCatalogFromHubSpotV2 = async (
  productId: string,
  profile: HubSpotGreenhouseProductProfile,
  options: HydrateProductCatalogOptions = {}
): Promise<HydrationOutcome> => {
  const row = await readRow(productId)

  if (!row) return { kind: 'skipped_no_row', productId }

  const updates: string[] = []
  const values: unknown[] = [productId]
  const fieldsWritten: string[] = []

  const pushUpdate = (column: string, value: unknown) => {
    values.push(value)
    updates.push(`${column} = $${values.length}`)
    fieldsWritten.push(column)
  }

  // ── 1. commercial_owner_assigned_at — always write ────────────────────
  // HS audit field; never outbound. If absent on HS, we leave GH's value
  // untouched (no-op).
  if (profile.hubspotOwnerAssignedAt && profile.hubspotOwnerAssignedAt !== row.commercial_owner_assigned_at) {
    pushUpdate('commercial_owner_assigned_at', profile.hubspotOwnerAssignedAt)
  }

  // ── 2. commercial_owner_member_id — conflict resolution ───────────────
  const resolvedOutcome = await (async (): Promise<Pick<HydrationOutcome, never> | HydrationOutcome | null> => {
    const ownerHubspotId = profile.owner?.hubspotOwnerId

    if (!ownerHubspotId) return null
    if (row.owner_gh_authoritative === true) return null

    const hsNewer = isHubSpotNewerThanGreenhouse(profile.metadata.lastModifiedAt, row.gh_last_write_at)

    if (!hsNewer) return null

    const loader = options.loadOwnerBinding ?? loadHubSpotOwnerBindingByOwnerId
    const binding = await loader(ownerHubspotId)

    if (!binding?.memberId) {
      return { kind: 'owner_unmapped', productId, hubspotOwnerId: ownerHubspotId }
    }

    if (binding.memberId !== row.commercial_owner_member_id) {
      pushUpdate('commercial_owner_member_id', binding.memberId)
    }

    return null
  })()

  if (resolvedOutcome && 'kind' in resolvedOutcome) {
    return resolvedOutcome
  }

  // ── 3. marketing_url — first-sync only ─────────────────────────────────
  if (!row.marketing_url && profile.marketingUrl) {
    pushUpdate('marketing_url', profile.marketingUrl)
  }

  // ── 4. image_urls — first-sync only (empty array counts as unset) ─────
  if ((!row.image_urls || row.image_urls.length === 0) && profile.imageUrls && profile.imageUrls.length > 0) {
    pushUpdate('image_urls', profile.imageUrls)
  }

  // ── 5. description_rich_html — first-sync only ────────────────────────
  if (!row.description_rich_html && profile.descriptionRichHtml) {
    pushUpdate('description_rich_html', profile.descriptionRichHtml)
  }

  if (updates.length === 0) {
    return { kind: 'no_changes', productId }
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')

  await query(
    `UPDATE greenhouse_commercial.product_catalog
        SET ${updates.join(', ')}
      WHERE product_id = $1`,
    values
  )

  return { kind: 'updated', productId, fieldsWritten }
}
