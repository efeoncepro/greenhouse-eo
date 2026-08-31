/** Public production browser checks. Fills local fields but never submits a lead. */
const fs = require('fs'),
  assert = require('assert/strict'),
  { chromium } = require('playwright')
;(async () => {
  fs.mkdirSync('.captures/content-marketing', { recursive: true })
  const b = await chromium.launch()
  const report = { widths: [], actions: [], errors: [], badResponses: [] }
  for (const width of [1440, 1280, 890, 390]) {
    const p = await b.newPage({ viewport: { width, height: 1000 } })
    p.on('pageerror', e => report.errors.push(e.message))
    p.on('response', r => {
      if (r.status() >= 400 && !r.url().includes('google-analytics'))
        report.badResponses.push({ url: r.url().split('?')[0], status: r.status() })
    })
    await p.goto('https://efeoncepro.com/servicio-marketing-de-contenidos/', { waitUntil: 'networkidle' })
    await p.evaluate(() => document.fonts.ready)
    await p.waitForTimeout(800)
    const geom = await p.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      h1: document.querySelectorAll('h1').length,
      ready: document.querySelectorAll('[data-cm-ready]').length,
      header: !!document.querySelector('#masthead'),
      footer: !!document.querySelector('footer'),
      overflow: [...document.querySelectorAll('body *')]
        .filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed')
        .slice(0, 8)
        .map(e => [e.tagName, e.className, e.getBoundingClientRect().right])
    }))
    report.widths.push(geom)
    console.log(JSON.stringify(geom))
    assert.equal(geom.width, geom.scrollWidth)
    assert.equal(geom.h1, 1)
    assert.equal(geom.ready, 13)
    if (width === 1440) {
      await p.locator('#content-system-stage button').last().click()
      await p.waitForTimeout(1000)
      assert.match(await p.locator('#content-system-stage [aria-current=step]').innerText(), /Aprendizaje/)
      report.actions.push('direct last chapter stable')
      for (const name of ['Artículo', 'Reel', 'Carrusel', 'Historia', 'Banner', 'Tabla', 'Tablero', 'Calendario']) {
        await p.getByRole('tab', { name, exact: true }).click()
        assert.equal(await p.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), 'true')
      }
      await p.getByRole('tab', { name: 'Artículo', exact: true }).focus()
      await p.keyboard.press('ArrowRight')
      assert.equal(await p.getByRole('tab', { name: 'Reel', exact: true }).getAttribute('aria-selected'), 'true')
      for (const name of ['Corte 1', 'Corte 2', 'Corte 3']) await p.getByRole('button', { name, exact: true }).click()
      await p.locator('#operating-modes button').nth(2).click()
      await p.locator('#faq summary').first().click()
      assert.equal(await p.locator('#faq details').first().getAttribute('open'), '')
      report.actions.push('format and hub tabs, keyboard, cuts, modes, FAQ')
      await p.locator('#content-marketing-conversion').scrollIntoViewIfNeeded()
      await p.locator('greenhouse-form button[data-ghf-primary]').click()
      assert.equal(await p.locator('greenhouse-form [aria-invalid=true]').count(), 3)
      await p.locator('greenhouse-form [name=fullName]').fill('Prueba sin envío')
      await p.locator('greenhouse-form [name=email]').fill('qa@efeonce.org')
      await p.locator('greenhouse-form [name=companyName]').fill('Efeonce')
      await p.locator('greenhouse-form button[data-ghf-primary]').click()
      await p.waitForTimeout(300)
      report.modeValue = await p.locator('greenhouse-form [name=mode]').inputValue()
      assert.equal(report.modeValue, 'Content Engine')
      await p.locator('greenhouse-form .ghf-btn--ghost').click()
      assert.equal(await p.locator('greenhouse-form [name=fullName]').inputValue(), 'Prueba sin envío')
      report.actions.push('empty validation, two steps, mode prefill, back retains values; no submission')
    }
    for (const key of ['hero', 'system', 'atomization', 'hub', 'review', 'modes', 'business', 'conversion']) {
      await p.locator('[data-capture="cm-' + key + '"]').scrollIntoViewIfNeeded()
      if (key === 'hero') await p.evaluate(() => scrollTo(0, 0))
      await p.waitForTimeout(800)
      await p.screenshot({ path: '.captures/content-marketing/live-' + width + '-' + key + '.png' })
    }
    await p.close()
  }
  for (const js of [false, true]) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: js, reducedMotion: 'reduce' })
    await p.goto('https://efeoncepro.com/servicio-marketing-de-contenidos/')
    assert.equal(await p.locator('#content-system-stage ol li').count(), 7)
    assert.equal(await p.locator('#faq details').count(), 8)
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390)
    report.actions.push(js ? 'reduced motion seven chapters' : 'JS-off seven chapters, FAQ and capture fallback')
    await p.close()
  }
  assert.deepEqual(report.errors, [])
  fs.writeFileSync('.captures/content-marketing/browser.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
  await b.close()
})().catch(e => {
  console.error(e)
  process.exit(1)
})
