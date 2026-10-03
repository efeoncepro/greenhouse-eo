// Recompone la marca oficial con ESCORZO en las vistas puestas con giro, donde el modelo la rotó en el plano.
// 1) máscara del fondo de estudio (gris claro conectado al borde) → `--oclusion`, para no pintar tela sobre el fondo;
// 2) centro de la marca generada (componente blanco del pecho); 3) `componerIsotipo` con escorzo por giro.
// Uso: node recomponer.mjs [--acabado] [vista …]
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { componerIsotipo } from '../../scripts/foto/isotipo.mjs'

const D = path.dirname(new URL(import.meta.url).pathname)
const args = process.argv.slice(2)
const acabado = args.includes('--acabado')
const pedidas = args.filter(a => !a.startsWith('--'))

const ANCHO = { bomber: 0.074, softshell: 0.082, polo: 0.072, hoodie: 0.083 }
const ESCORZO = { '45-der': 0.72, '70-izq': 0.6, '70-der': 0.36 }
const SUPERFICIE = {
  bomber: 'the left chest of a navy bomber jacket in a smooth twill shell',
  softshell: 'the left chest of a navy technical softshell jacket',
  polo: 'the left chest of a navy cotton piqué polo shirt',
  hoodie: 'the left chest of a royal-blue brushed-fleece hoodie'
}

const mascaraFondo = async (file, out) => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = info
  const ref = [0, 0, 0]
  for (const [x, y] of [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]) for (let k = 0; k < 3; k++) ref[k] += data[(y * W + x) * C + k] / 4
  const fondo = new Uint8Array(W * H)
  const cerca = p => { const i = p * C; return Math.abs(data[i] - ref[0]) + Math.abs(data[i + 1] - ref[1]) + Math.abs(data[i + 2] - ref[2]) < 60 }
  const pila = []
  for (let x = 0; x < W; x++) { pila.push(x, (H - 1) * W + x) }
  for (let y = 0; y < H; y++) { pila.push(y * W, y * W + W - 1) }
  while (pila.length) {
    const p = pila.pop()
    if (fondo[p] || !cerca(p)) continue
    fondo[p] = 1
    const x = p % W
    if (x > 0) pila.push(p - 1)
    if (x < W - 1) pila.push(p + 1)
    if (p >= W) pila.push(p - W)
    if (p < W * (H - 1)) pila.push(p + W)
  }
  const buf = Buffer.alloc(W * H)
  for (let p = 0; p < W * H; p++) buf[p] = fondo[p] ? 255 : 0
  await sharp(buf, { raw: { width: W, height: H, channels: 1 } }).dilate(2).png().toFile(out)
}

const centroMarca = async (file, fondoPng) => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  const fondo = (await sharp(fondoPng).extractChannel(0).raw().toBuffer())
  const { width: W, height: H, channels: C } = info
  const claro = new Uint8Array(W * H)
  for (let p = 0; p < W * H; p++) { const i = p * C; claro[p] = !fondo[p] && data[i] > 175 && data[i + 1] > 175 && data[i + 2] > 175 ? 1 : 0 }
  const visto = new Uint8Array(W * H); let mejor = null
  for (let s = 0; s < W * H; s++) {
    if (!claro[s] || visto[s]) continue
    const pila = [s]; visto[s] = 1; let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0
    while (pila.length) { const p = pila.pop(); n++; const x = p % W, y = (p - x) / W; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && claro[q] && !visto[q]) { visto[q] = 1; pila.push(q) } }
    if (x1 - x0 > W * 0.25 || y1 - y0 > H * 0.2 || n < 60 || (y0 + y1) / 2 > H * 0.32 || (y0 + y1) / 2 < H * 0.15) continue
    if (!mejor || n > mejor.n) mejor = { n, x0, y0, x1, y1 }
  }
  return mejor && { cx: (mejor.x0 + mejor.x1) / 2 / W, cy: (mejor.y0 + mejor.y1) / 2 / H, ancho: (mejor.x1 - mejor.x0) / W }
}

const vistas = ['bomber', 'softshell', 'polo', 'hoodie'].flatMap(k => ['45-der', '70-izq', '70-der'].flatMap(g => [`${k}-${g}`, `${k}-${g}-mujer`]))

for (const v of pedidas.length ? pedidas : vistas) {
  const [k, ...resto] = v.split('-')
  const giro = resto.filter(x => x !== 'mujer').join('-')
  const plate = path.join(D, 'out', `${v}.png`)
  const fondo = path.join(D, 'mascaras', `${v}-fondo.png`)
  if (!existsSync(fondo)) await mascaraFondo(plate, fondo)
  const c = await centroMarca(plate, fondo)
  if (!c) { console.log(v, 'SIN MARCA DETECTADA'); continue }
  const r = await componerIsotipo({
    plate, centro: [+c.cx.toFixed(4), +c.cy.toFixed(4)], ancho: ANCHO[k], escorzo: ESCORZO[giro], oclusion: fondo,
    out: path.join(D, 'compuestas', `${v}.png`),
    ...(acabado ? { acabado: true, superficie: SUPERFICIE[k], tecnica: 'embroidered in white satin-stitch thread, slightly raised, with visible stitch direction' } : {})
  })
  console.log(v, c.cx.toFixed(3), c.cy.toFixed(3), 'esc', ESCORZO[giro], 'tapados', r.procedencia.oclusion.pixelesDeMarcaTapados, r.acabado?.veredicto ?? '')
}
