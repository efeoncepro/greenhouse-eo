import { describe, expect, it } from 'vitest'

import { compareManifestVsDbRows } from '@/lib/finance/payment-instruments/catalog-drift'
import { CANONICAL_PROVIDERS } from '@/lib/finance/payment-instruments/canonical-providers'

const buildDbRow = (overrides: Partial<{
  provider_slug: string
  display_name: string
  provider_type: string
  country_code: string | null
  applicable_to: string[]
}> = {}) => ({
  provider_slug: 'global66',
  display_name: 'Global66',
  provider_type: 'fintech',
  country_code: null,
  applicable_to: ['fintech'],
  ...overrides
})

describe('compareManifestVsDbRows', () => {
  it('returns no drift when DB mirrors CANONICAL_PROVIDERS exactly', () => {
    const dbRows = CANONICAL_PROVIDERS.map(p => ({
      provider_slug: p.slug,
      display_name: p.displayName,
      provider_type: p.providerType,
      country_code: p.countryCode,
      applicable_to: [...p.applicableTo]
    }))

    expect(compareManifestVsDbRows(dbRows)).toEqual([])
  })

  it('reports missing_in_db when a manifest slug is absent from DB', () => {
    const dbRows = CANONICAL_PROVIDERS
      .filter(p => p.slug !== 'global66')
      .map(p => ({
        provider_slug: p.slug,
        display_name: p.displayName,
        provider_type: p.providerType,
        country_code: p.countryCode,
        applicable_to: [...p.applicableTo]
      }))

    const drift = compareManifestVsDbRows(dbRows)

    expect(drift).toContainEqual({ kind: 'missing_in_db', slug: 'global66' })
  })

  it('reports missing_in_manifest when DB has an unknown slug', () => {
    const dbRows = [
      ...CANONICAL_PROVIDERS.map(p => ({
        provider_slug: p.slug,
        display_name: p.displayName,
        provider_type: p.providerType,
        country_code: p.countryCode,
        applicable_to: [...p.applicableTo]
      })),
      buildDbRow({ provider_slug: 'unknown-provider', display_name: 'Unknown' })
    ]

    const drift = compareManifestVsDbRows(dbRows)

    expect(drift).toContainEqual({ kind: 'missing_in_manifest', slug: 'unknown-provider' })
  })

  it('reports field_mismatch on displayName drift', () => {
    const dbRows = CANONICAL_PROVIDERS.map(p =>
      p.slug === 'global66'
        ? buildDbRow({ provider_slug: 'global66', display_name: 'Global Sixty Six' })
        : {
            provider_slug: p.slug,
            display_name: p.displayName,
            provider_type: p.providerType,
            country_code: p.countryCode,
            applicable_to: [...p.applicableTo]
          }
    )

    const drift = compareManifestVsDbRows(dbRows)

    expect(drift).toContainEqual({
      kind: 'field_mismatch',
      slug: 'global66',
      field: 'displayName',
      manifestValue: 'Global66',
      dbValue: 'Global Sixty Six'
    })
  })

  it('reports field_mismatch on applicableTo set difference (order-insensitive)', () => {
    const dbRows = CANONICAL_PROVIDERS.map(p =>
      p.slug === 'santander'
        ? {
            provider_slug: p.slug,
            display_name: p.displayName,
            provider_type: p.providerType,
            country_code: p.countryCode,
            applicable_to: ['bank_account'] // missing 'credit_card'
          }
        : {
            provider_slug: p.slug,
            display_name: p.displayName,
            provider_type: p.providerType,
            country_code: p.countryCode,
            applicable_to: [...p.applicableTo]
          }
    )

    const drift = compareManifestVsDbRows(dbRows)
    const santanderDrift = drift.find(d => d.slug === 'santander' && d.field === 'applicableTo')

    expect(santanderDrift).toBeDefined()
    expect(santanderDrift?.kind).toBe('field_mismatch')
  })

  it('treats applicableTo as a set, not an ordered list', () => {
    const dbRows = CANONICAL_PROVIDERS.map(p =>
      p.slug === 'santander'
        ? {
            provider_slug: p.slug,
            display_name: p.displayName,
            provider_type: p.providerType,
            country_code: p.countryCode,
            applicable_to: ['credit_card', 'bank_account'] // reversed but same set
          }
        : {
            provider_slug: p.slug,
            display_name: p.displayName,
            provider_type: p.providerType,
            country_code: p.countryCode,
            applicable_to: [...p.applicableTo]
          }
    )

    expect(compareManifestVsDbRows(dbRows)).toEqual([])
  })
})
