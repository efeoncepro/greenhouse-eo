import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { CANONICAL_PROVIDERS } from './canonical-providers'

/**
 * Catalog drift detector — runtime invariant that compares the canonical
 * manifest (CANONICAL_PROVIDERS, derived from manifest.json) against the live
 * `greenhouse_finance.payment_provider_catalog` rows.
 *
 * Used by the admin health endpoint (`/api/admin/payment-instruments/health`)
 * and by any future reliability-composer integration. The same drift class is
 * also caught at PR-time (vitest) and at build-time (`pnpm catalog:check`),
 * so this runtime check is the third defensive layer — it catches the case
 * where manifest changed in a hotfix but the migration was not applied to
 * the target environment yet.
 */

export type CatalogDriftKind =
  | 'missing_in_db'
  | 'missing_in_manifest'
  | 'field_mismatch'

export interface CatalogDriftReport {
  kind: CatalogDriftKind
  slug: string
  field?: 'displayName' | 'providerType' | 'countryCode' | 'applicableTo'
  manifestValue?: unknown
  dbValue?: unknown
}

export interface CatalogHealth {
  healthy: boolean
  manifestEntries: number
  dbRows: number
  drift: CatalogDriftReport[]
  checkedAt: string
}

interface DbRow extends Record<string, unknown> {
  provider_slug: string
  display_name: string
  provider_type: string
  country_code: string | null
  applicable_to: string[]
}

const arraysEqual = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false

  const sortedA = [...a].sort()
  const sortedB = [...b].sort()

  return sortedA.every((value, index) => value === sortedB[index])
}

export const compareManifestVsDbRows = (dbRows: readonly DbRow[]): CatalogDriftReport[] => {
  const report: CatalogDriftReport[] = []
  const dbBySlug = new Map(dbRows.map(row => [row.provider_slug, row]))
  const manifestSlugs = new Set(CANONICAL_PROVIDERS.map(p => p.slug))

  for (const provider of CANONICAL_PROVIDERS) {
    const row = dbBySlug.get(provider.slug)

    if (!row) {
      report.push({ kind: 'missing_in_db', slug: provider.slug })
      continue
    }

    if (row.display_name !== provider.displayName) {
      report.push({
        kind: 'field_mismatch',
        slug: provider.slug,
        field: 'displayName',
        manifestValue: provider.displayName,
        dbValue: row.display_name
      })
    }

    if (row.provider_type !== provider.providerType) {
      report.push({
        kind: 'field_mismatch',
        slug: provider.slug,
        field: 'providerType',
        manifestValue: provider.providerType,
        dbValue: row.provider_type
      })
    }

    if (row.country_code !== (provider.countryCode ?? null)) {
      report.push({
        kind: 'field_mismatch',
        slug: provider.slug,
        field: 'countryCode',
        manifestValue: provider.countryCode ?? null,
        dbValue: row.country_code
      })
    }

    if (!arraysEqual(provider.applicableTo, row.applicable_to ?? [])) {
      report.push({
        kind: 'field_mismatch',
        slug: provider.slug,
        field: 'applicableTo',
        manifestValue: [...provider.applicableTo],
        dbValue: row.applicable_to ?? []
      })
    }
  }

  for (const row of dbRows) {
    if (!manifestSlugs.has(row.provider_slug)) {
      report.push({ kind: 'missing_in_manifest', slug: row.provider_slug })
    }
  }

  return report
}

export const checkPaymentCatalogHealth = async (): Promise<CatalogHealth> => {
  const dbRows = await runGreenhousePostgresQuery<DbRow>(
    `
      SELECT provider_slug, display_name, provider_type, country_code, applicable_to
      FROM greenhouse_finance.payment_provider_catalog
      ORDER BY provider_slug
    `
  )

  const drift = compareManifestVsDbRows(dbRows)

  return {
    healthy: drift.length === 0,
    manifestEntries: CANONICAL_PROVIDERS.length,
    dbRows: dbRows.length,
    drift,
    checkedAt: new Date().toISOString()
  }
}
