import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { FxSnapshotEvidence } from './fx-snapshot'

// TASK-990 — persist an FX snapshot (rate + provenance + policy) to
// greenhouse_finance.fx_snapshots and return its id. The snapshot is the
// immutable evidence a money row links to (native_to_functional /
// functional_to_reporting). Pure-evidence → row mapping; the table's
// anti-mutation trigger (Slice 2) protects it after insert.

type QueryableClient = {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

/**
 * Insert an FX snapshot row from evidence and return the generated snapshot_id.
 * Accepts an optional transactional client so the snapshot is written in the
 * same tx as the money row that links to it.
 */
export const persistFxSnapshot = async (
  evidence: FxSnapshotEvidence,
  client?: QueryableClient
): Promise<string> => {
  const snapshotId = `fxs-${randomUUID()}`

  const sql = `
    INSERT INTO greenhouse_finance.fx_snapshots (
      snapshot_id, from_currency, to_currency, rate, inverse_rate,
      rate_date, rate_date_resolved, source, composed_via, policy,
      locked_by, manual_override_reason
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12
    )`

  const values = [
    snapshotId,
    evidence.fromCurrency,
    evidence.toCurrency,
    evidence.rate,
    evidence.inverseRate,
    evidence.rateDate,
    evidence.rateDateResolved,
    evidence.source,
    evidence.composedVia,
    evidence.policy,
    evidence.lockedBy,
    evidence.manualOverrideReason
  ]

  if (client) {
    await client.query(sql, values)
  } else {
    await runGreenhousePostgresQuery(sql, values)
  }

  return snapshotId
}
