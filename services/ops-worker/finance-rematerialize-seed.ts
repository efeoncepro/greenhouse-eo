/**
 * TASK-871 — Rolling rematerialization anchor contract.
 *
 * Canonical primitive for the daily Cloud Scheduler cron
 * `ops-finance-rematerialize-balances` and any remediation flow that needs
 * to repair a recent rolling window of `account_balances`.
 *
 * # Why this primitive exists
 *
 * The rematerializer `rematerializeAccountBalanceRange`
 * (src/lib/finance/account-balances-rematerialize.ts:258) deliberately does
 * NOT materialize the seed day — the loop iterates from `seedDate + 1`. The
 * seed row is preserved as a mute anchor to keep reconciliation snapshots
 * (TASK-721) and OTB anchor (TASK-703) consistent.
 *
 * That contract is load-bearing. The bug class this primitive closes is on
 * the caller side: if the cron passes a candidate seed that happens to hold
 * real movements, those movements become invisible to subsequent runs. The
 * `2026-05-13` incident hit exactly this: `2026-05-05` had real
 * `settlement_legs` but materialized with `period_inflows=0, period_outflows=0`
 * because it was used as a silent anchor by the daily rolling window.
 *
 * ISSUE-069 was a partial fix — it shifted the seed one day backward
 * (`today − (lookbackDays + 1)`) but the structural invariant ("the first
 * observed day must be materialized, never seed") was not enforced.
 *
 * # Canonical contract
 *
 * For a rolling cron with `today=T` and `lookbackDays=L`:
 *
 *   targetStartDate     = T − L            (first day inside the window)
 *   seedDate            = T − (L + 1)      (one day BEFORE the window; mute anchor)
 *   materializeStartDate= T − L            (= targetStartDate; FIRST day materialized)
 *   materializeEndDate  = T                (inclusive)
 *   lookbackDays        = L
 *   policy              = 'rolling_window_repair'
 *
 * Total days materialized: `L + 1` (inclusive of today and of targetStartDate).
 *
 * Interpretation B (resolved 2026-05-13): we materialize 8 days for `L=7`
 * because the extra day of buffer protects against retroactive postings on
 * the boundary day. See spec
 * `docs/tasks/in-progress/TASK-871-account-balance-rolling-anchor-contract.md`
 * § Pre-Execution OQ Resolution.
 *
 * # Invariant enforced by the caller
 *
 * The `seedDate` returned by this primitive is purely arithmetic — it does
 * NOT verify that the day is movement-free. That check must run inside a PG
 * transaction at cron execution time via the canonical companion
 * `resolveCleanSeedDate` (services/ops-worker/clean-seed-resolver.ts).
 *
 * # ISSUE-069 back-compat
 *
 * `computeRematerializeSeedDate(today, lookbackDays)` is preserved as a thin
 * wrapper that returns `window.seedDate`. Existing tests pin the legacy
 * shape; the new primitive extends without breaking.
 *
 * @see docs/issues/resolved/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md
 * @see docs/tasks/in-progress/TASK-871-account-balance-rolling-anchor-contract.md
 */

export type RollingRematerializationPolicy = 'rolling_window_repair'

export interface RollingRematerializationWindow {
  /** First day of the rolling window (inclusive). Materialized. */
  targetStartDate: string
  /** Day BEFORE the window. Mute anchor; never materialized. */
  seedDate: string
  /**
   * First day actually materialized by `rematerializeAccountBalanceRange`.
   * Always equals `targetStartDate`. Exposed separately so call sites can be
   * explicit about the contract instead of doing date math inline.
   */
  materializeStartDate: string
  /** Last day materialized (inclusive). Always equals `today`. */
  materializeEndDate: string
  /** Window size in days. Total materialized days = `lookbackDays + 1`. */
  lookbackDays: number
  /** Canonical policy label routed downstream to the remediation control plane. */
  policy: RollingRematerializationPolicy
}

const MS_PER_DAY = 86_400_000

const toIsoDate = (instant: Date): string => instant.toISOString().slice(0, 10)

const shiftDays = (instant: Date, deltaDays: number): Date =>
  new Date(instant.getTime() + deltaDays * MS_PER_DAY)

/**
 * Compute the canonical rolling rematerialization window for the daily cron
 * and the remediation control plane.
 *
 * Pure: no DB access, no Sentry, no logging.
 *
 * @throws Error if `lookbackDays < 1` or non-finite.
 */
export const computeRollingRematerializationWindow = (
  today: Date,
  lookbackDays: number
): RollingRematerializationWindow => {
  if (!Number.isFinite(lookbackDays) || lookbackDays < 1) {
    throw new Error(`computeRollingRematerializationWindow: lookbackDays must be >= 1, got ${lookbackDays}`)
  }

  const targetStart = shiftDays(today, -lookbackDays)
  const seed = shiftDays(today, -(lookbackDays + 1))

  return {
    targetStartDate: toIsoDate(targetStart),
    seedDate: toIsoDate(seed),
    materializeStartDate: toIsoDate(targetStart),
    materializeEndDate: toIsoDate(today),
    lookbackDays,
    policy: 'rolling_window_repair'
  }
}

/**
 * ISSUE-069 back-compat wrapper.
 *
 * Returns `window.seedDate` for callers that still use the legacy single-value
 * shape. Prefer `computeRollingRematerializationWindow` in new code.
 *
 * @see docs/issues/resolved/ISSUE-069-finance-cron-rematerialize-seed-day-blind-spot.md
 */
export const computeRematerializeSeedDate = (today: Date, lookbackDays: number): string =>
  computeRollingRematerializationWindow(today, lookbackDays).seedDate
