import { test, expect, gotoAuthenticated } from '../fixtures/auth'

test.describe('finance / quotes', () => {
  test('GET /finance/quotes renders the list view', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/finance/quotes')

    expect(response?.status(), '/finance/quotes status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })

  test('GET /finance/quotes/new renders the quote builder entrypoint', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/finance/quotes/new')

    expect(response?.status(), '/finance/quotes/new status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })
})
