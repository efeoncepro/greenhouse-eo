import 'server-only'

import { redactErrorForResponse } from '@/lib/observability/redact'
import type { PlatformHealthSourceStatusKind } from '@/types/platform-health'

/**
 * Source-level timeout + fallback wrapper.
 *
 * Wraps each reader call inside the Platform Health composer with a
 * deterministic budget. A slow or broken source produces a structured
 * `SourceResult` with `status='timeout'` or `'error'` instead of
 * propagating the rejection up the chain. The composer then degrades
 * the overall response honestly (lowering confidence, populating
 * `degradedSources[]`) instead of returning a 500 to the caller.
 *
 * Reusable beyond Platform Health: TASK-657 (degraded modes / dependency
 * health) is expected to use the same wrapper for its per-resource
 * dependency probes. Keep the contract small and stable.
 *
 * Spec: docs/tasks/in-progress/TASK-672-platform-health-api-contract.md
 */

export interface SourceResult<T> {
  source: string
  status: PlatformHealthSourceStatusKind
  value: T | null
  observedAt: string
  durationMs: number
  error: string | null
}

export interface WithSourceTimeoutOptions<T> {
  /** Logical name of the source — appears in degradedSources + logs. */
  source: string
  /** Hard deadline. Default 4_000ms — fast enough to keep the composer < 10s. */
  timeoutMs?: number
  /**
   * Optional unavailability sentinel. If the producer signals "feature off"
   * via a known sentinel value, callers can return `'not_configured'`
   * instead of `'ok'`. The composer then treats it as a degraded source
   * (low confidence) without raising an error.
   */
  isUnavailable?: (value: T) => boolean
}

const DEFAULT_TIMEOUT_MS = 4_000

/**
 * Race the producer against a timer. The producer keeps running on
 * timeout (we cannot cancel a Promise) but its eventual result is
 * discarded — the composer already moved on.
 */
export const withSourceTimeout = async <T>(
  produce: () => Promise<T>,
  options: WithSourceTimeoutOptions<T>
): Promise<SourceResult<T>> => {
  const startedAt = Date.now()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  let timer: ReturnType<typeof setTimeout> | null = null

  const timeout = new Promise<{ kind: 'timeout' }>(resolve => {
    timer = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs)
  })

  try {
    const result = await Promise.race([
      produce().then(value => ({ kind: 'ok' as const, value })),
      timeout
    ])

    if (timer) clearTimeout(timer)

    if (result.kind === 'timeout') {
      return {
        source: options.source,
        status: 'timeout',
        value: null,
        observedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        error: `source '${options.source}' exceeded ${timeoutMs}ms budget`
      }
    }

    if (options.isUnavailable && options.isUnavailable(result.value)) {
      return {
        source: options.source,
        status: 'not_configured',
        value: result.value,
        observedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        error: null
      }
    }

    return {
      source: options.source,
      status: 'ok',
      value: result.value,
      observedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      error: null
    }
  } catch (error) {
    if (timer) clearTimeout(timer)

    return {
      source: options.source,
      status: 'error',
      value: null,
      observedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      error: redactErrorForResponse(error)
    }
  }
}

export const isSourceDegraded = <T>(result: SourceResult<T>): boolean =>
  result.status !== 'ok'
