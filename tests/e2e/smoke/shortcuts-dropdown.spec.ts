import { expect, gotoWithTransientRetries, test } from '../fixtures/auth'

const AGENT_SECRET = process.env.AGENT_AUTH_SECRET || ''
const AGENT_EMAIL = process.env.AGENT_AUTH_EMAIL || 'agent@greenhouse.efeonce.org'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const VERCEL_BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || ''

type ShortcutPayloadItem = {
  key: string
  label: string
  subtitle: string
}

type ShortcutsPayload = {
  recommended: ShortcutPayloadItem[]
  available: ShortcutPayloadItem[]
  pinned: ShortcutPayloadItem[]
}

// TASK-553 — End-to-end validation of <ShortcutsDropdown />.
//
// Validates the phase state machine fix that resolved the infinite-loop
// bug: previously the useEffect depended on `loading`/`data` AND aborted
// the in-flight fetch on every cleanup, which created a render-fetch loop
// that left the panel stuck on "Cargando accesos...".
//
// Hard guarantees the test asserts:
//  1. The panel transitions out of the loading state within ~5s.
//  2. The dropdown renders shortcuts (recommended fallback for fresh user).
//  3. The "+" flow opens add mode and closes back to view mode after pin when an option is available.
//  4. The total number of GET /api/me/shortcuts calls stays bounded
//     (< 8) — the loop reproduced HUNDREDS of identical calls per second.

