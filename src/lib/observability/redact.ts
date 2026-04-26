import 'server-only'

/**
 * Canonical redaction helpers.
 *
 * Strips secrets, tokens, GCP secret URIs, DSNs, JWTs, stack traces and
 * email user portions from strings before they leave the runtime as part
 * of API responses, request logs, or audit trails.
 *
 * Why centralised: previously every consumer that surfaced an error or a
 * log line had to remember which patterns to mask. The Platform Health
 * contract (TASK-672) requires guaranteed redaction; this module is the
 * single source of truth and is expected to be reused by:
 *   - request log emitters
 *   - webhook delivery body persistence
 *   - Sentry serializers
 *   - any future contract that surfaces `last_error` strings to agents
 *
 * Spec: docs/tasks/in-progress/TASK-672-platform-health-api-contract.md
 */

const REDACTION_PLACEHOLDER = '[redacted]'

/**
 * Patterns ordered by specificity. The first match wins per substring;
 * each pattern returns its own placeholder so the consumer keeps a hint
 * about WHAT was redacted (useful for debugging without leaking values).
 */
interface RedactionPattern {
  label: string
  pattern: RegExp
  replacement: string
}

const PATTERNS: RedactionPattern[] = [
  // GCP Secret Manager URIs (must come BEFORE generic projects/* matches)
  {
    label: 'gcp_secret_uri',
    pattern: /projects\/[\w-]+\/secrets\/[\w./-]+(?:\/versions\/[\w.-]+)?/g,
    replacement: '[redacted:gcp-secret-uri]'
  },
  // JWT (three base64url segments separated by dots, starting with eyJ)
  {
    label: 'jwt',
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: '[redacted:jwt]'
  },
  // Bearer / Token authorization headers
  {
    label: 'bearer',
    pattern: /\b(?:Bearer|Token)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
    replacement: '[redacted:bearer]'
  },
  // Generic API key / secret-shaped query parameters
  {
    label: 'query_secret',
    pattern: /([?&](?:secret|token|api[_-]?key|access[_-]?token|password)=)[^&\s]+/gi,
    replacement: '$1[redacted]'
  },
  // DSNs (postgres://user:pass@host, https://user:pass@host, sentry DSN style)
  {
    label: 'dsn',
    pattern: /\b([a-z][a-z0-9+.-]*:\/\/)([^:@/\s]+):([^@\s]+)@/gi,
    replacement: '$1[redacted]:[redacted]@'
  },
  // Sentry-style ingest DSN (https://<key>@<org>.ingest.sentry.io/<project>)
  {
    label: 'sentry_dsn',
    pattern: /https?:\/\/[a-f0-9]{16,}@[\w.-]+\.ingest\.sentry\.io\/\d+/gi,
    replacement: '[redacted:sentry-dsn]'
  },
  // Email addresses — preserve domain, mask user (least aggressive: 1 char + dots)
  {
    label: 'email',
    pattern: /\b([A-Za-z0-9])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    replacement: '$1***@$2'
  }
]

/**
 * Strip secret-shaped substrings from a single string.
 *
 * Idempotent: running twice produces the same output.
 * Bounded: unknown structures pass through unchanged; the function never
 * throws on malformed input.
 */
export const redactSensitive = (input: string): string => {
  if (typeof input !== 'string' || input.length === 0) return input

  let result = input

  for (const { pattern, replacement } of PATTERNS) {
    result = result.replace(pattern, replacement)
  }

  return result
}

/**
 * Walk a payload (object/array/primitive) and apply `redactSensitive` to
 * every string leaf. Object keys are NOT redacted (they're the schema, not
 * the values). Cycles are tolerated up to a depth budget.
 */
export const redactObjectStrings = <T>(value: T, depth = 8): T => {
  if (depth <= 0) return value

  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return redactSensitive(value) as unknown as T
  }

  if (Array.isArray(value)) {
    return value.map(item => redactObjectStrings(item, depth - 1)) as unknown as T
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}

    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactObjectStrings(v, depth - 1)
    }

    return out as unknown as T
  }

  return value
}

/**
 * Convert an unknown thrown value to a safe error summary string.
 *
 *  - keeps the error message (redacted)
 *  - drops the stack trace entirely (path leakage + internal symbol leakage)
 *  - normalises non-Error throws to a generic placeholder
 *
 * Use this whenever you persist or surface an error to an external consumer
 * (response body, audit log, MCP tool result). NEVER include `error.stack`
 * in a payload that crosses the network boundary.
 */
export const redactErrorForResponse = (error: unknown): string => {
  if (error instanceof Error) {
    return redactSensitive(error.message || 'unknown_error')
  }

  if (typeof error === 'string') {
    return redactSensitive(error)
  }

  return 'unknown_error'
}

export const REDACTION_PLACEHOLDER_VALUE = REDACTION_PLACEHOLDER
