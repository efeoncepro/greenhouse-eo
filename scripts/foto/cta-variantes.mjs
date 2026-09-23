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
import { UMBRALES, hexARgb, medirContraColor, medirVoz } from './accesibilidad.mjs'

export const ORDEN = ['text', 'outline', 'solid']
export const PROMINENCIA = { discreta: 'text', delimitada: 'outline', destacada: 'solid' }

// Margen sobre el umbral: una variante que pasa raspando en el plate pasa raspando en cada compresión de la red.
export const MARGEN = 1.1

// Una variante sólo es viable si también se lee con daltonismo (Machado 2009, severidad 1): medido en el repo, el
// naranja como TINTA sobre oscuro cae a ~3,6:1 con protanopía aunque pase WCAG en visión típica. En ese caso la
// variante que se lee es la que lleva el naranja como RELLENO con tinta oscura encima.
const peorDaltonismo = m => (m?.daltonismo ? Math.min(...Object.values(m.daltonismo)) : Infinity)

// Colores de cada variante a partir de los tokens de la pieza (el acento es el mismo; cambia quién lo porta).
export function coloresDe(variante, { acento, tintaDeclarada, tintaSobreRelleno }) {
  if (variante === 'solid') return { tinta: tintaSobreRelleno, relleno: acento }
  if (variante === 'outline') return { tinta: tintaDeclarada ?? acento, borde: acento }

  return { tinta: acento }
}

// APCA relativo a su piso (Lc / umbral), para comparar márgenes: desde el 2026-09-23 el gate BLOQUEA el CTA bajo APCA.
const apcaRelativo = m => (m?.umbralApca ? Math.abs(m.apca) / m.umbralApca : Infinity)

// Franja de 6 px por fuera de la caja: el fondo contra el que se lee un borde o un relleno.
const franja = (b, g = 6) => [
  { left: b.left - g, right: b.right + g, top: b.top - g, bottom: b.top },
  { left: b.left - g, right: b.right + g, top: b.bottom, bottom: b.bottom + g },
  { left: b.left - g, right: b.left, top: b.top, bottom: b.bottom },
  { left: b.right, right: b.right + g, top: b.top, bottom: b.bottom }
]

export function evaluarVariante(variante, { rgb, ancho, alto, caja, cssPx, colores }) {
  // El CTA exige 4,5:1 SIEMPRE (canon: CTA y descriptor ≥ 4,5:1), también cuando su tamaño en pantalla lo haría «texto
  // grande» y WCAG aceptaría 3:1. Auditoría de diseño N6: un CTA grande se elegía con 3:1.
  const umbral = UMBRALES.normalTextContrast
  const limite = UMBRALES.essentialBoundaryContrast
  const medir = (box, tinta, opts) => medirVoz({ rgb, ancho, alto, caja: box, tinta: hexARgb(tinta), ...opts })

  if (variante === 'solid') {
    const texto = medirContraColor({ tinta: hexARgb(colores.tinta), fondo: hexARgb(colores.relleno), cssPx, peso: 700, umbral })
    const bordes = franja(caja).map(b => medir(b, colores.relleno, { umbral: limite, apca: false, daltonismo: true })).filter(Boolean)
    const separacion = Math.min(...bordes.map(m => m.wcag))
    const separacionDalt = Math.min(...bordes.map(peorDaltonismo))
    const viable = texto.wcag >= umbral && texto.cumpleApca !== false && peorDaltonismo(texto) >= umbral && separacion >= limite * MARGEN && separacionDalt >= limite
    const margen = Math.min(texto.wcag / umbral, apcaRelativo(texto), peorDaltonismo(texto) / umbral, separacion / limite, separacionDalt / limite)

    // El motivo nombra la condición que falló: antes decía siempre «se funde con la escena», también cuando lo que
    // caía era la tinta sobre el relleno (medido 2026-09-23: naranja con protanopía, 5,76:1 de separación y el texto
    // del botón bajo 4,5:1).
    const falla = texto.wcag < umbral ? `la tinta sobre el relleno mide ${texto.wcag}:1 (< ${umbral}:1)`
      : texto.cumpleApca === false ? `la tinta sobre el relleno no alcanza APCA (Lc ${Math.abs(texto.apca)} < ${texto.umbralApca})`
      : peorDaltonismo(texto) < umbral ? `con daltonismo la tinta sobre el relleno cae a ${+peorDaltonismo(texto).toFixed(2)}:1 (< ${umbral}:1)`
        : separacion < limite * MARGEN ? `el relleno se funde con la escena (${separacion}:1 < ${+(limite * MARGEN).toFixed(2)}:1)`
          : `con daltonismo el relleno se funde con la escena (${+separacionDalt.toFixed(2)}:1 < ${limite}:1)`

    return { variante, viable, margen: +margen.toFixed(3), texto: texto.wcag, separacion, motivo: viable ? `relleno ${separacion}:1 contra la escena y tinta ${texto.wcag}:1 sobre el relleno` : falla }
  }

  const texto = medir(caja, colores.tinta, { cssPx, peso: 700, daltonismo: true, umbral })
  const textoDalt = peorDaltonismo(texto)

  if (variante === 'text') {
    const viable = texto.wcag >= umbral * MARGEN && texto.pctBajoUmbral === 0 && textoDalt >= umbral && texto.cumpleApca !== false
    const margen = Math.min(texto.wcag / umbral, textoDalt / umbral, apcaRelativo(texto))

    return { variante, viable, margen: +margen.toFixed(3), texto: texto.wcag, daltonismo: textoDalt, motivo: viable ? `el fondo permite distinguirla: tinta ${texto.wcag}:1 (${textoDalt}:1 con daltonismo) y ningún píxel bajo ${umbral}:1` : textoDalt < umbral && texto.wcag >= umbral * MARGEN ? `con daltonismo la tinta cae a ${textoDalt}:1 (< ${umbral}:1)` : texto.cumpleApca === false && texto.wcag >= umbral * MARGEN && texto.pctBajoUmbral === 0 ? `la tinta no alcanza APCA (Lc ${Math.abs(texto.apca)} < ${texto.umbralApca})` : `el fondo no la sostiene sola (${texto.wcag}:1, ${texto.pctBajoUmbral} % del área bajo ${umbral}:1)` }
  }

  const bordes = franja(caja).map(b => medir(b, colores.borde, { umbral: limite, apca: false, daltonismo: true })).filter(Boolean)
  const borde = Math.min(...bordes.map(m => m.wcag))
  const bordeDalt = Math.min(...bordes.map(peorDaltonismo))
  const viable = texto.wcag >= umbral * MARGEN && texto.pctBajoUmbral === 0 && textoDalt >= umbral && texto.cumpleApca !== false && borde >= limite * MARGEN && bordeDalt >= limite
  const margen = Math.min(texto.wcag / umbral, textoDalt / umbral, apcaRelativo(texto), borde / limite, bordeDalt / limite)

  return { variante, viable, margen: +margen.toFixed(3), texto: texto.wcag, borde, daltonismo: Math.min(textoDalt, bordeDalt), motivo: viable ? `tinta ${texto.wcag}:1 y borde ${borde}:1 contra la escena (con daltonismo ≥ ${+Math.min(textoDalt, bordeDalt).toFixed(2)}:1)` : `no delimita con seguridad (tinta ${texto.wcag}:1, borde ${borde}:1, daltonismo ${+Math.min(textoDalt, bordeDalt).toFixed(2)}:1)` }
}

