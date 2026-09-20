// Corrida de la matriz: aplica el motor de capas a brief/matriz.mjs y emite master + vista 390 px.
// La retícula es dato; la mecánica vive en capas.mjs; el veredicto es lo medido por capa.
// Uso: node ai-generations/2026-09-19_capa-grafica-foto/scripts/componer.mjs [id…]
import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { componer } from './capas.mjs'
import { piezas, piezas2, piezas3, piezas4, piezasG, piezasG2, piezasV42, preset } from '../brief/matriz.mjs'

const RUN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const OUT = path.join(RUN, 'out')
const only = process.argv.slice(2)
const qa = []
let fallos = 0

fs.mkdirSync(path.join(OUT, 'preview-390'), { recursive: true })

const motivo = c => {
  const m = []

  if (c.piso != null && c.contraste != null && c.contraste < c.piso) m.push(`contraste ${c.contraste} < ${c.piso}`)
  if (c.ocupacionMax != null && c.ocupacion > c.ocupacionMax) m.push(`zona movida ${c.ocupacion} > ${c.ocupacionMax}`)
  if (c.aireAbajo && !c.aireAbajo.pasa) m.push(`el campo no continúa debajo hasta ${c.aireAbajo.hasta} (contraste ${c.aireAbajo.contraste}, ocupación ${c.aireAbajo.ocupacion})`)
  if (c.acentos?.some(a => a.contraste < c.piso)) m.push(`acento ${c.acentos.map(a => a.contraste).join('/')} bajo ${c.piso}`)
  if (c.gutteryFaltas) m.push(`canon Guttery: ${c.gutteryFaltas.join('; ')}`)
  if (c.choques) m.push(`monta tinta sobre ${c.choques.map(x => `${x.con} (${Math.round(x.solape * 100)}%)`).join(', ')}`)
  if (c.separacionInsuficiente) {
    const sp = c.separacionInsuficiente

    m.push(`no contrasta con la voz anterior: ejes [${sp.ejes.join(', ') || 'ninguno'}] · salto de tinta ${sp.saltoDeTinta} (${sp.tintaA} vs ${sp.tintaB}) · escala ${sp.escala}×` +
      (sp.exigeTinta ? ' · comparten línea óptica, así que el salto de tinta es obligatorio' : ''))
  }
  if (c.aireProteccion?.invasores?.length) m.push(`la firma no conserva su aire: ${c.aireProteccion.invasores.map(i => `${i.capa} a ${i.distanciaPx}px de ${i.minimoPx}`).join(', ')}`)
  if (c.evidencia && !c.evidencia.dentroDelLienzo) m.push('la selección se sale del lienzo')
  const ev = c.evidencia

  if (ev?.controlesSobreElSujeto) m.push(`un control cae sobre el sujeto (${ev.controlesSobreElSujeto.map(f => Math.round(f * 100) + '%').join(', ')} de su área sobre la zona de mayor detalle)`)
  if (ev?.contrastePlacaContraFoto?.some(p => p.contraste < (c.piso ?? 3))) {
    m.push(`placa contra la foto: ${ev.contrastePlacaContraFoto.filter(p => p.contraste < (c.piso ?? 3)).map(p => `${p.color} ${p.contraste}`).join(', ')} < ${c.piso ?? 3}`)
  }
  if (ev?.contrasteTrazoContraFoto && ev.contrasteTrazoContraFoto.peor < (c.piso ?? 3)) {
    m.push(`trazo de la caja contra la foto: peor lado ${ev.contrasteTrazoContraFoto.peor} < ${c.piso ?? 3}`)
  }
  if (c.evidencia?.placasPegadasAlBorde?.length) m.push(`placa pegada al borde: ${c.evidencia.placasPegadasAlBorde.map(p => p.id).join(', ')}`)
  if (c.evidencia?.sinCombinacionValida && c.evidencia.anclas?.startsWith('resueltas')) m.push(`ninguna de las ${c.evidencia.combinacionesProbadas} combinaciones de ancla del contrato cabe: el objetivo es demasiado ancho o está muy al borde`)
  if (c.evidencia?.combinacionesQueSiPasarian) m.push(`el ancla declarada no pasa la evidencia; sí pasarían: ${c.evidencia.combinacionesQueSiPasarian.map(a => `colab ${JSON.stringify(a.colaboradores)} + local ${a.local}`).join(' | ')}`)

  return `${c.id}: ${m.join(' + ') || 'sin detalle'}`
}

const resumen = c => {
  if (c.omitida) return `${c.id} omitida`
  if (c.tipo === 'seleccion') return `${c.id} ${c.variante ?? ''} ${c.evidencia.cursores.map(x => `${x.id}/${x.state === 'moving' ? 'moving' : x.kind}`).join('+')}`

  return `${c.id} ${c.tam}px${c.acotado ? `(${c.acotado})` : ''} ${c.contraste}:1`
}

const TODAS = [...piezas, ...piezas2, ...piezas3, ...piezas4, ...piezasG, ...piezasG2, ...piezasV42]

for (const pieza of TODAS.filter(p => !only.length || only.includes(p.id))) {
  const plate = path.resolve(RUN, pieza.plate)

  try {
    const { master, W, H, informe, separaciones } = await componer({ pieza, plate })
    const caidas = informe.filter(c => !c.pasa)
    const ancho = W >= H ? 1200 : 1080

    await sharp(master).resize({ width: ancho }).png().toFile(path.join(OUT, `${pieza.id}.png`))
    await sharp(master).resize({ width: 390 }).png().toFile(path.join(OUT, 'preview-390', `${pieza.id}.png`))

    if (caidas.length) fallos++
    qa.push({ id: pieza.id, formato: pieza.formato, plate: path.basename(plate), plateRuta: path.relative(RUN, plate), campo: pieza.campo, nota: pieza.nota, lienzo: `${W}×${H}`, pasa: !caidas.length, separacionEntreVoces: separaciones, capas: informe })
    console.log(`${caidas.length ? '✗' : '✓'} ${pieza.id.padEnd(24)} ${pieza.formato.padEnd(5)} ` + informe.map(resumen).join(' · ') +
      (caidas.length ? `\n   ↳ ${caidas.map(motivo).join(' · ')}` : ''))
  } catch (e) {
    fallos++
    qa.push({ id: pieza.id, formato: pieza.formato, error: e.message })
    console.log(`✗ ${pieza.id.padEnd(24)} ${pieza.formato.padEnd(5)} ERROR: ${e.message}`)
  }
}

fs.writeFileSync(path.join(OUT, 'qa.json'), `${JSON.stringify({ preset, variantes: qa }, null, 2)}\n`)
console.log(`\n${qa.filter(v => v.pasa).length}/${qa.length} variantes pasan todas sus puertas.`)
if (fallos) process.exitCode = 1
