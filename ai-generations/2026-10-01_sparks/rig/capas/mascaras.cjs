// Máscaras de las capas del rig 2.5D v2, por geometría, sobre el Spark base de frente sin cara (1600 px).
// El anillo sale de SAM (capas/mask-anillo.png); el resto se deduce del círculo del cuerpo.
const sharp = require('sharp')
const path = require('path')
const D = __dirname
;(async () => {
  const { data, info } = await sharp(path.join(D, '../spark-engine-sin-cara.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  // El anillo de SAM se ensancha 3 px para que sus bordes suavizados no queden como hilos sobre el cuerpo.
  const ringSam = await sharp(path.join(D, 'mask-anillo.png')).greyscale().blur(2).threshold(20).raw().toBuffer()
  const A = (x, y) => data[(y * W + x) * 4 + 3]
  // Cuerpo: elipse medida sobre la silueta (tope 306, base ≈1125, bordes de la fila 450: 476 y 1111).
  const cx = 794, cy = 716, RX = 417, RY = 410, R = RX
  const inC = (x, y, k = 1) => ((x - cx) / (RX * k)) ** 2 + ((y - cy) / (RY * k)) ** 2 < 1
  // Línea que separa la mitad trasera del anillo (arriba) de la delantera, entre sus extremos izquierdo y derecho.
  const lineY = (x) => 650 + (625 - 650) * (x - 230) / (1435 - 230)
  const sphere = (x, y) => (x - 1320) ** 2 + (y - 530) ** 2 < 95 ** 2
  const masks = { cuerpo: [], 'anillo-atras': [], 'anillo-adelante': [], antena: [], 'brazo-izq': [], 'brazo-der': [], 'mano-izq': [], 'mano-der': [], relleno: [] }
  for (const k in masks) masks[k] = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    const ring = ringSam[i] > 127
    if (ring) {
      // Las dos mitades se SOLAPAN 5 px a cada lado del corte: al reducir a 1000 px, cada mitad deja un borde
      // semitransparente en el corte y, apiladas, marcan una línea fina sobre el tubo. Con el solape no hay costura.
      const front = sphere(x, y) || y > lineY(x)
      // Lo mismo en el borde de la esfera: la delantera la toma con 8 px de más y la trasera la suelta 8 px antes.
      const inSphere = (r) => (x - 1320) ** 2 + (y - 530) ** 2 < r ** 2
      if (inSphere(103) || y > lineY(x) - 5) masks['anillo-adelante'][i] = 255
      if (!inSphere(87) && y < lineY(x) + 5) masks['anillo-atras'][i] = 255
      if (front && inC(x, y, 0.995)) masks.relleno[i] = 255
      continue
    }
    if (A(x, y) < 8) continue
    if (y < 292) { masks.antena[i] = 255; continue }
    if (y > 780 && !inC(x, y, 1.01) && Math.abs(x - cx) > R * 0.55) {
      const left = x < cx
      // La muñeca es la banda navy antes del puño (x≈316 izquierda, ≈1280 derecha): el puño viaja con la mano y la
      // banda oscura esconde cualquier escalón entre el brazo original y una pose generada.
      const hand = left ? x < 316 : x > 1280
      masks[(hand ? 'mano-' : 'brazo-') + (left ? 'izq' : 'der')][i] = 255
      continue
    }
    // El cuerpo se recorta a su silueta (más el brillo de la base): fuera, sólo quedaban restos del anillo.
    if (!inC(x, y, 1.03) && !(y > 1060 && Math.abs(x - cx) < 230)) continue
    masks.cuerpo[i] = 255
  }
  for (const [k, m] of Object.entries(masks)) await sharp(Buffer.from(m), { raw: { width: W, height: H, channels: 1 } }).png().toFile(path.join(D, `m-${k}.png`))
  const geo = { size: W, body: { cx, cy, rx: RX, ry: RY } }
  require('fs').writeFileSync(path.join(D, 'geometria.json'), JSON.stringify(geo, null, 2))
  console.log(geo)
})()
