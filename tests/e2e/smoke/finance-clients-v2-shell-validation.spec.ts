import { test, expect, gotoAuthenticated } from '../fixtures/auth'
import { expectOrganizationWorkspaceShellReady } from '../fixtures/organization-workspace'

/**
 * TASK-613 V1.1 + ISSUE-070 + ISSUE-071 — verificación end-to-end del shell V2
 * de Finance Clients usando agent auth.
 *
 * El agent (`user-agent-e2e-001`) tiene el flag `organization_workspace_shell_finance`
 * activado en scope=user, por lo que el page server debe renderear
 * `<FinanceClientsOrganizationWorkspaceClient>` en lugar del legacy
 * `<ClientDetailView>`.
 *
 * Verificaciones canónicas:
 *
 *   1. NO degraded mode banner (ISSUE-071 fix verificado).
 *   2. Header del shell V2 con badges (1 Space / X Personas / HubSpot).
 *   3. KPI strip con 4 cards canónicos (Revenue / Margen / Equipo / Spaces).
 *   4. Tab strip por facets visible.
 *   5. NO header del legacy ClientDetailView.
 */
test.describe('Finance Clients V2 Shell — TASK-613 V1.1 verification', () => {
  test('renders V2 shell for ANAM (hubspot-company-27776076692) without degraded banner', async ({ page }) => {
    await gotoAuthenticated(page, '/finance/clients/hubspot-company-27776076692')

    // Wait for hydration
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

    await expectOrganizationWorkspaceShellReady(page, {
      requiredTabs: ['Identidad', 'Finanzas', 'CRM']
    })

    // Capture screenshot AFTER positive assertions confirm V2 rendered
    await page.screenshot({
      path: 'test-results/playwright/finance-clients-v2-validation/page.png',
      fullPage: true
    })

    // 1 + 3 already validated by the canonical readiness helper:
    // no degraded banner and canonical V2 tabs visible.

    // 4. Finanzas tab debe estar seleccionada por default (entrypointContext='finance')
    const financeTab = page.getByRole('tab', { name: 'Finanzas' })

    await expect(financeTab, 'Tab Finanzas debe estar seleccionada por default').toHaveAttribute(
      'aria-selected',
      'true'
    )

    // 5. Adentro de Finanzas: contenido rich legacy preservado (3 KPIs + sub-tabs).
    // Estos KPIs son los del FinanceClientsContent (TASK-613 Slice 1) — vienen
    // del legacy ClientDetailView pero ahora envueltos en el shell V2.
    await expect(page.getByText('Por cobrar', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Vencidas', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Condiciones', { exact: true })).toBeVisible({ timeout: 10_000 })
  })

  test('does NOT render legacy ClientDetailView (anti-regression)', async ({ page }) => {
    await gotoAuthenticated(page, '/finance/clients/hubspot-company-27776076692')

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expectOrganizationWorkspaceShellReady(page, {
      requiredTabs: ['Identidad', 'Finanzas']
    })

    // Legacy view shows "ID: hubspot-company-..." as visible subheader text.
    // V2 shell does NOT show this — uses chips instead.
    const legacyIdLabel = page.locator('text=/^ID:\\s*hubspot-company-/').first()

    await expect(
      legacyIdLabel,
      'Legacy ClientDetailView header con "ID: hubspot-company-..." NO debe renderear'
    ).toHaveCount(0)
  })
})
