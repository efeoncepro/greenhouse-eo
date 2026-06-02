import 'server-only'

/**
 * TASK-957 remediation — close an orphan employee compensation_version for a
 * member who exited (offboarding `executed`) but whose comp version was never
 * closed (effective_to IS NULL), and who now has a ContractorEngagement → the
 * double-rail overlap detected by `payroll.contractor.double_rail_overlap`.
 *
 * Why this is correct + safe:
 * - Mirrors EXACTLY the offboarding canonical closure `closeFuturePayrollEligibility`
 *   (src/lib/workforce/offboarding/store.ts:349): closes comp versions to the
 *   member's last working day. The date is RESOLVED from the member's executed
 *   offboarding case — NEVER hardcoded — so it's defensible and auditable.
 * - Idempotent: WHERE (effective_to IS NULL OR effective_to > lwd) — re-running
 *   is a no-op once closed.
 * - Reversible: to undo, set effective_to back to NULL for the closed version.
 * - Does NOT touch finiquito (reads comp version effective AT last_working_day;
 *   effective_to=lwd still covers that day), contract_type, pay_regime,
 *   payroll_via, nor offboarding status. Pure comp-version validity bound.
 *
 * Guard: aborts unless the member has an `executed` offboarding case with a
 * `last_working_day` — without a defensible date we never close a comp version.
 *
 * Usage:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/payroll/close-contractor-orphan-comp-version-task957.ts --member-id=<id>            # dry-run
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/payroll/close-contractor-orphan-comp-version-task957.ts --member-id=<id> --apply    # execute
 */

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

type CompVersionRow = {
  version_id: string
  version: number
  contract_type: string
  pay_regime: string
  effective_from: string
  effective_to: string | null
  is_current: boolean
}

type OffboardingRow = {
  public_id: string
  status: string
  last_working_day: string | null
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const memberArg = args.find(a => a.startsWith('--member-id='))
  const memberId = memberArg ? memberArg.slice('--member-id='.length).trim() : ''
  const apply = args.includes('--apply')

  return { memberId, apply }
}

const main = async () => {
  const { memberId, apply } = parseArgs()

  if (!memberId) {
    console.error('ERROR: --member-id=<id> is required.')
    process.exit(1)
  }

  console.log(`\n=== TASK-957 orphan comp-version closure — member=${memberId} mode=${apply ? 'APPLY' : 'DRY-RUN'} ===\n`)

  // 1. Resolve the defensible date: the member's executed offboarding last_working_day.
  const offboarding = await runGreenhousePostgresQuery<OffboardingRow>(
    `SELECT public_id, status, last_working_day::text AS last_working_day
     FROM greenhouse_hr.work_relationship_offboarding_cases
     WHERE member_id = $1 AND status = 'executed' AND last_working_day IS NOT NULL
     ORDER BY last_working_day DESC
     LIMIT 1`,
    [memberId]
  )

  const executed = offboarding[0]

  if (!executed) {
    console.error(
      `ABORT: member ${memberId} has no executed offboarding case with last_working_day. ` +
        `Refusing to close a comp version without a defensible date.`
    )
    process.exit(1)
  }

  const lastWorkingDay = executed.last_working_day!.slice(0, 10)

  console.log(`Offboarding: ${executed.public_id} (executed) · last_working_day=${lastWorkingDay}\n`)

  // 2. BEFORE
  const before = await runGreenhousePostgresQuery<CompVersionRow>(
    `SELECT version_id, version, contract_type, pay_regime,
            effective_from::text AS effective_from, effective_to::text AS effective_to, is_current
     FROM greenhouse_payroll.compensation_versions
     WHERE member_id = $1 ORDER BY version`,
    [memberId]
  )

  console.log('BEFORE compensation_versions:')
  for (const r of before) console.log(`  v${r.version} ${r.contract_type}/${r.pay_regime} ${r.effective_from}→${r.effective_to ?? 'NULL'} current=${r.is_current}`)

  const wouldClose = before.filter(
    r => r.effective_from.slice(0, 10) <= lastWorkingDay && (r.effective_to === null || r.effective_to.slice(0, 10) > lastWorkingDay)
  )

  console.log(`\nVersions that WOULD close to ${lastWorkingDay}: ${wouldClose.map(r => `v${r.version}`).join(', ') || '(none — already closed, idempotent no-op)'}\n`)

  if (!apply) {
    console.log('DRY-RUN — no changes. Re-run with --apply to execute.\n')
    process.exit(0)
  }

  // 3. APPLY — mirror of closeFuturePayrollEligibility (offboarding/store.ts:349).
  const closed = await withGreenhousePostgresTransaction(async client => {
    const res = await client.query<{ version_id: string; version: number }>(
      `UPDATE greenhouse_payroll.compensation_versions
       SET effective_to = $2::date, is_current = FALSE
       WHERE member_id = $1
         AND effective_from <= $2::date
         AND (effective_to IS NULL OR effective_to > $2::date)
       RETURNING version_id, version`,
      [memberId, lastWorkingDay]
    )

    return res.rows
  })

  console.log(`CLOSED ${closed.length} version(s): ${closed.map(r => `v${r.version}`).join(', ')}`)

  // 4. AFTER
  const after = await runGreenhousePostgresQuery<CompVersionRow>(
    `SELECT version, contract_type, pay_regime,
            effective_from::text AS effective_from, effective_to::text AS effective_to, is_current
     FROM greenhouse_payroll.compensation_versions
     WHERE member_id = $1 ORDER BY version`,
    [memberId]
  )

  console.log('\nAFTER compensation_versions:')
  for (const r of after) console.log(`  v${r.version} ${r.contract_type}/${r.pay_regime} ${r.effective_from}→${r.effective_to ?? 'NULL'} current=${r.is_current}`)
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('ERR:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
