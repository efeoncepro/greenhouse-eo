// Versión para correo: páginas livianas en vector; las pesadas (filtros, muchas fotos) como imagen JPEG.
// Uso: BLOBS=blobs-light.json node pdf-light.mjs <canvasProjectDir> <vector.pdf> <out.pdf> [umbralMB=1.2]
import { chromium } from 'playwright'
import { PDFDocument } from 'pdf-lib'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const here = path.dirname(new URL(import.meta.url).pathname)
const [src, vectorPdf, outPdf, umbral = '1.2'] = process.argv.slice(2)
const blobs = JSON.parse(fs.readFileSync(path.join(here, process.env.BLOBS || 'blobs.json'), 'utf8'))
const T = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp' }
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]); let file
  if (url.startsWith('/_blob/')) file = blobs[url.slice(7)]
  else if (url === '/project/dc-runtime.js' || url === '/project/support.js') file = path.join(here, url)
  else file = path.join(src, url.replace(/^\/project\//, ''))
  if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': T[path.extname(file)] ?? 'application/octet-stream' }); fs.createReadStream(file).pipe(res)
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const base = `http://127.0.0.1:${server.address().port}`
const order = JSON.parse(fs.readFileSync(path.join(src, 'canvas.json'), 'utf8')).order
const vec = await PDFDocument.load(fs.readFileSync(vectorPdf))
const out = await PDFDocument.create()
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.25 })
const log = []
for (const [i, f] of order.entries()) {
  const one = await PDFDocument.create(); const [cp] = await one.copyPages(vec, [i]); one.addPage(cp)
  const size = (await one.save()).length / 1e6
  if (size <= Number(umbral)) { const [pg] = await out.copyPages(vec, [i]); out.addPage(pg); log.push(`${i + 1}:v`); continue }
  const p = await ctx.newPage(); await p.goto(`${base}/project/${f}`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.evaluate(() => document.querySelectorAll('video').forEach(v => { const im = document.createElement('img'); im.src = v.poster; im.style.cssText = v.style.cssText; v.replaceWith(im) }))
  await p.waitForTimeout(1200)
  const jpg = await p.screenshot({ type: 'jpeg', quality: 82 }); await p.close()
  const img = await out.embedJpg(jpg); const pg = out.addPage([1440, 810]); pg.drawImage(img, { x: 0, y: 0, width: 1440, height: 810 }); log.push(`${i + 1}:r`)
}
out.setTitle('Propuesta Trattoria Mambrino Chile · Efeonce'); out.setAuthor('Efeonce')
fs.writeFileSync(outPdf, await out.save()); await browser.close(); server.close()
console.log(log.join(' '), (fs.statSync(outPdf).size / 1e6).toFixed(1) + ' MB')
