// Motor de capas para componer sobre fotografía de marca Efeonce.
//
// El motor no sabe de campañas: resuelve una LISTA ORDENADA de capas. Cada capa se ancla al lienzo o
// a la caja de tinta de una capa anterior, se mide contra los píxeles reales del plate y puede fallar.
// La retícula es DATO (brief/*.json), medida sobre una pieza aprobada. Acá sólo vive la mecánica.
//
// ── Familias ─────────────────────────────────────────────────────────────────────────────────────
//   bricolage · variable: `peso` (wght), `ancho` (wdth 75–100), `optico` (opsz) libres
//   poppins   · 400 500 600 700 800 900, con `italica: true` donde exista el archivo
//   guttery   · gesto; si el archivo no está instalado la capa se omite y queda registrado
//   Cualquier capa puede declarar `tam`, `tracking` y `leading` propios; nada está fijado en el motor.
//
// ── Texto enriquecido ────────────────────────────────────────────────────────────────────────────
//   `**negrita**` sube al peso de `pesoNegrita` DE LA MISMA familia · `[[acento]]` cambia la tinta al
//   acento del campo · `|` fuerza salto. Cada acento se mide APARTE (su propia caja y su luminancia).
//
// ── Anclaje ──────────────────────────────────────────────────────────────────────────────────────
//   x: "eje" | { frac } | { ref, borde: "left|right|center" }
//   y: { frac } | { ref, borde: "top|bottom", gap } | { ref, borde, gapDe, gapFactor }
//   `candidatos: [{ x, y }, …]` prueba posiciones en orden y se queda con la PRIMERA que pasa sus
//   puertas. Si ninguna pasa, la capa falla y el informe muestra qué midió cada candidata: una capa
//   sin lugar en esa foto no se coloca mal, se reporta.
//
// ── Puertas por capa ─────────────────────────────────────────────────────────────────────────────
//   `piso` (contraste, por defecto 4.5) medido contra el píxel EXTREMO bajo la tinta —p98 para tinta
//   clara, p2 para oscura—, nunca contra un promedio ni contra el token.
//   `ocupacionMax` (por defecto 0.008): gradiente medio de la zona. Un texto puede pasar contraste y
//   aun así desencajar porque cae sobre una zona con detalle; esta puerta es la que lo atrapa.
//   `aireAbajo` (múltiplos del alto de su tinta): el campo que debe SEGUIR SIENDO EL MISMO por debajo,
//   en tono y en calma (mismo piso de contraste y de ocupación). Una voz secundaria encajada entre el
//   titular y la coronilla mide bien bajo su propia tinta y aun así se lee huérfana: lo que le falta no
//   es contraste local, es que el campo continúe.
//   Validado contra el caso aprobado «¿Claude o Codex?»: su cita mide 11,41:1 y su campo de abajo
//   10,09:1 con ocupación 0,0004 → pasa. La versión rechazada sobre la foto de Julio y Nexa medía 6,89:1
//   bajo su tinta pero 1,71:1 en el campo de abajo: la cita se apoyaba en el último tramo oscuro antes
//   de que el muro se aclarara. Sin esta puerta, «desencaja» no es detectable por el compositor.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { axisAdvertising, axisBrandRamp } from '@efeoncepro/axis-tokens'
import {
  AXIS_COLLABORATION_SELECTION_ANCHORS,
  AXIS_COLLABORATION_SELECTION_COLLABORATOR_ANCHORS,
  AXIS_COLLABORATION_SELECTION_CONTRACT,
  resolveCollaborationSelectionIntent
} from '@efeoncepro/axis-ui-contracts'

import { renderCollaborationSelection } from '../../../scripts/creative/layout-compiler/axis-advertising.mjs'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..')
const R = axisAdvertising.recipes
const C = axisAdvertising.color

// ── recursos ─────────────────────────────────────────────────────────────────────────────────────
const FUENTES = path.join(REPO, 'src/assets/fonts')
const POPPINS = {
  400: 'Poppins-Regular.ttf', 500: 'Poppins-Medium.ttf', 600: 'Poppins-SemiBold.ttf',
  700: 'Poppins-Bold.ttf', 800: 'Poppins-ExtraBold.ttf', 900: 'Poppins-Black.ttf'
}
const POPPINS_ITALICA = { 700: 'Poppins-BoldItalic.ttf', 800: 'Poppins-ExtraBoldItalic.ttf', 900: 'Poppins-BlackItalic.ttf' }
const GUTTERY = path.join(os.homedir(), 'Library/Fonts/Guttery.otf')
export const GUTTERY_DISPONIBLE = fs.existsSync(GUTTERY)

const cache = new Map()
const abrir = f => {
  if (!cache.has(f)) cache.set(f, fontkit.openSync(f))

  return cache.get(f)
}
const bricolage = (peso, ancho, optico) =>
  abrir(path.join(FUENTES, 'BricolageGrotesque-Variable.ttf')).getVariation({ wght: peso, wdth: ancho, opsz: optico })

export const LOGOS = {
  blanco: path.join(REPO, 'public/branding/logo-negative.svg'),
  navy: path.join(REPO, 'public/branding/logo-full.svg')
}
const LOGO_RATIO = 196.68 / 837.07

// Campo oscuro trae el par medido inkOnDark/softOnDark. Campo claro NO tiene equivalente en el
// contrato: mutedOnLight es un gris de UI que sobre pared clara real cae a ~3:1. Por eso la voz suave
// en campo claro repite inkOnLight y separa por peso, escala y familia. Gap del contrato, no un hex mío.
const CAMPOS = {
  oscuro: { fuerte: C.inkOnDark, suave: C.softOnDark, acento: C.accentSurface },
  claro: { fuerte: C.inkOnLight, suave: C.inkOnLight, acento: C.accentInkOnLight }
}

// Tintas de texto nombradas por TOKEN, nunca por hex suelto en el brief. Salen del contrato
// `axisAdvertising.color` y de la rampa de marca Greenhouse; un hex literal en una capa es un error
// que el motor rechaza para que ningún valor de diseño entre por la puerta de atrás.
const PALETA = {
  blanco: C.inkOnDark,
  celeste: C.softOnDark,            // primary 100 · voz suave sobre campo oscuro
  azulClaro: axisBrandRamp.greenhouse.primary[200],
  azulMedio: axisBrandRamp.greenhouse.primary[300],
  azulCasa: axisBrandRamp.greenhouse.primary[500],   // «la casa»
  navy: C.stableDarkField,
  navyProfundo: axisBrandRamp.greenhouse.primary[900],
  tealClaro: axisBrandRamp.greenhouse.secondary[300],
  teal: axisBrandRamp.greenhouse.secondary[500],
  naranja: C.accentSurface,         // «la idea» · sólo sobre campo oscuro, medido aparte
  naranjaSobreClaro: C.accentInkOnLight,
  lima: C.growthOnDark,             // «el resultado»
  tintaClara: C.inkOnLight
}

const resolverTinta = (valor, campo) => {
  if (!valor) return campo.fuerte
  if (campo[valor]) return campo[valor]
  if (PALETA[valor]) return PALETA[valor]
  throw new Error(`tinta «${valor}» no existe: usa un rol del campo (fuerte|suave|acento) o un token de la paleta (${Object.keys(PALETA).join('|')})`)
}

// `tracking` puede venir como número, como `-0.035em` o como la palabra `normal` (receta `gesture`):
// parseFloat('normal') da NaN y propagaba NaN hasta el compositor. Espaciado nativo = 0.
// Guttery — lo que es canon y lo que es observación.
//
// CANON (falla): «una intervención puntual de una línea; nunca cuerpo, legal ni segundo titular»,
// una por pieza, hasta 3 palabras, archivo real sin sustituir, y contraste medido como cualquier voz.
// Además la capa debe DECLARAR su propósito: un gesto sin función narrativa no se corrige, se retira
// («la omisión de Guttery es una decisión positiva»).
//
// OBSERVACIÓN (reporta, no falla): en los 5 usos del caso aprobado el tamaño cae en 0.039–0.050 del
// alto, la rotación entre −6° y −10° y la tinta es siempre blanca. Eso es lo que se midió sobre
// campos oscuros y cálidos, no un límite del sistema: sobre campo claro la tinta puede salir de la
// paleta, y el tamaño o la rotación pueden crecer si la pieza lo justifica y el contraste lo aguanta.
const GUTTERY_OBSERVADO = { altoMin: 0.039, altoMax: 0.050, rotMin: 6, rotMax: 10, tinta: '#ffffff' }

