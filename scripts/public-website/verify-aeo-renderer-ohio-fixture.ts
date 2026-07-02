import { mkdir } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { chromium, type Page } from 'playwright'

import { staticContractFixture } from '../../src/growth-forms-renderer/fixtures'

type Rgb = { r: number; g: number; b: number; a: number }

type ControlSnapshot = {
  selector: string
  text: string
  backgroundColor: string
  borderColor: string
  borderStyle: string
  borderWidth: string
  backgroundImage: string
  backgroundRepeat: string
  color: string
  letterSpacing: string
  left: number
  top: number
  width: number
  height: number
}

const screenshotDir = '.captures'
const manifestPath = `${screenshotDir}/aeo-renderer-ohio-fixture-manifest.json`
const rendererBundlePath = resolve(process.cwd(), 'public/growth-forms/renderer-preview.js')

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 } },
  { name: 'mobile390', viewport: { width: 390, height: 900 } },
]

const hostileOhioCss = `
  body {
    margin: 0;
    background: #f4f8fa;
    font-family: "DM Sans", Arial, sans-serif;
  }

  .ohio-host {
    max-width: 760px;
    margin: 56px auto;
    padding: 28px;
    background: #fff;
    border: 1px solid #dfe6ee;
    border-radius: 18px;
  }

  /* Simulates the class of host regression that broke TASK-1298 in production. */
  .ohio-host input,
  .ohio-host textarea,
  .ohio-host select,
  .ohio-host button {
    background: #eeeeee !important;
    border: 0 !important;
    color: #111111 !important;
    box-shadow: inset 0 0 0 99px rgba(0, 0, 0, 0.02) !important;
    letter-spacing: 0.12em !important;
    text-transform: uppercase !important;
  }

  .ohio-host select {
    background-image: repeating-linear-gradient(
      45deg,
      #101010 0,
      #101010 2px,
      transparent 2px,
      transparent 8px
    ) !important;
    background-repeat: repeat !important;
  }

  .ohio-host button {
    background: #111111 !important;
    color: #ffffff !important;
  }
`

const aeoContract = staticContractFixture({
  form: {
    formId: 'fdef-efeonce-aeo-diagnostic',
    formKey: 'b120566a-dd1a-43c8-956a-4e0121e805b8',
    slug: 'efeonce-aeo-diagnostic',
    formVersionId: 'fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4',
    version: 5,
    locale: 'es-CL',
    formKind: 'diagnostic_intake',
  },
  fields: [
    { key: 'firstName', type: 'text', label: 'Nombre', required: true, maxLength: 120, autocomplete: 'given-name' },
    { key: 'email', type: 'email', label: 'Email corporativo', required: true, autocomplete: 'email', inputMode: 'email', validator: 'corporate_email', placeholder: 'nombre@tuempresa.com' },
    { key: 'brandWebsite', type: 'url', label: 'Marca / sitio web', required: true, maxLength: 240, inputMode: 'url', placeholder: 'tuempresa.com' },
    {
      key: 'country',
      type: 'select',
      label: 'País principal',
      options: [
        { value: '', label: 'Selecciona tu país' },
        { value: 'CL', label: 'Chile' },
        { value: 'CO', label: 'Colombia' },
        { value: 'MX', label: 'México' },
        { value: 'PE', label: 'Perú' },
      ],
    },
    {
      key: 'companySize',
      type: 'select',
      label: 'Tamaño de empresa',
      options: [
        { value: '', label: 'Selecciona un rango' },
        { value: '1-10', label: '1 - 10' },
        { value: '11-50', label: '11 - 50' },
        { value: '51-200', label: '51 - 200' },
        { value: '201-1000', label: '201 - 1000' },
        { value: '1000+', label: '+1000' },
      ],
    },
    { key: 'mainCompetitor', type: 'text', label: 'Principal competidor', maxLength: 200, placeholder: 'marca de tu competencia' },
  ],
  copy: {
    submit: 'Empezar con mi diagnóstico →',
    'email.help': 'Usa tu correo corporativo para recibir el diagnóstico.',
    'brandWebsite.help': 'Usaremos este sitio para revisar señales públicas de visibilidad.',
    'mainCompetitor.help': 'Opcional: ayuda a comparar tu presencia en IA.',
    'firstName.error.required': 'Escribe tu nombre para personalizar el diagnóstico.',
    'email.error.required': 'Usa tu correo corporativo para enviarte el diagnóstico.',
    'brandWebsite.error.required': 'Indica el sitio principal de tu marca para evaluarla.',
  },
  successBehavior: { kind: 'inline_message', message: 'Solicitud recibida. Prepararemos tu lectura inicial y te contactaremos pronto.' },
  styleVariant: 'diagnostic_premium',
  consent: undefined,
  surfacePolicy: {
    surfaceId: 'fhsf-efeonce-aeo-diagnostic',
    allowedOrigins: ['https://efeoncepro.com'],
    rendererChannel: 'preview',
  },
})

