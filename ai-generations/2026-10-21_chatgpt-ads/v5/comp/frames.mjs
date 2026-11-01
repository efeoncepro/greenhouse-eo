import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
// uso: node frames.mjs <html> <bgdir> <outdir> <alto> <fps> [segundos-lista]
// Renderiza a <fps> (p. ej. 72) para mezclar subcuadros a 24 y obtener desenfoque de movimiento real.
const [,, html, bgdir, dir, h, fpsArg = '24', only] = process.argv
const FPS = +fpsArg, DUR = 12
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
const H = +h
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: H } })
await p.goto('file://' + html + '?h=' + H); await p.waitForTimeout(400)
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(i => i.id !== 'bg').map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
const list = only ? only.split(',').map(s => Math.round(+s * FPS)) : [...Array(DUR * FPS).keys()]
let lastBg = -1
for (const f of list) {
  const t = f / FPS, bi = Math.min(DUR * 24 - 1, Math.floor(t * 24 + 1e-6))
  if (bi !== lastBg) { await p.evaluate(s => window.setBgSrc(s), 'file://' + bgdir + '/b' + String(bi + 1).padStart(4, '0') + '.png'); lastBg = bi }
  await p.evaluate(t => window.setT(t), t)
  await p.screenshot({ path: `${dir}/a${String(f).padStart(5, '0')}.png`, clip: { x: 0, y: 0, width: 1080, height: H } })
}
await b.close(); console.log('ok', list.length)
