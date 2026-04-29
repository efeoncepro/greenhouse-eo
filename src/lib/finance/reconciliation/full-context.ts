import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-722 — Bank Reconciliation Synergy bridge contract.
 *
 * Single read-only helper que compone el estado completo de una conciliación
 * por (account, year, month): account + period + latest snapshot + drift +
 * evidence + statement metrics + nextAction. Reemplaza la composición manual
 * que `ReconciliationView`, `ReconciliationDetailView` y `BankView` hacían
 * por separado para obtener el mismo cuadro.
 *
 * REGLAS DURAS
 * ────────────
 * - **Read-only**. No muta nada. Toda mutación va por endpoints dedicados
 *   (`createPeriodFromSnapshot`, `match`, `import`, etc.).
 * - **No reaggrega KPIs de Banco**. Esos vienen del policy-driven
 *   `aggregateBankKpis` (TASK-720). Aquí solo composición de read models
 *   ya canónicos.
 * - **Snapshots NO se borran**. `evidence_asset_id` puede quedar null si el
 *   asset fue deleted (FK ON DELETE SET NULL); el detector
 *   `task721.reconciliationSnapshotsWithBrokenEvidence` flag-ea el caso.
 * - **`nextAction` es derivado, no persistido**. Si la lógica cambia en el
 *   futuro (e.g. requiere confirmación humana adicional), se cambia aquí
 *   sin migration.
 */

export type ReconciliationNextAction =
  | 'declare_snapshot'      // Account active, no snapshot in scope
  | 'create_period'         // Snapshot exists, no period linked yet
  | 'import_statement'      // Period open, no statement imported
  | 'resolve_matches'       // Statement imported, has unmatched rows
  | 'mark_reconciled'       // All rows matched, diff zero, can mark reconciled
  | 'close_period'          // Period reconciled, can be closed
  | 'closed'                // Terminal state — period already closed
  | 'archived'              // Period archived (TASK-715 test_period or similar)

export interface ReconciliationFullContext {
  account: {
    accountId: string
    accountName: string
    currency: string
    instrumentCategory: string | null
    accountKind: 'asset' | 'liability'
  }
  period: {
    periodId: string
    year: number
    month: number
    status: string
    openingBalance: number
    closingBalanceBank: number | null
    closingBalanceSystem: number | null
    difference: number | null
    statementImported: boolean
    statementRowCount: number
    archivedAt: string | null
    archiveKind: string | null
  } | null
  latestSnapshot: {
    snapshotId: string
    snapshotAt: string
    bankClosingBalance: number
    pgClosingBalance: number
    driftAmount: number
    driftStatus: 'open' | 'accepted' | 'reconciled'
    driftExplanation: string | null
    sourceKind: string
    sourceEvidenceRef: string | null
    evidenceAssetId: string | null
    reconciliationPeriodId: string | null
    declaredByUserId: string | null
    createdAt: string
  } | null
  evidenceAsset: {
    assetId: string
    publicId: string
    filename: string
    mimeType: string
    sizeBytes: number
    downloadUrl: string
    contentHash: string | null
    uploadedAt: string | null
    status: string
  } | null
  statementRows: {
    total: number
    matched: number
    suggested: number
    excluded: number
    unmatched: number
  }
  difference: number | null
  nextAction: ReconciliationNextAction
}

const buildPeriodId = (accountId: string, year: number, month: number): string =>
  `${accountId}_${year}_${String(month).padStart(2, '0')}`

type RawAccountRow = {
  account_id: string
  account_name: string
  currency: string
  instrument_category: string | null
  account_kind: string | null
} & Record<string, unknown>

type RawPeriodRow = {
  period_id: string
  year: number
  month: number
  status: string
  opening_balance: string | null
  closing_balance_bank: string | null
  closing_balance_system: string | null
  difference: string | null
  statement_imported: boolean
  statement_row_count: number | null
  archived_at: string | null
  archive_kind: string | null
} & Record<string, unknown>

