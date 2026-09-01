/** Production/preview regression: real resize, chapters, interactive contrast and fallback. Never submits. */
const fs = require('node:fs')
const assert = require('node:assert/strict')

const { chromium } = require('playwright')

const preview = process.argv.includes('--preview')
const root = '../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets'
const dir = '.captures/content-marketing/technical-closure/' + (preview ? 'preview' : 'production')
const url = 'https://efeoncepro.com/servicio-marketing-de-contenidos/'

fs.mkdirSync(dir, { recursive: true })
;(async () => {
  const browser = await chromium.launch()
  const report = { preview, url, checkedAt: new Date().toISOString(), pin: [], contrast: [], errors: [], submitsBlocked: 0 }

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })

    await context.route('**/api/public/growth/forms/**/submit', r => { report.submitsBlocked++; 

return r.abort() })

    if (preview) for (const file of ['assets/js/content-marketing.js', 'assets/css/content-marketing-host.css']) {
      await context.route('**/' + file + '*', r => r.fulfill({ path: root + '/' + file, contentType: file.endsWith('.js') ? 'text/javascript' : 'text/css' }))
    }

    const p = await context.newPage()

    p.on('pageerror', e => report.errors.push(e.message))
    await p.goto(url, { waitUntil: 'domcontentloaded' })
    await p.locator('[data-content-module=conversion][data-cm-ready=true]').waitFor()
    await p.evaluate(() => document.fonts.ready)
    await p.addScriptTag({ path: require.resolve('axe-core') })
    const stage = p.locator('#content-system-stage')

    // Exercise both directions, including the boundary and a fresh short-viewport load.
    for (const height of [1000, 650, 1000, 739, 740, 650]) {
      await p.setViewportSize({ width: 1440, height })
      await p.waitForTimeout(180)

      const state = await stage.evaluate(e => ({height:innerHeight, width:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth, ownedOverflow:[...document.querySelectorAll('.gh-content-module')].filter(n=>{const r=n.getBoundingClientRect();

return r.left < -1 || r.right > innerWidth+1}).map(n=>n.dataset.contentModule), inlineHeight:e.style.height, chapters:e.querySelectorAll('ol li').length, sticky:[...e.querySelectorAll('*')].some(n=>getComputedStyle(n).position==='sticky')}))

      assert.deepEqual(state.ownedOverflow,[])
      assert.equal(state.sticky, height >= 740)
      if (height < 740) { assert.equal(state.inlineHeight, 'auto'); assert.equal(state.chapters, 7) }
      report.pin.push(state)
    }

    await p.reload({waitUntil:'domcontentloaded'})
    await p.locator('[data-content-module=system][data-cm-ready=true]').waitFor()
    assert.equal(await stage.evaluate(e=>e.style.height), 'auto')
    await stage.evaluate(e=>e.scrollIntoView({block:'start'}))
    await p.waitForTimeout(800)
    await p.screenshot({path:dir+'/1440x650-system.png'})
    await p.setViewportSize({width:1440,height:1000})
    await p.addScriptTag({path:require.resolve('axe-core')})

    async function audit(module, state) {
      const loc = p.locator('[data-content-module="'+module+'"]')

      await loc.scrollIntoViewIfNeeded()
      await p.waitForTimeout(500)

      const result = await p.evaluate(async module => {
        const a = await axe.run(document.querySelector('[data-content-module="'+module+'"]'), {runOnly:['color-contrast']})
        const compact = list=>list.flatMap(v=>v.nodes.map(n=>({target:n.target,html:n.html,data:n.any.map(c=>c.data)})))

        
return {violations:compact(a.violations),incomplete:compact(a.incomplete)}
      },module)

      report.contrast.push({module,state,...result})
    }

    await p.setViewportSize({width:1440,height:650})
    await audit('system','1440x650 all chapters in flow')
    await p.setViewportSize({width:1440,height:1000})

    for (const module of ['hero','proof','problem','system','atomization','hub','review','editorial','modes','ecosystem','business','faq','conversion']) {
      await audit(module,'initial')
      await p.screenshot({path:dir+'/'+module+'.png'})
    }

    for (const name of ['Artículo','Reel','Carrusel','Historia','Banner']) {
      await p.getByRole('tab',{name,exact:true}).click()
      await audit('atomization',name)
    }

    for (const name of ['Tabla','Tablero','Calendario']) {
      await p.getByRole('tab',{name,exact:true}).click()
      await audit('hub',name)
    }

    for (const name of ['Corte 1','Corte 2','Corte 3']) {
      await p.getByRole('button',{name,exact:true}).click()
      await audit('review',name)
    }

    for (let chapter=0; chapter<7; chapter++) {
      await stage.locator('button').nth(chapter).click()
      await p.waitForTimeout(850)
      await audit('system','chapter '+(chapter+1))
    }

    await stage.locator('button').last().click()
    await p.waitForTimeout(1000)
    assert.match(await stage.locator('[aria-current=step]').innerText(), /Aprendizaje/)
    await audit('system','last chapter')
    await p.emulateMedia({reducedMotion:'reduce'})
    await p.waitForTimeout(200)
    assert.equal(await stage.evaluate(e=>e.style.height),'auto')
    assert.equal(await stage.locator('ol li').count(),7)
    await p.setViewportSize({width:390,height:844})
    assert(await p.evaluate(()=>document.documentElement.scrollWidth===document.documentElement.clientWidth))
    await stage.evaluate(e=>e.scrollIntoView({block:'start'}))
    await p.screenshot({path:dir+'/390-system.png'})
    for (const module of ['system','atomization','review','business','conversion']) await audit(module,'390 reduced motion')
    await p.getByRole('tab',{name:'Artículo',exact:true}).focus()
    await p.keyboard.press('ArrowRight')
    assert.equal(await p.getByRole('tab',{name:'Reel',exact:true}).getAttribute('aria-selected'),'true')
    const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}})

    await nojs.goto(url)
    assert.equal(await nojs.locator('#content-system-stage ol li').count(),7)
    assert.equal(await nojs.locator('greenhouse-form a').getAttribute('href'),'https://efeoncepro.com/agenda/')
    report.noJs=true
    report.violationCount=report.contrast.reduce((n,r)=>n+r.violations.length,0)
    fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2))
    console.log(JSON.stringify({preview,pin:report.pin,states:report.contrast.length,violations:report.contrast.filter(r=>r.violations.length),errors:report.errors,submitsBlocked:report.submitsBlocked}))
    assert.deepEqual(report.errors,[])
    assert.equal(report.submitsBlocked,0)
    assert.equal(report.violationCount,0)
  } finally { await browser.close() }
})().catch(e=>{console.error(e);process.exit(1)})
