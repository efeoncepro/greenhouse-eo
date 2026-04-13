import 'server-only'

import type { ReactiveConsumerResult } from '@/lib/sync/reactive-consumer'

import { readAllCircuitStates, type CircuitState } from './reactive-circuit-breaker'

/**
 * Cloud Monitoring custom-metric emitter for the V2 reactive pipeline
 * (TASK-379, Slice 4).
 *
 * Emits `custom.googleapis.com/greenhouse/reactive/*` time-series after every
 * consumer run so the ops dashboard + alerting policies have real signal.
 *
 * Design rules:
 *   - If `GCP_PROJECT` is missing → no-op + warn-once. The consumer must never
 *     crash because Cloud Monitoring isn't configured (local dev, unit tests,
 *     or a misconfigured preview environment).
 *   - Write errors are caught and logged to console.error — NEVER rethrown.
 *     A metric emission failure is a dropped data point, not an outage.
 *   - Monitored resource is always `global`. The reactive consumer runs from
 *     both Cloud Run (ops-worker) and Vercel fallback, and `global` is the
 *     canonical "no specific infra" resource type per the Cloud Monitoring
 *     docs.
 *   - The MetricServiceClient is lazy-initialized once per process and reused.
 *     Creating the client is expensive (grpc channels, credential lookup).
 */

// ── Types ──

export interface CustomMetric {

  /** Fully-qualified metric type, e.g. `custom.googleapis.com/greenhouse/reactive/backlog_depth`. */
  metricType: string

  /** Numeric sample value. */
  value: number

  /** Sample timestamp. Defaults to `new Date()` when omitted. */
  timestamp?: Date

  /** Optional metric labels (projection_name, domain, etc.). */
  labels?: Record<string, string>
}

export interface EmitConsumerRunMetricsOptions {

  /**
   * Optional domain label — applied to the global run-scoped metrics so
   * alerting can distinguish per-domain throughput when the ops-worker is
   * invoked with a domain-scoped scheduler.
   */
  domain?: string
}

// ── Metric type constants ──

export const REACTIVE_METRIC_TYPES = {
  backlogDepth: 'custom.googleapis.com/greenhouse/reactive/backlog_depth',
  lagSecondsP95: 'custom.googleapis.com/greenhouse/reactive/lag_seconds_p95',
  throughput: 'custom.googleapis.com/greenhouse/reactive/throughput_events_per_run',
  errorRate: 'custom.googleapis.com/greenhouse/reactive/error_rate',
  circuitBreakerState: 'custom.googleapis.com/greenhouse/reactive/circuit_breaker_state'
} as const

// ── Lazy singleton state ──

type MetricServiceClientShape = {
  projectPath: (project: string) => string
  createTimeSeries: (request: unknown) => Promise<unknown>
}

let clientPromise: Promise<MetricServiceClientShape | null> | null = null
let missingProjectWarningEmitted = false

/**
 * Defense-in-depth: never instantiate the SDK during unit tests. The
 * @google-cloud/monitoring client kicks off GoogleAuth metadata lookups in
 * the background that reject asynchronously when ADC is missing, producing
 * unhandled rejections that fail CI even when individual tests pass and
 * even when callers mock this module. Tests can still opt into the real
 * emitter by setting GREENHOUSE_REACTIVE_FORCE_REAL_EMITTER=1.
 */
const isTestEnvironment = (): boolean => {
  if (process.env.GREENHOUSE_REACTIVE_FORCE_REAL_EMITTER === '1') return false

  return Boolean(process.env.VITEST) || process.env.NODE_ENV === 'test'
}

const loadClient = async (): Promise<MetricServiceClientShape | null> => {
  if (isTestEnvironment()) {
    return null
  }

  const projectId = process.env.GCP_PROJECT?.trim()

  if (!projectId) {
    if (!missingProjectWarningEmitted) {
      missingProjectWarningEmitted = true
      console.warn(
        '[cloud-monitoring-emitter] GCP_PROJECT not set — custom metrics will be dropped. Set it on Cloud Run and Vercel to enable Cloud Monitoring emission.'
      )
    }

    return null
  }

  try {
    const mod = (await import('@google-cloud/monitoring')) as {
      MetricServiceClient: new () => MetricServiceClientShape
    }

    return new mod.MetricServiceClient()
  } catch (error) {
    console.error(
      '[cloud-monitoring-emitter] Failed to initialize MetricServiceClient. Metrics will be dropped.',
      error instanceof Error ? error.message : error
    )

    return null
  }
}

const getClient = async (): Promise<MetricServiceClientShape | null> => {
  if (!clientPromise) {
    clientPromise = loadClient()
  }

  return clientPromise
}

// ── Public API ──

/**
 * Emit a single custom metric sample. Never throws.
 */
export const emitCustomMetric = async (metric: CustomMetric): Promise<void> => {
  await emitCustomMetrics([metric])
}

/**
 * Emit a batch of custom metrics in a single `createTimeSeries` RPC.
 *
 * Cloud Monitoring accepts up to 200 time series per request — callers should
 * keep their batches well below that (the V2 consumer emits ~5 + one per
 * projection). We do NOT split batches here; it's the caller's responsibility.
 *
 * Never throws. On any failure — missing project, unreachable API, invalid
 * payload — the error is logged and the call resolves successfully.
 */
