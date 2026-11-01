// Avatar de autor del blog: la capa aprobada de Julio (sin fondo, 1080²) reencuadrada más cerca y compuesta sobre
// fondos de luminancia media. node componer-autor.mjs <capa.png> <salida-dir>
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')

const [capaPath, outDir] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

const LADO = 1080
// En la capa: ojos a y=356, ojos→mentón 222 px, cara centrada en x=540.
// Encuadre de autor: ojos→mentón ≈ 30 % del lado y ojos al 40 % del alto.
const S = Number(process.env.S || 640)
const top = Math.round(356 - 0.4 * S)
const left = Math.round(540 - S / 2)

const sujeto = await sharp(readFileSync(capaPath))
  .extract({ left, top, width: S, height: S })
  .resize(LADO, LADO, { kernel: 'lanczos3' })
  .png()
  .toBuffer()

const ojosY = Math.round(0.4 * LADO)
const fondos = {
  'azul-foto': `<radialGradient id="g" cx="50%" cy="${(ojosY / LADO) * 100}%" r="75%"><stop offset="0" stop-color="#3d97ea"/><stop offset="0.55" stop-color="#0375db"/><stop offset="1" stop-color="#035fb3"/></radialGradient>`,
  'papel-halo': `<radialGradient id="g" cx="50%" cy="${(ojosY / LADO) * 100}%" r="70%"><stop offset="0" stop-color="#bfeeea"/><stop offset="0.5" stop-color="#e3f1f2"/><stop offset="1" stop-color="#f7f8f6"/></radialGradient>`,
  'teal-growth': `<radialGradient id="g" cx="50%" cy="${(ojosY / LADO) * 100}%" r="75%"><stop offset="0" stop-color="#72ded8"/><stop offset="0.55" stop-color="#36c8bf"/><stop offset="1" stop-color="#1a9e96"/></radialGradient>`
}

for (const [nombre, grad] of Object.entries(fondos)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}"><defs>${grad}</defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
  const base = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer()
  // grano fino contra el bandeado
  let semilla = 11
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647 - 0.5
  for (let i = 0; i < base.length; i++) base[i] = Math.max(0, Math.min(255, Math.round(base[i] + azar() * 2.2)))
  const out = await sharp(base, { raw: { width: LADO, height: LADO, channels: 3 } })
    .composite([{ input: sujeto }])
    .png()
    .toBuffer()
  writeFileSync(`${outDir}/julio-autor-${nombre}-1080.png`, out)
  writeFileSync(`${outDir}/julio-autor-${nombre}-500.png`, await sharp(out).resize(500, 500).png().toBuffer())
}

// Hoja de legibilidad: cada variante a 160/96/72/48/32 sobre el oscuro del sitio y sobre papel.
const tam = [160, 96, 72, 48, 32]
const filas = Object.keys(fondos)
const W = 40 + tam.reduce((a, b) => a + b + 24, 0) + 40
const H = 40 + filas.length * 2 * 190
const piezas = []
let y = 40
for (const nombre of filas) {
  for (const bg of ['#001a33', '#ffffff']) {
    piezas.push({ input: Buffer.from(`<svg width="${W}" height="190"><rect width="${W}" height="190" fill="${bg}"/></svg>`), left: 0, top: y - 15 })
    let x = 40
    for (const t of tam) {
      const circ = Buffer.from(`<svg width="${t}" height="${t}"><circle cx="${t / 2}" cy="${t / 2}" r="${t / 2}" fill="#fff"/></svg>`)
      const img = await sharp(readFileSync(`${outDir}/julio-autor-${nombre}-1080.png`)).resize(t, t).composite([{ input: circ, blend: 'dest-in' }]).png().toBuffer()
      piezas.push({ input: img, left: x, top: y + Math.round((160 - t) / 2) })
      x += t + 24
    }
    y += 190
  }
}
await sharp({ create: { width: W, height: H, channels: 3, background: '#888888' } }).composite(piezas).png().toFile(`${outDir}/hoja-legibilidad.png`)
console.log('ok', outDir)
