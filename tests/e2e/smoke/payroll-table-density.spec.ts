// TASK-743 — Visual / structural regression for the operational data table
// density contract. Asserts that PayrollEntryTable does NOT push horizontal
// overflow onto the document body at the canonical viewport width (1440).
//
// The shell may scroll horizontally internally — that is valid. What is NOT
// allowed is `document.body.scrollWidth > document.body.clientWidth`, which
// would mean the overflow escapes the shell and pushes the page.
//
// Spec: docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md

import { test, expect, gotoAuthenticated } from '../fixtures/auth'

test.describe('payroll table density contract (TASK-743)', () => {
  test('no horizontal page overflow at viewport=1440 on /hr/payroll', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    const response = await gotoAuthenticated(page, '/hr/payroll')

    expect(response?.status(), '/hr/payroll status').toBeLessThan(400)

    await page.waitForLoadState('domcontentloaded')

    // Wait for the shell to mount (or the empty state, which is also acceptable).
    await page
      .locator('[data-table-shell="payroll-entries"], [data-empty-payroll]')
      .first()
      .waitFor({ timeout: 15_000 })
      .catch(() => {
        // Empty/loading state is fine — the page itself still must not overflow.
      })

    const bodyOverflowPx = await page.evaluate(() =>
      Math.max(0, document.body.scrollWidth - document.body.clientWidth)
    )

    expect(bodyOverflowPx, 'document.body horizontal overflow at 1440').toBeLessThanOrEqual(0)

    // If the shell IS rendered, validate it carries the contract attributes.
    const shellCount = await page.locator('[data-table-shell="payroll-entries"]').count()

    if (shellCount > 0) {
      const density = await page
        .locator('[data-table-shell="payroll-entries"]')
        .first()
        .getAttribute('data-density')

      expect(['compact', 'comfortable', 'expanded']).toContain(density)
    }
  })
})
