// Re-renderiza los tableros aprobados/opción del canvas con los assets locales (los /_blob/ del canvas no están en disco).
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'node:fs'
const SP = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/6775986c-94e4-44e8-8897-c999463292ce/scratchpad/'
const P = SP + 'ooh-design/project/', AS = SP + 'ooh-design/assets/'
const blob = { b689688027d9dec0cfb6593e4797c147: 'BricolageGrotesque-Variable.ttf', c518d241c8c0968ec4632b0b052b9ea6: 'Poppins-Light.ttf', '4b91c76ada4e97204e47866e6228f606': 'efeonce-logo-negative.svg' }
const jobs = [
  ['Main', { '97554266cfff1973e530df639533544d': 'caminero-lente-C2.jpg' }, 'dooh/caminero-lens.png', 2],
  ['Paleta35', { '0c6d68aa9439a9902d2e04ff108c29ef': 'panaderia-paleta-1x2.jpg' }, 'dooh/paleta.png', 2],
  ['Paleta20', { '0c6d68aa9439a9902d2e04ff108c29ef': 'panaderia-paleta-1x2.jpg' }, 'dooh/paleta-logo-20.png', 2],
  ['PdoohLed', { eec3c3081d3b54ca23e3dc861adead33: 'pdooh-led.jpg' }, 'pdooh/led-wall-answer.png', 2],
  ['PdoohMupi', { '2ed6d34f3e62be332081e2a0a74fcdbf': 'pdooh-mupi.jpg' }, 'pdooh/mupi-story.png', 2],
  ['PdoohDinamicas', { '2ed6d34f3e62be332081e2a0a74fcdbf': 'pdooh-mupi.jpg' }, 'pdooh/dynamic-variants.png', 2]
]
const b = await chromium.launch({ channel: 'chrome' })
for (const [name, extra, out, dpr] of jobs) {
  let html = readFileSync(P + name + '.dc.html', 'utf8')
  const map = { ...blob, ...extra }
  html = html.replace(/\/_blob\/([0-9a-f]{32})/g, (m, h) => { if (!map[h]) throw new Error(name + ' blob sin mapa ' + h); const f = map[h]; const mime = f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.ttf') ? 'font/ttf' : 'image/jpeg'; return 'data:' + mime + ';base64,' + readFileSync(AS + f).toString('base64') })
  const sm = html.match(/data-props='([^']*)'[^>]*>([\s\S]*?)<\/script>/)
  const props = JSON.parse(sm[1]); const defaults = Object.fromEntries(Object.entries(props).filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, v.default]))
  const cls = new Function('DCLogic', sm[2] + '; return Component')(class { constructor(p) { this.props = p } })
  const vals = new cls(defaults).renderVals()
  html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in vals)) throw new Error(name + ' falta ' + k); return vals[k] })
  html = html.replace(/<script src="\.\/support\.js"><\/script>/, '').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, '')
  const w = props.$preview.width, h = props.$preview.height
  const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr })
  await pg.setContent(html, { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(200)
  await pg.screenshot({ path: SP + 'surfaces-ref/' + out, fullPage: true }); await pg.close(); console.log('ok', out, w, h, JSON.stringify(vals))
}
await b.close()
