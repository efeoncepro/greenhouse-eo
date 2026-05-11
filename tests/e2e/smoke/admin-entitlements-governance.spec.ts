import { test, expect, gotoAuthenticated } from '../fixtures/auth'

const AGENT_USER_ID = 'user-agent-e2e-001'
const STARTUP_POLICY_ENDPOINT = `/api/admin/entitlements/users/${AGENT_USER_ID}/startup-policy`

type UserEntitlementsPayload = {
  startupPolicy: {
    configuredPath: string | null
  }
}

test.describe('admin / entitlements governance', () => {
  test.describe.configure({ mode: 'serial' })

  test('renders the Admin Center entitlements governance surface for the agent admin user', async ({ page }) => {
    test.setTimeout(60_000)

    const response = await gotoAuthenticated(page, '/admin/views')

    expect(response?.status(), '/admin/views status').toBeLessThan(400)

    await expect(page.getByRole('heading', { name: 'Gobernanza de acceso' })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Entitlements/i })).toBeVisible()
    await expect(page.getByText('Capabilities activas', { exact: true })).toBeVisible()
    await expect(page.getByText('Defaults por rol', { exact: true })).toBeVisible()
    await expect(page.getByText('Políticas de Home', { exact: true })).toBeVisible()
    await expect(page.getByText('Auditoría', { exact: true })).toBeVisible()

    await expect(page.getByText(/application error|500 — internal/i)).toHaveCount(0)
  })

  test('renders effective entitlements and user overrides on the agent user access tab', async ({ page }) => {
    test.setTimeout(60_000)

    const response = await gotoAuthenticated(page, `/admin/users/${AGENT_USER_ID}`)

    expect(response?.status(), `/admin/users/${AGENT_USER_ID} status`).toBeLessThan(400)

    const accessTab = page.getByRole('tab', { name: 'Accesos' })

    await page.waitForLoadState('networkidle')
    await accessTab.scrollIntoViewIfNeeded()
    await accessTab.click()
    await expect(accessTab).toHaveAttribute('aria-selected', 'true')

    await expect(page.getByRole('table', { name: 'Permisos efectivos del usuario' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agregar excepción' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Home de inicio' })).toBeVisible()

    await expect(page.getByText(/application error|500 — internal/i)).toHaveCount(0)
  })

  test('updates and restores the agent user startup policy through governance entitlements', async ({ page, request }) => {
    test.setTimeout(60_000)

    await gotoAuthenticated(page, `/admin/users/${AGENT_USER_ID}`)

    const beforeResponse = await request.get(`/api/admin/entitlements/users/${AGENT_USER_ID}`)

    expect(beforeResponse.status(), 'read current entitlements status').toBeLessThan(400)

    const beforePayload = (await beforeResponse.json()) as UserEntitlementsPayload
    const originalPath = beforePayload.startupPolicy.configuredPath
    const temporaryPath = originalPath === '/home' ? '/my' : '/home'

    try {
      const updateResponse = await request.patch(STARTUP_POLICY_ENDPOINT, {
        data: {
          portalHomePath: temporaryPath,
          reason: 'Playwright smoke validates TASK-839 governance mutation.'
        }
      })

      expect(updateResponse.status(), 'startup policy update status').toBeLessThan(400)

      const afterResponse = await request.get(`/api/admin/entitlements/users/${AGENT_USER_ID}`)

      expect(afterResponse.status(), 'read updated entitlements status').toBeLessThan(400)

      const afterPayload = (await afterResponse.json()) as UserEntitlementsPayload

      expect(afterPayload.startupPolicy.configuredPath).toBe(temporaryPath)
    } finally {
      const restoreResponse = await request.patch(STARTUP_POLICY_ENDPOINT, {
        data: {
          portalHomePath: originalPath,
          reason: 'Playwright smoke restores TASK-839 governance mutation.'
        }
      })

      expect(restoreResponse.status(), 'startup policy restore status').toBeLessThan(400)
    }
  })
})
