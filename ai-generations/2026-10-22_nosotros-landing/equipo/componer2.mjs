import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
const W = 2560, H = 1440, S = 860, SHIFT = 230
const order = [['daniela', 500], ['andres', 890], ['valentina', 1670], ['melkin', 2060], ['humberly', 1280]]
// fondo: la formación baja SHIFT px para que su línea de cabezas calce con la de ojos del equipo; arriba es bruma pareja
const ext = await sharp('plates/EQ3b/EQ3b-equipo-formacion.png').extend({ top: SHIFT, extendWith: 'mirror' }).png().toBuffer()
const plate = await sharp(ext).extract({ left: 0, top: 0, width: W, height: H }).png().toBuffer()
const bgBlur = await sharp(plate).removeAlpha().blur(14).raw().toBuffer()
const layers = []
for (const [n, cx] of order) {
  const left = Math.round(cx - S / 2), top = H - S + 10
  const cut = await sharp(`equipo/${n}-cut.png`).resize(S, S).ensureAlpha().raw().toBuffer()
  const a = new Uint8Array(S * S); for (let i = 0; i < S * S; i++) a[i] = cut[i * 4 + 3]
  const aImg = sharp(Buffer.from(a), { raw: { width: S, height: S, channels: 1 } })
  const soft = await aImg.clone().blur(4).extractChannel(0).raw().toBuffer()
  // sombra suave detrás: separa sin halo claro
  const shA = await aImg.clone().blur(36).linear(0.45, 0).extractChannel(0).raw().toBuffer()
  const sh = Buffer.alloc(S * S * 4); for (let i = 0; i < S * S; i++) { sh[i * 4 + 3] = shA[i] }
  layers.push({ input: await sharp(sh, { raw: { width: S, height: S, channels: 4 } }).png().toBuffer(), left, top: top + 18 })
  // sujeto: grade frío leve + traspaso de luz del fondo en el borde interior
  const out = Buffer.alloc(S * S * 4)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, gx = left + x, gy = top + y
    let r = cut[i * 4], g = cut[i * 4 + 1], b = cut[i * 4 + 2]
    let R = (0.93 * r + 0.02 * g + 0.02 * b) * 0.9, G = (0.02 * r + 0.94 * g + 0.03 * b) * 0.9, B = (0.03 * r + 0.05 * g + 1.0 * b) * 0.9
    const edge = Math.max(0, a[i] - soft[i]) / 255 + Math.max(0, 1 - soft[i] / 255) * (a[i] / 255) // borde interior
    const w = Math.min(1, edge * 1.3) * 0.35
    if (gx >= 0 && gx < W && gy >= 0 && gy < H && w > 0) {
      const j = (gy * W + gx) * 3
      // screen con el fondo desenfocado: la luz de atrás "muerde" el contorno
      R = R + (255 - R) * (bgBlur[j] / 255) * w; G = G + (255 - G) * (bgBlur[j + 1] / 255) * w; B = B + (255 - B) * (bgBlur[j + 2] / 255) * w
    }
    out[i * 4] = Math.min(255, R); out[i * 4 + 1] = Math.min(255, G); out[i * 4 + 2] = Math.min(255, B); out[i * 4 + 3] = a[i]
  }
  layers.push({ input: await sharp(out, { raw: { width: S, height: S, channels: 4 } }).png().toBuffer(), left, top })
}
await sharp(plate).composite(layers).png().toFile('equipo/EQ3-equipo-compuesto.png')
console.log('ok')
