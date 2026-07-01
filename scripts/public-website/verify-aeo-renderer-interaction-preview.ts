import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { chromium, type Page } from 'playwright'

type InteractionResult = {
  name: string
  viewport: 'desktop' | 'mobile390'
  overflowX: number
  focus: {
    activeName: string | null
    outlineStyle: string
    outlineWidth: string
    boxShadow: string
    screenshot: string
  }
  error: {
    errorCount: number
    summaryItemCount: number
    summaryPresent: boolean
    firstInvalidName: string | null
    firstInvalidAriaInvalid: string | null
    screenshot: string
  }
}

type ReducedMotionResult = {
  name: 'reduced-motion'
  viewport: 'desktop'
  overflowX: number
  inputTransitionDuration: string
  buttonTransitionDuration: string
  inputAnimationDuration: string
  buttonAnimationDuration: string
  screenshot: string
}

const url = 'https://efeoncepro.com/aeo-2/'
const formKey = 'b120566a-dd1a-43c8-956a-4e0121e805b8'
const surfaceId = 'fhsf-efeonce-aeo-diagnostic'
const screenshotDir = '.captures'
const rendererBundlePath = resolve(process.cwd(), 'public/growth-forms/renderer-preview.js')

const viewports = [
  { name: 'desktop' as const, viewport: { width: 1440, height: 1200 } },
  { name: 'mobile390' as const, viewport: { width: 390, height: 1100 } },
]

const maxDurationMs = (value: string) => {
  const parts = value.split(',').map(part => part.trim())

  return Math.max(
    ...parts.map(part => {
      if (part.endsWith('ms')) return Number.parseFloat(part)
      if (part.endsWith('s')) return Number.parseFloat(part) * 1000

      return Number.parseFloat(part)
    }).filter(Number.isFinite),
    0
  )
}

