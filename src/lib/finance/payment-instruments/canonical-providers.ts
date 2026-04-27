/**
 * Canonical Payment Provider Catalog — TypeScript source of truth.
 * ================================================================
 *
 * This module is the single source of truth for the slug-level identity of
 * every payment provider Greenhouse recognizes. The set is mirrored — by
 * design, with a drift-guard test — in three places:
 *
 *   1. `greenhouse_finance.payment_provider_catalog` (PG)
 *      Seeded from the latest `payment-provider-catalog-canonical-resync`
 *      migration. The migration uses ON CONFLICT (provider_slug) DO UPDATE,
 *      so re-running it heals any drift that may have accumulated (e.g. when
 *      a slug was added to TS without a corresponding migration).
 *
 *   2. `src/config/payment-instruments.ts` PROVIDER_CATALOG
 *      The presentation layer (logos, currencies, display labels). It MUST
 *      only contain slugs that exist here. The drift guard test enforces this.
 *
 *   3. The form-time validator and the server-side defense-in-depth check
 *      `assertProviderInCanonicalCatalog` (see store.ts), which queries PG
 *      before INSERT/UPDATE so a missing seed surfaces as a clean 422 instead
 *      of a foreign-key 500.
 *
 * To add a provider:
 *   1. Append a row here.
 *   2. Add presentation metadata (logo, currencies) to PROVIDER_CATALOG in
 *      `src/config/payment-instruments.ts`.
 *   3. Append the same row to the latest canonical-resync migration's
 *      INSERT/ON CONFLICT block (or generate a new resync migration).
 *   4. Run `pnpm migrate:up` and `pnpm db:generate-types`.
 *
 * The drift-guard test will fail PR-time if any of those steps is skipped.
 */

export type CanonicalProviderType =
  | 'bank'
  | 'card_network'
  | 'card_issuer'
  | 'fintech'
  | 'payment_platform'
  | 'payroll_processor'
  | 'platform_operator'

export interface CanonicalProvider {
  slug: string
  displayName: string
  providerType: CanonicalProviderType
  countryCode: string | null
  applicableTo: readonly string[]
}

export const CANONICAL_PROVIDERS: readonly CanonicalProvider[] = [
  // Chilean banks
  { slug: 'bci',          displayName: 'BCI',              providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account'] },
  { slug: 'banco-chile',  displayName: 'Banco de Chile',   providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account'] },
  { slug: 'banco-estado', displayName: 'BancoEstado',      providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account'] },
  { slug: 'santander',    displayName: 'Santander',        providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account', 'credit_card'] },
  { slug: 'scotiabank',   displayName: 'Scotiabank',       providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account'] },
  { slug: 'itau',         displayName: 'Itaú',             providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account'] },
  { slug: 'bice',         displayName: 'BICE',             providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account'] },
  { slug: 'security',     displayName: 'Banco Security',   providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account'] },
  { slug: 'falabella',    displayName: 'Banco Falabella',  providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account'] },
  { slug: 'ripley',       displayName: 'Banco Ripley',     providerType: 'bank',              countryCode: 'CL', applicableTo: ['bank_account'] },

  // Card networks
  { slug: 'visa',       displayName: 'Visa',             providerType: 'card_network', countryCode: null, applicableTo: ['credit_card'] },
  { slug: 'mastercard', displayName: 'Mastercard',       providerType: 'card_network', countryCode: null, applicableTo: ['credit_card'] },
  { slug: 'amex',       displayName: 'American Express', providerType: 'card_network', countryCode: null, applicableTo: ['credit_card'] },

  // Fintechs
  { slug: 'mercadopago', displayName: 'Mercado Pago', providerType: 'fintech', countryCode: null, applicableTo: ['fintech'] },
  { slug: 'wise',        displayName: 'Wise',         providerType: 'fintech', countryCode: null, applicableTo: ['fintech'] },
  { slug: 'stripe',      displayName: 'Stripe',       providerType: 'fintech', countryCode: null, applicableTo: ['fintech'] },
  { slug: 'paypal',      displayName: 'PayPal',       providerType: 'fintech', countryCode: null, applicableTo: ['fintech'] },
  { slug: 'global66',    displayName: 'Global66',     providerType: 'fintech', countryCode: null, applicableTo: ['fintech'] },

  // Payment platforms
  { slug: 'deel', displayName: 'Deel', providerType: 'payment_platform', countryCode: null, applicableTo: ['payment_platform'] },

  // Payroll processors
  { slug: 'previred', displayName: 'Previred', providerType: 'payroll_processor', countryCode: 'CL', applicableTo: ['payroll_processor'] },

  // Platform operator (Greenhouse itself, internal ledgers — TASK-701)
  { slug: 'greenhouse', displayName: 'Greenhouse', providerType: 'platform_operator', countryCode: null, applicableTo: ['shareholder_account'] }
] as const

export const CANONICAL_PROVIDER_SLUGS: ReadonlySet<string> = new Set(
  CANONICAL_PROVIDERS.map(p => p.slug)
)

export const isCanonicalProviderSlug = (slug: string | null | undefined): slug is string =>
  typeof slug === 'string' && CANONICAL_PROVIDER_SLUGS.has(slug)
