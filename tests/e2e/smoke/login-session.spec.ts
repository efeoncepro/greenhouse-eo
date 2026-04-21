import { test, expect, expectAuthenticated } from '../fixtures/auth'

test.describe('auth / session', () => {
  test('agent storageState produces an authenticated session', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })

    expect(response, 'GET / should return a response').not.toBeNull()
    expect(response!.status(), 'root should not 5xx').toBeLessThan(500)

    await expectAuthenticated(page)

    const cookies = await page.context().cookies()

    const sessionCookie = cookies.find(
      cookie =>
        cookie.name === 'next-auth.session-token' ||
        cookie.name === '__Secure-next-auth.session-token' ||
        cookie.name === 'authjs.session-token' ||
        cookie.name === '__Secure-authjs.session-token'
    )

    expect(sessionCookie, 'NextAuth/Auth.js session cookie must be present').toBeTruthy()
  })

  test('session persists across a second navigation', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' })
    await expectAuthenticated(page)

    await page.goto('/people', { waitUntil: 'domcontentloaded' })
    await expectAuthenticated(page)
  })
})
