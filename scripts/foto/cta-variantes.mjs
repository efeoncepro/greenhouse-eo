// Elección de variante del CTA (texto · contorno · relleno) por INTENCIÓN + MEDICIÓN sobre la escena real.
//
// Por qué existe [operador, 2026-09-22: «los CTA hay 3 tipos pero los agentes solo usan 1»]. Medido en el repo: dos
// de tres agentes terminaron usando sólo `outline`. Causas: (1) el canon pide elegir «por composición» y registrar el
// motivo, pero ninguna herramienta mostraba las tres sobre la foto ni pedía el motivo; (2) el gate era ASIMÉTRICO —
// medía el relleno del sólido y exigía acento en la tinta del de texto, pero no medía el borde del contorno—, así que
// el contorno era la única variante que nunca fallaba, y los agentes aprenden del gate.
//
// El canon (EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1 §Tres tratamientos) ya define la intención de cada una:
//   texto    → «integrar una acción DISCRETA cuando el fondo y la jerarquía ya permiten distinguirla»
//   contorno → «DELIMITAR la acción conservando el fondo visible»
//   relleno  → «SEPARAR con más claridad la zona de acción»
// y prohíbe asignarlas por embudo, plataforma o audiencia. Por eso `auto` no adivina la intención: el autor declara
// `prominencia` (discreta | delimitada | destacada) y la medición sólo decide si la escena la permite. Si no la
// permite, se escala a la variante que separa más —nunca a una menos visible— y el motivo queda en el QA.
import { UMBRALES, hexARgb, medirContraColor, medirVoz, umbralWcag } from './accesibilidad.mjs'

export const ORDEN = ['text', 'outline', 'solid']
export const PROMINENCIA = { discreta: 'text', delimitada: 'outline', destacada: 'solid' }

// Margen sobre el umbral: una variante que pasa raspando en el plate pasa raspando en cada compresión de la red.
export const MARGEN = 1.1

// Colores de cada variante a partir de los tokens de la pieza (el acento es el mismo; cambia quién lo porta).
export function coloresDe(variante, { acento, tintaDeclarada, tintaSobreRelleno }) {
  if (variante === 'solid') return { tinta: tintaSobreRelleno, relleno: acento }
  if (variante === 'outline') return { tinta: tintaDeclarada ?? acento, borde: acento }

  return { tinta: acento }
}

// Franja de 6 px por fuera de la caja: el fondo contra el que se lee un borde o un relleno.
const franja = (b, g = 6) => [
  { left: b.left - g, right: b.right + g, top: b.top - g, bottom: b.top },
  { left: b.left - g, right: b.right + g, top: b.bottom, bottom: b.bottom + g },
  { left: b.left - g, right: b.left, top: b.top, bottom: b.bottom },
  { left: b.right, right: b.right + g, top: b.top, bottom: b.bottom }
]

export function evaluarVariante(variante, { rgb, ancho, alto, caja, cssPx, colores }) {
  const umbral = umbralWcag(cssPx, 700)
  const limite = UMBRALES.essentialBoundaryContrast
  const medir = (box, tinta, opts) => medirVoz({ rgb, ancho, alto, caja: box, tinta: hexARgb(tinta), ...opts })

  if (variante === 'solid') {
    const texto = medirContraColor({ tinta: hexARgb(colores.tinta), fondo: hexARgb(colores.relleno), cssPx, peso: 700 })
    const bordes = franja(caja).map(b => medir(b, colores.relleno, { umbral: limite, apca: false })).filter(Boolean)
    const separacion = Math.min(...bordes.map(m => m.wcag))
    const viable = texto.wcag >= umbral && separacion >= limite * MARGEN

    return { variante, viable, texto: texto.wcag, separacion, motivo: viable ? `relleno ${separacion}:1 contra la escena y tinta ${texto.wcag}:1 sobre el relleno` : `el relleno se funde con la escena (${separacion}:1 < ${+(limite * MARGEN).toFixed(2)}:1)` }
  }

  const texto = medir(caja, colores.tinta, { cssPx, peso: 700 })

  if (variante === 'text') {
    const viable = texto.wcag >= umbral * MARGEN && texto.pctBajoUmbral === 0

    return { variante, viable, texto: texto.wcag, motivo: viable ? `el fondo permite distinguirla: tinta ${texto.wcag}:1 y ningún píxel bajo ${umbral}:1` : `el fondo no la sostiene sola (${texto.wcag}:1, ${texto.pctBajoUmbral} % del área bajo ${umbral}:1)` }
  }

  const bordes = franja(caja).map(b => medir(b, colores.borde, { umbral: limite, apca: false })).filter(Boolean)
  const borde = Math.min(...bordes.map(m => m.wcag))
  const viable = texto.wcag >= umbral * MARGEN && texto.pctBajoUmbral === 0 && borde >= limite * MARGEN

  return { variante, viable, texto: texto.wcag, borde, motivo: viable ? `tinta ${texto.wcag}:1 y borde ${borde}:1 contra la escena` : `no delimita con seguridad (tinta ${texto.wcag}:1, borde ${borde}:1)` }
}

// Parte de la variante que pide la intención y escala hacia la que separa más hasta encontrar una legible.
export function elegirVariante({ prominencia = 'delimitada', ...medicion }) {
  const inicial = PROMINENCIA[prominencia]

  if (!inicial) throw new Error(`prominencia desconocida: ${prominencia} (discreta | delimitada | destacada)`)
  const evaluadas = []

  for (const v of ORDEN.slice(ORDEN.indexOf(inicial))) {
    const e = evaluarVariante(v, { ...medicion, colores: coloresDe(v, medicion.tokens) })

    evaluadas.push(e)
    if (e.viable) return { elegida: v, escalo: v !== inicial, motivo: `${prominencia} → ${v}: ${e.motivo}`, evaluadas }
  }

  // Ninguna alcanza con margen: queda la que más separa y el gate decide con los umbrales exactos.
  return { elegida: 'solid', escalo: inicial !== 'solid', motivo: `${prominencia} → solid sin margen: ${evaluadas.at(-1).motivo}`, evaluadas, sinMargen: true }
}
