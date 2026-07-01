import { existsSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

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
  color: string
  letterSpacing: string
  left: number
  top: number
  width: number
  height: number
}

type ViewportResult = {
  name: string
  overflowX: number
  screenshot: string
  dropdownScreenshot: string
  inputs: ControlSnapshot[]
  selects: (ControlSnapshot & { firstOption: string })[]
  dropdown: ControlSnapshot & { optionCount: number }
  button: ControlSnapshot
  trustText: string
  formKey: string | null
}

const url = 'https://efeoncepro.com/aeo-2/'
const formKey = 'b120566a-dd1a-43c8-956a-4e0121e805b8'
const surfaceId = 'fhsf-efeonce-aeo-diagnostic'
const screenshotDir = '.captures'
const manifestPath = `${screenshotDir}/aeo-renderer-real-composition-preview-manifest.json`
const rendererBundlePath = resolve(process.cwd(), 'public/growth-forms/renderer-preview.js')

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 1200 } },
  { name: 'mobile390', viewport: { width: 390, height: 1300 } },
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
    throw new Error(`${label} background is ${snapshot.backgroundColor}; expected white field surface`)
  }

  if (snapshot.borderStyle === 'none' || Number.parseFloat(snapshot.borderWidth) < 1) {
    throw new Error(`${label} border is ${snapshot.borderWidth} ${snapshot.borderStyle}; expected visible border`)
  }

  if (snapshot.height < 42) {
    throw new Error(`${label} height is ${snapshot.height}px; expected >=42px`)
  }
}

const assertSelect = (label: string, snapshot: ControlSnapshot) => {
  assertField(label, snapshot)

  if (snapshot.backgroundImage !== 'none') {
    throw new Error(`${label} background-image is ${snapshot.backgroundImage}; expected none in renderer preview`)
  }

  if (snapshot.backgroundRepeat !== 'no-repeat') {
    throw new Error(`${label} background-repeat is ${snapshot.backgroundRepeat}; expected no-repeat`)
  }
}

const assertButton = (snapshot: ControlSnapshot) => {
  if (!snapshot.text.includes('Solicitar diagnóstico gratis')) {
    throw new Error(`CTA text is "${snapshot.text}"; expected approved AEO CTA`)
  }

  if (!isApprovedTeal(snapshot.backgroundColor)) {
    throw new Error(`${snapshot.selector} background is ${snapshot.backgroundColor}; expected approved teal CTA`)
  }

  if (snapshot.height < 42) {
    throw new Error(`CTA height is ${snapshot.height}px; expected >=42px`)
  }
}

