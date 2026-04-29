import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { attachAssetToAggregate, getAssetById } from '@/lib/storage/greenhouse-assets'

/**
 * TASK-704 — Account Reconciliation Snapshots.
 *
 * Cada cuenta puede tener múltiples snapshots a lo largo del tiempo. Un
 * snapshot declara: "según el banco al timestamp T, la cuenta tenía X". El
 * sistema computa el drift contra el closing PG en ese momento y persiste
 * todo como audit trail. UI muestra badge "Por conciliar $X" cuando hay
 * snapshot abierto.
 *
 * Aplica a TC, bancos, fintech, CCA, futuras wallets — mismo modelo, mismo
 * helper. No hay branching por account_kind ni instrument_category.
 */

export type DriftStatus = 'open' | 'accepted' | 'reconciled'

export type ReconciliationSourceKind =
  | 'cartola_xlsx'
  | 'officebanking_screenshot'
  | 'statement_pdf'
  | 'manual_declaration'
  | 'api_webhook'

export interface DeclareReconciliationSnapshotInput {
  accountId: string
  snapshotAt: string
  bankClosingBalance: number
  bankAvailableBalance?: number | null
  bankHoldsAmount?: number | null
  bankCreditLimit?: number | null
  driftStatus?: DriftStatus
  driftExplanation?: string | null
  sourceKind: ReconciliationSourceKind
  sourceEvidenceRef?: string | null
  /**
   * TASK-721 — FK a greenhouse_core.assets. Si presente, la transacción
   * atómicamente attache-a el asset al snapshot (status pending → attached,
   * owner_aggregate_id = snapshotId, owner_aggregate_type =
   * finance_reconciliation_evidence). Reemplaza sourceEvidenceRef text-libre.
   */
  evidenceAssetId?: string | null
  declaredByUserId?: string | null
}

export interface ReconciliationSnapshotRecord {
  snapshotId: string
  accountId: string
  snapshotAt: string
  bankClosingBalance: number
  bankAvailableBalance: number | null
  bankHoldsAmount: number | null
  bankCreditLimit: number | null
  pgClosingBalance: number
  driftAmount: number
  driftStatus: DriftStatus
  driftExplanation: string | null
  sourceKind: ReconciliationSourceKind
  sourceEvidenceRef: string | null
  /** TASK-721 — FK a greenhouse_core.assets, null para snapshots legacy o sin evidence. */
  evidenceAssetId: string | null
  declaredByUserId: string | null
  createdAt: string
  resolvedAt: string | null
  resolvedByUserId: string | null
  resolvedReason: string | null
}

export interface ReconciliationDriftSummary {
  hasOpenDrift: boolean
  latestSnapshot: ReconciliationSnapshotRecord | null
  driftAmount: number
  driftStatus: DriftStatus | null
  driftAgeMinutes: number | null
}

interface SnapshotRowDb extends Record<string, unknown> {
  snapshot_id: string
  account_id: string
  snapshot_at: Date | string
  bank_closing_balance: string
  bank_available_balance: string | null
  bank_holds_amount: string | null
  bank_credit_limit: string | null
  pg_closing_balance: string
  drift_amount: string
  drift_status: DriftStatus
  drift_explanation: string | null
  source_kind: ReconciliationSourceKind
  source_evidence_ref: string | null
  evidence_asset_id: string | null
  declared_by_user_id: string | null
  created_at: Date | string
  resolved_at: Date | string | null
  resolved_by_user_id: string | null
  resolved_reason: string | null
}

const toIso = (v: Date | string): string =>
  typeof v === 'string' ? new Date(v).toISOString() : v.toISOString()

const toIsoOrNull = (v: Date | string | null): string | null =>
  v == null ? null : toIso(v)

const mapRow = (row: SnapshotRowDb): ReconciliationSnapshotRecord => ({
  snapshotId: row.snapshot_id,
  accountId: row.account_id,
  snapshotAt: toIso(row.snapshot_at),
  bankClosingBalance: Number(row.bank_closing_balance),
  bankAvailableBalance: row.bank_available_balance == null ? null : Number(row.bank_available_balance),
  bankHoldsAmount: row.bank_holds_amount == null ? null : Number(row.bank_holds_amount),
  bankCreditLimit: row.bank_credit_limit == null ? null : Number(row.bank_credit_limit),
  pgClosingBalance: Number(row.pg_closing_balance),
  driftAmount: Number(row.drift_amount),
  driftStatus: row.drift_status,
  driftExplanation: row.drift_explanation,
  sourceKind: row.source_kind,
  sourceEvidenceRef: row.source_evidence_ref,
  evidenceAssetId: row.evidence_asset_id,
  declaredByUserId: row.declared_by_user_id,
  createdAt: toIso(row.created_at),
  resolvedAt: toIsoOrNull(row.resolved_at),
  resolvedByUserId: row.resolved_by_user_id,
  resolvedReason: row.resolved_reason
})