test.describe('shortcuts dropdown — TASK-553', () => {
  // Skip the project-level storageState — we auth ourselves per test.
  test.use({
    storageState: { cookies: [], origins: [] },
    viewport: { width: 1440, height: 900 }
  })

  test.beforeEach(async ({ context }) => {
    // Inject the Vercel SSO bypass header on EVERY request from this context
    // so we can reach the staging app behind protection.
    if (VERCEL_BYPASS) {
      await context.setExtraHTTPHeaders({ 'x-vercel-protection-bypass': VERCEL_BYPASS })
    }

    // Use a fresh context per test. We hit the agent-session endpoint
    // ourselves and inject the resulting cookie. NextAuth picks the
    // cookie name from NEXTAUTH_URL — must match the BASE_URL protocol.
    const response = await context.request.post(`${BASE_URL}/api/auth/agent-session`, {
      data: { secret: AGENT_SECRET, email: AGENT_EMAIL },
      headers: {
        'Content-Type': 'application/json',
        ...(VERCEL_BYPASS ? { 'x-vercel-protection-bypass': VERCEL_BYPASS } : {})
      }
    })

    if (!response.ok()) {
      throw new Error(`Agent auth failed: ${response.status()} ${await response.text()}`)
    }

    const body = (await response.json()) as { cookieValue: string; cookieName: string }
    const url = new URL(BASE_URL)
    const isSecure = url.protocol === 'https:'

    await context.addCookies([
      {
        name: body.cookieName,
        value: body.cookieValue,
        domain: url.hostname,
        path: '/',
        httpOnly: true,
        secure: isSecure,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 86400
      }
    ])
  })

  test('opens, loads, supports add flow without infinite loop', async ({ page }) => {
    const shortcutsCalls: { method: string; status: number }[] = []

    page.on('response', response => {
      const url = response.url()

      if (url.includes('/api/me/shortcuts')) {
        shortcutsCalls.push({ method: response.request().method(), status: response.status() })
      }
    })

    await gotoWithTransientRetries(page, `${BASE_URL}/home`)

    // Make sure we're authenticated (not bounced to /login)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })

    const apiResponse = await page.request.get(`${BASE_URL}/api/me/shortcuts`, {
      headers: VERCEL_BYPASS ? { 'x-vercel-protection-bypass': VERCEL_BYPASS } : undefined
    })

    expect(apiResponse.ok(), `GET /api/me/shortcuts failed: ${apiResponse.status()}`).toBe(true)

    let shortcuts = (await apiResponse.json()) as ShortcutsPayload
    let pinnedKeys = new Set(shortcuts.pinned.map(shortcut => shortcut.key))
    let candidateToPin = shortcuts.available.find(shortcut => !pinnedKeys.has(shortcut.key))

    if (!candidateToPin && shortcuts.pinned.length > 0) {
      const pinToRelease = shortcuts.pinned.at(-1)!

      const unpinResponse = await page.request.delete(
        `${BASE_URL}/api/me/shortcuts/${encodeURIComponent(pinToRelease.key)}`,
        {
          headers: VERCEL_BYPASS ? { 'x-vercel-protection-bypass': VERCEL_BYPASS } : undefined
        }
      )

      expect(
        [200, 204].includes(unpinResponse.status()),
        `DELETE /api/me/shortcuts/${pinToRelease.key} failed: ${unpinResponse.status()}`
      ).toBe(true)

      const refreshedResponse = await page.request.get(`${BASE_URL}/api/me/shortcuts`, {
        headers: VERCEL_BYPASS ? { 'x-vercel-protection-bypass': VERCEL_BYPASS } : undefined
      })

      expect(refreshedResponse.ok(), `refreshed GET /api/me/shortcuts failed: ${refreshedResponse.status()}`).toBe(true)

      shortcuts = (await refreshedResponse.json()) as ShortcutsPayload
      pinnedKeys = new Set(shortcuts.pinned.map(shortcut => shortcut.key))
      candidateToPin = shortcuts.available.find(shortcut => !pinnedKeys.has(shortcut.key))
    }

    const initialVisibleShortcut = shortcuts.pinned[0] ?? shortcuts.recommended[0]
    const initialVisibleLabel = initialVisibleShortcut?.label ?? ''

    expect(initialVisibleShortcut, 'expected at least one pinned or recommended shortcut').toBeTruthy()
    expect(candidateToPin, 'expected at least one shortcut available to pin after deterministic setup').toBeTruthy()

    // Capture pre-open state
    await page.screenshot({ path: 'tmp/shortcuts-00-home.png', fullPage: false })

    // Open the shortcuts dropdown
    const toggle = page.getByRole('button', { name: 'Abrir accesos rápidos' })

    await expect(toggle).toBeVisible({ timeout: 8000 })
    await toggle.click()

    // Title appears as h6 inside the popover
    await expect(page.getByRole('heading', { name: 'Accesos rápidos', level: 6 })).toBeVisible({ timeout: 5000 })

    // Loading text should DISAPPEAR — this is the regression test for the loop
    const loading = page.getByText('Cargando accesos...')

    await expect(loading).toBeHidden({ timeout: 8000 })

    await page.screenshot({ path: 'tmp/shortcuts-01-loaded.png', fullPage: false })

    // The dropdown shows pinned shortcuts when they exist, otherwise the
    // recommended fallback. Assert the server-declared contract, not a fixed
    // seed state for the shared CI user.
    const visibleTile = page.getByRole('link').filter({ hasText: initialVisibleLabel }).first()

    await expect(visibleTile).toBeVisible({ timeout: 3000 })

    // Snapshot the initial GET count BEFORE we trigger more interactions
    const initialGets = shortcutsCalls.filter(c => c.method === 'GET').length

    expect(initialGets, 'initial GET calls (no loop)').toBeGreaterThan(0)
    expect(initialGets, 'initial GET calls (no loop)').toBeLessThan(4)

    await page.screenshot({ path: 'tmp/shortcuts-02-recommended-visible.png', fullPage: false })

    // Click + to enter add mode
    const addButton = page.getByRole('button', { name: 'Agregar un acceso rápido' })

    await expect(addButton).toBeEnabled()
    await addButton.click()

    await expect(page.getByRole('heading', { name: 'Agrega un acceso', level: 6 })).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tmp/shortcuts-03-add-mode.png', fullPage: false })

    // Click the first server-declared available row to pin it. This keeps the
    // smoke resilient when the shared agent user already has different pins.
    const availableRow = page.getByRole('button').filter({ hasText: candidateToPin!.label }).first()

    await expect(availableRow).toBeVisible({ timeout: 3000 })
    await availableRow.click()

    // Should return to view mode automatically with new pin
    await expect(page.getByRole('heading', { name: 'Accesos rápidos', level: 6 })).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'tmp/shortcuts-04-after-pin.png', fullPage: false })

    // Total bound: initial GET + post-pin refresh + maybe one POST + 1 GET more.
    // The infinite loop produced > 50 calls in seconds. < 8 is generous.
    const totalGets = shortcutsCalls.filter(c => c.method === 'GET').length

    expect(totalGets, `Expected finite GETs; got ${totalGets} (loop?)`).toBeLessThan(8)

    console.log('Shortcuts API calls:', shortcutsCalls)
  })
})
