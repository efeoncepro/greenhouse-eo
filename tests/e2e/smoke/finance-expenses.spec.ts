import { test, expect, gotoAuthenticated } from '../fixtures/auth'

test.describe('finance / expenses', () => {
  test('GET /finance/expenses renders the list view', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/finance/expenses')

    expect(response?.status(), '/finance/expenses status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })
})