// Parte de la variante que pide la intención y escala hacia la que separa más hasta encontrar una legible.
//
// Degradación canónica (auditoría 2026-09-23, hallazgo 11; canon §10 del compositor): antes de pasar del contorno al
// relleno se prueba el MISMO contorno con la tinta en blanco (`inkOnDark`) y el acento en el borde. Es lo que hizo a
// mano «Sé la referencia»: la tinta se degrada, el acento se conserva en su portador. En `text` no se degrada: ahí
// la tinta ES el portador del acento y un CTA de texto blanco no lleva ninguno.
//
// Si ninguna alcanza con margen, queda la que MÁS separa (antes era siempre el relleno, aunque separara menos).
export function elegirVariante({ prominencia = 'delimitada', ...medicion }) {
  const inicial = PROMINENCIA[prominencia]

  if (!inicial) throw new Error(`prominencia desconocida: ${prominencia} (discreta | delimitada | destacada)`)
  const evaluadas = []
  const tintaSegura = medicion.tokens?.tintaSegura

  for (const v of ORDEN.slice(ORDEN.indexOf(inicial))) {
    const colores = coloresDe(v, medicion.tokens)
    const intentos = [{ colores, degradada: false }]

    if (v === 'outline' && tintaSegura && tintaSegura !== colores.tinta) intentos.push({ colores: { ...colores, tinta: tintaSegura }, degradada: true })

    for (const intento of intentos) {
      const e = { ...evaluarVariante(v, { ...medicion, colores: intento.colores }), degradada: intento.degradada }

      evaluadas.push(e)
      if (e.viable) return { elegida: v, degradada: e.degradada, escalo: v !== inicial, motivo: `${prominencia} → ${v}${e.degradada ? ' (tinta blanca, acento en el borde)' : ''}: ${e.motivo}`, evaluadas }
    }
  }

  // Empate: gana la más prominente (la última evaluada), que es la dirección en que el canon permite moverse.
  const mejor = evaluadas.reduce((a, b) => (b.margen >= a.margen ? b : a))

  return { elegida: mejor.variante, degradada: mejor.degradada, escalo: mejor.variante !== inicial, motivo: `${prominencia} → ${mejor.variante} sin margen (la que más separa): ${mejor.motivo}`, evaluadas, sinMargen: true }
}
