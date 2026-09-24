// Pantalla final CMP-003: morado SKY + logo Efeonce negativo | logo SKY blanco + firma web (url-lum, fusión luminosity canónica).
// Uso (desde la raíz): node ai-generations/2026-09-23_cmp003-sky-video/cierre/componer-cierre.mjs
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { compositeLuminosity } from '../../../scripts/creative/layout-compiler/compiler.mjs'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const P = path.join(DIR, '..', 'kit', 'out', 'piezas')
const URL_SVG = fs.readFileSync(path.resolve(DIR, '../../../src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg'))
const PURPLE = '#701C74'
// urlTop: en 9:16 la firma queda sobre la franja que tapa la interfaz de Reels/Stories (~20 % inferior)
const FORMATS = { '9x16': [1080, 1920, 0.52, 0.72], '3x4': [1080, 1440, 0.5, 0.84], '4x5': [1080, 1350, 0.5, 0.84] }

for (const [name, [W, H, cy, urlTop]] of Object.entries(FORMATS)) {
  const effW = 470, skyW = 250, gap = 44, barW = 5
  const eff = await sharp(path.join(P, 'L01-logo-efeonce-negativo.png')).trim().resize({ width: effW }).toBuffer()
  const sky = await sharp(path.join(P, 'L02-logo-sky-blanco.png')).trim().resize({ width: skyW }).toBuffer()
  const [me, ms] = [await sharp(eff).metadata(), await sharp(sky).metadata()]
  const lockH = Math.max(me.height, ms.height), barH = Math.round(lockH * 1.35)
  const total = effW + gap * 2 + barW + skyW
  const x0 = Math.round((W - total) / 2), yc = Math.round(H * cy)
  const bar = await sharp({ create: { width: barW, height: barH, channels: 4, background: '#ffffffff' } }).png().toBuffer()
  let img = await sharp({ create: { width: W, height: H, channels: 4, background: PURPLE } })
    .composite([
      { input: eff, left: x0, top: yc - Math.round(me.height / 2) },
      { input: bar, left: x0 + effW + gap, top: yc - Math.round(barH / 2) },
      { input: sky, left: x0 + effW + gap * 2 + barW, top: yc - Math.round(ms.height / 2) }
    ]).png().toBuffer()
  const urlW = 300
  const urlPng = await sharp(URL_SVG, { density: 300 }).resize({ width: urlW }).png().toBuffer()
  const um = await sharp(urlPng).metadata()
  const r = await compositeLuminosity({ backdropBytes: img, sourceBytes: urlPng, left: Math.round((W - urlW) / 2), top: Math.round(H * urlTop), width: urlW, opacity: 0.72 })
  if (r.evidence?.method !== 'non-separable-luminosity') throw new Error('firma web sin fusión luminosity')
  const out = path.join(DIR, `cierre-${name}.png`)
  await sharp(r.output).png().toFile(out)
  console.log(out, W + 'x' + H, 'url', um.width + 'x' + um.height)
}
