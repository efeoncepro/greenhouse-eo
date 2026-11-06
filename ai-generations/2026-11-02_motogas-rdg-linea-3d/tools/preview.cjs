// Vista previa local de un tablero .dc.html: reemplaza {{vars}} por el respaldo del script y /_blob/ por archivos locales.
const fs = require('fs'), path = require('path')
const { chromium } = require('playwright')
;(async () => {
  const [board, out, ...maps] = process.argv.slice(2)
  let h = fs.readFileSync(board, 'utf8')
  const body = h.slice(h.indexOf('<x-dc>') + 6, h.indexOf('</x-dc>'))
  const helmet = body.slice(body.indexOf('<helmet>') + 8, body.indexOf('</helmet>'))
  let content = body.slice(body.indexOf('</helmet>') + 9)
  const m = h.match(/const respaldo = (\{[^;]*\});/)
  const vals = m ? Function('return ' + m[1])() : {}
  content = content.replace(/\{\{(\w+)\}\}/g, (_, k) => vals[k] ?? '')
  for (const mp of maps) { const [id, file] = mp.split('='); content = content.split('/_blob/' + id).join('file://' + file) }
  const page = `<!doctype html><html><head><meta charset="utf-8">${helmet}</head><body style="margin:0">${content}</body></html>`
  const tmp = out + '.html'; fs.writeFileSync(tmp, page)
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } })
  await p.goto('file://' + tmp); await p.waitForTimeout(1500)
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1350 } }); await b.close()
})()
