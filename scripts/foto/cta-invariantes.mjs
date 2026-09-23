// Invariantes de la maquetación de una pieza con CTA. Tres consumidores: la búsqueda del tamaño (un factor que las
// viola se descarta), la composición final y el gate (las recalcula sobre el layout.json).
//   · `invariantesMaquetacion`: cajas sanas y nada encima de nada. La composición final ABORTA.
//   · `fueraDeReserva`: la reserva editorial del plan. El crecimiento no la cruza; la composición final no aborta
//     (hay piezas aprobadas que declaran una reserva que nadie verificaba) y el gate la bloquea, salvo excepción.
//
// Existe por la auditoría adversarial del 2026-09-23 (hallazgo 5): el crecimiento ignoraba la reserva editorial y el
// botón podía quedar bajo la firma, porque cada regla vivía en un solo lugar —o en ninguno— y el que crecía no la
// veía. Si una regla cambia, cambia para los tres.
//
// Cada elemento: { id, tipo, box: { left, top, right, bottom }, destino?, dentroDe? }
//   tipo: 'texto' (una voz) · 'cta' (el botón) · 'firma' (logo o url) · 'seleccion' (marco, cursor o etiqueta) ·
//         'acento' (tramo de color dentro de una voz; vive dentro de otra caja por construcción)
//   destino: a qué apunta una selección (su propio destino no cuenta como choque)
//   dentroDe: id del elemento que lo contiene por construcción (el texto del botón dentro del botón)
export const TIPOS = ['texto', 'cta', 'firma', 'seleccion', 'acento']

const choca = (a, b, holgura) => a.left < b.right + holgura && a.right > b.left - holgura && a.top < b.bottom + holgura && a.bottom > b.top - holgura

export function invariantesMaquetacion({ ancho, alto, elementos, holgura = Math.min(ancho, alto) * 0.004 }) {
  const fallas = []

  for (const e of elementos) {
    const b = e.box

    if (!TIPOS.includes(e.tipo)) fallas.push(`«${e.id}» tiene un tipo desconocido (${e.tipo})`)

    if (!b || ![b.left, b.top, b.right, b.bottom].every(Number.isFinite) || b.right - b.left < 1 || b.bottom - b.top < 1) {
      fallas.push(`«${e.id}» tiene una caja degenerada`)
    }
  }

  if (fallas.length) return fallas

  const contenido = (a, b) => a.dentroDe === b.id || b.dentroDe === a.id
  const principales = elementos.filter(e => e.tipo === 'texto' || e.tipo === 'cta' || e.tipo === 'firma')

  // Texto, botón y firma no se tocan entre sí (salvo lo que uno contiene por construcción).
  for (let i = 0; i < principales.length; i++) {
    for (let j = i + 1; j < principales.length; j++) {
      const [a, b] = [principales[i], principales[j]]

      if (!contenido(a, b) && choca(a.box, b.box, 0)) fallas.push(`«${a.id}» choca con «${b.id}»`)
    }
  }

  // Una selección no tapa ninguna voz, botón ni firma que no sea su destino. El MARCO envuelve a su destino por construcción;
  // un CURSOR o una ETIQUETA no tapan ningún texto, ni siquiera el de su destino: apuntan al marco, no a las letras (tramo 12;
  // auditoría de diseño de la cuarta certificación, N1: el cursor local tapaba la «C» del titular y se leía «errarlo»).
  // La parte se deduce del id (`cursor «…»`, `etiqueta «…»`, `marco …`) para no cambiar el layout de las piezas aprobadas.
  for (const s of elementos.filter(e => e.tipo === 'seleccion')) {
    const puntero = /^(cursor|etiqueta) /.test(s.id)

    for (const p of principales) {
      if ((p.id === s.destino || p.dentroDe === s.destino) && !(puntero && p.tipo === 'texto')) continue
      if (choca(s.box, p.box, holgura)) fallas.push(`${s.id} tapa «${p.id}»`)
    }
  }

  return fallas
}

// Reserva editorial (px del plate): lo que se dibuja encima —texto, botón y selección, no la firma— no pasa de
// `maxRight` ni de `maxBottom`. El resto de la foto queda para la escena.
export function fueraDeReserva({ elementos, reserva }) {
  if (!reserva) return []
  const dibujado = elementos.filter(e => e.tipo !== 'firma')

  if (!dibujado.length) return []
  const derecha = Math.max(...dibujado.map(e => e.box.right))
  const abajo = Math.max(...dibujado.map(e => e.box.bottom))

  return [
    ...(derecha > reserva.maxRight + 0.5 ? [`el texto llega a x=${Math.round(derecha)} y la reserva editorial termina en ${reserva.maxRight}`] : []),
    ...(abajo > reserva.maxBottom + 0.5 ? [`el texto baja hasta y=${Math.round(abajo)} y la reserva editorial termina en ${reserva.maxBottom}`] : [])
  ]
}
