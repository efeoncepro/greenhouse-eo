import type { PoolClient } from 'pg'

/**
 * TASK-871 Slice 2B — Clean seed resolver.
 *
 * # What it does
 *
 * Given a candidate `seedDate` for `rematerializeAccountBalanceRange`,
 * verifies that the day is movement-free. If the day has canonical
 * movements (settlement legs, normalized income or expense payments), it
 * walks the candidate one day backward and re-checks, until one of three
 * things happens:
 *
 *   1. A clean day is found → returns `{ ok: true, cleanSeed, daysExpanded }`.
 *   2. The expansion hits `maxExpandDays` without finding a clean anchor →
 *      returns `{ ok: false, reason: 'exceeded_max_expand' }`.
 *
 * The seed contract is canonical: `rematerializeAccountBalanceRange` never
 * materializes the seed day (account-balances-rematerialize.ts:258). So if
 * the candidate seed has real movements, those movements become invisible
 * after the cron runs — which is exactly the bug class TASK-871 closes.
 *
 * # Why a separate helper
 *
 * Two reasons:
 *
 * 1. The cron handler and the remediation control plane both need the
 *    integrity check. Centralizing it here avoids drift between the two
 *    call sites.
 *
 * 2. The check must run inside a PG transaction at execution time. A
 *    pre-flight separate from the materialize call would race against
 *    in-flight settlement leg inserts. Inline (under the same tx) is the
 *    only correct shape.
 *
 * # What it does NOT do
 *
 * - Does NOT detect protected snapshots. Those are managed by the caller
 *   (the cron handler queries `account_reconciliation_snapshots` separately
 *   and may use a protected snapshot as the effective seed). Protected
 *   snapshots represent operator-accepted closings, so their materialized
 *   row IS the truth even when movements exist — they short-circuit the
 *   integrity check.
 *
 * - Does NOT call `validateAccountBalanceWriteAgainstEvidence`. That guard
 *   runs at the end of `rematerializeAccountBalanceRange` and validates the
 *   materialized closings against `account_reconciliation_snapshots`. The
 *   integrity check here is one layer above: it prevents drift before it
 *   would be persisted.
 *
 * - Does NOT do date math. The candidate seed comes from
 *   `computeRollingRematerializationWindow` (Slice 2A).
 *
 * @see services/ops-worker/finance-rematerialize-seed.ts
 * @see src/lib/finance/account-balances-rematerialize.ts
 * @see docs/tasks/in-progress/TASK-871-account-balance-rolling-anchor-contract.md
 */

type QueryableClient = Pick<PoolClient, 'query'>

export interface ResolveCleanSeedDateInput {
  client: QueryableClient
  accountId: string
  candidateSeedDate: string
  /**
   * Maximum number of days to walk backward looking for a clean anchor.
   * Default 30: matches Greenhouse Finance month boundary granularity.
   * The caller escalates to `historical_restatement` if the expansion
   * exceeds this bound.
   */
  maxExpandDays?: number
}

export type CleanSeedResolveResult =
  | {
      ok: true
      cleanSeed: string
      originalSeed: string
      daysExpanded: number
      movementBlockers: ReadonlyArray<SeedDayMovementSummary>
    }
  | {
      ok: false
      reason: 'exceeded_max_expand'
      originalSeed: string
      lastCheckedSeed: string
      daysExpanded: number
      movementBlockers: ReadonlyArray<SeedDayMovementSummary>
    }

export interface SeedDayMovementSummary {
  balanceDate: string
  settlementLegs: number
  incomePayments: number
  expensePayments: number
}

const MS_PER_DAY = 86_400_000

const subOneDay = (dateString: string): string => {
  const prev = new Date(`${dateString}T00:00:00.000Z`)

  prev.setTime(prev.getTime() - MS_PER_DAY)

  return prev.toISOString().slice(0, 10)
}

interface MovementCountRow {
  settlement_legs: string
  income_payments: string
  expense_payments: string
}

/**
 * Counts canonical movements that would be hidden if the given day were
 * used as a mute seed anchor.
 *
 * Uses the canonical TASK-766 normalized payment VIEWs (which already
 * apply the supersede filter inline) plus a hand-rolled supersede filter
 * on `settlement_legs` (no canonical VIEW exists yet for settlement legs).
 */
const countMovementsForDay = async (
  client: QueryableClient,
  accountId: string,
  balanceDate: string
): Promise<SeedDayMovementSummary> => {
  const result = await client.query<MovementCountRow>(
    `
      SELECT
        (
          SELECT COUNT(*)::text
          FROM greenhouse_finance.settlement_legs sl
          WHERE sl.instrument_id = $1
            AND sl.transaction_date = $2::date
            AND sl.superseded_at IS NULL
            AND sl.superseded_by_otb_id IS NULL
        ) AS settlement_legs,
        (
          SELECT COUNT(*)::text
          FROM greenhouse_finance.income_payments_normalized ipn
          WHERE ipn.payment_account_id = $1
            AND ipn.payment_date = $2::date
        ) AS income_payments,
        (
          SELECT COUNT(*)::text
          FROM greenhouse_finance.expense_payments_normalized epn
          WHERE epn.payment_account_id = $1
            AND epn.payment_date = $2::date
        ) AS expense_payments
    `,
    [accountId, balanceDate]
  )

  const row = result.rows[0]

  return {
    balanceDate,
    settlementLegs: row ? Number(row.settlement_legs) : 0,
    incomePayments: row ? Number(row.income_payments) : 0,
    expensePayments: row ? Number(row.expense_payments) : 0
  }
}

const hasMovements = (summary: SeedDayMovementSummary): boolean =>
  summary.settlementLegs > 0 || summary.incomePayments > 0 || summary.expensePayments > 0

/**
 * Resolves a movement-free seed date by walking backward from the candidate.
 *
 * Returns `{ ok: true, cleanSeed }` when a clean day is found within
 * `maxExpandDays`. Returns `{ ok: false, reason: 'exceeded_max_expand' }`
 * when the walk hits the bound without finding a clean day — the caller
 * must then escalate to `historical_restatement`.
 *
 * Idempotent. No side effects. Safe inside any transaction.
 */
export const resolveCleanSeedDate = async (
  input: ResolveCleanSeedDateInput
): Promise<CleanSeedResolveResult> => {
  const maxExpandDays = input.maxExpandDays ?? 30
  const originalSeed = input.candidateSeedDate

  const blockers: SeedDayMovementSummary[] = []
  let currentSeed = originalSeed
  let daysExpanded = 0

  // Always check the original candidate first.
  for (;;) {
    const summary = await countMovementsForDay(input.client, input.accountId, currentSeed)

    if (!hasMovements(summary)) {
      return {
        ok: true,
        cleanSeed: currentSeed,
        originalSeed,
        daysExpanded,
        movementBlockers: blockers
      }
    }

    blockers.push(summary)

    if (daysExpanded >= maxExpandDays) {
      return {
        ok: false,
        reason: 'exceeded_max_expand',
        originalSeed,
        lastCheckedSeed: currentSeed,
        daysExpanded,
        movementBlockers: blockers
      }
    }

    currentSeed = subOneDay(currentSeed)
    daysExpanded += 1
  }
}
