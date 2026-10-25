// Captura los presets oficiales de los dots con el motor orbit-character de la app ChatGPT (solo lectura).
// Sirve el runtime extraído con COOP/COEP, abre Chromium (Playwright) y llama captureNeutral() por preset.
// Uso: node capturar-orbit.mjs <orbit-character dir> <salida> [tamaño=1024] [limite]
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const sharp = require('sharp')

const [root, out, sizeS = '1024', limitS] = process.argv.slice(2)
const SIZE = Number(sizeS)
fs.mkdirSync(out, { recursive: true })

const HARNESS = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff">
<canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
<script type="module">
import createOrbitModule from '/runtime/single-thread/orbit-characters.mjs'
import { Category, Quality } from '/runtime/single-thread/orbit-enums.mjs'
const log = []
const engine = await createOrbitModule({ locateFile: p => '/runtime/single-thread/' + p, printErr: m => log.push(String(m)) })
window.engine = engine
window.meta = () => ({
  presets: engine.presets(),
  heroes: engine.hereCharacters(),
  catalog: Object.fromEntries(Object.entries(Category).map(([k, v]) => [k, engine.catalog(v)])),
  accessoryColors: engine.accessoryColors(),
})
const sleep = ms => new Promise(r => setTimeout(r, ms))
let ch = null
window.capture = async (id, size, depth) => {
  if (!ch) { ch = new engine.Character('#c', size, size, {}); ch.setQuality(Quality.Balanced); ch.setReducedMotion(true); ch.setActive(true) }
  const err = ch.restore(engine.presetAppearance(id))
  if (err) return { error: 'restore: ' + err }
  if (depth != null) ch.setDepth(depth)
  let first = false; ch.onFirstFrame(() => { first = true })
  const t0 = performance.now()
  for (let i = 0; i < 600; i++) {
    ch.render(performance.now() / 1000)
    await sleep(16)
    if (first && !ch.hasPendingUpdate() && i > 20) break
  }
  if (ch.error()) return { error: ch.error() }
  const px = ch.captureNeutral(size, size, 1)
  if (!px) return { error: 'captureNeutral null (tier)' }
  let b = ''; for (let i = 0; i < px.length; i += 0x8000) b += String.fromCharCode.apply(null, px.subarray(i, i + 0x8000))
  return { ms: Math.round(performance.now() - t0), b64: btoa(b) }
}
window.ready = true
</script>`

const server = http.createServer((req, res) => {
  const headers = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin' }
  const url = decodeURIComponent(req.url.split('?')[0])
  if (url === '/' || url === '/index.html') { res.writeHead(200, { ...headers, 'Content-Type': 'text/html' }); return res.end(HARNESS) }
  if (!url.startsWith('/runtime/')) { res.writeHead(404); return res.end() }
  const file = path.join(root, url)
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end() }
  const type = file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.wasm') ? 'application/wasm' : file.endsWith('.json') ? 'application/json' : 'application/octet-stream'
  res.writeHead(200, { ...headers, 'Content-Type': type }); fs.createReadStream(file).pipe(res)
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] })
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } })
const consoleLog = []
page.on('console', m => consoleLog.push(m.type() + ': ' + m.text()))
page.on('pageerror', e => consoleLog.push('pageerror: ' + e.message))
await page.goto(`http://127.0.0.1:${port}/`)
try { await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 }) } catch (e) {
  console.log(consoleLog.join('\n')); throw e
}
const meta = await page.evaluate(() => window.meta())
fs.writeFileSync(path.join(out, 'catalogo-oficial.json'), JSON.stringify(meta, null, 2))
console.log('presets', meta.presets.length, 'héroes', meta.heroes.map(h => h.title).join(', '))

const list = limitS ? meta.presets.slice(0, Number(limitS)) : meta.presets
const report = []
for (const [i, p] of list.entries()) {
  const slug0 = String(i + 1).padStart(3, '0') + '-' + p.id.replace(/[^a-z0-9_-]+/gi, '-')
  if (fs.existsSync(path.join(out, `dots-preset-${slug0}.png`))) { report.push({ ...p, file: `dots-preset-${slug0}.png`, reused: true }); continue }
  const r = await page.evaluate(([id, s]) => window.capture(id, s), [p.id, SIZE])
  if (r.error) { report.push({ ...p, error: r.error }); console.log('✗', p.id, r.error); continue }
  const slug = String(i + 1).padStart(3, '0') + '-' + p.id.replace(/[^a-z0-9_-]+/gi, '-')
  await sharp(Buffer.from(r.b64, 'base64'), { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toFile(path.join(out, `dots-preset-${slug}.png`))
  report.push({ ...p, file: `dots-preset-${slug}.png`, ms: r.ms })
  console.log('✓', slug, p.title, r.ms + 'ms')
}
fs.writeFileSync(path.join(out, 'capturas.json'), JSON.stringify(report, null, 2))
fs.writeFileSync(path.join(out, 'consola.log'), consoleLog.join('\n'))
await browser.close(); server.close()