const revisarGuttery = (capa, tam, tinta, H) => {
  const faltas = []
  const fuera = []

  // `proposito` en texto libre no filtraba nada: siempre se puede escribir algo que suene razonable.
  // «en revisión» pasó con el propósito «nombra el estado de la obra», y el operador lo rechazó
  // porque no aporta a la narrativa. El canon es más estrecho: Guttery es una VOZ HUMANA breve, y
  // los cinco usos aprobados lo son —«¿apostamos?», «¡por fin!», «¡a la orden!», «¿hola?», «no se
  // comparte»—. Una etiqueta de estado no tiene hablante, así que se exige declararlo.
  if (!capa.voz) faltas.push('no declara `voz` (quién lo dice): Guttery es una voz humana breve; una etiqueta de estado no tiene hablante y se retira')
  if (!capa.proposito) faltas.push('no declara `proposito`: un gesto sin función narrativa se retira, no se ajusta')
  const palabras = capa.texto.trim().split(/\s+/).length

  if (palabras > 3) faltas.push(`${palabras} palabras; el canon fija 3 como máximo`)
  if (capa.texto.includes('|')) faltas.push('tiene salto de línea; Guttery es de una sola línea')

  const alto = tam / H

  if (alto < GUTTERY_OBSERVADO.altoMin || alto > GUTTERY_OBSERVADO.altoMax) {
    fuera.push(`tamaño ${alto.toFixed(3)} del alto (observado 0.039–0.050)`)
  }
  const rot = Math.abs(capa.rotacion ?? 0)

  if (rot < GUTTERY_OBSERVADO.rotMin || rot > GUTTERY_OBSERVADO.rotMax) {
    fuera.push(`rotación ${capa.rotacion ?? 0}° (observado ±6–10°)`)
  }
  if (tinta.toLowerCase() !== GUTTERY_OBSERVADO.tinta) fuera.push(`tinta ${tinta} (observado siempre blanca)`)

  return { faltas, fuera }
}

const em = v => {
  if (typeof v === 'number') return v
  const n = Number.parseFloat(v)

  return Number.isFinite(n) ? n : 0
}

// Resuelve el par base/negrita de la MISMA familia: `**…**` nunca cambia de tipografía.
const parFuentes = capa => {
  const r = capa.receta ? R[capa.receta] : null
  const fam = capa.familia ?? (r?.role === 'structure' ? 'poppins' : 'bricolage')

  if (fam === 'guttery') {
    // 🔴 GUTTERY NO SE USA. Decisión del operador (2026-09-19) tras varias rondas: la jerarquía sale
    // de Poppins y Bricolage con sus pesos y tamaños. Guttery volverá cuando él indique dónde y cómo.
    //
    // Por qué quedó fuera, para que no se reintroduzca por inercia: la usé como etiqueta chica al
    // costado (0.22–0.33× el titular), que rompe la composición por asimetría; luego sin salto de
    // tinta contra el titular, o sea sin contraste tipográfico; y con textos que no eran voces
    // —«en revisión», «sin atajos», «hecho, no dicho»— sino etiquetas y consignas. El motor conserva
    // la capacidad y sus puertas; lo que está apagado es el uso por decisión, no por falla técnica.
    if (!capa.autorizadoPorElOperador) {
      throw new Error('Guttery está fuera de uso por decisión del operador: la jerarquía se resuelve con Poppins y Bricolage. Para reactivarla, declarar `autorizadoPorElOperador` en la capa con la indicación concreta.')
    }
    if (!GUTTERY_DISPONIBLE) return null
    const g = abrir(GUTTERY)

    return { base: g, negrita: g, familia: 'guttery', archivo: path.basename(GUTTERY), ejes: null }
  }
  if (fam === 'poppins') {
    const peso = capa.peso ?? r?.weight ?? 400
    const pesoN = capa.pesoNegrita ?? Math.min(900, peso + 300)
    const tabla = capa.italica ? POPPINS_ITALICA : POPPINS
    const archivo = tabla[peso] ?? POPPINS[peso]

    if (!archivo) throw new Error(`Poppins ${peso}${capa.italica ? ' itálica' : ''} no existe entre los archivos versionados`)

    return {
      base: abrir(path.join(FUENTES, archivo)), negrita: abrir(path.join(FUENTES, POPPINS[pesoN] ?? POPPINS[700])),
      familia: 'poppins', archivo, ejes: { peso, pesoNegrita: pesoN, italica: Boolean(capa.italica) }
    }
  }
  const peso = capa.peso ?? r?.weight ?? 400
  const ancho = capa.ancho ?? r?.width ?? 100
  const optico = capa.optico ?? r?.opticalSize ?? 48

  return {
    base: bricolage(peso, ancho, optico),
    negrita: bricolage(capa.pesoNegrita ?? Math.min(1000, peso + 160), ancho, optico),
    familia: 'bricolage', archivo: 'BricolageGrotesque-Variable.ttf',
    ejes: { wght: peso, wdth: ancho, opsz: optico, wghtNegrita: capa.pesoNegrita ?? Math.min(1000, peso + 160) }
  }
}

// ── shaping determinista ─────────────────────────────────────────────────────────────────────────
// Hueco de palabra objetivo, medido sobre los casos aprobados con el mismo instrumento
// (`scripts/medir-espacio.mjs`, que recorre los glifos reales): «¿Claude o Codex?» a 98 px da
// **0.174 del cuerpo**; el dominante de GTA a 200 px da **0.104**. El hueco NO es proporcional al
// cuerpo: se cierra al crecer, porque a tamaño de cartel el mismo ratio abre un boquete. Se
// interpola entre esos dos puntos y se acota.
//
// Es la dimensión correcta del problema: bajar el tracking global cerraría también las letras y
// rompería las contraformas. El protocolo pide diagnosticar cuál de las cinco dimensiones falla.
const huecoObjetivo = cuerpo => {
  const r = 0.174 + ((cuerpo - 98) * (0.104 - 0.174)) / (200 - 98)

  return Math.max(0.10, Math.min(0.185, r))
}

// Mide el hueco de tinta entre palabras recorriendo los glifos reales de la cadena completa.
const huecoReal = (texto, font, size, trackingEm, k) => {
  const run = font.layout(texto)
  const scale = size / font.unitsPerEm
  let x = 0
  let derechaPrevia = null
  let pendiente = false
  const huecos = []

  run.glyphs.forEach((g, i) => {
    const p = run.positions[i]
    const esEspacio = g.codePoints?.[0] === 32

    if (g.bbox && g.bbox.maxX > g.bbox.minX) {
      const izq = x + p.xOffset * scale + g.bbox.minX * scale

      if (pendiente && derechaPrevia != null) { huecos.push(izq - derechaPrevia); pendiente = false }
      derechaPrevia = x + p.xOffset * scale + g.bbox.maxX * scale
    }
    if (esEspacio) pendiente = true
    x += p.xAdvance * scale * (esEspacio ? k : 1) + (i === run.glyphs.length - 1 ? 0 : trackingEm * size)
  })

  return huecos.length ? huecos.reduce((a2, b2) => a2 + b2, 0) / huecos.length : null
}

// Despeja el factor por bisección con la fuente real: nada de tabla, nada de ojo.
const factorDeEspacio = (texto, font, size, trackingEm) => {
  const objetivo = huecoObjetivo(size) * size

  if (huecoReal(texto, font, size, trackingEm, 1) == null) return 1
  let lo = 0.35
  let hi = 1

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2

    if (huecoReal(texto, font, size, trackingEm, mid) > objetivo) hi = mid
    else lo = mid
  }

  return Math.round(((lo + hi) / 2) * 100) / 100
}

// `espacioDePalabra` escala SOLO el avance del glifo espacio. A tamaño de cartel el espacio entre
// palabras crece con el cuerpo y se abre un hueco que el tracking no debe cerrar: bajar el tracking
// global cerraría también las letras y rompería las contraformas. Es la dimensión correcta —el
// protocolo pide diagnosticar cuál de las cinco es— y se ajusta por tramo, no globalmente.
export const shape = (text, font, size, trackingEm = 0, espacioDePalabra = 1) => {
  const run = font.layout(text)
  const scale = size / font.unitsPerEm
  let x = 0
  let paths = ''
  const ink = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }

  run.glyphs.forEach((g, i) => {
    const p = run.positions[i]
    const gx = x + p.xOffset * scale
    const gy = -p.yOffset * scale
    const d = g.path.toSVG()

    if (d) paths += `<path d="${d}" transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${scale} ${-scale})"/>`
    if (g.bbox && g.bbox.maxX > g.bbox.minX) {
      ink.left = Math.min(ink.left, gx + g.bbox.minX * scale)
      ink.right = Math.max(ink.right, gx + g.bbox.maxX * scale)
      ink.top = Math.min(ink.top, gy - g.bbox.maxY * scale)
      ink.bottom = Math.max(ink.bottom, gy - g.bbox.minY * scale)
    }
    const esEspacio = g.codePoints?.[0] === 32

    x += p.xAdvance * scale * (esEspacio ? espacioDePalabra : 1) + (i === run.glyphs.length - 1 ? 0 : trackingEm * size)
  })

  return { paths, ink, advance: x }
}

// `**negrita**`, `[[acento]]`, `|` salto → palabras con estilo.
export const parseRich = texto =>
  texto.split('|').map(chunk => {
    const palabras = []
    let negrita = false
    let acento = false
    let cur = ''
    const cerrar = () => { if (cur) palabras.push({ texto: cur, negrita, acento }); cur = '' }

    for (let i = 0; i < chunk.length; i++) {
      if (chunk.startsWith('**', i)) { cerrar(); negrita = !negrita; i++; continue }
      if (chunk.startsWith('[[', i)) { cerrar(); acento = true; i++; continue }
      if (chunk.startsWith(']]', i)) { cerrar(); acento = false; i++; continue }
      cur += chunk[i]
    }
    cerrar()

    return palabras.flatMap((p, i) =>
      p.texto.split(/(\s+)/).filter(Boolean).map(t => ({ ...p, texto: t, espacio: /^\s+$/.test(t), primero: i === 0 }))
    )
  })

