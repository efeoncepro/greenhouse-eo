import { test, expect, expectAuthenticated, gotoAuthenticated, gotoWithTransientRetries } from '../fixtures/auth'

test.describe('auth / session', () => {
  test('agent storageState produces an authenticated session', async ({ page }) => {
    const response = await gotoWithTransientRetries(page, '/')

    expect(response, 'GET / should return a response').not.toBeNull()
    expect(response!.status(), 'root should not 5xx').toBeLessThan(500)

    await expectAuthenticated(page)

    const cookies = await page.context().cookies()

    const sessionCookie = cookies.find(
      cookie =>
        cookie.name === 'next-auth.session-token' ||
        cookie.name.startsWith('next-auth.session-token.') ||
        cookie.name === '__Secure-next-auth.session-token' ||
        cookie.name.startsWith('__Secure-next-auth.session-token.') ||
        cookie.name === 'authjs.session-token' ||
        cookie.name.startsWith('authjs.session-token.') ||
        cookie.name === '__Secure-authjs.session-token' ||
        cookie.name.startsWith('__Secure-authjs.session-token.')
    )

    expect(sessionCookie, 'NextAuth/Auth.js session cookie must be present').toBeTruthy()
  })

  test('session persists across a second navigation', async ({ page }) => {
    await gotoAuthenticated(page, '/home')
    await gotoAuthenticated(page, '/people')
  })
})
