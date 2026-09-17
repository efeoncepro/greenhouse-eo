// Boceto-guía de perspectiva: extruye la silueta oficial del isotipo y la proyecta con una cámara real.
import sharp from 'sharp'
const [,, name, yawDeg, pitchDeg, dist, rollDeg = '0'] = process.argv
const W = 480
const { data, info } = await sharp('ref/isotipo-efeonce-oficial.svg', { density: 300 }).resize(W).flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true })
const H = info.height, m = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[y * W + x] < 128
const D = Math.round(W * 0.07), s = 1 / W
const yaw = yawDeg * Math.PI / 180, pitch = pitchDeg * Math.PI / 180, roll = rollDeg * Math.PI / 180
const N = 1600, f = N * 0.9 * Number(dist) / 2.2, zb = new Float32Array(N * N).fill(1e9), img = Buffer.alloc(N * N * 3, 245)
const L = norm([-0.5, -0.7, -0.6])
function norm(v) { const l = Math.hypot(...v); return v.map(c => c / l) }
function rot([x, y, z]) {
  let c = Math.cos(yaw), si = Math.sin(yaw); [x, z] = [c * x + si * z, -si * x + c * z]
  c = Math.cos(pitch); si = Math.sin(pitch); [y, z] = [c * y - si * z, si * y + c * z]
  c = Math.cos(roll); si = Math.sin(roll); [x, y] = [c * x - si * y, si * x + c * y]
  return [x, y, z]
}
const pts = []
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!m(x, y)) continue
  const edge = !m(x + 1, y) || !m(x - 1, y) || !m(x, y + 1) || !m(x, y - 1)
  pts.push([x, y, 0, [0, 0, -1], 0], [x, y, D, [0, 0, 1], 1])
  if (edge) { const n = norm([(m(x - 1, y) ? 1 : 0) - (m(x + 1, y) ? 1 : 0), (m(x, y - 1) ? 1 : 0) - (m(x, y + 1) ? 1 : 0), 0.001]); for (let z = 1; z < D; z++) pts.push([x, y, z, n, 2]) }
}
const proj = []
for (const [x, y, z, n, face] of pts) {
  const p = rot([(x - W / 2) * s, (y - H / 2) * s, (z - D / 2) * s]), nn = rot(n)
  const zc = p[2] + Number(dist)
  proj.push([p[0] * f / zc, p[1] * f / zc, zc, Math.max(0.15, -(nn[0] * L[0] + nn[1] * L[1] + nn[2] * L[2])), face])
}
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
for (const [u, v] of proj) { minX = Math.min(minX, u); maxX = Math.max(maxX, u); minY = Math.min(minY, v); maxY = Math.max(maxY, v) }
const k = N * 0.72 / Math.max(maxX - minX, maxY - minY), cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
const PAL = [[120, 170, 230], [60, 90, 140], [10, 35, 80]]
for (const [u, v, zc, sh, face] of proj) {
  const px = Math.round((u - cx) * k + N / 2), py = Math.round((v - cy) * k + N / 2)
  for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
    const X = px + dx - 1, Y = py + dy - 1; if (X < 0 || Y < 0 || X >= N || Y >= N) continue
    const i = Y * N + X; if (zc >= zb[i]) continue; zb[i] = zc
    const c = PAL[face], t = face === 2 ? 0.6 + 0.4 * sh : 1; img[i * 3] = c[0] * t; img[i * 3 + 1] = c[1] * t; img[i * 3 + 2] = c[2] * t
  }
}
await sharp(img, { raw: { width: N, height: N, channels: 3 } }).median(3).png().toFile(`guias/guia-${name}.png`)
console.log('ok', name)
