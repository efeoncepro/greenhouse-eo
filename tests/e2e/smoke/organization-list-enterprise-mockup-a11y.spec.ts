import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

import { expect, gotoAuthenticated, test } from '../fixtures/auth'

const MOCKUP_ROOT = '[data-capture="organization-list-enterprise-mockup"]'

async function expectNoAutomatedAccessibilityViolations(page: Page, contextLabel: string) {
  const results = await new AxeBuilder({ page })
    .include(MOCKUP_ROOT)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .analyze()

  expect(
    results.violations,
    `${contextLabel} has axe accessibility violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('Organization enterprise mockup accessibility', () => {
  test('passes automated axe checks in workbench and matrix modes', async ({ page }) => {
    await gotoAuthenticated(page, '/agency/organizations/mockup')
    await page.locator(MOCKUP_ROOT).waitFor({ state: 'visible' })

    await expectNoAutomatedAccessibilityViolations(page, 'Organization mockup workbench mode')

    await page.getByRole('button', { name: 'Vista matriz' }).click()
    await expect(page.getByRole('table', { name: 'Matriz comparativa de organizaciones' })).toBeVisible()

    await expectNoAutomatedAccessibilityViolations(page, 'Organization mockup matrix mode')
  })
})