// Compone un bloque enriquecido: devuelve svg, caja de tinta total y las cajas de cada acento.
const bloqueRico = ({ texto, fuentes, tam, tracking, leading, maxAncho, espacioDePalabra = 1, tintaBase, tintaAcento, align = 'left' }) => {
  const parrafos = parseRich(texto)
  const medir = seg => shape(seg.texto, seg.negrita ? fuentes.negrita : fuentes.base, tam, tracking, espacioDePalabra).advance
  const lineas = []

  for (const segs of parrafos) {
    let linea = []
    let ancho = 0

    for (const seg of segs) {
      const w = medir(seg)

      if (maxAncho && !seg.espacio && ancho + w > maxAncho && linea.length) {
        while (linea.length && linea.at(-1).espacio) linea.pop()
        lineas.push(linea)
        linea = []
        ancho = 0
      }
      if (seg.espacio && !linea.length) continue
      linea.push(seg)
      ancho += w
    }
    while (linea.length && linea.at(-1).espacio) linea.pop()
    if (linea.length) lineas.push(linea)
  }

  const trazadas = lineas.map(linea => {
    let x = 0
    const partes = []
    const ink = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }

    for (const seg of linea) {
      const s = shape(seg.texto, seg.negrita ? fuentes.negrita : fuentes.base, tam, tracking, espacioDePalabra)

      if (!seg.espacio) {
        partes.push({ x, paths: s.paths, acento: seg.acento, ink: s.ink })
        ink.left = Math.min(ink.left, x + s.ink.left)
        ink.right = Math.max(ink.right, x + s.ink.right)
        ink.top = Math.min(ink.top, s.ink.top)
        ink.bottom = Math.max(ink.bottom, s.ink.bottom)
      }
      x += s.advance
    }

    return { partes, ink, avance: x }
  })

  return { trazadas, lineas: trazadas.length }
}

// ── medición sobre píxeles reales ────────────────────────────────────────────────────────────────
const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export const hexLum = hex => lum(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16))
export const ratio = (a, b) => Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100

// Contraste contra el píxel extremo + ocupación (gradiente medio) de la misma zona.
export const medirZona = async (fuente, caja, inkHex, W, H) => {
  const left = Math.max(0, Math.floor(caja.left))
  const top = Math.max(0, Math.floor(caja.top))
  const width = Math.max(1, Math.min(W - left, Math.ceil(caja.right - caja.left)))
  const height = Math.max(1, Math.min(H - top, Math.ceil(caja.bottom - caja.top)))
  const { data } = await sharp(fuente).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const ls = []

  for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
  const ordenado = [...ls].sort((a, b) => a - b)
  const inkL = hexLum(inkHex)
  const bg = inkL > 0.5 ? ordenado[Math.floor(ordenado.length * 0.98)] : ordenado[Math.floor(ordenado.length * 0.02)]
  let g = 0
  let n = 0

  for (let r = 0; r < height; r++) for (let c = 1; c < width; c++) { g += Math.abs(ls[r * width + c] - ls[r * width + c - 1]); n++ }

  return { contraste: ratio(inkL, bg), ocupacion: Math.round((g / n) * 10000) / 10000 }
}

// ── anclas ───────────────────────────────────────────────────────────────────────────────────────
// `linea: n` ancla a la caja de tinta de UNA línea del texto de referencia, no a la unión. Es lo que
// hace declarativo el encaje de un gesto en el hueco de la bandera: se ancla a la última línea, que
// es la corta, en vez de empujar con offsets hasta que deje de chocar.
const cajaRef = (ref, linea) =>
  linea != null && ref.cajasPorLinea?.[linea] ? ref.cajasPorLinea[linea] : ref.caja

const resolverY = (ancla, ctx, H) => {
  if (typeof ancla === 'number') return ancla * H
  if (ancla.frac != null) return ancla.frac * H
  const ref = ctx.get(ancla.ref)

  if (!ref) throw new Error(`ancla y: no existe la capa «${ancla.ref}»`)
  const caja = cajaRef(ref, ancla.linea)
  const base = ancla.borde === 'top' ? caja.top : caja.bottom
  const gap = ancla.gapFactor != null ? ctx.get(ancla.gapDe ?? ancla.ref).tam * ancla.gapFactor : (ancla.gap ?? 0) * H

  return base + gap
}

const resolverX = (ancla, ink, ctx, W) => {
  if (ancla === 'eje') return W / 2 - (ink.left + ink.right) / 2
  if (typeof ancla === 'number') return ancla * W - ink.left
  if (ancla.frac != null) return ancla.frac * W - ink.left
  const ref = ctx.get(ancla.ref)

  if (!ref) throw new Error(`ancla x: no existe la capa «${ancla.ref}»`)
  const caja = cajaRef(ref, ancla.linea)

  // `despues` arranca la tinta DONDE TERMINA la de la referencia, en vez de alinear bordes derechos:
  // es la forma correcta de meter un gesto en el hueco que deja una línea corta.
  if (ancla.borde === 'despues') return caja.right - ink.left
  if (ancla.borde === 'right') return caja.right - ink.right
  if (ancla.borde === 'center') return (caja.left + caja.right) / 2 - (ink.left + ink.right) / 2

  return caja.left - ink.left
}

const resolverTam = (capa, fuentes, ctx, W, H) => {
  const a = capa.ajuste ?? { modo: 'fijo', alto: 0.05 }

  if (a.modo === 'fijo') return { tam: a.alto * H }
  if (a.modo === 'relativo') return { tam: ctx.get(a.a).tam * a.factor }
  const tr = em(capa.tracking ?? (capa.receta ? R[capa.receta].tracking : 0))
  const plano = capa.texto.replace(/\*\*|\[\[|\]\]/g, '')
  const crudoAncho = Math.max(...plano.split('|').map(t => {
    const s = shape(t.trim(), fuentes.base, 100, tr, capa.espacioDePalabra ?? 1)

    return s.ink.right - s.ink.left
  }))
  const crudo = (100 * W * a.objetivo) / crudoAncho
  const min = (a.minAlto ?? 0) * H
  const max = (a.maxAlto ?? 10) * H

  return { tam: Math.min(max, Math.max(min, crudo)), crudo, acotado: crudo < min ? 'piso' : crudo > max ? 'techo' : null }
}

// ── capa de texto ────────────────────────────────────────────────────────────────────────────────
// `dx`/`dy` (fracciones del lienzo) desplazan la capa ya anclada. Sirven para MELLAR: encajar un
// gesto dentro del hueco que deja la bandera del titular, en vez de dejarlo solo en un costado.
const armarTexto = (capa, fuentes, tam, x, y, ctx, W, H, campo) => {
  const tr = em(capa.tracking ?? (capa.receta ? R[capa.receta].tracking : 0))
  const lh = capa.leading ?? (capa.receta ? R[capa.receta].lineHeight : 1.2)
  const tintaBase = resolverTinta(capa.tinta ?? 'fuerte', campo)
  const tintaAcento = resolverTinta(capa.acento ?? 'acento', campo)
  // El factor se despeja midiendo el hueco real de esta fuente a este cuerpo, no con una tabla.
  // Los marcadores se BORRAN, no se sustituyen por espacio: `[[nota]]` con espacios inyectados
  // medía un hueco que no existe y devolvía un factor distinto para el mismo texto.
  // El salto `|` sí es un corte de línea, así que se mide la línea más larga, no la cadena entera.
  const paraMedir = capa.texto.replace(/\*\*|\[\[|\]\]/g, '').split('|')
    .map(t => t.trim()).sort((a2, b2) => b2.length - a2.length)[0]
  const espacio = capa.espacioDePalabra ?? factorDeEspacio(paraMedir, fuentes.base, tam, tr)

  const { trazadas } = bloqueRico({
    texto: capa.texto, fuentes, tam, tracking: tr, leading: lh,
    espacioDePalabra: espacio,
    maxAncho: capa.maxAncho ? capa.maxAncho * W : null
  })
  const topY = y - trazadas[0].ink.top + (capa.dy ?? 0) * H
  const caja = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  const acentos = []
  const cajasPorLinea = []
  let svg = ''

  trazadas.forEach((linea, i) => {
    const baseline = topY + i * tam * lh
    const anclaLinea = capa.alinearLineas === 'propia' && i > 0 ? capa.xLineas?.[i] ?? capa.x : capa.x
    const lx = resolverX(anclaLinea, linea.ink, ctx, W) + (capa.dx ?? 0) * W

    for (const parte of linea.partes) {
      const tinta = parte.acento ? tintaAcento : tintaBase

      svg += `<g fill="${tinta}" transform="translate(${(lx + parte.x).toFixed(2)} ${baseline.toFixed(2)})">${parte.paths}</g>`
      if (parte.acento) {
        acentos.push({
          tinta,
          caja: {
            left: lx + parte.x + parte.ink.left, right: lx + parte.x + parte.ink.right,
            top: baseline + parte.ink.top, bottom: baseline + parte.ink.bottom
          }
        })
      }
    }
    const cl = {
      left: lx + linea.ink.left, right: lx + linea.ink.right,
      top: baseline + linea.ink.top, bottom: baseline + linea.ink.bottom
    }

    cajasPorLinea.push(cl)
    caja.left = Math.min(caja.left, cl.left)
    caja.right = Math.max(caja.right, cl.right)
    caja.top = Math.min(caja.top, cl.top)
    caja.bottom = Math.max(caja.bottom, cl.bottom)
  })

  // Rotación: gira alrededor del centro de la caja de tinta. Para MEDIR no sirve la caja original:
  // se recalcula la caja alineada a ejes de las cuatro esquinas giradas, o el contraste se leería
  // sobre píxeles donde el texto ya no está.
  if (capa.rotacion) {
    const cx = (caja.left + caja.right) / 2
    const cy = (caja.top + caja.bottom) / 2

    svg = `<g transform="rotate(${capa.rotacion} ${cx.toFixed(2)} ${cy.toFixed(2)})">${svg}</g>`
    const rad = (capa.rotacion * Math.PI) / 180
    const gira = (px, py) => ({
      x: cx + (px - cx) * Math.cos(rad) - (py - cy) * Math.sin(rad),
      y: cy + (px - cx) * Math.sin(rad) + (py - cy) * Math.cos(rad)
    })
    const rot = c => {
      const p = [gira(c.left, c.top), gira(c.right, c.top), gira(c.right, c.bottom), gira(c.left, c.bottom)]

      return {
        left: Math.min(...p.map(v => v.x)), right: Math.max(...p.map(v => v.x)),
        top: Math.min(...p.map(v => v.y)), bottom: Math.max(...p.map(v => v.y))
      }
    }
    const r = rot(caja)

    Object.assign(caja, r)
    cajasPorLinea.splice(0, cajasPorLinea.length, ...cajasPorLinea.map(rot))
    acentos.splice(0, acentos.length, ...acentos.map(a => ({ ...a, caja: rot(a.caja) })))
  }

  return { svg, caja, cajasPorLinea, acentos, lineas: trazadas.length, tintaBase, espacioDePalabra: espacio }
}

