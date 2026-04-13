import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Per-projection circuit breaker for the V2 reactive consumer (TASK-379).
 *
 * Why this exists: when one projection starts failing systematically, the V1
 * consumer kept retrying it on every batch and starved the rest of the queue.
 * The breaker isolates failure domains so a sick projection cannot block its
 * peers — it gets quarantined for a cooldown window, is probed once when the
 * window expires, and either recovers or stays quarantined.
 *
 * State machine:
 *   closed     → normal processing.
 *   open       → quarantine. Consumer skips this projection until cooldown.
 *   half_open  → probe one event. Success → closed. Failure → re-opens with
 *                a fresh cooldown.
 */

export type CircuitState = 'closed' | 'open' | 'half_open'

export interface CircuitBreakerConfig {

  /** Minimum runs in the rolling window before failure rate is evaluated. */
  minimumRunsForEvaluation: number

  /** Failure rate threshold (0..1) that trips the breaker once minimum runs is reached. */
  failureRateThreshold: number

  /** Consecutive failures that immediately trip the breaker, regardless of rate. */
  consecutiveFailureThreshold: number

  /** How long an open breaker waits before transitioning to half_open. */
  cooldownMs: number

  /** Maximum size of the rolling window before counters reset. */
  rollingWindowSize: number
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  minimumRunsForEvaluation: 10,
  failureRateThreshold: 0.5,
  consecutiveFailureThreshold: 5,
  cooldownMs: 30 * 60 * 1000, // 30 minutes
  rollingWindowSize: 50
}

interface CircuitStateRow extends Record<string, unknown> {
  projection_name: string
  state: CircuitState
  consecutive_failures: number
  total_runs_window: number
  failed_runs_window: number
  window_started_at: string
  opened_at: string | null
  half_open_probe_at: string | null
  last_error: string | null
  last_failure_at: string | null
  last_success_at: string | null
  updated_at: string
}

const parseRow = (row: CircuitStateRow): CircuitBreakerSnapshot => ({
  projectionName: row.projection_name,
  state: row.state,
  consecutiveFailures: Number(row.consecutive_failures) || 0,
  totalRunsWindow: Number(row.total_runs_window) || 0,
  failedRunsWindow: Number(row.failed_runs_window) || 0,
  windowStartedAt: row.window_started_at,
  openedAt: row.opened_at,
  halfOpenProbeAt: row.half_open_probe_at,
  lastError: row.last_error,
  lastFailureAt: row.last_failure_at,
  lastSuccessAt: row.last_success_at,
  updatedAt: row.updated_at
})

export interface CircuitBreakerSnapshot {
  projectionName: string
  state: CircuitState
  consecutiveFailures: number
  totalRunsWindow: number
  failedRunsWindow: number
  windowStartedAt: string
  openedAt: string | null
  halfOpenProbeAt: string | null
  lastError: string | null
  lastFailureAt: string | null
  lastSuccessAt: string | null
  updatedAt: string
}

export const readCircuitState = async (projectionName: string): Promise<CircuitBreakerSnapshot | null> => {
  const rows = await runGreenhousePostgresQuery<CircuitStateRow>(
    `SELECT projection_name, state, consecutive_failures, total_runs_window, failed_runs_window,
            window_started_at::text, opened_at::text, half_open_probe_at::text,
            last_error, last_failure_at::text, last_success_at::text, updated_at::text
       FROM greenhouse_sync.projection_circuit_state
      WHERE projection_name = $1`,
    [projectionName]
  )

  if (rows.length === 0) return null

  return parseRow(rows[0])
}

export const readAllCircuitStates = async (): Promise<CircuitBreakerSnapshot[]> => {
  const rows = await runGreenhousePostgresQuery<CircuitStateRow>(
    `SELECT projection_name, state, consecutive_failures, total_runs_window, failed_runs_window,
            window_started_at::text, opened_at::text, half_open_probe_at::text,
            last_error, last_failure_at::text, last_success_at::text, updated_at::text
       FROM greenhouse_sync.projection_circuit_state
      ORDER BY state DESC, projection_name ASC`
  )

  return rows.map(parseRow)
}

/**
 * Decide whether the consumer can dispatch work to this projection right now.
 * Returns:
 *   - { allow: true, mode: 'normal' } when the breaker is closed.
 *   - { allow: true, mode: 'probe' }  when the breaker is half_open and we
 *     should try exactly one event to decide whether to recover.
 *   - { allow: false, ... }           when the breaker is open and still in
 *     cooldown.
 *
 * Side effect: an open breaker whose cooldown elapsed is transitioned to
 * half_open here so the next caller observes the probe state. The transition
 * is idempotent — concurrent callers race safely because the UPDATE only
 * fires when the current state is still 'open'.
 */
