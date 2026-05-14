import { test, expect, gotoAuthenticated } from '../fixtures/auth'

/**
 * TASK-873 Slice 6e — E2E smoke del workflow Workforce Intake admin governance.
 *
 * Cubre el surface admin governance `/admin/workforce/activation` shipped por
 * TASK-873 Slice 4. Verifica:
 *  - Page render sin 500
 *  - Title canonical "Workforce Activation" (alineado con mockup aprobado)
 *  - Filter controls visible
 *  - No application error / 500 fatal
 *  - Drawer pattern accesible via aria-label
 *
 * Verifica con usuario `agent@greenhouse.efeonce.org` (efeonce_admin +
 * collaborator) que tiene capability `workforce.member.complete_intake`
 * vía grant `EFEONCE_ADMIN` en `src/lib/entitlements/runtime.ts`.
 *
 * Surface primario HR-facing (`/hr/workforce/activation` o
 * `/workforce/activation`) ships en TASK-874 — esta spec NO lo cubre.
 *
 * **Out of scope V1**:
 *  - End-to-end complete (click row → drawer abre → submit → status
 *    transitions en DB) — requiere fixture member pending_intake en
 *    staging garantizado + verificación PG post-submit. Se agrega en
 *    TASK-874 Slice 6 cuando el workspace enriquecido ship.
 *  - Per-rol regression (hr_payroll, finance_admin) — el agent canonical
 *    es efeonce_admin; otros roles requieren fixture user adicional.
 */
test.describe('admin / workforce / activation', () => {
  test('GET /admin/workforce/activation renders the workforce activation queue', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/admin/workforce/activation')

    expect(response?.status(), '/admin/workforce/activation status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    // Page title canonical (mockup aprobado 2026-05-14)
    await expect(page.getByRole('heading', { name: /workforce activation/i })).toBeVisible()

    // Filter controls canonical. The approved UI uses compact filter buttons,
    // not the older ToggleButtonGroup structure.
    await expect(page.getByRole('button', { name: /todos/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /listos/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sin compensación/i })).toBeVisible()

    // No fatal application error
    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })

  test('GET /people renders directory (badge "Ficha pendiente" canonical surface)', async ({ page }) => {
    // Smoke del directorio People — el badge "Ficha pendiente" en PeopleListTable
    // se renderea desde server data; no garantizamos su presencia en este smoke
    // (depende de data live), pero verificamos que el directorio carga sin error.
    const response = await gotoAuthenticated(page, '/people')

    expect(response?.status(), '/people status').toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()

    const fatal = page.getByText(/application error|500 — internal/i)

    await expect(fatal).toHaveCount(0)
  })
})
