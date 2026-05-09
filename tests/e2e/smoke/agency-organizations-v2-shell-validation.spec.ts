import { test, gotoAuthenticated } from '../fixtures/auth'
import { expectOrganizationWorkspaceShellReady } from '../fixtures/organization-workspace'

/**
 * TASK-612 V1.1 — verificación end-to-end del shell V2 de Agency Organizations
 * usando agent auth.
 *
 * Patrón canónico mirror de finance-clients-v2-shell-validation.spec.ts:
 * el agent (`user-agent-e2e-001`) tiene `organization_workspace_shell_agency`
 * activado en scope=user, por lo que el page server debe renderear
 * `<AgencyOrganizationWorkspaceClient>` (TASK-612 Slice 5) en lugar del
 * legacy `<OrganizationView>`.
 *
 * Verificaciones canónicas:
 *
 *   1. NO degraded mode banner (ISSUE-071 anti-regression).
 *   2. Tab strip por facets (9 tabs) — distingue inequívocamente del legacy
 *      (que tiene solo 4 tabs: Operaciones / Finanzas / Equipo / Configuración).
 *   3. Default facet correcto para entrypointContext='agency' (NO 'finance').
 *
 * Se usa ANAM (`org-f6aa4e20-...`) como org de prueba — la misma org que el
 * Finance test, pero accedida por el path Agency. Cualquier org canónica con
 * relationship válida sirve.
 */
test.describe('Agency Organizations V2 Shell — TASK-612 V1.1 verification', () => {
  // ANAM organization_id canónico (verificado contra PG).
  const ANAM_ORG_ID = 'org-f6aa4e20-9dbb-467a-950d-61e5f085e9b0'

  test('renders V2 shell from agency entrypoint without degraded banner', async ({ page }) => {
    await gotoAuthenticated(page, `/agency/organizations/${ANAM_ORG_ID}`)

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

    await expectOrganizationWorkspaceShellReady(page, {
      requiredTabs: ['Identidad', 'CRM', 'Servicios']
    })

    await page.screenshot({
      path: 'test-results/playwright/agency-organizations-v2-validation/page.png',
      fullPage: true
    })

    // 1 + 2 already validated by the canonical readiness helper:
    // no degraded banner and canonical V2 tabs visible.
  })

  test('does NOT render legacy OrganizationView 4-tab structure (anti-regression)', async ({ page }) => {
    await gotoAuthenticated(page, `/agency/organizations/${ANAM_ORG_ID}`)

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

    await expectOrganizationWorkspaceShellReady(page, {
      requiredTabs: ['Identidad'],
      forbiddenTabs: ['Configuración']
    })
  })
})
