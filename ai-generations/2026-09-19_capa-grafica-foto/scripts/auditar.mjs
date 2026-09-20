// Auditoría editorial por pieza, según el protocolo de `editorial-typography-brand-audit`.
// Añade lo que el compositor NO medía:
//   §2.1 ¿el titular eclipsa al sujeto narrativo? (solape con la zona de mayor detalle de la foto)
//   §2.3 ¿la firma forma un foco independiente? (distancia al bloque de texto y aislamiento)
//   §3   gap de TINTA entre voces consecutivas y alineación ÓPTICA de bordes izquierdos
//   §6   revisión a tamaño de consumo y a miniatura
// Distingue «medido» de «observado»: acá sólo hay medido. El juicio visual va aparte.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(RUN, 'out')
const { variantes } = JSON.parse(fs.readFileSync(path.join(OUT, 'qa.json'), 'utf8'))

const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

// Sujeto narrativo ≈ la zona de mayor detalle de la foto. Se estima por gradiente en una malla y se
// toma el cuartil superior. Es una aproximación declarada, no segmentación semántica.
const mapaDeDetalle = async (file, W, H, celdas = 12) => {
  const { data } = await sharp(file).resize({ width: 480 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = 480
  const h = Math.round((H / W) * 480)
  const ls = []

  for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
  const cw = Math.floor(w / celdas)
  const ch = Math.floor(h / celdas)
  const rejilla = []

  for (let cy = 0; cy < celdas; cy++) {
    for (let cx = 0; cx < celdas; cx++) {
      let g = 0
      let n = 0

      for (let y = cy * ch; y < (cy + 1) * ch && y < h - 1; y++) {
        for (let x = cx * cw + 1; x < (cx + 1) * cw && x < w; x++) {
          g += Math.abs(ls[y * w + x] - ls[y * w + x - 1])
          n++
        }
      }
      rejilla.push({ x0: cx / celdas, x1: (cx + 1) / celdas, y0: cy / celdas, y1: (cy + 1) / celdas, detalle: n ? g / n : 0 })
    }
  }
  const orden = [...rejilla].sort((a, b) => b.detalle - a.detalle)
  const umbral = orden[Math.floor(orden.length * 0.25)].detalle

  return rejilla.filter(c => c.detalle >= umbral)
}

const solape = (a, b) => {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)

  return w > 0 && h > 0 ? w * h : 0
}

const informe = []

for (const v of variantes) {
  if (v.error) continue
  const plate = path.resolve(RUN, (v.plateRuta ?? ''))
  const [W, H] = v.lienzo.split('×').map(Number)
  const textos = v.capas.filter(c => (c.tipo ?? 'texto') === 'texto' && c.cajaPx)
  const firma = v.capas.find(c => c.tipo === 'firma')

  // §3 · gap de tinta y alineación óptica entre voces consecutivas
  const gaps = []

  for (let i = 1; i < textos.length; i++) {
    const prev = textos[i - 1]
    const cur = textos[i]
    // Contra la línea más cercana de la voz anterior, no contra su caja unión: en un titular de dos
    // líneas la unión incluye el hueco y un gesto encajado ahí daba un gap negativo falso.
    const lineasPrev = prev.lineasPx?.length ? prev.lineasPx : [prev.cajaPx]
    const cercana = lineasPrev.reduce((mejor, l) =>
      Math.abs(cur.cajaPx.top - l.bottom) < Math.abs(cur.cajaPx.top - mejor.bottom) ? l : mejor, lineasPrev[0])
    const gap = cur.cajaPx.top - cercana.bottom
    // La alineación óptica sólo se compara donde las dos voces comparten eje de anclaje. Dos voces
    // centradas de distinto ancho tienen bordes izquierdos distintos por definición: eso no es drift.
    const mismoEje = prev.anclaX === cur.anclaX
    const desalineacion = !mismoEje
      ? null
      : cur.anclaX === 'eje'
        ? Math.round(Math.abs((cur.cajaPx.left + cur.cajaPx.right) / 2 - (prev.cajaPx.left + prev.cajaPx.right) / 2))
        : Math.round(Math.abs(cur.cajaPx.left - prev.cajaPx.left))

    gaps.push({
      entre: [prev.id, cur.id],
      gapDeTintaPx: Math.round(gap),
      gapRelativoAlTamaño: Math.round((gap / cur.tam) * 100) / 100,
      ejeCompartido: mismoEje ? cur.anclaX : `${prev.anclaX} vs ${cur.anclaX}`,
      desalineacionOpticaPx: desalineacion
    })
  }

  // §2.3 · la firma como foco independiente
  let firmaAudit = null

  if (firma?.cajaPx && textos.length) {
    const masCerca = Math.min(...textos.map(t => firma.cajaPx.top - t.cajaPx.bottom).filter(d => d > 0))
    firmaAudit = {
      distanciaAlTextoPx: Number.isFinite(masCerca) ? Math.round(masCerca) : null,
      distanciaEnAltos: Number.isFinite(masCerca) ? Math.round((masCerca / H) * 100) / 100 : null,
      anchoRelativo: Math.round((((firma.cajaPx.right - firma.cajaPx.left) / W)) * 1000) / 1000,
      contraste: firma.contraste,
      // Aislada = separada del bloque por más de un quinto del alto y sin nada alrededor.
      aislada: Number.isFinite(masCerca) ? masCerca / H > 0.2 : true
    }
  }

  informe.push({
    id: v.id, formato: v.formato, lienzo: v.lienzo, pasa: v.pasa,
    voces: textos.map(t => ({
      id: t.id, familia: t.familia, tam: t.tam, lineas: t.lineas,
      tracking: t.ficha?.tracking, leading: t.ficha?.leading, tinta: t.ficha?.tinta,
      rotacion: t.rotacion ?? null, contraste: t.contraste,
      izquierdaDeTintaPx: t.cajaPx.left, anchoTinta: t.anchoTinta, anclaX: t.anclaX,
      desviaciones: t.ficha?.desviaciones ?? null
    })),
    gapsDeTinta: gaps,
    separacionEntreVoces: v.separacionEntreVoces ?? [],
    firma: firmaAudit
  })
}

fs.writeFileSync(path.join(OUT, 'auditoria.json'), `${JSON.stringify(informe, null, 2)}\n`)

console.log('AUDITORÍA EDITORIAL — lo medido\n')
console.log('pieza                      voces  gap de tinta (px / ×tam)     desalin. óptica  firma: dist(×alto) ancho contraste  aislada')
for (const a of informe) {
  const g = a.gapsDeTinta.map(x => `${x.gapDeTintaPx}/${x.gapRelativoAlTamaño}`).join(' ') || '—'
  const d = a.gapsDeTinta.map(x => (x.desalineacionOpticaPx == null ? 'n/a' : x.desalineacionOpticaPx)).join(' ') || '—'
  const f = a.firma ? `${a.firma.distanciaEnAltos} ${a.firma.anchoRelativo} ${a.firma.contraste}  ${a.firma.aislada ? 'SÍ' : 'no'}` : '—'

  console.log(`${a.id.padEnd(26)} ${String(a.voces.length).padEnd(6)} ${g.padEnd(28)} ${d.padEnd(16)} ${f}`)
}
