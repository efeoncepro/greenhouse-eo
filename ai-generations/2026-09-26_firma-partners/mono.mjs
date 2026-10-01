// Logotipos oficiales de partners → versión monocroma de un solo tono, con peso óptico igualado.
// node mono.mjs → logos/mono/<id>-<tono>.png (2×) + logos/mono/manifest.json (ancho/alto a 1×).
// La tinta es alfa × (1 − blancura): lo blanco dentro de un logo (el texto de la nube de Salesforce) queda calado.
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { mkdirSync, writeFileSync } from 'node:fs'

const DIR = new URL('./logos/', import.meta.url).pathname
mkdirSync(DIR + 'mono', { recursive: true })

export const LOGOS = [
  { id: 'hubspot', file: 'hubspot-logotype.svg', name: 'HubSpot' },
  { id: 'salesforce', file: 'salesforce.com_logo.svg', name: 'Salesforce' },
  { id: 'adobe', file: 'adobe-logotype.svg', name: 'Adobe' },
  { id: 'microsoft', file: 'microsoft_logo_2012.svg', name: 'Microsoft' },
  { id: 'claude', file: 'claude-logotype.svg', name: 'Claude' },
  { id: 'openai', file: 'openai_logo.svg', name: 'OpenAI' },
  { id: 'googlecloud', file: 'google_cloud_logo.svg', name: 'Google Cloud' },
  { id: 'aws', file: 'amazon_web_services_logo.svg', name: 'AWS' },
  { id: 'byteplus', file: 'byteplus.png', name: 'BytePlus' }
]
// Tonos: sobre la tarjeta navy (B) y sobre papel (A). Gris-azul de la propia tarjeta, no gris neutro.
export const TONES = { navy: [124, 146, 170], white: [138, 149, 162] }
// Peso óptico: todos con la misma área de tinta, dentro de una caja máxima a 1×.
const INK_AREA = 430, MAX_H = 24, MAX_W = 80, SCALE = 3

const manifest = {}
for (const l of LOGOS) {
  const src = DIR + l.file
  const base = sharp(src, { density: 600 }).resize({ height: 480 }).ensureAlpha()
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true })
  const ink = new Float32Array(info.width * info.height)
  let area = 0, minX = info.width, minY = info.height, maxX = 0, maxY = 0
  for (let i = 0; i < ink.length; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3] / 255
    const white = Math.min(r, g, b) / 255
    const v = a * (white > 0.86 ? Math.max(0, (1 - white) / 0.14) : 1)
    ink[i] = v
    if (v > 0.08) {
      area += v
      const x = i % info.width, y = (i / info.width) | 0
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1
  // Escala 1× que da el área de tinta objetivo, acotada por la caja máxima.
  let k = Math.sqrt(INK_AREA / area)
  k = Math.min(k, MAX_H / bh, MAX_W / bw)
  const w1 = Math.round(bw * k), h1 = Math.round(bh * k)
  for (const [tone, [tr, tg, tb]] of Object.entries(TONES)) {
    const out = Buffer.alloc(bw * bh * 4)
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const v = ink[(y + minY) * info.width + (x + minX)], o = (y * bw + x) * 4
      out[o] = tr; out[o + 1] = tg; out[o + 2] = tb; out[o + 3] = Math.round(v * 255)
    }
    await sharp(out, { raw: { width: bw, height: bh, channels: 4 } })
      .resize({ width: w1 * SCALE, height: h1 * SCALE, fit: 'fill', kernel: 'lanczos3' })
      .png().toFile(DIR + `mono/${l.id}-${tone}.png`)
  }
  manifest[l.id] = { name: l.name, w: w1, h: h1 }
  console.log(l.id.padEnd(12), `${w1}×${h1}`)
}
writeFileSync(DIR + 'mono/manifest.json', JSON.stringify(manifest, null, 2))
