// Campo de la escena vs. losa pegada.
// Una superficie REAL dentro de una habitación siempre tiene gradiente de luz: la pared se
// aclara hacia la ventana, la mesa se oscurece hacia el fondo. Una losa insertada no: el
// modelo la rinde como relleno de un solo valor.
// Para no contaminar con el piso claro, mido SOLO el 60% más oscuro de la banda izquierda —
// que es la reserva propiamente dicha — y le pregunto tres cosas:
//   · rango p95-p05  → ¿hay gradiente de luz?
//   · sd             → ¿hay variación?
//   · detalle local  → ¿hay textura/grano de material?
import sharp from 'sharp'

for (const p of process.argv.slice(2)) {
  const { width, height } = await sharp(p).metadata()
  const w = Math.round(width * 0.42)
  const reg = { left: 0, top: 0, width: w, height }

  const { data } = await sharp(p).extract(reg).greyscale().raw().toBuffer({ resolveWithObject: true })
  const suave = await sharp(p).extract(reg).greyscale().blur(9).raw().toBuffer()

  const orden = [...data].sort((a, b) => a - b)
  const corte = orden[Math.floor(orden.length * 0.6)]

  const osc = []
  let det = 0
  for (let i = 0; i < data.length; i++) {
    if (data[i] > corte) continue
    osc.push(data[i])
    det += Math.abs(data[i] - suave[i])
  }
  det /= osc.length
  const media = osc.reduce((a, b) => a + b, 0) / osc.length
  const sd = Math.sqrt(osc.reduce((a, b) => a + (b - media) ** 2, 0) / osc.length)
  const o = osc.sort((a, b) => a - b)
  const rango = o[Math.floor(o.length * 0.95)] - o[Math.floor(o.length * 0.05)]

  const veredicto = rango <= 6 ? 'LOSA' : rango <= 12 ? 'sospechosa' : 'campo de escena'
  console.log(
    p.split('/').pop().replace('-plate.png', '').padEnd(34),
    'media', String(Math.round(media)).padStart(3),
    '· sd', sd.toFixed(1).padStart(4),
    '· rango', String(rango).padStart(3),
    '· detalle', det.toFixed(2).padStart(5),
    '·', veredicto
  )
}
