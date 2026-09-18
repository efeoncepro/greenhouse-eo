// Retrato circular para el carnet: cabeza y hombros con aire sobre la cabeza.
// Un retrato de estudio ya viene encuadrado corto; recortarlo cuadrado sin más deja la cara
// pegada al borde del círculo. Acá se gana ese aire estirando la franja superior de la propia
// foto (techo, pared, ventana) y difuminándola, en vez de acercarse todavía más.
// OJO: `extendWith: 'mirror'` NO sirve acá — si el borde superior ya toca el pelo, lo duplica
// y aparece un mechón fantasma flotando sobre la cabeza.
// Uso: node retrato-carnet.mjs <foto.png> <salida.png> [aire=0.09] [desplazamientoX=0]
import sharp from 'sharp'

const [, , FOTO, OUT, AIRE_RAW, DX_RAW] = process.argv
if (!FOTO || !OUT) {
  console.error('uso: node retrato-carnet.mjs <foto.png> <salida.png> [aire=0.09] [desplazamientoX=0]')
  process.exit(1)
}
const AIRE = Number(AIRE_RAW ?? 0.09) // fracción del lado que se agrega sobre la cabeza
const DX = Number(DX_RAW ?? 0) // corrimiento horizontal en fracción del lado (+ = hacia la derecha)
const SALIDA = 1024

const { width, height } = await sharp(FOTO).metadata()
const lado = Math.min(width, height)
const pad = Math.round(lado * AIRE)

// El encuadre parte desde arriba: en un retrato la cabeza vive en el tercio superior.
const izquierda = Math.max(0, Math.min(width - lado, Math.round((width - lado) / 2 + lado * DX)))

const alto = Math.min(lado, height)
const base = await sharp(FOTO)
  .extract({ left: izquierda, top: 0, width: lado, height: alto })
  .png()
  .toBuffer()

// La franja de arriba se estira hacia arriba y se difumina: continúa el fondo real de la foto.
// Se solapa sobre la foto y se desvanece, o queda una línea horizontal visible en la unión.
const FRANJA = Math.max(8, Math.round(alto * 0.03))
const FUNDIDO = Math.max(12, Math.round(pad * 0.55))
const techoPlano = await sharp(base)
  .extract({ left: 0, top: 0, width: lado, height: FRANJA })
  .resize(lado, pad + FUNDIDO, { fit: 'fill' })
  .blur(Math.max(4, Math.round(pad * 0.12)))
  .png()
  .toBuffer()

const degradado = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${pad + FUNDIDO}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="${(pad / (pad + FUNDIDO)).toFixed(4)}" stop-color="#fff" stop-opacity="1"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient></defs>
  <rect width="${lado}" height="${pad + FUNDIDO}" fill="url(#g)"/>
</svg>`)
const techo = await sharp(techoPlano)
  .composite([{ input: degradado, blend: 'dest-in' }])
  .png()
  .toBuffer()

const extendida = await sharp({ create: { width: lado, height: alto + pad, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: base, left: 0, top: pad },
    { input: techo, left: 0, top: 0 }
  ])
  .png()
  .toBuffer()

await sharp(extendida)
  .extract({ left: 0, top: 0, width: lado, height: lado })
  .resize(SALIDA, SALIDA)
  .png()
  .toFile(OUT)

console.log(`ok ${OUT} · fuente ${width}×${height} · lado ${lado} · aire ${pad}px`)
