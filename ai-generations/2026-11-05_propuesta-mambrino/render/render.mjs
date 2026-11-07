// Uso: node render.mjs <canvasProjectDir> <outDir> [file1 file2 ...]  (sin archivos: todo lo de canvas.json order)
import { chromium } from 'playwright'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const here = path.dirname(new URL(import.meta.url).pathname)
const [src, out, ...only] = process.argv.slice(2)
const blobs = JSON.parse(fs.readFileSync(path.join(here, 'blobs.json'), 'utf8'))
const T = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' }
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
const order = only.length ? only : JSON.parse(fs.readFileSync(path.join(src, 'canvas.json'), 'utf8')).order
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
for (const [i, f] of order.entries()) {
  const p = await ctx.newPage(); await p.goto(`${base}/project/${f}`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1200)
  await p.screenshot({ path: path.join(out, `${String(i + 1).padStart(2, '0')}-${f.replace('.dc.html', '')}.jpg`), type: 'jpeg', quality: 80 }); await p.close()
}
await browser.close(); server.close()
console.log(JSON.stringify({ rendered: order.length, missingBlobs: [...missing] }))
