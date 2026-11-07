// Vista previa: cambia @@clave@@ por file:// de assets/ y renderiza cada tablero a PNG.
const fs = require('fs'), path = require('path')
const { chromium } = require('playwright')
const A = path.join(__dirname, 'assets')
const MAPA = { 'reino-camino': 'reino-camino-banda.jpg' }
const ruta = (k) => {
  if (MAPA[k]) return path.join(A, MAPA[k])
  for (const ext of ['.png', '.otf', '.ttf', '.jpg']) if (fs.existsSync(path.join(A, k + ext))) return path.join(A, k + ext)
  throw new Error('falta asset ' + k)
}
;(async () => {
  const [dir, outDir] = process.argv.slice(2)
  fs.mkdirSync(outDir, { recursive: true })
  const b = await chromium.launch()
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.dc.html'))) {
    let h = fs.readFileSync(path.join(dir, f), 'utf8')
    const helmet = h.slice(h.indexOf('<helmet>') + 8, h.indexOf('</helmet>'))
    const content = h.slice(h.indexOf('</helmet>') + 9, h.indexOf('</x-dc>'))
    let page = `<!doctype html><html><head><meta charset="utf-8">${helmet}</head><body style="margin:0">${content}</body></html>`
    page = page.replace(/@@([\w-]+)@@/g, (_, k) => 'file://' + ruta(k))
    const tmp = path.join(outDir, f + '.html'); fs.writeFileSync(tmp, page)
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } })
    await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1200)
    const out = path.join(outDir, f.replace('.dc.html', '.png'))
    await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1350 } }); await p.close()
    console.log(out)
  }
  await b.close()
})()
