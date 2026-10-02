// Recorta el cuerpo a su silueta real en la zona regenerada. Mide el radio del borde original en cada dirección desde
// el centro del cuerpo (donde el borde no tocó la zona), interpola los tramos que la zona tapó y quita todo lo que en
// la zona quede fuera de ese contorno (las manchas grises semitransparentes que dejó el relleno junto al borde).
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const D = __dirname, W = 1600, CX = 794, CY = 716, N = 1440
;(async () => {
  const cut = await sharp(path.join(D, '../spark-engine-sin-cara.png')).ensureAlpha().raw().toBuffer()
  const body = await sharp(path.join(D, 'm-cuerpo.png')).extractChannel(0).raw().toBuffer()
  const zone = await sharp(path.join(D, 'm-zona-cuerpo-2.png')).extractChannel(0).raw().toBuffer()
  const file = path.join(D, 'engine/cuerpo.png')
  const L = await sharp(file).ensureAlpha().raw().toBuffer()
  // Lo que tapaba el borde: anillo y brazos (ensanchados 14 px). Un borde medido junto a ellos no vale.
  const occ = Buffer.alloc(W * W)
  for (const f of ['mask-anillo.png', 'm-brazo-izq.png', 'm-brazo-der.png']) { const m = await sharp(path.join(D, f)).extractChannel(0).raw().toBuffer(); for (let i = 0; i < W * W; i++) if (m[i] > 127) occ[i] = 255 }
  const occD = await sharp(occ, { raw: { width: W, height: W, channels: 1 } }).blur(7).threshold(8).extractChannel(0).raw().toBuffer()
  const R = new Float64Array(N).fill(NaN)
  for (let k = 0; k < N; k++) {
    const t = (k / N) * 2 * Math.PI, dx = Math.cos(t), dy = Math.sin(t)
    let last = -1, lastIdx = -1
    for (let r = 200; r < 620; r += 0.5) {
      const x = Math.round(CX + dx * r), y = Math.round(CY + dy * r); if (x < 0 || y < 0 || x >= W || y >= W) break
      const i = y * W + x
      if (L[i * 4 + 3] > 200) { last = r; lastIdx = i }
    }
    // borde válido: existe y no cae en la zona regenerada ni a menos de 6 px de ella
    if (last > 0) {
      let near = false
      for (let s = -10; s <= 10 && !near; s++) { const x = Math.round(CX + dx * (last + s)), y = Math.round(CY + dy * (last + s)); if (zone[y * W + x] > 127 || occD[y * W + x] > 127) near = true }
      if (!near) R[k] = last
    }
  }
  // interpolación circular de los tramos sin borde válido
  const valid = [...R.keys()].filter((k) => !Number.isNaN(R[k]))
  const measured = Uint8Array.from(R, (v) => (Number.isNaN(v) ? 0 : 1))
  for (let k = 0; k < N; k++) if (Number.isNaN(R[k])) {
    let a = valid.filter((v) => v < k).pop() ?? valid[valid.length - 1] - N, b = valid.find((v) => v > k) ?? valid[0] + N
    const ra = R[(a + N) % N], rb = R[b % N], t = (k - a) / (b - a)
    R[k] = ra + (rb - ra) * t
  }
  // suavizado leve
  const S = Float64Array.from(R, (_, k) => { let s = 0; for (let j = -3; j <= 3; j++) s += R[(k + j + N) % N]; return s / 7 })
  // Recorte en TODO el contorno (salvo el brillo de la base, abajo): fuera del radio medido, nada; dentro, en la zona
  // regenerada, opaco (sin la costura semitransparente donde el relleno se junta con el original).
  let removed = 0
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!L[i * 4 + 3]) continue
    const r = Math.hypot(x - CX, y - CY); let a = Math.atan2(y - CY, x - CX); if (a < 0) a += 2 * Math.PI
    if (a > Math.PI * 0.32 && a < Math.PI * 0.68) continue
    const kk = Math.round((a / (2 * Math.PI)) * N) % N
    // donde el borde se interpoló (lo tapaban anillo o brazos) se recorta 2 px más adentro: ahí quedaban restos.
    const lim = S[kk] - (measured[kk] ? 0 : 2)
    if (r > lim + 1) { L[i * 4 + 3] = 0; removed++ }
    else if (r > lim - 1) { const k = (lim + 1 - r) / 2; L[i * 4 + 3] = Math.round(Math.max(L[i * 4 + 3] * k, zone[i] > 127 ? 255 * k : 0)) }
  }
  // Huecos de alfa dentro de la silueta (la costura entre el relleno y el original): opacos, con el color del cuerpo
  // completo (original fuera de la zona, relleno dentro).
  const src = await sharp(path.join(D, '../fuente/spark-engine-sin-cara.png')).removeAlpha().raw().toBuffer()
  const gen = await sharp(path.join(D, 'cuerpo-completo-b-1.png')).removeAlpha().raw().toBuffer()
  const gray = [0, 1, 2].map((k) => { let t = 0; for (let y = 1350; y < 1450; y++) for (let x = 1400; x < 1500; x++) t += gen[(y * W + x) * 3 + k]; return t / 10000 })
  let filled = 0
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (L[i * 4 + 3] >= 250) continue
    const r = Math.hypot(x - CX, y - CY); let a = Math.atan2(y - CY, x - CX); if (a < 0) a += 2 * Math.PI
    if (a > Math.PI * 0.32 && a < Math.PI * 0.68) continue
    const kk = Math.round((a / (2 * Math.PI)) * N) % N
    // Sólo si el cuerpo completo tiene CUERPO ahí (no gris de fondo): el borde real puede quedar más adentro que el
    // radio interpolado, y forzar ese gris a opaco dejaba un escalón. El color sale siempre del cuerpo completo: el de
    // la capa, en un píxel casi transparente, es ruido (puntos rojos al volverlo opaco).
    if (r < S[kk] - 2) {
      const c = zone[i] > 127 ? gen : src
      const dg = Math.max(...[0, 1, 2].map((k) => Math.abs(c[i * 3 + k] - gray[k])))
      if (dg > 28) { for (let k = 0; k < 3; k++) L[i * 4 + k] = c[i * 3 + k]; L[i * 4 + 3] = 255; filled++ }
    }
  }
  console.log('huecos internos cerrados', filled)
  await sharp(L, { raw: { width: W, height: W, channels: 4 } }).png().toFile(file + '.tmp.png')
  fs.renameSync(file + '.tmp.png', file)
  console.log('silueta: direcciones válidas', valid.length, 'de', N, '· px recortados', removed)
})()