const injectRendererPreview = async (page: Page) => {
  await page.evaluate(({ formKeyValue, surfaceIdValue }) => {
    const card = document.querySelector<HTMLElement>('.gh-aeo-growth-form-card')
    const bridgeForm = document.querySelector<HTMLElement>('.gh-aeo-growth-form')

    if (!card || !bridgeForm) {
      throw new Error('Missing AEO bridge card/form on live page')
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
  }, { formKeyValue: formKey, surfaceIdValue: surfaceId })

  await page.addScriptTag({ path: rendererBundlePath })
  await page.waitForSelector('greenhouse-form .ghf-btn', { timeout: 15000 })
  await page.waitForTimeout(300)
}

const setupPage = async (page: Page, label: string) => {
  const targetUrl = `${url}?gh_aeo_renderer_interaction_preview=${Date.now()}_${label}`

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.gh-aeo-growth-form-card', { timeout: 30000 })
  await page.locator('.gh-aeo-conversion').scrollIntoViewIfNeeded()
  await injectRendererPreview(page)
  await page.locator('.gh-aeo-growth-form-card').scrollIntoViewIfNeeded()
}

const captureInteraction = async (page: Page, name: 'desktop' | 'mobile390'): Promise<InteractionResult> => {
  const firstName = page.locator('.gh-aeo-conversion greenhouse-form [name="firstName"]').first()

  await firstName.focus()
  await page.waitForTimeout(150)

  const focus = await firstName.evaluate((node, screenshotPath) => {
    const element = node as HTMLInputElement
    const style = getComputedStyle(element)

    return {
      activeName: document.activeElement instanceof HTMLInputElement ? document.activeElement.name : null,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      screenshot: screenshotPath as string,
    }
  }, `${screenshotDir}/aeo-renderer-interaction-focus-${name}.png`)

  if (focus.activeName !== 'firstName') {
    throw new Error(`${name} focus activeName is ${focus.activeName}; expected firstName`)
  }

  const hasOutline = focus.outlineStyle !== 'none' && Number.parseFloat(focus.outlineWidth) >= 1
  const hasFocusHalo = focus.boxShadow !== 'none'

  if (!hasOutline && !hasFocusHalo) {
    throw new Error(
      `${name} focus has outline ${focus.outlineWidth} ${focus.outlineStyle} and box-shadow ${focus.boxShadow}; expected visible focus affordance`
    )
  }

  await page.screenshot({ path: focus.screenshot, fullPage: false })
  await page.locator('.gh-aeo-conversion greenhouse-form .ghf-btn').click()
  await page.waitForFunction(() => {
    const summary = document.querySelector('.gh-aeo-conversion greenhouse-form [data-ghf-error-summary]')
    const inlineErrors = document.querySelectorAll('.gh-aeo-conversion greenhouse-form .ghf-error')

    return Boolean(summary) || inlineErrors.length >= 3
  }, null, { timeout: 8000 })
  await page.waitForTimeout(100)

  const errorScreenshot = `${screenshotDir}/aeo-renderer-interaction-error-${name}.png`

  const error = await page.evaluate(screenshotPath => {
    const errors = Array.from(document.querySelectorAll('.gh-aeo-conversion greenhouse-form .ghf-error'))
    const summaryItems = Array.from(document.querySelectorAll('.gh-aeo-conversion greenhouse-form [data-ghf-error-summary] a'))
    const firstInvalid = document.querySelector<HTMLInputElement>('.gh-aeo-conversion greenhouse-form [aria-invalid="true"]')

    return {
      errorCount: errors.length,
      summaryItemCount: summaryItems.length,
      summaryPresent: Boolean(document.querySelector('.gh-aeo-conversion greenhouse-form [data-ghf-error-summary]')),
      firstInvalidName: firstInvalid?.name ?? null,
      firstInvalidAriaInvalid: firstInvalid?.getAttribute('aria-invalid') ?? null,
      screenshot: screenshotPath as string,
    }
  }, errorScreenshot)

  if (error.errorCount < 1) {
    throw new Error(`${name} invalid submit produced ${error.errorCount} inline errors; expected at least one visible field error`)
  }

  if (!error.summaryPresent) {
    throw new Error(`${name} invalid submit did not render the accessible error summary`)
  }

  if (error.summaryItemCount < 3) {
    throw new Error(`${name} error summary has ${error.summaryItemCount} items; expected required field recovery links`)
  }

  if (error.firstInvalidAriaInvalid !== 'true') {
    throw new Error(`${name} first invalid field aria-invalid is ${error.firstInvalidAriaInvalid}; expected true`)
  }

  await page.screenshot({ path: error.screenshot, fullPage: false })

  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  if (overflowX !== 0) {
    throw new Error(`${name} interaction preview has horizontal overflow: ${overflowX}px`)
  }

  return {
    name,
    viewport: name,
    overflowX,
    focus,
    error,
  }
}

const captureReducedMotion = async (page: Page): Promise<ReducedMotionResult> => {
  await page.locator('.gh-aeo-conversion greenhouse-form [name="firstName"]').focus()
  await page.waitForTimeout(50)

  const screenshot = `${screenshotDir}/aeo-renderer-interaction-reduced-motion-desktop.png`

  const values = await page.evaluate(screenshotPath => {
    const input = document.querySelector<HTMLElement>('.gh-aeo-conversion greenhouse-form .ghf-input')
    const button = document.querySelector<HTMLElement>('.gh-aeo-conversion greenhouse-form .ghf-btn')

    if (!input || !button) throw new Error('Missing renderer input/button for reduced-motion probe')

    const inputStyle = getComputedStyle(input)
    const buttonStyle = getComputedStyle(button)

    return {
      inputTransitionDuration: inputStyle.transitionDuration,
      buttonTransitionDuration: buttonStyle.transitionDuration,
      inputAnimationDuration: inputStyle.animationDuration,
      buttonAnimationDuration: buttonStyle.animationDuration,
      screenshot: screenshotPath as string,
    }
  }, screenshot)

  if (maxDurationMs(values.inputTransitionDuration) > 1) {
    throw new Error(`reduced-motion input transition is ${values.inputTransitionDuration}; expected <=1ms`)
  }

  if (maxDurationMs(values.buttonTransitionDuration) > 1) {
    throw new Error(`reduced-motion button transition is ${values.buttonTransitionDuration}; expected <=1ms`)
  }

  if (maxDurationMs(values.inputAnimationDuration) > 1) {
    throw new Error(`reduced-motion input animation is ${values.inputAnimationDuration}; expected <=1ms`)
  }

  if (maxDurationMs(values.buttonAnimationDuration) > 1) {
    throw new Error(`reduced-motion button animation is ${values.buttonAnimationDuration}; expected <=1ms`)
  }

  await page.screenshot({ path: values.screenshot, fullPage: false })

  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  if (overflowX !== 0) {
    throw new Error(`reduced-motion preview has horizontal overflow: ${overflowX}px`)
  }

  return {
    name: 'reduced-motion',
    viewport: 'desktop',
    overflowX,
    ...values,
  }
}

async function main() {
  if (!existsSync(rendererBundlePath)) {
    throw new Error(`Missing ${rendererBundlePath}. Run pnpm renderer:build before this gate.`)
  }

  await mkdir(screenshotDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const interactions: InteractionResult[] = []
  let reducedMotion: ReducedMotionResult | null = null

  try {
    for (const testCase of viewports) {
      const page = await browser.newPage({ viewport: testCase.viewport, colorScheme: 'light' })

      await setupPage(page, testCase.name)
      interactions.push(await captureInteraction(page, testCase.name))
      await page.close()
    }

    const reducedPage = await browser.newPage({
      viewport: viewports[0].viewport,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    })

    await setupPage(reducedPage, 'reduced_motion')
    reducedMotion = await captureReducedMotion(reducedPage)
    await reducedPage.close()
  } finally {
    await browser.close()
  }

  console.log(JSON.stringify({
    ok: true,
    url,
    contract: 'AEO renderer interaction states in live Ohio composition without WordPress mutation',
    interactions,
    reducedMotion,
  }, null, 2))
}

main().catch(error => {
  console.error(`public-website:verify-aeo-renderer-interaction-preview failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
