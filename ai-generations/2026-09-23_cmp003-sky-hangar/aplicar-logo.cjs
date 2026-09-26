// Aplica el logotipo OFICIAL de SKY sobre el fuselaje de un plate limpio (sin logo).
// Paso determinístico previo a la "terminación" del modelo: el modelo NO dibuja letras.
// Uso: node aplicar-logo.cjs <plate-limpio.png> <out.png> <quad.json>
//   quad.json: { "tl":[x,y], "tr":[x,y], "br":[x,y], "bl":[x,y], "window": {"x0":..,"y0":..,"x1":..,"y1":..,"lumMax":95} }
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const [, , platePath, outPath, quadPath] = process.argv
const q = JSON.parse(fs.readFileSync(quadPath, 'utf8'))
const LOGO = path.join(__dirname, 'refs/logo-SKY_3.png')

// Homografía unit-square -> quad (para invertir: pixel destino -> uv del logo)
function squareToQuad([x0, y0], [x1, y1], [x2, y2], [x3, y3]) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  const det = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / det
  const h = (dx1 * dy3 - dx3 * dy1) / det
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1]
}
function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g
  const det = a * A + b * B + c * C
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det]
}

;(async () => {
  // logo recortado a su bbox de tinta
  const logoTrim = await sharp(LOGO).trim().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const L = logoTrim.data, LW = logoTrim.info.width, LH = logoTrim.info.height
  const plate = await sharp(platePath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const P = plate.data, W = plate.info.width, H = plate.info.height
  const out = Buffer.from(P)

  const Hm = squareToQuad(q.tl, q.tr, q.br, q.bl)
  const Inv = invert3(Hm)
  const xs = [q.tl[0], q.tr[0], q.br[0], q.bl[0]], ys = [q.tl[1], q.tr[1], q.br[1], q.bl[1]]
  const bx0 = Math.floor(Math.min(...xs)) - 2, bx1 = Math.ceil(Math.max(...xs)) + 2
  const by0 = Math.floor(Math.min(...ys)) - 2, by1 = Math.ceil(Math.max(...ys)) + 2

  // luminancia de referencia del blanco del fuselaje en la zona (percentil 85)
  const lums = []
  for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
    const i = (y * W + x) * 3; lums.push(0.2126 * P[i] + 0.7152 * P[i + 1] + 0.0722 * P[i + 2])
  }
  lums.sort((a, b) => a - b)
  const Lref = lums[Math.floor(lums.length * 0.85)]
  const w = q.window

  const sample = (u, v) => { // bilinear sobre el logo, u,v en [0,1]
    const fx = u * (LW - 1), fy = v * (LH - 1)
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(x0 + 1, LW - 1), y1 = Math.min(y0 + 1, LH - 1)
    const ax = fx - x0, ay = fy - y0, r = [0, 0, 0, 0]
    for (const [xx, yy, wt] of [[x0, y0, (1 - ax) * (1 - ay)], [x1, y0, ax * (1 - ay)], [x0, y1, (1 - ax) * ay], [x1, y1, ax * ay]]) {
      const j = (yy * LW + xx) * 4; for (let k = 0; k < 4; k++) r[k] += L[j + k] * wt
    }
    return r
  }

  let painted = 0
  for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
    const X = x + 0.5, Y = y + 0.5
    const den = Inv[6] * X + Inv[7] * Y + Inv[8]
    const u = (Inv[0] * X + Inv[1] * Y + Inv[2]) / den, v = (Inv[3] * X + Inv[4] * Y + Inv[5]) / den
    if (u < 0 || u > 1 || v < 0 || v > 1) continue
    const [r, g, b, a] = sample(u, v)
    const alpha = a / 255
    if (alpha <= 0.01) continue
    const i = (y * W + x) * 3
    const lum = 0.2126 * P[i] + 0.7152 * P[i + 1] + 0.0722 * P[i + 2]
    // ventana: se deja ver el plate (las ventanas atraviesan la pintura, como en el avión real)
    if (w && x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1 && lum < w.lumMax) continue
    const shade = Math.min(1.08, lum / Lref) // la pintura recibe la misma luz que el blanco que reemplaza
    for (let k = 0; k < 3; k++) {
      const paint = [r, g, b][k] * shade
      out[i + k] = Math.round(P[i + k] * (1 - alpha) + paint * alpha)
    }
    painted++
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(outPath)
  console.log(JSON.stringify({ painted, Lref: Math.round(Lref), logo: [LW, LH] }))
})()
