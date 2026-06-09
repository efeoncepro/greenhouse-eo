#!/usr/bin/env tsx
/**
 * TASK-1020 — Operator tool: recovery auditado de autoridad de aprobación de
 * permisos (snapshots de `leave.supervisor_review` congelados con un delegado
 * genérico inválido).
 *
 * Dry-run por default (no muta). `--apply` requiere al menos un filtro explícito
 * (allowlist anti revoke global accidental). Recompute SIEMPRE vía el resolver
 * canónico (SSOT); revoca globalmente la responsabilidad inválida (D4).
 *
 * Uso:
 *   # Diagnóstico (no muta):
 *   pnpm hr:leave-approval-authority:recover --dry-run --supervisor-member-id daniela-ferreira
 *   pnpm hr:leave-approval-authority:recover --json --supervisor-member-id daniela-ferreira
 *
 *   # Apply (allowlisted por filtro explícito):
 *   pnpm hr:leave-approval-authority:recover --apply \
 *     --supervisor-member-id daniela-ferreira \
 *     --delegate-responsibility-id resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58 \
 *     --leave-request-id leave-14abe9e8-df63-40a8-853a-e83aa92cfaea \
 *     --reason "TASK-1020 remediación drift autoridad permisos"
 */
import { config } from 'dotenv'

import { closeGreenhousePostgres } from '@/lib/db'
import { runLeaveApprovalAuthorityRecovery } from '@/lib/hr-core/leave-approval-authority-recovery'

config({ path: '.env.local' })

const argv = process.argv.slice(2)

const hasFlag = (name: string) => argv.includes(`--${name}`)

/** Acepta `--key=value` y `--key value` (la spec usa la forma con espacio). */
const parseArg = (name: string): string | undefined => {
  const eqForm = argv.find(arg => arg.startsWith(`--${name}=`))

  if (eqForm) {
    return eqForm.split('=').slice(1).join('=').trim()
  }

  const idx = argv.indexOf(`--${name}`)

  if (idx >= 0) {
    const next = argv[idx + 1]

    if (next && !next.startsWith('--')) {
      return next.trim()
    }
  }

  return undefined
}

const main = async () => {
  const apply = hasFlag('apply')
  const asJson = hasFlag('json')

  const filters = {
    supervisorMemberId: parseArg('supervisor-member-id'),
    delegateResponsibilityId: parseArg('delegate-responsibility-id'),
    leaveRequestId: parseArg('leave-request-id')
  }

  const hasFilter = Boolean(
    filters.supervisorMemberId || filters.delegateResponsibilityId || filters.leaveRequestId
  )

  // Allowlist: el apply nunca corre sin un filtro explícito (anti revoke global).
  if (apply && !hasFilter) {
    console.error(
      'ABORT — `--apply` requiere al menos un filtro explícito ' +
        '(--supervisor-member-id / --delegate-responsibility-id / --leave-request-id). ' +
        'Sin filtro solo se permite --dry-run.'
    )
    process.exitCode = 1

    return
  }

  const plan = await runLeaveApprovalAuthorityRecovery({
    ...filters,
    dryRun: !apply,
    actorUserId: parseArg('actor-user-id') ?? null,
    reason: parseArg('reason') ?? null
  })

  if (asJson) {
    console.log(JSON.stringify(plan, null, 2))

    return
  }

  console.log(`\n--- Leave Approval Authority Recovery (${plan.applied ? 'APPLIED' : 'DRY-RUN'}) ---\n`)
  console.log('Filtros:', JSON.stringify(plan.filters))

  console.log(`\nResponsabilidades inválidas (${plan.invalidResponsibilities.length}):`)

  if (plan.invalidResponsibilities.length === 0) {
    console.log('  (ninguna)')
  } else {
    for (const item of plan.invalidResponsibilities) {
      console.log(
        `  - ${item.responsibilityId} · delegada=${item.delegateMemberId} · ` +
          `scope=${item.supervisorMemberId} · ${item.action}`
      )
    }
  }

  console.log(`\nSnapshots a reparar (${plan.snapshotRepairs.length}):`)

  if (plan.snapshotRepairs.length === 0) {
    console.log('  (ninguno — steady state)')
  } else {
    for (const repair of plan.snapshotRepairs) {
      console.log(`  - ${repair.leaveRequestId} (subject=${repair.subjectMemberId})`)
      console.log(
        `      before: source=${repair.before.authoritySource} ` +
          `effective=${repair.before.effectiveApproverMemberId} formal=${repair.before.formalApproverMemberId}`
      )
      console.log(
        `      after:  source=${repair.after.authoritySource} ` +
          `effective=${repair.after.effectiveApproverMemberId} formal=${repair.after.formalApproverMemberId}`
      )
    }
  }

  if (!plan.applied) {
    console.log('\nDRY-RUN: no se modificó nada. Re-ejecuta con `--apply` + filtro para aplicar.')
  } else {
    console.log('\nAPPLIED: revoke + recompute ejecutados en transacción. Re-ejecutar es no-op.')
  }
}

main()
  .catch(error => {
    console.error('ERROR:', error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres().catch(() => {})
  })