export const evaluateCircuit = async (
  projectionName: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
  now: Date = new Date()
): Promise<{ allow: boolean; mode: 'normal' | 'probe' | 'blocked'; snapshot: CircuitBreakerSnapshot | null }> => {
  const snapshot = await readCircuitState(projectionName)

  if (!snapshot || snapshot.state === 'closed') {
    return { allow: true, mode: 'normal', snapshot }
  }

  if (snapshot.state === 'half_open') {
    return { allow: true, mode: 'probe', snapshot }
  }

  // state === 'open'
  const openedAtMs = snapshot.openedAt ? new Date(snapshot.openedAt).getTime() : 0
  const cooldownExpired = openedAtMs > 0 && now.getTime() - openedAtMs >= config.cooldownMs

  if (!cooldownExpired) {
    return { allow: false, mode: 'blocked', snapshot }
  }

  // Cooldown elapsed — transition to half_open. Race-safe via WHERE state = 'open'.
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.projection_circuit_state
        SET state = 'half_open',
            half_open_probe_at = $2::timestamptz,
            updated_at = $2::timestamptz
      WHERE projection_name = $1
        AND state = 'open'`,
    [projectionName, now.toISOString()]
  )

  const refreshed = await readCircuitState(projectionName)

  return { allow: true, mode: 'probe', snapshot: refreshed }
}

/**
 * Record a successful run. Closes the breaker (from any state) and resets
 * counters when the rolling window is exhausted.
 */
export const recordSuccess = async (
  projectionName: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
  now: Date = new Date()
): Promise<void> => {
  const nowIso = now.toISOString()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.projection_circuit_state (
        projection_name, state, consecutive_failures,
        total_runs_window, failed_runs_window, window_started_at,
        opened_at, half_open_probe_at, last_error, last_failure_at, last_success_at, updated_at
      )
      VALUES ($1, 'closed', 0, 1, 0, $2::timestamptz, NULL, NULL, NULL, NULL, $2::timestamptz, $2::timestamptz)
      ON CONFLICT (projection_name) DO UPDATE SET
        state = 'closed',
        consecutive_failures = 0,
        total_runs_window = CASE
          WHEN greenhouse_sync.projection_circuit_state.total_runs_window >= $3
            THEN 1
          ELSE greenhouse_sync.projection_circuit_state.total_runs_window + 1
        END,
        failed_runs_window = CASE
          WHEN greenhouse_sync.projection_circuit_state.total_runs_window >= $3
            THEN 0
          ELSE greenhouse_sync.projection_circuit_state.failed_runs_window
        END,
        window_started_at = CASE
          WHEN greenhouse_sync.projection_circuit_state.total_runs_window >= $3
            THEN $2::timestamptz
          ELSE greenhouse_sync.projection_circuit_state.window_started_at
        END,
        opened_at = NULL,
        half_open_probe_at = NULL,
        last_success_at = $2::timestamptz,
        updated_at = $2::timestamptz`,
    [projectionName, nowIso, config.rollingWindowSize]
  )
}

/**
 * Record a failed run. Tracks consecutive failures and rolling failure rate;
 * trips the breaker to 'open' once either threshold is breached.
 */
export const recordFailure = async (
  projectionName: string,
  errorMessage: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
  now: Date = new Date()
): Promise<CircuitBreakerSnapshot> => {
  const nowIso = now.toISOString()
  const truncatedError = errorMessage.length > 1000 ? `${errorMessage.slice(0, 997)}...` : errorMessage

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.projection_circuit_state (
        projection_name, state, consecutive_failures,
        total_runs_window, failed_runs_window, window_started_at,
        opened_at, half_open_probe_at, last_error, last_failure_at, last_success_at, updated_at
      )
      VALUES ($1, 'closed', 1, 1, 1, $2::timestamptz, NULL, NULL, $3, $2::timestamptz, NULL, $2::timestamptz)
      ON CONFLICT (projection_name) DO UPDATE SET
        consecutive_failures = greenhouse_sync.projection_circuit_state.consecutive_failures + 1,
        total_runs_window = CASE
          WHEN greenhouse_sync.projection_circuit_state.total_runs_window >= $4
            THEN 1
          ELSE greenhouse_sync.projection_circuit_state.total_runs_window + 1
        END,
        failed_runs_window = CASE
          WHEN greenhouse_sync.projection_circuit_state.total_runs_window >= $4
            THEN 1
          ELSE greenhouse_sync.projection_circuit_state.failed_runs_window + 1
        END,
        window_started_at = CASE
          WHEN greenhouse_sync.projection_circuit_state.total_runs_window >= $4
            THEN $2::timestamptz
          ELSE greenhouse_sync.projection_circuit_state.window_started_at
        END,
        last_error = $3,
        last_failure_at = $2::timestamptz,
        updated_at = $2::timestamptz`,
    [projectionName, nowIso, truncatedError, config.rollingWindowSize]
  )

  const refreshed = await readCircuitState(projectionName)

  if (!refreshed) {
    throw new Error(`recordFailure(${projectionName}): failed to read back state after upsert`)
  }

  // Decide whether to trip the breaker.
  const consecutiveBreach = refreshed.consecutiveFailures >= config.consecutiveFailureThreshold

  const rateBreach =
    refreshed.totalRunsWindow >= config.minimumRunsForEvaluation &&
    refreshed.failedRunsWindow / refreshed.totalRunsWindow >= config.failureRateThreshold

  const wasHalfOpen = refreshed.halfOpenProbeAt !== null && refreshed.state !== 'open'

  if (consecutiveBreach || rateBreach || wasHalfOpen) {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_sync.projection_circuit_state
          SET state = 'open',
              opened_at = $2::timestamptz,
              half_open_probe_at = NULL,
              updated_at = $2::timestamptz
        WHERE projection_name = $1`,
      [projectionName, nowIso]
    )

    return (await readCircuitState(projectionName)) || refreshed
  }

  return refreshed
}

/**
 * Test-only helper: wipe a projection's circuit state. Production code never
 * calls this — use only in integration tests after they finish.
 */
export const __resetCircuitForTests = async (projectionName: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_sync.projection_circuit_state WHERE projection_name = $1`,
    [projectionName]
  )
}
