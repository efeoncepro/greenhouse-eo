// Animación «del rodaje al congelado» (Efeonce | BytePlus).
// Uso: node render-animacion.mjs <feed|story> <dirAssets> <outDir>
// Montaje de clips Seedance en letterbox → alejamiento desde la pantalla de la astronauta hasta la escena final
// (acabado Sunburst) → flash + sacudida → firma determinística. Render cuadro a cuadro con sharp + ffmpeg.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')

const [, , fmt, A, OUT] = process.argv
const ROOT = path.dirname(new URL(import.meta.url).pathname)
const FPS = 30
const W = 1080
const H = fmt === 'story' ? 1920 : 1350
const cfg = fmt === 'story'
  ? { finalImg: `${ROOT}/acabado-story.png`, astro: { x: 570, y: 1320, w: 450 }, eb: 860, lk: 906, rw: 1046 }
  : { finalImg: `${ROOT}/acabado-feed.png`, astro: { x: 590, y: 850, w: 430 }, eb: 528, lk: 576, rw: 716 }
const astroH = cfg.astro.w * 856 / 2048
const astroC = { x: cfg.astro.x + cfg.astro.w / 2, y: cfg.astro.y + astroH / 2 }

const work = `${OUT}/work-${fmt}`
fs.rmSync(work, { recursive: true, force: true })
fs.mkdirSync(`${work}/clips`, { recursive: true })
fs.mkdirSync(`${work}/frames`, { recursive: true })

// Segmentos del montaje: [clip, segundo inicial dentro del clip, duración]
const shots = [['noir', 0.6, 0.6], ['thriller', 0.8, 0.6], ['faro', 0.7, 0.6], ['astronauta', 3.1, 0.9]]
const clipFrames = {}
for (const [name, start, dur] of shots) {
  const dir = `${work}/clips/${name}`
  fs.mkdirSync(dir)
  execFileSync('ffmpeg', ['-loglevel', 'error', '-ss', String(start), '-t', String(dur), '-i', `${ROOT}/video/${name}.mp4`,
    '-vf', `fps=${FPS},scale=${W}:-2`, `${dir}/c%03d.png`])
  clipFrames[name] = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort().map(f => `${dir}/${f}`)
}

const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 // lento → rápido → lento
const easeOut = t => 1 - Math.pow(1 - t, 3)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))

const finalBuf = await sharp(cfg.finalImg).resize(W, H).toBuffer()
const efe = await sharp(`${A}/efeonce-logo-negative.svg`, { density: 300 }).resize({ width: 392 }).png().toBuffer()
const bp = await sharp(`${A}/logo-byteplus-blanco.png`).resize({ width: 421 }).png().toBuffer()
const svgText = (t, size, weight, ls, col) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="44"><style>@font-face{font-family:P;src:local('Poppins')}</style>` +
  `<text x="${W / 2}" y="31" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${col}">${t}</text></svg>`)
const eyebrow = await sharp(svgText('AHORA SOMOS PARTNERS', 22, 600, 3, '#cfe4fa')).png().toBuffer()
const row = await sharp(svgText('Seedance · Seedream · ModelArk', 24, 500, 0.5, '#b4c6da')).png().toBuffer()
const lockW = 392 + 40 + 2 + 40 + 421
const lockup = await sharp({ create: { width: lockW, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: efe, left: 0, top: 4 },
    { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="88"><rect width="2" height="88" fill="#cfe4fa" fill-opacity="0.45"/></svg>'), left: 432, top: 6 },
    { input: bp, left: 474, top: 11 }
  ]).png().toBuffer()

const withAlpha = async (buf, a) => {
  if (a >= 1) return buf
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * a)
  return sharp(data, { raw: info }).png().toBuffer()
}
const flashLayer = a => sharp({ create: { width: W, height: H, channels: 4, background: { r: 225, g: 238, b: 255, alpha: a } } }).png().toBuffer()

// Escena final vista con zoom s centrada en el punto c (coords del lienzo final)
async function sceneAt(s, cx, cy, dx = 0, dy = 0) {
  const sw = Math.round(W * s), sh = Math.round(H * s)
  const big = s === 1 ? finalBuf : await sharp(finalBuf).resize(sw, sh).toBuffer()
  let left = Math.round(cx * s - W / 2 - dx), top = Math.round(cy * s - H / 2 - dy)
  left = Math.max(0, Math.min(sw - W, left)); top = Math.max(0, Math.min(sh - H, top))
  return sharp(big).extract({ left, top, width: W, height: H }).toBuffer()
}

