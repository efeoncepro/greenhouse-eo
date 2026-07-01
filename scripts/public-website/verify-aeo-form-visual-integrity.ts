import { mkdir } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'

import { chromium, type Page } from 'playwright'

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
  backgroundPosition: string
  color: string
  left: number
  top: number
  width: number
  height: number
}

type ViewportResult = {
  name: string
  implementation: 'bridge' | 'renderer'
  overflowX: number
  screenshot: string
  inputs: ControlSnapshot[]
  selects: (ControlSnapshot & { name: string | null; firstOption: string })[]
  button: ControlSnapshot
  trustText: string
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
const screenshotDir = getArg('--screenshot-dir', '.captures')
const manifestPath = `${screenshotDir.replace(/\/$/, '')}/aeo-form-visual-integrity-manifest.json`
const cacheBust = `gh_aeo_form_visual_gate=${Date.now()}`
const targetUrl = url.includes('?') ? `${url}&${cacheBust}` : `${url}?${cacheBust}`

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 1200 } },
  { name: 'mobile390', viewport: { width: 390, height: 1100 } },
]

const parseRgb = (value: string): Rgb | null => {
  const modern = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/i)

  if (modern) {
    return {
      r: Math.round(Number(modern[1]) * 255),
      g: Math.round(Number(modern[2]) * 255),
      b: Math.round(Number(modern[3]) * 255),
      a: modern[4] ? Number(modern[4]) : 1,
    }
  }

  const legacy = value.match(/rgba?\(([^)]+)\)/i)

  if (!legacy) return null

  const parts = legacy[1].split(',').map(part => part.trim())

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

const isVisibleBorder = (snapshot: ControlSnapshot) => {
  const width = Number.parseFloat(snapshot.borderWidth)
  const color = parseRgb(snapshot.borderColor)

  return snapshot.borderStyle !== 'none' && width >= 1 && Boolean(color && color.a >= 0.4)
}

const isApprovedTeal = (value: string) => {
  const rgb = parseRgb(value)

  if (!rgb) return false

  return rgb.r >= 35 && rgb.r <= 80 && rgb.g >= 175 && rgb.g <= 220 && rgb.b >= 165 && rgb.b <= 210 && rgb.a >= 0.95
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
      backgroundPosition: style.backgroundPosition,
      color: style.color,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }
  }, selector)
}

const assertControlSurface = (label: string, snapshot: ControlSnapshot) => {
  if (!isNearWhite(snapshot.backgroundColor)) {
    throw new Error(`${label} background is ${snapshot.backgroundColor}; expected approved white field surface`)
  }

  if (!isVisibleBorder(snapshot)) {
    throw new Error(`${label} border is ${snapshot.borderWidth} ${snapshot.borderStyle} ${snapshot.borderColor}; expected visible field border`)
  }

  if (snapshot.height < 42) {
    throw new Error(`${label} height is ${snapshot.height}px; expected >=42px tap target`)
  }
}

const assertSelectCaret = (label: string, snapshot: ControlSnapshot) => {
  if (snapshot.backgroundImage !== 'none' && snapshot.backgroundRepeat !== 'no-repeat') {
    throw new Error(
      `${label} background image repeats (${snapshot.backgroundRepeat}); this is the chevron-wall regression`
    )
  }
}

const assertButton = (snapshot: ControlSnapshot) => {
  if (!snapshot.text.includes('Solicitar diagnóstico gratis')) {
    throw new Error(`CTA text is "${snapshot.text}"; expected "Solicitar diagnóstico gratis →"`)
  }

  if (!isApprovedTeal(snapshot.backgroundColor)) {
    throw new Error(`${snapshot.selector} background is ${snapshot.backgroundColor}; expected approved teal CTA, not a dark/default button`)
  }

  if (snapshot.height < 42) {
    throw new Error(`CTA height is ${snapshot.height}px; expected >=42px tap target`)
  }
}

const waitForForm = async (page: Page) => {
  await page.waitForFunction(() => {
    return Boolean(
      document.querySelector('.gh-aeo-growth-form-button') ||
        document.querySelector('greenhouse-form .ghf-btn')
    )
  }, undefined, { timeout: 30000 })
}

