import 'server-only'

import { randomUUID } from 'node:crypto'

import { resolveCleanSeedDate } from '@/lib/finance/account-balances-clean-seed-resolver'
import { rematerializeAccountBalanceRange } from '@/lib/finance/account-balances-rematerialize'
import { refreshMonthlyBatch } from '@/lib/finance/account-balances-monthly'
import {
  listAccountBalancesFxDriftRows,
  countAccountBalancesFxDriftRows,
  type AccountBalancesFxDriftRow
} from '@/lib/reliability/queries/account-balances-fx-drift'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * FX drift remediation policies.
 *
 * - `detect_only` (default): plan + decide, never mutate. Operator audit.
 * - `auto_open_periods`: legacy — auto-remediate open-period drift with
 *   `active_otb` seedMode. Wide scope; can collide with protected evidence
 *   if OTB anchor lives behind reconciled snapshots.
 * - `known_bug_class_restatement`: explicit restatement across protected
 *   evidence (ISSUE-069 seed-blind-spot signature). Uses `warn_only`
 *   evidence guard. Rare; requires operator intent.
 * - `strict_no_restatement`: only repairs open-period drift with source
 *   evidence; never touches protected closings.
 * - `rolling_window_repair` (TASK-871): canonical narrow-scope policy for
 *   recent seed-blind-spot drift. Uses `computeRollingRematerializationWindow`
 *   + `resolveCleanSeedDate` to pick a movement-free anchor and
 *   `seedMode: 'explicit'` (preserves OTB cache). Evidence guard stays in
 *   `block_on_reconciled_drift` mode — never restates over reconciled snapshots.
 */
export type FxDriftRemediationPolicy =
  | 'detect_only'
  | 'auto_open_periods'
  | 'known_bug_class_restatement'
  | 'strict_no_restatement'
  | 'rolling_window_repair'

export type FxDriftRemediationDecisionKind =
  | 'auto_remediable'
  | 'known_bug_class_restatement'
  | 'blocked_reconciled_or_closed'
  | 'blocked_out_of_policy'
  | 'unknown_requires_review'

export type FxDriftRemediationStatus = 'succeeded' | 'partial' | 'blocked' | 'failed'

export type FxDriftRemediationInput = {
  policy?: FxDriftRemediationPolicy
  dryRun?: boolean
  windowDays?: number
  accountId?: string
  fromDate?: string
  toDate?: string
  maxRows?: number
  maxAccounts?: number
  maxAbsDriftClp?: string
  triggeredBy?: string
}

export type FxDriftRemediationDecision = {
  accountId: string
  accountName: string
  balanceDate: string
  driftClp: string
  absDriftClp: string
  decision: FxDriftRemediationDecisionKind
  reason: string
  evidence: Record<string, unknown>
}

export type FxDriftRemediationPlan = {
  policy: FxDriftRemediationPolicy
  dryRun: boolean
  windowDays: number
  maxRows: number
  maxAccounts: number
  maxAbsDriftClp: string
  driftRowsSeen: number
  accountsSeen: number
  overflow: {
    rows: boolean
    accounts: boolean
  }
  decisions: FxDriftRemediationDecision[]
}

export type FxDriftRemediationAccountRun = {
  accountId: string
  fromDate: string
  toDate: string
  daysMaterialized?: number
  finalClosingBalance?: string
  evidenceGuardMode?: 'block_on_reconciled_drift' | 'warn_only' | 'off'
  monthlyRefreshed?: number
  monthlySkipped?: number
  /**
   * TASK-871 — seed mode used by the rematerializer. `explicit` means the
   * caller (rolling_window_repair) supplied a movement-free seed; `active_otb`
   * means the rematerializer resolved the seed from the canonical Opening
   * Trial Balance declaration.
   */
  seedMode?: 'explicit' | 'active_otb'
  /**
   * TASK-871 — when the rolling repair walked backward through dirty days to
   * find a clean anchor, this captures the expansion telemetry. Empty when
   * the original seed candidate was already movement-free.
   */
  cleanSeedExpansion?: {
    originalSeed: string
    cleanSeed: string
    daysExpanded: number
  }
  /**
   * TASK-871 — when the integrity check could not find a clean anchor within
   * `maxExpandDays`, the account is skipped without invoking the
   * rematerializer. The caller escalates to historical_restatement.
   */
  skipped?: {
    reason: 'integrity_check_exceeded_max_expand'
    originalSeed: string
    lastCheckedSeed: string
    daysExpanded: number
  }
}