// Ficha tipográfica exigida por el gate publicitario: rol, familia, archivo, receta, ejes, tamaño,
// leading, tracking, ancho máximo, líneas y tinta. Registra además toda desviación frente a la receta
// AXIS, para que una decisión de campaña quede declarada y no se confunda con el contrato.
const fichaDe = (capa, fuentes, tam, lh, tr, lineas, tinta, campoNombre) => {
  const r = capa.receta ? R[capa.receta] : null
  const desviaciones = []

  if (r) {
    if (capa.peso != null && capa.peso !== r.weight) desviaciones.push(`peso ${capa.peso} vs receta ${r.weight}`)
    if (capa.ancho != null && r.width != null && capa.ancho !== r.width) desviaciones.push(`ancho ${capa.ancho} vs receta ${r.width}`)
    if (capa.leading != null && capa.leading !== r.lineHeight) desviaciones.push(`leading ${capa.leading} vs receta ${r.lineHeight}`)
    if (capa.tracking != null && em(capa.tracking) !== em(r.tracking)) desviaciones.push(`tracking ${capa.tracking} vs receta ${r.tracking}`)
    if (r.maxWords) {
      const palabras = capa.texto.replace(/\*\*|\[\[|\]\]|\|/g, ' ').trim().split(/\s+/).length

      if (palabras > r.maxWords) desviaciones.push(`${palabras} palabras vs maxWords ${r.maxWords} de la receta`)
    }
  }

  return {
    rol: capa.rol ?? capa.id, familia: fuentes.familia, archivo: fuentes.archivo, ejes: fuentes.ejes,
    receta: capa.receta ?? null, tam: Math.round(tam), leading: lh, tracking: tr,
    anchoMax: capa.maxAncho ?? null, lineas, tinta, fondo: `campo ${campoNombre}`,
    desviaciones: desviaciones.length ? desviaciones : null
  }
}

const capaTexto = async (capa, ctx, W, H, campo, campoNombre, plate) => {
  const fuentes = parFuentes(capa)

  if (!fuentes) return { omitida: 'Guttery no está instalada en esta máquina; la capa se omite y no se sustituye por otra familia' }
  const { tam, crudo, acotado } = resolverTam(capa, fuentes, ctx, W, H)
  const guttery = fuentes.familia === 'guttery'
    ? revisarGuttery(capa, tam, resolverTinta(capa.tinta ?? 'fuerte', campo), H)
    : { faltas: [], fuera: [] }
  const candidatos = capa.candidatos ?? [{ x: capa.x, y: capa.y }]
  const piso = capa.piso ?? 4.5
  const ocupacionMax = capa.ocupacionMax ?? 0.008
  const probados = []

  for (const cand of candidatos) {
    const y = resolverY(cand.y, ctx, H)
    const armado = armarTexto({ ...capa, x: cand.x }, fuentes, tam, cand.x, y, ctx, W, H, campo)
    const z = await medirZona(plate, armado.caja, armado.tintaBase, W, H)
    // Un titular de dos líneas puede cruzar de sombra a luz: la caja completa lo promedia y miente.
    // Se mide cada línea por separado y manda la peor.
    const porLinea = []

    if (armado.cajasPorLinea.length > 1) {
      for (const cl of armado.cajasPorLinea) porLinea.push(await medirZona(plate, cl, armado.tintaBase, W, H))
      z.contraste = Math.min(z.contraste, ...porLinea.map(l => l.contraste))
      z.ocupacion = Math.max(z.ocupacion, ...porLinea.map(l => l.ocupacion))
    }
    const acentos = []

    for (const a of armado.acentos) acentos.push({ ...(await medirZona(plate, a.caja, a.tinta, W, H)), tinta: a.tinta })

    // Campo libre por debajo: mide la franja que sigue, no la que ocupa la tinta.
    let aire = null

    if (capa.aireAbajo) {
      const alto = armado.caja.bottom - armado.caja.top
      const franja = { ...armado.caja, top: armado.caja.bottom, bottom: Math.min(H, armado.caja.bottom + alto * capa.aireAbajo) }

      aire = await medirZona(plate, franja, armado.tintaBase, W, H)
      aire.hasta = Math.round((franja.bottom / H) * 1000) / 1000
      aire.pasa = aire.ocupacion <= ocupacionMax && aire.contraste >= piso
    }

    const pasa = z.contraste >= piso && z.ocupacion <= ocupacionMax &&
      acentos.every(a => a.contraste >= piso) && (aire ? aire.pasa : true) && !guttery.faltas.length

    probados.push({ x: cand.x, y: cand.y, ...z, aire: aire ? { contraste: aire.contraste, ocupacion: aire.ocupacion, hasta: aire.hasta, pasa: aire.pasa } : null, pasa })
    if (pasa || cand === candidatos.at(-1)) {
      return {
        ...armado, tam, crudo, acotado, familia: fuentes.familia, peso: capa.peso ?? (capa.receta ? R[capa.receta]?.weight : null), piso, ocupacionMax,
        medida: z, porLinea, acentosMedidos: acentos, aire, guttery,
        proposito: capa.proposito ?? null, voz: capa.voz ?? null, pasa, probados,
        espacioDePalabra: armado.espacioDePalabra,
        ficha: fichaDe(capa, fuentes, tam,
          capa.leading ?? (capa.receta ? R[capa.receta].lineHeight : 1.2),
          em(capa.tracking ?? (capa.receta ? R[capa.receta].tracking : 0)),
          armado.lineas, armado.tintaBase, campoNombre)
      }
    }
  }
}

