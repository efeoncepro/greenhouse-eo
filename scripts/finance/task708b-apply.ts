#!/usr/bin/env tsx
/**
 * TASK-708b — Apply de la clasificación firmada por humano.
 * ===========================================================
 *
 * Lee un classification report (output de task708b-classify) o, si no se
 * provee `--report`, re-clasifica en línea (NO recomendado para apply final).
 *
 * Idempotente: cualquier signal ya en estado terminal (adopted/dismissed/superseded)
 * se skipea automáticamente. Re-run safe.
 *
 * Uso:
 *   pnpm finance:task708b-apply --report report.json --actor jreysgo@gmail.com
 *   pnpm finance:task708b-apply --report report.json --actor jreysgo@gmail.com --apply
 *   pnpm finance:task708b-apply --report report.json --actor jreysgo@gmail.com --apply --chunk-size 10
 *   pnpm finance:task708b-apply --report report.json --actor jreysgo@gmail.com --apply --filter-cohort A
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import {
  applyHistoricalRemediation,
  verifyCohortCResolution,
  type ClassificationProposal
} from '@/lib/finance/external-cash-signals'

interface ReportFile {
  task: string
  proposals: ClassificationProposal[]
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const reportIdx = args.indexOf('--report')
  const reportPath = reportIdx >= 0 ? args[reportIdx + 1] : null
  const actorIdx = args.indexOf('--actor')
  const actorUserId = actorIdx >= 0 ? args[actorIdx + 1] : null
  const chunkIdx = args.indexOf('--chunk-size')
  const chunkSize = chunkIdx >= 0 ? Math.max(1, Math.min(50, Number(args[chunkIdx + 1]) || 10)) : 10
  const filterIdx = args.indexOf('--filter-cohort')
  const filterCohort = filterIdx >= 0 ? args[filterIdx + 1]?.toUpperCase() : null

  if (!reportPath) {
    console.error('[t708b:apply] --report <classification.json> is required.')
    process.exit(1)
  }

  if (!actorUserId) {
    console.error('[t708b:apply] --actor <user_id_or_email> is required (audit trail).')
    process.exit(1)
  }

  const dryRun = !apply
  const reportContent = readFileSync(path.resolve(process.cwd(), reportPath), 'utf8')
  const report: ReportFile = JSON.parse(reportContent)

  if (report.task !== 'TASK-708b') {
    console.error(`[t708b:apply] report.task=${report.task}; expected TASK-708b. Aborting.`)
    process.exit(1)
  }

  console.log(`[t708b:apply] mode=${dryRun ? 'DRY-RUN' : 'APPLY'} chunk=${chunkSize} actor=${actorUserId} cohort=${filterCohort ?? 'ALL'}`)
  console.log(`[t708b:apply] proposals to process: ${report.proposals.length}`)

  // Filter por cohorte (opcional)
  const proposals = filterCohort
    ? report.proposals.filter(p =>
        filterCohort === 'A' ? p.documentKind === 'income'
        : filterCohort === 'B' ? p.documentKind === 'expense'
        : true
      )
    : report.proposals

  console.log(`[t708b:apply] post-filter proposals: ${proposals.length}`)

  const stats = {
    applied: 0,
    alreadyResolved: 0,
    errors: 0,
    byOutcome: {
      repaired_with_account: 0,
      superseded_replaced: 0,
      dismissed_no_cash: 0
    } as Record<string, number>
  }

  if (dryRun) {
    console.log('[t708b:apply] DRY-RUN: would apply the following:')

    for (const p of proposals) {
      stats.byOutcome[p.outcome] = (stats.byOutcome[p.outcome] || 0) + 1
      console.log(`  - ${p.signalId} → ${p.paymentId} (${p.outcome}) account=${p.resolvedAccountId ?? '—'}`)
    }

    console.log('[t708b:apply] dry-run summary:', stats.byOutcome)

    return
  }

  // Apply en chunks.
  for (let i = 0; i < proposals.length; i += chunkSize) {
    const chunk = proposals.slice(i, i + chunkSize)

    console.log(`[t708b:apply] processing chunk ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(proposals.length / chunkSize)} (${chunk.length} rows)...`)

    for (const proposal of chunk) {
      try {
        const result = await applyHistoricalRemediation(proposal, actorUserId)

        if (result.alreadyResolved) {
          stats.alreadyResolved++
        } else if (result.applied) {
          stats.applied++
          stats.byOutcome[proposal.outcome] = (stats.byOutcome[proposal.outcome] || 0) + 1
        }
      } catch (error) {
        stats.errors++
        console.error(`[t708b:apply] error on ${proposal.signalId}:`, error instanceof Error ? error.message : error)
      }
    }
  }

  console.log('[t708b:apply] summary:', stats)

  // Verificar Cohorte C resolution post-apply.
  const cohortC = await verifyCohortCResolution()

  console.log('[t708b:apply] Cohorte C residual after apply:', cohortC)

  if (cohortC.remainingReceiptLegsWithoutInstrument > 0 || cohortC.remainingPayoutLegsWithoutInstrument > 0) {
    console.warn('[t708b:apply] WARNING: legs principales sin instrument residuales. La migracion VALIDATE CONSTRAINT NO podra correr hasta que sean 0.')
  } else {
    console.log('[t708b:apply] Cohorte C clean. La migracion task-708b-validate-settlement-legs-principal-requires-instrument puede correr.')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[t708b:apply] fatal error:', error?.message ?? error)
    process.exit(1)
  })
