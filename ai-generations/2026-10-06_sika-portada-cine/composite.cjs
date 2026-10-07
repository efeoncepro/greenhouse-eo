// Compone las piezas aprobadas de Sika sobre las tarjetas de luz del plate aprobado CR4 (deterministico, homografia).
const sharp = require('sharp'); const path = require('path')
const S = process.argv[2]; const PLATE = process.argv[3]; const OUT = process.argv[4]
const K = 2 // trabajamos al doble
const P = f => path.join(S, f)
// [fuente, quad en coords del plate 1792x1024: TL TR BR BL, radio]
const CARDS = [
  ['sbf/f07.png',            [[925,471],[1057.5,460],[1052.5,716],[917.5,715]], 6],
  ['sbf/f05.png',            [[1225,332],[1322,348],[1317,504],[1222,498]], 4],
  ['preview/Instagram.png',  [[1345,266],[1432,268],[1436,390],[1350,390]], 4],
  ['preview/MasterGraphic.png',[[1457,218],[1580,252],[1582,333],[1462,298]], 3],
  ['preview/Facebook.png',   [[1480,130],[1562,147],[1561,225],[1477,202]], 3],
  ['sbf/f04.png',            [[1576,175],[1622,167],[1629,258],[1588,263]], 3],
  ['preview/Sikaflex.png',   [[1502,83],[1562,92],[1562,152],[1500,142]], 2],
  ['preview/ViscoCrete.png', [[1428,52],[1468,50],[1476,104],[1440,107]], 2],
  ['sbf/f01.png',            [[1337,48],[1370,45],[1374,88],[1344,90]], 2],
]
function solve(A, b) { const n = b.length; for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i] } } const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i] } return x }
function homography(from, to) { const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = from[i], [u, v] = to[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v) } const h = solve(A, b); return (x, y) => { const d = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d] } }
;(async () => {
  const meta = await sharp(PLATE).metadata(); const W = meta.width * K, H = meta.height * K
  const base = await sharp(PLATE).resize(W, H, { kernel: 'lanczos3' }).removeAlpha().raw().toBuffer()
  const mask = Buffer.alloc(W * H)
  for (const [src, quad0, r0] of CARDS) {
    const quad = quad0.map(([x, y]) => [x * K, y * K]); const r = r0 * K
    // aspecto del destino ~ promedio de lados
    const dw = (Math.hypot(quad[1][0]-quad[0][0], quad[1][1]-quad[0][1]) + Math.hypot(quad[2][0]-quad[3][0], quad[2][1]-quad[3][1])) / 2
    const dh = (Math.hypot(quad[3][0]-quad[0][0], quad[3][1]-quad[0][1]) + Math.hypot(quad[2][0]-quad[1][0], quad[2][1]-quad[1][1])) / 2
    const sw = Math.round(dw * 3), sh = Math.round(dh * 3)
    const img = await sharp(P(src)).resize(sw, sh, { fit: 'cover', position: 'centre' }).removeAlpha().raw().toBuffer()
    const inv = homography(quad, [[0,0],[sw,0],[sw,sh],[0,sh]])
    const xs = quad.map(q => q[0]), ys = quad.map(q => q[1])
    const x0 = Math.floor(Math.min(...xs)) - 2, x1 = Math.ceil(Math.max(...xs)) + 2, y0 = Math.floor(Math.min(...ys)) - 2, y1 = Math.ceil(Math.max(...ys)) + 2
    const rs = r * 3, sc = 3
    const inside = (u, v) => { if (u < 0 || v < 0 || u > sw || v > sh) return false; const cx = u < rs ? rs : u > sw - rs ? sw - rs : u, cy = v < rs ? rs : v > sh - rs ? sh - rs : v; return (u - cx) ** 2 + (v - cy) ** 2 <= rs * rs }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let cov = 0; for (const [ox, oy] of [[.25,.25],[.75,.25],[.25,.75],[.75,.75]]) { const [u, v] = inv(x + ox, y + oy); if (inside(u, v)) cov++ }
      if (!cov) continue
      const [u, v] = inv(x + .5, y + .5); const uu = Math.min(sw - 1.001, Math.max(0, u - .5)), vv = Math.min(sh - 1.001, Math.max(0, v - .5))
      const ix = Math.floor(uu), iy = Math.floor(vv), fx = uu - ix, fy = vv - iy, a = cov / 4, o = (y * W + x) * 3
      for (let c = 0; c < 3; c++) { const p = (xx, yy) => img[(yy * sw + xx) * 3 + c]; const val = p(ix, iy) * (1 - fx) * (1 - fy) + p(ix + 1, iy) * fx * (1 - fy) + p(ix, iy + 1) * (1 - fx) * fy + p(ix + 1, iy + 1) * fx * fy; base[o + c] = Math.round(base[o + c] * (1 - a) + val * a) }
      mask[y * W + x] = Math.max(mask[y * W + x], Math.round(a * 255))
    }
  }
  // halo de luz de pantalla (screen) desde las tarjetas
  const glow = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).blur(14).extractChannel(0).raw().toBuffer({ resolveWithObject: false })
  if (glow.length !== W * H) throw new Error('glow ' + glow.length)
  const tint = [255, 214, 120]
  for (let i = 0; i < W * H; i++) { const g = (glow[i] / 255) * 0.5 * (1 - mask[i] / 255 * 0.85); if (g <= 0) continue; for (let c = 0; c < 3; c++) { const b = base[i * 3 + c] / 255, t = tint[c] / 255 * g; base[i * 3 + c] = Math.round((1 - (1 - b) * (1 - t)) * 255) } }
  await sharp(base, { raw: { width: W, height: H, channels: 3 } }).png().toFile(OUT)
  await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).png().toFile(OUT.replace(/\.png$/, '-mask.png'))
  console.log('ok', W, H)
})()
