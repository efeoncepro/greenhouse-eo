// Recolorea a rojo fonda los banderines celestes del plano medio del plate v3, conservando textura, pliegues y luz.
// Determinístico. Semillas medidas por perfil de columnas (y=170–230): celestes con B−R 84–120; blancos con B−R < 25.
import sharp from 'sharp'

const D = 'ai-generations/2026-09-17_previa-18/v3'
const W = 1600, H = 2000
const SEEDS = [{ x: 245, y: 175, minX: 200, minY: 122 }, { x: 381, y: 190 }, { x: 625, y: 190 }, { x: 988, y: 185 }]
const { data } = await sharp(`${D}/plate-3d-v03.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const out = Buffer.from(data)

const px = p => [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]]
const lumOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b
// Tela celeste: luminosidad media-alta y azul moderado (el fondo es más oscuro o más saturado; el blanco casi neutro).
const isPaleFabric = p => { const [r, g, b] = px(p); const l = lumOf(r, g, b); return l > 88 && b - r > 38 && b - r < 150 && r > 40 }

const mask = new Float32Array(W * H)
const report = []

for (const seed of SEEDS) {
  const start = seed.y * W + seed.x
  if (!isPaleFabric(start)) throw new Error(`Semilla fuera de tela celeste en ${seed.x},${seed.y}`)
  const seen = new Uint8Array(W * H)
  const stack = [start]
  let area = 0, minX = W, maxX = 0, minY = H, maxY = 0
  seen[start] = 1
  while (stack.length) {
    const q = stack.pop()
    const qx = q % W, qy = (q - qx) / W
    mask[q] = 1
    area++
    minX = Math.min(minX, qx); maxX = Math.max(maxX, qx); minY = Math.min(minY, qy); maxY = Math.max(maxY, qy)
    for (const [nx, ny] of [[qx + 1, qy], [qx - 1, qy], [qx, qy + 1], [qx, qy - 1]]) {
      if (Math.abs(nx - seed.x) > 75 || ny < 90 || ny > 310 || nx < (seed.minX ?? 0) || ny < (seed.minY ?? 0)) continue
      const n = ny * W + nx
      if (!seen[n] && isPaleFabric(n)) { seen[n] = 1; stack.push(n) }
    }
  }
  report.push({ seed, area, box: [minX, minY, maxX, maxY] })
  seed.region = seen
}

// Apertura morfológica (erosión 3 px → dilatación 3 px): elimina lo más fino que la tela, como el cordel.
const morph = (src, erode) => {
  const dst = new Float32Array(W * H)
  for (let y = 88; y < 312; y++) for (let x = 100; x < 1100; x++) {
    let v = erode ? 1 : 0
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const m = src[(y + dy) * W + x + dx]
      if (erode ? m === 0 : m === 1) { v = erode ? 0 : 1; dy = 4; break }
    }
    dst[y * W + x] = v
  }
  return dst
}
const opened = morph(morph(mask, true), false)
// La apertura recorta también la punta fina del banderín: bajo el cordel (y > semilla − 20) se conserva la tela original.
const keepBelow = new Uint8Array(W * H)
for (const seed of SEEDS) for (let y = seed.y - 20; y < 312; y++) for (let x = seed.x - 75; x <= seed.x + 75; x++) if (seed.region[y * W + x]) keepBelow[y * W + x] = 1
for (let i = 0; i < mask.length; i++) mask[i] = mask[i] && (opened[i] || keepBelow[i]) ? 1 : 0

// Antialias: dilatar 1 px y suavizar con caja 3×3.
const soft = new Float32Array(W * H)
for (let y = 88; y < 312; y++) for (let x = 100; x < 1100; x++) {
  let sum = 0
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += mask[(y + dy) * W + x + dx]
  soft[y * W + x] = Math.min(1, sum / 5)
}

// Rojo fonda sobrio; la luminosidad sale del píxel original (conserva pliegues, trama y luz).
const RED = { h: 354 / 360, s: 0.68 }
const hsl2rgb = (h, s, l) => {
  const f = n => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)) }
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

for (let y = 88; y < 312; y++) for (let x = 100; x < 1100; x++) {
  const p = y * W + x
  const a = soft[p]
  if (!a) continue
  const [r, g, b] = px(p)
  const l = Math.min(0.62, (lumOf(r, g, b) / 255) * 0.66)
  const [nr, ng, nb] = hsl2rgb(RED.h, RED.s, l)
  // 8 % del ambiente azul original para que el rojo viva en la misma luz de la escena.
  const mix = (c, o) => Math.round((c * 0.92 + o * 0.08) * a + o * (1 - a))
  out[p * 3] = mix(nr, r); out[p * 3 + 1] = mix(ng, g); out[p * 3 + 2] = mix(nb, b)
}

await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${D}/plate-3d-v03-red.png`)
await sharp(`${D}/plate-3d-v03-red.png`).extract({ left: 170, top: 95, width: 1150, height: 205 }).png().toFile(`${D}/bunting-zone-after.png`)
const t1 = await sharp(`${D}/bunting-zone-before.png`).png().toBuffer()
const t2 = await sharp(`${D}/bunting-zone-after.png`).png().toBuffer()
await sharp({ create: { width: 1150, height: 430, channels: 3, background: '#fff' } }).composite([{ input: t1, left: 0, top: 0 }, { input: t2, left: 0, top: 220 }]).png().toFile(`${D}/bunting-before-after.png`)
console.log(JSON.stringify(report))
