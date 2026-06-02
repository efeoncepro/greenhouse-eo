import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { isFinanceCoreMxnEnabled } from '@/lib/finance/multi-currency/flags'

/**
 * TASK-990 Slice 7 — Onboard the Global66 **MXN** treasury account.
 *
 * Berel settles its export AR by paying 89.960 MXN into Efeonce's Global66 CLABE
 * denominated in MXN. Efeonce holds several Global66 accounts (one per currency);
 * each is its own `accounts` row with its own `currency`. This MXN account is
 * NATIVE-MXN inbound (no conversion at receipt) — distinct from the existing
 * `global66-clp` account (which receives CLP and pays USD as a payroll transit/
 * intermediary). Same provider, different account, different currency, different
 * role. The MXN→CLP conversion is a SEPARATE treasury/internal-transfer event.
 *
 * Contract (mirrors the Berel backfill, ADR §"Backfill contract"):
 *   --dry-run   (default) — print the row that WOULD be inserted + existence check.
 *   --apply               — actually INSERT (idempotent; ON CONFLICT DO NOTHING).
 *   --actor <user-id>     — created_by_user_id (default efeonce-admin).
 *   --reason "<text>"     — recorded in notes.
 *
 * --apply is GATED behind FINANCE_CORE_MXN_ENABLED: the MXN account is only
 * created once the operator flips the master MXN flag at rollout. Until then the
 * script refuses --apply and stays a read-only dry-run.
 *
 * Idempotent: re-running --apply is safe (ON CONFLICT (account_id) DO NOTHING).
 */

const ACCOUNT_ID = 'global66-mxn'
// Mirrors the canonical Efeonce space used by global66-clp.
const EFEONCE_SPACE_ID = 'spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad'

const parseFlag = (name: string): boolean => process.argv.includes(`--${name}`)

const parseArg = (name: string): string | null => {
  const idx = process.argv.indexOf(`--${name}`)

  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null
}

const main = async () => {
  const apply = parseFlag('apply')
  const actor = parseArg('actor') || 'user-efeonce-admin-julio-reyes'
  const reason = parseArg('reason') || 'TASK-990 Slice 7 — Global66 MXN native-inbound treasury account for Berel export AR settlement.'

  const candidate = {
    account_id: ACCOUNT_ID,
    account_name: 'Global66 MXN',
    bank_name: 'Global66',
    currency: 'MXN',
    account_type: 'paypal', // mirrors global66-clp (legacy account_type; no CHECK)
    country_code: 'MX', // Global66 CLABE denominated in MXN
    is_active: true,
    opening_balance: 0,
    instrument_category: 'fintech',
    provider_slug: 'global66',
    account_kind: 'asset',
    space_id: EFEONCE_SPACE_ID,
    default_for: [] as string[], // NOT a default for any flow — global66-clp keeps those
    created_by_user_id: actor,
    notes: reason
  }

  const existing = await runGreenhousePostgresQuery<{ account_id: string; currency: string; is_active: boolean }>(
    `SELECT account_id, currency, is_active FROM greenhouse_finance.accounts WHERE account_id = $1`,
    [ACCOUNT_ID]
  )

  console.log('TASK-990 Slice 7 — Global66 MXN account onboarding')
  console.log('  mode:', apply ? 'APPLY' : 'DRY-RUN (default)')
  console.log('  master flag FINANCE_CORE_MXN_ENABLED:', isFinanceCoreMxnEnabled())
  console.log('  candidate row:')
  console.log(JSON.stringify(candidate, null, 2))

  if (existing.length > 0) {
    console.log(`\n  ✓ Account "${ACCOUNT_ID}" ALREADY EXISTS (currency=${existing[0].currency}, active=${existing[0].is_active}). No-op.`)
    console.log('  expected mutation count: 0')

    return
  }

  console.log(`\n  account "${ACCOUNT_ID}" does NOT exist yet.`)
  console.log('  expected mutation count: 1 (INSERT)')

  if (!apply) {
    console.log('\n  DRY-RUN: no write performed. Re-run with --apply (and FINANCE_CORE_MXN_ENABLED=true) to insert.')

    return
  }

  if (!isFinanceCoreMxnEnabled()) {
    console.error('\n  ✗ ABORT: --apply requires FINANCE_CORE_MXN_ENABLED=true (rollout gate). Flip the master MXN flag first.')
    process.exit(1)
  }

  const result = await runGreenhousePostgresQuery<{ account_id: string }>(
    `INSERT INTO greenhouse_finance.accounts (
       account_id, account_name, bank_name, currency, account_type, country_code,
       is_active, opening_balance, instrument_category, provider_slug, account_kind,
       space_id, default_for, created_by_user_id, notes
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14, $15
     )
     ON CONFLICT (account_id) DO NOTHING
     RETURNING account_id`,
    [
      candidate.account_id,
      candidate.account_name,
      candidate.bank_name,
      candidate.currency,
      candidate.account_type,
      candidate.country_code,
      candidate.is_active,
      candidate.opening_balance,
      candidate.instrument_category,
      candidate.provider_slug,
      candidate.account_kind,
      candidate.space_id,
      candidate.default_for,
      candidate.created_by_user_id,
      candidate.notes
    ]
  )

  const mutated = result.length

  console.log(`\n  ✓ APPLIED. actual mutation count: ${mutated} (expected 1).`)

  if (mutated !== 1) {
    console.error('  ✗ Mutation count differs from expected — investigate (concurrent insert?).')
    process.exit(1)
  }
}

main().then(() => process.exit(0)).catch(err => { console.error('ONBOARD FAIL:', err?.message ?? err); process.exit(1) })
