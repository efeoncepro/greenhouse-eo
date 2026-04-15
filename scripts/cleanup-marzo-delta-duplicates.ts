/*
 * scripts/cleanup-marzo-delta-duplicates.ts
 *
 * Final cleanup for TASK-409 hotfix 2026-04-15.
 *
 * After the Marzo 2026 reliquidación reconciliation, the delta consumer
 * ran three times against the same reliquidated events (original, then
 * re-emitted by reconcile-marzo-2026-reliquidation.ts, then re-emitted
 * by fix-valentina-delta-row.ts) and left 9 events in the outbox. The
 * first two batches were processed by the pre-fix `deltaGross` code,
 * which double-counted USD members (same amount twice because gross=net)
 * and wrote Valentina with the wrong 822.50 value (gross instead of net).
 * The third batch was processed by the fixed `deltaNet` code and wrote
 * the correct 56.95 row for Valentina.
 *
 * This script deterministically picks the correct set of active delta
 * rows — exactly ONE per member, with the right amount — and annuls
 * everything else for the period. Resulting state:
 *
 *   Andrés:    EXP-RELIQ-…bc200968   $2.21      active
 *   Daniela:   EXP-RELIQ-…cecfb237   $128.94    active
 *   Melkin:    EXP-RELIQ-…d6f90c06   $108.69    active
 *   Valentina: EXP-RELIQ-…2d11d2d2   CLP 56.95  active
 *   (all other delta rows for Marzo 2026 become `is_annulled = TRUE`)
 *
 * Idempotent: re-runs are a no-op because the script only annuls rows
 * that are currently active. Transactional — if any step fails the
 * whole batch rolls back.
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx -r tsconfig-paths/register scripts/cleanup-marzo-delta-duplicates.ts [--execute]
 */

import { closeGreenhousePostgres, query, withTransaction } from '@/lib/db'

const PERIOD_ID = '2026-03'

// Deterministic "keep" list. These are the rows we explicitly want to
// preserve. Everything else for Marzo 2026 in source_type='payroll_reliquidation'
// gets annulled.
const EXPENSES_TO_KEEP = [
  'EXP-RELIQ-2026-03-andres-carlosama-bc200968',
  'EXP-RELIQ-2026-03-daniela-ferreira-cecfb237',
  'EXP-RELIQ-2026-03-melkin-hernandez-d6f90c06',
  'EXP-RELIQ-2026-03-valentina-hoyos-2d11d2d2'
] as const

interface DeltaRow extends Record<string, unknown> {
  expense_id: string
  member_id: string | null
  currency: string
  total_amount: string | number
  is_annulled: boolean
  created_at: Date | string
}

const run = async () => {
  const execute = process.argv.includes('--execute')

  if (!execute) {
    console.log('ℹ  Running in DRY-RUN mode. Pass --execute to apply.')
  }

  const rows = await query<DeltaRow>(
    `
      SELECT expense_id, member_id, currency, total_amount, is_annulled, created_at
      FROM greenhouse_finance.expenses
      WHERE payroll_period_id = $1
        AND source_type = 'payroll_reliquidation'
      ORDER BY member_id, created_at ASC
    `,
    [PERIOD_ID]
  )

  const keepSet = new Set<string>(EXPENSES_TO_KEEP)
  const toAnnul: DeltaRow[] = []
  const alreadyKept: DeltaRow[] = []
  const alreadyAnnulled: DeltaRow[] = []

  for (const row of rows) {
    if (keepSet.has(row.expense_id)) {
      if (row.is_annulled) {
        throw new Error(
          `Row ${row.expense_id} is marked as 'keep' but is already annulled — aborting to avoid unrecoverable state.`
        )
      }

      alreadyKept.push(row)
      continue
    }

    if (row.is_annulled) {
      alreadyAnnulled.push(row)
      continue
    }

    toAnnul.push(row)
  }

  console.log('')
  console.log('════════════════════════════════════════════════════════════')
  console.log(' Marzo 2026 delta cleanup plan')
  console.log('════════════════════════════════════════════════════════════')
  console.log('')
  console.log(' Keep active (expected correct rows):')

  for (const row of alreadyKept) {
    console.log(`   · ${row.expense_id} | ${row.member_id} | ${row.currency} ${row.total_amount}`)
  }

  console.log('')
  console.log(' Annul (duplicates + wrong amounts):')

  if (toAnnul.length === 0) {
    console.log('   (nothing to annul — already clean)')
  } else {
    for (const row of toAnnul) {
      console.log(`   · ${row.expense_id} | ${row.member_id} | ${row.currency} ${row.total_amount}`)
    }
  }

  console.log('')
  console.log(' Already annulled (previous runs):')

  if (alreadyAnnulled.length === 0) {
    console.log('   (none)')
  } else {
    for (const row of alreadyAnnulled) {
      console.log(`   · ${row.expense_id} | ${row.member_id} | ${row.currency} ${row.total_amount}`)
    }
  }

  console.log('')
  console.log('════════════════════════════════════════════════════════════')

  if (alreadyKept.length !== EXPENSES_TO_KEEP.length) {
    throw new Error(
      `Expected ${EXPENSES_TO_KEEP.length} keep rows but found only ${alreadyKept.length}. Aborting.`
    )
  }

  if (!execute) {
    console.log('✋  Dry run. Re-run with --execute to apply.')

    return
  }

  if (toAnnul.length === 0) {
    console.log('ℹ  Nothing to annul. Exit clean.')

    return
  }

  await withTransaction(async client => {
    const ids = toAnnul.map(r => r.expense_id)

    await client.query(
      `
        UPDATE greenhouse_finance.expenses
        SET is_annulled = TRUE,
            payment_status = 'written_off',
            notes = COALESCE(notes, '')
              || ' | ANNULLED 2026-04-15 by cleanup-marzo-delta-duplicates.ts — '
              || 'duplicate or stale delta row from TASK-409 reliquidación hotfix recovery. '
              || 'See EXPENSES_TO_KEEP in the script for the canonical set.',
            updated_at = CURRENT_TIMESTAMP
        WHERE expense_id = ANY($1::text[])
      `,
      [ids]
    )

    console.log(`✔  Annulled ${ids.length} delta rows: ${ids.join(', ')}`)
  })

  console.log('')
  console.log(' Cleanup complete. Verify with scripts/diagnose-marzo-delta-state.ts')
}

run()
  .catch(err => {
    console.error('❌ Cleanup failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
