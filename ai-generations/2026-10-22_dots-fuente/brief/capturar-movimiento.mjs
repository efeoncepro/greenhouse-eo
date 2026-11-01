// Cuadros de movimiento oficiales de los dots: reproduce las reacciones Wave y Signature del motor orbit-character
// para los ocho héroes y guarda N cuadros por reacción (captura de pantalla del canvas, fondo transparente).
// Uso: node capturar-movimiento.mjs <orbit-character dir> <salida> [tamaño=768] [cuadros=10]
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const sharp = require('sharp')

const [root, out, sizeS = '768', framesS = '10'] = process.argv.slice(2)
const SIZE = Number(sizeS)
fs.mkdirSync(out, { recursive: true })

const HARNESS = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:transparent">
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
window.react = async (id, kind, frames, size) => {
  if (!ch) { ch = new engine.Character('#c', size, size, {}); ch.setQuality(Quality.Balanced); ch.setActive(true) }
  ch.setReducedMotion(false)
  ch.restore(engine.presetAppearance(id))
  for (let i = 0; i < 120; i++) { ch.render(performance.now() / 1000); await sleep(16); if (!ch.hasPendingUpdate() && i > 30) break }
  for (let i = 0; i < 40; i++) { ch.render(performance.now() / 1000); await sleep(16) }
  const res = ch.playReaction(kind)
  return { res }
}
window.tick = async ms => { const end = performance.now() + ms; while (performance.now() < end) { ch.render(performance.now() / 1000); await sleep(16) } return true }
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
await page.goto(`http://127.0.0.1:${port}/`)
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 })
const heroes = await page.evaluate(() => engine.hereCharacters())
const FR = Number(framesS)
const report = []
for (const h of heroes) {
  for (const [kind, label] of [[1, 'saludo'], [2, 'firma']]) {
    const r = await page.evaluate(([id, k, s]) => window.react(id, k, 0, s), [h.id, kind, SIZE])
    const files = []
    for (let f = 0; f < FR; f++) {
      await page.evaluate(ms => window.tick(ms), 140)
      const name = `dots-${h.title.toLowerCase()}-${label}-${String(f + 1).padStart(2, '0')}.png`
      await page.locator('#c').screenshot({ path: path.join(out, name), omitBackground: true })
      files.push(name)
    }
    report.push({ hero: h.title, id: h.id, reaction: label, result: r.res, files })
    console.log(h.title, label, 'resultado', r.res)
  }
}
fs.writeFileSync(path.join(out, 'movimiento.json'), JSON.stringify(report, null, 2))
await browser.close(); server.close()
