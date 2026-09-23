// Accesibilidad y contraste de TEXTO SOBRE FOTOGRAFÍA para piezas publicitarias estáticas.
//
// Módulo puro: funciones sin efectos, probadas contra valores de referencia publicados
// (scripts/foto/accesibilidad.test.mjs). Lo consumen el compositor (`pnpm foto:componer:cta`), su gate
// (`pnpm foto:cta:gate`) y el reporte (`pnpm foto:accesibilidad`).
//
// Política (skill greenhouse-typography-accessibility + a11y-architect): se APRUEBA con WCAG 2.2 AA; APCA es
// verificación perceptual de respaldo: avisa en las voces y, en el CTA, BLOQUEA junto con el daltonismo (decisión del
// operador, 2026-09-23; el gate lo aplica, exceptuable como `cta-perceptual`). Los umbrales NO viven acá: salen del contrato
// AXIS `axisAdvertising.accessibility` (SSOT), que es el que gobierna los pisos de la publicidad.
//
// Fuentes verificadas el 2026-09-22:
//   · WCAG 2.2 — luminancia relativa y razón de contraste (SC 1.4.3, 1.4.6, 1.4.11). W3C Rec, oct. 2023.
//   · APCA-W3 0.1.9 — constantes SA98G y APCAcontrast, copiadas de github.com/Myndex/apca-w3/src/apca-w3.js.
//   · APCA Bronze Simple Mode — readtech.org/ARC/tests/bronze-simple-mode (cambio 2023-02-10): Lc 75 texto
//     corrido (> 2 líneas), Lc 60 otro texto de contenido, Lc 45 contenido grande fluido (> 36 px).
//   · Daltonismo — Machado, Oliveira y Fernandes, «A Physiologically-based Model for Simulation of Color Vision
//     Deficiency», IEEE TVCG 15(6), 2009. Matrices de severidad 1,0, aplicadas en RGB lineal.
import { axisAdvertising } from '@efeoncepro/axis-tokens'

export const UMBRALES = axisAdvertising.accessibility

// Ancho de referencia de la pieza en pantalla: un teléfono muestra el feed a ~390 CSS px de ancho. Es el peor
// caso de lectura y el mismo ancho del `preview-390` que el compositor ya emite.
export const ANCHO_PANTALLA = 390

// ── Color ────────────────────────────────────────────────────────────────────────────────────────
export const hexARgb = hex => {
  const h = String(hex).replace('#', '')
  const full = h.length === 3 ? [...h].map(c => c + c).join('') : h

  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`color inválido: ${hex}`)

  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
}

// WCAG 2.2: sRGB → lineal por tramos. Para valores de 8 bits, 0,04045 y el histórico 0,03928 dan el mismo
// resultado (ningún entero entre 0 y 255 cae entre ambos umbrales).
const lineal = c8 => {
  const c = c8 / 255

  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export const luminanciaWcag = ([r, g, b]) => 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b)

export const razonWcag = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

// APCA-W3 0.1.9 (SA98G). Copia literal de las constantes y del algoritmo oficial.
const SA98G = {
  mainTRC: 2.4, sRco: 0.2126729, sGco: 0.7151522, sBco: 0.072175,
  normBG: 0.56, normTXT: 0.57, revTXT: 0.62, revBG: 0.65,
  blkThrs: 0.022, blkClmp: 1.414, scaleBoW: 1.14, scaleWoB: 1.14,
  loBoWoffset: 0.027, loWoBoffset: 0.027, deltaYmin: 0.0005, loClip: 0.1
}

export const luminanciaApca = ([r, g, b]) =>
  SA98G.sRco * (r / 255) ** SA98G.mainTRC + SA98G.sGco * (g / 255) ** SA98G.mainTRC + SA98G.sBco * (b / 255) ** SA98G.mainTRC

