import { test, expect, gotoAuthenticated } from '../fixtures/auth'

test.describe('finance / clients', () => {
  test('GET /finance/clients renders the list view', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/finance/clients')

    expect(response?.status(), '/finance/clients status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })
})
