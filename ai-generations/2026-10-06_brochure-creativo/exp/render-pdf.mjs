// Arma el PDF del brochure Agencia Creativa desde las láminas del canvas Design, con su runtime real.
//
// Uso (desde la raíz de greenhouse-eo, para resolver playwright):
//   node ai-generations/2026-10-06_brochure-creativo/exp/render-pdf.mjs <render-dir> <salida.pdf>
//
// <render-dir> trae:
//   project/*.dc.html  las láminas y los componentes CS-* (salen de build-canvas-v7.py)
//   project/dc-runtime.js  `artifact-type/dc-runtime.js` del tipo Design (Artifact read, path)
//   project/support.js     shim de una línea: document.write('<script src="./dc-runtime.js"><\/script>')
//   blobs/<id>.<ext>       cada /_blob/<id> que citan las láminas (Artifact read con path=<id>, uno por uno)
//   order.json             las láminas de la página «Agencia Creativa» en el orden de canvas.json
//
// Por qué raster: el PDF vectorial (page.pdf por lámina) dejaba un borde blanco y aplanaba el 3D (preserve-3d) de la
// lámina 17. Se captura cada lámina a 1920×1080 con deviceScaleFactor 2 (JPEG q88) y el PDF lleva una imagen a sangre
// por página. El texto no queda seleccionable.
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const [dir, out] = process.argv.slice(2)
if (!dir || !out) throw new Error('Uso: render-pdf.mjs <render-dir> <salida.pdf>')
const root = path.resolve(dir)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json' }
const blobs = fs.readdirSync(path.join(root, 'blobs'))
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let file
  if (url.startsWith('/_blob/')) { const hit = blobs.find(f => f.startsWith(url.slice(7))); file = hit && path.join(root, 'blobs', hit) }
  else file = path.join(root, url)
  if (!file || !file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }); fs.createReadStream(file).pipe(res)
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const base = `http://127.0.0.1:${server.address().port}`
const order = JSON.parse(fs.readFileSync(path.join(root, 'order.json'), 'utf8'))
const shots = path.join(root, 'out'); fs.mkdirSync(shots, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
const missing = []
for (const [i, f] of order.entries()) {
  const p = await ctx.newPage()
  p.on('response', r => { if (r.status() >= 400) missing.push(`${f} ${r.url()}`) })
  await p.goto(`${base}/project/${f}`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500)
  await p.screenshot({ path: path.join(shots, `${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 88 })
  await p.close()
}
if (missing.length) { console.error(missing.join('\n')); throw new Error(`${missing.length} recursos faltan: el PDF no se arma`) }
const imgs = order.map((_, i) => `<img src="file://${shots}/${String(i + 1).padStart(2, '0')}.jpg">`).join('')
fs.writeFileSync(path.join(root, 'book.html'), `<html><head><style>@page{size:1920px 1080px;margin:0}html,body{margin:0;padding:0}img{display:block;width:1920px;height:1080px;break-after:page}</style></head><body>${imgs}</body></html>`)
const book = await ctx.newPage(); await book.goto(`file://${path.join(root, 'book.html')}`, { waitUntil: 'load' }); await book.waitForTimeout(1000)
await book.pdf({ path: path.resolve(out), width: '1920px', height: '1080px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true })
await browser.close(); server.close()
console.log(JSON.stringify({ pages: order.length, out: path.resolve(out) }))
