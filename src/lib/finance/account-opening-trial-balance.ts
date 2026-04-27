import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * Account Opening Trial Balance (OTB) — TASK-703.
 * ================================================
 *
 * Canonical opening declaration per account: explicit, supersedible, audit
 * trail preserved. Replaces the implicit `accounts.opening_balance` setting
 * with a proper trial balance entry as any serious accounting system does
 * when migrating legacy state.
 *
 * Three audit_status levels:
 *   - estimated:  declared with best available data, pending reconciliation
 *   - reconciled: derived from cartola/extracto/ledger verifiable history
 *   - audited:    reviewed by accountant, signed, immutable
 *
 * To revise an existing OTB (e.g. when better data emerges), call
 * `superseseOTBWithRevision()` which INSERTs a new row and marks the old as
 * superseded. The audit chain is preserved.
 *
 * The materialization engine (`materializeAccountBalance`) prefers the
 * active OTB (`superseded_by IS NULL`) over `accounts.opening_balance`.
 */

export type OtbAuditStatus = 'estimated' | 'reconciled' | 'audited'

export interface OtbEvidenceRef {
  type: string
  description?: string
  ref?: string
  period?: string
  [key: string]: unknown
}

export interface DeclareOpeningTrialBalanceInput {
  accountId: string
  genesisDate: string  // YYYY-MM-DD
  openingBalance: number
  openingBalanceClp?: number  // defaults to opening_balance for CLP accounts
  declaredByUserId?: string | null
  declarationReason: string
  auditStatus?: OtbAuditStatus
  evidenceRefs?: OtbEvidenceRef[]
}

export interface OpeningTrialBalanceRecord {
  obtbId: string
  accountId: string
  genesisDate: string
  openingBalance: number
  openingBalanceClp: number
  declaredByUserId: string | null
  declaredAt: string
  declarationReason: string
  auditStatus: OtbAuditStatus
  evidenceRefs: OtbEvidenceRef[]
  supersededBy: string | null
  supersededAt: string | null
  supersededReason: string | null
}

const ensureReason = (reason: string): string => {
  const trimmed = (reason ?? '').trim()

  if (trimmed.length < 10) {
    throw new Error('OTB declaration_reason must be at least 10 characters explaining the source of truth.')
  }

  return trimmed
}

const buildOtbId = (accountId: string, genesisDate: string): string =>
  `obtb-${accountId.slice(0, 30)}-${genesisDate.replace(/-/g, '')}-${randomUUID().slice(0, 8)}`

export const declareOpeningTrialBalance = async (
  input: DeclareOpeningTrialBalanceInput
): Promise<OpeningTrialBalanceRecord> => {
  const reason = ensureReason(input.declarationReason)
  const obtbId = buildOtbId(input.accountId, input.genesisDate)
  const auditStatus = input.auditStatus ?? 'estimated'

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    // Verify account exists and pull currency for CLP equivalent
    const acct = await client.query<{ currency: string }>(
      `SELECT currency FROM greenhouse_finance.accounts WHERE account_id = $1`,
      [input.accountId]
    )

    if (acct.rows.length === 0) {
      throw new Error(`Account ${input.accountId} not found`)
    }

    const currency = acct.rows[0].currency
    const openingBalanceClp = input.openingBalanceClp ?? (currency === 'CLP' ? input.openingBalance : input.openingBalance)

    // Idempotency: if there's already an active OTB for this (account_id, genesis_date)
    // with the same opening_balance + reason, skip. Otherwise supersede the existing one.
    const existing = await client.query<{ obtb_id: string; opening_balance: string }>(
      `SELECT obtb_id, opening_balance::text
       FROM greenhouse_finance.account_opening_trial_balance
       WHERE account_id = $1
         AND genesis_date = $2::date
         AND superseded_by IS NULL`,
      [input.accountId, input.genesisDate]
    )

    if (existing.rows.length > 0) {
      const existingBalance = Number(existing.rows[0].opening_balance)

      if (Math.abs(existingBalance - input.openingBalance) < 0.01) {
        // Same value, idempotent return
        const r = await client.query<OtbRowDb>(
          `SELECT * FROM greenhouse_finance.account_opening_trial_balance WHERE obtb_id = $1`,
          [existing.rows[0].obtb_id]
        )

        return mapOtbRow(r.rows[0])
      }

      // Different value — supersede the old one
      await client.query(
        `UPDATE greenhouse_finance.account_opening_trial_balance SET
           superseded_by = $1,
           superseded_at = NOW(),
           superseded_reason = $2
         WHERE obtb_id = $3`,
        [obtbId, `Revised: ${reason}`, existing.rows[0].obtb_id]
      )
    }

    const r = await client.query<OtbRowDb>(
      `INSERT INTO greenhouse_finance.account_opening_trial_balance (
         obtb_id, account_id, genesis_date,
         opening_balance, opening_balance_clp,
         declared_by_user_id, declaration_reason, audit_status,
         evidence_refs, created_at
       ) VALUES (
         $1, $2, $3::date,
         $4, $5,
         $6, $7, $8,
         $9::jsonb, NOW()
       )
       RETURNING *`,
      [
        obtbId, input.accountId, input.genesisDate,
        input.openingBalance, openingBalanceClp,
        input.declaredByUserId ?? null, reason, auditStatus,
        JSON.stringify(input.evidenceRefs ?? [])
      ]
    )

    // Sync accounts.opening_balance + opening_balance_date as a cache
    await client.query(
      `UPDATE greenhouse_finance.accounts SET
         opening_balance = $1,
         opening_balance_date = $2::date,
         updated_at = NOW()
       WHERE account_id = $3`,
      [input.openingBalance, input.genesisDate, input.accountId]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'finance.account',
        aggregateId: input.accountId,
        eventType: 'finance.account.opening_trial_balance.declared',
        payload: {
          obtbId,
          accountId: input.accountId,
          genesisDate: input.genesisDate,
          openingBalance: input.openingBalance,
          openingBalanceClp,
          auditStatus,
          declarationReason: reason
        }
      },
      client
    )

    return mapOtbRow(r.rows[0])
  })
}

