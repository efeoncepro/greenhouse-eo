import { test, expect, type Page } from '@playwright/test'

const SIGN_IN_PATH_MARKERS = ['/login', '/signin', '/auth/signin', '/auth/access-denied']

export { test, expect }

export async function expectAuthenticated(page: Page) {
  const url = new URL(page.url())

  for (const marker of SIGN_IN_PATH_MARKERS) {
    expect(
      url.pathname.startsWith(marker),
      `Expected authenticated session but landed on ${url.pathname}`
    ).toBeFalsy()
  }
}

export async function gotoAuthenticated(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' })

  if (response) {
    expect(response.status(), `GET ${path} returned ${response.status()}`).toBeLessThan(400)
  }

  await expectAuthenticated(page)

  return response
}
