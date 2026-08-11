import { expect, gotoWithTransientRetries, test } from '../fixtures/auth'

/**
 * TASK-1675 — E2E discoverability del menú module-driven del portal cliente.
 *
 * El comportamiento visible (el ítem aparece con el módulo y no aparece sin él)
 * se prueba en dos capas: los unit tests de `VerticalMenu.test.tsx` ejercitan la
 * composición real del `menuData`, y la evidencia GVC lo captura con dos
 * personas distintas.
 *
 * Lo que este smoke protege es la **cablería server→client**, que ninguna de
 * esas dos capas puede ver: el guard que evita pegarle a PG por cada usuario
 * interno, el `try/catch` que impide que un resolver caído tumbe el layout raíz,
 * y la frontera `server-only` que rompería el build si alguien intentara acortar
 * camino importando el composer desde el componente cliente.
 *
 * Se corre con la sesión del agente (interno), que por construcción **no** ve
 * ítems de módulo — de ahí que estos asserts miren el cableado y no el DOM.
 */

const readSource = async (relativePath: string): Promise<string> => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  return fs.readFile(path.resolve(process.cwd(), relativePath), 'utf8')
}

const LAYOUT = 'src/app/(dashboard)/layout.tsx'
const VERTICAL_MENU = 'src/components/layout/vertical/VerticalMenu.tsx'
const MENU_BUILDER = 'src/lib/client-portal/composition/menu-builder.ts'

test.describe('TASK-1675 discoverability — el menú del cliente compone sus módulos', () => {
  test('el layout resuelve los módulos sólo para clientes con organización', async () => {
    const content = await readSource(LAYOUT)

    expect(content).toContain('resolveClientPortalModulesForOrganization')
    expect(content).toContain('composeNavItemsFromModules')

    // El guard: sin él, cada carga dura de un usuario interno pega a PG por un
    // dato que no va a usar.
    expect(content).toMatch(/session\.user\.tenantType === 'client'[\s\S]{0,80}session\.user\.organizationId/)
  })

  test('un fallo del resolver degrada al menú de siempre y nunca tumba el layout raíz', async () => {
    const content = await readSource(LAYOUT)

    // Este layout es la raíz de TODO el dashboard: sin captura, un resolver
    // caído deja de ser "un cliente no ve un ítem" y pasa a ser "nadie entra".
    expect(content).toMatch(/catch \(error\) \{[\s\S]{0,200}captureWithDomain\(error, 'client_portal'/)
  })

  test('el componente cliente sólo importa la capa client-safe, nunca el composer server-only', async () => {
    const content = await readSource(VERTICAL_MENU)

    expect(content).toContain("from '@/lib/client-portal/composition/menu-builder-shape'")

    // Importar `menu-builder` (o el resolver) desde acá rompe el build de
    // producción: Turbopack detecta el `server-only` transitivo en el bundle
    // cliente. Se falla en el smoke para que el diagnóstico no sea un build rojo.
    expect(content).not.toMatch(/from '@\/lib\/client-portal\/composition\/menu-builder'/)
    expect(content).not.toContain('module-resolver')
  })

  test('el merge es aditivo: los ítems de módulo se suman a la lista base', async () => {
    const content = await readSource(VERTICAL_MENU)

    // La lista base se sigue expandiendo en el push; el merge sólo le agrega.
    expect(content).toMatch(/menuData\.push\(\s*\.\.\.clientPrimaryItems,\s*\.\.\.moduleItems\.primary/)

    // Y el filtro es por ruta ya tomada — no un reemplazo. (Prefijo tolerante:
    // TASK-1685 sumó la conjunción con el primitive de visibilidad al mismo
    // filtro; el dedup por takenRoutes sigue siendo la invariante.)
    expect(content).toMatch(/filter\(\s*item => !takenRoutes\.has\(item\.route\)/)

    // TASK-1685 — los ítems de módulo también pasan por el primitive único de
    // visibilidad (el mismo que consumen el page guard y el ⌘K).
    expect(content).toMatch(/canSeeClientView\(item\.viewCode\)/)
  })

  test('el informe SEO está declarado como ruta hija y no compite por un ítem', async () => {
    const content = await readSource(MENU_BUILDER)

    expect(content).toMatch(/'cliente\.growth_seo_report':\s*\{[\s\S]{0,200}childOf: 'cliente\.growth_seo_dashboard'/)
  })

  test('/growth/seo sigue renderizando (sin 5xx)', async ({ page }) => {
    const response = await gotoWithTransientRetries(page, '/growth/seo')
    const status = response?.status() ?? 200

    expect(status).toBeLessThan(500)
  })

  test('/home sigue renderizando con el menú compuesto (sin 5xx)', async ({ page }) => {
    const response = await gotoWithTransientRetries(page, '/home')
    const status = response?.status() ?? 200

    expect(status).toBeLessThan(500)
  })
})