export const getActiveOpeningTrialBalance = async (
  accountId: string
): Promise<OpeningTrialBalanceRecord | null> => {
  const r = await runGreenhousePostgresQuery<OtbRowDb>(
    `SELECT * FROM greenhouse_finance.account_opening_trial_balance
     WHERE account_id = $1 AND superseded_by IS NULL
     ORDER BY genesis_date DESC, created_at DESC LIMIT 1`,
    [accountId]
  )

  return r.length > 0 ? mapOtbRow(r[0]) : null
}

export const listLiabilityAccountsWithoutActiveOtb = async (): Promise<string[]> => {
  const r = await runGreenhousePostgresQuery<{ account_id: string }>(
    `SELECT a.account_id
     FROM greenhouse_finance.accounts a
     WHERE a.account_kind = 'liability'
       AND a.is_active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM greenhouse_finance.account_opening_trial_balance otb
         WHERE otb.account_id = a.account_id AND otb.superseded_by IS NULL
       )`
  )

  return r.map(row => row.account_id)
}

interface OtbRowDb extends Record<string, unknown> {
  obtb_id: string
  account_id: string
  genesis_date: Date | string
  opening_balance: string
  opening_balance_clp: string
  declared_by_user_id: string | null
  declared_at: Date | string
  declaration_reason: string
  audit_status: OtbAuditStatus
  evidence_refs: OtbEvidenceRef[]
  superseded_by: string | null
  superseded_at: Date | string | null
  superseded_reason: string | null
  created_at: Date | string
}

const mapOtbRow = (row: OtbRowDb): OpeningTrialBalanceRecord => ({
  obtbId: row.obtb_id,
  accountId: row.account_id,
  genesisDate: typeof row.genesis_date === 'string' ? row.genesis_date : new Date(row.genesis_date).toISOString().slice(0, 10),
  openingBalance: Number(row.opening_balance),
  openingBalanceClp: Number(row.opening_balance_clp),
  declaredByUserId: row.declared_by_user_id,
  declaredAt: typeof row.declared_at === 'string' ? row.declared_at : new Date(row.declared_at).toISOString(),
  declarationReason: row.declaration_reason,
  auditStatus: row.audit_status,
  evidenceRefs: row.evidence_refs ?? [],
  supersededBy: row.superseded_by,
  supersededAt: row.superseded_at == null ? null : (typeof row.superseded_at === 'string' ? row.superseded_at : new Date(row.superseded_at).toISOString()),
  supersededReason: row.superseded_reason
})
