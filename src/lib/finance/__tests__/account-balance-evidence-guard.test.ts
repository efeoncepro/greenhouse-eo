import { describe, expect, it, vi } from 'vitest'

import {
  AccountBalanceEvidenceGuardError,
  validateAccountBalanceWriteAgainstEvidence
} from '@/lib/finance/account-balance-evidence-guard'

const buildClient = (rows: unknown[]) => ({
  query: vi.fn().mockResolvedValue({ rows })
})

describe('validateAccountBalanceWriteAgainstEvidence', () => {
  it('passes when reconciled bank evidence matches the materialized closing balance', async () => {
    const client = buildClient([
      {
        snapshot_id: 'recon-santander-clp-20260429',
        account_id: 'santander-clp',
        balance_date: '2026-04-29',
        bank_closing_balance: '4153041.00',
        materialized_closing_balance: '4153041.00'
      }
    ])

    const result = await validateAccountBalanceWriteAgainstEvidence({
      client,
      accountId: 'santander-clp',
      startDate: '2026-04-22',
      endDate: '2026-04-29'
    })

    expect(result.checkedSnapshots).toBe(1)
    expect(result.violations).toEqual([])
  })

  it('blocks before commit when a reconciled bank snapshot would drift', async () => {
    const client = buildClient([
      {
        snapshot_id: 'recon-santander-clp-20260429',
        account_id: 'santander-clp',
        balance_date: '2026-04-29',
        bank_closing_balance: '4153041.00',
        materialized_closing_balance: '4172563.00'
      }
    ])

    await expect(
      validateAccountBalanceWriteAgainstEvidence({
        client,
        accountId: 'santander-clp',
        startDate: '2026-04-22',
        endDate: '2026-04-29'
      })
    ).rejects.toMatchObject({
      code: 'FINANCE_ACCOUNT_BALANCE_EVIDENCE_DRIFT',
      accountId: 'santander-clp'
    })
  })

  it('also protects accepted operator checkpoints from drift', async () => {
    const client = buildClient([
      {
        snapshot_id: 'checkpoint-santander-usd-20260429',
        account_id: 'santander-usd-usd',
        drift_status: 'accepted',
        balance_date: '2026-04-29',
        bank_closing_balance: '100.00',
        pg_closing_balance: '1.94',
        materialized_closing_balance: '0.00'
      }
    ])

    await expect(
      validateAccountBalanceWriteAgainstEvidence({
        client,
        accountId: 'santander-usd-usd',
        startDate: '2026-04-22',
        endDate: '2026-04-29'
      })
    ).rejects.toMatchObject({
      code: 'FINANCE_ACCOUNT_BALANCE_EVIDENCE_DRIFT',
      accountId: 'santander-usd-usd'
    })
  })

  it('can run in warn-only mode without blocking the caller', async () => {
    const client = buildClient([
      {
        snapshot_id: 'recon-santander-clp-20260429',
        account_id: 'santander-clp',
        balance_date: '2026-04-29',
        bank_closing_balance: '4153041.00',
        materialized_closing_balance: '4172563.00'
      }
    ])

    const result = await validateAccountBalanceWriteAgainstEvidence({
      client,
      accountId: 'santander-clp',
      startDate: '2026-04-22',
      endDate: '2026-04-29',
      options: { mode: 'warn_only' }
    })

    expect(result.violations).toEqual([
      {
        accountId: 'santander-clp',
        balanceDate: '2026-04-29',
        snapshotId: 'recon-santander-clp-20260429',
        bankClosingBalance: 4153041,
        materializedClosingBalance: 4172563,
        driftAmount: 19522
      }
    ])
  })

  it('treats a missing materialized row for reconciled evidence as a violation', async () => {
    const client = buildClient([
      {
        snapshot_id: 'recon-santander-clp-20260429',
        account_id: 'santander-clp',
        balance_date: '2026-04-29',
        bank_closing_balance: '4153041.00',
        materialized_closing_balance: null
      }
    ])

    await expect(
      validateAccountBalanceWriteAgainstEvidence({
        client,
        accountId: 'santander-clp',
        startDate: '2026-04-22',
        endDate: '2026-04-29'
      })
    ).rejects.toBeInstanceOf(AccountBalanceEvidenceGuardError)
  })

  it('can be explicitly disabled for emergency/manual recovery flows', async () => {
    const client = buildClient([
      {
        snapshot_id: 'recon-santander-clp-20260429',
        account_id: 'santander-clp',
        balance_date: '2026-04-29',
        bank_closing_balance: '4153041.00',
        materialized_closing_balance: '0.00'
      }
    ])

    const result = await validateAccountBalanceWriteAgainstEvidence({
      client,
      accountId: 'santander-clp',
      startDate: '2026-04-22',
      endDate: '2026-04-29',
      options: { mode: 'off' }
    })

    expect(result).toEqual({ mode: 'off', checkedSnapshots: 0, violations: [] })
    expect(client.query).not.toHaveBeenCalled()
  })
})
