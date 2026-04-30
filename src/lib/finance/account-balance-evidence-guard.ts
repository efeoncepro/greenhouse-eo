import type { PoolClient } from 'pg'

import { roundCurrency, toNumber } from '@/lib/finance/shared'

type QueryableClient = Pick<PoolClient, 'query'>

export interface AccountBalanceEvidenceGuardOptions {
  mode?: 'block_on_reconciled_drift' | 'warn_only' | 'off'
  tolerance?: number
}

export interface AccountBalanceEvidenceViolation {
  accountId: string
  balanceDate: string
  snapshotId: string
  bankClosingBalance: number
  materializedClosingBalance: number | null
  driftAmount: number
}

export interface AccountBalanceEvidenceGuardResult {
  mode: 'block_on_reconciled_drift' | 'warn_only' | 'off'
  checkedSnapshots: number
  violations: AccountBalanceEvidenceViolation[]
}

interface EvidenceComparisonRow {
  snapshot_id: string
  account_id: string
  drift_status: string
  balance_date: string
  bank_closing_balance: string
  materialized_closing_balance: string | null
}

export class AccountBalanceEvidenceGuardError extends Error {
  readonly code = 'FINANCE_ACCOUNT_BALANCE_EVIDENCE_DRIFT'
  readonly accountId: string
  readonly violations: AccountBalanceEvidenceViolation[]

  constructor(accountId: string, violations: AccountBalanceEvidenceViolation[]) {
    const sample = violations
      .slice(0, 3)
      .map(v => `${v.balanceDate}: bank=${v.bankClosingBalance}, materialized=${v.materializedClosingBalance ?? 'missing'}, drift=${v.driftAmount}`)
      .join('; ')

    super(
      `Blocked account balance rematerialization for ${accountId}: ` +
        `${violations.length} protected balance evidence snapshot(s) would drift. ${sample}`
    )

    this.name = 'AccountBalanceEvidenceGuardError'
    this.accountId = accountId
    this.violations = violations
  }
}

const normalizeMode = (mode?: AccountBalanceEvidenceGuardOptions['mode']) =>
  mode ?? 'block_on_reconciled_drift'

export const validateAccountBalanceWriteAgainstEvidence = async ({
  client,
  accountId,
  startDate,
  endDate,
  options = {}
}: {
  client: QueryableClient
  accountId: string
  startDate: string
  endDate: string
  options?: AccountBalanceEvidenceGuardOptions
}): Promise<AccountBalanceEvidenceGuardResult> => {
  const mode = normalizeMode(options.mode)
  const tolerance = options.tolerance ?? 0.01

  if (mode === 'off') {
    return { mode, checkedSnapshots: 0, violations: [] }
  }

  const result = await client.query<EvidenceComparisonRow>(
    `
      WITH latest_protected_evidence AS (
        SELECT DISTINCT ON ((s.snapshot_at::date))
          s.snapshot_id,
          s.account_id,
          s.drift_status,
          s.snapshot_at::date::text AS balance_date,
          s.bank_closing_balance::text AS bank_closing_balance
        FROM greenhouse_finance.account_reconciliation_snapshots s
        JOIN greenhouse_finance.accounts a
          ON a.account_id = s.account_id
        WHERE s.account_id = $1
          AND a.is_active = TRUE
          AND s.drift_status IN ('accepted', 'reconciled')
          AND s.snapshot_at::date BETWEEN $2::date AND $3::date
        ORDER BY (s.snapshot_at::date), s.snapshot_at DESC, s.created_at DESC
      )
      SELECT
        e.snapshot_id,
        e.account_id,
        e.drift_status,
        e.balance_date,
        e.bank_closing_balance,
        ab.closing_balance::text AS materialized_closing_balance
      FROM latest_protected_evidence e
      LEFT JOIN greenhouse_finance.account_balances ab
        ON ab.account_id = e.account_id
       AND ab.balance_date = e.balance_date::date
      ORDER BY e.balance_date
    `,
    [accountId, startDate, endDate]
  )

  const violations = result.rows.flatMap(row => {
    const bankClosingBalance = roundCurrency(toNumber(row.bank_closing_balance))

    const materializedClosingBalance = row.materialized_closing_balance == null
      ? null
      : roundCurrency(toNumber(row.materialized_closing_balance))

    const driftAmount = materializedClosingBalance == null
      ? bankClosingBalance
      : roundCurrency(materializedClosingBalance - bankClosingBalance)

    if (Math.abs(driftAmount) <= tolerance) {
      return []
    }

    return [{
      accountId: row.account_id,
      balanceDate: row.balance_date,
      snapshotId: row.snapshot_id,
      bankClosingBalance,
      materializedClosingBalance,
      driftAmount
    }]
  })

  if (mode === 'block_on_reconciled_drift' && violations.length > 0) {
    throw new AccountBalanceEvidenceGuardError(accountId, violations)
  }

  return {
    mode,
    checkedSnapshots: result.rows.length,
    violations
  }
}
