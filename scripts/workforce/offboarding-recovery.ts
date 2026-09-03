/**
 * TASK-1349 Slice 4 — Governed offboarding recovery (dry-run by default).
 *
 * Two recovery lanes, both through the canonical commands (never SQL):
 *
 *   A. `close-lifecycle` — executed REAL exits whose member is still active
 *      (ISSUE-117: `hr.offboarding.executed_member_still_active`). Applies
 *      `applyOffboardingLifecycleEffects` for the case: compensation vigencia
 *      (usually already closed), legal relationship ended with the REAL last
 *      working day, `members.active=false`, assignments closed,
 *      `member.deactivated`. Idempotent.
 *
 *   B. `review-and-close` — an unresolved access-signal case that was a REAL
 *      termination (Felipe): `reviewOffboardingCase(relationship_ended)` with
 *      the operator's explicit cause + dates → approve → schedule → execute
 *      (which runs lane A's effects). Nothing is inferred: `--separation-type`
 *      and `--reason` are mandatory for apply.
 *
 * Every apply is allowlisted by `--member <memberId>` (repeatable) and requires
 * `--apply`; the script re-reads live state immediately before writing and
 * prints a readback (resolver windows + finance obligations) afterwards. It
 * never emits payments, never touches Finance rows, never recalculates exports.
 *
 * Usage:
 *   pnpm workforce:offboarding:recovery                               # dry-run, whole cohort
 *   pnpm workforce:offboarding:recovery --member <id>                 # dry-run, one member
 *   pnpm workforce:offboarding:recovery --apply --member <id> \
 *        --separation-type contract_end --reason "..." [--approve]   # lane B (or A when no review needed)
 *
 * Requires WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED=true in THIS
 * process for lane A effects (the script sets it explicitly on --apply; the
 * runtime flag stays governed by the ledger).
 */
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)

_require('module').Module._cache[_require.resolve('server-only')] = { id: 'server-only', exports: {} }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

type Args = {
  apply: boolean
  approve: boolean
  members: string[]
  decision: 'access_only' | 'relationship_ended'
  separationType: string | null
  accessRevokedOn: string | null
  reason: string | null
  actorUserId: string
}

const parseArgs = (argv: string[]): Args => {
  const args: Args = {
    apply: false,
    approve: false,
    members: [],
    decision: 'relationship_ended',
    separationType: null,
    accessRevokedOn: null,
    reason: null,
    actorUserId: 'user-efeonce-admin-julio-reyes'
  }

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]

    if (a === '--apply') args.apply = true
    else if (a === '--approve') args.approve = true
    else if (a === '--member' && argv[i + 1]) args.members.push(argv[++i])
    else if (a === '--decision' && argv[i + 1]) args.decision = argv[++i] === 'access_only' ? 'access_only' : 'relationship_ended'
    else if (a === '--separation-type' && argv[i + 1]) args.separationType = argv[++i]
    else if (a === '--access-revoked-on' && argv[i + 1]) args.accessRevokedOn = argv[++i]
    else if (a === '--reason' && argv[i + 1]) args.reason = argv[++i]
    else if (a === '--actor' && argv[i + 1]) args.actorUserId = argv[++i]
  }

  return args
}

