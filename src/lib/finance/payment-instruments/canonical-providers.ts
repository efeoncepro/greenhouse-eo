/**
 * Canonical Payment Provider Catalog — derived from manifest.json (single SoT).
 * =============================================================================
 *
 * `public/images/logos/payment/manifest.json` is the canonical declarative
 * source of truth for the entire payment provider catalog. Every artifact
 * downstream is derived from it:
 *
 *   1. This module (`CANONICAL_PROVIDERS`, `CANONICAL_PROVIDER_SLUGS`) —
 *      consumed by server-side validators (e.g. `validateProviderForInstrument`)
 *      and the `assertProviderInCanonicalCatalog` defense-in-depth check.
 *
 *   2. `src/config/payment-instruments.ts` PROVIDER_CATALOG — the presentation
 *      layer (logo paths, currencies, display labels). The drift-guard test at
 *      `src/config/__tests__/payment-instruments-manifest-drift.test.ts`
 *      enforces that every PROVIDER_CATALOG entry's logo paths match this
 *      manifest 1:1.
 *
 *   3. `greenhouse_finance.payment_provider_catalog` (PG) — seeded by the
 *      latest `payment-provider-catalog-canonical-resync` migration. The
 *      migration is generated automatically from this manifest by
 *      `scripts/catalog/resync-from-manifest.ts` (`pnpm catalog:resync`),
 *      so SQL never drifts from the manifest by hand.
 *
 *   4. CI `pnpm catalog:check` (run via `prebuild`) compares manifest →
 *      latest migration row-for-row. Drift cannot reach a Vercel deploy.
 *
 *   5. Runtime `/api/admin/payment-instruments/health` compares manifest
 *      → live PG rows; drift surfaces as a Reliability dashboard signal
 *      tagged `domain=finance`.
 *
 * To add a provider:
 *   1. Run the brand-asset-designer skill to publish SVGs and append the
 *      entry to `manifest.json` (with `providerType` and `applicableTo`).
 *   2. `pnpm catalog:resync --reason "<short-reason>"` — generates a new
 *      `payment-provider-catalog-canonical-resync` migration from manifest.
 *   3. `pnpm migrate:up` — applies it.
 *   4. Optionally append `currencies`/labels to `src/config/payment-instruments.ts`
 *      for UI presentation. The drift-guard test will require manifest paths
 *      to match.
 */

import manifestJson from '../../../../public/images/logos/payment/manifest.json'

export const CANONICAL_PROVIDER_TYPES = [
  'bank',
  'card_network',
  'card_issuer',
  'fintech',
  'payment_platform',
  'payroll_processor',
  'platform_operator'
] as const

export type CanonicalProviderType = (typeof CANONICAL_PROVIDER_TYPES)[number]

export const CANONICAL_INSTRUMENT_CATEGORIES = [
  'bank_account',
  'credit_card',
  'fintech',
  'payment_platform',
  'cash',
  'payroll_processor',
  'shareholder_account'
] as const

export type CanonicalInstrumentCategory = (typeof CANONICAL_INSTRUMENT_CATEGORIES)[number]

export interface CanonicalProvider {
  slug: string
  displayName: string
  providerType: CanonicalProviderType
  countryCode: string | null
  applicableTo: readonly CanonicalInstrumentCategory[]
}

interface ManifestEntry {
  slug: string
  brandName: string
  category?: string
  providerType?: string
  applicableTo?: string[]
  country?: string | null
  logo?: string | null
  compactLogo?: string | null
}

interface Manifest {
  entries: ManifestEntry[]
}

const isProviderType = (value: unknown): value is CanonicalProviderType =>
  typeof value === 'string' && (CANONICAL_PROVIDER_TYPES as readonly string[]).includes(value)

const isInstrumentCategory = (value: unknown): value is CanonicalInstrumentCategory =>
  typeof value === 'string' && (CANONICAL_INSTRUMENT_CATEGORIES as readonly string[]).includes(value)

const deriveProvider = (entry: ManifestEntry): CanonicalProvider => {
  if (!isProviderType(entry.providerType)) {
    throw new Error(
      `manifest.json entry "${entry.slug}" is missing or has an invalid providerType. ` +
        `Expected one of: ${CANONICAL_PROVIDER_TYPES.join(', ')}`
    )
  }

  const applicableTo = (entry.applicableTo ?? []).filter(isInstrumentCategory)

  if (applicableTo.length === 0) {
    throw new Error(
      `manifest.json entry "${entry.slug}" has empty or invalid applicableTo. ` +
        `Expected non-empty subset of: ${CANONICAL_INSTRUMENT_CATEGORIES.join(', ')}`
    )
  }

  return {
    slug: entry.slug,
    displayName: entry.brandName,
    providerType: entry.providerType,
    countryCode: entry.country ?? null,
    applicableTo
  }
}

export const CANONICAL_PROVIDERS: readonly CanonicalProvider[] = (manifestJson as Manifest).entries
  .map(deriveProvider)

export const CANONICAL_PROVIDER_SLUGS: ReadonlySet<string> = new Set(
  CANONICAL_PROVIDERS.map(p => p.slug)
)

export const isCanonicalProviderSlug = (slug: string | null | undefined): slug is string =>
  typeof slug === 'string' && CANONICAL_PROVIDER_SLUGS.has(slug)

export const getCanonicalProvider = (slug: string | null | undefined): CanonicalProvider | null => {
  if (!slug) return null

  return CANONICAL_PROVIDERS.find(p => p.slug === slug) ?? null
}
