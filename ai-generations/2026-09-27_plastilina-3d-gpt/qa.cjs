// QA del volumen: silueta (IoU normalizada por caja) y calados (huecos cerrados) contra el ícono plano de referencia.
const sharp = require('sharp')
const N = 256
async function mask(file, fromAlpha) {
  const img = sharp(file).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, m = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    if (fromAlpha) m[i] = data[i * 4 + 3] > 128 ? 1 : 0
    else { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; m[i] = Math.hypot(r - 0, g - 26, b - 51) > 60 ? 1 : 0 }
  }
  return { m, W, H }
}
function holes({ m, W, H }) {
  const seen = new Uint8Array(W * H); let count = 0; const minArea = W * H * 0.00015
  const fill = (s) => { const st = [s]; let a = 0, border = false; seen[s] = 1
    while (st.length) { const p = st.pop(); a++; const x = p % W, y = (p / W) | 0; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && !seen[q] && !m[q] && Math.abs((q % W) - x) <= 1) { seen[q] = 1; st.push(q) } }
    return { a, border } }
  for (let i = 0; i < W * H; i++) if (!m[i] && !seen[i]) { const r = fill(i); if (!r.border && r.a > minArea) count++ }
  return count
}
function parts({ m, W, H }) {
  const seen = new Uint8Array(W * H); let count = 0; const minArea = W * H * 0.00015
  for (let i = 0; i < W * H; i++) if (m[i] && !seen[i]) { const st = [i]; seen[i] = 1; let a = 0
    while (st.length) { const p = st.pop(); a++; const x = p % W
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && !seen[q] && m[q] && Math.abs((q % W) - x) <= 1) { seen[q] = 1; st.push(q) } }
    if (a > minArea) count++ }
  return count
}
async function norm({ m, W, H }) {
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const buf = Buffer.alloc(W * H); for (let i = 0; i < W * H; i++) buf[i] = m[i] * 255
  const out = await sharp(buf, { raw: { width: W, height: H, channels: 1 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).resize(N, N, { fit: 'fill' }).raw().toBuffer()
  return out.map((v) => (v > 127 ? 1 : 0))
}
;(async () => {
  const [ref, vol] = process.argv.slice(2)
  const a = await mask(ref, false), b = await mask(vol, true)
  const na = await norm(a), nb = await norm(b)
  let inter = 0, uni = 0; for (let i = 0; i < N * N; i++) { inter += na[i] & nb[i]; uni += na[i] | nb[i] }
  console.log(JSON.stringify({ iou: +(inter / uni).toFixed(3), holesRef: holes(a), holesVol: holes(b), partsRef: parts(a), partsVol: parts(b) }))
})()