// ── capa de selección colaborativa (contrato AXIS) ───────────────────────────────────────────────
// El agente autoriza INTENCIÓN, nunca píxeles: target, variante, aire, overlay y cursores. El
// resolver completa defaults y rechaza contradicciones; el adapter mide el objeto real.
// Reglas observadas que el motor hace cumplir:
//   · un cursor `moving` no lleva targetId (presencia sin selección) y no existe cursor sin caja:
//     la pieza siempre tiene un objeto seleccionado y el `moving` pasea fuera de él;
//   · los colaboradores sólo se anclan en esquinas y sus etiquetas viven FUERA de la caja: con dos,
//     el aire lateral se paga dos veces;
//   · `evidence.withinCanvas` es necesario pero NO suficiente: puede dar true con la placa pegada al
//     borde, así que además se exige un margen mínimo declarado.
// El contrato `efeonce.collaboration-selection` (v0.2.0) es headless y exige evidencia geométrica:
// cuerpo del colaborador FUERA del límite, placa próxima al cursor, cursor moving desprendido de la
// selección, y lectura a 390 px.
//
// AUTORIDAD (esto se rompió una vez y no se vuelve a romper). El canon reparte así: «el agente
// autoriza intención —targetId, tipo de objeto, variante, aire, overlay y cursores—; el resolver
// completa defaults, dirección, acción y attachment». **El ancla la declara el autor.** Una primera
// versión de este motor buscaba anclas por su cuenta y PISABA la declarada en silencio: se declaraba
// `bottom-start` y salía `top-start`. Eso no emitía nada inválido, pero le quitaba al autor una
// decisión que el contrato le da, y dejaba un helper que pedía un ancla y la ignoraba.
//
// Comportamiento actual:
//   · ancla declarada  → se respeta. Si no pasa la evidencia, la pieza FALLA e informa qué midió y
//                        qué combinaciones sí habrían pasado. El autor decide, no el motor.
//   · `anclas: 'auto'` → sólo entonces el motor busca entre las combinaciones del propio contrato, y
//                        deja registrado en la evidencia que el ancla la resolvió él y no el autor.
//
// Variantes del contrato: eight-handles · four-corners · open-brackets · single-collaborator ·
// multi-collaborator · collaborator-corner-action · collaborator-moving.
// Para enfatizar UNA PALABRA, `open-brackets` es la más liviana y la que menos compite con la tinta.
const capaSeleccion = async (capa, ctx, W, H, plate) => {
  // Tres objetivos posibles, en orden de preferencia para guiar la vista:
  //   `sobreAcento` → la caja envuelve UNA PALABRA marcada con `[[…]]`. Énfasis preciso: la caja y
  //                   los cursores apuntan a la palabra que carga el sentido.
  //   `sobre`       → una capa entera (el titular), como el caso de referencia.
  //   `sobreRegion` → una región del lienzo (un objeto de la foto). Exige que el objeto esté aislado
  //                   y con aire; si no, la caja enmarca sin decir nada.
  const acentoRef = capa.sobreAcento ? ctx.get(capa.sobreAcento.capa) : null

  if (capa.sobreAcento && !acentoRef) throw new Error(`selección: no existe la capa «${capa.sobreAcento.capa}»`)
  const acentoCaja = acentoRef?.acentos?.[capa.sobreAcento?.indice ?? 0]

  if (capa.sobreAcento && !acentoCaja) {
    throw new Error(`selección: la capa «${capa.sobreAcento.capa}» no tiene un acento [[…]] en la posición ${capa.sobreAcento.indice ?? 0}`)
  }

  const objetivo = acentoCaja
    ? { caja: acentoCaja.caja, tam: acentoCaja.caja.bottom - acentoCaja.caja.top }
    : capa.sobreRegion
      ? {
          caja: {
            left: capa.sobreRegion.x0 * W, right: capa.sobreRegion.x1 * W,
            top: capa.sobreRegion.y0 * H, bottom: capa.sobreRegion.y1 * H
          },
          tam: (capa.sobreRegion.y1 - capa.sobreRegion.y0) * H
        }
      : ctx.get(capa.sobre)

  if (!objetivo) throw new Error(`selección: no existe la capa «${capa.sobre}» ni una región declarada`)

  const etiquetaFont = abrir(path.join(FUENTES, POPPINS[700]))
  const measureLabel = (label, size) => shape(label, etiquetaFont, size).advance
  const targetId = capa.sobre ?? capa.sobreAcento?.capa ?? 'objeto'

  // ── Jerarquía de la placa ───────────────────────────────────────────────────────────────────
  // El adapter dimensiona la placa por el ANCHO DEL LIENZO (`labelFontSize = max(11, W*0.012) *
  // collaboratorScale`), no por el objeto que enmarca. Con `collaboratorScale` fijo, la misma placa
  // queda en 0.21× de una palabra grande y en 0.93× de un titular chico: no hay jerarquía, hay azar.
  //
  // El caso aprobado «¿Claude o Codex?» da la relación: scale 1.7 sobre 1152 de ancho con un titular
  // de 98 px → placa de 50.5 px = **0.52× la voz enmarcada**. Se toma esa relación como objetivo y se
  // despeja la escala que la produce en cada pieza. Declarar `collaboratorScale` a mano sigue siendo
  // posible y entonces manda el autor.
  const PLACA_VS_VOZ = capa.placaVsVoz ?? 0.52
  const altoVozEnmarcada = objetivo.caja.bottom - objetivo.caja.top
  const escalaDerivada = (PLACA_VS_VOZ * altoVozEnmarcada) / (2.15 * Math.max(11, W * 0.012))
  const presentacion = {
    collaboratorScale: capa.presentacion?.collaboratorScale ?? Math.round(escalaDerivada * 100) / 100,
    localCursorScale: capa.presentacion?.localCursorScale ?? 1.15,
    ...(capa.presentacion?.participantColors ? { participantColors: capa.presentacion.participantColors } : {})
  }
  const margen = (capa.margenMinimo ?? 0.02) * Math.min(W, H)

  // El mapa del sujeto se calcula una vez y lo usa el buscador: así una combinación que clava el
  // puntero en una cara se descarta durante la búsqueda, no después.
  const sujeto = await mapaDeDetalle(plate, W, H)
  const fraccionSobreSujeto = caja => {
    const area = Math.max(1, (caja.right - caja.left) * (caja.bottom - caja.top))
    let inv = 0

    for (const c of sujeto) {
      const w2 = Math.min(caja.right, c.right) - Math.max(caja.left, c.left)
      const h2 = Math.min(caja.bottom, c.bottom) - Math.max(caja.top, c.top)

      if (w2 > 0 && h2 > 0) inv += w2 * h2
    }

    return inv / area
  }

  const cajasDeCursoresYPlacas = render => {
    const cajas = []

    for (const c of (render.evidence.cursorEvidence ?? [])) {
      if (c.labelBounds) cajas.push(c.labelBounds)
      if (c.hotspot) {
        // El cuerpo del puntero, no sólo su punta: en el borde derecho se recortaba y nadie lo veía.
        const lado = Math.max(24, W * 0.026) * (presentacion.localCursorScale ?? 1.15)

        cajas.push({ left: c.hotspot.x - lado * 0.2, top: c.hotspot.y - lado * 0.2, right: c.hotspot.x + lado, bottom: c.hotspot.y + lado })
      }
    }

    return cajas
  }

  const intentar = (anclasColab, anclaLocal, region) => {
    let i = -1
    const manifest = resolveCollaborationSelectionIntent({
      targetId,
      targetKind: capa.tipoObjetivo ?? (capa.sobreRegion ? 'object' : 'text'),
      variant: capa.variante ?? 'eight-handles',
      padding: capa.aire ?? 'standard',
      overlay: capa.overlay ?? 'subtle',
      cursors: capa.cursores.map(c => {
        const esMoving = c.kind === 'moving' || c.estado === 'moving'

        if (!esMoving && c.kind === 'collaborator') i++

        return {
          id: c.id,
          kind: c.kind === 'moving' ? 'collaborator' : c.kind,
          ...(esMoving
            ? {
                state: 'moving', canvasRegion: c.region ?? region ?? 'center-start', action: c.accion ?? 'move',
                // `direction` la completa el resolver; sólo viaja si el autor la declaró.
                ...(c.direccion ? { direction: c.direccion } : {})
              }
            : {
                targetId,
                anchor: c.kind === 'local' ? anclaLocal : anclasColab[i],
                action: c.accion ?? 'select'
              }),
          ...(c.label ? { label: c.label, participantKind: c.participantKind ?? 'role' } : {})
        }
      })
    })
    const render = renderCollaborationSelection({
      manifest, targetBounds: objetivo.caja, canvas: { width: W, height: H }, measureLabel,
      presentation: presentacion
    })
    const cajas = cajasDeCursoresYPlacas(render)
    const pegadas = cajas
      .map((c, i) => ({ id: (render.evidence.cursorEvidence ?? [])[Math.floor(i / 1)]?.id ?? 'control', labelBounds: c }))
      .filter(x => x.labelBounds.left < margen || x.labelBounds.top < margen ||
        x.labelBounds.right > W - margen || x.labelBounds.bottom > H - margen)
    const enSujeto = cajas.filter(c => fraccionSobreSujeto(c) > 0.35)

    // Colisión con el texto YA colocado, dentro de la búsqueda: si se evalúa después, el motor no
    // puede evitarla y sólo sirve para reprobar. La palabra enmarcada está exceptuada; sus otras
    // líneas no —una placa encima de la segunda línea del titular es colisión igual—.
    const sobreTexto = []

    for (const [id, previa] of ctx) {
      if (!previa.caja || previa.esFirma) continue
      // El solape se normaliza por el área del OBJETIVO, no por la de la línea: la palabra enmarcada
      // está contenida en su línea, así que medido al revés el cociente es pequeño y la excepción
      // nunca disparaba. Ese era el 55 % constante que aparecía a cualquier ancho.
      const cajasPrevias = (previa.cajasPorLinea?.length ? previa.cajasPorLinea : [previa.caja])
        .filter(c2 => !(id === (capa.sobre ?? capa.sobreAcento?.capa) && solapeEntre(objetivo.caja, c2) >= 0.6))

      for (const c of cajas) {
        for (const c2 of cajasPrevias) {
          const w2 = Math.min(c.right, c2.right) - Math.max(c.left, c2.left)
          const h2 = Math.min(c.bottom, c2.bottom) - Math.max(c.top, c2.top)
          const area = Math.max(1, (c.right - c.left) * (c.bottom - c.top))

          if (w2 > 0 && h2 > 0 && (w2 * h2) / area > 0.06) sobreTexto.push(id)
        }
      }
    }

    return {
      manifest, render, pegadas, enSujeto, cajas, sobreTexto,
      pasa: render.evidence.withinCanvas && !pegadas.length && !enSujeto.length && !sobreTexto.length
    }
  }

  const nColab = capa.cursores.filter(c => c.kind === 'collaborator' && c.estado !== 'moving').length
  const CA = AXIS_COLLABORATION_SELECTION_COLLABORATOR_ANCHORS
  const declaradas = {
    colab: capa.cursores.filter(c => c.kind === 'collaborator' && c.estado !== 'moving').map(c => c.ancla),
    local: capa.cursores.find(c => c.kind === 'local')?.ancla ?? null
  }
  const autoriza = capa.anclas === 'auto' ||
    declaradas.colab.some(a => !a) || (capa.cursores.some(c => c.kind === 'local') && !declaradas.local)
  const combos = []

  // Las regiones del cursor `moving` también entran en la búsqueda cuando el autor no declaró una:
  // su placa vive sobre la foto y sólo algunas regiones la sostienen. Medido en un caso: de las
  // nueve del contrato, una sola daba 4.05:1 y el resto caía entre 1.77 y 2.77.
  const hayMovingSinRegion = capa.cursores.some(c => (c.kind === 'moving' || c.estado === 'moving') && !c.region)
  const REGIONES = hayMovingSinRegion
    ? ['center-start', 'center-end', 'upper-start', 'upper-end', 'upper-center', 'lower-start', 'lower-end', 'center', 'lower-center']
    : [undefined]

  if (!autoriza && !hayMovingSinRegion) {
    combos.push({ colab: declaradas.colab, local: declaradas.local ?? 'bottom-end' })
  } else if (!autoriza) {
    for (const region of REGIONES) combos.push({ colab: declaradas.colab, local: declaradas.local ?? 'bottom-end', region })
  } else {
    // Combinaciones del propio contrato, ordenadas de menos a más invasivas para la lectura.
    const locales = ['bottom-end', 'end-center', 'bottom-start', 'top-end', 'start-center', 'bottom-center']
      .filter(a => AXIS_COLLABORATION_SELECTION_ANCHORS.includes(a))
    const setsColab = nColab === 0
      ? [[]]
      : nColab === 1
        ? CA.map(a => [a])
        : CA.flatMap(a => CA.filter(b => b !== a).map(b => [a, b]))

    for (const colab of setsColab) for (const local of locales) for (const region of REGIONES) combos.push({ colab, local, region })
  }

  const probados = []
  let elegido = null

  for (const combo of combos) {
    const r = intentar(combo.colab, combo.local, combo.region)

    probados.push({
      colaboradores: combo.colab, local: combo.local, region: combo.region ?? null,
      dentroDelLienzo: r.render.evidence.withinCanvas,
      placasPegadas: r.pegadas.map(p => p.id)
    })
    if (r.pasa) { elegido = { ...r, combo }; break }
  }

  const r = elegido ?? intentar(combos[0].colab, combos[0].local, combos[0].region)
  // Cuando el autor declaró el ancla y no pasó, el motor NO la cambia: informa qué combinaciones sí
  // habrían pasado para que la decisión siga siendo del autor.
  const alternativas = []

  if (!elegido && !autoriza) {
    const locales = ['bottom-end', 'end-center', 'bottom-start', 'top-end', 'start-center', 'bottom-center']
      .filter(a => AXIS_COLLABORATION_SELECTION_ANCHORS.includes(a))
    const setsColab = nColab === 0 ? [[]] : nColab === 1 ? CA.map(a => [a]) : CA.flatMap(a => CA.filter(b => b !== a).map(b => [a, b]))

    for (const colab of setsColab) {
      for (const local of locales) {
        if (alternativas.length >= 3) break
        if (intentar(colab, local, undefined).pasa) alternativas.push({ colaboradores: colab, local })
      }
    }
  }
  const overlay = r.render.overlay.replace(
    /<text x="(-?[\d.]+)" y="(-?[\d.]+)" fill="([^"]+)" font-family="[^"]*" font-size="([\d.]+)" font-weight="700">([^<]*)<\/text>/g,
    (_, x, y, fill, size, label) =>
      `<g fill="${fill}" transform="translate(${x} ${y})">${shape(label.replaceAll('&amp;', '&'), etiquetaFont, Number(size)).paths}</g>`
  )

  if (/<text/.test(overlay)) throw new Error('selección: quedó un <text> sin convertir a trazos')

  // Lectura a 390 px, que el contrato exige como evidencia: la placa se escala con la pieza.
  const escala390 = 390 / W
  const placas = (r.render.evidence.cursorEvidence ?? []).filter(c => c.labelBounds)
  const altoPlaca390 = placas.length
    ? Math.round(Math.min(...placas.map(c => (c.labelBounds.bottom - c.labelBounds.top) * escala390)) * 10) / 10
    : null

  // ── Los contrastes que el adapter NO resuelve ───────────────────────────────────────────────
  // El adapter elige la tinta DENTRO de la placa por WCAG contra el color del participante. Lo que
  // nadie mide es la placa contra la FOTO y el trazo de la caja contra la FOTO: una placa naranja
  // sobre una escena cálida, o el trazo `#a6cdf5` sobre un cielo claro, desaparecen aunque el texto
  // de la placa mida 7:1 contra su propio fondo. El canon lo advierte —«los controles están
  // diseñados para fondo oscuro y desaparecen sobre claro»— pero no lo medía nadie.
  const placas2 = [...r.render.overlay.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)" rx="[\d.]+" fill="(#[0-9a-fA-F]{6})"\/>/g)]
  const contrastePlacas = []

  for (const m of placas2) {
    const caja = { left: +m[1], top: +m[2], right: +m[1] + +m[3], bottom: +m[2] + +m[4] }
    // Anillo alrededor de la placa: la placa es opaca, así que lo que importa es su borde contra la foto.
    const margen = Math.max(4, +m[4] * 0.35)
    const anillo = { left: caja.left - margen, top: caja.top - margen, right: caja.right + margen, bottom: caja.bottom + margen }
    const z = await medirZona(plate, anillo, m[5], W, H)

    contrastePlacas.push({ color: m[5], contraste: z.contraste, alto: Math.round(+m[4]) })
  }

  // El trazo de la selección: se muestrea la banda del perímetro de la caja del objetivo.
  const trazo = (r.render.overlay.match(/stroke="(#[0-9a-fA-F]{6})"/) ?? [])[1] ?? '#a6cdf5'
  const b0 = objetivo.caja
  const grosor = Math.max(6, (b0.bottom - b0.top) * 0.08)
  // Los CUATRO lados: medir sólo arriba y abajo dejaba pasar cajas cuyos costados caen sobre luz.
  const bandas = [
    { left: b0.left, right: b0.right, top: b0.top - grosor, bottom: b0.top + grosor },
    { left: b0.left, right: b0.right, top: b0.bottom - grosor, bottom: b0.bottom + grosor },
    { left: b0.left - grosor, right: b0.left + grosor, top: b0.top, bottom: b0.bottom },
    { left: b0.right - grosor, right: b0.right + grosor, top: b0.top, bottom: b0.bottom }
  ]
  const medidasTrazo = []

  for (const banda of bandas) medidasTrazo.push((await medirZona(plate, banda, trazo, W, H)).contraste)

  // Tamaño de la placa en relación con la voz que enmarca: jerarquía, no sólo legibilidad.
  const tamPlaca = placas2.length ? Math.round(+placas2[0][4]) : null
  const refTam = ctx.get(capa.sobreAcento?.capa ?? capa.sobre)?.tam ?? null

  // Cajas de los cursores y placas, para que el detector de colisión las trate como tinta: un
  // puntero encima de una palabra es una colisión aunque cada capa pase su contraste por separado.
  const cajasControles = r.cajas ?? []

  // ¿Algún control cae sobre el sujeto? El cursor local es negro con filo blanco: encima de una
  // cara se lee como un puntero olvidado en la captura, no como presencia.
  const sobreElSujeto = (r.enSujeto ?? []).map(caja => ({ caja, fraccion: Math.round(fraccionSobreSujeto(caja) * 100) / 100 }))

  return {
    svg: overlay,
    cajasPorLinea: cajasControles,
    sobreElSujeto,
    varianteCaja: capa.variante ?? 'eight-handles',
    caja: objetivo.caja,
    tam: objetivo.tam,
    evidencia: {
      contrato: `${AXIS_COLLABORATION_SELECTION_CONTRACT.id}@${AXIS_COLLABORATION_SELECTION_CONTRACT.version}`,
      variante: capa.variante ?? 'eight-handles',
      anclas: autoriza ? 'resueltas por el motor (el autor pidió `anclas: auto`)' : 'declaradas por el autor',
      anclasResueltasPorElMotor: autoriza ? (elegido?.combo ?? null) : null,
      combinacionesProbadas: probados.length,
      ...(alternativas.length ? { combinacionesQueSiPasarian: alternativas } : {}),
      dentroDelLienzo: r.render.evidence.withinCanvas,
      cursores: r.manifest.cursors.map(c => ({ id: c.id, kind: c.kind, state: c.state ?? 'idle', ancla: c.anchor ?? null, region: c.canvasRegion ?? null })),
      placasPegadasAlBorde: r.pegadas.map(c => ({ id: c.id, labelBounds: c.labelBounds })),
      altoDePlacaA390px: altoPlaca390,
      margenMinimo: Math.round(margen),
      escalaDePlaca: { objetivoPlacaVsVoz: PLACA_VS_VOZ, collaboratorScale: presentacion.collaboratorScale, derivada: capa.presentacion?.collaboratorScale == null },
      controlesSobreElSujeto: sobreElSujeto.length ? sobreElSujeto.map(x => x.fraccion) : null,
      cajasDeControl: cajasControles.map(c => ({ left: Math.round(c.left), top: Math.round(c.top), right: Math.round(c.right), bottom: Math.round(c.bottom) })),
      contrastePlacaContraFoto: contrastePlacas,
      contrasteTrazoContraFoto: { color: trazo, arriba: medidasTrazo[0], abajo: medidasTrazo[1], izquierda: medidasTrazo[2], derecha: medidasTrazo[3], peor: Math.min(...medidasTrazo) },
      placaVsVozEnmarcada: tamPlaca && refTam ? Math.round((tamPlaca / refTam) * 100) / 100 : null,
      // `sinCombinacionValida` sólo aplica cuando el motor tenía permiso para buscar; si el ancla la
      // declaró el autor, lo que corresponde informar es qué midió y qué alternativas sí pasan.
      ...(elegido || !autoriza ? {} : { sinCombinacionValida: probados.slice(0, 6) })
    },
    // La caja y los cursores son gráficos de control sobre el objeto ya medido: su lectura la
    // garantiza el fondo oscuro de escenografía que exige el contrato, no una medición propia.
    medida: { contraste: null, ocupacion: null },
    piso: capa.pisoControles ?? 3,
    ocupacionMax: null,
    // Los controles son elementos gráficos necesarios: el piso WCAG para eso es 3:1, no 4.5.
    pasa: Boolean(elegido) &&
      contrastePlacas.every(pl => pl.contraste >= (capa.pisoControles ?? 3)) &&
      medidasTrazo.every(c => c >= (capa.pisoControles ?? 3)) &&
      !sobreElSujeto.length
  }
}

