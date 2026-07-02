import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium } from 'playwright'

type Box = {
  x: number
  y: number
  width: number
  height: number
}

type ViewportResult = {
  viewport: string
  pageOverflowX: number
  sectionOverflowX: number | null
  proofOverflowX: number | null
  proofText: string
  proofAriaLabel: string | null
  discCount: number
  countDiscText: string
  countDiscBox: Box | null
  countriesBox: Box | null
  proofBox: Box | null
  countDiscBackground: string | null
  countDiscBackgroundImage: string | null
  countDiscColor: string | null
  countDiscVisible: boolean
  countryTextVisible: boolean
  oldBrandLabelVisible: boolean
  oldCountryCopyVisible: boolean
  failures: string[]
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
const screenshotRoot = getArg('--screenshot-dir', '.captures')
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const captureDir = path.resolve(process.cwd(), screenshotRoot, `aeo-why-proof-meta-${timestamp}`)
const cacheBust = `gh_verify=why-proof-meta-${Date.now()}`
const targetUrl = url.includes('?') ? `${url}&${cacheBust}` : `${url}?${cacheBust}`
const expectedCountries = 'Chile · Colombia · México · Perú'

const main = async () => {
  await fs.mkdir(captureDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const results: ViewportResult[] = []

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1100 },
    { name: 'mobile390', width: 390, height: 1100 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })

    const section = page.locator('.gh-aeo-why-logo-marquee-wrap').first()

    await section.waitFor({ state: 'visible', timeout: 30000 })
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200)

    const metrics = await page.evaluate(expectedCountriesText => {
      const sectionElement = document.querySelector<HTMLElement>('.gh-aeo-why-logo-marquee-wrap')
      const proof = document.querySelector<HTMLElement>('.gh-aeo-why-logo-marquee-wrap .gh-aeo-brand-proof')
      const discs = Array.from(document.querySelectorAll<HTMLElement>('.gh-aeo-why-logo-marquee-wrap .gh-aeo-brand-proof-disc'))
      const countDisc = document.querySelector<HTMLElement>('.gh-aeo-why-logo-marquee-wrap .gh-aeo-brand-proof-disc--count')
      const countries = document.querySelector<HTMLElement>('.gh-aeo-why-logo-marquee-wrap .gh-aeo-brand-proof-copy--countries')
      const countDiscStyle = countDisc ? getComputedStyle(countDisc) : null
      const proofText = proof?.innerText.replace(/\s+/g, ' ').trim() || ''
      const bodyText = document.body.innerText.replace(/\s+/g, ' ')
      const countDiscRect = countDisc?.getBoundingClientRect()
      const countriesRect = countries?.getBoundingClientRect()
      const proofRect = proof?.getBoundingClientRect()

      return {
        pageOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        sectionOverflowX: sectionElement ? Math.max(0, sectionElement.scrollWidth - sectionElement.clientWidth) : null,
        proofOverflowX: proof ? Math.max(0, proof.scrollWidth - proof.clientWidth) : null,
        proofText,
        proofAriaLabel: proof?.getAttribute('aria-label') || null,
        discCount: discs.length,
        countDiscText: countDisc?.innerText.trim() || '',
        countDiscBox: countDiscRect
          ? { x: countDiscRect.x, y: countDiscRect.y, width: countDiscRect.width, height: countDiscRect.height }
          : null,
        countriesBox: countriesRect
          ? { x: countriesRect.x, y: countriesRect.y, width: countriesRect.width, height: countriesRect.height }
          : null,
        proofBox: proofRect ? { x: proofRect.x, y: proofRect.y, width: proofRect.width, height: proofRect.height } : null,
        countDiscBackground: countDiscStyle?.backgroundColor || null,
        countDiscBackgroundImage: countDiscStyle?.backgroundImage || null,
        countDiscColor: countDiscStyle?.color || null,
        countDiscVisible: Boolean(countDisc && countDisc.offsetParent !== null),
        countryTextVisible: Boolean(proofText.includes(expectedCountriesText)),
        oldBrandLabelVisible: /\+120\s+marcas/i.test(proofText),
        oldCountryCopyVisible: /4\s+pa[ií]ses/i.test(proofText) || bodyText.includes('4 países'),
      }
    }, expectedCountries)

    const failures: string[] = []

    if (metrics.discCount !== 4) failures.push(`Expected 4 avatar discs, found ${metrics.discCount}`)
    if (!metrics.countDiscVisible) failures.push('Count disc is not visible')
    if (metrics.countDiscText !== '+120') failures.push(`Count disc text is "${metrics.countDiscText}"`)
    if (!metrics.countryTextVisible) failures.push('Country list is not visible in the proof pill')
    if (metrics.oldBrandLabelVisible) failures.push('Old visible "+120 marcas" copy is still present')
    if (metrics.oldCountryCopyVisible) failures.push('Old visible "4 países" copy is still present')

    if (!metrics.proofAriaLabel?.includes('más de 120 marcas acompañadas en Chile, Colombia, México y Perú')) {
      failures.push('Accessible proof label does not describe the brand count and countries')
    }

    if (
      (!metrics.countDiscBackground || metrics.countDiscBackground === 'rgba(0, 0, 0, 0)') &&
      (!metrics.countDiscBackgroundImage || metrics.countDiscBackgroundImage === 'none')
    ) {
      failures.push('Count disc does not have a visible gray fill')
    }

    if (metrics.pageOverflowX !== 0) failures.push(`Page horizontal overflow ${metrics.pageOverflowX}px`)
    if (metrics.proofOverflowX !== 0) failures.push(`Why proof pill horizontal overflow ${metrics.proofOverflowX}px`)

    if (metrics.proofBox && metrics.countDiscBox && metrics.countriesBox) {
      const countWithinProof =
        metrics.countDiscBox.x >= metrics.proofBox.x &&
        metrics.countDiscBox.x + metrics.countDiscBox.width <= metrics.proofBox.x + metrics.proofBox.width &&
        metrics.countDiscBox.y >= metrics.proofBox.y &&
        metrics.countDiscBox.y + metrics.countDiscBox.height <= metrics.proofBox.y + metrics.proofBox.height

      const countriesWithinProof =
        metrics.countriesBox.x >= metrics.proofBox.x &&
        metrics.countriesBox.x + metrics.countriesBox.width <= metrics.proofBox.x + metrics.proofBox.width + 1 &&
        metrics.countriesBox.y >= metrics.proofBox.y &&
        metrics.countriesBox.y + metrics.countriesBox.height <= metrics.proofBox.y + metrics.proofBox.height + 1

      if (!countWithinProof) failures.push('Count disc is not contained inside the proof pill')
      if (!countriesWithinProof) failures.push('Country list is not contained inside the proof pill')

      if (metrics.countDiscBox.x + metrics.countDiscBox.width > metrics.countriesBox.x - 4) {
        failures.push('Count disc overlaps the country list')
      }
    }

    await section.screenshot({ path: path.join(captureDir, `${viewport.name}-why-proof.png`) })
    await page.screenshot({ path: path.join(captureDir, `${viewport.name}-full-page.png`), fullPage: true })

    results.push({ viewport: viewport.name, ...metrics, failures })
    await page.close()
  }

  await browser.close()

  await fs.writeFile(path.join(captureDir, 'manifest.json'), JSON.stringify(results, null, 2))

  const failures = results.flatMap(result => result.failures.map(failure => `${result.viewport}: ${failure}`))

  console.log(JSON.stringify({ ok: failures.length === 0, captureDir, results }, null, 2))

  if (failures.length > 0) {
    throw new Error(failures.join('; '))
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
