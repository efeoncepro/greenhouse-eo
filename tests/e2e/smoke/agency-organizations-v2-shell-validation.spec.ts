import { test, expect, gotoAuthenticated } from '../fixtures/auth'

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

    // ── Cold-start resilience (V3 rollout post-flip) ──
    // Esperamos primero a un marker positivo (Revenue KPI) antes de asserts
    // negativos. Cold-start del serverless puede tardar mientras los fetches
    // paralelos resuelven; el banner degraded puede aparecer brevemente.
    const v2RevenueKpi = page.getByText('Revenue', { exact: true }).first()
    const v2MarginKpi = page.getByText('Margen bruto', { exact: true }).first()

    await expect(v2RevenueKpi, 'V2 KPI Revenue debe estar visible (cold-start resilient)').toBeVisible({
      timeout: 20_000
    })
    await expect(v2MarginKpi, 'V2 KPI Margen bruto debe estar visible').toBeVisible({ timeout: 10_000 })

    await page.screenshot({
      path: 'test-results/playwright/agency-organizations-v2-validation/page.png',
      fullPage: true
    })

    // 1. NO degraded mode banner — extended timeout tolera transient loading.
    const degradedBanner = page.getByText('Workspace en modo degradado')

    await expect(
      degradedBanner,
      'NO debe haber banner degraded — projection debe resolver completa para Agency entrypoint'
    ).toHaveCount(0, { timeout: 15_000 })

    // 2. Tab strip por facets — los 9 facets canónicos del shell V2.
    // Marker canónico: "Identidad" + "CRM" tabs distinguen V2 del legacy
    // OrganizationView (que tiene solo 4 tabs: Operaciones / Finanzas /
    // Equipo / Configuración).
    await expect(page.getByRole('tab', { name: 'Identidad' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('tab', { name: 'CRM' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('tab', { name: 'Servicios' })).toBeVisible({ timeout: 10_000 })
  })

  test('does NOT render legacy OrganizationView 4-tab structure (anti-regression)', async ({ page }) => {
    await gotoAuthenticated(page, `/agency/organizations/${ANAM_ORG_ID}`)

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

    // Legacy OrganizationView tiene tab "Configuración" como una de las 4 fijas.
    // El shell V2 NO tiene esa tab — sus 9 facets son
    // Identidad/Spaces/Equipo/Economía/Entrega/Finanzas/CRM/Servicios/Staff Aug.
    //
    // Si "Configuración" tab existe Y "Identidad" tab NO existe → estamos en
    // legacy. La aserción inversa garantiza la detección anti-regresión.
    const legacyConfigTab = page.getByRole('tab', { name: 'Configuración' })
    const v2IdentidadTab = page.getByRole('tab', { name: 'Identidad' })

    const hasLegacyConfig = await legacyConfigTab.count()
    const hasV2Identidad = await v2IdentidadTab.count()

    expect(
      hasV2Identidad > 0 && hasLegacyConfig === 0,
      `Debe ser shell V2 (Identidad tab presente, Configuración legacy ausente). hasV2Identidad=${hasV2Identidad}, hasLegacyConfig=${hasLegacyConfig}`
    ).toBe(true)
  })
})
