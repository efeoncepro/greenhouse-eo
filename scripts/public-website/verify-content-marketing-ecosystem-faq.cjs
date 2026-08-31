/** Anonymous live-renderer QA. --preview substitutes the proposed native control values locally. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { JSDOM } = require('jsdom')
const { chromium } = require('playwright')
const patch = require('./content-marketing-ecosystem-faq-copy.json')
const url = 'https://efeoncepro.com/servicio-marketing-de-contenidos/'
const preview = process.argv.includes('--preview')
const dir = '.captures/content-marketing/ecosystem-faq' + (preview ? '-preview' : '')
const edits = Object.values(patch.modules).flatMap(m => Object.values(m.fields))
const urls = edits.filter(e => typeof e.after === 'object').map(e => e.after.url)
const norm = s => s.replace(/\s+/g, ' ').trim()
function previewHtml(html) {
  const d = new JSDOM(html).window.document
  for (const [type, edit] of Object.entries(patch.modules)) {
    const root = d.querySelector('[data-content-module="' + type.replace('greenhouse_content_', '') + '"]')
    const config = root.querySelector('[data-cm-config]')
    const data = JSON.parse(config.textContent)
    for (const change of Object.values(edit.fields)) {
      const before = typeof change.before === 'object' ? change.before.url : change.before
      const after = typeof change.after === 'object' ? change.after.url : change.after
      for (const key of Object.keys(data.values)) if (data.values[key] === before) data.values[key] = after
      const walker = d.createTreeWalker(root.querySelector('section'), 4)
      while (walker.nextNode()) if (walker.currentNode.textContent.trim() === before) walker.currentNode.textContent = after
      for (const a of root.querySelectorAll('a')) if (a.getAttribute('href') === before) a.setAttribute('href', after)
    }
    config.textContent = JSON.stringify(data)
  }
  return d.documentElement.outerHTML
}
async function verifyCopy(page) {
  for (const [type, edit] of Object.entries(patch.modules)) {
    const root = page.locator('[data-content-module="' + type.replace('greenhouse_content_', '') + '"]')
    const text = norm(await root.locator('section').textContent())
    for (const [key, change] of Object.entries(edit.fields)) if (typeof change.after === 'string') {
      assert(text.includes(norm(change.after)), type + '/' + key + ' absent from rendered DOM')
      assert(!text.includes(norm(change.before)), type + '/' + key + ' stale text in DOM')
    }
  }
  assert.deepEqual(await page.locator('#ecosistema li>a').evaluateAll(a => a.map(x => x.href)), urls)
  assert.equal(await page.locator('#faq details').count(), 8)
}
;(async () => {
  fs.mkdirSync(dir, { recursive: true })
  const browser = await chromium.launch()
  const report = { preview, widths: [], faqKeyboardToggles: 0, cardNavigations: [], errors: [] }
  try {
    for (const width of [1440, 878, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } })
      page.on('pageerror', e => report.errors.push(e.message))
      if (preview) await page.route(url, async route => {
        const response = await route.fetch()
        await route.fulfill({ response, body: previewHtml(await response.text()) })
      })
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.locator('[data-content-module=faq][data-cm-ready=true]').waitFor()
      await verifyCopy(page)
      for (const selector of ['#ecosistema', '#faq']) {
        const section = page.locator(selector)
        await section.evaluate(e => e.scrollIntoView({ block: 'start' }))
        await page.waitForTimeout(800)
        await section.screenshot({ path: `${dir}/${selector.slice(1)}-${width}.png` })
      }
      for (let i = 0; i < 8; i++) {
        const detail = page.locator('#faq details').nth(i)
        const summary = detail.locator('summary')
        await summary.focus()
        await page.keyboard.press('Enter')
        assert(await detail.evaluate(e => e.open))
        assert(await detail.locator('p').isVisible())
        await page.keyboard.press('Space')
        assert(!(await detail.evaluate(e => e.open)))
        report.faqKeyboardToggles++
      }
      await page.locator('#faq summary').first().click()
      await page.locator('#faq').evaluate(e => e.scrollIntoView({ block: 'start' }))
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${dir}/faq-open-${width}.png` })
      await page.waitForTimeout(600)
      const geometry = await page.evaluate(() => ({ width: innerWidth, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
      assert.equal(geometry.client, geometry.scroll, 'Document overflow')
      report.widths.push(geometry)
      // Follow each actual card, alternating pointer and keyboard activation.
      if (width === 1440) for (let i = 0; i < urls.length; i++) {
        if (i) await page.goto(url, { waitUntil: 'networkidle' })
        const a = page.locator('#ecosistema li>a').nth(i)
        const navigation = page.waitForURL(urls[i])
        if (i % 2) { await a.focus(); await page.keyboard.press('Enter') } else await a.click()
        await navigation
        await page.waitForLoadState('domcontentloaded')
        assert.equal(page.url(), urls[i])
        assert(await page.locator('h1').count() > 0)
        report.cardNavigations.push({ url: page.url(), keyboard: Boolean(i % 2), h1: norm(await page.locator('h1').first().textContent()) })
      }
      await page.close()
    }
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    if (preview) await page.route(url, async route => { const response = await route.fetch(); await route.fulfill({ response, body: previewHtml(await response.text()) }) })
    await page.goto(url)
    await verifyCopy(page)
    await page.locator('#faq summary').first().click()
    assert(await page.locator('#faq details').first().evaluate(e => e.open))
    report.jsOff = true
    assert.deepEqual(report.errors, [])
    report.status = 'pass'
    report.controlValues = edits.length
    fs.writeFileSync(dir + '/report.json', JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
