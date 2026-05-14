/**
 * TASK-872 Slice 5 — Backfill CLI for SCIM internal collaborators.
 *
 * Usage:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/scim/backfill-internal-collaborators.ts [options]
 *
 * Options:
 *   --allowlist email1,email2     Required. Exact email match (lowercase).
 *   --apply                       Execute mutations. Without --apply, dry-run only.
 *   --actor <user_id>             Actor user_id for audit log (required with --apply).
 *   --json                        Output JSON plan + report instead of human format.
 *
 * Examples:
 *   # Dry-run
 *   pnpm tsx scripts/scim/backfill-internal-collaborators.ts \
 *     --allowlist fzurita@efeoncepro.com,mchoyos@efeoncepro.com
 *
 *   # Apply (triple safety: --apply + --allowlist + --actor)
 *   pnpm tsx scripts/scim/backfill-internal-collaborators.ts \
 *     --apply --allowlist fzurita@efeoncepro.com,mchoyos@efeoncepro.com \
 *     --actor <admin_user_id>
 *
 * Spec: docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md
 * Runbook: docs/operations/runbooks/scim-internal-collaborator-recovery.md
 */

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

import {
  applyBackfill,
  formatApplyReportHuman,
  formatPlanHuman,
  planBackfill
} from '@/lib/scim/backfill-internal-collaborators'

interface CliArgs {
  allowlist: string[]
  apply: boolean
  actor: string | null
  json: boolean
}

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = { allowlist: [], apply: false, actor: null, json: false }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--apply') {
      args.apply = true
    } else if (arg === '--json') {
      args.json = true
    } else if (arg === '--allowlist') {
      const value = argv[i + 1]

      if (!value || value.startsWith('--')) {
        throw new Error('--allowlist requires a comma-separated email list')
      }

      args.allowlist = value
        .split(',')
        .map(e => e.trim())
        .filter(Boolean)
      i++
    } else if (arg === '--actor') {
      const value = argv[i + 1]

      if (!value || value.startsWith('--')) {
        throw new Error('--actor requires a user_id')
      }

      args.actor = value.trim()
      i++
    } else if (arg === '--help' || arg === '-h') {
      console.log(USAGE)
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

const USAGE = `
TASK-872 Slice 5 — SCIM Internal Collaborator Backfill

Usage:
  pnpm tsx --require ./scripts/lib/server-only-shim.cjs \\
    scripts/scim/backfill-internal-collaborators.ts [options]

Options:
  --allowlist e1,e2,e3   Required. Exact email match (lowercase). Comma-separated.
  --apply                Execute mutations. Without --apply, dry-run only.
  --actor <user_id>      Actor user_id for audit log. Required with --apply.
  --json                 Output JSON plan + report instead of human format.
  --help, -h             Show this message.

Examples:
  # Dry-run (default — no mutations)
  pnpm tsx scripts/scim/backfill-internal-collaborators.ts \\
    --allowlist fzurita@efeoncepro.com,mchoyos@efeoncepro.com

  # Apply with audit trail
  pnpm tsx scripts/scim/backfill-internal-collaborators.ts \\
    --apply --allowlist fzurita@efeoncepro.com,mchoyos@efeoncepro.com \\
    --actor <admin_user_id_real>
`

const main = async () => {
  let args: CliArgs

  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error('Argument error:', error instanceof Error ? error.message : String(error))
    console.error(USAGE)
    process.exit(2)
  }

  if (args.allowlist.length === 0) {
    console.error('--allowlist is required (comma-separated emails)')
    console.error(USAGE)
    process.exit(2)
  }

  if (args.apply) {
    if (!args.actor) {
      console.error('--apply requires --actor <user_id> for audit trail')
      process.exit(2)
    }
  }

  // Phase 1: plan (dry-run analysis)
  const plan = await planBackfill(args.allowlist)

  if (!args.apply) {
    // Dry-run only
    if (args.json) {
      console.log(JSON.stringify({ plan, applied: null }, null, 2))
    } else {
      console.log(formatPlanHuman(plan))
      console.log('\n💡 Re-run with `--apply --actor <user_id>` to execute mutations.')
    }

    if (plan.summary.notFoundCount > 0) {
      process.exit(1) // signal partial pre-flight failure to CI
    }

    return
  }

  // Phase 2: apply
  if (!args.actor) {
    console.error('actor is required at apply time')
    process.exit(2)
  }

  const report = await applyBackfill(plan, { actorUserId: args.actor })

  if (args.json) {
    console.log(JSON.stringify({ plan, applied: report }, null, 2))
  } else {
    console.log(formatPlanHuman(plan))
    console.log('')
    console.log(formatApplyReportHuman(report))
  }

  // Exit code: 0 if no failed; 1 if any failed (CI gate)
  if (report.summary.failedCount > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Backfill failed:', error instanceof Error ? error.message : String(error))

  if (error instanceof Error && error.stack) {
    console.error(error.stack)
  }

  process.exit(3)
})