const periodRange = (periodId: string) => {
  const [y, m] = periodId.split('-').map(Number)

  return { start: `${periodId}-01`, end: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { withTransaction } = await import('@/lib/db')
  const offboarding = await import('@/lib/workforce/offboarding')
  const { resolveExitEligibilityForMembers } = await import('@/lib/payroll/exit-eligibility')
  const signals = await import('@/lib/reliability/queries/offboarding-exit-drift')

  if (args.apply && args.members.length === 0) {
    throw new Error('--apply requires at least one --member <memberId> (allowlist explícito).')
  }

  type CohortRow = {
    profile_id: string
    member_id: string
    display_name: string
    active: boolean
    offboarding_case_id: string
    public_id: string
    status: string
    rule_lane: string
    separation_type: string
    source: string
    effective_date: string | null
    last_working_day: string | null
    review_decision: string | null
    updated_at: string
    open_comp: number
    active_rel: number
    has_executed_real_exit: boolean
  }

  const cohort = await runGreenhousePostgresQuery<CohortRow>(
    `
      SELECT c.profile_id, m.member_id, m.display_name, m.active,
             c.offboarding_case_id, c.public_id, c.status, c.rule_lane, c.separation_type, c.source,
             c.effective_date::text AS effective_date, c.last_working_day::text AS last_working_day,
             c.metadata_json -> 'review' ->> 'decision' AS review_decision,
             c.updated_at::text AS updated_at,
             (SELECT count(*)::int FROM greenhouse_payroll.compensation_versions cv WHERE cv.member_id = m.member_id AND cv.effective_to IS NULL) AS open_comp,
             (SELECT count(*)::int FROM greenhouse_core.person_legal_entity_relationships r WHERE r.profile_id = m.identity_profile_id AND r.status = 'active' AND r.effective_to IS NULL) AS active_rel,
             EXISTS (SELECT 1 FROM greenhouse_hr.work_relationship_offboarding_cases x WHERE x.member_id = m.member_id AND x.status = 'executed' AND x.rule_lane <> 'identity_only' AND x.last_working_day IS NOT NULL) AS has_executed_real_exit
      FROM greenhouse_hr.work_relationship_offboarding_cases c
      JOIN greenhouse_core.members m ON m.member_id = c.member_id
      WHERE m.is_demo = FALSE
        AND c.status <> 'cancelled'
        AND ($1::text[] IS NULL OR m.member_id = ANY($1::text[]))
      ORDER BY m.display_name, c.created_at
    `,
    [args.members.length > 0 ? args.members : null]
  )

  // The preview uses the exact canonical resolver used again inside the apply
  // transaction. An active member after a historical exit is not itself drift.
  const reentries = await withTransaction(async client => {
    await client.query('SET TRANSACTION READ ONLY')
    const found = new Map<string, NonNullable<Awaited<ReturnType<typeof offboarding.findReentryAfterExit>>>>()

    for (const row of cohort) {
      if (row.status !== 'executed' || !row.active || !row.last_working_day) continue

      const reentry = await offboarding.findReentryAfterExit(client, {
        profileId: row.profile_id, memberId: row.member_id, lastWorkingDay: row.last_working_day
      })

      if (reentry) found.set(row.offboarding_case_id, reentry)
    }

    return found
  })

  const classify = (row: CohortRow) => {
    const isIdentity = row.rule_lane === 'identity_only' || row.separation_type === 'identity_only'

    if (row.status === 'executed') {
      if (reentries.has(row.offboarding_case_id)) return 'reentry_preserved'

      return !isIdentity && row.active ? 'A_close_lifecycle' : 'ok'
    }

    if (isIdentity && !row.review_decision) return row.has_executed_real_exit ? 'B_stale_access_stub' : 'B_review_required'
    if (row.status === 'draft') return 'manual_decision_pending'

    return 'in_lifecycle'
  }

  console.log(`\n=== Cohorte (${args.apply ? 'APPLY' : 'DRY-RUN'}) ===`)

  for (const row of cohort) {
    console.log(
      `  ${row.display_name.padEnd(26)} ${row.public_id} ${row.status.padEnd(12)} ${row.rule_lane.padEnd(16)} ` +
        `active=${row.active} openComp=${row.open_comp} activeRel=${row.active_rel} lwd=${row.last_working_day ?? '-'} review=${row.review_decision ?? '-'} → ${classify(row)}`
    )
  }

  const readback = async (memberId: string, label: string) => {
    console.log(`\n--- readback ${label} ---`)

    for (const periodId of ['2026-05', '2026-06', '2026-07', '2026-09']) {
      const { start, end } = periodRange(periodId)
      const w = (await resolveExitEligibilityForMembers([memberId], start, end)).get(memberId)

      console.log(`  ${periodId}: policy=${w?.projectionPolicy} review=${w?.reviewRequired} cutoff=${w?.cutoffDate ?? '-'} warnings=${w?.warnings.map(x => x.code).join(',') || '-'}`)
    }

    const member = await runGreenhousePostgresQuery<{ active: boolean; status: string; contract_end_date: string | null }>(
      `SELECT active, status, contract_end_date::text AS contract_end_date FROM greenhouse_core.members WHERE member_id = $1`,
      [memberId]
    )

    console.log(`  member: ${JSON.stringify(member[0])}`)

    const finance = await runGreenhousePostgresQuery<{ period_id: string; obligation_kind: string; amount: string; status: string }>(
      `SELECT period_id, obligation_kind, amount::text, status FROM greenhouse_finance.payment_obligations WHERE beneficiary_id = $1 AND superseded_by IS NULL ORDER BY period_id, obligation_kind`,
      [memberId]
    )

    console.log(`  finance obligations (read-only, NO se tocan aquí): ${finance.map(f => `${f.period_id}:${f.obligation_kind}=${f.amount}/${f.status}`).join(' | ') || 'none'}`)
  }

  if (!args.apply) {
    for (const row of cohort) {
      const kind = classify(row)

      if (kind === 'reentry_preserved') {
        const reentry = reentries.get(row.offboarding_case_id)!

        console.log(`\n  [preservado] ${row.public_id}: episodio ${reentry.kind} ${reentry.id} vigente desde ${reentry.from}; no se desactiva a la persona ni se cierran sus asignaciones.`)
        continue
      }

      if (kind === 'ok' || kind === 'in_lifecycle' || kind === 'manual_decision_pending') {
        if (kind === 'manual_decision_pending') console.log(`\n  [manual] ${row.public_id}: draft manual con fecha pasada — HR decide aprobar/cancelar por el flujo normal; bloquea nómina mientras tanto.`)
        continue
      }

      if (kind === 'B_stale_access_stub') {
        console.log(`\n  [B stale] ${row.public_id}: señal de acceso de una salida real YA ejecutada — recovery = revisión access_only con --access-revoked-on <fecha> y cierre informational (no toca nada laboral).`)
      }

      if (kind === 'B_review_required') {
        const current = await offboarding.getOffboardingCase(row.offboarding_case_id)

        if (current && args.decision === 'access_only' && args.accessRevokedOn) {
          const preview = offboarding.previewOffboardingCaseReview({
            current,
            input: { decision: 'access_only', reason: args.reason ?? 'DRY-RUN preview (sin escritura)', expectedUpdatedAt: current.updatedAt, effectiveDate: args.accessRevokedOn },
            actorUserId: args.actorUserId,
            canApprove: true
          })

          console.log(`\n  [B preview access_only] ${row.public_id}: lane→${preview.derivation.next.lane.ruleLane} changes=${preview.derivation.changes.join(',')} payroll=${preview.payrollEffect.map(p => `${p.periodId}:${p.projectionPolicy}`).join(' ')}`)
        } else if (current && args.separationType && row.last_working_day) {
          const preview = offboarding.previewOffboardingCaseReview({
            current,
            input: {
              decision: 'relationship_ended',
              reason: args.reason ?? 'DRY-RUN preview (sin escritura)',
              expectedUpdatedAt: current.updatedAt,
              separationType: args.separationType as never,
              effectiveDate: row.effective_date ?? row.last_working_day,
              lastWorkingDay: row.last_working_day
            },
            actorUserId: args.actorUserId,
            canApprove: true
          })

          console.log(`\n  [B preview] ${row.public_id}: lane→${preview.derivation.next.lane.ruleLane} changes=${preview.derivation.changes.join(',')} payroll=${preview.payrollEffect.map(p => `${p.periodId}:${p.projectionPolicy}`).join(' ')}`)
        } else {
          console.log(`\n  [B] ${row.public_id}: requiere --separation-type (causal respaldada) y fechas explícitas en el caso para previsualizar; nada se infiere.`)
        }
      }

      if (kind === 'A_close_lifecycle') {
        const future = await runGreenhousePostgresQuery<{ version_id: string; effective_from: string }>(
          `SELECT version_id, effective_from::text AS effective_from FROM greenhouse_payroll.compensation_versions WHERE member_id = $1 AND effective_from > $2::date`,
          [row.member_id, row.last_working_day]
        )

        console.log(`\n  [A preview] ${row.public_id}: would end active relationship (${row.active_rel}) at ${row.last_working_day}, set members.active=false, close assignments; future comp versions blocking=${future.length}`)
      }

      await readback(row.member_id, `${row.display_name} (antes)`)
    }

    const sig = await Promise.all([
      signals.getOffboardingUnresolvedExitSignal(),
      signals.getOffboardingExecutedMemberStillActiveSignal(),
      signals.getWorkforceDeprovisionedMemberWithoutCaseSignal()
    ])

    console.log(`\n=== señales ===\n${sig.map(s => `  ${s.signalId}: ${s.severity} — ${s.summary}`).join('\n')}`)
    console.log('\nDRY-RUN: nada escrito. Para aplicar: --apply --member <id> [--separation-type <causal> --reason "<motivo>" --approve]')

    return
  }

  // ---------------- APPLY (allowlist) ----------------
  process.env.WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED = 'true'

  for (const row of cohort) {
    if (!args.members.includes(row.member_id)) continue

    const kind = classify(row)

    console.log(`\n>>> ${row.display_name} ${row.public_id} → ${kind}`)

    if ((kind === 'B_review_required' || kind === 'B_stale_access_stub') && args.decision === 'access_only') {
      if (!args.accessRevokedOn || !args.reason) throw new Error('access_only requiere --access-revoked-on <YYYY-MM-DD> y --reason explícitos.')

      const fresh = await offboarding.getOffboardingCase(row.offboarding_case_id)

      if (!fresh) throw new Error('case not found')

      const reviewed = await offboarding.reviewOffboardingCase({
        caseId: fresh.offboardingCaseId,
        actorUserId: args.actorUserId,
        canApprove: true,
        input: { decision: 'access_only', reason: args.reason, expectedUpdatedAt: fresh.updatedAt, effectiveDate: args.accessRevokedOn }
      })

      console.log(`  reviewed access_only: status=${reviewed.case.status}`)

      const closed = await offboarding.transitionOffboardingCase({
        caseId: reviewed.case.offboardingCaseId,
        actorUserId: args.actorUserId,
        input: { status: 'executed', expectedUpdatedAt: reviewed.case.updatedAt, reason: args.reason }
      })

      console.log(`  → ${closed.status} (informational; relación/compensación/member intactos)`)
      await readback(row.member_id, `${row.display_name} (después de access_only)`)
      continue
    }

    if (kind === 'B_review_required') {
      if (!args.separationType || !args.reason) throw new Error('Lane B requiere --separation-type y --reason explícitos.')
      if (!row.last_working_day) throw new Error('Lane B requiere fechas explícitas ya registradas en el caso (no se asume hoy).')

      const fresh = await offboarding.getOffboardingCase(row.offboarding_case_id)

      if (!fresh) throw new Error('case not found')

      const reviewed = await offboarding.reviewOffboardingCase({
        caseId: fresh.offboardingCaseId,
        actorUserId: args.actorUserId,
        canApprove: true,
        input: {
          decision: 'relationship_ended',
          reason: args.reason,
          expectedUpdatedAt: fresh.updatedAt,
          separationType: args.separationType as never,
          effectiveDate: fresh.effectiveDate ?? row.last_working_day,
          lastWorkingDay: row.last_working_day,
          approveNow: args.approve
        }
      })

      console.log(`  reviewed: status=${reviewed.case.status} lane=${reviewed.case.ruleLane} changes=${reviewed.changes.join(',')}`)

      if (!args.approve) {
        console.log('  Sin --approve: el caso queda en needs_review con la decisión registrada; aprobar/programar/ejecutar son pasos gobernados aparte.')
        await readback(row.member_id, `${row.display_name} (después de review)`)
        continue
      }

      let current = reviewed.case

      for (const status of ['scheduled', 'executed'] as const) {
        current = await offboarding.transitionOffboardingCase({
          caseId: current.offboardingCaseId,
          actorUserId: args.actorUserId,
          input: { status, expectedUpdatedAt: current.updatedAt, reason: args.reason }
        })
        console.log(`  → ${current.status}`)
      }

      await readback(row.member_id, `${row.display_name} (después de ejecutar)`)
      continue
    }

    if (kind === 'A_close_lifecycle') {
      const fresh = await offboarding.getOffboardingCase(row.offboarding_case_id)

      if (!fresh || fresh.status !== 'executed') throw new Error('estado cambió antes de aplicar; re-ejecuta el dry-run')

      const effects = await withTransaction(client =>
        offboarding.applyOffboardingLifecycleEffects(client, {
          current: fresh,
          lastWorkingDay: fresh.lastWorkingDay,
          actorUserId: args.actorUserId,
          reason: args.reason ?? 'TASK-1349 recovery: cierre de lifecycle de salida ya ejecutada'
        })
      )

      console.log(`  effects: ${JSON.stringify(effects)}`)
      await readback(row.member_id, `${row.display_name} (después)`)
      continue
    }

    console.log('  nada que aplicar para este caso.')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
