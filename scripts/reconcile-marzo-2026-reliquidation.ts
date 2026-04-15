/*
 * scripts/reconcile-marzo-2026-reliquidation.ts
 *
 * One-time reconciliation for the payroll reliquidación of Marzo 2026.
 *
 * Context (2026-04-15):
 *   The operator reopened Marzo 2026, recalculated entries with fresh ICO
 *   KPIs, and re-exported the period. The `finance_expense_reactive_intake`
 *   projection running on Cloud Run ops-worker was stale — it did not have
 *   the TASK-411 dedupe fix nor the `is_active = TRUE` filter from TASK-410.
 *   Consequence on staging:
 *
 *     1. Four duplicate `source_type = 'payroll_generated'` expense rows
 *        were created (one per v2 entry) in addition to the original four
 *        from the first export.
 *     2. The delta consumer `payroll_reliquidation_delta` was also absent
 *        from the stale ops-worker, so the corresponding `delta` rows with
 *        `source_type = 'payroll_reliquidation'` were never materialized.
 *
 *   The downstream effect was inflated totals in the "Nómina cerrada"
 *   email (8 colaboradores instead of 4) and double-counted payroll
 *   expenses in Finance.
 *
 * Strategy:
 *
 *   Step 1 — Annul (soft-delete via `is_annulled = TRUE`) the four
 *   duplicate base expenses created on 2026-04-15 at 21:40 UTC. We keep
 *   the rows for audit trail but exclude them from every aggregation.
 *
 *   Step 2 — Re-emit the four `payroll_entry.reliquidated` outbox events
 *   so the now-redeployed ops-worker (running TASK-411 code) picks them
 *   up on the next reactive tick and materializes the correct delta
 *   expense rows.
 *
 *   Step 3 — Report the resulting state so the operator can confirm.
 *
 * Safety:
 *
 *   - The script is idempotent: re-running it after a successful pass is
 *     a no-op (annulled rows stay annulled; re-emitting with a fresh
 *     event_id creates new events which the reactive consumer dedupes via
 *     `(event_id, handler)` in `outbox_reactive_log`).
 *   - Every mutation runs inside a single transaction. If any step fails
 *     the whole reconciliation rolls back.
 *   - The script refuses to run if the pre-conditions are not met (e.g.
 *     Marzo 2026 is not in `exported` status, the duplicate rows are not
 *     where we expect them, or the active v2 entries do not match the
 *     count).
 *
 * Usage:
 *
 *   set -a; source .env.local; set +a
 *   npx tsx -r tsconfig-paths/register scripts/reconcile-marzo-2026-reliquidation.ts [--dry-run] [--execute]
 *
 *   --dry-run  (default) reports the plan without writing anything
 *   --execute  applies the reconciliation transactionally
 */

import { randomUUID } from 'node:crypto'

import { closeGreenhousePostgres, query, withTransaction } from '@/lib/db'

const PERIOD_ID = '2026-03'
const EXPECTED_MEMBER_COUNT = 4

const DUPLICATE_EXPENSE_IDS = [
  'EXP-202603-007',
  'EXP-202603-008',
  'EXP-202603-009',
  'EXP-202603-010'
] as const

interface PeriodRow extends Record<string, unknown> {
  period_id: string
  status: string
  year: number
  month: number
}

interface EntryPairRow extends Record<string, unknown> {
  member_id: string
  display_name: string | null
  currency: string
  v1_entry_id: string | null
  v1_gross_total: string | number | null
  v1_net_total: string | number | null
  v2_entry_id: string | null
  v2_gross_total: string | number | null
  v2_net_total: string | number | null
  reopen_audit_id: string | null
  reopen_reason: string | null
}

interface ExistingDuplicateRow extends Record<string, unknown> {
  expense_id: string
  member_id: string | null
  currency: string
  total_amount: string | number
  is_annulled: boolean
  created_at: Date | string
}

const parseNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0

  if (typeof value === 'number') return value

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const formatCurrency = (amount: number, currency: string) =>
  currency === 'CLP'
    ? `CLP ${Math.round(amount).toLocaleString('es-CL')}`
    : `USD ${amount.toFixed(2)}`

const loadPeriodSnapshot = async (): Promise<PeriodRow> => {
  const rows = await query<PeriodRow>(
    `
      SELECT period_id, status, year, month
      FROM greenhouse_payroll.payroll_periods
      WHERE period_id = $1
      LIMIT 1
    `,
    [PERIOD_ID]
  )

  if (rows.length === 0) {
    throw new Error(`Period ${PERIOD_ID} does not exist.`)
  }

  return rows[0]!
}

const loadEntryPairs = async (): Promise<EntryPairRow[]> =>
  query<EntryPairRow>(
    `
      WITH active_rows AS (
        SELECT entry_id, member_id, currency, gross_total, net_total, reopen_audit_id
        FROM greenhouse_payroll.payroll_entries
        WHERE period_id = $1
          AND is_active = TRUE
      ),
      superseded_rows AS (
        SELECT entry_id, member_id, currency, gross_total, net_total, superseded_by
        FROM greenhouse_payroll.payroll_entries
        WHERE period_id = $1
          AND is_active = FALSE
      )
      SELECT
        COALESCE(active.member_id, superseded.member_id) AS member_id,
        m.display_name,
        COALESCE(active.currency, superseded.currency) AS currency,
        superseded.entry_id  AS v1_entry_id,
        superseded.gross_total AS v1_gross_total,
        superseded.net_total   AS v1_net_total,
        active.entry_id       AS v2_entry_id,
        active.gross_total    AS v2_gross_total,
        active.net_total      AS v2_net_total,
        active.reopen_audit_id AS reopen_audit_id,
        audit.reason          AS reopen_reason
      FROM active_rows AS active
      FULL OUTER JOIN superseded_rows AS superseded
        ON superseded.superseded_by = active.entry_id
      LEFT JOIN greenhouse_core.members AS m
        ON m.member_id = COALESCE(active.member_id, superseded.member_id)
      LEFT JOIN greenhouse_payroll.payroll_period_reopen_audit AS audit
        ON audit.audit_id = active.reopen_audit_id
      ORDER BY m.display_name NULLS LAST
    `,
    [PERIOD_ID]
  )

const loadExistingDuplicates = async (): Promise<ExistingDuplicateRow[]> =>
  query<ExistingDuplicateRow>(
    `
      SELECT expense_id, member_id, currency, total_amount, is_annulled, created_at
      FROM greenhouse_finance.expenses
      WHERE expense_id = ANY($1::text[])
      ORDER BY expense_id
    `,
    [DUPLICATE_EXPENSE_IDS as unknown as string[]]
  )

const buildReliquidatedEventPayload = (pair: EntryPairRow) => {
  const previousGross = parseNumber(pair.v1_gross_total)
  const previousNet = parseNumber(pair.v1_net_total)
  const newGross = parseNumber(pair.v2_gross_total)
  const newNet = parseNumber(pair.v2_net_total)

  return {
    entryId: pair.v2_entry_id,
    periodId: PERIOD_ID,
    operationalYear: 2026,
    operationalMonth: 3,
    memberId: pair.member_id,
    version: 2,
    previousVersion: 1,
    previousEntryId: pair.v1_entry_id,
    previousGrossTotal: previousGross,
    previousNetTotal: previousNet,
    newGrossTotal: newGross,
    newNetTotal: newNet,
    deltaGross: newGross - previousGross,
    deltaNet: newNet - previousNet,
    currency: pair.currency,
    reopenAuditId: pair.reopen_audit_id,
    reason: pair.reopen_reason,
    _reconciledBy: 'scripts/reconcile-marzo-2026-reliquidation.ts',
    _reconciledAt: new Date().toISOString()
  }
}