const html = `<!doctype html>
<html lang="es-CL">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${hostileOhioCss}</style>
    <script>
      window.fetch = async () => new Response(${JSON.stringify(JSON.stringify(aeoContract))}, {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    </script>
  </head>
  <body>
    <main class="ohio-host">
      <greenhouse-form
        form-key="b120566a-dd1a-43c8-956a-4e0121e805b8"
        surface="fhsf-efeonce-aeo-diagnostic"
        locale="es-CL"
        color-scheme="light"
        appearance="bare"
        data-color-scheme="light"
        data-appearance="bare"
        style="
          --ghf-font: 'DM Sans', Arial, sans-serif;
          --ghf-bg: transparent;
          --ghf-field-bg: #ffffff;
          --ghf-border: #dfe6ee;
          --ghf-border-strong: #b7c4d4;
          --ghf-accent: #36c8bf;
          --ghf-accent-contrast: #023c70;
          --ghf-radius: 10px;
        "
      ></greenhouse-form>
    </main>
  </body>
</html>`

const parseRgb = (value: string): Rgb | null => {
  const match = value.match(/rgba?\(([^)]+)\)/i)

  if (!match) return null

  const parts = match[1].split(',').map(part => part.trim())

  return {
    r: Number(parts[0]),
    g: Number(parts[1]),
    b: Number(parts[2]),
    a: parts[3] ? Number(parts[3]) : 1,
  }
}

const isNearWhite = (value: string) => {
  const rgb = parseRgb(value)

  return Boolean(rgb && rgb.r >= 245 && rgb.g >= 245 && rgb.b >= 245 && rgb.a >= 0.95)
}

const isApprovedTeal = (value: string) => {
  const rgb = parseRgb(value)

  return Boolean(
    rgb &&
      rgb.r >= 35 &&
      rgb.r <= 85 &&
      rgb.g >= 175 &&
      rgb.g <= 220 &&
      rgb.b >= 165 &&
      rgb.b <= 210 &&
      rgb.a >= 0.95
  )
}

const readControl = async (page: Page, selector: string): Promise<ControlSnapshot> => {
  return page.locator(selector).first().evaluate((node, selected) => {
    const element = node as HTMLElement
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()

    return {
      selector: selected,
      text: element.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderStyle: style.borderStyle,
      borderWidth: style.borderWidth,
      backgroundImage: style.backgroundImage,
      backgroundRepeat: style.backgroundRepeat,
      color: style.color,
      letterSpacing: style.letterSpacing,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }
  }, selector)
}

const assertField = (label: string, snapshot: ControlSnapshot) => {
  if (!isNearWhite(snapshot.backgroundColor)) {
    throw new Error(`${label} background is ${snapshot.backgroundColor}; expected renderer white field surface`)
  }

  if (snapshot.borderStyle === 'none' || Number.parseFloat(snapshot.borderWidth) < 1) {
    throw new Error(`${label} border is ${snapshot.borderWidth} ${snapshot.borderStyle}; expected visible renderer border`)
  }

  if (snapshot.letterSpacing !== 'normal' && snapshot.letterSpacing !== '0px') {
    throw new Error(`${label} letter-spacing is ${snapshot.letterSpacing}; expected renderer normal tracking`)
  }

  if (snapshot.height < 42) {
    throw new Error(`${label} height is ${snapshot.height}px; expected >=42px`)
  }
}

const assertSelect = (label: string, snapshot: ControlSnapshot) => {
  assertField(label, snapshot)

  if (snapshot.backgroundImage !== 'none') {
    throw new Error(`${label} background-image is ${snapshot.backgroundImage}; expected none`)
  }

  if (snapshot.backgroundRepeat !== 'no-repeat') {
    throw new Error(`${label} background-repeat is ${snapshot.backgroundRepeat}; expected no-repeat`)
  }
}

const assertDropdown = (label: string, snapshot: ControlSnapshot, optionCount: number) => {
  if (!snapshot.text.includes('Selecciona un rango') || !snapshot.text.includes('1 - 10')) {
    throw new Error(`${label} text is "${snapshot.text}"; expected premium option list content`)
  }

  if (!isNearWhite(snapshot.backgroundColor)) {
    throw new Error(`${label} background is ${snapshot.backgroundColor}; expected premium white panel`)
  }

  if (snapshot.borderStyle === 'none' || Number.parseFloat(snapshot.borderWidth) < 1) {
    throw new Error(`${label} border is ${snapshot.borderWidth} ${snapshot.borderStyle}; expected visible panel border`)
  }

  if (optionCount < 5) {
    throw new Error(`${label} option count is ${optionCount}; expected full company size list`)
  }

  if (snapshot.width < 300 || snapshot.height < 180) {
    throw new Error(`${label} size is ${snapshot.width}x${snapshot.height}; expected usable custom dropdown panel`)
  }
}