type RawSnapshotRow = {
  snapshot_id: string
  snapshot_at: string
  bank_closing_balance: string
  pg_closing_balance: string
  drift_amount: string
  drift_status: 'open' | 'accepted' | 'reconciled'
  drift_explanation: string | null
  source_kind: string
  source_evidence_ref: string | null
  evidence_asset_id: string | null
  reconciliation_period_id: string | null
  declared_by_user_id: string | null
  created_at: string
} & Record<string, unknown>

type RawAssetRow = {
  asset_id: string
  public_id: string
  filename: string
  mime_type: string
  size_bytes: string | number
  content_hash: string | null
  uploaded_at: string | null
  status: string
} & Record<string, unknown>

type RawStatementCountsRow = {
  total: string | number
  matched: string | number
  suggested: string | number
  excluded: string | number
  unmatched: string | number
} & Record<string, unknown>

const toNum = (v: string | number | null | undefined): number => {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : Number(v)

  return Number.isFinite(n) ? n : 0
}

const fetchAccount = async (accountId: string): Promise<RawAccountRow | null> => {
  const rows = await runGreenhousePostgresQuery<RawAccountRow>(
    `SELECT account_id, account_name, currency, instrument_category, account_kind
     FROM greenhouse_finance.accounts
     WHERE account_id = $1
     LIMIT 1`,
    [accountId]
  )

  return rows[0] ?? null
}

const fetchPeriod = async (
  accountId: string,
  year: number,
  month: number
): Promise<RawPeriodRow | null> => {
  const rows = await runGreenhousePostgresQuery<RawPeriodRow>(
    `SELECT
       period_id, year, month, status,
       opening_balance::text, closing_balance_bank::text, closing_balance_system::text, difference::text,
       statement_imported, statement_row_count,
       archived_at::text, archive_kind
     FROM greenhouse_finance.reconciliation_periods
     WHERE account_id = $1 AND year = $2 AND month = $3
     LIMIT 1`,
    [accountId, year, month]
  )

  return rows[0] ?? null
}

const fetchPeriodById = async (periodId: string): Promise<{
  period: RawPeriodRow
  accountId: string
} | null> => {
  const rows = await runGreenhousePostgresQuery<RawPeriodRow & { account_id: string }>(
    `SELECT
       period_id, account_id, year, month, status,
       opening_balance::text, closing_balance_bank::text, closing_balance_system::text, difference::text,
       statement_imported, statement_row_count,
       archived_at::text, archive_kind
     FROM greenhouse_finance.reconciliation_periods
     WHERE period_id = $1
     LIMIT 1`,
    [periodId]
  )

  if (!rows[0]) return null

  return { period: rows[0], accountId: rows[0].account_id }
}

/**
 * Latest snapshot for the account whose `snapshot_at` falls in the
 * (year, month) window. Excludes nothing (no superseded model on snapshots).
 */
const fetchLatestSnapshot = async (
  accountId: string,
  year: number,
  month: number
): Promise<RawSnapshotRow | null> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`

  const rows = await runGreenhousePostgresQuery<RawSnapshotRow>(
    `SELECT
       snapshot_id,
       snapshot_at::text AS snapshot_at,
       bank_closing_balance::text,
       pg_closing_balance::text,
       drift_amount::text,
       drift_status,
       drift_explanation,
       source_kind,
       source_evidence_ref,
       evidence_asset_id,
       reconciliation_period_id,
       declared_by_user_id,
       created_at::text AS created_at
     FROM greenhouse_finance.account_reconciliation_snapshots
     WHERE account_id = $1
       AND snapshot_at >= $2::date
       AND snapshot_at < ($2::date + INTERVAL '1 month')
     ORDER BY snapshot_at DESC, created_at DESC
     LIMIT 1`,
    [accountId, startDate]
  )

  return rows[0] ?? null
}

const fetchAsset = async (assetId: string): Promise<RawAssetRow | null> => {
  const rows = await runGreenhousePostgresQuery<RawAssetRow>(
    `SELECT
       asset_id, public_id, filename, mime_type, size_bytes::text,
       content_hash, uploaded_at::text, status
     FROM greenhouse_core.assets
     WHERE asset_id = $1
     LIMIT 1`,
    [assetId]
  )

  return rows[0] ?? null
}

const fetchStatementCounts = async (periodId: string): Promise<RawStatementCountsRow> => {
  const rows = await runGreenhousePostgresQuery<RawStatementCountsRow>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE match_status IN ('matched', 'auto_matched', 'manual_matched'))::text AS matched,
       COUNT(*) FILTER (WHERE match_status = 'suggested')::text AS suggested,
       COUNT(*) FILTER (WHERE match_status = 'excluded')::text AS excluded,
       COUNT(*) FILTER (WHERE match_status = 'unmatched' OR match_status IS NULL)::text AS unmatched
     FROM greenhouse_finance.bank_statement_rows
     WHERE period_id = $1`,
    [periodId]
  )

  return rows[0] ?? { total: 0, matched: 0, suggested: 0, excluded: 0, unmatched: 0 }
}

