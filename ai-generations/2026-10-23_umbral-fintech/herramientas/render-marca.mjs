import { chromium } from 'playwright'
import path from 'node:path'
const dir = path.resolve(process.argv[2] ?? '.')
const b = await chromium.launch()
const p = await b.newPage({ deviceScaleFactor: 1, viewport: { width: 1700, height: 1700 } })
await p.goto('file://' + path.join(dir, 'herramientas/marca.html'))
await p.evaluate(() => document.fonts.ready)
for (const [id, out, transparent] of [['logo','activos/logo-umbral-negro.png'],['logolight','activos/logo-umbral-claro.png'],['card','tarjeta/tarjeta-plana-frente.png',true]]) {
  await p.evaluate(i => { document.querySelectorAll('body>div').forEach(d => d.style.display = 'none'); const el = document.getElementById(i); el.style.display = i === 'card' ? 'block' : 'flex' }, id)
  await p.locator('#' + id).screenshot({ path: path.join(dir, out), omitBackground: !!transparent })
  console.log('ok', out)
}
await b.close()
