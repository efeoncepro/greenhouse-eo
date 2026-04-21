import { test, expect, gotoAuthenticated } from '../fixtures/auth'

test.describe('hr / payroll', () => {
  test('GET /hr/payroll renders the admin payroll view', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/hr/payroll')

    expect(response?.status(), '/hr/payroll status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })

  test('GET /my/payroll renders the collaborator payroll surface', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/my/payroll')

    expect(response?.status(), '/my/payroll status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })
})
