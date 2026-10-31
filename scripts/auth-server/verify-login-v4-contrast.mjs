/** TASK-2064: conservative pixel measurement beneath actual text ranges, including the SVG/photo stage.
 * Hides glyph color only in an isolated diagnostic page, leaving layout and backgrounds intact.
 * Scans every fourth background pixel across each text line; reports minimum contrast (not average).
 */
import { mkdir, writeFile } from 'node:fs/promises'

import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const origin = 'http://127.0.0.1:19064'
const output = '.captures/task2064-pixel-contrast'
const browser = await chromium.launch({ headless: true })
const results = []
const luminance = rgb => rgb.map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((n, value, i) => n + value * [.2126, .7152, .0722][i], 0)
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)

await mkdir(output, { recursive: true })

try {
  for (const width of [1440, 390]) for (const route of ['/login/rooms', '/login/announcements']) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })

    await page.goto(origin + route)
    await page.evaluate(() => document.fonts.ready)

    const items = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d')
      const result = []
      const elements = [...document.querySelectorAll('h1,h2,p,label,button,a,span')].filter(el => el.checkVisibility())

      for (const el of elements) {
        const cs = getComputedStyle(el)
        const textNodes = [...el.childNodes].filter(node => node.nodeType === 3 && node.textContent.trim())

        for (const node of textNodes) {
          const range = document.createRange()

          range.selectNodeContents(node)
          ctx.fillStyle = cs.color
          ctx.fillRect(0, 0, 1, 1)
          const fg = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
          const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700)

          result.push({ text: node.textContent.trim(), fg, floor: large ? 3 : 4.5, rects: [...range.getClientRects()].map(rect => ({ x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height })) })
        }
      }

      for (const el of elements) el.style.setProperty('color', 'transparent', 'important')

      return result
    })

    const png = PNG.sync.read(await page.screenshot({ path: `${output}/${width}-${route.replaceAll('/', '-')}-background.png`, fullPage: true }))

    for (const item of items) {
      let min = 21

      for (const rect of item.rects) for (let y = Math.ceil(rect.y + 2); y < rect.y + rect.height - 2; y += 4) for (let x = Math.ceil(rect.x + 2); x < rect.x + rect.width - 2; x += 4) {
        if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue
        const i = (y * png.width + x) * 4

        min = Math.min(min, contrast(item.fg, [...png.data.slice(i, i + 3)]))
      }

      results.push({ width, route, text: item.text, floor: item.floor, minimum: Number(min.toFixed(2)), pass: min >= item.floor })
    }

    await page.close()
  }

  await writeFile(`${output}/results.json`, JSON.stringify({ method: 'minimum-per-text-line-background-grid-4px', results }, null, 2))
  const failures = results.filter(item => !item.pass)

  console.log(`${results.length} text ranges; ${failures.length} below WCAG floor`)
  for (const result of failures) console.log(JSON.stringify(result))
  if (failures.length) process.exitCode = 1
} finally { await browser.close() }
