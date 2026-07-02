import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium } from 'playwright'

type ViewportResult = {
  viewport: string
  pageOverflowX: number
  sectionOverflowX: number | null
  imgSrc: string | null
  imgComplete: boolean
  naturalWidth: number
  naturalHeight: number
  imgBox: Box | null
  sourceBox: Box | null
  cardBox: Box | null
  yearBox: Box | null
  computedHeight: string | null
  computedDisplay: string | null
  accessibleLabel: string | null
  textContent: string
  failures: string[]
}

type Box = {
  x: number
  y: number
  width: number
  height: number
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
const captureDir = path.resolve(process.cwd(), screenshotRoot, `aeo-market-sparktoro-logo-${timestamp}`)
const cacheBust = `gh_verify=sparktoro-logo-${Date.now()}`
const targetUrl = url.includes('?') ? `${url}&${cacheBust}` : `${url}?${cacheBust}`

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

    const market = page.locator('.gh-aeo-market-optimized').first()

    await market.waitFor({ state: 'visible', timeout: 30000 })
    await market.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200)

    const image = page.locator('.gh-aeo-market-optimized .gh-aeo-source-logo-sparktoro img').first()

    await image.waitFor({ state: 'visible', timeout: 15000 })

    const metrics = await page.evaluate(() => {
      const source = document.querySelector('.gh-aeo-market-optimized .gh-aeo-source-logo-sparktoro')
      const img = document.querySelector<HTMLImageElement>('.gh-aeo-market-optimized .gh-aeo-source-logo-sparktoro img')
      const card = source?.closest('.gh-aeo-metric-card')
      const section = document.querySelector<HTMLElement>('.gh-aeo-market-optimized')
      const year = source?.parentElement?.querySelector('.gh-aeo-source-year')
      const computed = img ? getComputedStyle(img) : null
      const imgRect = img?.getBoundingClientRect()
      const sourceRect = source?.getBoundingClientRect()
      const cardRect = card?.getBoundingClientRect()
      const yearRect = year?.getBoundingClientRect()

      return {
        pageOverflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        sectionOverflowX: section ? Math.max(0, section.scrollWidth - section.clientWidth) : null,
        imgSrc: img?.getAttribute('src') || null,
        imgComplete: Boolean(img?.complete),
        naturalWidth: img?.naturalWidth || 0,
        naturalHeight: img?.naturalHeight || 0,
        imgBox: imgRect ? { x: imgRect.x, y: imgRect.y, width: imgRect.width, height: imgRect.height } : null,
        sourceBox: sourceRect
          ? { x: sourceRect.x, y: sourceRect.y, width: sourceRect.width, height: sourceRect.height }
          : null,
        cardBox: cardRect ? { x: cardRect.x, y: cardRect.y, width: cardRect.width, height: cardRect.height } : null,
        yearBox: yearRect ? { x: yearRect.x, y: yearRect.y, width: yearRect.width, height: yearRect.height } : null,
        computedHeight: computed?.height || null,
        computedDisplay: computed?.display || null,
        accessibleLabel: source?.getAttribute('aria-label') || null,
        textContent: source?.textContent?.trim() || '',
      }
    })

    const failures: string[] = []

    if (!metrics.imgSrc?.includes('/wp-content/uploads/greenhouse/aeo-market-logos/sparktoro-logo.svg')) {
      failures.push('SparkToro image source is not the uploaded SVG')
    }

    if (!metrics.imgComplete || metrics.naturalWidth <= 0 || metrics.naturalHeight <= 0) {
      failures.push('SparkToro SVG image did not load')
    }

    if (!metrics.imgBox || metrics.imgBox.width < 70 || metrics.imgBox.height < 12) {
      failures.push('SparkToro image rendered too small')
    }

    if (metrics.accessibleLabel !== 'SparkToro') {
      failures.push('SparkToro source mark is missing accessible label')
    }

    if (metrics.textContent) {
      failures.push('SparkToro source mark still exposes visible text fallback')
    }

    if (metrics.pageOverflowX !== 0) failures.push(`Page horizontal overflow ${metrics.pageOverflowX}px`)
    if (metrics.sectionOverflowX !== 0) failures.push(`Market section horizontal overflow ${metrics.sectionOverflowX}px`)

    if (metrics.imgBox && metrics.cardBox) {
      const withinCard =
        metrics.imgBox.x >= metrics.cardBox.x &&
        metrics.imgBox.x + metrics.imgBox.width <= metrics.cardBox.x + metrics.cardBox.width &&
        metrics.imgBox.y >= metrics.cardBox.y &&
        metrics.imgBox.y + metrics.imgBox.height <= metrics.cardBox.y + metrics.cardBox.height

      if (!withinCard) failures.push('SparkToro image is not contained inside its card')
    }

    if (metrics.imgBox && metrics.yearBox && metrics.imgBox.x + metrics.imgBox.width > metrics.yearBox.x - 2) {
      failures.push('SparkToro image overlaps the year separator')
    }

    await market.screenshot({ path: path.join(captureDir, `${viewport.name}-market.png`) })
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
