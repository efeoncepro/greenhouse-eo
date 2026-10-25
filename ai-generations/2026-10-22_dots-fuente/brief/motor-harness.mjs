// Arnés compartido: sirve el runtime orbit-character (sin modificar) con COOP/COEP y abre Chromium.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
export const { chromium } = require('playwright')
export const sharp = require('sharp')
export const ROOT = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/025e38ab-7565-4fc5-910d-835ae33ead3f/scratchpad/dots-asar/full/webview/assets/orbit-character-a46c99f7e8749621'

const page_ = (size) => `<!doctype html><meta charset="utf-8"><body style="margin:0;background:transparent">
<canvas id="c" width="${size}" height="${size}" style="width:${size}px;height:${size}px;display:block"></canvas>
<script type="module">
import createOrbitModule from '/runtime/single-thread/orbit-characters.mjs'
import * as E from '/runtime/single-thread/orbit-enums.mjs'
const log = []
const engine = await createOrbitModule({ locateFile: p => '/runtime/single-thread/' + p, printErr: m => log.push(String(m)) })
window.engine = engine; window.E = E; window.log = log
const sleep = ms => new Promise(r => setTimeout(r, ms))
window.sleep = sleep
window.b64 = (u8) => { let b=''; for (let i=0;i<u8.length;i+=0x8000) b+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(b) }
window.unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0))
let ch = null, loop = false
window.ensure = (size) => { if (!ch) { ch = new engine.Character('#c', size, size, {}); ch.setQuality(E.Quality.Balanced); ch.setActive(true) } return ch }
window.ch = () => ch
window.settle = async (minFrames=20) => {
  let first=false; ch.onFirstFrame(()=>{first=true})
  for (let i=0;i<900;i++){ ch.render(performance.now()/1000); await sleep(16); if (first && !ch.hasPendingUpdate() && i>minFrames) break }
  return ch.error()
}
window.startLoop = () => { if (loop) return; loop = true; const f = () => { if (!loop) return; ch.render(performance.now()/1000); requestAnimationFrame(f) }; requestAnimationFrame(f) }
window.stopLoop = () => { loop = false }
window.neutral = (w) => { const px = ch.captureNeutral(w, w, 1); return px ? window.b64(px) : null }
window.ready = true
</script>`

export async function open(size = 1600) {
  const server = http.createServer((req, res) => {
    const h = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin' }
    const url = decodeURIComponent(req.url.split('?')[0])
    if (url === '/') { res.writeHead(200, { ...h, 'Content-Type': 'text/html' }); return res.end(page_(size)) }
    const file = path.join(ROOT, url)
    if (!url.startsWith('/runtime/') || !file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end() }
    const type = file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'
    res.writeHead(200, { ...h, 'Content-Type': type }); fs.createReadStream(file).pipe(res)
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] })
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  const logs = []
  page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message))
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForFunction(() => window.ready === true, null, { timeout: 180000 }).catch(e => { console.log(logs.join('\n')); throw e })
  return { page, logs, close: async () => { await browser.close(); server.close() } }
}
export async function savePng(b64, w, file) {
  await sharp(Buffer.from(b64, 'base64'), { raw: { width: w, height: w, channels: 4 } }).png().toFile(file)
}
