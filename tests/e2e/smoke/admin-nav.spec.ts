import { test, expect, gotoAuthenticated } from '../fixtures/auth'

test.describe('admin / navigation', () => {
  test('GET /admin renders the admin dashboard for efeonce_admin', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/admin')

    expect(response?.status(), '/admin status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })
})
