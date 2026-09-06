#!/usr/bin/env node
/**
 * Carril de passkey del login, verificado en un navegador real.
 *
 * POR QUÉ NO BASTA GVC. Los dos desenlaces del passkey sólo existen en el CLIENTE: `unsupported` lo
 * decide el navegador (retira el botón, sin reintento) y `failed` la ceremonia (lo conserva). Una
 * captura no puede producir el primero —habría que quitarle WebAuthn al navegador— así que el
 * escenario GVC cubre `failed` y este script cubre la matriz completa, incluido el caso sin
 * JavaScript, donde el botón no debe existir porque no podría cumplir.
 *
 * Uso: pnpm auth-server:verify-passkey   (exige el harness en 127.0.0.1:19036)
 */
import { chromium } from 'playwright'

const BASE = process.env.AUTH_UI_BASE_URL ?? 'http://127.0.0.1:19036'
const findings = []
const ok = (n, c, d = '') => { findings.push({ n, c, d }); console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`) }

const browser = await chromium.launch()

// 1. Navegador CON WebAuthn: el botón se revela y el script no lo bloquea la CSP.
{
  const page = await browser.newPage()
  const errors = []

  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  const btn = page.locator('[data-login-passkey]')

  ok('el botón de passkey queda visible con WebAuthn disponible', await btn.isVisible())
  ok('el controlador corre sin errores de consola/CSP', errors.length === 0, errors.join(' | '))
  ok('el botón va ANTES del campo de correo', await page.evaluate(() => {
    const b = document.querySelector('[data-login-passkey]')
    const e = document.querySelector('#email')

    
return !!(b && e) && (b.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  }))
  ok('la región de estado es role=status aria-live', await page.locator('[data-login-status][role="status"][aria-live="polite"]').count() === 1)
  ok('el estado arranca vacío (nada que anunciar todavía)', (await page.locator('[data-login-status]').textContent())?.trim() === '')
  await page.close()
}

// 2. Navegador SIN WebAuthn: el botón se retira y aparece el mensaje del dispositivo, sin reintento.
{
  const ctx = await browser.newContext()

  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'PublicKeyCredential', { value: undefined, configurable: true })
  })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  ok('sin soporte: el botón se retira del DOM', await page.locator('[data-login-passkey]').count() === 0)
  const text = (await page.locator('[data-login-status]').textContent())?.trim() ?? ''

  ok('sin soporte: muestra el mensaje del dispositivo', text.includes('no admite passkeys'), text)
  ok('sin soporte: el enlace por correo sigue disponible', await page.locator('#email').isVisible())
  await ctx.close()
}

// 3. Sin JavaScript: nunca se ve un botón que no puede funcionar.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  ok('sin JS: el botón de passkey no es visible', !(await page.locator('[data-login-passkey]').isVisible()))
  ok('sin JS: el formulario de correo sí funciona', await page.locator('#email').isVisible())
  await ctx.close()
}

// 4. La ceremonia que falla deja mensaje de reintento, no de "no soportado".
{
  const ctx = await browser.newContext()

  await ctx.addInitScript(() => {
    // Autenticador que rechaza como si la persona cancelara.
    navigator.credentials.get = () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
  })
  const page = await ctx.newPage()

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  // El harness no expone /auth/passkeys/*: el POST devuelve 404 → mismo carril de fallo.
  await page.locator('[data-login-passkey]').click()
  await page.waitForFunction(() => (document.querySelector('[data-login-status]')?.textContent ?? '').length > 0, null, { timeout: 5000 })
  const text = (await page.locator('[data-login-status]').textContent())?.trim() ?? ''

  ok('ceremonia fallida: mensaje con reintento, distinto del de "no soportado"',
     text.includes('No resultó') && !text.includes('no admite'), text)
  ok('ceremonia fallida: el botón vuelve a quedar utilizable', await page.locator('[data-login-passkey]').isEnabled())
  await ctx.close()
}

// 5. Sin scroll horizontal en 390 con el bloque nuevo.
for (const [w, h] of [[1440, 1000], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  ok(`sin scroll horizontal a ${w}px`, overflow <= 0, `overflow=${overflow}`)
  await page.close()
}

await browser.close()
const failed = findings.filter(f => !f.c)

console.log(`\n${findings.length - failed.length}/${findings.length} checks ok`)
process.exit(failed.length ? 1 : 0)