export type FxDriftRemediationResult = FxDriftRemediationPlan & {
  status: FxDriftRemediationStatus
  syncRunId: string | null
  driftRowsRemediated: number
  driftRowsBlocked: number
  accountsRematerialized: number
  residualDriftCount: number
  runs: FxDriftRemediationAccountRun[]
  error?: string
}

type ProtectedEvidenceRow = {
  account_id: string
  balance_date: string
  snapshot_id: string
  drift_status: string
}

const DEFAULT_POLICY: FxDriftRemediationPolicy = 'detect_only'
const DEFAULT_WINDOW_DAYS = 90
const DEFAULT_MAX_ROWS = 25
const DEFAULT_MAX_ACCOUNTS = 10
const DEFAULT_MAX_ABS_DRIFT_CLP = '5000000'

const ymd = (date: Date) => date.toISOString().slice(0, 10)

const todayYmd = () => ymd(new Date())

const subOneDayIso = (dateString: string) => {
  const prev = new Date(`${dateString}T00:00:00.000Z`)

  prev.setTime(prev.getTime() - 86_400_000)

  return prev.toISOString().slice(0, 10)
}

const clampInteger = (value: number | undefined, fallback: number, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback

  return Math.min(Math.max(Math.trunc(value), min), max)
}

const normalizeDate = (value: string | undefined) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined

const decimalToCents = (value: string | number | null | undefined): bigint => {
  const raw = String(value ?? '0').trim()
  const negative = raw.startsWith('-')
  const unsigned = negative ? raw.slice(1) : raw
  const [wholeRaw, fractionRaw = ''] = unsigned.split('.')
  const whole = BigInt(wholeRaw.replace(/\D/g, '') || '0')
  const fraction = BigInt(fractionRaw.padEnd(2, '0').slice(0, 2) || '0')
  const cents = whole * 100n + fraction

  return negative ? -cents : cents
}

const absCents = (value: string | number | null | undefined) => {
  const cents = decimalToCents(value)

  return cents < 0n ? -cents : cents
}

const isZeroMoney = (value: string | number | null | undefined) => decimalToCents(value) === 0n

const hasSourceEvidence = (row: AccountBalancesFxDriftRow) =>
  row.evidenceRefs.settlementLegs > 0 || row.evidenceRefs.incomePayments > 0 || row.evidenceRefs.expensePayments > 0

const matchesKnownSeedBlindSpotSignature = (row: AccountBalancesFxDriftRow) =>
  row.transactionCount === 0 &&
  isZeroMoney(row.persistedInflowsClp) &&
  isZeroMoney(row.persistedOutflowsClp) &&
  (!isZeroMoney(row.expectedInflowsClp) || !isZeroMoney(row.expectedOutflowsClp)) &&
  hasSourceEvidence(row)

const evidenceKey = (accountId: string, balanceDate: string) => `${accountId}::${balanceDate}`

