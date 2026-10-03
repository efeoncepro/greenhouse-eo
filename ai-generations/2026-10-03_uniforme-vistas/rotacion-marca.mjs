// Detecta si el modelo ROTÓ la marca en el plano. La correlación x·y de los píxeles de la marca es invariante al
// escorzo (escalar x multiplica cov_xy y σx por igual) y cambia con la rotación. Se compara contra el isotipo oficial.
// Uso: node rotacion-marca.mjs <png …>  → rho, Δ contra el kit y veredicto (tolerancia 0,15)
// Referencia: el componente conexo (órbita + nave; la esfera queda aparte) de las cuatro vistas puestas de frente
// aprobadas del kit mide rho −0,38 a −0,46 (media −0,42). El SVG oficial completo no sirve de referencia: incluye la
// esfera y da +0,07.
export const RHO_KIT = -0.42
import path from 'node:path'
import sharp from 'sharp'
import { isotipoOficial } from '../../scripts/foto/isotipo.mjs'

const rhoDe = (pts) => {
  const n = pts.length
  let mx = 0, my = 0
  for (const [x, y] of pts) { mx += x; my += y }
  mx /= n; my /= n
  let vx = 0, vy = 0, cxy = 0
  for (const [x, y] of pts) { vx += (x - mx) ** 2; vy += (y - my) ** 2; cxy += (x - mx) * (y - my) }
  return cxy / Math.sqrt(vx * vy)
}

export const rhoOficial = async () => {
  const of = await isotipoOficial('oscura')
  const { data, info } = await sharp(of.svg, { density: 300 }).resize({ width: 400 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pts = []
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 128) pts.push([x, -y])
  return rhoDe(pts)
}

export const marcaDe = async (file) => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = info
  const claro = new Uint8Array(W * H)
  for (let p = 0; p < W * H; p++) { const i = p * C; claro[p] = data[i] > 175 && data[i + 1] > 175 && data[i + 2] > 175 ? 1 : 0 }
  const visto = new Uint8Array(W * H); let mejor = null
  for (let s = 0; s < W * H; s++) {
    if (!claro[s] || visto[s]) continue
    const pila = [s]; visto[s] = 1; const pts = []; let x0 = W, y0 = H, x1 = 0, y1 = 0
    while (pila.length) { const p = pila.pop(); const x = p % W, y = (p - x) / W; pts.push([x, -y]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && claro[q] && !visto[q]) { visto[q] = 1; pila.push(q) } }
    const cy = (y0 + y1) / 2 / H
    if (x1 - x0 > W * 0.2 || y1 - y0 > H * 0.15 || pts.length < 150 || cy > 0.32 || cy < 0.15 || x0 <= 2 || x1 >= W - 3) continue
    if (!mejor || pts.length > mejor.pts.length) mejor = { pts, bbox: [x0, y0, x1, y1] }
  }
  return mejor
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const ref = RHO_KIT
  for (const f of process.argv.slice(2)) {
    const m = await marcaDe(f)
    if (!m) { console.log(path.basename(f), 'sin marca detectada'); continue }
    const rho = rhoDe(m.pts)
    const [x0, y0, x1, y1] = m.bbox
    console.log(path.basename(f).padEnd(26), 'rho', rho.toFixed(3), 'Δ', (rho - ref).toFixed(3), 'aspecto', ((x1 - x0) / (y1 - y0)).toFixed(2), Math.abs(rho - ref) > 0.15 ? 'ROTADA' : 'ok')
  }
}
