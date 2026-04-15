/*
 * scripts/fix-valentina-delta-row.ts
 *
 * Follow-up one-time script for TASK-409 hotfix 2026-04-15.
 *
 * Context:
 *   When the Marzo 2026 reliquidación was first reconciled earlier today
 *   (reconcile-marzo-2026-reliquidation.ts), the reactive consumer that
 *   processed the re-emitted `payroll_entry.reliquidated` events was still
 *   running the pre-fix version of `apply-payroll-reliquidation-delta.ts`.
 *   That version used `deltaGross` to compute the signed amount. For USD
 *   Deel contracts gross == net so Andrés, Daniela and Melkin ended up
 *   with correct delta rows. For Chile contracts (Valentina Hoyos), gross
 *   (CLP 823) differs from net (CLP 56.95) because of worker-side
 *   deductions (AFP, salud, impuesto). The Valentina delta row was
 *   written with CLP 822.50 — gross — leaving Finance 765.55 pesos over
 *   the correct net total.
 *
 *   After the code fix (commit 416b4cc9) and ops-worker redeploy, the
 *   consumer now consumes `deltaNet`. This script annuls the incorrect
 *   Valentina delta row and re-emits her reliquidación event with a
 *   fresh event_id so the redeployed consumer can materialize the
 *   correct 56.95 CLP delta row.
 *
 * Idempotency:
 *   - Annulling an already-annulled row is a no-op (the script logs but
 *     does not error).
 *   - Re-emitting with a fresh event_id is always safe because the
 *     reactive consumer keys idempotency on (event_id, handler).
 *
 * Usage:
 *   set -a; source .env.local; set +a
 *   npx tsx -r tsconfig-paths/register scripts/fix-valentina-delta-row.ts [--execute]
 */

import { randomUUID } from 'node:crypto'

import { closeGreenhousePostgres, query, withTransaction } from '@/lib/db'

const PERIOD_ID = '2026-03'
const MEMBER_ID = 'valentina-hoyos'

interface WrongDeltaRow extends Record<string, unknown> {
  expense_id: string
  total_amount: string | number
  currency: string
  is_annulled: boolean
  notes: string | null
}

interface V2Row extends Record<string, unknown> {
  entry_id: string
  gross_total: string | number
  net_total: string | number
  currency: string
  reopen_audit_id: string | null
}

interface V1Row extends Record<string, unknown> {
  entry_id: string
  gross_total: string | number
  net_total: string | number
}

interface AuditRow extends Record<string, unknown> {
  reason: string
}

const parseNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const loadWrongDeltaRow = async (): Promise<WrongDeltaRow | null> => {
  const rows = await query<WrongDeltaRow>(
    `
      SELECT expense_id, total_amount, currency, is_annulled, notes
      FROM greenhouse_finance.expenses
      WHERE payroll_period_id = $1
        AND member_id = $2
        AND source_type = 'payroll_reliquidation'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [PERIOD_ID, MEMBER_ID]
  )

  return rows[0] ?? null
}

const loadActiveEntry = async (): Promise<V2Row | null> => {
  const rows = await query<V2Row>(
    `
      SELECT entry_id, gross_total, net_total, currency, reopen_audit_id
      FROM greenhouse_payroll.payroll_entries
      WHERE period_id = $1
        AND member_id = $2
        AND is_active = TRUE
      LIMIT 1
    `,
    [PERIOD_ID, MEMBER_ID]
  )

  return rows[0] ?? null
}

const loadV1Entry = async (supersededBy: string): Promise<V1Row | null> => {
  const rows = await query<V1Row>(
    `
      SELECT entry_id, gross_total, net_total
      FROM greenhouse_payroll.payroll_entries
      WHERE period_id = $1
        AND member_id = $2
        AND superseded_by = $3
      LIMIT 1
    `,
    [PERIOD_ID, MEMBER_ID, supersededBy]
  )

  return rows[0] ?? null
}

const loadAuditReason = async (auditId: string): Promise<string> => {
  const rows = await query<AuditRow>(
    `
      SELECT reason
      FROM greenhouse_payroll.payroll_period_reopen_audit
      WHERE audit_id = $1
      LIMIT 1
    `,
    [auditId]
  )

  return rows[0]?.reason ?? 'otro'
}

const run = async () => {
  const execute = process.argv.includes('--execute')

  if (!execute) {
    console.log('ℹ  Running in DRY-RUN mode. Pass --execute to apply.')
  }

  const wrongRow = await loadWrongDeltaRow()

  if (!wrongRow) {
    console.log('ℹ  No payroll_reliquidation delta row found for Valentina on Marzo 2026.')
    console.log('   Either the reconciliation was never run or the row was already removed.')

    return
  }

  const v2 = await loadActiveEntry()

  if (!v2) {
    throw new Error('No active v2 entry found for Valentina — cannot rebuild event payload.')
  }

  if (!v2.reopen_audit_id) {
    throw new Error(
      'Active v2 entry has no reopen_audit_id — not a valid supersede target.'
    )
  }

  const v1 = await loadV1Entry(v2.entry_id)

  if (!v1) {
    throw new Error(`No superseded v1 entry found pointing to v2 ${v2.entry_id}.`)
  }

  const reason = await loadAuditReason(v2.reopen_audit_id)

  const previousGross = parseNumber(v1.gross_total)
  const previousNet = parseNumber(v1.net_total)
  const newGross = parseNumber(v2.gross_total)
  const newNet = parseNumber(v2.net_total)
  const deltaGross = newGross - previousGross
  const deltaNet = newNet - previousNet

  const wrongAmount = parseNumber(wrongRow.total_amount)
  const expectedAmountBug = deltaGross
  const expectedAmountFix = deltaNet

  console.log('')
  console.log('════════════════════════════════════════════════════════════')
  console.log(' Valentina Hoyos — Marzo 2026 delta row fix')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`  Wrong delta row:        ${wrongRow.expense_id}`)
  console.log(`  Wrong amount (stored):  CLP ${wrongAmount}`)
  console.log(`  Wrong amount (expected by stale code): CLP ${expectedAmountBug}`)
  console.log(`  Correct amount (net):   CLP ${expectedAmountFix}`)
  console.log(`  Already annulled:       ${wrongRow.is_annulled}`)
  console.log('')
  console.log(' v1 (superseded):')
  console.log(`    entry_id:   ${v1.entry_id}`)
  console.log(`    gross:      CLP ${previousGross}`)
  console.log(`    net:        CLP ${previousNet}`)
  console.log('')
  console.log(' v2 (active):')
  console.log(`    entry_id:         ${v2.entry_id}`)
  console.log(`    gross:            CLP ${newGross}`)
  console.log(`    net:              CLP ${newNet}`)
  console.log(`    reopen_audit_id:  ${v2.reopen_audit_id}`)
  console.log(`    reason:           ${reason}`)
  console.log('')
  console.log(' Plan:')
  console.log(`    1. Annul ${wrongRow.expense_id} (already annulled? ${wrongRow.is_annulled})`)
  console.log('    2. INSERT outbox event payroll_entry.reliquidated with correct net values')
  console.log('    3. Trigger ops-reactive-finance to process')
  console.log('')
  console.log('════════════════════════════════════════════════════════════')

  if (!execute) {
    console.log('✋  Dry run. Re-run with --execute to apply.')

    return
  }

  await withTransaction(async client => {
    // Step 1 — annul the wrong delta row (idempotent).
    if (!wrongRow.is_annulled) {
      await client.query(
        `
          UPDATE greenhouse_finance.expenses
          SET is_annulled = TRUE,
              payment_status = 'written_off',
              notes = COALESCE(notes, '')
                || ' | ANNULLED 2026-04-15 by fix-valentina-delta-row.ts — '
                || 'wrong amount produced by stale ops-worker using deltaGross (CLP '
                || $2
                || ') instead of deltaNet (CLP '
                || $3
                || '). Replacement delta row will be produced by re-emitted event.',
              updated_at = CURRENT_TIMESTAMP
          WHERE expense_id = $1
        `,
        [wrongRow.expense_id, String(wrongAmount), String(expectedAmountFix)]
      )

      console.log(`✔  Annulled ${wrongRow.expense_id}`)
    } else {
      console.log(`ℹ  ${wrongRow.expense_id} already annulled — skipping step 1.`)
    }

    // Step 2 — re-emit the payroll_entry.reliquidated event with a fresh
    // event_id. The reactive consumer keys idempotency on
    // (event_id, handler), so a fresh ID guarantees the handler will run.
    const eventId = `outbox-${randomUUID()}`
    const payload = {
      entryId: v2.entry_id,
      periodId: PERIOD_ID,
      operationalYear: 2026,
      operationalMonth: 3,
      memberId: MEMBER_ID,
      version: 2,
      previousVersion: 1,
      previousEntryId: v1.entry_id,
      previousGrossTotal: previousGross,
      previousNetTotal: previousNet,
      newGrossTotal: newGross,
      newNetTotal: newNet,
      deltaGross,
      deltaNet,
      currency: v2.currency,
      reopenAuditId: v2.reopen_audit_id,
      reason,
      _reconciledBy: 'scripts/fix-valentina-delta-row.ts',
      _reconciledAt: new Date().toISOString()
    }

    await client.query(
      `
        INSERT INTO greenhouse_sync.outbox_events (
          event_id, aggregate_type, aggregate_id,
          event_type, payload_json, status, occurred_at
        )
        VALUES ($1, 'payroll_entry', $2, 'payroll_entry.reliquidated', $3::jsonb, 'pending', CURRENT_TIMESTAMP)
      `,
      [eventId, v2.entry_id, JSON.stringify(payload)]
    )

    console.log(`✔  Re-emitted payroll_entry.reliquidated (${eventId}) with deltaNet=${deltaNet}`)
  })

  console.log('')
  console.log(' Next step:')
  console.log('   gcloud scheduler jobs run ops-reactive-finance \\')
  console.log('     --project=efeonce-group --location=us-east4')
}

run()
  .catch(err => {
    console.error('❌ Valentina fix failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
