import { expect, gotoAuthenticated, gotoWithTransientRetries, test } from '../fixtures/auth'

test.describe('portal home', () => {
  test('GET /home renders the authenticated shell', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/home')

    expect(response?.status(), '/home status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const errorText = page.getByText(/application error|500 — internal|unauthorized/i)

    await expect(errorText).toHaveCount(0)
  })

  test('portalHomePath redirect from / lands on a valid route', async ({ page }) => {
    await gotoWithTransientRetries(page, '/')

    const { pathname } = new URL(page.url())

    expect(pathname.startsWith('/login')).toBeFalsy()
    expect(pathname.startsWith('/auth/')).toBeFalsy()
    expect(pathname).not.toBe('/')
  })
})
