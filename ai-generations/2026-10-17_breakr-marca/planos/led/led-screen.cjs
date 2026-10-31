// Compone un arte exacto en una pantalla LED de un plate, con física de pantalla.
// uso: node led-screen.cjs <cfg.json>
// cfg: { plate, content, out, quad:[[x,y]tl,tr,br,bl], occlusionRef?, modules:[cols,rows], exposure, falloff:[l,r], bloom, grain, seed }
const sharp = require(require.resolve('sharp', { paths: ['/Users/jreye/Documents/greenhouse-eo'] }))
const fs = require('fs')
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
let seed = cfg.seed || 7
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const gauss = () => { let u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

// homografía: cuadrado unitario -> quad
function homography(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1]
}
function invert(m) {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g
  const det = a * A + b * B + c * C
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map(v => v / det)
}

;(async () => {
  const P = await sharp(cfg.plate).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = P.info.width, H = P.info.height, plate = P.data
  const K = await sharp(cfg.content).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const KW = K.info.width, KH = K.info.height, kv = K.data
  const ref = cfg.occlusionRef ? (await sharp(cfg.occlusionRef).removeAlpha().resize(W, H).raw().toBuffer()) : null
  const Hm = homography(cfg.quad), Hi = invert(Hm)
  const [mc, mr] = cfg.modules || [14, 26]
  const modGain = [], modTint = []
  for (let k = 0; k < mc * mr; k++) { modGain.push(1 + gauss() * 0.022); modTint.push([gauss() * 0.012, gauss() * 0.008, gauss() * 0.015]) }
  const exp = cfg.exposure || 1.12, [fl, fr] = cfg.falloff || [1, 0.9]
  const screen = new Float32Array(W * H * 3), mask = new Float32Array(W * H)
  const SS = 3 // supermuestreo
  const xs = cfg.quad.map(p => p[0]), ys = cfg.quad.map(p => p[1])
  for (let y = Math.floor(Math.min(...ys)) - 2; y < Math.ceil(Math.max(...ys)) + 2; y++) {
    for (let x = Math.floor(Math.min(...xs)) - 2; x < Math.ceil(Math.max(...xs)) + 2; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      let r = 0, g = 0, b = 0, cov = 0
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + .5) / SS, py = y + (sy + .5) / SS
        const w = Hi[6] * px + Hi[7] * py + Hi[8]
        const u = (Hi[0] * px + Hi[1] * py + Hi[2]) / w, v = (Hi[3] * px + Hi[4] * py + Hi[5]) / w
        if (u < 0 || v < 0 || u >= 1 || v >= 1) continue
        // muestreo bilineal del arte
        const fx = u * (KW - 1), fy = v * (KH - 1), ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy
        const s = (xx, yy, c) => kv[(Math.min(yy, KH - 1) * KW + Math.min(xx, KW - 1)) * 3 + c]
        const col = [0, 1, 2].map(c => (s(ix, iy, c) * (1 - tx) + s(ix + 1, iy, c) * tx) * (1 - ty) + (s(ix, iy + 1, c) * (1 - tx) + s(ix + 1, iy + 1, c) * tx) * ty)
        // módulo y costura
        const mi = Math.min(mc - 1, Math.floor(u * mc)), mj = Math.min(mr - 1, Math.floor(v * mr)), k = mj * mc + mi
        const du = Math.min(u * mc - mi, mi + 1 - u * mc), dv = Math.min(v * mr - mj, mj + 1 - v * mr)
        const seam = (du < 0.012 || dv < 0.012) ? 0.82 : 1
        const fall = fl + (fr - fl) * u
        for (let c = 0; c < 3; c++) {
          let lin = Math.pow(col[c] / 255, 2.2) * exp * modGain[k] * fall * seam * (1 + modTint[k][c])
          const out = Math.pow(Math.min(lin, 1.6), 1 / 2.2) * 255
          if (c === 0) r += out; else if (c === 1) g += out; else b += out
        }
        cov++
      }
      if (!cov) continue
      const i = y * W + x
      const n = SS * SS
      screen[i * 3] = r / cov; screen[i * 3 + 1] = g / cov; screen[i * 3 + 2] = b / cov
      let m = cov / n
      const ob = cfg.occlusionBox; const inBox = !ob || (x >= ob[0] && y >= ob[1] && x <= ob[2] && y <= ob[3])
      if (ref && inBox) { // oclusión: lo que no cambió entre versiones y no es naranja de pantalla queda delante
        const d = Math.max(...[0, 1, 2].map(c => Math.abs(plate[i * 3 + c] - ref[i * 3 + c])))
        const pr = plate[i * 3], pg = plate[i * 3 + 1], pb = plate[i * 3 + 2]
        const orange = pr > 170 && pg < 150 && pb < 90
        const lum = 0.3 * pr + 0.59 * pg + 0.11 * pb
        if (d < (cfg.occlusionTol || 22) && !orange && lum < (cfg.occlusionMaxLum || 140)) m = 0
      }
      mask[i] = m
    }
  }
  // suavizar máscara (oclusión) 1 px
  const mbuf = Buffer.from(Array.from(mask, v => Math.round(v * 255)))
  const msoft = await sharp(mbuf, { raw: { width: W, height: H, channels: 1 } }).blur(cfg.maskBlur || 0.6).extractChannel(0).raw().toBuffer({ resolveWithObject: true }).then(r => { if (r.info.channels !== 1) throw new Error('mask channels ' + r.info.channels); return r.data })
  // desenfoque óptico de la pantalla
  const sbuf = Buffer.from(Array.from(screen, v => Math.max(0, Math.min(255, Math.round(v)))))
  const sblur = await sharp(sbuf, { raw: { width: W, height: H, channels: 3 } }).blur(cfg.lensBlur || 0.7).raw().toBuffer({ resolveWithObject: true }).then(r => { if (r.info.channels !== 3) throw new Error('ch'); return r.data })
  const outF = new Float32Array(W * H * 3)
  for (let i = 0; i < W * H; i++) {
    const m = msoft[i] / 255
    for (let c = 0; c < 3; c++) outF[i * 3 + c] = plate[i * 3 + c] * (1 - m) + sblur[i * 3 + c] * m
  }
  // bloom: lo brillante de la pantalla se derrama
  const bright = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H; i++) {
    const m = msoft[i] / 255
    for (let c = 0; c < 3; c++) { const v = sblur[i * 3 + c] * m; bright[i * 3 + c] = Math.max(0, Math.min(255, (v - (cfg.bloomThreshold || 150)) * 2.2)) }
  }
  const b1 = await sharp(bright, { raw: { width: W, height: H, channels: 3 } }).blur(cfg.bloomSmall || 4).raw().toBuffer()
  const b2 = await sharp(bright, { raw: { width: W, height: H, channels: 3 } }).blur(cfg.bloomLarge || 22).raw().toBuffer()
  const bl = cfg.bloom ?? 0.35
  const out = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H * 3; i++) {
    let v = outF[i]
    v = 255 - (255 - v) * (1 - bl * 0.6 * b1[i] / 255) * (1 - bl * b2[i] / 255) // screen
    v += gauss() * (cfg.grain ?? 2.2) * (msoft[Math.floor(i / 3)] / 255)
    out[i] = Math.max(0, Math.min(255, Math.round(v)))
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(cfg.out)
  // máscara para revisar
  if (cfg.maskOut) await sharp(msoft, { raw: { width: W, height: H, channels: 1 } }).png().toFile(cfg.maskOut)
  console.log('ok', cfg.out)
})()
