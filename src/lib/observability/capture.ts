import * as Sentry from '@sentry/node'

/**
 * Canonical Sentry capture wrapper that attaches a `domain` tag.
 * ===============================================================
 *
 * The reliability dashboard exposes one `incident` signal per module
 * (`finance`, `delivery`, `cloud`, `integrations.notion`, ...). Instead of
 * maintaining a Sentry project per module (operationally expensive — separate
 * DSNs, separate billing slices, separate alert rules), we tag every captured
 * exception with the originating domain. The reliability reader then queries
 * Sentry with `tags[domain]:<module>` to filter.
 *
 * Use this wrapper instead of `Sentry.captureException()` directly anywhere
 * the failure has a clear domain. Without the tag, the exception still lands
 * in Sentry but won't show up in any per-module incident signal.
 *
 * ## Runtime polymorphism (TASK-844)
 *
 * This wrapper imports `@sentry/node` (NOT `@sentry/nextjs`). `@sentry/node` is
 * the underlying Node SDK that `@sentry/nextjs` wraps. By importing the lower
 * layer, the same wrapper works in:
 *   - **Vercel/Next.js**: `@sentry/nextjs` initializes the global Sentry hub
 *     via `withSentryConfig` + `instrumentation.ts` + `sentry.server.config.ts`.
 *     `@sentry/node` accesses the same hub.
 *   - **Cloud Run generic Node services** (ops-worker, commercial-cost-worker,
 *     ico-batch): each service calls `initSentryForService(name)` from
 *     `services/_shared/sentry-init.ts` as the first line of `server.ts`,
 *     which directly initializes `@sentry/node`.
 *
 * Sentry's hub is a global singleton — both runtimes share the same hub once
 * any init path runs. If no init runs (DSN missing), the SDK falls back to
 * graceful no-op (captureException is still callable but does nothing).
 *
 * Example:
 *   import { captureWithDomain } from '@/lib/observability/capture'
 *
 *   try {
 *     await materializeVatLedgerForPeriod(...)
 *   } catch (err) {
 *     captureWithDomain(err, 'finance', { extra: { period: '2026-04' } })
 *     throw err
 *   }
 *
 * Domain values are short, stable, lowercase. Match them to the
 * `ReliabilityModuleKey` values in `src/types/reliability.ts` so the reader
 * can iterate the registry to discover the right tag per module.
 */

export type CaptureDomain =
  | 'cloud'
  | 'finance'
  | 'delivery'
  | 'people'
  | 'identity'
  | 'integrations.notion'
  | 'integrations.hubspot'
  | 'integrations.nubox'
  | 'integrations.teams'
  | 'commercial'
  | 'agency'
  | 'observability'
  | 'home'
  | 'payroll'
  | 'sync' // TASK-773 — outbox publisher, reactive consumer, projection refreshes
  | 'client_portal' // TASK-822 — Client Portal BFF / Anti-Corruption Layer (EPIC-015 child 1/8)

export interface CaptureOptions {
  /** Free-form structured context. Ends up in Sentry's `Additional Data`. */
  extra?: Record<string, unknown>
  /** Additional tags. `domain` is set automatically — don't override here. */
  tags?: Record<string, string>
  /** Sentry severity. Defaults to `error`. */
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  /** Optional Sentry user context. */
  user?: { id?: string; email?: string; username?: string }
  /** Optional fingerprint to control issue grouping. */
  fingerprint?: string[]
}

export const captureWithDomain = (
  err: unknown,
  domain: CaptureDomain,
  options: CaptureOptions = {}
): string | undefined => {
  return Sentry.captureException(err, {
    tags: {
      ...(options.tags ?? {}),
      domain
    },
    extra: options.extra,
    level: options.level ?? 'error',
    user: options.user,
    fingerprint: options.fingerprint
  })
}

/**
 * Capture a non-error message with the same domain tagging contract. Useful
 * for surfacing notable-but-non-throwing events (skipped pipeline, degraded
 * mode entered, etc.) so they show up filtered in the per-module incident
 * signal.
 */
export const captureMessageWithDomain = (
  message: string,
  domain: CaptureDomain,
  options: CaptureOptions = {}
): string | undefined => {
  return Sentry.captureMessage(message, {
    tags: {
      ...(options.tags ?? {}),
      domain
    },
    extra: options.extra,
    level: options.level ?? 'warning',
    user: options.user,
    fingerprint: options.fingerprint
  })
}
