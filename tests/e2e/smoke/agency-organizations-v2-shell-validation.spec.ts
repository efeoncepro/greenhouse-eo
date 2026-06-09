import { test, gotoAuthenticated } from '../fixtures/auth'
import { expectOrganizationEnterpriseWorkspaceReady } from '../fixtures/organization-workspace'

/**
 * Agency Organizations — enterprise workspace runtime smoke (agent auth).
 *
 * History: this spec originally validated the TASK-612 V1.1 facet-tab V2 shell.
 * TASK-1016 / TASK-1059 shipped the Organization Enterprise Workspace Runtime
 * (`AgencyOrganizationWorkspaceClient` -> `OrganizationEnterpriseWorkspaceRuntime`),
 * which replaced the facet-tab shell on the Agency entrypoint. The shell V2 is
 * still served on the Finance clients route (covered by
 * `finance-clients-v2-shell-validation.spec.ts`), so its readiness helper stays.
 *
 * The agent (`user-agent-e2e-001`) has `organization_workspace_shell_agency`
 * enabled in scope=user, so the page server renders the enterprise runtime
 * instead of the legacy `<OrganizationView>`.
 *
 * Canonical verifications (intent preserved from the original V1.1 smoke):
 *   1. NO degraded mode banner (ISSUE-071 anti-regression).
 *   2. Enterprise KPI strip + canonical facet rail visible.
 *   3. Anti-regression vs legacy `OrganizationView` 4-tab structure
 *      (its `role='tab'` tabs — e.g. "Configuración" — must be absent).
 *
 * Uses ANAM (`org-f6aa4e20-...`) as the test org — same org as the Finance test,
 * accessed via the Agency path. Any canonical org with a valid relationship works.
 */
test.describe('Agency Organizations — enterprise workspace runtime', () => {
  // ANAM organization_id canónico (verificado contra PG).
  const ANAM_ORG_ID = 'org-f6aa4e20-9dbb-467a-950d-61e5f085e9b0'

  test('renders enterprise runtime from agency entrypoint without degraded banner', async ({ page }) => {
    await gotoAuthenticated(page, `/agency/organizations/${ANAM_ORG_ID}`)

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

    await expectOrganizationEnterpriseWorkspaceReady(page, {
      requiredFacets: ['Identidad', 'CRM', 'Servicios']
    })

    await page.screenshot({
      path: 'test-results/playwright/agency-organizations-v2-validation/page.png',
      fullPage: true
    })

    // 1 + 2 already validated by the canonical readiness helper:
    // no degraded banner and canonical enterprise KPI strip + facet rail visible.
  })

  test('does NOT render legacy OrganizationView 4-tab structure (anti-regression)', async ({ page }) => {
    await gotoAuthenticated(page, `/agency/organizations/${ANAM_ORG_ID}`)

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

    await expectOrganizationEnterpriseWorkspaceReady(page, {
      requiredFacets: ['Identidad'],
      forbiddenLegacyTabs: ['Configuración']
    })
  })
})
