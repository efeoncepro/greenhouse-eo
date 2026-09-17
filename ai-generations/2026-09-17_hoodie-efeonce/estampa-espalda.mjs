// Estampa canónica de la espalda: logo negativo + eslogan «Empower your Growth» (Poppins 800 italic / 800 / 900 italic,
// contrato de src/config/efeonce-brand.ts), centrado respecto al logo y más chico que él. Se compone de forma
// determinística: el texto exacto nunca se le pide a un modelo.
import sharp from 'sharp'
const ANCHO = 1600
const logo = await sharp('public/branding/logo-negative.svg', { density: 600 }).resize({ width: ANCHO }).png().toBuffer()
const { height: hLogo } = await sharp(logo).metadata()
const anchoEslogan = Math.round(ANCHO * 0.52)
const fs = Math.round(anchoEslogan / 8.2)
const gap = Math.round(ANCHO * 0.07)
const esloganSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${Math.round(fs * 1.6)}">
  <text x="${ANCHO / 2}" y="${fs * 1.05}" text-anchor="middle" fill="#ffffff" font-family="Poppins" font-size="${fs}" xml:space="preserve">
    <tspan font-weight="800" font-style="italic">Empower</tspan><tspan font-weight="800">\u00a0your\u00a0</tspan><tspan font-weight="900" font-style="italic">Growth</tspan>
  </text>
</svg>`)
const eslogan = await sharp(esloganSvg).png().toBuffer()
const { height: hEsl } = await sharp(eslogan).metadata()
const H = hLogo + gap + hEsl
await sharp({ create: { width: ANCHO, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: logo, left: 0, top: 0 }, { input: eslogan, left: 0, top: hLogo + gap }])
  .png().toFile('ai-generations/2026-09-17_hoodie-efeonce/ref/estampa-espalda.png')
await sharp('ai-generations/2026-09-17_hoodie-efeonce/ref/estampa-espalda.png').flatten({ background: '#1b4bb5' }).png()
  .toFile('ai-generations/2026-09-17_hoodie-efeonce/ref/estampa-espalda-sobre-navy.png')
console.log(JSON.stringify({ ANCHO, hLogo, anchoEslogan, fs, H }))