const computeNextAction = (
  period: RawPeriodRow | null,
  snapshot: RawSnapshotRow | null,
  counts: { total: number; unmatched: number; suggested: number },
  difference: number | null
): ReconciliationNextAction => {
  if (period?.archived_at) return 'archived'
  if (period?.status === 'closed') return 'closed'

  if (!snapshot && !period) return 'declare_snapshot'

  if (snapshot && !period) return 'create_period'

  if (period && !period.statement_imported) return 'import_statement'

  if (counts.unmatched > 0 || counts.suggested > 0) return 'resolve_matches'

  // All rows matched. Check difference.
  const diff = difference ?? 0

  if (Math.abs(diff) > 0.01) return 'resolve_matches'

  if (period?.status === 'reconciled') return 'close_period'

  return 'mark_reconciled'
}

/**
 * Returns the full reconciliation context for an account/period combo.
 *
 * Two query modes:
 * - By `periodId` — the period exists; everything else derived from it.
 * - By `(accountId, year, month)` — period may or may not exist; useful for
 *   "open this account/month from Banco" flow.
 */
export const getReconciliationFullContext = async (
  input:
    | { periodId: string }
    | { accountId: string; year: number; month: number }
): Promise<ReconciliationFullContext | null> => {
  let accountId: string
  let year: number
  let month: number
  let period: RawPeriodRow | null

  if ('periodId' in input) {
    const periodResult = await fetchPeriodById(input.periodId)

    if (!periodResult) return null
    accountId = periodResult.accountId
    period = periodResult.period
    year = periodResult.period.year
    month = periodResult.period.month
  } else {
    accountId = input.accountId
    year = input.year
    month = input.month
    period = await fetchPeriod(accountId, year, month)
  }

  const account = await fetchAccount(accountId)

  if (!account) return null

  const latestSnapshot = await fetchLatestSnapshot(accountId, year, month)

  const evidenceAsset = latestSnapshot?.evidence_asset_id
    ? await fetchAsset(latestSnapshot.evidence_asset_id)
    : null

  const counts = period
    ? await fetchStatementCounts(period.period_id)
    : { total: 0, matched: 0, suggested: 0, excluded: 0, unmatched: 0 }

  const total = toNum(counts.total)
  const matched = toNum(counts.matched)
  const suggested = toNum(counts.suggested)
  const excluded = toNum(counts.excluded)
  const unmatched = toNum(counts.unmatched)

  const difference = period?.difference != null ? toNum(period.difference) : null

  const nextAction = computeNextAction(
    period,
    latestSnapshot,
    { total, unmatched, suggested },
    difference
  )

  return {
    account: {
      accountId: account.account_id,
      accountName: account.account_name,
      currency: account.currency,
      instrumentCategory: account.instrument_category,
      accountKind: account.account_kind === 'liability' ? 'liability' : 'asset'
    },
    period: period
      ? {
          periodId: period.period_id,
          year: period.year,
          month: period.month,
          status: period.status,
          openingBalance: toNum(period.opening_balance),
          closingBalanceBank: period.closing_balance_bank != null ? toNum(period.closing_balance_bank) : null,
          closingBalanceSystem: period.closing_balance_system != null ? toNum(period.closing_balance_system) : null,
          difference,
          statementImported: Boolean(period.statement_imported),
          statementRowCount: toNum(period.statement_row_count),
          archivedAt: period.archived_at,
          archiveKind: period.archive_kind
        }
      : null,
    latestSnapshot: latestSnapshot
      ? {
          snapshotId: latestSnapshot.snapshot_id,
          snapshotAt: latestSnapshot.snapshot_at,
          bankClosingBalance: toNum(latestSnapshot.bank_closing_balance),
          pgClosingBalance: toNum(latestSnapshot.pg_closing_balance),
          driftAmount: toNum(latestSnapshot.drift_amount),
          driftStatus: latestSnapshot.drift_status,
          driftExplanation: latestSnapshot.drift_explanation,
          sourceKind: latestSnapshot.source_kind,
          sourceEvidenceRef: latestSnapshot.source_evidence_ref,
          evidenceAssetId: latestSnapshot.evidence_asset_id,
          reconciliationPeriodId: latestSnapshot.reconciliation_period_id,
          declaredByUserId: latestSnapshot.declared_by_user_id,
          createdAt: latestSnapshot.created_at
        }
      : null,
    evidenceAsset: evidenceAsset
      ? {
          assetId: evidenceAsset.asset_id,
          publicId: evidenceAsset.public_id,
          filename: evidenceAsset.filename,
          mimeType: evidenceAsset.mime_type,
          sizeBytes: toNum(evidenceAsset.size_bytes),
          downloadUrl: `/api/assets/private/${encodeURIComponent(evidenceAsset.asset_id)}`,
          contentHash: evidenceAsset.content_hash,
          uploadedAt: evidenceAsset.uploaded_at,
          status: evidenceAsset.status
        }
      : null,
    statementRows: { total, matched, suggested, excluded, unmatched },
    difference,
    nextAction
  }
}

