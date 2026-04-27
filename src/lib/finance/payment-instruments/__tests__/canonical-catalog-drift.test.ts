import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { PROVIDER_CATALOG } from '@/config/payment-instruments'
import {
  CANONICAL_PROVIDERS,
  CANONICAL_PROVIDER_SLUGS
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

const extractSeededSlugs = (sql: string): Set<string> => {
  const slugs = new Set<string>()
  const valuesPattern = /\(\s*'([a-z0-9-]+)'\s*,/gi
  let match: RegExpExecArray | null

  while ((match = valuesPattern.exec(sql)) !== null) {
    slugs.add(match[1])
  }

  return slugs
}

describe('canonical payment provider catalog — drift guard', () => {
  it('every PROVIDER_CATALOG (TS) slug is present in CANONICAL_PROVIDERS', () => {
    const drift = Object.keys(PROVIDER_CATALOG).filter(slug => !CANONICAL_PROVIDER_SLUGS.has(slug))

    expect(
      drift,
      `Slugs present in src/config/payment-instruments.ts PROVIDER_CATALOG but missing from canonical-providers.ts: ${drift.join(', ')}. ` +
        'Add them to CANONICAL_PROVIDERS and to the canonical-resync migration.'
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
    const seeded = extractSeededSlugs(sql)
    const drift = CANONICAL_PROVIDERS.map(p => p.slug).filter(slug => !seeded.has(slug))

    expect(
      drift,
      `Slugs in CANONICAL_PROVIDERS but missing from ${path.basename(migrationPath)}: ${drift.join(', ')}. ` +
        'Add them to the migration INSERT block.'
    ).toEqual([])
  })

  it('the migration uses ON CONFLICT (provider_slug) DO UPDATE so re-runs heal drift', () => {
    const migrationPath = findLatestCanonicalResyncMigration()
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toMatch(/ON\s+CONFLICT\s*\(\s*provider_slug\s*\)\s*DO\s+UPDATE/i)
  })

  it('CANONICAL_PROVIDERS.applicableTo values are all known instrument categories', () => {
    const knownCategories = new Set([
      'bank_account',
      'credit_card',
      'fintech',
      'payment_platform',
      'cash',
      'payroll_processor',
      'shareholder_account'
    ])

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