async function main() {
  await mkdir(screenshotDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const results: ViewportResult[] = []

  try {
    for (const testCase of viewports) {
      const page = await browser.newPage({ viewport: testCase.viewport, colorScheme: 'light' })

      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.locator('.gh-aeo-conversion').scrollIntoViewIfNeeded()
      await waitForForm(page)
      await page.waitForTimeout(500)

      const implementation = await page.evaluate(() =>
        document.querySelector('greenhouse-form .ghf-btn') ? 'renderer' : 'bridge'
      ) as 'bridge' | 'renderer'

      const fieldSelector = implementation === 'renderer' ? '.ghf-input' : '.gh-aeo-growth-form-input'
      const selectSelector = implementation === 'renderer' ? '.ghf-select' : '.gh-aeo-growth-form-select'
      const buttonSelector = implementation === 'renderer' ? 'greenhouse-form .ghf-btn' : '.gh-aeo-growth-form-button'

      const inputLocators = await page.locator(`.gh-aeo-conversion ${fieldSelector}`).count()
      const selectLocators = await page.locator(`.gh-aeo-conversion ${selectSelector}`).count()

      if (inputLocators < 3) {
        throw new Error(`${testCase.name} found ${inputLocators} text inputs; expected at least 3`)
      }

      if (selectLocators !== 2) {
        throw new Error(`${testCase.name} found ${selectLocators} selects; expected exactly 2`)
      }

      const inputs = await Promise.all(
        [0, 1, 2].map(index => readControl(page, `.gh-aeo-conversion ${fieldSelector} >> nth=${index}`))
      )

      const selects = await Promise.all(
        [0, 1].map(index =>
          page.locator(`.gh-aeo-conversion ${selectSelector}`).nth(index).evaluate((node, selected) => {
            const element = node as HTMLSelectElement
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
              backgroundPosition: style.backgroundPosition,
              color: style.color,
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              name: element.getAttribute('name'),
              firstOption: element.querySelector('option')?.textContent?.trim() ?? '',
            }
          }, `.gh-aeo-conversion ${selectSelector} >> nth=${index}`)
        )
      )

      const button = await readControl(page, `.gh-aeo-conversion ${buttonSelector}`)
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      const trustText = await page.locator('.gh-aeo-conversion .gh-aeo-growth-form-proof').first().textContent().catch(() => '')
      const screenshot = `${screenshotDir.replace(/\/$/, '')}/aeo-form-visual-integrity-${testCase.name}.png`

      await page.screenshot({ path: screenshot, fullPage: false })

      inputs.forEach((snapshot, index) => assertControlSurface(`${testCase.name} input ${index + 1}`, snapshot))
      selects.forEach((snapshot, index) => {
        assertControlSurface(`${testCase.name} select ${index + 1}`, snapshot)
        assertSelectCaret(`${testCase.name} select ${index + 1}`, snapshot)
      })
      assertButton(button)

      if (selects[0]?.firstOption !== 'Selecciona país') {
        throw new Error(`${testCase.name} country select placeholder is "${selects[0]?.firstOption}"; expected "Selecciona país"`)
      }

      if (selects[1]?.firstOption !== 'Selecciona tamaño') {
        throw new Error(`${testCase.name} size select placeholder is "${selects[1]?.firstOption}"; expected "Selecciona tamaño"`)
      }

      for (const expected of ['Sin costo', 'Sin compromiso', 'Sin permanencia', 'Datos protegidos']) {
        if (!trustText?.includes(expected)) {
          throw new Error(`${testCase.name} trust copy missing "${expected}"`)
        }
      }

      if (overflowX !== 0) {
        throw new Error(`${testCase.name} has horizontal overflow: ${overflowX}px`)
      }

      results.push({
        name: testCase.name,
        implementation,
        overflowX,
        screenshot,
        inputs,
        selects,
        button,
        trustText: trustText?.trim().replace(/\s+/g, ' ') ?? '',
      })

      await page.close()
    }
  } finally {
    await browser.close()
  }

  const payload = {
    ok: true,
    url: targetUrl,
    contract: 'AEO approved form visual integrity',
    results,
  }

  writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))
}

main().catch(error => {
  console.error(`public-website:verify-aeo-form-visual-integrity failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
