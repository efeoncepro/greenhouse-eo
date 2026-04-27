#!/usr/bin/env tsx
/**
 * Catalog Check — fail-the-build gate for payment provider catalog drift.
 * =======================================================================
 *
 * Compares `public/images/logos/payment/manifest.json` (the canonical SoT)
 * against the latest `payment-provider-catalog-canonical-resync` migration
 * row-for-row. If anything diverges (missing slug, mismatched providerType,
 * mismatched applicableTo, mismatched country, mismatched displayName), the
 * script exits non-zero with an actionable message.
 *
 * Wired into `prebuild` so that drift cannot reach a Vercel deploy.
 * Engineers can also run it locally via `pnpm catalog:check`.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '../..')
const MANIFEST_PATH = path.join(REPO_ROOT, 'public/images/logos/payment/manifest.json')
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'migrations')
const RESYNC_FILENAME_TOKEN = 'payment-provider-catalog-canonical-resync'

interface ManifestEntry {
  slug: string
  brandName: string
  providerType?: string
  applicableTo?: string[]
  country?: string | null
}

interface Manifest {
  entries: ManifestEntry[]
}

interface MigrationRow {
  slug: string
  displayName: string
  providerType: string
  countryCode: string | null
  applicableTo: string[]
}

const findLatestResyncMigration = (): string => {
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(`migrations/ not found at ${MIGRATIONS_DIR}`)
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && f.includes(RESYNC_FILENAME_TOKEN))
    .sort()

  if (files.length === 0) {
    throw new Error(
      `No payment-provider-catalog-canonical-resync migration found. ` +
        `Run: pnpm catalog:resync --reason "initial-resync"`
    )
  }

  return path.join(MIGRATIONS_DIR, files[files.length - 1])
}

/**
 * Parses the INSERT VALUES rows from a resync migration. Each row has the
 * shape:
 *   ('<slug>', '<displayName>', '<providerType>', NULL|'<country>',
 *    ARRAY['<cat>', '<cat>', ...], CURRENT_TIMESTAMP)
 *
 * Single quotes inside SQL strings are escaped as `''` per SQL convention.
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
    const countryCode = match[4] === 'NULL' ? null : match[5].replace(/''/g, "'")

    const applicableTo = (match[6].match(/'([^']*(?:''[^']*)*)'/g) ?? []).map(s =>
      s.slice(1, -1).replace(/''/g, "'")
    )

    rows.push({ slug, displayName, providerType, countryCode, applicableTo })
  }

  return rows
}

interface DriftReport {
  type: 'missing_in_migration' | 'missing_in_manifest' | 'field_mismatch'
  slug: string
  field?: string
  manifestValue?: unknown
  migrationValue?: unknown
}

const compare = (manifest: Manifest, migrationRows: MigrationRow[]): DriftReport[] => {
  const drift: DriftReport[] = []
  const manifestBySlug = new Map(manifest.entries.map(e => [e.slug, e]))
  const migrationBySlug = new Map(migrationRows.map(r => [r.slug, r]))

  for (const entry of manifest.entries) {
    const row = migrationBySlug.get(entry.slug)

    if (!row) {
      drift.push({ type: 'missing_in_migration', slug: entry.slug })
      continue
    }

    if (row.displayName !== entry.brandName) {
      drift.push({
        type: 'field_mismatch',
        slug: entry.slug,
        field: 'displayName',
        manifestValue: entry.brandName,
        migrationValue: row.displayName
      })
    }

    if (row.providerType !== entry.providerType) {
      drift.push({
        type: 'field_mismatch',
        slug: entry.slug,
        field: 'providerType',
        manifestValue: entry.providerType,
        migrationValue: row.providerType
      })
    }

    const manifestCountry = entry.country ?? null

    if (row.countryCode !== manifestCountry) {
      drift.push({
        type: 'field_mismatch',
        slug: entry.slug,
        field: 'countryCode',
        manifestValue: manifestCountry,
        migrationValue: row.countryCode
      })
    }

    const manifestApplicable = [...(entry.applicableTo ?? [])].sort()
    const migrationApplicable = [...row.applicableTo].sort()

    if (
      manifestApplicable.length !== migrationApplicable.length ||
      manifestApplicable.some((v, i) => v !== migrationApplicable[i])
    ) {
      drift.push({
        type: 'field_mismatch',
        slug: entry.slug,
        field: 'applicableTo',
        manifestValue: manifestApplicable,
        migrationValue: migrationApplicable
      })
    }
  }

  for (const row of migrationRows) {
    if (!manifestBySlug.has(row.slug)) {
      drift.push({ type: 'missing_in_manifest', slug: row.slug })
    }
  }

  return drift
}

const formatDrift = (drift: DriftReport[]): string =>
  drift
    .map(d => {
      switch (d.type) {
        case 'missing_in_migration':
          return `  - ${d.slug}: present in manifest but missing from latest resync migration`
        case 'missing_in_manifest':
          return `  - ${d.slug}: seeded in latest resync migration but missing from manifest`
        case 'field_mismatch':
          return `  - ${d.slug}: ${d.field} drift — manifest=${JSON.stringify(d.manifestValue)} migration=${JSON.stringify(d.migrationValue)}`
      }
    })
    .join('\n')

const main = (): void => {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`[catalog:check] manifest.json not found at ${MANIFEST_PATH}`)
    process.exit(1)
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest
  const migrationPath = findLatestResyncMigration()
  const sql = readFileSync(migrationPath, 'utf8')
  const rows = parseMigrationRows(sql)

  if (rows.length === 0) {
    console.error(
      `[catalog:check] No INSERT rows found in latest migration ${path.basename(migrationPath)}. ` +
        `Did the generator produce a malformed file?`
    )
    process.exit(1)
  }

  const drift = compare(manifest, rows)

  if (drift.length === 0) {
    console.log(
      `[catalog:check] OK — manifest (${manifest.entries.length} entries) matches ${path.basename(
        migrationPath
      )} (${rows.length} rows).`
    )

    return
  }

  console.error(
    `[catalog:check] DRIFT detected between manifest.json and ${path.basename(migrationPath)}:`
  )
  console.error(formatDrift(drift))
  console.error(
    '\n[catalog:check] To fix:\n' +
      '  1. Verify manifest.json reflects the intended catalog state.\n' +
      '  2. Run: pnpm catalog:resync --reason "<short reason>"\n' +
      '  3. Run: pnpm migrate:up\n' +
      '  4. Commit the new migration alongside the manifest change.\n'
  )
  process.exit(1)
}

main()
