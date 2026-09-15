import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { chromium } from 'playwright'

const root = process.cwd()

const cssPath = resolve(
  root,
  '../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/css/contact-landing.css'
)

const outputDir = resolve(root, '.captures/2026-09-15_contacto-responsive-composition')
const url = 'https://efeoncepro.com/contacto/?gh_contacto_qa=202609151450'

async function main() {
  await mkdir(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const results: Array<Record<string, unknown>> = []

  try {
    for (const viewport of [
      { name: 'responsive-684', width: 684, height: 987 },
      { name: 'mobile-390', width: 390, height: 844 }
    ]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })

      await page.route('**/growth-cta/renderer-latest.js', route => route.abort())
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.addStyleTag({ path: cssPath })
      await page.addStyleTag({
        content:
          '.gh-contact__band-inner>.gh-contact__cta-preview{display:block;width:100%;max-width:none;margin-top:16px;grid-column:1/-1!important;grid-row:2!important;justify-self:stretch}.gh-contact__cta-preview .ghc-primary{min-height:47px;display:flex;align-items:center;justify-content:center;width:100%;border:0;border-radius:7px;color:#075fc5;background:#fff;font:inherit;font-size:14px;font-weight:600}'
      })
      await page.evaluate(() => {
        const inner = document.querySelector<HTMLElement>('.gh-contact__band-inner')!

        inner.querySelector('greenhouse-cta')?.remove()
        inner.insertAdjacentHTML(
          'beforeend',
          '<div class="gh-contact__cta-preview" data-responsive-cta><button class="ghc-primary">Agendar una reunión →</button></div>'
        )
      })
      await page.waitForTimeout(300)

      const [hero, intro, band, bandInner, cta, pageStyles] = await Promise.all([
        page.locator('.gh-contact-hero').boundingBox(),
        page.locator('.gh-contact__mobile-intro').boundingBox(),
        page.locator('.gh-contact-meeting-band').boundingBox(),
        page.locator('.gh-contact__band-inner').boundingBox(),
        page.locator('[data-responsive-cta]').boundingBox(),
        page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          heroBackgroundPosition: getComputedStyle(document.querySelector<HTMLElement>('.gh-contact-hero')!)
            .backgroundPosition,
          heroBackgroundSize: getComputedStyle(document.querySelector<HTMLElement>('.gh-contact-hero')!).backgroundSize
        }))
      ])

      const metrics = { hero, intro, band, bandInner, cta, ...pageStyles }

      console.log(JSON.stringify({ viewport, metrics }))
      assert.equal(metrics.overflow, 0)

      assert(metrics.hero && metrics.intro && metrics.band && metrics.bandInner && metrics.cta)
      assert(metrics.intro.y > metrics.hero.y + metrics.hero.height * 0.62)
      assert(metrics.intro.y + metrics.intro.height < metrics.hero.y + metrics.hero.height)
      assert(metrics.band.height < 290)
      assert(metrics.cta.width >= metrics.bandInner.width - 2)
      assert.match(metrics.heroBackgroundPosition, /top|0%/)

      await page.locator('.gh-contact-hero').screenshot({ path: resolve(outputDir, `${viewport.name}-hero.png`) })
      await page
        .locator('.gh-contact-meeting-band')
        .screenshot({ path: resolve(outputDir, `${viewport.name}-meeting-band.png`) })

      results.push({ viewport, ...metrics })
      await page.close()
    }
  } finally {
    await browser.close()
  }

  console.log(JSON.stringify({ outputDir, results }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