export const emitCustomMetrics = async (metrics: CustomMetric[]): Promise<void> => {
  if (metrics.length === 0) return

  const projectId = process.env.GCP_PROJECT?.trim()

  if (!projectId) {
    // Warn-once and bail. Already handled inside loadClient() but we short
    // circuit here to avoid touching the client if there's nothing to do.
    if (!missingProjectWarningEmitted) {
      missingProjectWarningEmitted = true
      console.warn(
        '[cloud-monitoring-emitter] GCP_PROJECT not set — dropping %d metric(s).',
        metrics.length
      )
    }

    return
  }

  const client = await getClient()

  if (!client) return

  try {
    const timeSeries = metrics.map(metric => {
      const seconds = Math.floor((metric.timestamp ?? new Date()).getTime() / 1000)

      return {
        metric: {
          type: metric.metricType,
          labels: metric.labels ?? {}
        },
        resource: {
          type: 'global',
          labels: { project_id: projectId }
        },
        points: [
          {
            interval: {
              endTime: { seconds }
            },
            value: {
              doubleValue: Number.isFinite(metric.value) ? metric.value : 0
            }
          }
        ]
      }
    })

    await client.createTimeSeries({
      name: client.projectPath(projectId),
      timeSeries
    })
  } catch (error) {
    console.error(
      '[cloud-monitoring-emitter] createTimeSeries failed (dropping %d metric(s)):',
      metrics.length,
      error instanceof Error ? error.message : error
    )
  }
}

// ── Circuit-breaker state mapping ──

const circuitStateToGauge = (state: CircuitState): number => {
  if (state === 'closed') return 0
  if (state === 'half_open') return 1

  return 2
}

// ── Consumer run → metric mapping ──

/**
 * Translate a `ReactiveConsumerResult` into the 5 canonical Cloud Monitoring
 * metrics and emit them in one batch RPC. Safe to call from either the V2
 * consumer or the ops-worker HTTP handlers.
 *
 * Wrap this call in try/catch at the callsite for defense in depth — the
 * function already catches internally, but a caller-side catch lets us also
 * trap any unexpected synchronous throw (e.g. a malformed result shape).
 */
export const emitConsumerRunMetrics = async (
  result: ReactiveConsumerResult,
  opts: EmitConsumerRunMetricsOptions = {}
): Promise<void> => {
  const timestamp = new Date()
  const domainLabel = opts.domain ?? 'all'
  const metrics: CustomMetric[] = []

  // 1. backlog_depth — total events fetched into this run.
  metrics.push({
    metricType: REACTIVE_METRIC_TYPES.backlogDepth,
    value: result.eventsFetched,
    timestamp,
    labels: { domain: domainLabel }
  })

  // 3. throughput_events_per_run — events acknowledged during this run.
  metrics.push({
    metricType: REACTIVE_METRIC_TYPES.throughput,
    value: result.eventsAcknowledged,
    timestamp,
    labels: { domain: domainLabel }
  })

  // 2. lag_seconds_p95 and 4. error_rate — per projection.
  //
  // NOTE: "P95" is aspirational. Until we persist per-event latency samples,
  // the closest honest signal we can emit from an in-run summary is the
  // average latency per coalesced scope group. The metric type is named
  // "lag_seconds_p95" to reserve the SLO contract; the value is an average
  // for now and should be revisited when per-event latency sampling lands.
  for (const stats of Object.values(result.perProjection ?? {})) {
    const projectionLabels = {
      projection_name: stats.projectionName,
      domain: domainLabel
    }

    const effectiveGroups = stats.scopesCoalesced + stats.breakerSkips
    const avgLatencyMs = effectiveGroups > 0 ? stats.totalLatencyMs / effectiveGroups : 0

    metrics.push({
      metricType: REACTIVE_METRIC_TYPES.lagSecondsP95,
      value: avgLatencyMs / 1000,
      timestamp,
      labels: projectionLabels
    })

    const attempts = stats.successes + stats.failures
    const errorRate = attempts > 0 ? stats.failures / attempts : 0

    metrics.push({
      metricType: REACTIVE_METRIC_TYPES.errorRate,
      value: errorRate,
      timestamp,
      labels: projectionLabels
    })
  }

  // 5. circuit_breaker_state — per projection, pulled from persisted state.
  //
  // We query the breaker state table at emission time instead of trying to
  // reconstruct it from `result` because half-open probes and cooldown
  // transitions happen outside the consumer's view (recorded by
  // evaluateCircuit + recordFailure helpers). This gives the dashboard a
  // truthful snapshot of the quarantine state.
  try {
    const states = await readAllCircuitStates()

    for (const snapshot of states) {
      metrics.push({
        metricType: REACTIVE_METRIC_TYPES.circuitBreakerState,
        value: circuitStateToGauge(snapshot.state),
        timestamp,
        labels: { projection_name: snapshot.projectionName }
      })
    }
  } catch (error) {
    console.error(
      '[cloud-monitoring-emitter] readAllCircuitStates failed — circuit_breaker_state metric skipped for this run.',
      error instanceof Error ? error.message : error
    )
  }

  await emitCustomMetrics(metrics)
}

/**
 * Test-only helper: reset the lazy client so unit tests don't leak state
 * between runs. Production code should never call this.
 */
export const __resetCloudMonitoringEmitterForTests = () => {
  clientPromise = null
  missingProjectWarningEmitted = false
}
