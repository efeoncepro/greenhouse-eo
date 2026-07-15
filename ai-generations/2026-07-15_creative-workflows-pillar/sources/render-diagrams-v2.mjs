import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium } from 'playwright'

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const runDirectory = path.resolve(sourceDirectory, '..')
const mastersDirectory = path.join(runDirectory, 'masters')
const sourceUrl = pathToFileURL(path.join(sourceDirectory, 'diagram-production-v2.html')).href

const outputs = [
  {
    selector: '[data-artboard="decision-boundary"]',
    filename: 'creative-workflows-decision-boundary-master-v2.png'
  },
  {
    selector: '[data-artboard="autonomy-ladder"]',
    filename: 'creative-workflows-autonomy-ladder-master-v2.png'
  }
]

await mkdir(mastersDirectory, { recursive: true })

const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 })

  await page.goto(sourceUrl, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)

  for (const output of outputs) {
    const artboard = page.locator(output.selector)

    await artboard.screenshot({
      path: path.join(mastersDirectory, output.filename),
      animations: 'disabled'
    })
  }
} finally {
  await browser.close()
}

process.stdout.write(`${JSON.stringify({ ok: true, outputs: outputs.map(output => output.filename) }, null, 2)}\n`)