const listProtectedEvidence = async (rows: AccountBalancesFxDriftRow[]) => {
  if (rows.length === 0) {
    return new Map<string, ProtectedEvidenceRow>()
  }

  const accountIds = [...new Set(rows.map(row => row.accountId))]
  const dates = [...new Set(rows.map(row => row.balanceDate))]

  const protectedRows = await runGreenhousePostgresQuery<ProtectedEvidenceRow>(
    `
      SELECT DISTINCT ON (s.account_id, s.snapshot_at::date)
        s.account_id,
        s.snapshot_at::date::text AS balance_date,
        s.snapshot_id,
        s.drift_status
      FROM greenhouse_finance.account_reconciliation_snapshots s
      WHERE s.account_id = ANY($1::text[])
        AND s.snapshot_at::date = ANY($2::date[])
        AND s.drift_status IN ('accepted', 'reconciled')
      ORDER BY s.account_id, s.snapshot_at::date, s.snapshot_at DESC, s.created_at DESC
    `,
    [accountIds, dates]
  )

  return new Map(protectedRows.map(row => [evidenceKey(row.account_id, row.balance_date), row]))
}

const classifyRow = ({
  row,
  policy,
  maxAbsDriftCents,
  protectedEvidence,
  outOfPolicy
}: {
  row: AccountBalancesFxDriftRow
  policy: FxDriftRemediationPolicy
  maxAbsDriftCents: bigint
  protectedEvidence: ProtectedEvidenceRow | undefined
  outOfPolicy: boolean
}): FxDriftRemediationDecision => {
  const baseEvidence = {
    currency: row.currency,
    isPeriodClosed: row.isPeriodClosed,
    transactionCount: row.transactionCount,
    persistedInflowsClp: row.persistedInflowsClp,
    persistedOutflowsClp: row.persistedOutflowsClp,
    persistedClosingBalanceClp: row.persistedClosingBalanceClp,
    expectedInflowsClp: row.expectedInflowsClp,
    expectedOutflowsClp: row.expectedOutflowsClp,
    expectedClosingBalanceClp: row.expectedClosingBalanceClp,
    evidenceRefs: row.evidenceRefs,
    protectedEvidence: protectedEvidence
      ? {
          snapshotId: protectedEvidence.snapshot_id,
          driftStatus: protectedEvidence.drift_status
        }
      : null,
    knownSeedBlindSpotSignature: matchesKnownSeedBlindSpotSignature(row)
  }

  if (outOfPolicy || absCents(row.absDriftClp) > maxAbsDriftCents) {
    return {
      accountId: row.accountId,
      accountName: row.accountName,
      balanceDate: row.balanceDate,
      driftClp: row.driftClp,
      absDriftClp: row.absDriftClp,
      decision: 'blocked_out_of_policy',
      reason: outOfPolicy ? 'bounded_run_limits_exceeded' : 'max_abs_drift_clp_exceeded',
      evidence: baseEvidence
    }
  }

  if (!hasSourceEvidence(row)) {
    return {
      accountId: row.accountId,
      accountName: row.accountName,
      balanceDate: row.balanceDate,
      driftClp: row.driftClp,
      absDriftClp: row.absDriftClp,
      decision: 'unknown_requires_review',
      reason: 'detector_found_drift_without_source_movement_evidence',
      evidence: baseEvidence
    }
  }

  if (row.isPeriodClosed || protectedEvidence) {
    if (
      policy === 'known_bug_class_restatement' &&
      protectedEvidence &&
      matchesKnownSeedBlindSpotSignature(row)
    ) {
      return {
        accountId: row.accountId,
        accountName: row.accountName,
        balanceDate: row.balanceDate,
        driftClp: row.driftClp,
        absDriftClp: row.absDriftClp,
        decision: 'known_bug_class_restatement',
        reason: 'issue_069_seed_blind_spot_signature_with_protected_evidence',
        evidence: baseEvidence
      }
    }

    return {
      accountId: row.accountId,
      accountName: row.accountName,
      balanceDate: row.balanceDate,
      driftClp: row.driftClp,
      absDriftClp: row.absDriftClp,
      decision: 'blocked_reconciled_or_closed',
      reason: row.isPeriodClosed ? 'period_closed' : 'accepted_or_reconciled_snapshot_exists',
      evidence: baseEvidence
    }
  }

  if (policy === 'strict_no_restatement' && matchesKnownSeedBlindSpotSignature(row)) {
    return {
      accountId: row.accountId,
      accountName: row.accountName,
      balanceDate: row.balanceDate,
      driftClp: row.driftClp,
      absDriftClp: row.absDriftClp,
      decision: 'auto_remediable',
      reason: 'open_period_drift_with_source_evidence_strict_policy_allows_no_protected_restatement',
      evidence: baseEvidence
    }
  }

  // TASK-871 — canonical narrow-scope policy for recent seed-blind-spot
  // drift. Matches when the row signature is the well-known
  // ISSUE-069/TASK-871 pattern, the period is open, and there is no
  // protected snapshot on the exact affected day. The executor uses the
  // canonical rolling window primitive + clean seed resolver to repair the
  // drift without touching protected closings.
  if (policy === 'rolling_window_repair' && matchesKnownSeedBlindSpotSignature(row)) {
    return {
      accountId: row.accountId,
      accountName: row.accountName,
      balanceDate: row.balanceDate,
      driftClp: row.driftClp,
      absDriftClp: row.absDriftClp,
      decision: 'auto_remediable',
      reason: 'rolling_window_repair_eligible',
      evidence: baseEvidence
    }
  }

  // TASK-871 — when policy is rolling_window_repair but the row does NOT
  // match the seed-blind-spot signature (e.g. drift caused by a different
  // bug class), keep it visible as `unknown_requires_review` so a human
  // can triage. Avoid silently auto-remediating drift the policy was not
  // designed for.
  if (policy === 'rolling_window_repair') {
    return {
      accountId: row.accountId,
      accountName: row.accountName,
      balanceDate: row.balanceDate,
      driftClp: row.driftClp,
      absDriftClp: row.absDriftClp,
      decision: 'unknown_requires_review',
      reason: 'rolling_window_repair_signature_mismatch',
      evidence: baseEvidence
    }
  }

  return {
    accountId: row.accountId,
    accountName: row.accountName,
    balanceDate: row.balanceDate,
    driftClp: row.driftClp,
    absDriftClp: row.absDriftClp,
    decision: 'auto_remediable',
    reason: policy === 'detect_only' ? 'eligible_but_detect_only_policy' : 'open_period_drift_with_source_evidence',
    evidence: baseEvidence
  }
}

