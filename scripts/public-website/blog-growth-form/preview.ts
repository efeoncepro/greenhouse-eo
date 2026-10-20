import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { chromium } from 'playwright'

/** Browser-only preview on the real WordPress host. Every submission is blocked before network. */
async function main() {
  const out = resolve('.captures/2026-10-20-blog-growth-form')
  const contract = JSON.parse(await readFile(resolve(out, 'render-contract.preview.json'), 'utf8'))
  const browser = await chromium.launch({ headless: true })
  const evidence = []

  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } })
      let blockedSubmits = 0

      await page.route('**/api/public/growth/forms/**', async route => {
        if (route.request().method() !== 'GET') {
          blockedSubmits++
          await route.abort()

          return
        }

        if (new URL(route.request().url()).pathname.endsWith(contract.form.formKey)) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(contract),
            headers: { 'Access-Control-Allow-Origin': 'https://efeoncepro.com' }
          })
        } else await route.continue()
      })
      await page.goto('https://efeoncepro.com/blog/', { waitUntil: 'domcontentloaded' })
      const target = page.locator('.elementor-element-4246f0d > .elementor-widget-container')

      await target.waitFor()
      await target.evaluate(
        (node, args) => {
          const host = document.createElement('div')

          host.className = 'eo-growth-form eo-blog-subscription'
          const form = document.createElement('greenhouse-form')

          for (const [key, value] of Object.entries({
            'form-key': args.key,
            surface: args.surface,
            locale: 'es-CL',
            appearance: 'bare',
            'color-scheme': 'light',
            'base-url': 'https://greenhouse.efeoncepro.com'
          }))
            form.setAttribute(key, value)
          form.textContent = 'Activa JavaScript para cargar el formulario de suscripción.'
          host.append(form)
          node.replaceChildren(host)
          // Match the planned Elementor HTML widget, including its outer identity.
          node.parentElement?.classList.replace('elementor-widget-ohio_contact_form', 'elementor-widget-html')
          node.parentElement?.setAttribute('data-widget_type', 'html.default')
        },
        { key: contract.form.formKey, surface: contract.surfacePolicy.surfaceId }
      )

      if (!(await page.evaluate(() => Boolean(customElements.get('greenhouse-form'))))) {
        await page.addScriptTag({ url: 'https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js' })
      }

      await target.locator('input[type="email"]').waitFor()
      await page.addStyleTag({ path: resolve('scripts/public-website/blog-growth-form/host.css') })
      const essentials = page.getByRole('button', { name: 'Solo esenciales', exact: true })

      await essentials.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined)
      if (await essentials.isVisible()) await essentials.click()
      await page
        .locator('#hs-eu-cookie-confirmation')
        .waitFor({ state: 'hidden', timeout: 10000 })
        .catch(() => undefined)
      await page.evaluate(() => document.fonts.ready)
      await target.scrollIntoViewIfNeeded()
      await page.waitForTimeout(800)

      const info = await target.evaluate(node => ({
        formKey: node.querySelector('greenhouse-form')?.getAttribute('form-key'),
        fieldCount: node.querySelectorAll('input[type="email"]').length,
        checkboxes: node.querySelectorAll('input[type="checkbox"]').length,
        checked: node.querySelector('input[type="checkbox"]')?.hasAttribute('checked'),
        submit: node.querySelector('button[type="submit"]')?.textContent,
        formOverflow: node.scrollWidth > node.clientWidth,
        controlStyles: Array.from(node.querySelectorAll('.ghf-control,.ghf-input,.ghf-btn')).map(n => ({
          cls: n.className,
          top: n.getBoundingClientRect().top,
          padding: getComputedStyle(n).padding,
          margin: getComputedStyle(n).margin,
          gap: getComputedStyle(n).gap,
          transform: getComputedStyle(n).transform,
          display: getComputedStyle(n).display
        })),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        widgetHeight: node.parentElement!.getBoundingClientRect().height,
        formHeight: node.querySelector('greenhouse-form')!.getBoundingClientRect().height,
        bandHeight: node.closest('.elementor-element-2ee4ef0')!.getBoundingClientRect().height,
        fonts: Array.from(document.fonts)
          .filter(font => font.family.startsWith('EoBlog'))
          .map(font => ({ family: font.family, status: font.status })),
        actionColor: getComputedStyle(node.querySelector('.ghf-btn')!).backgroundColor,
        actionInk: getComputedStyle(node.querySelector('.ghf-btn')!).color,
        renderer: (customElements.get('greenhouse-form') as unknown as { version?: string })?.version
      }))

      assert.equal(info.fieldCount, 1)
      assert.equal(info.checkboxes, 1)
      assert.equal(info.checked, false)
      assert.equal(info.formOverflow, false)
      assert.equal(info.pageOverflow, false)
      assert.equal(info.submit, 'Suscribirme')
      const emailTop = info.controlStyles.find(c => c.cls === 'ghf-input')!.top
      const buttonTop = info.controlStyles.find(c => c.cls === 'ghf-btn')!.top

      if (width > 320) assert(Math.abs(emailTop - buttonTop) < 1, 'Email and button must align')
      assert(Math.abs(info.widgetHeight - info.formHeight) < 1, 'Host must follow natural form height')
      assert(info.fonts.length === 3 && info.fonts.every(font => font.status === 'loaded'), 'Brand fonts must load')
      await target.locator('greenhouse-form').screenshot({ path: resolve(out, `form-${width}.png`) })
      await page.screenshot({ path: resolve(out, `blog-${width}.png`) })

      const band = await target.evaluate(node => {
        let parent = node.parentElement

        while (parent) {
          const rect = parent.getBoundingClientRect()

          if (parent.textContent?.includes('Suscríbete para recibir') && rect.width > window.innerWidth * 0.8) {
            parent.setAttribute('data-eo-blog-preview-band', 'true')

            return true
          }

          parent = parent.parentElement
        }

        return null
      })

      if (band)
        await page.locator('[data-eo-blog-preview-band]').screenshot({ path: resolve(out, `band-${width}.png`) })

      // Load images along the existing page before capturing the full blog context.
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)

      for (let y = 0; y < pageHeight; y += 800) {
        await page.evaluate(top => window.scrollTo(0, top), y)
        await page.waitForTimeout(120)
      }

      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(400)
      await page.screenshot({ path: resolve(out, `blog-full-${width}.png`), fullPage: true })
      await target.scrollIntoViewIfNeeded()
      await target.locator('button[type="submit"]').click()
      assert.equal(blockedSubmits, 0, 'Empty form must not reach submit')
      const errors = await target.locator('[aria-invalid="true"]').count()

      assert(errors > 0, 'Missing inline errors')

      const events = await page.evaluate(() =>
        ((window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? [])
          .filter(e => e.event === 'gh_form_viewed')
          .map(e => ({ event: e.event, form_kind: e.form_kind, form_slug: e.form_slug }))
      )

      evidence.push({ width, ...info, errorsOnEmptySubmit: errors, blockedSubmits, events, previewOnly: true })
      await page.close()
    }
  } finally {
    await browser.close()
  }

  await writeFile(resolve(out, 'preview-evidence.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