// Mapa de detalle: aproxima dónde está el SUJETO narrativo por el gradiente local. Un cursor o una
// placa encima de una cara arruina la pieza y ninguna medición de contraste lo ve —el puntero puede
// tener 10:1 contra la piel y aun así estar clavado en el ojo de alguien—. Es una aproximación
// declarada, no segmentación semántica: marca el decil de mayor detalle, que en estas fotos es la
// cara y las manos del sujeto.
const mapaDeDetalle = async (file, W, H, celdas = 16) => {
  const ancho = 320
  const alto = Math.max(1, Math.round((H / W) * ancho))
  const { data } = await sharp(file).resize({ width: ancho, height: alto, fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const ls = []

  for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
  const cw = Math.max(1, Math.floor(ancho / celdas))
  const ch = Math.max(1, Math.floor(alto / celdas))
  const rejilla = []

  for (let cy = 0; cy < celdas; cy++) {
    for (let cx = 0; cx < celdas; cx++) {
      let g = 0
      let n = 0

      for (let y = cy * ch; y < (cy + 1) * ch && y < alto - 1; y++) {
        for (let x = cx * cw + 1; x < (cx + 1) * cw && x < ancho; x++) {
          g += Math.abs(ls[y * ancho + x] - ls[y * ancho + x - 1])
          n++
        }
      }
      rejilla.push({ x0: (cx * cw) / ancho, x1: ((cx + 1) * cw) / ancho, y0: (cy * ch) / alto, y1: ((cy + 1) * ch) / alto, detalle: n ? g / n : 0 })
    }
  }
  const orden = [...rejilla].map(c => c.detalle).sort((a2, b2) => b2 - a2)
  const umbral = orden[Math.floor(orden.length * 0.12)]

  // DILATACIÓN. Una cara no es una mancha de detalle: son bordes (ojos, gafas, barba, nacimiento del
  // pelo) rodeando zonas LISAS —la frente, la mejilla—. Sin dilatar, un cursor clavado en la frente
  // pasa el filtro porque ahí el gradiente es bajo. Se expande cada celda caliente a sus vecinas,
  // que es lo que convierte «bordes del rostro» en «el rostro».
  const caliente = new Set()

  rejilla.forEach((c, i) => { if (c.detalle >= umbral) caliente.add(i) })
  const expandida = new Set()

  for (const i of caliente) {
    const cx = i % celdas
    const cy = Math.floor(i / celdas)

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx
        const ny = cy + dy

        if (nx >= 0 && nx < celdas && ny >= 0 && ny < celdas) expandida.add(ny * celdas + nx)
      }
    }
  }

  return [...expandida].map(i => rejilla[i]).filter(Boolean)
    .map(c => ({ left: c.x0 * W, right: c.x1 * W, top: c.y0 * H, bottom: c.y1 * H }))
}