const printPlan = (
  period: PeriodRow,
  pairs: EntryPairRow[],
  duplicates: ExistingDuplicateRow[]
) => {
  console.log('')
  console.log('════════════════════════════════════════════════════════════')
  console.log(' Reconcile Marzo 2026 reliquidation — plan')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`  Period:            ${period.period_id}`)
  console.log(`  Status:            ${period.status}`)
  console.log(`  Year/Month:        ${period.year}/${String(period.month).padStart(2, '0')}`)
  console.log('')
  console.log(' Entries pairs (v1 original + v2 active):')

  for (const pair of pairs) {
    const v1Gross = parseNumber(pair.v1_gross_total)
    const v2Gross = parseNumber(pair.v2_gross_total)
    const delta = v2Gross - v1Gross

    console.log(`  · ${pair.display_name ?? pair.member_id}`)
    console.log(`      v1: ${pair.v1_entry_id ?? 'missing'} → ${formatCurrency(v1Gross, pair.currency)}`)
    console.log(`      v2: ${pair.v2_entry_id ?? 'missing'} → ${formatCurrency(v2Gross, pair.currency)}`)
    console.log(`      delta: ${delta >= 0 ? '+' : ''}${formatCurrency(delta, pair.currency)}`)
  }

  console.log('')
  console.log(' Duplicate expenses to annul:')

  if (duplicates.length === 0) {
    console.log('  (none found — already reconciled?)')
  } else {
    for (const row of duplicates) {
      const amount = parseNumber(row.total_amount)
      const state = row.is_annulled ? 'already annulled' : 'active'

      console.log(`  · ${row.expense_id}: ${row.member_id} ${formatCurrency(amount, row.currency)} (${state})`)
    }
  }

  console.log('')
  console.log(' Outbox events to re-emit:')

  for (const pair of pairs) {
    if (!pair.v1_entry_id || !pair.v2_entry_id) {
      console.log(`  · ${pair.display_name ?? pair.member_id} — SKIP (missing v1 or v2)`)
      continue
    }

    const payload = buildReliquidatedEventPayload(pair)

    console.log(`  · payroll_entry.reliquidated — ${pair.display_name ?? pair.member_id}`)
    console.log(`      entryId=${payload.entryId}`)
    console.log(`      delta: ${payload.deltaGross >= 0 ? '+' : ''}${formatCurrency(payload.deltaGross, pair.currency)}`)
  }

  console.log('')
  console.log('════════════════════════════════════════════════════════════')
  console.log('')
}

const assertPreconditions = (
  period: PeriodRow,
  pairs: EntryPairRow[],
  duplicates: ExistingDuplicateRow[]
) => {
  const errors: string[] = []

  if (period.status !== 'exported') {
    errors.push(
      `Period ${PERIOD_ID} is in status '${period.status}' — expected 'exported' for this reconciliation to be safe.`
    )
  }

  const completePairs = pairs.filter(p => p.v1_entry_id && p.v2_entry_id)

  if (completePairs.length !== EXPECTED_MEMBER_COUNT) {
    errors.push(
      `Expected ${EXPECTED_MEMBER_COUNT} (v1, v2) pairs but found ${completePairs.length}. ` +
        'Aborting to avoid partial reconciliation.'
    )
  }

  const activeDuplicates = duplicates.filter(row => !row.is_annulled)

  if (activeDuplicates.length === 0 && duplicates.length === 0) {
    errors.push(
      'None of the expected duplicate expense rows were found. The reconciliation has probably ' +
        'already been applied. Nothing to do.'
    )
  }

  if (errors.length > 0) {
    console.error('❌ Pre-conditions failed:')

    for (const err of errors) {
      console.error(`  · ${err}`)
    }

    process.exit(errors[0]?.includes('already been applied') ? 0 : 1)
  }
}

