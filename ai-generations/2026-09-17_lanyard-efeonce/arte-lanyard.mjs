// Artes canónicas del lanyard y del yoyo, compuestas de forma determinística (el texto exacto nunca se genera).
// - Cinta: patrón repetido logo blanco · eslogan (Empower your en gris #848484, Growth en blanco como acento).
// - Yoyo: cara de resina, fondo blanco e isotipo navy #023c70.
import sharp from 'sharp'
const ALTO = 300            // alto de la cinta en px del arte (≈ 20 mm reales)
const MODULOS = 4

const logo = await sharp('public/branding/logo-negative.svg', { density: 600 }).resize({ height: Math.round(ALTO * 0.42) }).png().toBuffer()
const { width: wLogo } = await sharp(logo).metadata()

const fs = Math.round(ALTO * 0.30)
const eslogan = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2200" height="${ALTO}">
  <text x="0" y="${Math.round(ALTO * 0.6)}" font-family="Poppins" font-size="${fs}" xml:space="preserve">
    <tspan fill="#848484" font-weight="800" font-style="italic">Empower</tspan><tspan fill="#848484" font-weight="800"> your </tspan><tspan fill="#ffffff" font-weight="900" font-style="italic">Growth</tspan>
  </text></svg>`)).png().toBuffer()

const esloganTrim = await sharp(eslogan).trim({ threshold: 1 }).toBuffer()
const { width: wEslTrim, height: hEsl } = await sharp(esloganTrim).metadata()

// El paso del patrón se calcula desde las piezas para que nunca se solapen.
const GAP = Math.round(ALTO * 0.9)
const PASO = wLogo + GAP + wEslTrim + GAP
const comps = []
for (let i = 0; i < MODULOS; i++) {
  const x = i * PASO
  comps.push({ input: logo, left: x, top: Math.round(ALTO * 0.29) })
  comps.push({ input: esloganTrim, left: x + wLogo + GAP, top: Math.round((ALTO - hEsl) / 2) })
}
await sharp({ create: { width: PASO * MODULOS, height: ALTO, channels: 4, background: { r: 2, g: 60, b: 112, alpha: 1 } } })
  .composite(comps).png().toFile('ai-generations/2026-09-17_lanyard-efeonce/ref/arte-cinta.png')

// Cara del yoyo: círculo blanco con el isotipo navy centrado.
const D = 1000
const iso = await sharp('public/branding/SVG/isotipo-full-efeonce.svg', { density: 600 }).resize({ width: Math.round(D * 0.62) }).png().toBuffer()
const { width: wi, height: hi } = await sharp(iso).metadata()
await sharp({ create: { width: D, height: D, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2 - 2}" fill="#ffffff"/></svg>`), left: 0, top: 0 },
              { input: iso, left: Math.round((D - wi) / 2), top: Math.round((D - hi) / 2) }])
  .png().toFile('ai-generations/2026-09-17_lanyard-efeonce/ref/arte-yoyo.png')
console.log(JSON.stringify({ cinta: [PASO * MODULOS, ALTO], modulo: PASO, yoyo: D, logoAncho: wLogo, esloganAncho: wEslTrim }))
