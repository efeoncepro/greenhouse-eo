import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium } from 'playwright'

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const runDirectory = path.resolve(sourceDirectory, '..')
const mastersDirectory = path.join(runDirectory, 'masters')
const sourceUrl = pathToFileURL(path.join(sourceDirectory, 'diagram-production-v2.html')).href
const overridePath = path.join(sourceDirectory, 'decision-boundary-v3-overrides.css')
const filename = 'creative-workflows-decision-boundary-master-v3.png'

await mkdir(mastersDirectory, { recursive: true })

const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 })

  await page.goto(sourceUrl, { waitUntil: 'load' })
  await page.addStyleTag({ path: overridePath })
  await page.locator('[data-artboard="decision-boundary"] h1').evaluate(element => {
    element.textContent = 'La frontera entre ejecutar, ampliar y decidir'
  })
  await page.evaluate(() => document.fonts.ready)

  await page.locator('[data-artboard="decision-boundary"]').screenshot({
    path: path.join(mastersDirectory, filename),
    animations: 'disabled'
  })
} finally {
  await browser.close()
}

process.stdout.write(`${JSON.stringify({ ok: true, output: filename }, null, 2)}\n`)
