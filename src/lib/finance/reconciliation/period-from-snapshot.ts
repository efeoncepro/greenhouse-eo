import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveCanonicalReconciliationOpeningBalance } from '@/lib/finance/postgres-reconciliation'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { buildDeterministicPeriodId } from './full-context'

/**
 * TASK-722 — Create or link a reconciliation period from a snapshot declared in
 * `/finance/bank`.
 *
 * Flujo:
 * 1. Read snapshot → derive (account_id, year, month) from snapshot_at
 * 2. If snapshot already has reconciliation_period_id → return alreadyLinked=true (idempotent)
 * 3. Build deterministic period_id = `${accountId}_${year}_${MM}`
 * 4. INSERT period if not exists (using DB UNIQUE constraint TASK-722 as
 *    safety net + period_id existence check as fast path)
 * 5. UPDATE snapshot.reconciliation_period_id atomically in same tx
 * 6. Publish outbox event finance.reconciliation_period.created_from_snapshot
 *
 * GUARANTEES
 * ──────────
 * - Idempotent: re-llamar con mismo snapshotId no duplica nada.
 * - Atomic: si UPDATE snapshot falla, INSERT period rolls back.
 * - Race-safe: UNIQUE (account_id, year, month) constraint detecta concurrency.
 * - No re-link: si snapshot YA tiene period linked y el operador lo invoca
 *   nuevamente, se detecta y se devuelve { alreadyLinked: true } sin tocar DB.
 */

export interface CreatePeriodFromSnapshotInput {
  snapshotId: string
  actorUserId: string | null
  /**
   * Optional opening balance override. If null/undefined and the period doesn't
   * exist yet, the helper uses the canonical account_balances closing from the
   * day before the period starts. Snapshot `pg_closing_balance` is drift audit
   * evidence, not an accounting opening source. For an existing period,
   * opening_balance is NOT modified.
   */
  openingBalance?: number | null
  /** Optional notes for the period creation. */
  notes?: string | null
}

export interface CreatePeriodFromSnapshotResult {
  periodId: string
  accountId: string
  year: number
  month: number
  /** True if the period was created in this call. False if it already existed. */
  created: boolean
  /** True if the snapshot was already linked to this period before this call. */
  alreadyLinked: boolean
  /** True if the snapshot's reconciliation_period_id was updated in this call. */
  snapshotUpdated: boolean
  /** Convenience: URL to navigate to the workbench. */
  periodUrl: string
}

const buildPeriodNotes = (snapshotId: string, notes: string | null | undefined): string => {
  const base = `Periodo creado desde snapshot ${snapshotId} (TASK-722).`

  return notes && notes.trim().length > 0 ? `${base} ${notes.trim()}` : base
}

/**
 * Creates the period if it doesn't exist (idempotent), then atomically links
 * the snapshot to it. Returns metadata describing what happened.
 */
