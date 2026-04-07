/**
 * Chunk Load Error Detection & Auto-Recovery
 *
 * When Vercel deploys a new version, users with cached HTML from the previous
 * deploy reference JS chunks that no longer exist on the CDN. This causes
 * ChunkLoadError (webpack) or "Failed to fetch dynamically imported module"
 * (Turbopack/ESM) errors that crash the React tree.
 *
 * Strategy:
 * 1. Detect chunk load errors by error message signature
 * 2. Auto-refresh ONCE (tracked via sessionStorage to prevent infinite loops)
 * 3. If the retry also fails, show the error UI — the user needs a hard refresh
 */

const RETRY_KEY = 'greenhouse:chunk-error-retry'

/** Returns true if the error is caused by a stale deployment chunk */
export function isChunkLoadError(error: Error): boolean {
  const message = error.message || ''
  const name = error.name || ''

  return (
    name === 'ChunkLoadError' ||
    message.includes('Loading chunk') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes("Cannot find module") ||
    message.includes('Failed to load') ||
    (message.includes('chunk') && message.includes('failed'))
  )
}

/**
 * Attempts auto-recovery by reloading the page once.
 * Returns true if a reload was triggered (caller should stop rendering).
 * Returns false if already retried — caller should show error UI.
 */
export function attemptChunkRecovery(): boolean {
  if (typeof window === 'undefined') return false

  const alreadyRetried = sessionStorage.getItem(RETRY_KEY)

  if (!alreadyRetried) {
    sessionStorage.setItem(RETRY_KEY, Date.now().toString())
    window.location.reload()

    return true
  }

  // Already retried — clear the flag for next navigation and let the error UI show
  sessionStorage.removeItem(RETRY_KEY)

  return false
}

/**
 * Clear the retry flag on successful page load.
 * Call this once in a top-level client component (e.g., Providers).
 */
export function clearChunkRetryFlag(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(RETRY_KEY)
}