export const planAccountBalancesFxDriftRemediation = async (
  input: FxDriftRemediationInput = {}
): Promise<FxDriftRemediationPlan> => {
  const policy = input.policy ?? DEFAULT_POLICY
  const dryRun = input.dryRun ?? policy === 'detect_only'
  const windowDays = clampInteger(input.windowDays, DEFAULT_WINDOW_DAYS, 1, 365)
  const maxRows = clampInteger(input.maxRows, DEFAULT_MAX_ROWS, 1, 500)
  const maxAccounts = clampInteger(input.maxAccounts, DEFAULT_MAX_ACCOUNTS, 1, 100)
  const maxAbsDriftClp = input.maxAbsDriftClp ?? DEFAULT_MAX_ABS_DRIFT_CLP

  const rows = await listAccountBalancesFxDriftRows({
    windowDays,
    accountId: input.accountId,
    fromDate: normalizeDate(input.fromDate),
    toDate: normalizeDate(input.toDate),
    limit: maxRows + 1
  })

  const visibleRows = rows.slice(0, maxRows)
  const accountIds = [...new Set(visibleRows.map(row => row.accountId))]

  const overflow = {
    rows: rows.length > maxRows,
    accounts: accountIds.length > maxAccounts
  }

  const protectedEvidence = await listProtectedEvidence(visibleRows)
  const maxAbsDriftCents = absCents(maxAbsDriftClp)

  const decisions = visibleRows.map(row =>
    classifyRow({
      row,
      policy,
      maxAbsDriftCents,
      protectedEvidence: protectedEvidence.get(evidenceKey(row.accountId, row.balanceDate)),
      outOfPolicy: overflow.rows || overflow.accounts
    })
  )

  return {
    policy,
    dryRun,
    windowDays,
    maxRows,
    maxAccounts,
    maxAbsDriftClp,
    driftRowsSeen: visibleRows.length,
    accountsSeen: accountIds.length,
    overflow,
    decisions
  }
}

