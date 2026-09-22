// Mide dónde empieza el sujeto bajo la HUELLA REAL del texto compuesto (no bajo `textWidth`, que es el
// máximo permitido y en 4:5 cubre casi todo el ancho).
// 🔴 Dos proxys que probé y fallan: (a) ancho completo del cuadro y (b) `textWidth` — los dos capturan
//    una fuente de luz alta FUERA del eje del texto (en p2-expediente, el monitor del fondo a la derecha)
//    y devuelven un `top` ~150px más alto que el sujeto real, haciendo abortar al compositor sin causa.
// El ancho real sale de `out/<id>-layout.json`, que el compositor ya escribe con el box de cada bloque.
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
const UMBRAL = 0.42, MIN_PX = 25
const piezas = JSON.parse(await readFile(process.argv[2], 'utf8'))
for (const p of piezas) {
  let x0, x1
  try {
    const lay = JSON.parse(await readFile(`out/${p.id}-layout.json`, 'utf8'))
    const boxes = lay.elements.map(e => e.box)
    x0 = Math.round(Math.min(...boxes.map(b => b.left)))
    x1 = Math.round(Math.max(...boxes.map(b => b.right)))
  } catch { console.log(`${p.id}\tsin layout.json — compón primero`); continue }
  const { data, info } = await sharp(p.plate).greyscale().raw().toBuffer({ resolveWithObject: true })
  let top = null
  for (let y = 0; y < info.height && top === null; y++) {
    let n = 0
    for (let x = Math.max(0,x0); x < Math.min(info.width,x1); x++) if (data[y*info.width+x]/255 > UMBRAL) n++
    if (n >= MIN_PX) top = y
  }
  console.log(`${p.id}\thuella=${x0}-${x1}\ttop=${top ?? 'sin sujeto bajo el texto'}${top?` (${(top/info.height*100).toFixed(1)}%)`:''}`)
}
