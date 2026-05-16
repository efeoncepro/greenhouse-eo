import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)

_require('module').Module._cache[_require.resolve('server-only')] = {
  id: 'server-only',
  exports: {}
}

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

import { closeGreenhousePostgres, query } from '@/lib/db'
import { resolveLeaveAccrualWindowForMember } from '@/lib/leave/participation-window'

/**
 * TASK-895 V1.1a Slice 4 — Backfill audit script (read-only dry-run).
 *
 * Scans `leave_balances` for the target year and compares the persisted
 * `allowance_days` (legacy) against what the canonical participation-aware
 * resolver would compute. Reports drift per member without mutating anything.
 *
 * **Use cases**:
 *
 * 1. **Pre-flag-ON gate**: validate that the resolver does NOT produce
 *    surprises on real data. Run in staging, observe drift distribution,
 *    decide allowlist for first flag-ON cycle.
 *
 * 2. **Post-flag-ON verification**: after enabling the flag + re-seeding
 *    balances, run with `--target-year=<current>` and expect drift = 0.
 *    Any persistent drift indicates members not yet re-seeded OR a
 *    regression in the resolver.
 *
 * 3. **Forensic audit**: HR/Legal can request the script output to quantify
 *    the historical overshoot ("how many vacation days did we
 *    over-accumulate in 2025 for member X?").
 *
 * **Usage**:
 *
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/leave/audit-accrual-drift.ts \
 *     --target-year=2026 \
 *     [--output=audit-2026.json] \
 *     [--limit=500] \
 *     [--member-ids=id1,id2]
 *
 * Default: scans ALL active CL `pay_regime='chile'` members with
 * `payroll_via='internal'` and `policy.accrualType='monthly_accrual'`.
 *
 * **Output JSON**:
 *
 *   {
 *     summary: {
 *       targetYear, membersScanned, membersWithDrift, totalDriftDays,
 *       maxDriftDays, avgDriftDays
 *     },
 *     items: [{
 *       memberId, displayName, hireDate, policy, eligibleDays,
 *       legacyAllowanceDays, participationAwareAllowanceDays,
 *       driftDays, reasonCodes, degradedMode
 *     }]
 *   }
 *
 * **Hard rules** (canonized in CLAUDE.md S5):
 *
 * - Script is READ-ONLY. NEVER mutates `leave_balances` or any other table.
 *   Mutation (`--apply` flag) emerges in V1.2 with capability
 *   `leave.balances.reconcile`.
 * - Operates regardless of `LEAVE_PARTICIPATION_AWARE_ENABLED` flag state.
 *   The script invokes the resolver directly to compute what the resolver
 *   would produce — independent from runtime gating.
 * - Drift threshold for reporting: > 0.01 days (numerical noise floor). The
 *   reliability signal uses 30-day proxy; this script reports exact diff.
 */

type LeaveBalanceRow = {
  member_id: string
  display_name: string | null
  hire_date: string | null
  year: number
  leave_type_code: string
  allowance_days: string | number
  accrual_type: string
  policy_annual_days: string | number
  pay_regime: string
  payroll_via: string | null
}

type AuditItem = {
  memberId: string
  displayName: string
  hireDate: string | null
  year: number
  leaveTypeCode: string
  policy: string
  policyAnnualDays: number
  legacyAllowanceDays: number
  participationAwareAllowanceDays: number
  driftDays: number
  eligibleDays: number
  firstServiceCycleDays: number
  firstDependentEffectiveFrom: string | null
  reasonCodes: string[]
  degradedMode: boolean
  degradedReason: string | null
}

const getArgValue = (flag: string): string | null => {
  const prefix = `${flag}=`

  const direct = process.argv.find(arg => arg.startsWith(prefix))

  if (direct) return direct.slice(prefix.length)

  const idx = process.argv.indexOf(flag)

  return idx >= 0 ? process.argv[idx + 1] ?? null : null
}

const DRIFT_NOISE_FLOOR_DAYS = 0.01