/**
 * Lists snapshots for the given (year, month) window across all active
 * accounts that DO NOT have a `reconciliation_period_id` linked yet.
 * Used by ReconciliationView to surface "snapshots ready to be opened in
 * the workbench" when the periods table is empty for the period.
 */
export const listOrphanSnapshotsForPeriod = async (
  year: number,
  month: number
): Promise<
  Array<{
    snapshotId: string
    accountId: string
    accountName: string
    currency: string
    snapshotAt: string
    driftStatus: 'open' | 'accepted' | 'reconciled'
    driftAmount: number
    bankClosingBalance: number
    evidenceAssetId: string | null
  }>
> => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`

  const rows = await runGreenhousePostgresQuery<{
    snapshot_id: string
    account_id: string
    account_name: string
    currency: string
    snapshot_at: string
    drift_status: 'open' | 'accepted' | 'reconciled'
    drift_amount: string
    bank_closing_balance: string
    evidence_asset_id: string | null
  }>(
    `SELECT DISTINCT ON (s.account_id)
       s.snapshot_id,
       s.account_id,
       a.account_name,
       a.currency,
       s.snapshot_at::text AS snapshot_at,
       s.drift_status,
       s.drift_amount::text,
       s.bank_closing_balance::text,
       s.evidence_asset_id
     FROM greenhouse_finance.account_reconciliation_snapshots s
     JOIN greenhouse_finance.accounts a ON a.account_id = s.account_id
     WHERE s.snapshot_at >= $1::date
       AND s.snapshot_at < ($1::date + INTERVAL '1 month')
       AND s.reconciliation_period_id IS NULL
       AND a.is_active = TRUE
     ORDER BY s.account_id, s.snapshot_at DESC, s.created_at DESC`,
    [startDate]
  )

  return rows.map(row => ({
    snapshotId: row.snapshot_id,
    accountId: row.account_id,
    accountName: row.account_name,
    currency: row.currency,
    snapshotAt: row.snapshot_at,
    driftStatus: row.drift_status,
    driftAmount: toNum(row.drift_amount),
    bankClosingBalance: toNum(row.bank_closing_balance),
    evidenceAssetId: row.evidence_asset_id
  }))
}

/**
 * Helper exported for tests + consumers that need the canonical
 * deterministic period_id.
 */
export const buildDeterministicPeriodId = buildPeriodId
