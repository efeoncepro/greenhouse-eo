#!/usr/bin/env tsx
/**
 * Catalog Resync — generate a payment_provider_catalog migration from manifest.json
 * =================================================================================
 *
 * This is the canonical CLI for evolving the provider catalog. The flow is:
 *
 *   1. Brand-asset-designer skill publishes SVGs and updates manifest.json
 *      (with `slug`, `brandName`, `category`, `providerType`, `applicableTo`,
 *      `country`, `logo`, `compactLogo`).
 *
 *   2. `pnpm catalog:resync --reason "<short-reason>"` invokes this script,
 *      which:
 *        a. Reads `public/images/logos/payment/manifest.json`.
 *        b. Calls `pnpm migrate:create payment-provider-catalog-canonical-resync-<reason>`
 *           to obtain a properly timestamped, empty migration file.
 *        c. Populates that file with `INSERT ... ON CONFLICT (provider_slug)
 *           DO UPDATE SET ...` covering every entry in the manifest.
 *
 *   3. Operator reviews the diff, then `pnpm migrate:up` applies the migration.
 *
 * The drift-guard test
 * `src/lib/finance/payment-instruments/__tests__/manifest-vs-migration-drift.test.ts`
 * compares manifest → latest resync migration row-for-row, including
 * providerType and applicableTo. CI fails if anyone edits manifest.json
 * without re-running this script.
 *
 * The build-time gate `pnpm catalog:check` (run via `prebuild`) makes drift
 * un-deployable: the build fails with an actionable message pointing at this
 * very script.
 *
 * NEVER write SQL for the catalog by hand. Re-run this script.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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

const KNOWN_PROVIDER_TYPES = [
  'bank',
  'card_network',
  'card_issuer',
  'fintech',
  'payment_platform',
  'payroll_processor',
  'platform_operator'
]

const KNOWN_INSTRUMENT_CATEGORIES = [
  'bank_account',
  'credit_card',
  'fintech',
  'payment_platform',
  'cash',
  'payroll_processor',
  'shareholder_account'
]

const escapeSqlString = (value: string): string => value.replace(/'/g, "''")

const sqlString = (value: string): string => `'${escapeSqlString(value)}'`

const sqlNullable = (value: string | null | undefined): string =>
  value == null ? 'NULL' : sqlString(value)

const sqlTextArray = (values: readonly string[]): string =>
  `ARRAY[${values.map(sqlString).join(', ')}]`

const validateEntry = (entry: ManifestEntry): void => {
  if (!entry.slug) throw new Error('manifest entry missing slug')
  if (!entry.brandName) throw new Error(`manifest entry ${entry.slug} missing brandName`)

  if (!entry.providerType || !KNOWN_PROVIDER_TYPES.includes(entry.providerType)) {
    throw new Error(
      `manifest entry ${entry.slug} has invalid providerType=${entry.providerType}. ` +
        `Expected one of: ${KNOWN_PROVIDER_TYPES.join(', ')}`
    )
  }

  if (!Array.isArray(entry.applicableTo) || entry.applicableTo.length === 0) {
    throw new Error(`manifest entry ${entry.slug} has empty applicableTo`)
  }

  for (const cat of entry.applicableTo) {
    if (!KNOWN_INSTRUMENT_CATEGORIES.includes(cat)) {
      throw new Error(
        `manifest entry ${entry.slug} has invalid applicableTo entry "${cat}". ` +
          `Expected subset of: ${KNOWN_INSTRUMENT_CATEGORIES.join(', ')}`
      )
    }
  }
}

const renderRowValues = (entry: ManifestEntry): string => {
  const slug = sqlString(entry.slug)
  const displayName = sqlString(entry.brandName)
  const providerType = sqlString(entry.providerType as string)
  const countryCode = sqlNullable(entry.country ?? null)
  const applicableTo = sqlTextArray(entry.applicableTo as string[])

  return `  (${slug}, ${displayName}, ${providerType}, ${countryCode}, ${applicableTo}, CURRENT_TIMESTAMP)`
}

const buildMigrationSql = (manifest: Manifest, reason: string): string => {
  const sortedEntries = [...manifest.entries].sort((a, b) => a.slug.localeCompare(b.slug))
  const rows = sortedEntries.map(renderRowValues).join(',\n')

  return `-- Up Migration
--
-- Payment Provider Catalog — Canonical Resync (auto-generated)
-- =============================================================
--
-- Reason: ${reason}
-- Generated: ${new Date().toISOString()}
-- Source: public/images/logos/payment/manifest.json (single source of truth)
-- Generator: scripts/catalog/resync-from-manifest.ts
--
-- DO NOT EDIT BY HAND. To change the catalog:
--   1. Edit public/images/logos/payment/manifest.json (or run the
--      brand-asset-designer skill).
--   2. \`pnpm catalog:resync --reason "<short-reason>"\` to regenerate
--      a new migration like this one.
--   3. \`pnpm migrate:up\` to apply.
--
-- The drift-guard test and the prebuild gate (\`pnpm catalog:check\`)
-- ensure manifest and the latest migration of this kind stay aligned.

SET search_path = greenhouse_finance, greenhouse_core, public;

INSERT INTO greenhouse_finance.payment_provider_catalog
  (provider_slug, display_name, provider_type, country_code, applicable_to, updated_at)
VALUES
${rows}
ON CONFLICT (provider_slug) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  provider_type = EXCLUDED.provider_type,
  country_code  = EXCLUDED.country_code,
  applicable_to = EXCLUDED.applicable_to,
  updated_at    = CURRENT_TIMESTAMP;

-- Down Migration
--
-- Resync is forward-only by design. Rolling back would either restore an
-- empty catalog (breaking accounts via FK RESTRICT) or partially undo
-- per-row state another migration may legitimately have changed.

SET search_path = greenhouse_finance, greenhouse_core, public;

-- intentional no-op
SELECT 1;
`
}

const findLatestGeneratedMigration = (slug: string): string => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && f.includes(slug))
    .sort()

  if (files.length === 0) {
    throw new Error(`Could not find generated migration matching "${slug}" in ${MIGRATIONS_DIR}`)
  }

  return path.join(MIGRATIONS_DIR, files[files.length - 1])
}

const slugifyReason = (reason: string): string =>
  reason
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'resync'

const parseArgs = (): { reason: string } => {
  const args = process.argv.slice(2)
  let reason: string | null = null

  for (let i = 0; i < args.length; i++) {
    const a = args[i]

    if (a === '--reason' || a === '-r') {
      reason = args[i + 1] ?? null
      i++
    } else if (a.startsWith('--reason=')) {
      reason = a.slice('--reason='.length)
    }
  }

  if (!reason || reason.trim().length === 0) {
    console.error('Usage: pnpm catalog:resync --reason "<short reason>"')
    process.exit(1)
  }

  return { reason: reason.trim() }
}

const main = (): void => {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`manifest.json not found at ${MANIFEST_PATH}`)
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest

  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    throw new Error('manifest.json has no entries')
  }

  manifest.entries.forEach(validateEntry)

  const { reason } = parseArgs()
  const slug = `${RESYNC_FILENAME_TOKEN}-${slugifyReason(reason)}`

  console.log(`[catalog:resync] generating migration: ${slug}`)
  console.log(`[catalog:resync] manifest entries: ${manifest.entries.length}`)

  // Use the existing migrate:create script so timestamps follow node-pg-migrate
  // conventions (UTC, monotonic). This produces an empty SQL file we then fill.
  execSync(`pnpm migrate:create ${slug}`, { cwd: REPO_ROOT, stdio: 'inherit' })

  const generatedFile = findLatestGeneratedMigration(slug)
  const sql = buildMigrationSql(manifest, reason)

  writeFileSync(generatedFile, sql, 'utf8')

  console.log(`[catalog:resync] wrote ${manifest.entries.length} catalog rows to ${path.relative(REPO_ROOT, generatedFile)}`)
  console.log('[catalog:resync] next: review the diff, then run `pnpm migrate:up`')
}

main()