const buildRunId = () => `finance-fx-drift-${randomUUID()}`

const summarizeNotes = (result: Partial<FxDriftRemediationResult>) =>
  [
    `policy=${result.policy ?? 'unknown'}`,
    `dryRun=${String(result.dryRun ?? false)}`,
    `seen=${result.driftRowsSeen ?? 0}`,
    `remediated=${result.driftRowsRemediated ?? 0}`,
    `blocked=${result.driftRowsBlocked ?? 0}`,
    `accounts=${result.accountsSeen ?? 0}`,
    `accountsRematerialized=${result.accountsRematerialized ?? 0}`,
    `residual=${result.residualDriftCount ?? 0}`
  ].join('; ')

const writeRunStart = async ({ runId, input }: { runId: string; input: FxDriftRemediationInput }) => {
  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_sync.source_sync_runs (
        sync_run_id, source_system, source_object_type, sync_mode, status,
        triggered_by, notes, started_at, created_at
      )
      VALUES ($1, 'finance', 'account_balances_fx_drift_remediation', 'repair', 'running', $2, $3, NOW(), NOW())
      ON CONFLICT (sync_run_id) DO NOTHING
    `,
    [
      runId,
      input.triggeredBy ?? 'ops_worker',
      `policy=${input.policy ?? DEFAULT_POLICY}; dryRun=${String(input.dryRun ?? input.policy === 'detect_only')}`
    ]
  )
}

const writeRunComplete = async (runId: string, result: FxDriftRemediationResult) => {
  const status = result.status === 'failed' ? 'failed' : result.status === 'partial' ? 'partial' : 'succeeded'

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_sync.source_sync_runs
      SET
        status = $2,
        finished_at = NOW(),
        records_read = $3,
        records_written_raw = $4,
        records_written_conformed = $5,
        records_projected_postgres = $6,
        notes = $7
      WHERE sync_run_id = $1
    `,
    [
      runId,
      status,
      result.driftRowsSeen,
      result.driftRowsBlocked,
      result.driftRowsRemediated,
      result.accountsRematerialized,
      summarizeNotes(result)
    ]
  )
}

