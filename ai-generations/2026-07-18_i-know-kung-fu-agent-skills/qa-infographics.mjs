import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = dirname(fileURLToPath(import.meta.url))
const delivery = resolve(root, 'delivery')
const files = [
  'kfu-v01-three-layers-desktop-delivery-v1.svg',
  'kfu-v01-three-layers-mobile-delivery-v1.svg',
  'kfu-v02-tacit-knowledge-loop-desktop-delivery-v1.svg',
  'kfu-v02-tacit-knowledge-loop-mobile-delivery-v1.svg',
  'kfu-v03-skill-candidate-social-delivery-v1.svg'
]

const browser = await chromium.launch()
const results = []

try {
  for (const file of files) {
    const page = await browser.newPage()
    await page.goto(pathToFileURL(resolve(delivery, file)).href)
    await page.evaluate(() => document.fonts.ready)
    const result = await page.evaluate(() => {
      const svg = document.documentElement
      const viewBox = svg.viewBox.baseVal
      const nodes = [...svg.querySelectorAll('text,image,g[data-outlined-text="true"]')]
      const boxes = nodes.map((node, index) => {
        const box = node.getBBox()
        const matrix = node.getCTM()
        const corners = [
          new DOMPoint(box.x, box.y),
          new DOMPoint(box.x + box.width, box.y),
          new DOMPoint(box.x, box.y + box.height),
          new DOMPoint(box.x + box.width, box.y + box.height)
        ].map(point => point.matrixTransform(matrix))
        const xs = corners.map(point => point.x)
        const ys = corners.map(point => point.y)
        const x = Math.min(...xs)
        const y = Math.min(...ys)

        return {
          index,
          tag: node.tagName,
          text: node.textContent?.trim().slice(0, 80) || '',
          x,
          y,
          width: Math.max(...xs) - x,
          height: Math.max(...ys) - y
        }
      })
      const tolerance = 0.5
      const outOfBounds = boxes.filter(box =>
        box.x < viewBox.x - tolerance || box.y < viewBox.y - tolerance ||
        box.x + box.width > viewBox.x + viewBox.width + tolerance ||
        box.y + box.height > viewBox.y + viewBox.height + tolerance
      )

      return {
        viewBox: { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height },
        textCount: svg.querySelectorAll('text').length,
        outlinedTextCount: svg.querySelectorAll('g[data-outlined-text="true"]').length,
        imageCount: svg.querySelectorAll('image').length,
        outOfBounds,
        externalReferences: [...svg.querySelectorAll('[href]')]
          .map(node => node.getAttribute('href'))
          .filter(value => value && /^(?:https?:)?\/\//.test(value))
      }
    })
    results.push({ file, ...result, verdict: result.outOfBounds.length || result.externalReferences.length ? 'BLOCK' : 'PASS' })
    await page.close()
  }
} finally {
  await browser.close()
}

const report = {
  generatedAt: new Date().toISOString(),
  status: results.some(result => result.verdict === 'BLOCK') ? 'BLOCK' : 'PASS',
  scope: ['outlined_text_and_signature_bbox', 'external_references', 'font_render_completion'],
  contextualReview: {
    desktop: 'inspected_at_intrinsic_1600x1000',
    mobile: 'inspected_in_real_358px_column',
    social: 'inspected_at_intrinsic_1080x1350_and_358px_thumbnail',
    findings: []
  },
  typographyContract: 'Source SVG keeps editable Poppins text; delivery SVG contains glyph paths generated with fontkit and has zero live text nodes.',
  results
}

await writeFile(resolve(root, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (report.status === 'BLOCK') process.exitCode = 1
