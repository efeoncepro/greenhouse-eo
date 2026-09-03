/**
 * TASK-1349 — Read-only smoke of the canonical exit-eligibility resolver
 * against the REAL PostgreSQL (through the Cloud SQL proxy).
 *
 * Exercises `resolveExitEligibilityForMembers` — including its embedded SQL,
 * which mocked tests never run — for a cohort of members across periods and
 * prints the governing case, policy and review flag per (member, period).
 *
 * Usage:
 *   pnpm payroll:exit-eligibility:smoke                       # all members with an offboarding case
 *   pnpm payroll:exit-eligibility:smoke --member <id> [--member <id>] --period 2026-05 --period 2026-09
 *
 * Never writes. Safe to run against the shared instance.
 */
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)

_require('module').Module._cache[_require.resolve('server-only')] = { id: 'server-only', exports: {} }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const parseArgs = (argv: string[]) => {
  const members: string[] = []
  const periods: string[] = []

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--member' && argv[i + 1]) members.push(argv[++i])
    else if (argv[i] === '--period' && argv[i + 1]) periods.push(argv[++i])
  }

  return { members, periods }
}

const periodRange = (periodId: string) => {
  const [y, m] = periodId.split('-').map(Number)
  const start = `${periodId}-01`
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)

  return { start, end }
}

const main = async () => {
  const { members, periods } = parseArgs(process.argv.slice(2))
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { resolveExitEligibilityForMembers } = await import('@/lib/payroll/exit-eligibility')

  const memberIds =
    members.length > 0
      ? members
      : (
          await runGreenhousePostgresQuery<{ member_id: string }>(
            `SELECT DISTINCT c.member_id
               FROM greenhouse_hr.work_relationship_offboarding_cases c
               JOIN greenhouse_core.members m ON m.member_id = c.member_id
              WHERE c.member_id IS NOT NULL AND m.is_demo = FALSE
              ORDER BY c.member_id`
          )
        ).map(r => r.member_id)

  const names = new Map(
    (
      await runGreenhousePostgresQuery<{ member_id: string; display_name: string; active: boolean }>(
        `SELECT member_id, display_name, active FROM greenhouse_core.members WHERE member_id = ANY($1::text[])`,
        [memberIds]
      )
    ).map(r => [r.member_id, `${r.display_name}${r.active ? '' : ' (inactive)'}`])
  )

  const periodIds = periods.length > 0 ? periods : ['2026-05', '2026-06', '2026-07', '2026-09']

  for (const periodId of periodIds) {
    const { start, end } = periodRange(periodId)
    const windows = await resolveExitEligibilityForMembers(memberIds, start, end)

    console.log(`\n=== ${periodId} (${start} → ${end}) ===`)

    for (const memberId of memberIds) {
      const w = windows.get(memberId)

      if (!w) {
        console.log(`  ${memberId}  <no window>`)
        continue
      }

      const warnings = w.warnings.map(x => `${x.code}${x.severity === 'blocking' ? '!' : ''}`).join(',') || '-'

      console.log(
        `  ${(names.get(memberId) ?? memberId).padEnd(34)} case=${(w.exitCasePublicId ?? '-').padEnd(22)} ` +
          `${(w.exitLane ?? '-').padEnd(16)} ${(w.exitStatus ?? '-').padEnd(12)} cutoff=${(w.cutoffDate ?? '-').padEnd(10)} ` +
          `policy=${w.projectionPolicy.padEnd(22)} review=${String(w.reviewRequired).padEnd(5)} warnings=${warnings}`
      )
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