// Lc con signo: positivo = texto oscuro sobre fondo claro; negativo = texto claro sobre fondo oscuro.
export function lcApca(txtY, bgY) {
  if (!Number.isFinite(txtY) || !Number.isFinite(bgY) || Math.min(txtY, bgY) < 0 || Math.max(txtY, bgY) > 1.1) return 0
  const clamp = y => (y > SA98G.blkThrs ? y : y + (SA98G.blkThrs - y) ** SA98G.blkClmp)
  const t = clamp(txtY)
  const b = clamp(bgY)

  if (Math.abs(b - t) < SA98G.deltaYmin) return 0

  if (b > t) {
    const sapc = (b ** SA98G.normBG - t ** SA98G.normTXT) * SA98G.scaleBoW

    return (sapc < SA98G.loClip ? 0 : sapc - SA98G.loBoWoffset) * 100
  }

  const sapc = (b ** SA98G.revBG - t ** SA98G.revTXT) * SA98G.scaleWoB

  return (sapc > -SA98G.loClip ? 0 : sapc + SA98G.loWoBoffset) * 100
}

// ── Daltonismo (Machado 2009, severidad 1,0, RGB lineal) ─────────────────────────────────────────────
export const MATRICES_DALTONISMO = {
  protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039]
}

const aSrgb8 = v => {
  const c = Math.min(1, Math.max(0, v))

  return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255)
}

export function simularDaltonismo([r, g, b], tipo) {
  const m = MATRICES_DALTONISMO[tipo]

  if (!m) throw new Error(`tipo de daltonismo desconocido: ${tipo}`)
  const [R, G, B] = [lineal(r), lineal(g), lineal(b)]

  return [m[0] * R + m[1] * G + m[2] * B, m[3] * R + m[4] * G + m[5] * B, m[6] * R + m[7] * G + m[8] * B].map(aSrgb8)
}

// ── Tamaño en pantalla y umbrales por voz ──────────────────────────────────────────────────────────
// Tamaño de la letra tal como se ve en el teléfono: px del lienzo × (ancho de pantalla / ancho del lienzo).
export const tamanoEnPantalla = (pxLienzo, anchoLienzo, anchoPantalla = ANCHO_PANTALLA) => (pxLienzo * anchoPantalla) / anchoLienzo

// Texto grande según WCAG (y los mismos cortes que declara AXIS): ≥ 24 CSS px, o ≥ 18,66 CSS px en negrita.
export const esTextoGrande = (cssPx, peso) =>
  cssPx >= UMBRALES.normalTextMinCssPx || (peso >= 700 && cssPx >= UMBRALES.boldLargeTextMinCssPx)

export const umbralWcag = (cssPx, peso) => (esTextoGrande(cssPx, peso) ? UMBRALES.largeTextContrast : UMBRALES.normalTextContrast)

// APCA Bronze: Lc 45 contenido grande (> 36 px), Lc 75 texto corrido (> 2 líneas), Lc 60 el resto del contenido.
export const umbralApca = (cssPx, lineas = 1) => (cssPx > 36 ? 45 : lineas > 2 ? 75 : 60)

