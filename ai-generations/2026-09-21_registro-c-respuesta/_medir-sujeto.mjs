// Dónde empieza el sujeto bajo la HUELLA REAL del texto compuesto (de out/<id>-layout.json).
//
// 🔴 No se mide por BRILLO. Tres proxys probados que fallan, dos de ellos hacia el lado peligroso:
//   (a) primera fila luminosa del ancho completo → capta una fuente alta FUERA del eje del texto
//       (p2-expediente: 492 contra 656 reales). Falla conservador: aborta sin causa.
//   (b) bajo `textWidth` → igual: en 4:5 cubre casi todo el ancho.
//   (c) umbral de brillo bajo la huella → 🔴 SE SALTA AL SUJETO OSCURO y devuelve un `top` MÁS ABAJO
//       del real, dejando pasar texto sobre la cabeza. Medido: p3-megafono 732 contra ~592; y en
//       CMP-002 (pelo oscuro sobre navy) 735 contra 465 — 270px, el defecto que el operador rechazó.
//   Bajar el umbral no lo arregla: a 0.10 el ruido del muro navy dispara en la fila 0.
//
// ✅ Se mide por BORDE: el muro es liso (varianza baja por fila), el sujeto tiene silueta — y una
//    silueta oscura sobre navy tiene borde igual que una clara. Primera fila cuya desviación estándar
//    dentro de la huella supera varias veces la del muro de referencia (las filas del tercio superior).
import sharp from 'sharp'; import { readFile } from 'node:fs/promises'
const K = 4            // veces la desviación del muro
const MIN_RUN = 3      // filas consecutivas, para no disparar con una mota
const std = a => { const m = a.reduce((s,v)=>s+v,0)/a.length; return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/a.length) }
for (const p of JSON.parse(await readFile(process.argv[2],'utf8'))) {
  const lay = JSON.parse(await readFile(`out/${p.id}-layout.json`,'utf8'))
  const bs = lay.elements.map(e=>e.box)
  const x0 = Math.max(0, Math.round(Math.min(...bs.map(b=>b.left))))
  const x1 = Math.round(Math.max(...bs.map(b=>b.right)))
  const { data, info } = await sharp(p.plate).greyscale().raw().toBuffer({resolveWithObject:true})
  const w = Math.min(info.width, x1) - x0
  const fila = y => { const a = new Array(w); for (let i=0;i<w;i++) a[i] = data[y*info.width + x0 + i]; return a }
  // muro de referencia: la mediana de las desviaciones del 15% superior (siempre vacío por contrato)
  const ref = []; for (let y=0;y<Math.round(info.height*0.15);y++) ref.push(std(fila(y)))
  ref.sort((a,b)=>a-b); const muro = ref[Math.floor(ref.length/2)] || 1
  let top = null, run = 0
  for (let y=0; y<info.height; y++) {
    if (std(fila(y)) > muro*K) { if (++run >= MIN_RUN) { top = y-run+1; break } } else run = 0
  }
  console.log(`${p.id}\thuella=${x0}-${x1}\tmuro σ=${muro.toFixed(2)}\ttop=${top ?? 'sin sujeto bajo el texto'}`)
}
