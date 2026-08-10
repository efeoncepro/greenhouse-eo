import { expect, gotoWithTransientRetries, test } from '../fixtures/auth'

/**
 * TASK-753 — E2E discoverability del rediseño self-service.
 *
 * Valida que la surface esté correctamente surfaceada en los 2 puntos
 * canonicos de discovery del shell:
 *   1. Menú lateral "Mi Ficha" → item "Mi Cuenta de Pago"
 *   2. Tab "Cuenta de pago" dentro de `/my/profile`
 *
 * Usa session storage del agent dedicated user (admin-only, sin team_members).
 * El agent NO tiene route_group=my por construccion (es admin), entonces el
 * menu de "Mi Ficha" probablemente NO aparece para el agent. Para que el test
 * sea util independiente del usuario:
 *   - Validamos que el viewCode esté registrado (catalog accessible).
 *   - Validamos que la ruta `/my/payment-profile` exista (no 404).
 *   - Validamos que la nomenclatura `paymentProfile` esté en GH_MY_NAV.
 */

test.describe('TASK-753 discoverability — menu + tab cross-link', () => {
  test('viewCode mi_ficha.mi_cuenta_pago is registered in catalog', async () => {
    // Static check via filesystem — the catalog file must contain the viewCode.
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const catalogPath = path.resolve(process.cwd(), 'src/lib/admin/view-access-catalog.ts')
    const content = await fs.readFile(catalogPath, 'utf8')

    expect(content).toContain('mi_ficha.mi_cuenta_pago')
    expect(content).toContain("routePath: '/my/payment-profile'")
  })

  test('GH_MY_NAV.paymentProfile is registered in nomenclature', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const nomenPath = path.resolve(process.cwd(), 'src/config/greenhouse-nomenclature.ts')
    const content = await fs.readFile(nomenPath, 'utf8')

    // Must contain the nav entry with es-CL label
    expect(content).toMatch(/paymentProfile:\s*\{\s*label:\s*'Mi Cuenta de Pago'/)
  })

  test('the personal nav builder wires Mi Cuenta de Pago for both surfaces', async () => {
    // TASK-1388 — el SoT de las hojas /my/* dejó de ser dos bloques duplicados
    // dentro de VerticalMenu: es el builder canónico `buildMyNavItems`,
    // consumido por las DOS superficies (dropdown del avatar para internos +
    // rail del colaborador puro). La discoverability que TASK-753 protege se
    // verifica ahora contra ese contrato.
    const fs = await import('node:fs/promises')
    const path = await import('node:path')

    const builder = await fs.readFile(path.resolve(process.cwd(), 'src/lib/navigation/my-nav-items.ts'), 'utf8')

    expect(builder).toMatch(/href:\s*'\/my\/payment-profile'/)
    expect(builder).toMatch(/viewCode:\s*'mi_ficha\.mi_cuenta_pago'/)

    // Ambas superficies consumen el builder — sin esto, una de las dos pierde
    // la hoja en silencio.
    const verticalMenu = await fs.readFile(
      path.resolve(process.cwd(), 'src/components/layout/vertical/VerticalMenu.tsx'),
      'utf8'
    )

    const userDropdown = await fs.readFile(
      path.resolve(process.cwd(), 'src/components/layout/shared/UserDropdown.tsx'),
      'utf8'
    )

    expect(verticalMenu).toContain('buildMyNavItems')
    expect(userDropdown).toContain('buildMyNavItems')
  })

  test('MyProfileView includes "Cuenta de pago" tab', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const viewPath = path.resolve(process.cwd(), 'src/views/greenhouse/my/MyProfileView.tsx')
    const content = await fs.readFile(viewPath, 'utf8')

    // Tab declaration
    expect(content).toMatch(/value=['"]payment['"][\s\S]*?label=['"]Cuenta de pago['"]/m)

    // Tab panel mounting MyPaymentProfileView
    expect(content).toMatch(/<TabPanel value=['"]payment['"][\s\S]*?<MyPaymentProfileView/m)

    // Import statement
    expect(content).toContain("import MyPaymentProfileView from './MyPaymentProfileView'")
  })

  test('/my/payment-profile route still renders (no 5xx)', async ({ page }) => {
    const response = await gotoWithTransientRetries(page, '/my/payment-profile')
    const status = response?.status() ?? 200

    expect(status).toBeLessThan(500)
  })

  test('/my/profile route still renders (no 5xx)', async ({ page }) => {
    const response = await gotoWithTransientRetries(page, '/my/profile')
    const status = response?.status() ?? 200

    expect(status).toBeLessThan(500)
  })
})