// ── Medición sobre el píxel ──────────────────────────────────────────────────────────────────────────
// `rgb` es un buffer RGB (3 canales) del fondo SIN el texto (el plate con su underlay), de ancho `ancho`.
// Mide la caja de la voz contra la tinta y devuelve el PEOR caso según la tinta —una clara se pierde contra lo
// más claro del fondo (p98), una oscura contra lo más oscuro (p2)— y qué fracción del área queda bajo el umbral.
// Para un LÍMITE que no es texto (relleno o borde de un botón, WCAG 1.4.11) se pasa `umbral` —el
// `essentialBoundaryContrast` de AXIS— y `apca: false`: APCA Bronze no fija un piso verificado para no-texto.
export function medirVoz({ rgb, ancho, alto, caja, tinta, cssPx = null, peso = 400, lineas = 1, daltonismo = false, umbral: umbralFijo = null, apca: conApca = true }) {
  const x0 = Math.max(0, Math.floor(caja.left))
  const y0 = Math.max(0, Math.floor(caja.top))
  const x1 = Math.min(ancho, Math.ceil(caja.right))
  const y1 = Math.min(alto, Math.ceil(caja.bottom))
  const tintaWcag = luminanciaWcag(tinta)
  const tintaApca = luminanciaApca(tinta)
  const umbral = umbralFijo ?? umbralWcag(cssPx, peso)
  const lw = []
  const la = []
  const pixeles = []
  let bajo = 0

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * ancho + x) * 3
      const px = [rgb[i], rgb[i + 1], rgb[i + 2]]
      const l = luminanciaWcag(px)

      lw.push(l)
      la.push(luminanciaApca(px))
      if (daltonismo) pixeles.push(px)
      if (razonWcag(tintaWcag, l) < umbral) bajo++
    }
  }

  if (!lw.length) return null
  const orden = arr => [...arr].sort((a, b) => a - b)
  const w = orden(lw)
  const a = orden(la)
  const p = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(arr.length * q))]
  const wcag = Math.min(razonWcag(tintaWcag, p(w, 0.98)), razonWcag(tintaWcag, p(w, 0.02)))
  const lcClaro = lcApca(tintaApca, p(a, 0.98))
  const lcOscuro = lcApca(tintaApca, p(a, 0.02))
  const apca = Math.abs(lcClaro) < Math.abs(lcOscuro) ? lcClaro : lcOscuro
  const minApca = conApca && cssPx != null ? umbralApca(cssPx, lineas) : null

  const r = {
    cssPx: cssPx == null ? null : +cssPx.toFixed(1),
    grande: cssPx == null ? null : esTextoGrande(cssPx, peso),
    wcag: +wcag.toFixed(2),
    umbralWcag: umbral,
    cumpleWcag: wcag >= umbral,
    apca: conApca ? +apca.toFixed(1) : null,
    umbralApca: minApca,
    cumpleApca: minApca == null ? null : Math.abs(apca) >= minApca,
    pctBajoUmbral: +((bajo * 100) / lw.length).toFixed(2)
  }

  // Daltonismo: se simulan tinta y fondo juntos y se mide el peor caso otra vez, por tipo. Sólo aporta en tintas
  // de color (acentos, CTA): con blanco puro la simulación no cambia la luminancia de forma relevante.
  if (daltonismo) {
    r.daltonismo = {}

    for (const tipo of Object.keys(MATRICES_DALTONISMO)) {
      const t = luminanciaWcag(simularDaltonismo(tinta, tipo))
      const ls = orden(pixeles.map(px => luminanciaWcag(simularDaltonismo(px, tipo))))

      r.daltonismo[tipo] = +Math.min(razonWcag(t, p(ls, 0.98)), razonWcag(t, p(ls, 0.02))).toFixed(2)
    }

    r.cumpleDaltonismo = Object.values(r.daltonismo).every(v => v >= umbral)
  }

  return r
}

// Texto sobre un COLOR PLANO (p. ej. el CTA sólido: tinta sobre su relleno). El fondo no varía, así que el peor
// caso es el único caso.
export function medirContraColor({ tinta, fondo, cssPx, peso = 400, lineas = 1, umbral: umbralFijo = null }) {
  const umbral = umbralFijo ?? umbralWcag(cssPx, peso)
  const wcag = razonWcag(luminanciaWcag(tinta), luminanciaWcag(fondo))
  const apca = lcApca(luminanciaApca(tinta), luminanciaApca(fondo))
  const minApca = umbralApca(cssPx, lineas)

  const daltonismo = Object.fromEntries(
    Object.keys(MATRICES_DALTONISMO).map(t => [t, +razonWcag(luminanciaWcag(simularDaltonismo(tinta, t)), luminanciaWcag(simularDaltonismo(fondo, t))).toFixed(2)])
  )

  return {
    cssPx: +cssPx.toFixed(1),
    grande: esTextoGrande(cssPx, peso),
    wcag: +wcag.toFixed(2),
    umbralWcag: umbral,
    cumpleWcag: wcag >= umbral,
    apca: +apca.toFixed(1),
    umbralApca: minApca,
    cumpleApca: Math.abs(apca) >= minApca,
    pctBajoUmbral: wcag >= umbral ? 0 : 100,
    daltonismo,
    cumpleDaltonismo: Object.values(daltonismo).every(v => v >= umbral)
  }
}

