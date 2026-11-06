// Uso: node pdf.mjs <canvasProjectDir> <out.pdf>  — una página por lámina, en el orden de canvas.json
import { chromium } from 'playwright'
import { PDFDocument } from 'pdf-lib'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const here = path.dirname(new URL(import.meta.url).pathname)
const [src, outPdf] = process.argv.slice(2)
const blobs = JSON.parse(fs.readFileSync(path.join(here, process.env.BLOBS || 'blobs.json'), 'utf8'))
const T = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp', '.jpeg': 'image/jpeg' }
const missing = new Set()
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]); let file
  if (url.startsWith('/_blob/')) { file = blobs[url.slice(7)]; if (!file) missing.add(url.slice(7)) }
  else if (url === '/project/dc-runtime.js' || url === '/project/support.js') file = path.join(here, url)
  else file = path.join(src, url.replace(/^\/project\//, ''))
  if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': T[path.extname(file)] ?? 'application/octet-stream' }); fs.createReadStream(file).pipe(res)
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const base = `http://127.0.0.1:${server.address().port}`
const order = JSON.parse(fs.readFileSync(path.join(src, 'canvas.json'), 'utf8')).order
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
const merged = await PDFDocument.create()
for (const f of order) {
  const p = await ctx.newPage(); await p.goto(`${base}/project/${f}`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1200)
  // el video no existe en un PDF: se reemplaza por su póster
  await p.evaluate(() => document.querySelectorAll('video').forEach(v => { const i = document.createElement('img'); i.src = v.poster; i.alt = v.getAttribute('aria-label') || ''; i.style.cssText = v.style.cssText; v.replaceWith(i) }))
  await p.waitForTimeout(400)
  await p.emulateMedia({ media: 'screen' })
  const buf = await p.pdf({ width: '1920px', height: '1080px', printBackground: true, pageRanges: '1', margin: { top: 0, right: 0, bottom: 0, left: 0 } })
  const doc = await PDFDocument.load(buf); const [pg] = await merged.copyPages(doc, [0]); merged.addPage(pg); await p.close()
}
merged.setTitle('Propuesta Trattoria Mambrino Chile · Efeonce'); merged.setAuthor('Efeonce'); merged.setCreationDate(new Date())
fs.writeFileSync(outPdf, await merged.save()); await browser.close(); server.close()
console.log(JSON.stringify({ pages: order.length, bytes: fs.statSync(outPdf).size, missingBlobs: [...missing] }))
