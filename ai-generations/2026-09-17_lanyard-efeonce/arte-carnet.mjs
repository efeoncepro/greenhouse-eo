// Carnet Efeonce (CR80 vertical, 54 × 86 mm a 300 dpi = 638 × 1016 px; acá 1050 × 1670 para tener margen de render).
// Se compone de forma determinística: logo oficial, nombre, cargo y foto. El texto exacto nunca se genera.
// Uso: node arte-carnet.mjs <foto.png> "<Nombre Apellido>" "<Cargo>" <salida.png>
import sharp from 'sharp'
const [, , FOTO, NOMBRE_RAW, CARGO_RAW, OUT] = process.argv
// El texto entra a un SVG: escapar entidades o un «&» en el cargo rompe el parseo.
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const NOMBRE = esc(NOMBRE_RAW), CARGO = esc(CARGO_RAW)
const W = 1050, H = 1670, R = 60
const NAVY = '#023c70', GRIS = '#5A6472', GRIS_CLARO = '#C8CEDA'
const headerH = Math.round(H * 0.17)

const logo = await sharp('public/branding/logo-negative.svg', { density: 600 }).resize({ width: Math.round(W * 0.52) }).png().toBuffer()
const { height: hLogo } = await sharp(logo).metadata()

const fotoD = Math.round(W * 0.56)
const foto = await sharp(FOTO).resize(fotoD, fotoD, { fit: 'cover', position: 'top' })
  .composite([{ input: Buffer.from(`<svg width="${fotoD}" height="${fotoD}"><circle cx="${fotoD / 2}" cy="${fotoD / 2}" r="${fotoD / 2}" fill="#fff"/></svg>`), blend: 'dest-in' }])
  .png().toBuffer()

const texto = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" rx="${R}" ry="${R}" fill="#ffffff"/>
  <path d="M0 ${R} A${R} ${R} 0 0 1 ${R} 0 H${W - R} A${R} ${R} 0 0 1 ${W} ${R} V${headerH} H0 Z" fill="${NAVY}"/>
  <rect x="${W / 2 - 110}" y="${Math.round(headerH * 0.28)}" width="220" height="26" rx="13" fill="#ffffff" opacity="0.001"/>
  <text x="${W / 2}" y="${Math.round(H * 0.735)}" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="74" fill="${NAVY}">${NOMBRE}</text>
  <text x="${W / 2}" y="${Math.round(H * 0.785)}" text-anchor="middle" font-family="Poppins" font-weight="500" font-size="44" fill="${GRIS}">${CARGO}</text>
  <rect x="${Math.round(W * 0.18)}" y="${Math.round(H * 0.805)}" width="${Math.round(W * 0.64)}" height="3" fill="${GRIS_CLARO}"/>
  <text x="${W / 2}" y="${Math.round(H * 0.875)}" text-anchor="middle" font-family="Poppins" font-size="40" xml:space="preserve">
    <tspan fill="${GRIS}" font-weight="800" font-style="italic">Empower</tspan><tspan fill="${GRIS}" font-weight="800"> your </tspan><tspan fill="${NAVY}" font-weight="900" font-style="italic">Growth</tspan>
  </text>
  <rect x="${W / 2 - 90}" y="${Math.round(H * 0.035)}" width="180" height="26" rx="13" fill="#ffffff"/>
</svg>`)

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: texto, left: 0, top: 0 },
    { input: logo, left: Math.round((W - Math.round(W * 0.52)) / 2), top: Math.round((headerH - hLogo) / 2) + 10 },
    { input: foto, left: Math.round((W - fotoD) / 2), top: Math.round(H * 0.26) }
  ])
  .png().toFile(OUT)
console.log('ok', OUT)