// Colisión de tinta entre capas. El contraste se mide contra el PLATE, así que dos textos pueden
// pasar sus puertas por separado y aun así estar montados uno sobre otro: pasó con el gesto Guttery
// encajado en el hueco de un titular de dos líneas, que en 9:16 y 16:9 terminó encima de la última
// palabra. Ninguna medición de fondo lo ve. Se compara caja de tinta contra caja de tinta.
//
// El solape se tolera hasta `solapeMax` del área de la capa nueva: un gesto puede morder levemente
// el hueco de la bandera —eso es encajar—, pero no montarse sobre la tinta.
// Se compara contra las cajas POR LÍNEA, no contra la unión: en un titular de dos líneas con bandera
// la unión incluye el hueco, y un gesto encajado ahí —que es exactamente lo que queremos— se
// reportaría como choque del 80 %. La tinta real es la de cada línea.
const cajasDeTinta = capa => (capa.cajasPorLinea?.length ? capa.cajasPorLinea : capa.caja ? [capa.caja] : [])

const solapeEntre = (a, b) => {
  const ancho = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const alto = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)

  if (ancho <= 0 || alto <= 0) return 0
  const area = Math.max(1, (a.right - a.left) * (a.bottom - a.top))

  return (ancho * alto) / area
}

const solapeMaximo = (nueva, previa) => {
  let peor = 0

  for (const a of cajasDeTinta(nueva)) for (const b of cajasDeTinta(previa)) peor = Math.max(peor, solapeEntre(a, b))

  return peor
}

// ── capa de firma ────────────────────────────────────────────────────────────────────────────────
// 🔴 LA FIRMA NO SE TOCA. Posición, escala y tratamiento son una decisión CERRADA del operador,
// trabajada en sesiones anteriores y fijada en el contrato fotográfico aprobado
// (EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1 §5): SVG oficial, centrada horizontal, centro vertical a
// 0.935 del alto en 4:5, ancho 0.15 del lienzo, variante por contraste medido.
//
// En esta sesión la medí como «foco aislado» y propuse agruparla con el titular o agrandarla. Fue un
// error de criterio: medir una decisión cerrada no la reabre. El trabajo de la capa gráfica es el
// TEXTO y lo que juega con él —caja, cursores, jerarquías, pesos y contrastes—, no la firma.
// El anclaje relativo que sigue existe por si una superficie futura lo necesita; el default es el
// contrato y no se cambia sin decisión del operador.
const capaFirma = async (capa, ctx, W, H, plate) => {
  const ancho = Math.round(capa.ancho * W)
  const alto = Math.round(ancho * LOGO_RATIO)
  const inkFalso = { left: 0, right: ancho, top: 0, bottom: alto }
  const izquierda = capa.x === 'eje'
    ? Math.round(W / 2 - ancho / 2)
    : Math.round(resolverX(capa.x, inkFalso, ctx, W))
  const arriba = Math.round(resolverY(capa.y, ctx, H) - (capa.anclaVertical === 'top' ? 0 : alto / 2))
  const caja = { left: izquierda, top: arriba, right: izquierda + ancho, bottom: arriba + alto }
  // La variante la decide el contraste medido del lecho, no el tono aparente del plate.
  const blanco = await medirZona(plate, caja, '#ffffff', W, H)
  const navy = await medirZona(plate, caja, '#023c70', W, H)
  const variante = blanco.contraste >= navy.contraste ? 'blanco' : 'navy'
  const medida = variante === 'blanco' ? blanco : navy
  const buf = await sharp(LOGOS[variante], { density: 600 }).resize({ width: ancho }).png().toBuffer()
  const piso = capa.piso ?? 4.5

  // Aire de protección: proximidad no es contacto. Se exige un margen libre alrededor del logo
  // proporcional a su propio alto, y se verifica contra las cajas de tinta ya colocadas.
  const aireMin = (capa.aireProteccion ?? 0.5) * alto
  const invasores = []

  for (const [id, previa] of ctx) {
    if (!previa.caja || previa.esFirma) continue
    const dx = Math.max(previa.caja.left - caja.right, caja.left - previa.caja.right, 0)
    const dy = Math.max(previa.caja.top - caja.bottom, caja.top - previa.caja.bottom, 0)
    const distancia = Math.hypot(dx, dy)

    if (distancia < aireMin) invasores.push({ capa: id, distanciaPx: Math.round(distancia), minimoPx: Math.round(aireMin) })
  }

  return {
    compuesto: { input: buf, left: caja.left, top: caja.top },
    caja, tam: alto, variante, medida, piso, esFirma: true,
    aireProteccion: { minimoPx: Math.round(aireMin), invasores },
    // El lecho de la firma es, por diseño, un primer plano desenfocado: su ocupación no se acota.
    ocupacionMax: null, pasa: medida.contraste >= piso && !invasores.length
  }
}

