#!/usr/bin/env tsx
/**
 * TASK-557.1 — audit + cleanup de legacy quotations en estado limbo.
 *
 * Default seguro: dry-run. Solo `--apply` muta y únicamente marca
 * `legacy_excluded*`; nunca borra ni normaliza quotes.
 *
 * Uso:
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/audit-legacy-quotes.ts
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/audit-legacy-quotes.ts --apply
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/audit-legacy-quotes.ts --output artifacts/task-557.1.csv
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

import {
  classifyLegacyQuoteAuditRow,
  csvEscape,
  type LegacyQuoteAuditCategory,
  type LegacyQuoteAuditAction
} from '@/lib/commercial/legacy-quotes-audit'
import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

interface CliOptions {
  apply: boolean
  outputPath: string
}

interface LegacyQuoteRow extends Record<string, unknown> {
  quotation_id: string
  quotation_number: string
  status: string | null
  legacy_status: string | null
  finance_quote_id: string | null
  organization_id: string | null
  current_version: number | null
  has_current_version_row: boolean
  has_current_line_items: boolean
  has_pipeline_snapshot: boolean
  legacy_excluded: boolean | null
  total_amount_clp: string | number | null
  updated_at: string
}

interface ReportRow extends LegacyQuoteRow {
  category: LegacyQuoteAuditCategory
  action: LegacyQuoteAuditAction
  reason: string
  should_mark_legacy_excluded: boolean
}

const DEFAULT_OUTPUT = 'artifacts/task-557.1-legacy-quotes-audit.csv'

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2)
  const outputIndex = args.indexOf('--output')

  return {
    apply: args.includes('--apply'),
    outputPath: outputIndex >= 0 ? args[outputIndex + 1] ?? DEFAULT_OUTPUT : DEFAULT_OUTPUT
  }
}

const SELECT_SQL = `
  SELECT
    q.quotation_id,
    q.quotation_number,
    q.status,
    q.legacy_status,
    q.finance_quote_id,
    q.organization_id,
    q.current_version,
    EXISTS (
      SELECT 1
      FROM greenhouse_commercial.quotation_versions v
      WHERE v.quotation_id = q.quotation_id
        AND v.version_number = q.current_version
    ) AS has_current_version_row,
    EXISTS (
      SELECT 1
      FROM greenhouse_commercial.quotation_line_items li
      WHERE li.quotation_id = q.quotation_id
        AND li.version_number = q.current_version
    ) AS has_current_line_items,
    EXISTS (
      SELECT 1
      FROM greenhouse_serving.quotation_pipeline_snapshots qps
      WHERE qps.quotation_id = q.quotation_id
    ) AS has_pipeline_snapshot,
    COALESCE(q.legacy_excluded, FALSE) AS legacy_excluded,
    q.total_amount_clp,
    q.updated_at::text AS updated_at
  FROM greenhouse_commercial.quotations q
  WHERE q.legacy_status IS NOT NULL
     OR q.organization_id IS NULL
     OR NOT EXISTS (
      SELECT 1
      FROM greenhouse_commercial.quotation_versions v
      WHERE v.quotation_id = q.quotation_id
        AND v.version_number = q.current_version
     )
  ORDER BY q.updated_at DESC, q.quotation_id ASC
`

const UPDATE_SQL = `
  UPDATE greenhouse_commercial.quotations
  SET
    legacy_excluded = TRUE,
    legacy_excluded_reason = $2,
    legacy_excluded_at = COALESCE(legacy_excluded_at, NOW()),
    updated_at = NOW()
  WHERE quotation_id = $1
    AND legacy_excluded = FALSE
  RETURNING quotation_id
`

const toReportRow = (row: LegacyQuoteRow): ReportRow => {
  const decision = classifyLegacyQuoteAuditRow({
    legacyStatus: row.legacy_status,
    status: row.status,
    financeQuoteId: row.finance_quote_id,
    organizationId: row.organization_id,
    currentVersion: row.current_version,
    hasCurrentVersionRow: row.has_current_version_row,
    hasCurrentLineItems: row.has_current_line_items,
    hasPipelineSnapshot: row.has_pipeline_snapshot,
    legacyExcluded: row.legacy_excluded
  })

  return {
    ...row,
    category: decision.category,
    action: decision.action,
    reason: decision.reason,
    should_mark_legacy_excluded: decision.shouldMarkLegacyExcluded
  }
}

const writeCsv = async (rows: ReportRow[], outputPath: string) => {
  const headers = [
    'quotation_id',
    'quotation_number',
    'status',
    'legacy_status',
    'finance_quote_id',
    'organization_id',
    'current_version',
    'has_current_version_row',
    'has_current_line_items',
    'has_pipeline_snapshot',
    'legacy_excluded',
    'category',
    'action',
    'reason',
    'should_mark_legacy_excluded',
    'total_amount_clp',
    'updated_at'
  ]

  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(header => csvEscape(row[header as keyof ReportRow])).join(','))
  ]

  const absolutePath = path.resolve(process.cwd(), outputPath)

  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, `${lines.join('\n')}\n`, 'utf8')

  return absolutePath
}

const summarize = (rows: ReportRow[]) => {
  const summary = new Map<string, number>()

  for (const row of rows) {
    const key = `${row.category}:${row.action}`

    summary.set(key, (summary.get(key) ?? 0) + 1)
  }

  return [...summary.entries()].sort(([a], [b]) => a.localeCompare(b))
}

const main = async () => {
  const { apply, outputPath } = parseArgs()

  console.log(`\n=== TASK-557.1 — legacy quotes audit ${apply ? '(APPLY)' : '(DRY-RUN)'} ===\n`)

  const beforeRows = await runGreenhousePostgresQuery<LegacyQuoteRow>(SELECT_SQL)
  const reportRows = beforeRows.map(toReportRow)
  const output = await writeCsv(reportRows, outputPath)

  console.log(`Report: ${output}`)
  console.log(`Candidates: ${reportRows.length}`)

  for (const [key, count] of summarize(reportRows)) {
    console.log(`  ${key}: ${count}`)
  }

  const rowsToMark = reportRows.filter(row => row.should_mark_legacy_excluded && !row.legacy_excluded)

  console.log(`Rows to mark legacy_excluded=true: ${rowsToMark.length}`)

  if (!apply) {
    console.log('\n[DRY-RUN] No changes applied. Re-run with --apply after reviewing the CSV.\n')
    
return
  }

  let updated = 0

  for (const row of rowsToMark) {
    const result = await runGreenhousePostgresQuery<{ quotation_id: string }>(
      UPDATE_SQL,
      [row.quotation_id, row.reason]
    )

    updated += result.length
  }

  const after = await runGreenhousePostgresQuery<{ legacy_excluded_count: number }>(
    `SELECT count(*)::int AS legacy_excluded_count
       FROM greenhouse_commercial.quotations
       WHERE legacy_excluded = TRUE`
  )

  console.log(`\nUpdated: ${updated}`)
  console.log(`Post-cleanup legacy_excluded=true: ${after[0]?.legacy_excluded_count ?? 0}`)
  console.log('Idempotency check: re-run with --apply; Updated should be 0.\n')
}

main()
  .catch(error => {
    console.error('Script failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres({ source: 'close' }).catch(() => undefined)
  })