// ── Una medición POSIBLE (tramo 13) ──────────────────────────────────────────────────────────────────
// Ninguna medición supera el contraste máximo de su tinta —contra negro o contra blanco— y el umbral de una voz lo fija su
// tamaño en pantalla y su peso (o su piso). En una corrida en paralelo de la quinta certificación, el QA salió una vez con el
// titular y el CTA medidos como el descriptor: 20,27:1 para una tinta lima que no pasa de 11,5:1, y umbral 4,5 para un titular
// de 50 CSS px. No se reprodujo en 44 corridas. Devuelve el motivo, o null si la medición es posible.
// `tintasExtra`: otras tintas que la voz dibuja —el énfasis blanco de la entrada, de la nota o del cierre—; el tope es el de la
// tinta que más contraste puede dar (tramo 14: una entrada entera en `[[ ]]` abortaba por un tope calculado con el celeste).
export function medicionImposible({ tinta, tintasExtra = [], medidas = [], umbral = null, umbralEsperado = null }) {
  const tope = Math.max(...[tinta, ...tintasExtra].map(t => {
    const lum = luminanciaWcag(hexARgb(t))

    return Math.max(razonWcag(lum, 0), razonWcag(lum, 1))
  }))

  const peor = Math.max(...medidas.filter(Number.isFinite))

  if (peor > tope + 0.02) return `${peor}:1 con tintas que contra ningún fondo pasan de ${tope.toFixed(2)}:1`
  if (umbral != null && umbralEsperado != null && umbral !== umbralEsperado) return `umbral ${umbral}:1 para una voz que por su tamaño exige ${umbralEsperado}:1`

  return null
}

// ── Contraste sobre el TRAZO, no sobre la caja ───────────────────────────────────────────────────────
// Auditoría 2026-09-23 (hallazgo 3): en 01-fuera-916 crecida, la caja de «+ AEO» medía 4,53:1 y el 1 % peor del
// trazo, 2,4–3,1:1, sobre el canto iluminado de un monitor. La caja mezcla el aire entre letras con el fondo de los
// glifos; lo que se lee es el trazo. Cada píxel de glifo se compara con SU fondo y con la tinta que realmente tiene
// (una voz puede mezclar tintas: el acento dentro de la entrada), y se toma el 1 % peor.
//   · `rgb`: el fondo SIN el texto (3 canales); `texto`: la capa de texto SOLA (RGBA), del mismo tamaño.
//   · Un píxel es glifo si su alfa es ≥ 50 %: el borde suavizado se mezcla con el fondo y no es tinta.
const LIN8 = Float64Array.from({ length: 256 }, (_, i) => lineal(i))
const lum8 = (r, g, b) => 0.2126 * LIN8[r] + 0.7152 * LIN8[g] + 0.0722 * LIN8[b]

export const PERCENTIL_TRAZO = 0.01

export function medirGlifos({ rgb, texto, ancho, alto, caja, cssPx = null, peso = 400, umbral: umbralFijo = null }) {
  const x0 = Math.max(0, Math.floor(caja.left))
  const y0 = Math.max(0, Math.floor(caja.top))
  const x1 = Math.min(ancho, Math.ceil(caja.right))
  const y1 = Math.min(alto, Math.ceil(caja.bottom))
  const umbral = umbralFijo ?? umbralWcag(cssPx, peso)
  const razones = new Float64Array(Math.max(0, (x1 - x0) * (y1 - y0)))
  let n = 0
  let bajo = 0

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const j = (y * ancho + x) * 4

      if (texto[j + 3] < 128) continue
      const i = (y * ancho + x) * 3
      const r = razonWcag(lum8(texto[j], texto[j + 1], texto[j + 2]), lum8(rgb[i], rgb[i + 1], rgb[i + 2]))

      razones[n++] = r
      if (r < umbral) bajo++
    }
  }

  if (!n) return null
  const orden = razones.subarray(0, n).sort()
  const wcag = orden[Math.min(n - 1, Math.floor(n * PERCENTIL_TRAZO))]

  return { wcag: +wcag.toFixed(2), umbralWcag: umbral, cumpleWcag: wcag >= umbral, pctBajoUmbral: +((bajo * 100) / n).toFixed(2), pixeles: n }
}