async function letterbox(clipPng, push) {
  // recorte panorámico 2,39:1 al centro del clip 16:9
  const m = await sharp(clipPng).metadata()
  const cropH = Math.round(m.width / 2.39)
  const clip = await sharp(clipPng).extract({ left: 0, top: Math.round((m.height - cropH) / 2), width: m.width, height: cropH }).toBuffer()
  const cw = Math.round(W * push), ch = Math.round(cropH * W / m.width * push)
  const scaled = await sharp(clip).resize(cw, ch).extract({ left: Math.round((cw - W) / 2), top: 0, width: W, height: ch }).toBuffer()
  return sharp({ create: { width: W, height: H, channels: 3, background: '#00060d' } })
    .composite([{ input: scaled, left: 0, top: Math.round(H / 2 - ch / 2) }]).png().toBuffer()
}

let f = 0
const save = async buf => { await sharp(buf).png({ compressionLevel: 3 }).toFile(`${work}/frames/f${String(f).padStart(4, '0')}.png`); f++ }

// 1) Montaje
for (const [name] of shots) {
  const frames = clipFrames[name]
  for (let i = 0; i < frames.length; i++) {
    const p = i / Math.max(1, frames.length - 1)
    const push = name === 'astronauta' ? 1 : 1 + 0.05 * p
    let buf = await letterbox(frames[i], push)
    if (i < 3 && name !== 'noir') buf = await sharp(buf).composite([{ input: await flashLayer([0.55, 0.25, 0.08][i]) }]).png().toBuffer()
    await save(buf)
  }
}
// 2) Alejamiento con desenfoque de movimiento (3 submuestras)
const s0 = W / (cfg.astro.w * 0.743) // el clip 16:9 muestra el 74 % central del fotograma 2,39:1
const zoomFrames = Math.round(0.85 * FPS)
for (let i = 0; i < zoomFrames; i++) {
  const subs = []
  for (const k of [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]) {
    const t = ease(clamp((i + k) / (zoomFrames - 1)))
    const s = s0 + (1 - s0) * t
    const cx = astroC.x + (W / 2 - astroC.x) * t, cy = astroC.y + (H / 2 - astroC.y) * t
    subs.push(await sceneAt(s, cx, cy))
  }
  // promedio parejo de las submuestras: la k-ésima entra con alfa 1/(k+1)
  let buf = subs[0]
  for (let k = 1; k < subs.length; k++) buf = await sharp(buf).composite([{ input: await withAlpha(subs[k], 1 / (k + 1)) }]).png().toBuffer()
  if (i < 4) { // empalme con el último cuadro del clip
    const last = await letterbox(clipFrames.astronauta.at(-1), 1)
    buf = await sharp(buf).composite([{ input: await withAlpha(last, 1 - i / 4) }]).png().toBuffer()
  }
  await save(buf)
}
// 3) Impacto + firma + espera
const holdFrames = Math.round(4.6 * FPS)
const shake = [[-10, 6], [8, -5], [-5, 3], [3, -2], [-1, 1]]
for (let i = 0; i < holdFrames; i++) {
  const [dx, dy] = shake[i] || [0, 0]
  let base = await sceneAt(1, W / 2, H / 2, dx, dy)
  const comps = []
  const flash = [0.5, 0.3, 0.15, 0.05][i] || 0
  if (flash) comps.push({ input: await flashLayer(flash) })
  const tl = clamp((i - 3) / 9) // firma: entra con golpe
  if (tl > 0) {
    const sc = 1.18 - 0.18 * easeOut(tl)
    const lw = Math.round(lockW * sc), lh = Math.round(100 * sc)
    const lk = await withAlpha(await sharp(lockup).resize(lw, lh).toBuffer(), clamp(tl * 1.6))
    comps.push({ input: lk, left: Math.round(W / 2 - lw / 2), top: Math.round(cfg.lk + 50 - lh / 2) })
  }
  const te = clamp((i - 10) / 8)
  if (te > 0) comps.push({ input: await withAlpha(eyebrow, te), left: 0, top: cfg.eb - 3 + Math.round(8 * (1 - easeOut(te))) })
  const tr = clamp((i - 14) / 8)
  if (tr > 0) comps.push({ input: await withAlpha(row, tr), left: 0, top: cfg.rw - 4 + Math.round(8 * (1 - easeOut(tr))) })
  if (comps.length) base = await sharp(base).composite(comps).png().toBuffer()
  await save(base)
}

const name = `efeonce-byteplus-${fmt === 'story' ? 'story-9x16' : 'feed-4x5'}`
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${work}/frames/f%04d.png`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${OUT}/${name}.mp4`])
fs.copyFileSync(`${work}/frames/f${String(f - 1).padStart(4, '0')}.png`, `${OUT}/${name}.png`)
console.log(name, f, 'cuadros')
