import * as Sentry from '@sentry/node'

/**
 * Canonical Sentry init helper for Cloud Run Node services (TASK-844).
 * =====================================================================
 *
 * Each generic Node Cloud Run service in `services/<service>/server.ts` MUST call
 * `initSentryForService(serviceName)` as the first line of execution, BEFORE
 * any import of `@/lib/**`. This initializes the global `@sentry/node` hub
 * which the canonical wrapper `captureWithDomain` (in `src/lib/observability/
 * capture.ts`) depends on.
 *
 * Why this exists:
 *   - `@sentry/nextjs` only initializes via Next.js framework hooks
 *     (`instrumentation.register`, `withSentryConfig`). Generic Node services
 *     never trigger those hooks.
 *   - The shared `src/lib/**` code uses `captureWithDomain` which calls
 *     `Sentry.captureException`. Without an init, the hub falls back to
 *     no-op AT BEST and crashes with `is not a function` in some bundles.
 *   - Per ISSUE-074: TASK-813b reactive consumer (`hubspot_services_intake`)
 *     fails in ops-worker because no init runs. Same risk for any Cloud Run
 *     service that imports shared lib code.
 *
 * Contract:
 *   - DSN missing: `console.warn` once + return null. Captures still work as
 *     no-ops (Sentry SDK handles this gracefully).
 *   - DSN present: initializes the hub with the canonical environment +
 *     server name + release tags, returns the Sentry client.
 *   - Idempotent: Sentry hub is global. Calling init twice is safe.
 *
 * Used by:
 *   - `services/ops-worker/server.ts`
 *   - `services/commercial-cost-worker/server.ts`
 *   - `services/ico-batch/server.ts`
 *   - Any future Cloud Run Node service that imports `@/lib/observability/capture`
 *
 * NOT used by:
 *   - `services/hubspot_greenhouse_integration/` (Python — separate Sentry SDK if needed)
 *   - Vercel/Next.js runtime (uses `@sentry/nextjs` via `withSentryConfig` +
 *     `instrumentation.ts` + `sentry.server.config.ts`)
 */

let initialized = false

export interface InitSentryForServiceOptions {
  /** Override env name. Defaults to NODE_ENV or 'production'. */
  environment?: string
  /** Optional release identifier (commit SHA, build number). Defaults to env SENTRY_RELEASE. */
  release?: string
  /** Optional sample rate for traces. Defaults to 0 (performance disabled). */
  tracesSampleRate?: number
}

export const initSentryForService = (
  serviceName: string,
  options: InitSentryForServiceOptions = {}
): void => {
  if (initialized) {
    return
  }

  const dsn = process.env.SENTRY_DSN?.trim()

  if (!dsn) {
    console.warn(
      `[sentry-init] ${serviceName}: SENTRY_DSN not configured — observability degraded ` +
        `(captureWithDomain will no-op). Errors will only be captured by Cloud Logging stderr.`
    )
    initialized = true

    return
  }

  Sentry.init({
    dsn,
    environment: options.environment ?? process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'production',
    serverName: serviceName,
    release: options.release ?? process.env.SENTRY_RELEASE,
    tracesSampleRate: options.tracesSampleRate ?? 0
  })

  Sentry.setTag('service', serviceName)

  initialized = true
}

/** Internal hook used by tests to reset the singleton. NEVER call from production code. */
export const __resetSentryInitForTests = () => {
  initialized = false
}