// ── El borde del botón como se VE en el teléfono ─────────────────────────────────────────────────────
// Auditoría 2026-09-23 (hallazgo 12): un borde de 2 px en un lienzo de 1920 mide 0,4 CSS px en un teléfono y se
// mezcla con la escena: 2,5–2,9:1 efectivos en 16:9 a DPR 2 mientras la caja reportaba más de 3:1. Se mide el
// ANILLO en la pieza reducida a 390 CSS px × DPR 2 —la luminancia mediana del trazo tal como quedó al reducir—
// contra el peor fondo de una franja exterior. Sólo los tramos rectos: la esquina redondeada mezcla dos lados.
//   · `final`/`fondo`: RGB (3 canales) de la pieza y de su fondo sin texto, ya reducidos, del mismo tamaño.
//   · `caja`, `radio` y `grosor` en px de la imagen reducida.
export const DPR_REFERENCIA = 2

export function medirAnillo({ final, fondo, ancho, alto, caja, radio = 0, grosor }) {
  const mitad = Math.max(0.5, grosor / 2)
  const trazo = []
  const exterior = []
  const lumEn = (buf, x, y) => (x < 0 || y < 0 || x >= ancho || y >= alto ? null : lum8(buf[(y * ancho + x) * 3], buf[(y * ancho + x) * 3 + 1], buf[(y * ancho + x) * 3 + 2]))

  const tramo = (borde, desde, hasta, signo, horizontal) => {
    const filas = []

    for (let k = Math.floor(borde - mitad - 1); k <= Math.ceil(borde + mitad + 1); k++) if (Math.abs(k + 0.5 - borde) <= mitad) filas.push(k)
    if (!filas.length) filas.push(Math.floor(borde))

    for (let t = Math.ceil(desde); t < Math.floor(hasta); t++) {
      for (const k of filas) {
        const l = horizontal ? lumEn(final, t, k) : lumEn(final, k, t)

        if (l != null) trazo.push(l)
      }

      for (let d = Math.ceil(mitad + 1); d <= Math.ceil(mitad + 4); d++) {
        const k = Math.floor(borde + signo * d)
        const l = horizontal ? lumEn(fondo, t, k) : lumEn(fondo, k, t)

        if (l != null) exterior.push(l)
      }
    }
  }

  tramo(caja.top, caja.left + radio, caja.right - radio, -1, true)
  tramo(caja.bottom, caja.left + radio, caja.right - radio, 1, true)
  tramo(caja.left, caja.top + radio, caja.bottom - radio, -1, false)
  tramo(caja.right, caja.top + radio, caja.bottom - radio, 1, false)
  if (!trazo.length || !exterior.length) return null
  const orden = arr => Float64Array.from(arr).sort()
  const t = orden(trazo)
  const e = orden(exterior)
  const p = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(arr.length * q))]
  const lTrazo = p(t, 0.5)
  const wcag = Math.min(razonWcag(lTrazo, p(e, 0.98)), razonWcag(lTrazo, p(e, 0.02)))
  const umbral = UMBRALES.essentialBoundaryContrast

  return { wcag: +wcag.toFixed(2), umbralWcag: umbral, cumpleWcag: wcag >= umbral, grosorCssPx: +(grosor / DPR_REFERENCIA).toFixed(2) }
}

// ── Texto alternativo ────────────────────────────────────────────────────────────────────────────────
// WCAG 1.1.1 + 1.4.5: una pieza publicitaria es una imagen de texto, así que su alternativa lleva TODO el texto
// visible, en orden de lectura, además de la descripción de la escena si el plan la trae.
const plano = t => String(t ?? '').replace(/\*\*|\[\[|\]\]/g, '').replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim()