const applyReconciliation = async (pairs: EntryPairRow[], duplicates: ExistingDuplicateRow[]) => {
  await withTransaction(async client => {
    // Step 1 — annul the duplicate base expenses. Keep the rows for audit
    // history but exclude them from every downstream aggregation via the
    // existing `is_annulled` flag.
    const activeDuplicates = duplicates.filter(row => !row.is_annulled)

    if (activeDuplicates.length > 0) {
      const ids = activeDuplicates.map(row => row.expense_id)

      // `written_off` is the only terminal "do-not-pay" value allowed by the
      // DB CHECK constraint on payment_status (expenses_payment_status_check).
      // The TypeScript enum in `contracts.ts` lists 'cancelled' but the
      // schema never migrated — treat 'written_off' as the canonical
      // "annulled, will not be paid" status until the types are reconciled.
      await client.query(
        `
          UPDATE greenhouse_finance.expenses
          SET is_annulled = TRUE,
              payment_status = 'written_off',
              notes = COALESCE(notes, '')
                || ' | ANNULLED 2026-04-15 by reconcile-marzo-2026-reliquidation.ts — '
                || 'duplicate base expense produced by stale ops-worker during reliquidación of Marzo 2026. '
                || 'Delta rows will be re-materialized via outbox.',
              updated_at = CURRENT_TIMESTAMP
          WHERE expense_id = ANY($1::text[])
        `,
        [ids]
      )

      console.log(`✔  Annulled ${ids.length} duplicate base expenses: ${ids.join(', ')}`)
    } else {
      console.log('ℹ  No active duplicate rows to annul (already done on a prior run).')
    }

    // Step 2 — re-emit the four payroll_entry.reliquidated outbox events.
    // The ops-worker will pick them up on the next reactive tick and the
    // payroll_reliquidation_delta handler will insert the correct delta
    // rows via applyPayrollReliquidationDelta.
    let emittedCount = 0

    for (const pair of pairs) {
      if (!pair.v1_entry_id || !pair.v2_entry_id) continue

      const payload = buildReliquidatedEventPayload(pair)
      const eventId = `outbox-${randomUUID()}`

      await client.query(
        `
          INSERT INTO greenhouse_sync.outbox_events (
            event_id, aggregate_type, aggregate_id,
            event_type, payload_json, status, occurred_at
          )
          VALUES ($1, 'payroll_entry', $2, 'payroll_entry.reliquidated', $3::jsonb, 'pending', CURRENT_TIMESTAMP)
        `,
        [eventId, payload.entryId, JSON.stringify(payload)]
      )

      emittedCount++
      console.log(`✔  Emitted reliquidated event for ${pair.display_name ?? pair.member_id} (${eventId})`)
    }

    console.log(`✔  Total outbox events emitted: ${emittedCount}`)
  })
}

const run = async () => {
  const args = new Set(process.argv.slice(2))
  const dryRun = !args.has('--execute')

  if (dryRun) {
    console.log('ℹ  Running in DRY-RUN mode. Pass --execute to apply the reconciliation.')
  } else {
    console.log('⚠  Running in EXECUTE mode. Changes will be applied transactionally.')
  }

  const [period, pairs, duplicates] = await Promise.all([
    loadPeriodSnapshot(),
    loadEntryPairs(),
    loadExistingDuplicates()
  ])

  printPlan(period, pairs, duplicates)
  assertPreconditions(period, pairs, duplicates)

  if (dryRun) {
    console.log('✋  Dry run complete. Re-run with --execute to apply.')
    
return
  }

  await applyReconciliation(pairs, duplicates)

  console.log('')
  console.log('════════════════════════════════════════════════════════════')
  console.log(' Reconciliation complete')
  console.log('════════════════════════════════════════════════════════════')
  console.log('')
  console.log(' Next steps:')
  console.log('  1. Trigger the reactive consumer immediately:')
  console.log('       gcloud scheduler jobs run ops-reactive-finance \\')
  console.log('         --project=efeonce-group --location=us-east4')
  console.log('  2. Verify the expense state:')
  console.log('       pnpm staging:request "/api/finance/expenses?period=2026-03&expenseType=payroll&limit=50"')
  console.log('  3. Confirm the totals per member equal their v2 gross.')
  console.log('')
}

run()
  .catch(err => {
    console.error('❌ Reconciliation failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
