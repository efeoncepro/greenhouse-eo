import { chromium, type Page } from 'playwright'

type TextProbe = {
  selector: string
  text: string
  fontSizePx: number
  letterSpacing: string
  letterSpacingPx: number | null
}

type ViewportCheck = {
  name: string
  viewport: { width: number; height: number }
  overflowX: number
  sectionTitle: TextProbe
  formTitle: TextProbe
  zeroTracking: TextProbe[]
  formFontFamily: string
  screenshot: string
}

const args = process.argv.slice(2)

const getArg = (name: string, fallback: string) => {
  const inline = args.find(arg => arg.startsWith(`${name}=`))

  if (inline) return inline.slice(name.length + 1)

  const index = args.indexOf(name)

  if (index >= 0 && args[index + 1]) return args[index + 1]

  return fallback
}

const url = getArg('--url', 'https://efeoncepro.com/aeo-2/')
const screenshotDir = getArg('--screenshot-dir', '/tmp')
const cacheBust = `gh_aeo_form_typography_gate=${Date.now()}`
const targetUrl = url.includes('?') ? `${url}&${cacheBust}` : `${url}?${cacheBust}`
const titleTrackingEm = -0.045
const pxTolerance = 0.06

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 1200 } },
  { name: 'mobile390', viewport: { width: 390, height: 1100 } },
]

const readProbe = async (page: Page, selector: string): Promise<TextProbe> => {
  return page.locator(selector).first().evaluate((node, selected) => {
    const element = node as HTMLElement
    const style = getComputedStyle(element)
    const fontSizePx = Number.parseFloat(style.fontSize)
    const letterSpacing = style.letterSpacing
    const letterSpacingPx = letterSpacing === 'normal' ? null : Number.parseFloat(letterSpacing)

    return {
      selector: selected,
      text: element.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      fontSizePx,
      letterSpacing,
      letterSpacingPx: Number.isFinite(letterSpacingPx) ? letterSpacingPx : null,
    }
  }, selector)
}

const assertTitleTracking = (label: string, probe: TextProbe) => {
  if (probe.letterSpacing === 'normal' || probe.letterSpacingPx === null) {
    throw new Error(`${label} computed letter-spacing is ${probe.letterSpacing}; expected ${titleTrackingEm}em`)
  }

  const expectedPx = titleTrackingEm * probe.fontSizePx

  if (Math.abs(probe.letterSpacingPx - expectedPx) > pxTolerance) {
    throw new Error(
      `${label} computed letter-spacing ${probe.letterSpacingPx}px; expected ${expectedPx.toFixed(3)}px (${titleTrackingEm}em)`
    )
  }
}

const assertZeroTracking = (label: string, probe: TextProbe) => {
  const value = probe.letterSpacingPx ?? 0

  if (Math.abs(value) > 0.02) {
    throw new Error(`${label} computed letter-spacing ${probe.letterSpacing}; expected normal/0`)
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const results: ViewportCheck[] = []

  try {
    for (const testCase of viewports) {
      const page = await browser.newPage({ viewport: testCase.viewport })

      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 })
      await page.locator('.gh-aeo-conversion').scrollIntoViewIfNeeded()

      // TASK-1298 — el formulario AEO ya no es un bridge HTML: lo pinta el renderer
      // portable <greenhouse-form> (light DOM, clases `.ghf-*`). Esperar a que monte
      // antes de leer computed styles, si no los selectores de control no existen aún.
      await page
        .locator('.gh-aeo-conversion greenhouse-form .ghf-btn')
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })

      const sectionTitle = await readProbe(page, '.gh-aeo-conversion .gh-aeo-section-title .title')
      const formTitle = await readProbe(page, '.gh-aeo-conversion .gh-aeo-growth-form-title')

      // title/lead/proof siguen siendo markup WordPress (se conservan en la card).
      // label/input/button ahora son del renderer: `.ghf-label` / `.ghf-input` / `.ghf-btn`.
      const zeroSelectors = [
        '.gh-aeo-conversion .gh-aeo-growth-form-lead',
        '.gh-aeo-conversion greenhouse-form .ghf-label',
        '.gh-aeo-conversion greenhouse-form .ghf-input',
        '.gh-aeo-conversion greenhouse-form .ghf-btn',
        '.gh-aeo-conversion .gh-aeo-growth-form-proof',
      ]

      const zeroTracking = await Promise.all(zeroSelectors.map(selector => readProbe(page, selector)))

      // TASK-1298 — el renderer debe heredar el stack DM Sans (--ghf-font scoped),
      // no caer al default system-ui, para no clashear con la tipografía de la landing.
      const formFontFamily = await page
        .locator('.gh-aeo-conversion greenhouse-form .ghf-input')
        .first()
        .evaluate(node => getComputedStyle(node as HTMLElement).fontFamily)

      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

      const screenshot = `${screenshotDir.replace(/\/$/, '')}/aeo-form-typography-gate-${testCase.name}.png`

      await page.screenshot({ path: screenshot, fullPage: false })

      assertTitleTracking(`${testCase.name} section title`, sectionTitle)
      assertTitleTracking(`${testCase.name} form title`, formTitle)
      zeroTracking.forEach((probe, index) => assertZeroTracking(`${testCase.name} zero tracking ${zeroSelectors[index]}`, probe))

      if (!/dm sans/i.test(formFontFamily)) {
        throw new Error(`${testCase.name} renderer font-family is "${formFontFamily}"; expected the DM Sans stack (--ghf-font scoped)`)
      }

      if (overflowX !== 0) {
        throw new Error(`${testCase.name} has horizontal overflow: ${overflowX}px`)
      }

      results.push({
        name: testCase.name,
        viewport: testCase.viewport,
        overflowX,
        sectionTitle,
        formTitle,
        zeroTracking,
        formFontFamily,
        screenshot,
      })

      await page.close()
    }
  } finally {
    await browser.close()
  }

  console.log(JSON.stringify({
    ok: true,
    url: targetUrl,
    titleTrackingEm,
    results,
  }, null, 2))
}

main().catch(error => {
  console.error(`public-website:verify-aeo-form-typography failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
