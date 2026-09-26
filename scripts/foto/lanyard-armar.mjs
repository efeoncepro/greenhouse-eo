// Lanyard Efeonce armado DETERMINÍSTICAMENTE, pieza por pieza, para usarlo como referencia.
//
// Existe porque el modelo tergiversa el logotipo: en cuatro pasadas del 2026-09-21 la nave de la «o»
// salió distinta cada vez. Acá ninguna marca se genera — la cinta, el yoyo y el carnet salen de los
// artes oficiales compuestos, y al modelo sólo se le pide después el acabado material (textura,
// sombra, relieve), nunca el dibujo.
import path from 'node:path'

import sharp from 'sharp'

const KIT = 'ai-generations/2026-09-17_lanyard-efeonce'


/**
 * Arma el lanyard plano, determinístico. `carnet` es lo único que cambia entre personas.
 * Ninguna marca se dibuja: la tela, el yoyo y el carnet salen de los artes oficiales.
 */
export async function armar(CARNET, SALIDA) {
  const W = 1100, H = 1750
  const FONDO = { r: 232, g: 230, b: 227 }          // gris cálido de estudio, como el resto del kit
  const NAVY = { r: 2, g: 60, b: 112 }              // #023c70

  // ── Los dos tramos de la cinta, como cuelga: bajan convergiendo hasta el regulador.
  const ANCHO = 74

  const TRAMOS = [
    { tl: [318, 30], tr: [318 + ANCHO, 30], bl: [470, 880], br: [470 + ANCHO, 880] },
    { tl: [708 - ANCHO, 30], tr: [708, 30], bl: [556, 880], br: [556 + ANCHO, 880] }
  ]

  const punto = (q, u, v) => {
    const L = [q.tl[0] + (q.bl[0] - q.tl[0]) * v, q.tl[1] + (q.bl[1] - q.tl[1]) * v]
    const R = [q.tr[0] + (q.br[0] - q.tr[0]) * v, q.tr[1] + (q.br[1] - q.tr[1]) * v]

    
return [L[0] + (R[0] - L[0]) * u, L[1] + (R[1] - L[1]) * u]
  }

  const lienzo = Buffer.alloc(W * H * 4)

  for (let i = 0; i < W * H; i++) {
    lienzo[i * 4] = FONDO.r; lienzo[i * 4 + 1] = FONDO.g; lienzo[i * 4 + 2] = FONDO.b; lienzo[i * 4 + 3] = 255
  }

  // ── 1. LA TELA SERIGRAFIADA: el patrón oficial proyectado sobre cada tramo.
  const arte = await sharp(path.join(KIT, 'ref/arte-cinta.png')).flatten({ background: NAVY }).raw()
    .toBuffer({ resolveWithObject: true })

  const AW = arte.info.width, AH = arte.info.height, ach = arte.info.channels

  // Una unidad del patrón = logotipo + eslogan. El arte trae 4 pares en sus 8464 px.
  const UNIDAD = AW / 4

  // 🔴 Las repeticiones NO se fijan a mano: se CALCULAN desde la proporción del arte, o el patrón sale
  // deformado. Medido el 2026-09-21: con un valor a ojo (3,4) el logotipo salió alargado a lo largo y
  // achatado a lo ancho — «está pésimo», dijo el operador, y tenía razón. Una unidad mide UNIDAD×AH
  // px en el arte, así que sobre una cinta de ANCHO px debe ocupar ANCHO×(UNIDAD/AH) px de largo.
  const LARGO_UNIDAD = ANCHO * (UNIDAD / AH)

  for (const q of TRAMOS) {
    const largo = Math.hypot(q.bl[0] - q.tl[0], q.bl[1] - q.tl[1])
    const REPES = largo / LARGO_UNIDAD               // sin deformar: la escala la manda el arte

    for (let vi = 0; vi <= largo * 2; vi++) for (let ui = 0; ui <= ANCHO * 2; ui++) {
      const u = ui / (ANCHO * 2), v = vi / (largo * 2)
      const [x, y] = punto(q, u, v)
      const px = Math.round(x), py = Math.round(y)

      if (px < 0 || py < 0 || px >= W || py >= H) continue

      // El patrón corre A LO LARGO: v recorre la cinta, u cruza su ancho. Sin espejo en ningún
      // tramo: en la pieza real los dos lados se leen igual, de arriba hacia abajo.
      // Los dos ejes van invertidos respecto al muestreo ingenuo: el arte se lee de izquierda a
      // derecha y acá corre hacia ABAJO, así que sin esto el patrón sale girado 180° (medido).
      const ax = Math.floor(((1 - ((v * REPES) % 1)) * UNIDAD)) % AW
      const ay = Math.min(AH - 1, Math.floor(u * AH))
      const ai = (ay * AW + ax) * ach

      // Cilindrado: la cinta es tela sobre un cuerpo redondeado, más oscura en los bordes.
      const k = 0.80 + 0.20 * Math.sin(Math.PI * u)

      const i = (py * W + px) * 4

      lienzo[i] = Math.min(255, arte.data[ai] * k)
      lienzo[i + 1] = Math.min(255, arte.data[ai + 1] * k)
      lienzo[i + 2] = Math.min(255, arte.data[ai + 2] * k)
      lienzo[i + 3] = 255
    }
  }

  let base = sharp(lienzo, { raw: { width: W, height: H, channels: 4 } })

  // ── 2. EL REGULADOR y ── 3. EL CLIP: piezas sin marca, en SVG plano. El modelo les dará el metal.
  const herrajes = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="466" y="856" width="172" height="52" rx="9" fill="#1b1b1d"/>
    <rect x="486" y="872" width="132" height="20" rx="5" fill="${'#e8e6e3'}"/>
    <rect x="526" y="1052" width="52" height="20" rx="7" fill="#b9bcc0"/>
    <path d="M537 1070 h30 v38 a15 15 0 0 1 -30 0 z" fill="#c6c9cd"/>
    <rect x="545" y="1102" width="14" height="42" rx="5" fill="#b9bcc0"/>
  </svg>`)

  // ── 4. EL YOYO: carcasa navy + el disco oficial.
  // El tamaño sale de la MEDIDA REAL, no del ojo: el yoyo es de 32 mm y la cinta de 20 mm, así que su
  // diámetro es 1,6 veces el ancho de la cinta. Estaba en 2,5 y el operador lo notó enseguida
  // («el yoyo es un poquito más pequeño en la vida real»).
  const R = Math.round((ANCHO * 32 / 20) / 2), CX = 552, CY = 990
  const yoyoArte = await sharp(path.join(KIT, 'ref/arte-yoyo.png')).resize(R * 2 - 18, R * 2 - 18).png().toBuffer()

  const carcasa = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="#0b2f57"/>
    <circle cx="${CX}" cy="${CY}" r="${R - 6}" fill="#123f70"/>
    <rect x="${CX - 24}" y="${CY - R - 24}" width="48" height="32" rx="8" fill="#0b2f57"/>
  </svg>`)

  // ── 5. EL PORTACARNET: marco RÍGIDO transparente, abierto por un costado, con la cara del carnet
  // expuesta. Se dibuja, no se toma de la foto del kit: esa vista trae su propio lanyard encima y
  // taparía el carnet. La distinción portacarnet ≠ portacredencial está en el manifiesto del kit.
  const carnetW = 300, carnetH = Math.round(carnetW * 86 / 54)
  const CW = carnetW + 34, CH = carnetH + 44
  const carnet = await sharp(CARNET).resize(carnetW, carnetH, { fit: 'fill' }).png().toBuffer()

  const PX = Math.round(CX - CW / 2), PY = 1136

  const marco = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${PX}" y="${PY}" width="${CW}" height="${CH}" rx="16"
          fill="none" stroke="#aeb4ba" stroke-width="7" opacity="0.92"/>
    <rect x="${PX + 5}" y="${PY + 5}" width="${CW - 10}" height="${CH - 10}" rx="12"
          fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.6"/>
    <rect x="${CX - 42}" y="${PY + 12}" width="84" height="9" rx="4.5" fill="#aeb4ba" opacity="0.95"/>
  </svg>`)

  const armado = await base.composite([
    { input: herrajes, top: 0, left: 0 },
    { input: carcasa, top: 0, left: 0 },
    { input: yoyoArte, top: CY - (R - 9), left: CX - (R - 9) },
    { input: carnet, top: PY + 32, left: PX + 17 },
    { input: marco, top: 0, left: 0 }
  ]).png().toBuffer()

  await sharp(armado).toFile(SALIDA)
  console.log(
    `armado determinístico → ${SALIDA}\n  ${W}x${H} · cinta ${ANCHO}px · unidad del patrón ${LARGO_UNIDAD.toFixed(0)}px ` +
    `(proporción ${(UNIDAD / AH).toFixed(2)}:1) · yoyo r${R} · carnet ${carnetW}x${carnetH}`
  )

  return SALIDA
}