const assertDropdown = (label: string, snapshot: ControlSnapshot & { optionCount: number }) => {
  if (!isNearWhite(snapshot.backgroundColor)) {
    throw new Error(`${label} background is ${snapshot.backgroundColor}; expected premium white dropdown panel`)
  }

  if (snapshot.borderStyle === 'none' || Number.parseFloat(snapshot.borderWidth) < 1) {
    throw new Error(`${label} border is ${snapshot.borderWidth} ${snapshot.borderStyle}; expected visible dropdown border`)
  }

  if (snapshot.optionCount < 5) {
    throw new Error(`${label} option count is ${snapshot.optionCount}; expected full option list`)
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

const injectRendererPreview = async (page: Page) => {
  const mode = await page.evaluate(({ formKeyValue, surfaceIdValue }) => {
    const card = document.querySelector<HTMLElement>('.gh-aeo-growth-form-card')
    const liveForm = document.querySelector<HTMLElement>('.gh-aeo-growth-form-card greenhouse-form')

    if (card && liveForm) {
      const preview = document.createElement('div')

      preview.className = 'gh-aeo-renderer-real-composition-preview'
      liveForm.before(preview)
      preview.appendChild(liveForm)
      card
        .querySelectorAll<HTMLElement>(
          '.gh-aeo-growth-form-proof, .gh-aeo-growth-form-privacy, .gh-aeo-growth-form-direct, .gh-aeo-growth-form-status'
        )
        .forEach(node => preview.appendChild(node))
      card.setAttribute('data-greenhouse-renderer-preview', 'live-renderer')

      return 'live-renderer'
    }

    const bridgeForm = document.querySelector<HTMLElement>('.gh-aeo-growth-form')

    if (!card || !bridgeForm) {
      throw new Error('Missing AEO bridge card/form or live greenhouse-form on live page')
    }

    const trustNodes = Array.from(
      bridgeForm.querySelectorAll<HTMLElement>(
        '.gh-aeo-growth-form-proof, .gh-aeo-growth-form-privacy, .gh-aeo-growth-form-direct, .gh-aeo-growth-form-status'
      )
    ).map(node => node.cloneNode(true) as HTMLElement)

    const preview = document.createElement('div')

    preview.className = 'gh-aeo-renderer-real-composition-preview'

    const form = document.createElement('greenhouse-form')

    form.setAttribute('form-key', formKeyValue)
    form.setAttribute('surface', surfaceIdValue)
    form.setAttribute('locale', 'es-CL')
    form.setAttribute('base-url', 'https://greenhouse.efeoncepro.com')
    form.setAttribute('color-scheme', 'light')
    form.setAttribute('appearance', 'bare')
    form.setAttribute('data-capture', 'aeo-renderer-preview-form')
    form.setAttribute(
      'style',
      [
        '--ghf-font:"DM Sans",Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        '--ghf-bg:transparent',
        '--ghf-field-bg:#ffffff',
        '--ghf-border:#dfe6ee',
        '--ghf-border-strong:#b9c8d8',
        '--ghf-accent:#36c8bf',
        '--ghf-accent-contrast:#023c70',
        '--ghf-radius:12px',
        '--ghf-gap:18px',
      ].join(';')
    )

    preview.appendChild(form)
    trustNodes.forEach(node => preview.appendChild(node))
    bridgeForm.replaceWith(preview)
    card.setAttribute('data-greenhouse-renderer-preview', '1')

    return 'in-memory-preview'
  }, { formKeyValue: formKey, surfaceIdValue: surfaceId })

  if (mode === 'in-memory-preview') {
    await page.addScriptTag({ path: rendererBundlePath })
  }

  await page.waitForSelector('greenhouse-form .ghf-btn', { timeout: 15000 })
  await page.waitForTimeout(500)

  return mode
}

async function main() {
  if (!existsSync(rendererBundlePath)) {
    throw new Error(`Missing ${rendererBundlePath}. Run pnpm renderer:build before this gate.`)
  }

  await mkdir(screenshotDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const results: ViewportResult[] = []

  try {
    for (const testCase of viewports) {
      const page = await browser.newPage({ viewport: testCase.viewport, colorScheme: 'light' })
      const targetUrl = `${url}?gh_aeo_renderer_preview=${Date.now()}_${testCase.name}`

      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.locator('.gh-aeo-conversion').scrollIntoViewIfNeeded()
      await page.waitForSelector('.gh-aeo-growth-form-card', { timeout: 30000 })
      await injectRendererPreview(page)
      await page.locator('.gh-aeo-growth-form-card').scrollIntoViewIfNeeded()

      const inputCount = await page.locator('.gh-aeo-conversion greenhouse-form .ghf-input').count()
      const selectCount = await page.locator('.gh-aeo-conversion greenhouse-form .ghf-select').count()

      if (inputCount < 3) {
        throw new Error(`${testCase.name} renderer preview found ${inputCount} inputs; expected at least 3`)
      }

      if (selectCount !== 2) {
        throw new Error(`${testCase.name} renderer preview found ${selectCount} selects; expected exactly 2`)
      }

      const inputs = await Promise.all(
        [0, 1, 2].map(index => readControl(page, `.gh-aeo-conversion greenhouse-form .ghf-input >> nth=${index}`))
      )

      const selects = await Promise.all(
        [0, 1].map(index =>
          page.locator('.gh-aeo-conversion greenhouse-form .ghf-select').nth(index).evaluate((node, selected) => {
            const element = node as HTMLElement
            const style = getComputedStyle(element)
            const rect = element.getBoundingClientRect()
            const nativeSelect = element instanceof HTMLSelectElement

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
              firstOption: nativeSelect
                ? element.querySelector('option')?.textContent?.replace(/^—/, '').trim() ?? ''
                : element.textContent?.trim().replace(/\s+/g, ' ') ?? '',
            }
          }, `.gh-aeo-conversion greenhouse-form .ghf-select >> nth=${index}`)
        )
      )

      const button = await readControl(page, '.gh-aeo-conversion greenhouse-form .ghf-btn')
      const trustText = await page.locator('.gh-aeo-renderer-real-composition-preview .gh-aeo-growth-form-proof').first().textContent().catch(() => '')
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      const currentFormKey = await page.locator('greenhouse-form').first().getAttribute('form-key')
      const screenshot = `${screenshotDir}/aeo-renderer-real-composition-preview-${testCase.name}.png`
      const dropdownScreenshot = `${screenshotDir}/aeo-renderer-real-composition-preview-dropdown-${testCase.name}.png`

      await page.screenshot({ path: screenshot, fullPage: false })

      await page.locator('.gh-aeo-conversion greenhouse-form .ghf-select-trigger').nth(1).click()
      await page.waitForSelector('.gh-aeo-conversion greenhouse-form .ghf-select-list:not([hidden])', { timeout: 3000 })

      const dropdown = {
        ...(await readControl(page, '.gh-aeo-conversion greenhouse-form .ghf-select-list:not([hidden])')),
        optionCount: await page.locator('.gh-aeo-conversion greenhouse-form .ghf-select-list:not([hidden]) [role="option"]').count(),
      }

      await page.screenshot({ path: dropdownScreenshot, fullPage: false })

      inputs.forEach((snapshot, index) => assertField(`${testCase.name} renderer input ${index + 1}`, snapshot))
      selects.forEach((snapshot, index) => assertSelect(`${testCase.name} renderer select ${index + 1}`, snapshot))
      assertButton(button)
      assertDropdown(`${testCase.name} renderer dropdown`, dropdown)
      assertSameDesktopRow(testCase.name, 'name/email fields', inputs[0], inputs[1])
      assertSameDesktopRow(testCase.name, 'country/company size selects', selects[0], selects[1])

      if (!selects[0]?.firstOption.includes('Selecciona país')) {
        throw new Error(`${testCase.name} country select placeholder is "${selects[0]?.firstOption}"`)
      }

      if (!selects[1]?.firstOption.includes('Selecciona tamaño')) {
        throw new Error(`${testCase.name} size select placeholder is "${selects[1]?.firstOption}"`)
      }

      for (const expected of ['Sin costo', 'Sin compromiso', 'Sin permanencia', 'Datos protegidos']) {
        if (!trustText?.includes(expected)) {
          throw new Error(`${testCase.name} trust copy missing "${expected}"`)
        }
      }

      if (overflowX !== 0) {
        throw new Error(`${testCase.name} renderer preview has horizontal overflow: ${overflowX}px`)
      }

      results.push({
        name: testCase.name,
        overflowX,
        screenshot,
        dropdownScreenshot,
        inputs,
        selects,
        dropdown,
        button,
        trustText: trustText?.trim().replace(/\s+/g, ' ') ?? '',
        formKey: currentFormKey,
      })

      await page.close()
    }
  } finally {
    await browser.close()
  }

  const payload = {
    ok: true,
    url,
    contract: 'AEO renderer preview in live Ohio composition without WordPress mutation',
    results,
  }

  writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))
}

main().catch(error => {
  console.error(`public-website:verify-aeo-renderer-real-composition-preview failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
