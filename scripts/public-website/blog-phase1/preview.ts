import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve, basename } from 'node:path'

import { chromium } from 'playwright'
import { load } from 'cheerio'

const runtime = resolve(process.env.BLOG_RUNTIME_DIR || '../efeonce-public-site-runtime-develop')
const plugin = resolve(runtime, 'wp-content/plugins/eo-elementor-widgets')
const out = resolve('.captures/2026-10-20-blog-phase1')

async function main() {
  await mkdir(out, { recursive: true })
  const html = execFileSync('php', [resolve(runtime, 'tests/blog-phase1.test.php'), 'render'], { encoding: 'utf8' })

  const contract = JSON.parse(
    await readFile('.captures/2026-10-20-blog-growth-form/render-contract.preview.json', 'utf8')
  )

  const css = (
    await Promise.all(
      ['blog-phase1.css', 'blog-subscription.css'].map(f => readFile(resolve(plugin, 'assets/css', f), 'utf8'))
    )
  ).join('\n')

  const browser = await chromium.launch({ headless: true })
  const results = []

  try {
    for (const width of process.env.BLOG_WIDTHS?.split(',').map(Number) || [1440, 390, 320]) {
      const page = await browser.newPage({
        viewport: { width, height: width === 1440 ? 1000 : 844 },
        reducedMotion: 'reduce'
      })

      const forbidden: string[] = []
      const errors: string[] = []

      page.on('pageerror', e => errors.push(e.stack || e.message))
      // Preview sandbox: no CMS write, submission, analytics collection or GTM publication.
      await page.route('**/*', async route => {
        const req = route.request(),
          u = new URL(req.url())

        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) {
          forbidden.push(u.pathname)

          return route.abort()
        }

        if (
          /googletagmanager\.com|google-analytics\.com|analytics\.google|track\.hubspot|hubspot.*\/__ptq|\/g\/collect|facebook\.com\/tr/.test(
            req.url()
          )
        )
          return route.abort()

        if (req.isNavigationRequest() && u.hostname === 'efeoncepro.com' && u.pathname === '/blog/') {
          const response = await route.fetch()

          assert.equal(response.status(), 200, 'Live shell must load')
          const $ = load(await response.text())

          assert.equal($('[data-elementor-id="18456"]').length, 1, 'Expected blog document')
          $('[data-elementor-id="18456"]').replaceWith(html)
          $('head').append('<style>' + css + '</style>')
          // Replace before Elementor initializes; never leave handlers attached to removed widgets.

          return route.fulfill({ response, body: $.html() })
        }

        if (u.pathname.startsWith('/wp-content/plugins/eo-elementor-widgets/assets/img/blog/'))
          return route.fulfill({
            contentType: u.pathname.endsWith('.webp') ? 'image/webp' : 'image/svg+xml',
            body: await readFile(resolve(plugin, 'assets/img/blog', basename(u.pathname)))
          })
        if (u.pathname.endsWith('/api/public/growth/forms/' + contract.form.formKey))
          return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(contract),
            headers: { 'Access-Control-Allow-Origin': 'https://efeoncepro.com' }
          })

        return route.continue()
      })
      await page.goto('https://efeoncepro.com/blog/', { waitUntil: 'domcontentloaded' })
      await page.locator('.eo-blog-document').waitFor()
      // Blog content changes only; keep the current Ohio header and shared footer.
      if (!(await page.evaluate(() => !!customElements.get('greenhouse-form'))))
        await page.addScriptTag({ url: 'https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js' })
      await page.locator('.eo-blog-subscription input[type="email"]').waitFor({ timeout: 30000 })
      const essentials = page.getByRole('button', { name: 'Solo esenciales', exact: true })

      await essentials.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
      if (await essentials.isVisible()) await essentials.click()
      await page.evaluate(() => document.fonts.ready)
      const height = await page.evaluate(() => document.documentElement.scrollHeight)

      for (let y = 0; y < height; y += 700) {
        await page.evaluate(top => window.scrollTo(0, top), y)
        await page.waitForTimeout(100)
      }

      await page.evaluate(() =>
        Promise.all(
          Array.from(document.querySelectorAll<HTMLImageElement>('.eo-blog img')).map(img =>
            img.decode().catch(() => {})
          )
        )
      )
      await page.mouse.move(0, 0)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(300)
      await writeFile(resolve(out, `blog-${width}.aria.txt`), await page.locator('.eo-blog-document').ariaSnapshot())
      await page.screenshot({ path: resolve(out, `blog-full-${width}.png`), fullPage: true })
      await page.screenshot({ path: resolve(out, `blog-first-fold-${width}.png`) })

      const info = await page.evaluate(() => ({
        hosts: Array.from(document.querySelectorAll<HTMLElement>('.eo-blog-section-host')).map(n => ({
          height: n.getBoundingClientRect().height,
          margin: getComputedStyle(n).margin,
          padding: getComputedStyle(n).padding,
          gap: getComputedStyle(n).gap,
          widgetMargin: getComputedStyle(n.firstElementChild!).margin,
          widgetPadding: getComputedStyle(n.firstElementChild!).padding,
          sectionHeight: n.querySelector('section')?.getBoundingClientRect().height
        })),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        posts: Array.from(document.querySelectorAll('.eo-blog [data-post-id]')).map(n =>
          n.getAttribute('data-post-id')
        ),
        emptyLinks: document.querySelectorAll('.eo-blog a[href="#"]').length,
        brokenImages: Array.from(document.querySelectorAll<HTMLImageElement>('.eo-blog img'))
          .filter(i => !i.complete || !i.naturalWidth)
          .map(i => i.src),
        h1: document.querySelectorAll('.eo-blog h1').length,
        sections: Array.from(document.querySelectorAll('.eo-blog[data-blog-section]')).map(n =>
          n.getAttribute('data-blog-section')
        ),
        subscribe: document.querySelectorAll('.eo-blog greenhouse-form').length,
        checked: document.querySelector<HTMLInputElement>('.eo-blog input[type="checkbox"]')?.checked,
        fonts: Array.from(document.fonts)
          .filter(f => f.family.startsWith('EoBlog'))
          .map(f => ({ family: f.family, status: f.status }))
      }))

      assert.equal(info.overflow, false)
      assert.equal(info.emptyLinks, 0)
      assert.equal(info.brokenImages.length, 0)
      assert.equal(info.posts.length, new Set(info.posts).size)
      assert.equal(info.h1, 1)
      assert.equal(info.subscribe, 1)
      assert.equal(info.checked, false)
      const topics = page.locator('.eo-blog-topics')

      await topics.locator('summary').focus()
      await page.keyboard.press('Enter')
      assert.equal(await topics.locator('a').count(), 12)
      assert(await topics.getByRole('link', { name: /Glitch/ }).isVisible())
      assert.equal(await topics.getByRole('link', { name: /Redes Sociales/ }).count(), 0)
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
        false
      )
      await topics.screenshot({ path: resolve(out, `topics-${width}.png`) })
      await topics.locator('summary').focus()
      await page.keyboard.press('Enter')
      const form = page.locator('.eo-blog-subscription')

      await form.getByRole('button', { name: 'Suscribirme', exact: true }).click()
      assert((await form.locator('[aria-invalid="true"]').count()) > 0)
      await form.locator('input[type="email"]').fill('invalid')
      await form.getByRole('button', { name: 'Suscribirme', exact: true }).click()
      assert((await form.locator('[aria-invalid="true"]').count()) > 0)
      await form.locator('input[type="email"]').fill('preview+newsletter@gmail.com')
      await form.getByRole('button', { name: 'Suscribirme', exact: true }).click()
      assert((await form.textContent())?.includes(contract.copy['newsletter_consent.error.required']))
      assert(!forbidden.some(p => p.endsWith('/submit')))
      assert.equal(
        await page.evaluate(
          () => ((window as any).dataLayer || []).filter((e: any) => e.event === 'gh_form_submission_accepted').length
        ),
        0
      )
      assert(
        errors.every(e => e.includes('send-app-cf7-form-tracker.js')),
        'Unexpected runtime error'
      )
      results.push({
        width,
        ...info,
        errors,
        blockedWritePaths: forbidden,
        invalidEmailRejected: true,
        gmailRequiresConsent: true,
        acceptedEvents: 0,
        previewOnly: true
      })
      await page.close()
    }
  } finally {
    await browser.close()
  }

  await writeFile(resolve(out, 'evidence.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