export const createOrLinkPeriodFromSnapshot = async (
  input: CreatePeriodFromSnapshotInput
): Promise<CreatePeriodFromSnapshotResult> => {
  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    // 1. Lock + read snapshot.
    const snapshotRows = await client.query<{
      snapshot_id: string
      account_id: string
      snapshot_at: Date
      pg_closing_balance: string
      reconciliation_period_id: string | null
    }>(
      `SELECT
         snapshot_id, account_id,
         snapshot_at,
         pg_closing_balance::text,
         reconciliation_period_id
       FROM greenhouse_finance.account_reconciliation_snapshots
       WHERE snapshot_id = $1
       FOR UPDATE`,
      [input.snapshotId]
    )

    if (snapshotRows.rows.length === 0) {
      throw new Error(`Snapshot ${input.snapshotId} not found`)
    }

    const snapshot = snapshotRows.rows[0]

    const snapshotAt = snapshot.snapshot_at instanceof Date
      ? snapshot.snapshot_at
      : new Date(snapshot.snapshot_at as unknown as string)

    const year = snapshotAt.getUTCFullYear()
    const month = snapshotAt.getUTCMonth() + 1

    const targetPeriodId = buildDeterministicPeriodId(snapshot.account_id, year, month)

    // 2. Already-linked short-circuit.
    if (snapshot.reconciliation_period_id) {
      return {
        periodId: snapshot.reconciliation_period_id,
        accountId: snapshot.account_id,
        year,
        month,
        created: false,
        alreadyLinked: true,
        snapshotUpdated: false,
        periodUrl: `/finance/reconciliation/${encodeURIComponent(snapshot.reconciliation_period_id)}`
      }
    }

    // 3. Check if period exists (by deterministic ID).
    const existingPeriod = await client.query<{ period_id: string }>(
      `SELECT period_id FROM greenhouse_finance.reconciliation_periods
       WHERE account_id = $1 AND year = $2 AND month = $3
       FOR UPDATE`,
      [snapshot.account_id, year, month]
    )

    let created = false

    if (existingPeriod.rows.length === 0) {
      // 4. Period doesn't exist — create it.
      // Read account snapshot fields for instrument/provider/currency.
      const acctRows = await client.query<{
        instrument_category: string | null
        provider_slug: string | null
        bank_name: string | null
        currency: string | null
      }>(
        `SELECT instrument_category, provider_slug, bank_name, currency
         FROM greenhouse_finance.accounts
         WHERE account_id = $1
         LIMIT 1`,
        [snapshot.account_id]
      )

      if (acctRows.rows.length === 0) {
        throw new Error(`Account ${snapshot.account_id} not found`)
      }

      const account = acctRows.rows[0]

      const opening = input.openingBalance != null
        ? input.openingBalance
        : await resolveCanonicalReconciliationOpeningBalance({
            accountId: snapshot.account_id,
            year,
            month,
            client
          })

      await client.query(
        `INSERT INTO greenhouse_finance.reconciliation_periods (
           period_id, account_id, year, month, opening_balance,
           status, statement_imported, statement_row_count,
           notes, instrument_category_snapshot, provider_slug_snapshot, provider_name_snapshot,
           period_currency_snapshot, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'open', FALSE, 0, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          targetPeriodId,
          snapshot.account_id,
          year,
          month,
          opening,
          buildPeriodNotes(input.snapshotId, input.notes),
          account.instrument_category,
          account.provider_slug,
          account.bank_name,
          account.currency
        ]
      )
      created = true
    }

    // 5. Link snapshot to period atomically.
    await client.query(
      `UPDATE greenhouse_finance.account_reconciliation_snapshots
       SET reconciliation_period_id = $2
       WHERE snapshot_id = $1
         AND reconciliation_period_id IS NULL`,
      [input.snapshotId, targetPeriodId]
    )

    // 6. Outbox event.
    await publishOutboxEvent(
      {
        aggregateType: 'finance.reconciliation_period',
        aggregateId: targetPeriodId,
        eventType: 'finance.reconciliation_period.created_from_snapshot',
        payload: {
          periodId: targetPeriodId,
          accountId: snapshot.account_id,
          year,
          month,
          snapshotId: input.snapshotId,
          actorUserId: input.actorUserId,
          created
        }
      },
      client
    )

    return {
      periodId: targetPeriodId,
      accountId: snapshot.account_id,
      year,
      month,
      created,
      alreadyLinked: false,
      snapshotUpdated: true,
      periodUrl: `/finance/reconciliation/${encodeURIComponent(targetPeriodId)}`
    }
  })
}

/**
 * Read-only: returns the period_id linked to a snapshot if any.
 */
export const getLinkedPeriodIdForSnapshot = async (
  snapshotId: string
): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ reconciliation_period_id: string | null }>(
    `SELECT reconciliation_period_id
     FROM greenhouse_finance.account_reconciliation_snapshots
     WHERE snapshot_id = $1
     LIMIT 1`,
    [snapshotId]
  )

  return rows[0]?.reconciliation_period_id ?? null
}