const buildSnapshotId = (accountId: string, snapshotAt: string): string =>
  `recon-${accountId.slice(0, 28)}-${snapshotAt.slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8)}`

export const declareReconciliationSnapshot = async (
  input: DeclareReconciliationSnapshotInput
): Promise<ReconciliationSnapshotRecord> => {
  const reason = (input.driftExplanation ?? '').trim() || null
  const evidenceAssetId = input.evidenceAssetId?.trim() || null

  // TASK-721 — Pre-flight: si trae evidenceAssetId, validar que el asset existe
  // y está en estado pending (todavía no attached a otro aggregate). Esto evita
  // attach race conditions y deja el error fuera de la transacción crítica.
  if (evidenceAssetId) {
    const asset = await getAssetById(evidenceAssetId)

    if (!asset) {
      throw new Error(`Evidence asset ${evidenceAssetId} not found`)
    }

    if (asset.status === 'deleted') {
      throw new Error(`Evidence asset ${evidenceAssetId} is deleted and cannot be attached`)
    }

    if (asset.ownerAggregateType !== 'finance_reconciliation_evidence_draft' && asset.ownerAggregateType !== 'finance_reconciliation_evidence') {
      throw new Error(`Evidence asset ${evidenceAssetId} has wrong context: ${asset.ownerAggregateType}`)
    }
  }

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    // 1. Verify account exists.
    const acct = await client.query<{ account_id: string }>(
      `SELECT account_id FROM greenhouse_finance.accounts WHERE account_id = $1`,
      [input.accountId]
    )

    if (acct.rows.length === 0) {
      throw new Error(`Account ${input.accountId} not found`)
    }

    // 2. Read PG closing at snapshot date. Use the most recent
    //    account_balances row at or before snapshot_at::date.
    const pgRow = await client.query<{ closing_balance: string | null }>(
      `SELECT closing_balance::text
       FROM greenhouse_finance.account_balances
       WHERE account_id = $1
         AND balance_date <= ($2::timestamptz)::date
       ORDER BY balance_date DESC
       LIMIT 1`,
      [input.accountId, input.snapshotAt]
    )

    const pgClosing = pgRow.rows[0]?.closing_balance == null ? 0 : Number(pgRow.rows[0].closing_balance)
    const drift = Math.round((pgClosing - input.bankClosingBalance) * 100) / 100

    const driftStatus: DriftStatus = input.driftStatus
      ?? (Math.abs(drift) < 0.01 ? 'reconciled' : 'open')

    const snapshotId = buildSnapshotId(input.accountId, input.snapshotAt)

    const r = await client.query<SnapshotRowDb>(
      `INSERT INTO greenhouse_finance.account_reconciliation_snapshots (
         snapshot_id, account_id, snapshot_at,
         bank_closing_balance, bank_available_balance, bank_holds_amount, bank_credit_limit,
         pg_closing_balance, drift_amount, drift_status, drift_explanation,
         source_kind, source_evidence_ref, evidence_asset_id, declared_by_user_id, created_at
       ) VALUES (
         $1, $2, $3::timestamptz,
         $4, $5, $6, $7,
         $8, $9, $10, $11,
         $12, $13, $14, $15, NOW()
       )
       RETURNING *`,
      [
        snapshotId, input.accountId, input.snapshotAt,
        input.bankClosingBalance, input.bankAvailableBalance ?? null, input.bankHoldsAmount ?? null, input.bankCreditLimit ?? null,
        pgClosing, drift, driftStatus, reason,
        input.sourceKind, input.sourceEvidenceRef ?? null, evidenceAssetId, input.declaredByUserId ?? null
      ]
    )

    // TASK-721 — Si traemos evidence asset, attach atómicamente al snapshot.
    // Compartimos la transacción para que rollback de cualquier paso revierta
    // el attach + insert juntos.
    if (evidenceAssetId) {
      await attachAssetToAggregate({
        assetId: evidenceAssetId,
        ownerAggregateType: 'finance_reconciliation_evidence',
        ownerAggregateId: snapshotId,
        actorUserId: input.declaredByUserId ?? 'system',
        client,
        metadata: {
          accountId: input.accountId,
          snapshotAt: input.snapshotAt,
          sourceKind: input.sourceKind
        }
      })
    }

    return mapRow(r.rows[0])
  })
}

