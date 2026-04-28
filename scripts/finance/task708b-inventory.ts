#!/usr/bin/env tsx
/**
 * TASK-708b — Inventario reproducible de cohortes Nubox phantom.
 * ===============================================================
 *
 * Read-only. Produce evidence JSON con counts + por-row de Cohorte A/B/C.
 * No muta nada.
 *
 * Uso:
 *   pnpm finance:task708b-inventory                    # stdout JSON
 *   pnpm finance:task708b-inventory --out <path.json>  # escribe a archivo
 */

import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import {
  listCohortAEvidence,
  listCohortBEvidence,
  listCohortCEvidence
} from '@/lib/finance/external-cash-signals'

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = process.argv.slice(2)
  const outIdx = args.indexOf('--out')
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null

  const [cohortA, cohortB, cohortC] = await Promise.all([
    listCohortAEvidence(),
    listCohortBEvidence(),
    listCohortCEvidence()
  ])

  const cohortATotalAmount = cohortA.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const cohortBTotalAmount = cohortB.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const evidence = {
    generatedAt: new Date().toISOString(),
    task: 'TASK-708b',
    cohorts: {
      A: {
        description: 'Runtime live: income_payments con payment_source=nubox_bank_sync, payment_account_id NULL',
        count: cohortA.length,
        totalAmountClp: cohortATotalAmount,
        rows: cohortA
      },
      B: {
        description: 'Backfill historico: expense_payments con prefix exp-pay-backfill-EXP-NB-* y payment_account_id NULL',
        count: cohortB.length,
        totalAmountClp: cohortBTotalAmount,
        rows: cohortB
      },
      C: {
        description: 'Settlement legs con instrument_id NULL (transversales a A; legs principales receipt/payout deben tener instrument)',
        count: cohortC.length,
        rows: cohortC
      }
    }
  }

  const output = JSON.stringify(evidence, null, 2)

  if (outPath) {
    const resolved = path.resolve(process.cwd(), outPath)

    writeFileSync(resolved, output, 'utf8')
    console.log(`[t708b:inventory] evidence written to ${resolved}`)
    console.log(`[t708b:inventory] cohort A=${cohortA.length} (${cohortATotalAmount.toLocaleString('es-CL')} CLP), B=${cohortB.length} (${cohortBTotalAmount.toLocaleString('es-CL')} CLP), C=${cohortC.length}`)
  } else {
    process.stdout.write(output)
    process.stdout.write('\n')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[t708b:inventory] error:', error?.message ?? error)
    process.exit(1)
  })
