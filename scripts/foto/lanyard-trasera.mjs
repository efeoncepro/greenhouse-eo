// Vista TRASERA del lanyard puesto: la cinta rodeando la nuca.
//
// Existe porque el kit no la tenía y el modelo la inventaba: pedida en palabras devolvió primero un
// ribete cosido al cuello y después una V larga cayendo por la espalda — ninguna de las dos existe.
// Un lanyard puesto, visto por detrás, es sólo un ARCO CORTO de cinta cruzando la nuca; las dos
// ramas bajan por DELANTE y el carnet cuelga al pecho, fuera de cuadro.
//
// Misma doctrina que el resto del kit: la forma y el patrón se construyen, el modelo sólo termina.
import path from 'node:path'

import sharp from 'sharp'

const KIT = 'ai-generations/2026-09-17_lanyard-efeonce'
const SALIDA = process.argv[2] ?? 'ai-generations/2026-09-21_lanyard-deterministico/piezas/lanyard-trasera-plano.png'

const W = 1100, H = 620
const FONDO = { r: 232, g: 230, b: 227 }
const NAVY = { r: 2, g: 60, b: 112 }
const ANCHO = 74                       // el mismo ancho de cinta que el conjunto armado

// 🔴 El trazado NO es un arco suelto: lleva su CONTINUIDAD. Medido el 2026-09-21: una referencia con
// sólo el arco flotando hizo que el modelo la leyera como una banda decorativa y la pegara al borde
// del cuello como un ribete cosido, cuatro veces seguidas. Corrección del operador: hay que mostrar
// «la continuidad del lanyard sólo a como se vería desde la parte que queda atrás». Así que el
// trazado son TRES tramos — la rama izquierda que viene desde el hombro, el arco de la nuca, y la
// rama derecha que se va al otro hombro—, y las dos ramas SALEN DEL CUADRO: eso es lo que le dice al
// modelo que la cinta sigue hacia adelante y no termina ahí.
const A = [230, 300], CTRL = [550, 560], B = [870, 300]   // el arco de la nuca
const RAMA = 330                                           // cuánto siguen las ramas antes de salir

const arcoBezier = t => [
  (1 - t) ** 2 * A[0] + 2 * (1 - t) * t * CTRL[0] + t ** 2 * B[0],
  (1 - t) ** 2 * A[1] + 2 * (1 - t) * t * CTRL[1] + t ** 2 * B[1]
]

const arcoTangente = t => {
  const dx = 2 * (1 - t) * (CTRL[0] - A[0]) + 2 * t * (B[0] - CTRL[0])
  const dy = 2 * (1 - t) * (CTRL[1] - A[1]) + 2 * t * (B[1] - CTRL[1])
  const m = Math.hypot(dx, dy)

  return [dx / m, dy / m]
}

// Las ramas continúan la tangente del arco en cada extremo, alejándose hacia arriba y afuera: es como
// se ve desde atrás una cinta que sube por encima del hombro y se va hacia el pecho.
const dirIzq = arcoTangente(0), dirDer = arcoTangente(1)
const L1 = RAMA, L2 = 1, L3 = RAMA          // proporciones del recorrido total en parámetro
const TOTAL = L1 + L2 * 900 + L3

const bezier = s => {
  const d = s * TOTAL

  if (d < L1) return [A[0] - dirIzq[0] * (L1 - d), A[1] - dirIzq[1] * (L1 - d)]
  if (d > L1 + L2 * 900) return [B[0] + dirDer[0] * (d - L1 - L2 * 900), B[1] + dirDer[1] * (d - L1 - L2 * 900)]

  return arcoBezier((d - L1) / (L2 * 900))
}

const tangente = s => {
  const d = s * TOTAL

  if (d < L1) return dirIzq
  if (d > L1 + L2 * 900) return dirDer

  return arcoTangente((d - L1) / (L2 * 900))
}

const lienzo = Buffer.alloc(W * H * 4)

for (let i = 0; i < W * H; i++) {
  lienzo[i * 4] = FONDO.r; lienzo[i * 4 + 1] = FONDO.g; lienzo[i * 4 + 2] = FONDO.b; lienzo[i * 4 + 3] = 255
}

const arte = await sharp(path.join(KIT, 'ref/arte-cinta.png')).flatten({ background: NAVY }).raw()
  .toBuffer({ resolveWithObject: true })

const AW = arte.info.width, AH = arte.info.height, ach = arte.info.channels
const UNIDAD = AW / 4

// Largo real del arco, para que el patrón no se deforme (misma regla que el conjunto: se CALCULA).
let largo = 0

for (let i = 1; i <= 400; i++) {
  const p0 = bezier((i - 1) / 400), p1 = bezier(i / 400)

  largo += Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
}

const LARGO_UNIDAD = ANCHO * (UNIDAD / AH)
const REPES = largo / LARGO_UNIDAD

for (let ti = 0; ti <= 2400; ti++) {
  const t = ti / 2400
  const [cx, cy] = bezier(t)
  const [tx, ty] = tangente(t)
  const [nx, ny] = [-ty, tx]                  // normal: cruza el ancho de la cinta

  for (let ui = -ANCHO; ui <= ANCHO; ui++) {
    const u = ui / (2 * ANCHO) + 0.5

    if (u < 0 || u > 1) continue

    const px = Math.round(cx + nx * (ui / 2))
    const py = Math.round(cy + ny * (ui / 2))

    if (px < 0 || py < 0 || px >= W || py >= H) continue

    // La inversión del eje de lectura depende del sentido de la normal: en el conjunto vertical va
    // invertido, en este arco NO. Se comprueba mirando, no razonando: la primera pasada salió en espejo.
    const ax = Math.floor((((t * REPES) % 1) * UNIDAD)) % AW
    const ay = Math.min(AH - 1, Math.floor(u * AH))
    const ai = (ay * AW + ax) * ach

    const k = 0.80 + 0.20 * Math.sin(Math.PI * u)   // cilindrado de la tela

    const i = (py * W + px) * 4

    lienzo[i] = Math.min(255, arte.data[ai] * k)
    lienzo[i + 1] = Math.min(255, arte.data[ai + 1] * k)
    lienzo[i + 2] = Math.min(255, arte.data[ai + 2] * k)
    lienzo[i + 3] = 255
  }
}

await sharp(lienzo, { raw: { width: W, height: H, channels: 4 } }).png().toFile(SALIDA)
console.log(
  `vista trasera armada → ${SALIDA}\n  arco ${largo.toFixed(0)}px · cinta ${ANCHO}px · ` +
  `${REPES.toFixed(2)} unidades del patrón (proporción ${(UNIDAD / AH).toFixed(2)}:1)`
)