// Separación entre voces vecinas. El contraste de LEGIBILIDAD (tinta contra fondo) no es el
// contraste TIPOGRÁFICO (una voz contra la otra): dos textos pueden medir 15:1 cada uno contra el
// plate y aun así leerse como una sola mancha, porque entre ellos no hay ningún salto. El canon pide
// vecinos distintos en ≥2 ejes —peso, tinta, escala, familia— y esta función los mide en vez de
// suponerlos. El eje «tinta» sólo cuenta si hay un salto tonal real entre las dos tintas.
const SALTO_DE_TINTA_MINIMO = 1.3

const separacionEntreVoces = (a, b) => {
  const tinta = ratio(hexLum(a.tintaBase), hexLum(b.tintaBase))
  const escala = Math.round((Math.max(a.tam, b.tam) / Math.min(a.tam, b.tam)) * 100) / 100
  const ejes = []

  if (a.familia !== b.familia) ejes.push('familia')
  if (a.peso !== b.peso) ejes.push('peso')
  if (escala >= 1.2) ejes.push('escala')
  if (tinta >= SALTO_DE_TINTA_MINIMO) ejes.push('tinta')

  // Dos voces que comparten LÍNEA ÓPTICA —un gesto encajado en el hueco de la bandera, por ejemplo—
  // se leen como una sola mancha si además comparten tinta, por mucho que difieran en familia y
  // escala. Cuando sus bandas verticales se solapan, el eje «tinta» deja de ser opcional.
  const bandas = Math.min(a.caja.bottom, b.caja.bottom) - Math.max(a.caja.top, b.caja.top)
  const mismaLinea = bandas > 0.35 * Math.min(a.caja.bottom - a.caja.top, b.caja.bottom - b.caja.top)
  const suficiente = mismaLinea
    ? ejes.length >= 2 && ejes.includes('tinta')
    : ejes.length >= 2

  return {
    tintaA: a.tintaBase, tintaB: b.tintaBase, saltoDeTinta: tinta,
    escala, ejes, mismaLineaOptica: mismaLinea, suficiente,
    exigeTinta: mismaLinea
  }
}

// ── render de una pieza ──────────────────────────────────────────────────────────────────────────
export const componer = async ({ pieza, plate, omitir = [] }) => {
  const { width: W, height: H } = await sharp(plate).metadata()
  const campo = CAMPOS[pieza.campo]

  if (!campo) throw new Error(`${pieza.id}: campo desconocido «${pieza.campo}»`)
  const ctx = new Map()
  const orden = []
  const extras = []
  let svg = ''

  for (const capa of pieza.capas) {
    if (omitir.includes(capa.id)) continue
    const r = capa.tipo === 'firma'
      ? await capaFirma(capa, ctx, W, H, plate)
      : capa.tipo === 'seleccion'
        ? await capaSeleccion(capa, ctx, W, H, plate)
        : await capaTexto(capa, ctx, W, H, campo, pieza.campo, plate)

    if (r.omitida) { orden.push({ capa, r }); continue }

    // Contra las capas de texto ya colocadas, no contra el fondo. La selección también entra: sus
    // cursores y placas son tinta encima de la pieza, y un puntero sobre una palabra es colisión.
    if (r.caja) {
      const solapeMax = capa.solapeMax ?? 0.06
      const choques = []

      for (const [id, previa] of ctx) {
        if (!previa.caja || previa.esFirma) continue
        // La selección envuelve a propósito la PALABRA que enmarca: ese solape es su razón de ser.
        // Pero las demás líneas de esa misma capa no están exceptuadas — una placa encima de la
        // segunda línea del titular es colisión igual, y exceptuar la capa entera la dejaba pasar.
        let contra = previa

        if (capa.tipo === 'seleccion' && (id === capa.sobre || id === capa.sobreAcento?.capa)) {
          if (id === capa.sobre) continue
          const objetivoCaja = r.caja
          const otras = cajasDeTinta(previa).filter(c => solapeEntre(objetivoCaja, c) < 0.6)

          if (!otras.length) continue
          contra = { cajasPorLinea: otras }
        }
        const solape = solapeMaximo(r, contra)

        if (solape > solapeMax) choques.push({ con: id, solape: Math.round(solape * 100) / 100 })
      }
      if (choques.length) {
        r.choques = choques
        r.pasa = false
      }
    }
    ctx.set(capa.id, r)
    if (r.compuesto) extras.push(r.compuesto)
    else svg += r.svg
    orden.push({ capa, r })
  }

  const master = await sharp(plate)
    .composite([
      ...(svg ? [{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`) }] : []),
      ...extras
    ])
    .png()
    .toBuffer()

  // Voces de texto en el orden en que se leen; se mide el salto entre cada par consecutivo.
  const voces = orden.filter(({ capa, r }) => (capa.tipo ?? 'texto') === 'texto' && !r.omitida && r.tintaBase)
  const separaciones = []

  for (let i = 1; i < voces.length; i++) {
    const sep = separacionEntreVoces(voces[i - 1].r, voces[i].r)

    separaciones.push({ entre: [voces[i - 1].capa.id, voces[i].capa.id], ...sep })
    if (!sep.suficiente) voces[i].r.separacionInsuficiente = sep
  }

  const informe = orden.map(({ capa, r }) => r.omitida
    ? { id: capa.id, omitida: r.omitida, pasa: true }
    : {
        id: capa.id, tipo: capa.tipo ?? 'texto', familia: r.familia ?? 'logo',
        tam: Math.round(r.tam), lineas: r.lineas ?? null,
        acotado: r.acotado ?? null, tamNatural: r.crudo ? Math.round(r.crudo) : null,
        variante: r.variante ?? null,
        aireProteccion: r.aireProteccion ?? null,
        anchoTinta: Math.round(((r.caja.right - r.caja.left) / W) * 1000) / 1000,
        // Caja de tinta en píxeles: sin esto, cualquier medición externa tiene que adivinar el ancho.
        cajaPx: { left: Math.round(r.caja.left), top: Math.round(r.caja.top), right: Math.round(r.caja.right), bottom: Math.round(r.caja.bottom) },
        // Cajas por línea y tipo de anclaje: sin esto una auditoría externa compara contra la caja
        // unión (que en un titular de dos líneas incluye el hueco) y supone alineación izquierda
        // aunque la voz vaya centrada. Las dos suposiciones dan números falsos.
        lineasPx: r.cajasPorLinea?.map(c => ({ left: Math.round(c.left), top: Math.round(c.top), right: Math.round(c.right), bottom: Math.round(c.bottom) })) ?? null,
        anclaX: capa.x === 'eje' ? 'eje' : typeof capa.x === 'object' && capa.x.ref ? `ref:${capa.x.ref}` : 'margen',
        top: Math.round((r.caja.top / H) * 1000) / 1000,
        bottom: Math.round((r.caja.bottom / H) * 1000) / 1000,
        evidencia: r.evidencia ?? null,
        variante: r.varianteCaja ?? r.variante ?? null,
        contraste: r.medida.contraste, piso: r.piso,
        ocupacion: r.medida.ocupacion, ocupacionMax: r.ocupacionMax,
        aireAbajo: r.aire ?? null,
        ficha: r.ficha ?? null,
        proposito: r.proposito ?? null,
        voz: r.voz ?? null,
        choques: r.choques ?? null,
        separacionInsuficiente: r.separacionInsuficiente ?? null,
        gutteryFaltas: r.guttery?.faltas.length ? r.guttery.faltas : null,
        gutteryFueraDeLoObservado: r.guttery?.fuera.length ? r.guttery.fuera : null,
        porLinea: r.porLinea?.length ? r.porLinea.map(l => ({ contraste: l.contraste, ocupacion: l.ocupacion })) : null,
        rotacion: capa.rotacion ?? null,
        espacioDePalabra: r.espacioDePalabra ?? null,
        acentos: r.acentosMedidos?.length ? r.acentosMedidos : null,
        candidatosProbados: r.probados && r.probados.length > 1 ? r.probados : null,
        pasa: r.pasa
      })

  for (const c of informe) if (c.separacionInsuficiente) c.pasa = false

  return { master, W, H, informe, separaciones }
}
