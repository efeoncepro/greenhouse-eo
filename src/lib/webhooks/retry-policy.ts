export const MAX_ATTEMPTS = 5

/** Retry delays in ms: immediate, 1m, 5m, 15m, 60m */
export const RETRY_DELAYS_MS = [0, 60_000, 300_000, 900_000, 3_600_000] as const

/**
 * Get the next retry timestamp based on attempt count.
 * Returns null if all retries are exhausted.
 */
export const getNextRetryAt = (attemptCount: number): Date | null => {
  if (attemptCount >= MAX_ATTEMPTS) return null

  const delayMs = RETRY_DELAYS_MS[Math.min(attemptCount, RETRY_DELAYS_MS.length - 1)]

  return new Date(Date.now() + delayMs)
}

/**
 * HTTP status codes that warrant a retry (server errors, timeouts).
 * 4xx are NOT retryable — the request itself is wrong.
 */
export const isRetryableHttpStatus = (status: number | null): boolean => {
  if (status === null) return true // Network error — retryable

  return status >= 500 || status === 408 || status === 429
}

/**
 * Determine if a delivery should be moved to dead letter.
 */
export const shouldDeadLetter = (attemptCount: number, httpStatus: number | null): boolean => {
  if (attemptCount >= MAX_ATTEMPTS) return true

  // Non-retryable client errors → dead letter immediately
  if (httpStatus !== null && httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408 && httpStatus !== 429) {
    return true
  }

  return false
}
