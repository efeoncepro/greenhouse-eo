import { test, expect, gotoAuthenticated } from '../fixtures/auth'

test.describe('finance / suppliers', () => {
  test('GET /finance/suppliers renders the list view', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/finance/suppliers')

    expect(response?.status(), '/finance/suppliers status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })
})