export const getOpenDriftSummary = async (accountId: string): Promise<ReconciliationDriftSummary> => {
  const rows = await runGreenhousePostgresQuery<SnapshotRowDb>(
    `SELECT *
     FROM greenhouse_finance.account_reconciliation_snapshots
     WHERE account_id = $1
     ORDER BY snapshot_at DESC, created_at DESC
     LIMIT 1`,
    [accountId]
  )

  if (rows.length === 0) {
    return {
      hasOpenDrift: false,
      latestSnapshot: null,
      driftAmount: 0,
      driftStatus: null,
      driftAgeMinutes: null
    }
  }

  const latest = mapRow(rows[0])
  const ageMs = Date.now() - new Date(latest.snapshotAt).getTime()
  const ageMinutes = Math.max(0, Math.floor(ageMs / 60000))

  return {
    hasOpenDrift: latest.driftStatus !== 'reconciled' && Math.abs(latest.driftAmount) >= 0.01,
    latestSnapshot: latest,
    driftAmount: latest.driftAmount,
    driftStatus: latest.driftStatus,
    driftAgeMinutes: ageMinutes
  }
}

export const getOpenDriftSummariesForAccounts = async (
  accountIds: string[]
): Promise<Record<string, ReconciliationDriftSummary>> => {
  if (accountIds.length === 0) return {}

  const rows = await runGreenhousePostgresQuery<SnapshotRowDb>(
    `SELECT DISTINCT ON (account_id) *
     FROM greenhouse_finance.account_reconciliation_snapshots
     WHERE account_id = ANY($1::text[])
     ORDER BY account_id, snapshot_at DESC, created_at DESC`,
    [accountIds]
  )

  const result: Record<string, ReconciliationDriftSummary> = {}

  for (const accountId of accountIds) {
    result[accountId] = {
      hasOpenDrift: false,
      latestSnapshot: null,
      driftAmount: 0,
      driftStatus: null,
      driftAgeMinutes: null
    }
  }

  for (const row of rows) {
    const latest = mapRow(row)
    const ageMs = Date.now() - new Date(latest.snapshotAt).getTime()
    const ageMinutes = Math.max(0, Math.floor(ageMs / 60000))

    result[latest.accountId] = {
      hasOpenDrift: latest.driftStatus !== 'reconciled' && Math.abs(latest.driftAmount) >= 0.01,
      latestSnapshot: latest,
      driftAmount: latest.driftAmount,
      driftStatus: latest.driftStatus,
      driftAgeMinutes: ageMinutes
    }
  }

  return result
}

export const acceptDrift = async (
  snapshotId: string,
  reason: string,
  userId: string | null
): Promise<ReconciliationSnapshotRecord> => {
  const trimmed = reason.trim()

  if (trimmed.length < 10) {
    throw new Error('acceptDrift reason must be at least 10 characters explaining why the drift is legitimate.')
  }

  const r = await runGreenhousePostgresQuery<SnapshotRowDb>(
    `UPDATE greenhouse_finance.account_reconciliation_snapshots
     SET drift_status = 'accepted',
         resolved_at = NOW(),
         resolved_by_user_id = $1,
         resolved_reason = $2
     WHERE snapshot_id = $3
     RETURNING *`,
    [userId, trimmed, snapshotId]
  )

  if (r.length === 0) {
    throw new Error(`Snapshot ${snapshotId} not found`)
  }

  return mapRow(r[0])
}

export const reconcileSnapshot = async (
  snapshotId: string,
  reason: string,
  userId: string | null
): Promise<ReconciliationSnapshotRecord> => {
  const trimmed = reason.trim()

  if (trimmed.length < 10) {
    throw new Error('reconcileSnapshot reason must be at least 10 characters describing what closed the drift.')
  }

  const r = await runGreenhousePostgresQuery<SnapshotRowDb>(
    `UPDATE greenhouse_finance.account_reconciliation_snapshots
     SET drift_status = 'reconciled',
         resolved_at = NOW(),
         resolved_by_user_id = $1,
         resolved_reason = $2
     WHERE snapshot_id = $3
     RETURNING *`,
    [userId, trimmed, snapshotId]
  )

  if (r.length === 0) {
    throw new Error(`Snapshot ${snapshotId} not found`)
  }

  return mapRow(r[0])
}

export const listReconciliationHistory = async (
  accountId: string,
  limit = 20
): Promise<ReconciliationSnapshotRecord[]> => {
  const rows = await runGreenhousePostgresQuery<SnapshotRowDb>(
    `SELECT *
     FROM greenhouse_finance.account_reconciliation_snapshots
     WHERE account_id = $1
     ORDER BY snapshot_at DESC, created_at DESC
     LIMIT $2`,
    [accountId, limit]
  )

  return rows.map(mapRow)
}
