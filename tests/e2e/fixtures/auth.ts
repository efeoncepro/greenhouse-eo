import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const SIGN_IN_PATH_MARKERS = ['/login', '/signin', '/auth/signin', '/auth/access-denied']
const DEFAULT_NAVIGATION_ATTEMPTS = 3
const DEFAULT_NAVIGATION_TIMEOUT_MS = 20_000
const DEFAULT_NAVIGATION_BACKOFF_MS = 750
const NEXTAUTH_SESSION_COOKIE_CHUNK_SIZE = 4096 - 163

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

type PlaywrightCookie = Parameters<BrowserContext['addCookies']>[0][number]

const isTransientNavigationError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)

  return TRANSIENT_NAVIGATION_ERROR_PATTERNS.some(pattern => pattern.test(message))
}

export function buildNextAuthSessionCookies(input: {
  cookieName: string
  cookieValue: string
  baseUrl: string
}): PlaywrightCookie[] {
  const baseUrl = new URL(input.baseUrl)
  const expires = Math.floor(Date.now() / 1000) + 86400

  const requiresSecureCookie =
    baseUrl.protocol === 'https:' ||
    input.cookieName.startsWith('__Secure-') ||
    input.cookieName.startsWith('__Host-')

  const cookieBase = {
    path: '/',
    httpOnly: true,
    secure: requiresSecureCookie,
    sameSite: 'Lax' as const,
    expires
  }

  const scopedCookie = input.cookieName.startsWith('__Host-')
    ? { ...cookieBase, url: baseUrl.origin }
    : { ...cookieBase, domain: baseUrl.hostname }

  if (input.cookieValue.length <= NEXTAUTH_SESSION_COOKIE_CHUNK_SIZE) {
    return [
      {
        name: input.cookieName,
        value: input.cookieValue,
        ...scopedCookie
      }
    ]
  }

  const cookies: PlaywrightCookie[] = []

  for (let index = 0; index * NEXTAUTH_SESSION_COOKIE_CHUNK_SIZE < input.cookieValue.length; index += 1) {
    cookies.push({
      name: `${input.cookieName}.${index}`,
      value: input.cookieValue.slice(
        index * NEXTAUTH_SESSION_COOKIE_CHUNK_SIZE,
        (index + 1) * NEXTAUTH_SESSION_COOKIE_CHUNK_SIZE
      ),
      ...scopedCookie
    })
  }

  return cookies
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
