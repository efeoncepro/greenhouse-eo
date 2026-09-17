// Vacía los huecos (ventanas, cortes de la órbita) que el matting dejó opacos con el color del fondo de estudio.
// SUPERSEDED (2026-09-17): usar `pnpm ai:image:rmbg <in> <out> --key-background <umbral> <minPx>`; se conserva como registro.
// Uso: node limpiar-huecos.mjs <fondo.png> <transparente.png> <umbral> <minPx>
import sharp from 'sharp'
const [,, fondoPath, transPath, T = '42', MIN = '30'] = process.argv
const { data: src, info } = await sharp(fondoPath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { data: out } = await sharp(transPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, N = W * H
const border = []
for (let x = 0; x < W; x += 4) border.push(x, (H - 1) * W + x)
for (let y = 0; y < H; y += 4) border.push(y * W, y * W + W - 1)
const med = c => { const v = border.map(i => src[i * 3 + c]).sort((a, b) => a - b); return v[v.length >> 1] }
const bg = [med(0), med(1), med(2)]
const dist = i => Math.hypot(src[i * 3] - bg[0], src[i * 3 + 1] - bg[1], src[i * 3 + 2] - bg[2])
const cand = new Uint8Array(N)
for (let i = 0; i < N; i++) cand[i] = out[i * 4 + 3] > 0 && dist(i) < Number(T) ? 1 : 0
const kill = new Uint8Array(N), seen = new Uint8Array(N), stack = []
let removed = 0, comps = 0
for (let s = 0; s < N; s++) {
  if (!cand[s] || seen[s]) continue
  const comp = []; stack.push(s); seen[s] = 1
  while (stack.length) { const i = stack.pop(); comp.push(i); const x = i % W
    for (const j of [i - 1, i + 1, i - W, i + W]) { if (j < 0 || j >= N || (Math.abs((j % W) - x) > 1)) continue; if (cand[j] && !seen[j]) { seen[j] = 1; stack.push(j) } } }
  if (comp.length >= Number(MIN)) { comps++; for (const i of comp) { kill[i] = 1; removed++ } }
}
// Borde suave de 2 px con descontaminación del color de fondo.
const ring = new Uint8Array(N)
for (let i = 0; i < N; i++) if (kill[i]) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = i + dy * W + dx; if (j >= 0 && j < N && !kill[j]) ring[j] = 1 }
for (let i = 0; i < N; i++) {
  if (kill[i]) { out[i * 4 + 3] = 0; continue }
  if (!ring[i] || out[i * 4 + 3] === 0) continue
  const a = Math.min(1, Math.max(0, (dist(i) - Number(T) * 0.5) / (Number(T) * 1.5)))
  if (a < 1) {
    out[i * 4 + 3] = Math.min(out[i * 4 + 3], Math.round(a * 255))
    if (a > 0.05) for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.max(0, Math.min(255, Math.round((src[i * 3 + c] - (1 - a) * bg[c]) / a)))
  }
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(transPath)
console.log(JSON.stringify({ file: transPath.split('/').pop(), bg, comps, removed }))
