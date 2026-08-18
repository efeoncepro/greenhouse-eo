/**
 * TASK-1718 — dry-run-first CV review projection backfill.
 *
 * Usage:
 *   pnpm hiring:candidate-review:backfill
 *   pnpm hiring:candidate-review:backfill -- --application-id happ-... --limit 1
 *   HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED=true pnpm hiring:candidate-review:backfill -- --apply
 *
 * Output is aggregate-only: candidate/application/asset identifiers and extracted text are never logged.
 */
import { materializeCandidateReviewProjection } from '../../src/lib/hiring/candidate-review/projection'
import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'

type EligibleRow = { asset_id: string }

const apply = process.argv.includes('--apply')

const argumentValue = (name: string) => {
  const index = process.argv.indexOf(name)

  return index === -1 ? null : process.argv[index + 1] ?? null
}

const applicationId = argumentValue('--application-id')
const rawLimit = argumentValue('--limit')
const limit = rawLimit == null ? null : Number(rawLimit)

if (process.argv.includes('--application-id') && !applicationId) {
  throw new Error('--application-id requires a value')
}

if (rawLimit != null && (!Number.isInteger(limit) || (limit ?? 0) < 1 || (limit ?? 0) > 500)) {
  throw new Error('--limit must be an integer between 1 and 500')
}

if (apply && process.env.HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED !== 'true') {
  throw new Error('HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED=true is required for --apply')
}

const values: unknown[] = []

const applicationFilter = applicationId
  ? `AND a.owner_aggregate_id=$${values.push(applicationId)}`
  : ''

const limitClause = limit == null ? '' : `LIMIT $${values.push(limit)}`

const rows = await runGreenhousePostgresQuery<EligibleRow>(
  `SELECT a.asset_id
     FROM greenhouse_core.assets a
    WHERE a.owner_aggregate_type='hiring_application_cv'
      AND a.owner_aggregate_id IS NOT NULL
      AND a.status='attached'
      AND a.visibility='private'
      AND a.mime_type='application/pdf'
      ${applicationFilter}
      AND EXISTS (
        SELECT 1 FROM greenhouse_core.asset_scan_results scan
         WHERE scan.asset_id=a.asset_id AND scan.verdict='clean'
           AND scan.scan_id=(SELECT scan2.scan_id FROM greenhouse_core.asset_scan_results scan2
             WHERE scan2.asset_id=a.asset_id ORDER BY scan2.scanned_at DESC,scan2.scan_id DESC LIMIT 1)
      )
    ORDER BY a.asset_id
    ${limitClause}`,
  values,
)

if (!apply) {
  console.log(JSON.stringify({
    mode: 'dry-run',
    eligible: rows.length,
    scopedToApplication: Boolean(applicationId),
    limited: limit != null,
  }))
  process.exit(0)
}

const outcomes: Record<string, number> = {}

for (const row of rows) {
  const result = await materializeCandidateReviewProjection(row.asset_id)

  outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1
}

console.log(JSON.stringify({
  mode: 'apply',
  processed: rows.length,
  outcomes,
  scopedToApplication: Boolean(applicationId),
  limited: limit != null,
}))
