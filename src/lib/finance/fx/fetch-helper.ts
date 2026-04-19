// Shared HTTP helper for FX adapters: 5s timeout + 1 retry on 5xx /
// network errors with exponential backoff + jitter. Adapters should call
// `fetchWithRetry` instead of `fetch` directly so the policy is
// consistent and the circuit breaker sees uniform failure signals.

const DEFAULT_TIMEOUT_MS = 5000
const BACKOFF_BASE_MS = 250
const BACKOFF_JITTER_MS = 150
const MAX_RETRIES = 3

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface FetchWithRetryOptions extends RequestInit {
  timeoutMs?: number
  maxRetries?: number
}

export const fetchWithRetry = async (
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response | null> => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = MAX_RETRIES, ...init } = options

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs)
      })

      // 2xx-3xx: done
      if (response.status < 500) {
        return response
      }

      // 5xx: retry with backoff
    } catch (error) {
      // Network error / timeout — retry with backoff
      if (attempt === maxRetries - 1) return null
    }

    // Backoff before next attempt (skip after last attempt)
    if (attempt < maxRetries - 1) {
      const jitter = Math.random() * BACKOFF_JITTER_MS
      const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt) + jitter

      await sleep(backoff)
    }
  }

  return null
}
