// El tell del «objeto puesto para el texto» es el CANTO.
// Un campo de la escena (un pasillo oscuro, un vidrio en sombra) se funde con lo que sigue.
// Un panel insertado termina en una línea recta vertical, y esa línea cae justo donde el
// prompt dijo que terminaba la banda. Mido el gradiente horizontal promediado por columna
// y busco el pico dentro de la zona de frontera (0.35–0.55 del ancho).
import sharp from 'sharp'

for (const p of process.argv.slice(2)) {
  const { width, height } = await sharp(p).metadata()
  const { data } = await sharp(p).greyscale().raw().toBuffer({ resolveWithObject: true })

  const col = new Float64Array(width - 1)
  for (let y = 0; y < height; y++) {
    const fila = y * width
    for (let x = 0; x < width - 1; x++) col[x] += Math.abs(data[fila + x + 1] - data[fila + x])
  }
  for (let x = 0; x < col.length; x++) col[x] /= height

  const base = [...col].sort((a, b) => a - b)[Math.floor(col.length * 0.5)] // mediana = textura de fondo
  let pico = 0
  let xPico = 0
  for (let x = Math.round(width * 0.35); x < Math.round(width * 0.55); x++) {
    if (col[x] > pico) { pico = col[x]; xPico = x }
  }
  const razon = pico / Math.max(base, 0.01)

  console.log(
    p.split('/').pop().replace('-plate.png', '').padEnd(34),
    'canto en x=' + (xPico / width).toFixed(3),
    '· fuerza', pico.toFixed(1).padStart(5),
    '· fondo', base.toFixed(2).padStart(5),
    '· razón', razon.toFixed(1).padStart(5) + 'x',
    '·', razon >= 8 ? 'CANTO DE OBJETO' : razon >= 4 ? 'borde marcado' : 'se funde'
  )
}