const main = async () => {
  const targetYearRaw = getArgValue('--target-year') ?? String(new Date().getFullYear())
  const targetYear = Number.parseInt(targetYearRaw, 10)

  if (!Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 3000) {
    console.error(`Invalid --target-year: ${targetYearRaw}`)
    process.exit(1)
  }

  const limitRaw = getArgValue('--limit')
  const limit = limitRaw ? Math.max(1, Number.parseInt(limitRaw, 10)) : 500
  const outputPath = getArgValue('--output')

  const memberIdsArg = getArgValue('--member-ids')

  const memberIdsFilter = memberIdsArg
    ? memberIdsArg
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : null

  console.error(`Scanning leave_balances year=${targetYear}, limit=${limit}`)
  if (memberIdsFilter) console.error(`Filter member-ids: ${memberIdsFilter.length} ids`)

  const filterPredicate = memberIdsFilter ? 'AND lb.member_id = ANY($3::text[])' : ''
  const params: unknown[] = [targetYear, limit]

  if (memberIdsFilter) params.push(memberIdsFilter)

  const rows = await query<LeaveBalanceRow>(
    `SELECT lb.member_id,
            m.display_name,
            TO_CHAR(m.hire_date, 'YYYY-MM-DD') AS hire_date,
            lb.year,
            lb.leave_type_code,
            lb.allowance_days,
            lp.accrual_type,
            lp.annual_days AS policy_annual_days,
            m.pay_regime,
            m.payroll_via
     FROM greenhouse_hr.leave_balances lb
     JOIN greenhouse_hr.leave_policies lp ON lp.leave_type_code = lb.leave_type_code
     JOIN greenhouse_core.members m ON m.member_id = lb.member_id
     WHERE lb.year = $1
       AND m.active = TRUE
       AND m.pay_regime = 'chile'
       AND m.payroll_via = 'internal'
       AND lp.accrual_type = 'monthly_accrual'
       AND lb.allowance_days > 0
       ${filterPredicate}
     ORDER BY lb.allowance_days DESC, m.display_name ASC
     LIMIT $2`,
    params
  )

  console.error(`Found ${rows.length} candidate balance rows`)

  const items: AuditItem[] = []

  for (const row of rows) {
    const policyAnnualDays = Number(row.policy_annual_days)
    const legacyAllowanceDays = Number(row.allowance_days)

    const asOfDate = targetYear === new Date().getFullYear()
      ? new Date().toISOString().slice(0, 10)
      : `${targetYear}-12-31`

    const window = await resolveLeaveAccrualWindowForMember(row.member_id, targetYear, {
      asOfDate
    })

    const participationAwareAllowanceDays = window.firstServiceCycleDays > 0
      ? Math.round(((policyAnnualDays * window.eligibleDays) / window.firstServiceCycleDays) * 100) / 100
      : 0

    const driftDays = Math.round((legacyAllowanceDays - participationAwareAllowanceDays) * 100) / 100

    items.push({
      memberId: row.member_id,
      displayName: row.display_name ?? '(sin nombre)',
      hireDate: row.hire_date,
      year: row.year,
      leaveTypeCode: row.leave_type_code,
      policy: window.policy,
      policyAnnualDays,
      legacyAllowanceDays,
      participationAwareAllowanceDays,
      driftDays,
      eligibleDays: window.eligibleDays,
      firstServiceCycleDays: window.firstServiceCycleDays,
      firstDependentEffectiveFrom: window.firstDependentEffectiveFrom,
      reasonCodes: [...window.reasonCodes],
      degradedMode: window.degradedMode,
      degradedReason: window.degradedReason ?? null
    })
  }

  const itemsWithDrift = items.filter(i => Math.abs(i.driftDays) > DRIFT_NOISE_FLOOR_DAYS)
  const totalDriftDays = itemsWithDrift.reduce((acc, i) => acc + i.driftDays, 0)
  const maxDriftDays = itemsWithDrift.reduce((acc, i) => Math.max(acc, i.driftDays), 0)

  const avgDriftDays =
    itemsWithDrift.length > 0
      ? Math.round((totalDriftDays / itemsWithDrift.length) * 100) / 100
      : 0

  const report = {
    summary: {
      targetYear,
      driftNoiseFloorDays: DRIFT_NOISE_FLOOR_DAYS,
      membersScanned: items.length,
      membersWithDrift: itemsWithDrift.length,
      membersDegraded: items.filter(i => i.degradedMode).length,
      totalDriftDays: Math.round(totalDriftDays * 100) / 100,
      maxDriftDays,
      avgDriftDays
    },
    items: itemsWithDrift.sort((a, b) => b.driftDays - a.driftDays)
  }

  console.log(JSON.stringify(report, null, 2))

  if (outputPath) {
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.error(`\nWrote audit artifact to ${outputPath}`)
  }

  await closeGreenhousePostgres()
}

main().catch(async err => {
  console.error('FATAL:', err.message)
  if (err.stack) console.error(err.stack.split('\n').slice(0, 8).join('\n'))
  await closeGreenhousePostgres().catch(() => undefined)
  process.exit(1)
})
