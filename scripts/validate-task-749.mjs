import fs from 'node:fs'

import { chromium } from 'playwright'

const STAGING_URL = 'https://dev-greenhouse.efeoncepro.com'
const TARGET_PATH = '/people/daniela-ferreira?tab=payment'
const SCREENSHOT_PATH = '/tmp/task-749-person360-tab-pago.png'
const STORAGE_STATE = '/Users/jreye/Documents/greenhouse-eo/.auth/storageState.json'

const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || ''

const browser = await chromium.launch({ headless: true })

const ctx = await browser.newContext({
  storageState: STORAGE_STATE,
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: BYPASS_SECRET
    ? { 'x-vercel-protection-bypass': BYPASS_SECRET, 'x-vercel-set-bypass-cookie': 'true' }
    : undefined,
})

const page = await ctx.newPage()

const findings = []
let url = `${STAGING_URL}${TARGET_PATH}`

console.log(`→ Navigating to ${url}`)

const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(err => {
  findings.push(`navigation_error: ${err.message}`)
  
return null
})

console.log(`  status: ${resp?.status?.() ?? 'n/a'}, url: ${page.url()}`)

// Wait briefly for any client-side hydration
await page.waitForTimeout(2500)

// Probe DOM signals
const probe = await page.evaluate(() => {
  const text = document.body.innerText || ''
  const has = (s) => text.includes(s)
  const elCount = (sel) => document.querySelectorAll(sel).length

  
return {
    title: document.title,
    bodyLen: text.length,
    hasPerfilesDePago: has('Perfiles de pago'),
    hasCuentaDestino: has('Cuenta destino'),
    hasRevelarNumero: has('Revelar número completo') || has('Revelar numero completo'),
    hasHistorialAuditoria: has('Historial de auditoría') || has('Historial de auditoria'),
    hasVigenteDesde: has('Vigente desde'),
    hasMakerChecker: has('Maker') || has('Checker'),
    hasAprobar: has('Aprobar'),
    hasCancelar: has('Cancelar'),
    hasAgregarPerfil: has('Agregar perfil') || has('Crear perfil') || has('Nuevo perfil'),
    hasEmptyState: has('No hay perfiles') || has('Sin perfiles') || has('aún no'),
    h6Count: elCount('h6'),
    cardCount: elCount('[class*="MuiCard-root"]'),
    chipCount: elCount('[class*="MuiChip-root"]'),
    snippet: text.slice(0, 800),
  }
})

console.log('--- DOM probe ---')
console.log(JSON.stringify(probe, null, 2))

// Scroll the payment panel into view and capture only that region with high zoom
const panelLocator = page.getByText('Perfiles de pago', { exact: true }).first()

await panelLocator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {})
await page.waitForTimeout(500)

await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })
const stat = fs.statSync(SCREENSHOT_PATH)

console.log(`✓ screenshot saved: ${SCREENSHOT_PATH} (${(stat.size / 1024).toFixed(1)} KB)`)

// Cropped version of just the payment panel (after sidebar)
const PANEL_CROP = '/tmp/task-749-panel-cropped.png'
const handle = await panelLocator.elementHandle({ timeout: 5000 }).catch(() => null)

if (handle) {
  const box = await handle.boundingBox()

  if (box) {
    const startY = Math.max(0, box.y - 16)
    const startX = Math.max(0, box.x - 24)

    await page.screenshot({
      path: PANEL_CROP,
      clip: {
        x: startX,
        y: startY,
        width: Math.min(1440 - startX, 1180),
        height: Math.min(900 - startY + 200, 850),
      },
    })
    console.log(`✓ cropped panel screenshot saved: ${PANEL_CROP}`)
  }
}

// Also try clicking expand toggle if there's an "Ver más" / similar
const extraText = await page.evaluate(() => {
  const t = document.body.innerText || ''

  // Look for indicators that suggest a draft profile is rendered as a card
  return {
    hasBorrador: t.includes('Borrador'),
    hasGreenhTitleref: t.includes('greenh'),
    hasInternationalCue: t.includes('honorarios') || t.includes('extranjero'),
    snippetAroundPerfiles: (t.match(/Perfiles de pago[\s\S]{0,1200}/) || [''])[0],
  }
})

console.log('--- extra probe ---')
console.log(JSON.stringify(extraText, null, 2))

await browser.close()
