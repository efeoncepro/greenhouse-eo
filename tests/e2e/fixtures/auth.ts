import { test, expect, type Page } from '@playwright/test'

const SIGN_IN_PATH_MARKERS = ['/login', '/signin', '/auth/signin', '/auth/access-denied']
const DEFAULT_NAVIGATION_ATTEMPTS = 3
const DEFAULT_NAVIGATION_TIMEOUT_MS = 20_000
const DEFAULT_NAVIGATION_BACKOFF_MS = 750

const TRANSIENT_NAVIGATION_ERROR_PATTERNS = [
  /page\.goto: Timeout \d+ms exceeded/i,
  /net::ERR_(?:CONNECTION|TIMED_OUT|HTTP2|SOCKET|NETWORK|ABORTED)/i,
  /Navigation failed because page was closed/i
]

export { test, expect }

interface GotoWithTransientRetriesOptions {
  attempts?: number
  timeoutMs?: number
  backoffMs?: number
}

const isTransientNavigationError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)

  return TRANSIENT_NAVIGATION_ERROR_PATTERNS.some(pattern => pattern.test(message))
}

export async function expectAuthenticated(page: Page) {
  const url = new URL(page.url())

  for (const marker of SIGN_IN_PATH_MARKERS) {
    expect(url.pathname.startsWith(marker), `Expected authenticated session but landed on ${url.pathname}`).toBeFalsy()
  }
}

export async function gotoWithTransientRetries(
  page: Page,
  path: string,
  options: GotoWithTransientRetriesOptions = {}
) {
  const attempts = options.attempts ?? DEFAULT_NAVIGATION_ATTEMPTS
  const timeoutMs = options.timeoutMs ?? DEFAULT_NAVIGATION_TIMEOUT_MS
  const backoffMs = options.backoffMs ?? DEFAULT_NAVIGATION_BACKOFF_MS
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs
      })
    } catch (error) {
      lastError = error

      if (attempt >= attempts || !isTransientNavigationError(error)) {
        throw error
      }

      await page.waitForTimeout(backoffMs * attempt)
    }
  }

  throw lastError
}

export async function gotoAuthenticated(page: Page, path: string) {
  const response = await gotoWithTransientRetries(page, path)

  if (response) {
    expect(response.status(), `GET ${path} returned ${response.status()}`).toBeLessThan(400)
  }

  await expectAuthenticated(page)

  return response
}
