import { test, expect, gotoAuthenticated } from '../fixtures/auth'

test.describe('people / 360 directory', () => {
  test('GET /people renders the directory', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/people')

    expect(response?.status(), '/people status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })
})