const writeRunFailure = async (runId: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  await runGreenhousePostgresQuery(
    `
      UPDATE greenhouse_sync.source_sync_runs
      SET status = 'failed', finished_at = NOW(), notes = $2
      WHERE sync_run_id = $1
    `,
    [runId, `failed: ${message.slice(0, 500)}`]
  )

  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_sync.source_sync_failures (
        sync_failure_id, sync_run_id, source_system, source_object_type,
        source_object_id, error_code, error_message, payload_json, retryable, created_at
      )
      VALUES ($1, $2, 'finance', 'account_balances_fx_drift_remediation',
        $3, 'FX_DRIFT_REMEDIATION_FAILED', $4, $5::jsonb, TRUE, NOW())
    `,
    [
      `finance-fx-drift-failure-${randomUUID()}`,
      runId,
      runId,
      message.slice(0, 1000),
      JSON.stringify({ message: message.slice(0, 1000) })
    ]
  )
}

const monthKeysForRange = (accountId: string, fromDate: string, toDate: string) => {
  const out: Array<{ accountId: string; year: number; month: number }> = []
  const cursor = new Date(`${fromDate}T00:00:00.000Z`)
  const stop = new Date(`${toDate}T00:00:00.000Z`)

  cursor.setUTCDate(1)
  stop.setUTCDate(1)

  while (cursor.getTime() <= stop.getTime()) {
    out.push({
      accountId,
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return out
}

const determineStatus = (result: Omit<FxDriftRemediationResult, 'status'>): FxDriftRemediationStatus => {
  if (result.residualDriftCount > 0 && result.accountsRematerialized > 0) return 'partial'
  if (result.driftRowsBlocked > 0 && result.accountsRematerialized > 0) return 'partial'
  if (result.driftRowsBlocked > 0 && result.accountsRematerialized === 0) return 'blocked'

  return 'succeeded'
}

export const remediateAccountBalancesFxDrift = async (
  input: FxDriftRemediationInput = {}
): Promise<FxDriftRemediationResult> => {
  const syncRunId = buildRunId()

  await writeRunStart({ runId: syncRunId, input })

  try {
    const plan = await planAccountBalancesFxDriftRemediation(input)

    const eligible = plan.decisions.filter(decision =>
      decision.decision === 'auto_remediable' || decision.decision === 'known_bug_class_restatement'
    )

    const blocked = plan.decisions.length - eligible.length
    const runs: FxDriftRemediationAccountRun[] = []

    if (!plan.dryRun && eligible.length > 0) {
      const byAccount = new Map<string, FxDriftRemediationDecision[]>()

      for (const decision of eligible) {
        const accountDecisions = byAccount.get(decision.accountId) ?? []

        accountDecisions.push(decision)
        byAccount.set(decision.accountId, accountDecisions)
      }

      // TASK-871 — adapter so `resolveCleanSeedDate` (Pick<PoolClient, 'query'>)
      // can run against `runGreenhousePostgresQuery` (pool-managed, read-only).
      // The check is idempotent; racing against in-flight settlement legs is
      // acceptable — the reliability signal catches any drift on the next run.
      const queryAdapter = {
        query: async <T extends Record<string, unknown>>(sql: string, params: readonly unknown[]) => {
          const rows = await runGreenhousePostgresQuery<T>(sql, params as unknown[])

          return { rows } as { rows: T[] }
        }
      }

      for (const [accountId, decisions] of byAccount) {
        const fromDate = decisions.map(decision => decision.balanceDate).sort()[0]
        const toDate = normalizeDate(input.toDate) ?? todayYmd()
        const hasKnownRestatement = decisions.some(decision => decision.decision === 'known_bug_class_restatement')

        const isRollingWindowRepair = decisions.every(
          decision => decision.reason === 'rolling_window_repair_eligible'
        )

        // TASK-871 — canonical rolling repair path. Uses `seedMode='explicit'`
        // so the OTB declaration cache is not mutated, and resolves the seed
        // via the integrity check helper to guarantee the mute anchor is
        // movement-free.
        if (isRollingWindowRepair) {
          const candidateSeed = subOneDayIso(fromDate)

          const integrity = await resolveCleanSeedDate({
            client: queryAdapter as never,
            accountId,
            candidateSeedDate: candidateSeed
          })

          if (!integrity.ok) {
            runs.push({
              accountId,
              fromDate: candidateSeed,
              toDate,
              evidenceGuardMode: 'block_on_reconciled_drift',
              seedMode: 'explicit',
              skipped: {
                reason: 'integrity_check_exceeded_max_expand',
                originalSeed: integrity.originalSeed,
                lastCheckedSeed: integrity.lastCheckedSeed,
                daysExpanded: integrity.daysExpanded
              }
            })

            continue
          }

          // Read previous closing as opening seed. With `seedMode='explicit'`
          // the rematerializer trusts the supplied opening; we use the
          // closing of the latest snapshot at or before the clean seed.
          const seedRow = await runGreenhousePostgresQuery<{ closing_balance: string }>(
            `SELECT closing_balance::text
             FROM greenhouse_finance.account_balances
             WHERE account_id = $1 AND balance_date <= $2::date
             ORDER BY balance_date DESC LIMIT 1`,
            [accountId, integrity.cleanSeed]
          )

          const opening = seedRow.length > 0 ? Number(seedRow[0].closing_balance) : 0

          const rematerialized = await rematerializeAccountBalanceRange({
            accountId,
            seedDate: integrity.cleanSeed,
            openingBalance: opening,
            endDate: toDate,
            seedMode: 'explicit',
            evidenceGuard: { mode: 'block_on_reconciled_drift' }
          })

          const monthly = await refreshMonthlyBatch(
            monthKeysForRange(accountId, rematerialized.seedDate, toDate)
          )

          runs.push({
            accountId,
            fromDate: rematerialized.seedDate,
            toDate: rematerialized.endDate,
            daysMaterialized: rematerialized.daysMaterialized,
            finalClosingBalance: String(rematerialized.finalClosingBalance),
            evidenceGuardMode: 'block_on_reconciled_drift',
            seedMode: 'explicit',
            cleanSeedExpansion: integrity.daysExpanded > 0
              ? {
                  originalSeed: integrity.originalSeed,
                  cleanSeed: integrity.cleanSeed,
                  daysExpanded: integrity.daysExpanded
                }
              : undefined,
            monthlyRefreshed: monthly.refreshed,
            monthlySkipped: monthly.skipped
          })

          continue
        }

        const evidenceGuardMode = hasKnownRestatement ? 'warn_only' : 'block_on_reconciled_drift'

        const rematerialized = await rematerializeAccountBalanceRange({
          accountId,
          seedDate: fromDate,
          openingBalance: 0,
          endDate: toDate,
          seedMode: 'active_otb',
          evidenceGuard: { mode: evidenceGuardMode }
        })

        const monthly = await refreshMonthlyBatch(monthKeysForRange(accountId, rematerialized.seedDate, toDate))

        runs.push({
          accountId,
          fromDate: rematerialized.seedDate,
          toDate: rematerialized.endDate,
          daysMaterialized: rematerialized.daysMaterialized,
          finalClosingBalance: String(rematerialized.finalClosingBalance),
          evidenceGuardMode,
          seedMode: 'active_otb',
          monthlyRefreshed: monthly.refreshed,
          monthlySkipped: monthly.skipped
        })
      }
    }

    const residualDriftCount = await countAccountBalancesFxDriftRows({
      windowDays: plan.windowDays,
      accountId: input.accountId,
      fromDate: normalizeDate(input.fromDate),
      toDate: normalizeDate(input.toDate)
    })

    // TASK-871 — `runs` may include accounts that were skipped by the
    // integrity check (`rolling_window_repair` path). Only count accounts
    // where the rematerializer actually executed.
    const accountsActuallyRematerialized = runs.filter(run => !run.skipped).length

    const resultWithoutStatus = {
      ...plan,
      syncRunId,
      driftRowsRemediated: plan.dryRun ? 0 : eligible.length,
      driftRowsBlocked: blocked,
      accountsRematerialized: accountsActuallyRematerialized,
      residualDriftCount,
      runs
    }

    const result: FxDriftRemediationResult = {
      ...resultWithoutStatus,
      status: determineStatus(resultWithoutStatus)
    }

    await writeRunComplete(syncRunId, result)

    return result
  } catch (error) {
    await writeRunFailure(syncRunId, error)

    return {
      policy: input.policy ?? DEFAULT_POLICY,
      dryRun: input.dryRun ?? input.policy === 'detect_only',
      windowDays: clampInteger(input.windowDays, DEFAULT_WINDOW_DAYS, 1, 365),
      maxRows: clampInteger(input.maxRows, DEFAULT_MAX_ROWS, 1, 500),
      maxAccounts: clampInteger(input.maxAccounts, DEFAULT_MAX_ACCOUNTS, 1, 100),
      maxAbsDriftClp: input.maxAbsDriftClp ?? DEFAULT_MAX_ABS_DRIFT_CLP,
      driftRowsSeen: 0,
      accountsSeen: 0,
      overflow: { rows: false, accounts: false },
      decisions: [],
      status: 'failed',
      syncRunId,
      driftRowsRemediated: 0,
      driftRowsBlocked: 0,
      accountsRematerialized: 0,
      residualDriftCount: 0,
      runs: [],
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
