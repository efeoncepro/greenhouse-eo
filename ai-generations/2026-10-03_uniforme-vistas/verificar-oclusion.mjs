// Verifica una vista de OCLUSIÓN contra su frente de origen: la marca visible tiene que ser la MISMA marca, en el mismo
// sitio y al mismo tamaño, con sólo una parte tapada. Mide, tras alinear ±64 px (la entrada padeada se reencuadra):
//   · visible = qué fracción del bordado original sigue a la vista (una oclusión real deja entre 15 % y 85 %);
//   · intrusos = qué fracción del blanco nuevo cae FUERA del bordado original (marca movida, agrandada o redibujada
//     junto a la mano). Tope 12 %.
// Uso: node verificar-oclusion.mjs <origen.png> <oclusion.png> [...pares]
import path from 'node:path'
import sharp from 'sharp'
import { marcaDe } from './rotacion-marca.mjs'

const hilo = (d, i) => d[i] > 185 && d[i + 1] > 185 && d[i + 2] > 185 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) < 28

export const verificar = async (origen, oclusion) => {
  const o = await sharp(oclusion).raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = o.info
  const s = await sharp(origen).resize(W, H, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const tmp = await sharp(origen).resize(W, H, { fit: 'fill' }).png().toBuffer()
  const m = await marcaDe(tmp)
  if (!m) return { error: 'sin marca en el origen' }
  const [x0, y0, x1, y1] = m.bbox
  const pad = Math.round((x1 - x0) * 0.35)
  const R = { l: Math.max(0, x0 - pad), t: Math.max(0, y0 - pad), r: Math.min(W - 1, x1 + pad), b: Math.min(H - 1, y1 + pad) }
  const S = []
  for (let y = R.t; y <= R.b; y++) for (let x = R.l; x <= R.r; x++) if (hilo(s.data, (y * W + x) * C)) S.push([x, y])
  const enS = new Set(S.map(([x, y]) => y * W + x))
  let mejor = null
  for (let dy = -64; dy <= 64; dy += 2) for (let dx = -64; dx <= 64; dx += 2) {
    let blanco = 0, dentro = 0
    for (let y = R.t; y <= R.b; y++) for (let x = R.l; x <= R.r; x++) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || !hilo(o.data, (yy * W + xx) * C)) continue
      blanco++
      if (enS.has(y * W + x)) dentro++
    }
    if (!mejor || dentro > mejor.dentro) mejor = { dx, dy, blanco, dentro }
  }
  const visible = mejor.dentro / S.length
  const intrusos = mejor.blanco ? (mejor.blanco - mejor.dentro) / mejor.blanco : 0
  return { visible: +visible.toFixed(2), intrusos: +intrusos.toFixed(2), desplazamiento: [mejor.dx, mejor.dy], ok: visible >= 0.15 && visible <= 0.85 && intrusos <= 0.12 }
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const a = process.argv.slice(2)
  for (let i = 0; i < a.length; i += 2) console.log(path.basename(a[i + 1]).padEnd(30), JSON.stringify(await verificar(a[i], a[i + 1])))
}