//
// Tramo 4 (auditoría 2026-09-23, hallazgo 15): «Llamado a la acción» y no «Botón» —en una imagen no hay un control
// que se pueda activar, y anunciarlo confunde a quien usa lector de pantalla—; suma el gesto manuscrito y las
// etiquetas de los cursores (también son texto visible), y no repite lo que la descripción de la escena ya dice.
// Palabras sin tildes ni mayúsculas, para comparar frases enteras (tramo 8; auditoría de diseño, N11).
const palabras = t => plano(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[\p{L}\p{N}]+/gu) ?? []

const contieneFrase = (texto, frase) => {
  const e = palabras(texto)
  const f = palabras(frase)

  if (!f.length || f.length > e.length) return false

  for (let i = 0; i + f.length <= e.length; i++) if (f.every((w, j) => e[i + j] === w)) return true

  return false
}

// Lo que la descripción de la escena CITA entre comillas («…», “…”, "…"). La escena «ya dice» una voz sólo si la cita:
// una palabra suelta que coincide no cuenta (antes «Ver» se daba por dicho en «verde», y «¡mira!» en «una mujer mira»).
const citas = escena => [...String(escena ?? '').matchAll(/«([^»]+)»|“([^”]+)”|"([^"]+)"/g)].map(m => m[1] ?? m[2] ?? m[3])

// Las voces que la descripción de la escena (`altText`) transcribe —citadas, o frases de dos palabras o más—: el gate lo
// avisa, porque la escena se describe y el texto de la imagen se transcribe aparte.
export const copiaEnEscena = pieza => {
  const escena = plano(pieza.altText)

  if (!escena) return []

  return [pieza.lead, pieza.dominant, pieza.after, pieza.note?.text, pieza.cta?.text]
    .map(plano)
    .filter(v => v && (citas(escena).some(c => contieneFrase(c, v)) || (palabras(v).length >= 2 && contieneFrase(escena, v))))
}

export function textoAlternativo(pieza) {
  const escena = plano(pieza.altText)
  const yaDicho = t => citas(escena).some(c => contieneFrase(c, t))

  const voces = [pieza.label, pieza.lead, pieza.dominant, pieza.after, pieza.note?.text, pieza.card?.header, pieza.card?.body, pieza.footer?.text, pieza.gesture?.text]
    .map(plano)
    .filter(v => v && !yaDicho(v))

  const accion = pieza.cta ? [plano(pieza.cta.text), plano(pieza.cta.descriptor)] : []

  // El ROL del CTA se anuncia SIEMPRE, aunque la escena mencione sus palabras: dice qué hace ese texto, no sólo qué dice
  // (en v07 las 15 piezas perdían el rol porque su `altText` citaba el CTA).
  const cta = pieza.cta
    ? [accion[0] && `Llamado a la acción: «${accion[0]}»`, accion[1] && !yaDicho(accion[1]) && accion[1]].filter(Boolean)
    : []

  const etiquetas = [...(pieza.selection?.cursors ?? []), ...(pieza.cta?.seleccion?.cursores ?? [])].map(k => plano(k?.label)).filter(Boolean)
  const seleccion = etiquetas.length ? [`Cursores de colaboración: ${etiquetas.map(e => `«${e}»`).join(', ')}`] : []
  // La firma es texto en la imagen: el logotipo de Efeonce (salvo que la pieza no lleve firma).
  const firma = pieza.logo || pieza.firma?.modo === 'externa' || (pieza.firma == null && typeof pieza.signatureY === 'number') ? ['Firma: logotipo de Efeonce'] : []
  const texto = [...voces.map(v => `«${v}»`), ...cta, ...seleccion, ...firma].join(' ')

  return [escena, texto && `Texto en la imagen: ${texto}`].filter(Boolean).join('. ').replace(/\.\./g, '.')
}
