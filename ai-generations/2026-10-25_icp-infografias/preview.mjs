import { chromium } from 'playwright'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = path.dirname(fileURLToPath(import.meta.url))
const files = (await readdir(path.join(dir, 'delivery'))).filter(f => f.endsWith('.svg'))
const browser = await chromium.launch()
const page = await browser.newPage()
for (const f of files) {
  await page.goto('file://' + path.join(dir, 'delivery', f))
  const el = await page.$('svg')
  await el.screenshot({ path: path.join(dir, 'review', f.replace('.svg', '.png')) })
}
await browser.close()
console.log('ok', files.length)
