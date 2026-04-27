import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { PROVIDER_CATALOG } from '@/config/payment-instruments'
import {
  CANONICAL_PROVIDERS,
  CANONICAL_PROVIDER_SLUGS,
  CANONICAL_INSTRUMENT_CATEGORIES
} from '@/lib/finance/payment-instruments/canonical-providers'

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations')
const RESYNC_FILENAME_TOKEN = 'payment-provider-catalog-canonical-resync'

const findLatestCanonicalResyncMigration = (): string => {
  const matches = readdirSync(MIGRATIONS_DIR)
    .filter(filename => filename.endsWith('.sql') && filename.includes(RESYNC_FILENAME_TOKEN))
    .sort()

  if (matches.length === 0) {
    throw new Error(
      `No canonical-resync migration found under ${MIGRATIONS_DIR}. ` +
        `Expected a file matching *${RESYNC_FILENAME_TOKEN}*.sql.`
    )
  }

  return path.join(MIGRATIONS_DIR, matches[matches.length - 1])
}

interface MigrationRow {
  slug: string
  displayName: string
  providerType: string
  countryCode: string | null
  applicableTo: string[]
}

/**
 * Parses the INSERT VALUES rows from a resync migration. Mirrors the parser
 * in scripts/catalog/check-drift.ts so we have PR-time + build-time + runtime
 * coverage of the same drift class.
 */
const parseMigrationRows = (sql: string): MigrationRow[] => {
  const rowPattern =
    /\(\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*(NULL|'([^']*(?:''[^']*)*)')\s*,\s*ARRAY\[([^\]]+)\]\s*,\s*CURRENT_TIMESTAMP\s*\)/g

  const rows: MigrationRow[] = []
  let match: RegExpExecArray | null

  while ((match = rowPattern.exec(sql)) !== null) {
    const slug = match[1].replace(/''/g, "'")
    const displayName = match[2].replace(/''/g, "'")
    const providerType = match[3].replace(/''/g, "'")
    const countryCode = match[4] === 'NULL' ? null : (match[5] ?? '').replace(/''/g, "'")

    const applicableTo = (match[6].match(/'([^']*(?:''[^']*)*)'/g) ?? []).map(s =>
      s.slice(1, -1).replace(/''/g, "'")
    )

    rows.push({ slug, displayName, providerType, countryCode, applicableTo })
  }

  return rows
}

describe('canonical payment provider catalog — drift guard', () => {
  it('every PROVIDER_CATALOG (TS) slug is present in CANONICAL_PROVIDERS', () => {
    const drift = Object.keys(PROVIDER_CATALOG).filter(slug => !CANONICAL_PROVIDER_SLUGS.has(slug))

    expect(
      drift,
      `Slugs present in src/config/payment-instruments.ts PROVIDER_CATALOG but missing from CANONICAL_PROVIDERS (manifest-derived): ${drift.join(', ')}. ` +
        'Add them to manifest.json and re-run pnpm catalog:resync.'
    ).toEqual([])
  })

  it('every CANONICAL_PROVIDERS slug is also exposed in PROVIDER_CATALOG (TS)', () => {
    const tsSlugs = new Set(Object.keys(PROVIDER_CATALOG))
    const drift = CANONICAL_PROVIDERS.map(p => p.slug).filter(slug => !tsSlugs.has(slug))

    expect(
      drift,
      `Slugs in CANONICAL_PROVIDERS but missing from PROVIDER_CATALOG: ${drift.join(', ')}. ` +
        'The frontend chip/dropdown will not surface them.'
    ).toEqual([])
  })

  it('every CANONICAL_PROVIDERS slug is seeded in the latest canonical-resync migration', () => {
    const migrationPath = findLatestCanonicalResyncMigration()
    const sql = readFileSync(migrationPath, 'utf8')
    const rows = parseMigrationRows(sql)
    const seeded = new Set(rows.map(r => r.slug))
    const drift = CANONICAL_PROVIDERS.map(p => p.slug).filter(slug => !seeded.has(slug))

    expect(
      drift,
      `Slugs in CANONICAL_PROVIDERS but missing from ${path.basename(migrationPath)}: ${drift.join(', ')}. ` +
        'Run: pnpm catalog:resync --reason "<short>" then pnpm migrate:up.'
    ).toEqual([])
  })

  it('manifest-derived CANONICAL_PROVIDERS fields match the latest migration row-for-row', () => {
    const migrationPath = findLatestCanonicalResyncMigration()
    const sql = readFileSync(migrationPath, 'utf8')
    const rows = parseMigrationRows(sql)
    const rowsBySlug = new Map(rows.map(r => [r.slug, r]))

    const drift: string[] = []

    for (const provider of CANONICAL_PROVIDERS) {
      const row = rowsBySlug.get(provider.slug)

      if (!row) continue // covered by the previous test

      if (row.displayName !== provider.displayName) {
        drift.push(
          `[${provider.slug}] displayName: manifest="${provider.displayName}" migration="${row.displayName}"`
        )
      }

      if (row.providerType !== provider.providerType) {
        drift.push(
          `[${provider.slug}] providerType: manifest="${provider.providerType}" migration="${row.providerType}"`
        )
      }

      if (row.countryCode !== (provider.countryCode ?? null)) {
        drift.push(
          `[${provider.slug}] countryCode: manifest=${JSON.stringify(provider.countryCode ?? null)} migration=${JSON.stringify(row.countryCode)}`
        )
      }

      const manifestApplicable = [...provider.applicableTo].sort()
      const migrationApplicable = [...row.applicableTo].sort()

      if (
        manifestApplicable.length !== migrationApplicable.length ||
        manifestApplicable.some((v, i) => v !== migrationApplicable[i])
      ) {
        drift.push(
          `[${provider.slug}] applicableTo: manifest=${JSON.stringify(manifestApplicable)} migration=${JSON.stringify(migrationApplicable)}`
        )
      }
    }

    expect(
      drift,
      `Deep drift between manifest (CANONICAL_PROVIDERS) and ${path.basename(migrationPath)}:\n  ${drift.join('\n  ')}\n` +
        'Run: pnpm catalog:resync --reason "<short>" to regenerate the migration from manifest.'
    ).toEqual([])
  })

  it('the migration uses ON CONFLICT (provider_slug) DO UPDATE so re-runs heal drift', () => {
    const migrationPath = findLatestCanonicalResyncMigration()
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toMatch(/ON\s+CONFLICT\s*\(\s*provider_slug\s*\)\s*DO\s+UPDATE/i)
  })

  it('CANONICAL_PROVIDERS.applicableTo values are all known instrument categories', () => {
    const knownCategories = new Set<string>(CANONICAL_INSTRUMENT_CATEGORIES)

    for (const provider of CANONICAL_PROVIDERS) {
      for (const category of provider.applicableTo) {
        expect(
          knownCategories.has(category),
          `${provider.slug} declares applicableTo=${category}, which is not a known instrument category.`
        ).toBe(true)
      }
    }
  })
})