const assertButton = (snapshot: ControlSnapshot) => {
  if (!snapshot.text.includes('Empezar con mi diagnóstico')) {
    throw new Error(`CTA text is "${snapshot.text}"; expected approved AEO CTA`)
  }

  if (!isApprovedTeal(snapshot.backgroundColor)) {
    throw new Error(`${snapshot.selector} background is ${snapshot.backgroundColor}; expected approved teal`)
  }

  if (snapshot.letterSpacing !== 'normal' && snapshot.letterSpacing !== '0px') {
    throw new Error(`${snapshot.selector} letter-spacing is ${snapshot.letterSpacing}; expected renderer normal tracking`)
  }

  if (snapshot.height < 42) {
    throw new Error(`CTA height is ${snapshot.height}px; expected >=42px`)
  }
}

const assertSameDesktopRow = (viewportName: string, label: string, first: ControlSnapshot, second: ControlSnapshot) => {
  if (viewportName !== 'desktop') return

  const sameRow = Math.abs(first.top - second.top) <= 8
  const orderedColumns = second.left > first.left + first.width * 0.8

  if (!sameRow || !orderedColumns) {
    throw new Error(
      `${viewportName} ${label} are not paired in a desktop row; first=(${first.left},${first.top},${first.width}) second=(${second.left},${second.top},${second.width})`
    )
  }
}

async function main() {
  if (!existsSync(rendererBundlePath)) {
    throw new Error(`Missing ${rendererBundlePath}. Run pnpm renderer:build before this gate.`)
  }

  await mkdir(screenshotDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const results: unknown[] = []

  try {
    for (const testCase of viewports) {
      const page = await browser.newPage({ viewport: testCase.viewport, colorScheme: 'light' })

      await page.setContent(html, { waitUntil: 'domcontentloaded' })
      await page.addScriptTag({ path: rendererBundlePath })
      await page.waitForSelector('greenhouse-form .ghf-btn', { timeout: 10000 })
      await page.addStyleTag({ content: hostileOhioCss })
      await page.waitForTimeout(100)
      await page.locator('greenhouse-form').scrollIntoViewIfNeeded()

      const inputs = await Promise.all(
        [0, 1, 2].map(index => readControl(page, `greenhouse-form .ghf-input >> nth=${index}`))
      )

      const selects = await Promise.all(
        [0, 1].map(index => readControl(page, `greenhouse-form .ghf-select >> nth=${index}`))
      )

      const button = await readControl(page, 'greenhouse-form .ghf-btn')
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      const screenshot = `${screenshotDir}/aeo-renderer-ohio-fixture-${testCase.name}.png`
      const dropdownScreenshot = `${screenshotDir}/aeo-renderer-ohio-fixture-dropdown-${testCase.name}.png`

      await page.screenshot({ path: screenshot, fullPage: false })

      await page.locator('greenhouse-form .ghf-select-trigger').nth(1).click()
      await page.waitForSelector('greenhouse-form .ghf-select-list:not([hidden])', { timeout: 2000 })
      const dropdown = await readControl(page, 'greenhouse-form .ghf-select-list:not([hidden])')
      const dropdownOptionCount = await page.locator('greenhouse-form .ghf-select-list:not([hidden]) [role="option"]').count()

      await page.screenshot({ path: dropdownScreenshot, fullPage: false })

      inputs.forEach((snapshot, index) => assertField(`${testCase.name} input ${index + 1}`, snapshot))
      selects.forEach((snapshot, index) => assertSelect(`${testCase.name} select ${index + 1}`, snapshot))
      assertDropdown(`${testCase.name} open dropdown`, dropdown, dropdownOptionCount)
      assertButton(button)
      assertSameDesktopRow(testCase.name, 'name/email fields', inputs[0], inputs[1])
      assertSameDesktopRow(testCase.name, 'country/company size selects', selects[0], selects[1])

      if (overflowX !== 0) {
        throw new Error(`${testCase.name} has horizontal overflow: ${overflowX}px`)
      }

      results.push({
        name: testCase.name,
        overflowX,
        screenshot,
        dropdownScreenshot,
        inputs,
        selects,
        dropdown,
        dropdownOptionCount,
        button,
      })

      await page.close()
    }
  } finally {
    await browser.close()
  }

  const payload = {
    ok: true,
    contract: 'AEO renderer visual integrity under hostile Ohio-like host CSS',
    results,
  }

  writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))
}

main().catch(error => {
  console.error(`public-website:verify-aeo-renderer-ohio-fixture failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
