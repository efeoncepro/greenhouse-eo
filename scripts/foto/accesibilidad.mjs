// Accesibilidad y contraste de TEXTO SOBRE FOTOGRAFÍA para piezas publicitarias estáticas.
//
// Módulo puro: funciones sin efectos, probadas contra valores de referencia publicados
// (scripts/foto/accesibilidad.test.mjs). Lo consumen el compositor (`pnpm foto:componer:cta`), su gate
// (`pnpm foto:cta:gate`) y el reporte (`pnpm foto:accesibilidad`).
//
// Política (skill greenhouse-typography-accessibility + a11y-architect): se APRUEBA con WCAG 2.2 AA; APCA es
// verificación perceptual de respaldo y avisa, no bloquea. Los umbrales NO viven acá: salen del contrato
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
export function medirContraColor({ tinta, fondo, cssPx, peso = 400, lineas = 1 }) {
  const umbral = umbralWcag(cssPx, peso)
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

// ── Texto alternativo ────────────────────────────────────────────────────────────────────────────────
// WCAG 1.1.1 + 1.4.5: una pieza publicitaria es una imagen de texto, así que su alternativa lleva TODO el texto
// visible, en orden de lectura, además de la descripción de la escena si el plan la trae.
const plano = t => String(t ?? '').replace(/\*\*|\[\[|\]\]/g, '').replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim()

export function textoAlternativo(pieza) {
  const escena = plano(pieza.altText)

  const voces = [pieza.label, pieza.lead, pieza.dominant, pieza.after, pieza.note?.text, pieza.card?.body, pieza.footer?.text]
    .map(plano)
    .filter(Boolean)

  const cta = pieza.cta ? [`Botón: «${plano(pieza.cta.text)}»`, plano(pieza.cta.descriptor)].filter(Boolean) : []
  const texto = [...voces.map(v => `«${v}»`), ...cta].join(' ')

  return [escena, texto && `Texto en la imagen: ${texto}`].filter(Boolean).join('. ').replace(/\.\./g, '.')
}
