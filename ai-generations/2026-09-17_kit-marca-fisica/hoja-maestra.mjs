// Hoja maestra del kit de marca física de Efeonce: A4 vertical a 300 dpi, compuesta determinísticamente
// desde las vistas de cada kit. Texto y logo salen de los archivos oficiales; nada se genera.
import sharp from 'sharp'
const W = 2480, H = 3508
const NAVY = '#023c70', TINTA = '#0f1b2b', GRIS = '#5A6472', LINEA = '#D7DBE2', FONDO = '#F4F4F2'
const K = 'ai-generations'
// Envuelve un texto en líneas de ancho aproximado, sin cortar palabras ni truncar.
const envolver = (texto, max) => texto.split(' ').reduce((acc, w) => {
  const i = acc.length - 1
  if (acc[i] && (acc[i] + ' ' + w).length <= max) acc[i] += ' ' + w
  else acc.push(w)
  return acc
}, [])
const piezas = [
  { f: `${K}/2026-09-17_polo-efeonce/final/efeonce-polo-navy-01-frente-1600x1600-v01-transparente.png`, t: 'Polo piqué navy', s: 'Frente a cliente. Emblema bordado y espalda limpia' },
  { f: `${K}/2026-09-17_chaqueta-efeonce/final/efeonce-chaqueta-softshell-01-frente-1600x1600-v01-transparente.png`, t: 'Chaqueta softshell', s: 'Reunión formal y exterior, sobre el polo' },
  { f: `${K}/2026-09-17_chaqueta-efeonce/final/efeonce-chaqueta-bomber-01-frente-1600x1600-v01-transparente.png`, t: 'Bomber ligera', s: 'Pieza de imagen y eventos' },
  { f: `${K}/2026-09-17_hoodie-efeonce/final/efeonce-hoodie-01-frente-1600x1600-v01-transparente.png`, t: 'Hoodie', s: 'Producción, terreno y streaming' },
  { f: `${K}/2026-09-17_polo-efeonce/final/efeonce-polo-blanco-01-frente-1600x1600-v01-transparente.png`, t: 'Polo blanco', s: 'Verano y segunda opción frente a cliente' },
  { f: `${K}/2026-09-17_gorra-efeonce/final/efeonce-gorra-v2-navy-logotipo-1600x1600-v01-transparente.png`, t: 'Gorra navy', s: 'Uso general del equipo' },
  { f: `${K}/2026-09-17_gorra-efeonce/final/efeonce-gorra-v5-trucker-navy-1600x1600-v01-transparente.png`, t: 'Gorra trucker', s: 'Terreno y exteriores' },
  { f: `${K}/2026-09-17_lanyard-efeonce/final/efeonce-lanyard-01-conjunto-1200x1600-v01-transparente.png`, t: 'Lanyard con yoyo', s: 'Credencial diaria, con portacarnet de marco rígido' },
  { f: `${K}/2026-09-17_lanyard-efeonce/final/efeonce-carnet-plantilla-plano.png`, t: 'Carnet', s: 'Logo, retrato, nombre y cargo' }
]
const logo = await sharp('public/branding/logo-negative.svg', { density: 600 }).resize({ height: 96 }).png().toBuffer()
const { width: wLogo } = await sharp(logo).metadata()

const cols = 3, gx = 96, top = 540, cw = Math.round((W - gx * 2 - 120 * (cols - 1)) / cols), ch = 700
const comps = [{ input: Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${FONDO}"/>
  <rect x="0" y="0" width="${W}" height="360" fill="${NAVY}"/>
  <text x="${gx}" y="200" font-family="Poppins" font-weight="800" font-size="88" fill="#ffffff">Kit de marca física</text>
  <text x="${gx}" y="272" font-family="Poppins" font-weight="500" font-size="44" fill="#C8CEDA">Vestuario, accesorios y credencial · v01 · 2026</text>
  <text x="${gx}" y="470" font-family="Poppins" font-weight="700" font-size="46" fill="${NAVY}">Piezas</text>
  <line x1="${gx}" y1="496" x2="${W - gx}" y2="496" stroke="${LINEA}" stroke-width="3"/>
</svg>`), left: 0, top: 0 }, { input: logo, left: W - gx - wLogo, top: 130 }]

for (const [i, p] of piezas.entries()) {
  const x = gx + (i % cols) * (cw + 120), y = top + Math.floor(i / cols) * ch
  const img = await sharp(p.f).resize(cw - 60, 430, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  comps.push({ input: img, left: x + 30, top: y })
  const lineas = envolver(p.s, 36)
  comps.push({ input: Buffer.from(`<svg width="${cw}" height="230">
    <text x="0" y="66" font-family="Poppins" font-weight="700" font-size="46" fill="${TINTA}">${p.t}</text>
    ${lineas.map((l, k) => `<text x="0" y="${122 + k * 46}" font-family="Poppins" font-weight="400" font-size="34" fill="${GRIS}">${l}</text>`).join('')}
  </svg>`), left: x + 30, top: y + 500 })
}

const reglas = [
  ['Color', 'Navy de marca #023c70 en toda la línea. El royal queda sólo en la gorra existente del sitio.'],
  ['Aplicación', 'En prendas formales el emblema va BORDADO y sin eslogan. La estampa de espalda —logo y «Empower your Growth»— va en hoodie y chaquetas; el polo mantiene la espalda limpia.'],
  ['Impresión sobre navy', 'El prefijo del eslogan va en gris claro #C8CEDA, no en el gris de marca: sobre navy ese gris no resuelve impreso.'],
  ['Uso por contexto', 'Cliente: polo. Formal: camisa o polo con softshell. Evento: polera o bomber. Producción y terreno: hoodie, gorra y trucker.']
]
let ry = top + Math.ceil(piezas.length / cols) * ch + 30
// Altura real del bloque de reglas, para que el eslogan cierre debajo y nada se salga de la hoja.
const reglasLineas = reglas.map(r => envolver(r[1], 72))
let yy = 170
const bloques = reglas.map((r, i) => {
  const ls = reglasLineas[i]
  const b = `<text x="${gx}" y="${yy}" font-family="Poppins" font-weight="700" font-size="36" fill="${TINTA}">${r[0]}</text>` +
    ls.map((l, k) => `<text x="${gx + 460}" y="${yy + k * 46}" font-family="Poppins" font-weight="400" font-size="34" fill="${GRIS}">${l}</text>`).join('')
  yy += Math.max(92, ls.length * 46 + 38)
  return b
}).join('')
comps.push({ input: Buffer.from(`<svg width="${W}" height="${H - ry}">
  <text x="${gx}" y="60" font-family="Poppins" font-weight="700" font-size="46" fill="${NAVY}">Reglas</text>
  <line x1="${gx}" y1="86" x2="${W - gx}" y2="86" stroke="${LINEA}" stroke-width="3"/>
  ${bloques}
  <text x="${gx}" y="${yy + 40}" font-family="Poppins" font-size="34" xml:space="preserve"><tspan fill="${GRIS}" font-weight="800" font-style="italic">Empower</tspan><tspan fill="${GRIS}" font-weight="800">\u00a0your\u00a0</tspan><tspan fill="${NAVY}" font-weight="900" font-style="italic">Growth</tspan></text>
</svg>`), left: 0, top: ry })

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 244, g: 244, b: 242, alpha: 1 } } })
  .composite(comps).png().toFile('ai-generations/2026-09-17_kit-marca-fisica/efeonce-kit-marca-fisica-v01-A4.png')
console.log('ok')
