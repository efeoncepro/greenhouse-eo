// Sobre la ampliación del modelo (cuarto sin costuras), repone el lightbox EXACTO desde la ampliación fiel (mismo
// encuadre: escena al 80 %, anclada a la derecha), sin tapar a la persona (máscara rmbg escalada).
const sharp = require('sharp')
const [,, MODEL, FIEL, PERSON, OUT] = process.argv
const K = Number(process.env.K ?? 0.8), OX = Number(process.env.OX ?? 512), OY = Number(process.env.OY ?? 288), PAD = 16, FEATHER = 8, PERSON_X0 = Number(process.env.PERSON_X0 ?? 1700)
const Q = (process.env.QUAD ? JSON.parse(process.env.QUAD) : [[813,43],[2361,7],[2361,851],[810,806]]).map(([x,y]) => [x*K+OX, y*K+OY])
const HANDBOX = process.env.HANDBOX ? process.env.HANDBOX.split(',').map(Number) : null
const inside = (x, y) => { // dentro del cuadrilátero expandido PAD (aprox. por bordes casi rectos)
  const t = Q[0][1] + (Q[1][1]-Q[0][1]) * (x-Q[0][0])/(Q[1][0]-Q[0][0]) - PAD
  const b = Q[3][1] + (Q[2][1]-Q[3][1]) * (x-Q[3][0])/(Q[2][0]-Q[3][0]) + PAD
  const l = Q[0][0] - PAD, r = Q[1][0] + PAD
  return Math.min(y - t, b - y, x - l, r - x)
}
;(async () => {
  const m = await sharp(MODEL).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const f = await sharp(FIEL).removeAlpha().raw().toBuffer()
  const W = m.info.width, H = m.info.height
  const pw = Math.round(2560 * K), ph = Math.round(1440 * K)
  const perSmall = await sharp(PERSON).ensureAlpha().extractChannel(3).resize(pw, ph).raw().toBuffer()
  const out = Buffer.from(m.data)
  let hand = null
  if (process.env.HANDMASK) { const r = await sharp(process.env.HANDMASK).ensureAlpha().extractChannel(3).resize(Math.round(500 * K), Math.round(200 * K)).raw().toBuffer({ resolveWithObject: true }); hand = { a: r.data, w: r.info.width, h: r.info.height } }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = inside(x, y); if (d <= 0) continue
    let a = Math.min(1, d / FEATHER)
    const px = x - OX, py = y - OY
    if (px >= PERSON_X0 * K && px < pw && py >= 0 && py < ph) a *= 1 - perSmall[py * pw + px] / 255
    if (hand) { const hx = px - HANDBOX[0] * K, hy = py - HANDBOX[1] * K; if (hx >= 0 && hy >= 0 && hx < hand.w && hy < hand.h) a *= 1 - hand.a[(hy | 0) * hand.w + (hx | 0)] / 255 }
    if (a <= 0) continue
    const o = (y * W + x) * 3
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(m.data[o + c] * (1 - a) + f[o + c] * a)
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(OUT); console.log('ok')
})()
