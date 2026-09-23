// `pnpm foto:componer:cta <piezas.json> [id...]` — compositor canónico de piezas publicitarias CON CTA sobre
// fotografía: seis voces (entrada · titular · remate + beneficio · CTA · descriptor), selección colaborativa
// AXIS, firma y QA de contraste real. Contrato: docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md.
//
// Garantías que el comando impone por sí mismo (no dependen de que el plan las declare):
//   · el texto nunca toca al sujeto — segmentación semántica local, en 2D (§14)
//   · en 16:9 y 9:16 el bloque crece hasta llenar su columna sólo mientras respira, no pierde contraste y no
//     sale de la zona segura declarada (§13–§14)
//   · un plan mal escrito falla ANTES de componer, con el nombre de la pieza y del campo (§15)
//
// Antes de tocar este archivo: `pnpm foto:componer:cta:regresion` compone todos los planes con CTA del repo
// con la versión de HEAD y con la tuya, y muestra pieza por pieza qué cambia. Un cambio que no debería alterar
// nada sale con cero diferencias.
//
// Origen: el compositor de «Nivel de búsqueda» (ai-generations/2026-09-19_nivel-de-busqueda/componer-v2.mjs),
// con su gramática de voces intacta. NUNCA escribas un compositor paralelo: se extiende éste.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { removeBackground } from '@imgly/background-removal-node'
import { axisAdvertising } from '@efeoncepro/axis-tokens'
import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'

import { renderCollaborationSelection } from '../../scripts/creative/layout-compiler/axis-advertising.mjs'
import { compositeLuminosity } from '../../scripts/creative/layout-compiler/compiler.mjs'

import { ANCHO_PANTALLA, DPR_REFERENCIA, UMBRALES, hexARgb, medirAnillo, medirContraColor, medirGlifos, medirVoz, tamanoEnPantalla, textoAlternativo } from './accesibilidad.mjs'
import { ORDEN as ORDEN_VARIANTES, elegirVariante } from './cta-variantes.mjs'
import { validarPiezaEsquema } from './cta-esquema.mjs'
import { fueraDeReserva, invariantesMaquetacion } from './cta-invariantes.mjs'
import { desescaparXml } from './svg-texto.mjs'
import { escribirAtomico, huellaComando, huellaPieza, rutaQa, sha, tomarBloqueo, versionPaquete } from './cta-integridad.mjs'

// ADAPTACIÓN del compositor de «Nivel de búsqueda» (GTA VI) a FOTOGRAFÍA de marca y multiformato.
// Original: ai-generations/2026-09-19_nivel-de-busqueda/componer-v2.mjs (jerarquía por voces, richBlock,
// selección AXIS, tarjeta de vidrio, QA de contraste). Cambios: lienzo tomado del plate (4:5, 9:16, 16:9),
// HUD opcional, selección anclada al dominante o a un OBJETO de la foto, escalas relativas al lienzo.
// PROMOVIDO a comando canónico el 2026-09-20 (antes vivía en
// ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/componer-foto.mjs). Mismo motivo que
// `foto:validar`: una herramienta dentro de una carpeta fechada no la encuentra nadie, y la capa gráfica
// se reconstruía a mano cada vez. NO es un compositor nuevo — el canon lo prohíbe expresamente: es el de
// «Nivel de búsqueda» con su gramática de voces intacta.
//
// Uso: pnpm foto:componer:cta <piezas.json> [id...]   ·  las rutas de plate son relativas al json.
const require = createRequire(import.meta.url)
const fontkit = require('fontkit')

const REPO = fileURLToPath(new URL('../../', import.meta.url))
const repo = rel => path.join(REPO, rel)

const R = axisAdvertising.recipes
const C = axisAdvertising.color

let W = 1152
let H = 1440
let M = Math.round(W * 0.07)
const ACCENT = C.accentSurface // #ff6500, naranja Efeonce = el atardecer de la ciudad

const bric = fontkit.openSync(repo('src/assets/fonts/BricolageGrotesque-Variable.ttf'))

const pop = {
  400: fontkit.openSync(repo('src/assets/fonts/Poppins-Regular.ttf')),
  500: fontkit.openSync(repo('src/assets/fonts/Poppins-Medium.ttf')),
  600: fontkit.openSync(repo('src/assets/fonts/Poppins-SemiBold.ttf')),
  700: fontkit.openSync(repo('src/assets/fonts/Poppins-Bold.ttf'))
}

const GUTTERY = path.join(os.homedir(), 'Library/Fonts/Guttery.otf')
const gutt = fs.existsSync(GUTTERY) ? fontkit.openSync(GUTTERY) : null

// Dominante: receta ideaImpact (peso, opsz, tracking, leading). Decisión declarada: ancho 78 dentro del eje
// autorizado de la familia (75–100) para el registro condensado del cartel de acción; no se deforma el glifo.
const DOMINANT_WIDTH = 78
const fontFor = (recipe, width = recipe.width) => bric.getVariation({ wght: recipe.weight, wdth: width, opsz: recipe.opticalSize })
const em = v => Number.parseFloat(v)

const shape = (text, font, size, trackingEm = 0) => {
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

    x += p.xAdvance * scale + (i === run.glyphs.length - 1 ? 0 : trackingEm * size)
  })

  return { paths, ink, advance: x }
}

const wrap = (text, font, size, maxWidth, trackingEm) => {
  const lines = []

  for (const chunk of text.split('|')) {
    let line = ''

    for (const word of chunk.trim().split(/\s+/)) {
      const probe = line ? `${line} ${word}` : word

      if (line && shape(probe, font, size, trackingEm).advance > maxWidth) {
        lines.push(line)
        line = word
      } else line = probe
    }

    if (line) lines.push(line)
  }

  return lines
}

// Bloque multilínea anclado por la PARTE SUPERIOR de la tinta (topY) para apilar niveles con aire exacto.
const block = ({ text, font, size, tracking = 0, leading, x, topY, maxWidth = W, fill, align = 'left' }) => {
  const lines = wrap(text, font, size, maxWidth, tracking)
  const shaped = lines.map(l => shape(l, font, size, tracking))
  const firstTop = shaped[0].ink.top
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  let svg = ''

  shaped.forEach((s, i) => {
    const baseline = topY - firstTop + i * size * leading
    const lx = align === 'center' ? x - (s.ink.left + s.ink.right) / 2 : align === 'right' ? x - s.ink.right : x - s.ink.left

    svg += `<g fill="${fill}" transform="translate(${lx.toFixed(2)} ${baseline.toFixed(2)})">${s.paths}</g>`
    box.left = Math.min(box.left, lx + s.ink.left)
    box.right = Math.max(box.right, lx + s.ink.right)
    box.top = Math.min(box.top, baseline + s.ink.top)
    box.bottom = Math.max(box.bottom, baseline + s.ink.bottom)
  })

  return { svg, box, lines }
}


// ── Texto enriquecido: **negrita** (peso superior de la misma familia) y [[acento]] (naranja Efeonce) ──
// La jerarquía también vive DENTRO de la línea: un bloque nunca es un solo peso plano si tiene una palabra clave.
const parseRich = text =>
  text.split('|').map(chunk => {
    const words = []
    let bold = false
    let accent = false
    let cur = ''

    const flush = () => {
      if (cur) words.push({ text: cur, bold, accent })
      cur = ''
    }

    for (let i = 0; i < chunk.length; i++) {
      if (chunk.startsWith('**', i)) { flush(); bold = !bold; i++; continue }
      if (chunk.startsWith('[[', i)) { flush(); accent = true; i++; continue }
      if (chunk.startsWith(']]', i)) { flush(); accent = false; i++; continue }
      if (chunk[i] === ' ') { flush(); words.push({ space: true }); continue }
      cur += chunk[i]
    }

    flush()

    // fusiona fragmentos contiguos (sin espacio) en una palabra con estilos por segmento
    const out = []
    let w = []

    for (const t of words) {
      if (t.space) { if (w.length) out.push(w); w = []; continue }
      w.push(t)
    }

    if (w.length) out.push(w)

    return out
  })

// Palabras cortas que no cierran línea en tipografía editorial en español.
const CIERRE_DEBIL = new Set(['a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los', 'mi', 'mis', 'ni', 'o', 'para', 'por', 'que', 'se', 'sin', 'su', 'sus', 'tu', 'tus', 'u', 'un', 'una', 'unas', 'unos', 'y'])
const palabraPlana = word => word.map(seg => seg.text).join('').toLowerCase().replace(/[^\p{L}]/gu, '')

const defectosDeCorte = lines => {
  if (lines.length < 2) return 0
  const viuda = lines.at(-1).length === 1 && lines.flat().length >= 3 ? 1 : 0

  return viuda + lines.slice(0, -1).filter(l => CIERRE_DEBIL.has(palabraPlana(l.at(-1)))).length
}

const richBlock = ({ text, fonts, size, tracking = 0, leading, x, topY, maxWidth = W, fill, accentFill = ACCENT, align = 'left' }) => {
  const segW = seg => shape(seg.text, seg.bold ? fonts.bold : fonts.base, size, tracking)
  const wordWidth = word => word.reduce((a, seg) => a + segW(seg).advance, 0)
  const space = shape('a a', fonts.base, size).advance - shape('aa', fonts.base, size).advance
  const lines = []

  const wrapChunk = (chunk, limit) => {
    const out = []
    let line = []
    let width = 0

    for (const word of chunk) {
      const ww = wordWidth(word)

      if (line.length && width + space + ww > limit) { out.push(line); line = []; width = 0 }
      width += (line.length ? space : 0) + ww
      line.push(word)
    }

    if (line.length) out.push(line)

    return out
  }

  // Viudas y cortes en palabra corta [2026-09-22]: «…cada / mes.», «…el / mismo día.», «…todos los / meses.»
  // salían en piezas aprobadas. Si el corte voraz deja una palabra sola al final o termina una línea en
  // artículo, preposición o conjunción, se prueba un ancho menor que conserve el MISMO número de líneas —
  // el alto del bloque no cambia, así que ninguna guarda se mueve. Si no hay alternativa, queda como estaba.
  for (const chunk of parseRich(text)) {
    let best = wrapChunk(chunk, maxWidth)

    if (defectosDeCorte(best)) {
      for (let k = 0.98; k >= 0.6; k -= 0.02) {
        const alt = wrapChunk(chunk, maxWidth * k)

        if (alt.length !== best.length) break

        if (defectosDeCorte(alt) < defectosDeCorte(best)) {
          best = alt
          if (!defectosDeCorte(best)) break
        }
      }
    }

    lines.push(...best)
  }

  let svg = ''
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  const accentBoxes = []
  let firstTop = null

  // medir tinta de la primera línea para anclar por arriba
  const lineInk = line => {
    let cx = 0
    const ink = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
    const parts = []

    line.forEach((word, wi) => {
      if (wi) cx += space

      for (const seg of word) {
        const sh = segW(seg)

        parts.push({ seg, sh, dx: cx })

        if (sh.ink.left !== Infinity) {
          ink.left = Math.min(ink.left, cx + sh.ink.left)
          ink.right = Math.max(ink.right, cx + sh.ink.right)
          ink.top = Math.min(ink.top, sh.ink.top)
          ink.bottom = Math.max(ink.bottom, sh.ink.bottom)
        }

        cx += sh.advance
      }
    })

    return { ink, parts }
  }

  lines.forEach((line, i) => {
    const { ink, parts } = lineInk(line)

    if (firstTop === null) firstTop = ink.top
    const baseline = topY - firstTop + i * size * leading
    const lx = align === 'center' ? x - (ink.left + ink.right) / 2 : align === 'right' ? x - ink.right : x - ink.left

    for (const { seg, sh, dx } of parts) {
      const color = seg.accent ? accentFill : fill

      svg += `<g fill="${color}" transform="translate(${(lx + dx).toFixed(2)} ${baseline.toFixed(2)})">${sh.paths}</g>`
      if (seg.accent && sh.ink.left !== Infinity) accentBoxes.push({ left: lx + dx + sh.ink.left, right: lx + dx + sh.ink.right, top: baseline + sh.ink.top, bottom: baseline + sh.ink.bottom })
    }

    box.left = Math.min(box.left, lx + ink.left)
    box.right = Math.max(box.right, lx + ink.right)
    box.top = Math.min(box.top, baseline + ink.top)
    box.bottom = Math.max(box.bottom, baseline + ink.bottom)
  })

  return { svg, box, accentBoxes, lines: lines.map(l => l.map(w => w.map(s => s.text).join('')).join(' ')) }
}

const BRIC = (recipe, width = recipe.width, boldWeight = 800) => ({
  base: bric.getVariation({ wght: recipe.weight, wdth: width, opsz: recipe.opticalSize }),
  bold: bric.getVariation({ wght: boldWeight, wdth: width, opsz: recipe.opticalSize })
})

const POP = { base: pop[400], bold: pop[700] }

// ── HUD propio ───────────────────────────────────────────────────────────────────────────────────
const starPath = (cx, cy, r) => {
  const pts = []

  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.46

    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }

  return `M${pts.join('L')}Z`
}

// Íconos de "quién te persigue": aquí no son patrullas, son motores de respuesta (genéricos, sin marcas).
const unitIcons = (x, cy, s) => {
  const bubble = `<path d="M${x},${cy - s * 0.42} h${s * 0.9} a${s * 0.12},${s * 0.12} 0 0 1 ${s * 0.12},${s * 0.12} v${s * 0.52} a${s * 0.12},${s * 0.12} 0 0 1 -${s * 0.12},${s * 0.12} h-${s * 0.5} l-${s * 0.22},${s * 0.2} v-${s * 0.2} h-${s * 0.18} a${s * 0.12},${s * 0.12} 0 0 1 -${s * 0.12},-${s * 0.12} v-${s * 0.52} a${s * 0.12},${s * 0.12} 0 0 1 ${s * 0.12},-${s * 0.12}z" fill="none" stroke="#fff" stroke-width="${s * 0.09}" stroke-linejoin="round"/>`
  const sx = x + s * 1.55
  const spark = `<path d="M${sx},${cy - s * 0.5} C${sx + s * 0.06},${cy - s * 0.1} ${sx + s * 0.1},${cy - s * 0.06} ${sx + s * 0.5},${cy} C${sx + s * 0.1},${cy + s * 0.06} ${sx + s * 0.06},${cy + s * 0.1} ${sx},${cy + s * 0.5} C${sx - s * 0.06},${cy + s * 0.1} ${sx - s * 0.1},${cy + s * 0.06} ${sx - s * 0.5},${cy} C${sx - s * 0.1},${cy - s * 0.06} ${sx - s * 0.06},${cy - s * 0.1} ${sx},${cy - s * 0.5}z" fill="#fff"/>`
  const mx = x + s * 2.55
  const lens = `<circle cx="${mx}" cy="${cy - s * 0.08}" r="${s * 0.3}" fill="none" stroke="#fff" stroke-width="${s * 0.09}"/><path d="M${mx + s * 0.22},${cy + s * 0.14} l${s * 0.26},${s * 0.26}" stroke="#fff" stroke-width="${s * 0.11}" stroke-linecap="round"/>`

  return { svg: bubble + spark + lens, width: s * 2.9 }
}

let glowId = 0

const hud = ({ lit, current = null, r = 34, gap = 12, right = W - M, top = M }) => {
  const step = r * 2 + gap
  const total = step * 5 - gap
  const cy = top + 44 + r
  const start = right - total + r
  let glow = ''
  let stars = ''

  for (let i = 0; i < 5; i++) {
    const cx = start + i * step
    const d = starPath(cx, cy, r)
    const isCurrent = current === i + 1

    if (i < lit) {
      const fill = isCurrent ? ACCENT : '#ffffff'

      glow += `<path d="${d}" fill="${fill}"/>`
      stars += `<path d="${d}" fill="${fill}" stroke="${isCurrent ? '#ffd9bf' : '#ffffff'}" stroke-width="${(r * 0.06).toFixed(1)}" stroke-linejoin="round"/>`
      if (isCurrent) stars += `<circle cx="${cx}" cy="${cy}" r="${r * 1.45}" fill="none" stroke="${ACCENT}" stroke-width="${(r * 0.08).toFixed(1)}" stroke-opacity="0.55"/>`
    } else {
      stars += `<path d="${d}" fill="rgba(0,10,30,0.55)" stroke="#ffffff" stroke-width="${(r * 0.09).toFixed(1)}" stroke-linejoin="round"/>`
    }
  }

  const icons = unitIcons(start - r - 26 - r * 2.9 * 0.9, cy, r * 0.9)
  const labelSize = 22
  const label = shape('NIVEL DE BÚSQUEDA', pop[700], labelSize, em(R.structureLabel.tracking))
  const lx = right - label.ink.right
  const ly = top - label.ink.top
  const id = `g${glowId++}`

  return {
    defs: `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${(r * 0.4).toFixed(1)}"/></filter>`,
    svg: `<g filter="url(#${id})" opacity="0.9">${glow}</g>${stars}<g opacity="${lit ? 1 : 0.85}">${icons.svg}</g><g fill="#ffffff" transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)})">${label.paths}</g>`,
    box: { left: start - r - 26 - r * 2.9, right, top: top + label.ink.top - ly + ly, bottom: cy + r }
  }
}

// ── Tarjeta de notificación (lenguaje de HUD: overlay sobre la acción, vidrio esmerilado real) ─────
const card = ({ header, body, x, bottom, width }) => {
  const pad = 34
  const headSize = 23
  const bodySize = 36
  const head = shape(header.toUpperCase(), pop[700], headSize, em(R.structureLabel.tracking))
  const bodyB = richBlock({ text: body, fonts: POP, size: bodySize, tracking: em(R.structureLead.tracking), leading: 1.32, x: x + pad, topY: 0, maxWidth: width - pad * 2, fill: C.softOnDark })
  const headH = head.ink.bottom - head.ink.top
  const bodyH = bodyB.box.bottom - bodyB.box.top
  const h = pad + headH + 22 + bodyH + pad
  const top = bottom - h
  const dot = 11
  const headY = top + pad - head.ink.top
  const bodyTop = top + pad + headH + 22
  const bodyFinal = richBlock({ text: body, fonts: POP, size: bodySize, tracking: em(R.structureLead.tracking), leading: 1.32, x: x + pad, topY: bodyTop, maxWidth: width - pad * 2, fill: C.softOnDark, accentFill: '#ffffff' })

  return {
    rect: { left: x, top, width, height: h, radius: 26 },
    svg: `<rect x="${x}" y="${top}" width="${width}" height="${h}" rx="26" fill="#070a24" fill-opacity="0.62" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.5"/>
      <rect x="${x}" y="${top}" width="7" height="${h}" rx="3.5" fill="${ACCENT}"/>
      <circle cx="${x + pad + dot}" cy="${headY + head.ink.top + headH / 2}" r="${dot}" fill="${ACCENT}"/>
      <g fill="${C.softOnDark}" transform="translate(${x + pad + dot * 2 + 14 - head.ink.left} ${headY})">${head.paths}</g>
      ${bodyFinal.svg}`,
    textBoxes: [bodyFinal.box],
    box: { left: x, right: x + width, top, bottom }
  }
}

// ── Contraste real ───────────────────────────────────────────────────────────────────────────────
const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const contrastUnder = async (buf, box, inkL = 1) => {
  const left = Math.max(0, Math.floor(box.left))
  const top = Math.max(0, Math.floor(box.top))
  const width = Math.max(1, Math.min(W - left, Math.ceil(box.right - box.left)))
  const height = Math.max(1, Math.min(H - top, Math.ceil(box.bottom - box.top)))
  const { data } = await sharp(buf).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const ls = []

  for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
  ls.sort((a, b) => a - b)

  // Peor caso según la tinta: una clara se pierde contra lo más claro del fondo (p98), una oscura contra lo más
  // oscuro (p2). Medir siempre contra lo más claro dejaba optimista a la tinta oscura: con la firma medida en su
  // posición real, b2-916 elegía el logo azul (4,56 «medido») y a la vista casi desaparecía sobre el negro.
  // Con tinta blanca o clara el número no cambia (verificado con la regresión: 86 de 86 piezas iguales).
  const ratio = bg => (Math.max(inkL, bg) + 0.05) / (Math.min(inkL, bg) + 0.05)
  const peor = Math.min(ratio(ls[Math.floor(ls.length * 0.98)]), ratio(ls[Math.floor(ls.length * 0.02)]))

  return Math.round(peor * 100) / 100
}

const measureLabel = (label, size) => shape(label, pop[700], size).advance

const labelToPaths = svg =>
  svg.replace(
    /<text x="(-?[\d.]+)" y="(-?[\d.]+)" fill="([^"]+)" font-family="[^"]*" font-size="([\d.]+)" font-weight="700">([^<]*)<\/text>/g,
    (_, x, y, fill, size, label) => `<g fill="${fill}" transform="translate(${x} ${y})">${shape(desescaparXml(label), pop[700], Number(size)).paths}</g>`
  )

// Intención AXIS de la selección del CTA. La usan el render y la validación del plan: una sola definición.
// Marco de la selección del CTA: el declarado o, por defecto, según el tratamiento (decisión del operador).
const marcoCta = c => c.seleccion?.marco ?? (c.variant === 'text' ? 'open-brackets' : 'ninguno')

function intencionSeleccionCta(c) {
  const sel = c.seleccion ?? {}
  const marco = marcoCta(c)

  const cursores = (sel.cursores ?? [{ id: 'usuario', kind: 'local', anchor: 'end-center', action: 'select' }]).map(k =>
    k.kind === 'local'
      ? { id: k.id, kind: 'local', targetId: 'cta', anchor: k.anchor ?? 'end-center', action: k.action ?? 'select' }
      : { id: k.id, kind: 'collaborator', targetId: 'cta', anchor: k.anchor, action: k.action ?? 'select', label: k.label, participantKind: k.who ?? 'role' }
  )

  return { targetId: 'cta', targetKind: 'group', variant: marco === 'ninguno' ? 'open-brackets' : marco, padding: sel.padding ?? 'compact', overlay: 'none', cursors: cursores }
}

// Una caja que se sale del lienzo. En la búsqueda del tamaño (dry) significa «este factor no sirve» y se
// descarta; en la composición final aborta como siempre. Antes se lanzaba igual en ambos casos, y una prueba
// de crecimiento que empujaba el CTA fuera del borde tumbaba el comando entero en vez de probar un factor menor.
class LienzoError extends Error {}

// ── Piezas ───────────────────────────────────────────────────────────────────────────────────────
const PLAN = process.argv[2]

// Sin plan, un comando canónico explica cómo se usa en vez de tirar un stack de node:fs.
if (!PLAN || PLAN === '--help' || PLAN === '-h') {
  console.error(`
pnpm foto:componer:cta <piezas.json> [id...]

Compone la CAPA GRÁFICA de una pieza con CTA sobre un plate limpio: jerarquía por voces (entrada · titular ·
remate + beneficio · CTA · descriptor), selección AXIS, firma y QA de contraste real bajo cada caja. El texto
nunca toca al sujeto (segmentación local) y en 16:9 y 9:16 crece hasta llenar su columna mientras respira.
Verifica con \`pnpm foto:cta:gate <piezas.json>\`. Antes de modificar el comando:
\`pnpm foto:componer:cta:regresion\`.

  <piezas.json>  plan declarativo; las rutas de \`plate\` son relativas al json
  [id...]        compone sólo esas piezas del plan

La pieza MUDA —sin capa— es una categoría legítima del lenguaje: sirve de descanso visual en el feed.
Este comando es para la pieza CON VOZ, y ésa reserva su espacio EN LA TOMA:

  pnpm foto:prompt <ficha.json>            # con \`reservas: ["zona-texto"]\`
  pnpm foto:validar <plate.png> --zona-texto
  pnpm foto:componer:cta <piezas.json>
  pnpm foto:cta:gate <piezas.json>

NUNCA escribas un compositor nuevo: éste es el de «Nivel de búsqueda» con su gramática de voces intacta.
Canon: docs/operations/brand-photography/EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md
`)
  process.exit(1)
}

const SLIDES = JSON.parse(fs.readFileSync(PLAN, 'utf8'))
// Huella de cada pieza TAL COMO ESTÁ EN EL PLAN (JSON crudo, antes de cualquier normalización): el gate la recalcula
// del mismo archivo y, si no coincide, el plan cambió después de componer.
const HUELLAS_PLAN = new Map((Array.isArray(SLIDES) ? SLIDES : []).filter(p => p && typeof p === 'object').map(p => [p.id, huellaPieza(JSON.parse(JSON.stringify(p)))]))
const PLAN_DIR = path.dirname(path.resolve(PLAN))
// `--variantes`: compone cada pieza en sus TRES tratamientos (texto · contorno · relleno) en out/variantes/, con una
// hoja comparativa por pieza. Existe porque dos de tres agentes terminaron usando una sola variante: no veían las
// otras sobre la foto real (operador, 2026-09-22). No toca el QA ni las salidas del plan.
const VARIANTES = process.argv.includes('--variantes')
const OUT = `${PLAN_DIR}/out${VARIANTES ? '/variantes' : ''}`
const only = process.argv.slice(3).filter(a => !a.startsWith('--'))
const qa = []

// ════════════════════════════════════════════════════════════════════════════════════════════════
// 🔴 VALIDACIÓN DEL PLAN, ANTES DE COMPONER NADA [2026-09-22]
// Un campo que el comando no lee se ignoraba EN SILENCIO: así se perdió `centerX` y 03-referencia-916 salió con
// el CTA sobre una proyección clara, con el comando en verde. Y un campo numérico faltante no fallaba: producía
// coordenadas NaN y reventaba lejos, con un mensaje que no nombraba ni la pieza ni el campo («CTA selection
// outside canvas»). Ahora el plan se valida entero primero: cada error nombra pieza y campo, y los campos que el
// comando no lee se avisan. Los metadatos que usan OTRAS herramientas están declarados abajo para no avisar.
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Qué fuente dibuja cada campo de texto (el mismo mapa que usa composePiece).
const POPS = [pop[400], pop[700]]
const sinGlifo = (texto, fuentes) => [...new Set([...String(texto ?? '').replace(/\*\*|\[\[|\]\]|\|/g, '')].filter(ch => !/\s/u.test(ch)).filter(ch => fuentes.some(f => !f.hasGlyphForCodePoint(ch.codePointAt(0)))))]

function camposConFuente(p) {
  const familia = f => (f === 'bricolage' ? [bric] : POPS)

  return [
    ['label', p.label, [pop[700]]],
    ['lead', p.lead, familia(p.leadFamily ?? 'poppins')],
    ['dominant', p.dominant, [bric]],
    ['after', p.after, familia(p.afterFamily ?? 'poppins')],
    ['note.text', p.note?.text, POPS],
    ['footer.text', p.footer?.text, [bric]],
    ['card.header', p.card?.header, POPS],
    ['card.body', p.card?.body, POPS],
    ['cta.text', p.cta?.text, [pop[700]]],
    ['cta.descriptor', p.cta?.descriptor, [pop[400]]],
    ...(p.cta?.seleccion?.cursores ?? []).map((k, i) => [`cta.seleccion.cursores.${i}.label`, k.label, [pop[700]]]),
    ...(p.selection?.cursors ?? []).map((k, i) => [`selection.cursors.${i}.label`, k.label, [pop[700]]]),
    ...(p.gesture && gutt ? [['gesture.text', p.gesture.text, [gutt]]] : [])
  ].filter(([, t]) => typeof t === 'string' && t)
}

function validarPlan(plan) {
  const errores = []
  const avisos = []
  const sinMotivo = []

  if (!Array.isArray(plan) || !plan.length) return { errores: ['el plan debe ser un arreglo con al menos una pieza'], avisos }
  const ids = plan.map(p => p?.id)
  const repetidos = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
  const faltan = only.filter(id => !ids.includes(id))

  if (repetidos.length) errores.push(`ids repetidos (uno sobrescribiría al otro en out/): ${repetidos.join(', ')}`)
  // En macOS y Windows `KV-01` y `kv-01` son el mismo archivo: dos ids que sólo difieren en mayúsculas se pisan en disco
  // (tramo 8; auditoría de arquitectura, hallazgo 4).
  const minusculas = ids.map(id => String(id ?? '').toLowerCase())
  const casi = [...new Set(ids.filter((id, i) => minusculas.indexOf(minusculas[i]) !== i && !repetidos.includes(id)))]

  if (casi.length) errores.push(`ids que sólo difieren en mayúsculas (en macOS y Windows son el mismo archivo): ${casi.join(', ')}`)
  if (faltan.length) errores.push(`no están en el plan: ${faltan.join(', ')}`)

  for (const p of plan.filter(x => !only.length || only.includes(x?.id))) {
    const e = m => errores.push(`${p?.id ?? '(sin id)'}: ${m}`)

    if (!p || typeof p !== 'object') { e('la pieza no es un objeto'); continue }
    if (!p.dominant && !p.label && !p.lead) { e('pieza muda (sin texto): este comando compone piezas con CTA — usa `pnpm foto:componer`'); continue }
    if (!p.cta || typeof p.cta !== 'object') { e('falta `cta`: este comando es para piezas con CTA — sin CTA usa `pnpm foto:componer`'); continue }

    // Tipos, rangos, enums y campos desconocidos: el esquema declarativo (scripts/foto/cta-esquema.mjs).
    const r = validarPiezaEsquema(p)

    r.errores.forEach(e)
    r.avisos.forEach(a => avisos.push(`${p.id}: ${a}`))
    if (r.errores.length) continue

    if (!fs.existsSync(path.resolve(PLAN_DIR, p.plate))) e(`no existe el plate \`${p.plate}\``)

    // Cobertura de glifos (tramo 3): un carácter que la fuente no tiene sale como un cuadro vacío —emoji, hebreo—
    // y ningún chequeo de contraste lo ve (auditoría 2026-09-23, hallazgo 4). Se valida con la fuente que dibuja
    // cada voz.
    for (const [campo, textoCampo, fuentes] of camposConFuente(p)) {
      const faltan = sinGlifo(desescaparXml(textoCampo), fuentes)

      if (faltan.length) e(`\`${campo}\` usa caracteres que su fuente no tiene (saldrían como cuadros vacíos): ${faltan.map(ch => `«${ch}» U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(', ')}`)
    }

    if (p.cta.seleccion != null) {
      try {
        resolveCollaborationSelectionIntent(intencionSeleccionCta(p.cta))
      } catch (err) {
        e(`\`cta.seleccion\` no cumple el contrato AXIS de selección: ${String(err.message).split('\n')[0]}`)
      }
    }

    if (p.gesture && !gutt) e(`declara \`gesture\` y la fuente Guttery no está en ${GUTTERY}: el gesto se perdería en silencio`)
    if (p.cta.variant !== 'auto' && !String(p.cta.variantReason ?? '').trim()) sinMotivo.push(p.id)
  }

  // El canon pide registrar el estilo del CTA y su motivo; sin motivo, la variante se copia del plan anterior.
  if (sinMotivo.length) {
    avisos.push(`${sinMotivo.length} pieza(s) eligen variante de CTA sin \`cta.variantReason\` (el canon pide registrar el motivo). Usa \`variant: "auto"\` con \`prominencia\`, o compara las tres con \`--variantes\`.`)
  }

  return { errores, avisos }
}

const validacion = validarPlan(SLIDES)

for (const a of validacion.avisos) console.warn(`  ⚠ ${a}`)
if (validacion.errores.length) throw new Error(`plan inválido — ${validacion.errores.join(' · ')}`)

fs.mkdirSync(`${OUT}/preview-390`, { recursive: true })

// Dos composiciones en la misma carpeta no pueden correr a la vez: se mezclaban (auditoría 2026-09-23, 7 de 8 corridas).
tomarBloqueo(`${PLAN_DIR}/out`)

// QA POR PLAN, con huellas. Una corrida completa borra el registro anterior (una corrida que falla no deja números
// viejos); una parcial lo conserva y FUSIONA sus piezas al final.
const QA_FILE = rutaQa(OUT, PLAN)
// La huella se toma del archivo que CORRE: un mutante o una copia del comando se delatan en el gate.
const HUELLA_COMANDO = huellaComando({ compositor: fileURLToPath(import.meta.url) })

if (!only.length) fs.rmSync(QA_FILE, { force: true })

// ════════════════════════════════════════════════════════════════════════════════════════════════
// 🔴 GUARDA DE SUJETO EN 2D [operador, 2026-09-22]
// El texto NUNCA tapa al sujeto — personas, criaturas, manos, objetos del oficio —, crezca o no.
//
// Por qué no alcanzaba lo que había: `subjectProtection` es un número DECLARADO a mano y sólo
// VERTICAL (compara el fondo del descriptor con un `top`). Si una pieza no lo trae —las 16 de
// aeo-final-safe-v07 no lo traen— no protege nada; si el sujeto está AL COSTADO del texto, tampoco.
// Y medir ese `top` por brillo o por borde falla justo en el caso peligroso: pelo oscuro sobre la
// banda oscura del canon (KV-02: brillo 735, borde 498, cabeza real en 465).
//
// La máscara sale de SEGMENTACIÓN semántica local (@imgly, el mismo motor de `pnpm ai:image:rmbg`):
// reconoce al sujeto por lo que ES, no por su luminancia. En KV-02 da 451 — del lado seguro — y marca
// a la persona con todo su pelo aunque se funda con el fondo. Se calcula una vez por plate y se
// cachea por SHA-256 del plate, así que regenerar el plate la invalida sola.
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `FOTO_MASCARAS_DIR` aísla la caché (las pruebas la envenenan a propósito sin tocar la compartida).
const MASK_CACHE_REPO = repo('node_modules/.cache/foto-sujeto')
const MASK_CACHE = process.env.FOTO_MASCARAS_DIR ? path.resolve(process.env.FOTO_MASCARAS_DIR) : MASK_CACHE_REPO
const GUARD_IDS = new Set(['etiqueta', 'entrada', 'dominante', 'cierre-frase', 'cierre-inferior', 'nota', 'cta', 'descriptor'])

// La entrada de caché sólo vale si sus METADATOS calzan: sha del plate, modelo y versión del segmentador, tamaño y sha
// de la propia máscara. Una máscara corrupta, truncada, de otro tamaño o de otra versión se regenera sola; antes una
// máscara en negro u 8×8 pasaba como `segmentacion` y el gate daba verde con el texto sobre el pelo (auditoría).
const VERSION_SEGMENTACION = versionPaquete('@imgly/background-removal-node')

async function subjectMask(platePath) {
  const bytes = fs.readFileSync(platePath)
  const plateSha = sha(bytes)
  const cached = path.join(MASK_CACHE, `${plateSha}.png`)
  // De dónde salió la máscara (tramo 6): el gate no certifica una leída de una caché ajena al repo.
  let origen = MASK_CACHE === MASK_CACHE_REPO ? 'cache-canonica' : 'cache-externa'
  const metaRuta = path.join(MASK_CACHE, `${plateSha}.json`)
  const { width: pw, height: ph } = await sharp(bytes).metadata()
  let alphaPng = null

  try {
    const m = JSON.parse(fs.readFileSync(metaRuta, 'utf8'))
    const png = fs.readFileSync(cached)

    if (m.plateSha === plateSha && m.modelo === 'medium' && m.version === VERSION_SEGMENTACION && m.ancho === pw && m.alto === ph && m.mascaraSha === sha(png)) alphaPng = png
  } catch {
    alphaPng = null
  }

  if (!alphaPng) {
    try {
      const mime = /\.jpe?g$/i.test(platePath) ? 'image/jpeg' : (/\.webp$/i.test(platePath) ? 'image/webp' : 'image/png')
      const blob = await removeBackground(new Blob([new Uint8Array(bytes)], { type: mime }), { model: 'medium', output: { format: 'image/png', quality: 1 } })

      alphaPng = await sharp(Buffer.from(await blob.arrayBuffer())).ensureAlpha().extractChannel(3).png().toBuffer()
      const info = await sharp(alphaPng).metadata()

      if (info.width !== pw || info.height !== ph) throw new Error(`la segmentación devolvió ${info.width}×${info.height} para un plate de ${pw}×${ph}`)
      escribirAtomico(cached, alphaPng)
      escribirAtomico(metaRuta, JSON.stringify({ plateSha, modelo: 'medium', version: VERSION_SEGMENTACION, ancho: pw, alto: ph, mascaraSha: sha(alphaPng) }))
      origen = 'fresca'
    } catch (e) {
      // Sin máscara no se inventa protección: la pieza se compone sin agrandar y el gate la rechaza (`sin-mascara`).
      console.warn(`  ⚠ no se pudo segmentar ${path.basename(platePath)}: ${e.message}`)

      return null
    }
  }

  // extractChannel(0) OBLIGATORIO: un PNG de un canal puede volver con 3 o 4 canales al leerlo, y entonces
  // `data[y * W + x]` indexa píxeles equivocados — medido: marcaba 19.794 px de sujeto bajo un texto que estaba
  // a 250 px de la persona. Se verifica el número de canales para que el error no vuelva en silencio.
  const { data, info } = await sharp(alphaPng).extractChannel(0).raw().toBuffer({ resolveWithObject: true })

  if (info.channels !== 1) throw new Error(`máscara de sujeto con ${info.channels} canales; se esperaba 1`)
  let marcados = 0

  for (let i = 0; i < data.length; i++) if (data[i] > 127) marcados++

  return { data, W: info.width, H: info.height, plateSha, origen, sha: sha(alphaPng), cobertura: +(marcados / data.length).toFixed(4) }
}

// Dos reglas con dos distancias (fracción del lado corto, medida como distancia REAL al borde de la caja,
// no como rectángulo inflado — el rectángulo castiga las esquinas un 41 % de más):
//   · NO TAPAR (error duro, cualquier tamaño): 1,2 %. Un texto que toca al sujeto no sale nunca.
//   · CRECER (sólo la búsqueda del tamaño): 3,5 %. Calibrado contra 30 piezas aprobadas (v07 de Codex y
//     CMP-001): la más justa deja 4,08 %. Con 1,2 % el descriptor de 04-elegida-916 crecía hasta rozar la
//     cabeza de Clawd — no tapar no basta, tiene que respirar. Si a tamaño original ya está más cerca que
//     esto, la pieza no crece: la composición aprobada se respeta y no se empeora.
// Tolerancia de ruido: 8 px de máscara (un grumo de ~3×3). Con 24 px una caja chica tragaba un contacto real
// (22 px de la cabeza de Clawd dentro del aire de «SEO + AEO»).
const CLEAR_TOUCH = 0.012
const CLEAR_GROW = 0.035
const MASK_NOISE_PX = 8

// `ruido`: píxeles de máscara tolerados. Al CRECER es 0 —en la duda, crecer menos—: la prueba P04 mostró que los 8 px
// tolerados eran una fila real de pelo y dejaban el descriptor a 3,36 % en vez de 3,5 %. Los 8 px quedan sólo para el
// bloqueo duro, donde un falso positivo frena el trabajo.
function guardHits(mask, boxes, canvasW, canvasH, clearFrac = CLEAR_TOUCH, ruido = MASK_NOISE_PX) {
  const sx = mask.W / canvasW, sy = mask.H / canvasH
  const clear = Math.min(canvasW, canvasH) * clearFrac
  const hits = []

  for (const { id, box } of boxes) {
    if (!box) continue
    const x0 = Math.max(0, Math.floor((box.left - clear) * sx)), x1 = Math.min(mask.W, Math.ceil((box.right + clear) * sx))
    const y0 = Math.max(0, Math.floor((box.top - clear) * sy)), y1 = Math.min(mask.H, Math.ceil((box.bottom + clear) * sy))
    let px = 0

    for (let y = y0; y < y1; y++) {
      const Y = (y + 0.5) / sy
      const dy = Math.max(box.top - Y, 0, Y - box.bottom)

      for (let x = x0; x < x1; x++) {
        if (mask.data[y * mask.W + x] <= 127) continue
        const X = (x + 0.5) / sx

        if (Math.hypot(Math.max(box.left - X, 0, X - box.right), dy) <= clear) px++
      }
    }

    if (px > ruido) hits.push({ id, px })
  }

  return hits
}

// Cuánto podría crecer el bloque para que el dominante llene su `dominantMax` (ver §13 del contrato).
function fillFactor(s, canvasW) {
  if (!s.dominant || !s.dominantMax || typeof s.dominantSize !== 'number') return 1
  const f0 = fontFor(R.ideaImpact, DOMINANT_WIDTH)

  const widest = Math.max(...s.dominant.replace(/\*\*|\[\[|\]\]/g, '').split('|').map(t => {
    const k = shape(t.trim(), f0, s.dominantSize, s.dominantTracking ?? em(R.ideaImpact.tracking))

    return k.ink.right - k.ink.left
  }))

  return widest > 0 ? (s.dominantMax * canvasW) / widest : 1
}

// Aplica un factor a todo lo tipográfico en px; los gaps que ya son fracción del dominante escalan solos.
function scaleSpec(s0, f, canvasW) {
  const s = structuredClone(s0)

  if (f === 1) return s

  // Los tamaños por defecto se materializan ANTES de escalar: una voz que dependía del default no crecía con
  // el resto y la jerarquía se deformaba al crecer. Hoy todos los planes los declaran; esto evita la trampa.
  if (s.lead && s.leadSize == null) s.leadSize = 70
  if (s.after && s.afterSize == null) s.afterSize = 74
  if (s.label && s.labelSize == null) s.labelSize = Math.round(canvasW * 0.024)
  if (s.note && s.note.size == null) s.note.size = Math.round(canvasW * 0.026)
  const px = v => (typeof v === 'number' ? Math.round(v * f) : v)

  for (const k of ['leadSize', 'dominantSize', 'afterSize', 'labelSize']) s[k] = px(s[k])
  if (s.note) for (const k of ['size', 'gapAfterClosure']) s.note[k] = px(s.note[k])
  if (s.cta) for (const k of ['fontSize', 'descriptorSize', 'paddingX', 'paddingY', 'radius', 'descriptorGap', 'gapAfterNote']) s.cta[k] = px(s.cta[k])

  return s
}

// Zona segura de AXIS para el formato (`axisAdvertising.safeArea`: feed 7,5 % × 6 %, story 10 % × 13 %). Tramo 4
// (auditoría 2026-09-23, hallazgo 8): nunca se leía, y sin declarar una zona el texto quedaba a 3–5 % del borde en
// 4:5 y 1:1, bajo la interfaz de la plataforma. El formato alto (9:16) es story; el resto, feed.
function zonaAxis(W, H) {
  const perfil = H / W >= 1.7 ? 'story' : 'feed'
  const z = axisAdvertising.safeArea[perfil]
  const pct = v => Number.parseFloat(v) / 100

  return { perfil, x0: pct(z.inline), y0: pct(z.block), x1: 1 - pct(z.inline), y1: 1 - pct(z.block) }
}

// La zona que se VERIFICA: la de AXIS como piso; el plan sólo puede estrecharla. La que UBICA el texto sigue siendo
// la declarada (`safeArea`, o `"axis"` para usar la de AXIS): así ninguna pieza ya aprobada se mueve al recomponer, y
// la que no cumple la reprueba el gate con su medición.
function zonaEfectiva(s, W, H) {
  const axis = zonaAxis(W, H)
  const d = s.safeArea === 'axis' ? axis : s.safeArea

  return d ? { perfil: axis.perfil, x0: Math.max(axis.x0, d.x0), y0: Math.max(axis.y0, d.y0), x1: Math.min(axis.x1, d.x1), y1: Math.min(axis.y1, d.y1) } : axis
}

// La zona de la FIRMA no es la del texto: los planes declaran `safeArea` para texto, botón y selección, y
// `signatureSafeArea` para la franja de la firma (v05–v07: texto hasta 0,65 del alto, firma entre 0,85 y 0,97). La firma se
// mide contra la zona de AXIS, estrechada por `signatureSafeArea` si el plan la declara. Antes se medía contra la del texto.
function zonaFirma(s, W, H) {
  const axis = zonaAxis(W, H)
  const d = s.signatureSafeArea && typeof s.signatureSafeArea.x0 === 'number' ? s.signatureSafeArea : null

  return d ? { perfil: axis.perfil, x0: Math.max(axis.x0, d.x0), y0: Math.max(axis.y0, d.y0), x1: Math.min(axis.x1, d.x1), y1: Math.min(axis.y1, d.y1), declarada: true } : { ...axis, declarada: false }
}

// Caja del logo con la fórmula del dibujo: ancho fracción del lado corto (o px), centro en `logo.x`, borde superior en
// `logo.y` o al pie. La usan la elección de variante, las invariantes y el dibujo.
const ASPECTO_LOGO = 196.68 / 837.07

function cajaLogo(s) {
  const lw = Math.round(s.logo.width <= 1 ? s.logo.width * Math.min(W, H) : s.logo.width)
  const lh = Math.round(lw * ASPECTO_LOGO)
  const lx = Math.round((s.logo.x != null ? s.logo.x * W : W / 2) - lw / 2)
  const ly = typeof s.logo.y === 'number' ? Math.round(s.logo.y * H) : Math.round(H - M * 0.85 - lh)

  return { left: lx, top: ly, right: lx + lw, bottom: ly + lh }
}

// Firma que pone OTRA herramienta después del compositor (en los sets v03–v07, `firmar.mjs` → firma-placement.mjs).
// El compositor no la dibuja, pero sabe dónde va a caer —misma geometría que esa herramienta: ancho 20 % del lado corto,
// centrada en horizontal, centro vertical en `signatureY` (0,935 por defecto)— y la reserva: nada puede caer ahí, el
// crecimiento la respeta y el gate la mide. Se declara con `firma: { modo: "externa", razon, y?, ancho? }`, o con
// `signatureY` en los planes que ya lo usan.
const firmaExternaDeclarada = s => !s.logo && (s.firma?.modo === 'externa' || (s.firma == null && typeof s.signatureY === 'number'))

function cajaFirmaExterna(s) {
  const ancho = Math.round(Math.min(W, H) * (s.firma?.ancho ?? 0.2))
  const alto = Math.round(ancho * ASPECTO_LOGO)
  const left = Math.round((W - ancho) / 2)
  const top = Math.round((s.firma?.y ?? s.signatureY ?? 0.935) * H - alto / 2)

  return { left, top, right: left + ancho, bottom: top + alto }
}

// El contraste de la firma externa, medido como lo mide esa herramienta (peor píxel de la caja, la mejor de las dos
// tintas oficiales): así el gate puede exigir el mismo 4,5:1 antes de que la firma exista.
async function contrasteFirmaExterna(buf, caja) {
  const { data } = await sharp(buf).extract({ left: Math.max(0, caja.left), top: Math.max(0, caja.top), width: Math.max(1, Math.min(W, caja.right) - Math.max(0, caja.left)), height: Math.max(1, Math.min(H, caja.bottom) - Math.max(0, caja.top)) }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let min = Infinity
  let max = -Infinity

  for (let i = 0; i < data.length; i += 3) {
    const l = lum(data[i], data[i + 1], data[i + 2])

    if (l < min) min = l
    if (l > max) max = l
  }

  const blanca = 1.05 / (max + 0.05)
  const navy = (min + 0.05) / (lum(2, 60, 112) + 0.05)

  return { contraste: +Math.max(blanca, navy).toFixed(2), variante: blanca >= navy ? 'negative' : 'color' }
}

let aspectoUrl = null

// El logo rasterizado como se dibuja (mismo SVG, misma densidad, mismo ancho), en RGBA crudo: la búsqueda y el QA miden
// el trazo real que se va a componer.
async function rasterLogo(variante, ancho) {
  const { data, info } = await sharp(await sharp(repo(`public/branding/${variante === 'color' ? 'logo-full.svg' : 'logo-negative.svg'}`), { density: 600 }).resize({ width: ancho }).png().toBuffer()).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  return { variante, data, w: info.width, h: info.height }
}

// Contraste del TRAZO del logo en (left, top): cada píxel de la firma contra el fondo que tapa, el 1 % peor (el mismo
// método que las voces, `medirGlifos`). `rgb` es el fondo sin texto, crudo, de 3 canales y del tamaño del lienzo.
function trazoLogo(rgb, logo, left, top) {
  const x0 = Math.max(0, left)
  const y0 = Math.max(0, top)
  const w = Math.min(W, left + logo.w) - x0
  const h = Math.min(H, top + logo.h) - y0

  if (w <= 0 || h <= 0) return null
  const fondo = Buffer.alloc(w * h * 3)
  const tinta = Buffer.alloc(w * h * 4)

  for (let y = 0; y < h; y++) {
    rgb.copy(fondo, y * w * 3, ((y0 + y) * W + x0) * 3, ((y0 + y) * W + x0 + w) * 3)
    logo.data.copy(tinta, y * w * 4, ((y0 - top + y) * logo.w + (x0 - left)) * 4, ((y0 - top + y) * logo.w + (x0 - left) + w) * 4)
  }

  return medirGlifos({ rgb: fondo, texto: tinta, ancho: w, alto: h, caja: { left: 0, top: 0, right: w, bottom: h }, umbral: UMBRALES.normalTextContrast })
}

// Busca una Y para la firma (ver `logo.y: "auto"`) DENTRO DE LA BANDA DEL PIE (tramo 6; auditoría de diseño, N1): entre
// lo último compuesto —texto, CTA, selección, tarjeta— más una holgura, y el borde inferior de la zona. Antes subía sin
// tope y encontraba «su» Y por encima del titular (KV-06-169): la firma dejaba de ser firma. Parte del pie histórico y
// sube; en cada Y exige, con alguna de las dos tintas oficiales, ≥ 4,5:1 en la caja Y en el trazo; no toca al sujeto
// (con holgura) ni una zona `protect`. Devuelve la Y y la tinta que la cumple, o `y: null` con la banda que recorrió.
async function buscarYFirma(s, bare, mask, zona, ocupados, protegidas = []) {
  const pie = cajaLogo({ ...s, logo: { ...s.logo, y: undefined } })
  const alto = pie.bottom - pie.top
  const holgura = Math.round(Math.min(W, H) * 0.02)
  const paso = Math.max(4, Math.round(H * 0.005))
  const techo = Math.max(Math.ceil(zona.y0 * H), ...ocupados.map(o => Math.ceil(o.bottom + holgura)))
  const piso = Math.min(pie.top, Math.floor(zona.y1 * H - alto))
  const banda = [+(techo / H).toFixed(4), +((piso + alto) / H).toFixed(4)]

  if (pie.left < zona.x0 * W - 0.5 || pie.right > zona.x1 * W + 0.5 || piso < techo) return { y: null, banda }
  const tintas = await Promise.all(['negative', 'color'].map(v => rasterLogo(v, pie.right - pie.left)))
  const { data: rgb } = await sharp(bare).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const toca = (a, b, m) => a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m

  for (let top = piso; top >= techo; top -= paso) {
    const caja = { left: pie.left, right: pie.right, top, bottom: top + alto }

    if (ocupados.some(o => toca(caja, o, holgura)) || protegidas.some(z => toca(caja, z, 0))) continue
    if (mask && guardHits(mask, [{ id: 'firma', box: caja }], W, H, CLEAR_TOUCH).length) continue

    for (const t of tintas) {
      const enCaja = await contrastUnder(bare, caja, t.variante === 'color' ? lum(2, 60, 112) : 1)
      const trazo = trazoLogo(rgb, t, caja.left, top)

      if (trazo && Math.min(enCaja, trazo.wcag) >= UMBRALES.normalTextContrast) return { y: top / H, variante: t.variante, banda }
    }
  }

  return { y: null, banda }
}

async function cajaUrl(s) {
  if (aspectoUrl == null) {
    const { width, height } = await sharp(await sharp(repo('src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg'), { density: 600 }).png().toBuffer()).metadata()

    aspectoUrl = height / width
  }

  const uw = Math.round(s.url.width * W)
  const left = Math.round(W / 2 - uw / 2)
  const top = Math.round(s.url.y * H)

  return { left, top, right: left + uw, bottom: top + Math.round(uw * aspectoUrl) }
}

async function composePiece(s, opts = {}) {
  // Salidas de la pieza: se escriben JUNTAS al final, sólo si la pieza pasó todos los chequeos y no es una prueba de
  // tamaño. Antes el SVG de controles y la evidencia se escribían en cada prueba del crecimiento, y el PNG antes de
  // los chequeos finales: una pieza que fallaba dejaba archivos nuevos al lado de un QA viejo (auditoría 2026-09-23).
  const salidas = []
  const guard = []
  const visibles = []
  // Líneas tal como quedaron compuestas, por voz: el QA las registra para que los cortes se puedan VERIFICAR
  // (viudas, cortes en palabra corta) sin mirar la imagen.
  const lineas = {}
  // Voces para la medición de accesibilidad: tinta, peso y tamaño tal como se compusieron (ver accesibilidad.mjs).
  const voces = []
  // Borde del CTA con contorno: la búsqueda del tamaño lo mide como límite (P05). Y la elección de variante en `auto`.
  // Cursores, etiquetas y marcos de TODA selección, con su destino: ninguno puede tapar otra voz de texto.
  const elementosSeleccion = []
  let ctaBorde = null
  let ctaBoton = null
  let ctaMarco = null
  let corchetes = null
  // El marco de la selección del CTA sólo existe en la pieza si se PINTA (corchetes o velo); en contorno y relleno
  // no se dibuja, y su caja no puede reprobar la zona segura.
  let ctaMarcoPintado = false
  let firmaQa = null
  let ctaVariante = null
  let ctaVarianteTokens = null
  const plate = path.resolve(PLAN_DIR, s.plate)
  const meta = await sharp(plate).metadata()

  W = meta.width; H = meta.height; M = Math.round(W * 0.07)
  // Ancho en pantalla de referencia: un teléfono (390 CSS px). `placement.anchoCssPx` (con razón) sólo puede ENDURECER:
  // una pantalla más chica achica el texto y exige más; una más grande no afloja nada, porque la misma pieza también
  // se ve en un teléfono. Antes `placement: 1600` bajaba WCAG de 4,5 a 3:1 en todas las voces y adelgazaba el borde,
  // sin aprobador y sin que el gate lo mencionara (auditorías de diseño N3 y de arquitectura N3, tramo 7).
  const ANCHO = Math.min(ANCHO_PANTALLA, s.placement?.anchoCssPx ?? ANCHO_PANTALLA)

  // `final` reescala el máster. Con otra proporción, `resize` RECORTA por defecto — y lo recortado puede ser texto.
  if (s.final && Math.abs(s.final[0] / s.final[1] - W / H) / (W / H) > 0.01) {
    throw new Error(`${s.id}: \`final\` ${s.final.join('×')} no tiene la proporción del plate ${W}×${H} — el reescalado recortaría la pieza`)
  }

  // La escala tipográfica ya NO se decide aquí con una heurística de alto: la decide el driver del final
  // probando factores y midiendo colisiones reales contra la máscara del sujeto (ver GUARDA DE SUJETO).

  let defs = ''
  let under = ''
  let body = ''
  const checks = []
  const tramos = []
  const layers = []

  // Oscurecimiento sólo donde el plate lo pide (gradual, desde arriba), declarado por lámina.
  const DARK = s.ink === 'dark'
  const INK = DARK ? C.inkOnLight : '#ffffff'
  const SOFT = DARK ? C.mutedOnLight : C.softOnDark
  const INK_L = DARK ? lum(0, 40, 77) : 1

  if (s.scrimTop) {
    defs += `<linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.scrimTop.color ?? (DARK ? '#ffffff' : '#050818')}" stop-opacity="${s.scrimTop.opacity}"/><stop offset="1" stop-color="#050818" stop-opacity="0"/></linearGradient>`
    under += `<rect x="0" y="0" width="${W}" height="${s.scrimTop.to * H}" fill="url(#st)"/>`
  }

  if (s.scrimBottom) {
    const y0 = s.scrimBottom.from * H

    defs += `<linearGradient id="sb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050818" stop-opacity="0"/><stop offset="1" stop-color="#050818" stop-opacity="${s.scrimBottom.opacity}"/></linearGradient>`
    under += `<rect x="0" y="${y0}" width="${W}" height="${H - y0}" fill="url(#sb)"/>`
  }

  if (s.hud) { const hudEl = hud({ lit: s.hud.lit, current: s.hud.current ?? null });

 defs += hudEl.defs; body += hudEl.svg }

  // PIEZA MUDA: sólo foto, firma y nada más. Es una categoría legítima del lenguaje —sirve de
  // descanso visual en el feed— y el compositor no la soportaba: sin `dominant` reventaba al medir
  // el ancho del bloque dominante. Una pieza sin voz salta toda la capa de texto y llega derecho al
  // logo y a la firma web.
  const muda = !s.dominant && !s.label && !s.lead

  // `centerX` (fracción del ancho) mueve el eje de un bloque centrado fuera del centro del lienzo: en 9:16
  // el aire libre casi nunca está al medio. Lo usan piezas aprobadas (v07 de Codex, 0,29–0,60); ignorarlo en
  // silencio ponía el CTA sobre una proyección clara (contraste 1,47 contra 15,14 del original).
  const AXIS_X = W * (s.centerX ?? 0.5)

  // Un bloque CENTRADO sobre un eje corrido se lee como un error: queda pegado a un borde, con aire desigual a
  // cada lado, y el ojo no encuentra el eje (03-referencia-916 de v07: eje 0,29, operador 2026-09-22 — «ahí se
  // vería mejor alineada a la izquierda por la posición»). Si el aire libre está a un costado, el bloque se
  // alinea a ESE costado, no se centra ahí.
  if (s.align === 'center' && Math.abs((s.centerX ?? 0.5) - 0.5) > 0.15) {
    throw new Error(
      `${s.id}: bloque centrado sobre un eje corrido (centerX ${s.centerX}). Un bloque centrado se ancla al centro ` +
        "del lienzo (±0,15); si el aire libre está a un costado, usa `align: 'left'` (y `cta.align: 'left'`) sin `centerX`."
    )
  }

  // El margen izquierdo nunca queda fuera de la zona segura declarada: en 9:16 la de Meta arranca en 8 % y el
  // margen del comando es 7 % — un bloque alineado a la izquierda quedaba 1 % bajo la UI de la plataforma.
  const zonaDeclarada = s.safeArea === 'axis' ? zonaAxis(W, H) : s.safeArea
  const MX = Math.max(M, (zonaDeclarada?.x0 ?? 0) * W)
  const x = s.align === 'center' ? AXIS_X : MX
  // Con `safeArea: "axis"` el texto también arranca dentro de la zona por arriba: si el `top` del plan queda sobre el borde
  // superior de la zona, baja hasta él. Sólo con "axis": las piezas aprobadas con otra zona no se mueven.
  let y = (s.safeArea === 'axis' ? Math.max(s.top ?? 0.05, zonaDeclarada.y0) : (s.top ?? 0.05)) * H

  // 1 · etiqueta
  if (s.label) {
    // Etiqueta blanca con marcador-estrella naranja: el acento vive en el glifo, la lectura en el blanco.
    const lsize = s.labelSize ?? Math.round(W * 0.024)
    const probe = shape(s.label, pop[700], lsize, em(R.structureLabel.tracking))
    const starR = lsize * 0.46
    const gapS = lsize * 0.55
    const totalW = (s.labelStar ? starR * 2 + gapS : 0) + (probe.ink.right - probe.ink.left)
    const lx0 = s.align === 'center' ? x - totalW / 2 : x
    const lab = block({ text: s.label, font: pop[700], size: lsize, tracking: em(R.structureLabel.tracking), leading: 1.2, x: lx0 + starR * 2 + gapS, topY: y, fill: INK, align: 'left' })
    const scy = (lab.box.top + lab.box.bottom) / 2

    // La estrella fue un marcador de misión propio del post de GTA VI: aquí es opt-in y por defecto NO va.
    body += (s.labelStar ? `<path d="${starPath(lx0 + starR, scy, starR)}" fill="${ACCENT}"/>` : '') + lab.svg
    checks.push({ id: 'etiqueta', box: lab.box, inkL: INK_L }); tramos.push(['etiqueta', lab.box, s.labelSize ?? lsize])
    voces.push({ id: 'etiqueta', box: lab.box, tinta: INK, peso: 700, px: lsize, lineas: lab.lines.length })
    y = lab.box.bottom + Math.round((s.labelGap ?? 0.10) * (s.dominantSize ?? 160))
  }

  // 2 · entrada
  if (s.lead) {
    const lr = R.ideaLead
    const leadPoppins = (s.leadFamily ?? 'poppins') === 'poppins'
    // `leadFill` es opcional y simétrico al `afterFill` que ya existía. Por defecto la entrada va en
    // `softOnDark` (#cfe4fa), que es token AXIS y funciona sobre un fondo FRÍO — nació en una pieza de
    // cielo violeta. Sobre FOTOGRAFÍA DE MARCA el fondo es neutro-cálido por contrato de colorimetría, y
    // ahí ese pastel azul pelea con la luz de la escena en vez de acompañarla: la jerarquía sobre foto se
    // construye con escala, peso y familia, y el color lo pone la fotografía.
    const le = richBlock({ text: s.lead, fonts: leadPoppins ? POP : BRIC(lr, lr.width, 760), size: s.leadSize ?? 70, tracking: leadPoppins ? em(R.structureCopy.tracking) : em(lr.tracking), leading: leadPoppins ? 1.5 : lr.lineHeight, x, topY: y, maxWidth: W * (s.textWidth ?? 0.8), fill: s.leadFill ?? SOFT, accentFill: INK, align: s.align })

    body += le.svg
    lineas.entrada = le.lines
    voces.push({ id: 'entrada', box: le.box, tinta: s.leadFill ?? SOFT, peso: leadPoppins ? 400 : lr.weight, px: s.leadSize ?? 70, lineas: le.lines.length })
    checks.push({ id: 'entrada', box: le.box, inkL: INK_L }); tramos.push(['entrada', le.box, s.leadSize ?? 70])
    y = le.box.bottom + Math.round((s.leadGap ?? 0.09) * (s.dominantSize ?? 160))
  }

  // 3 · dominante (+ selección colaborativa) — sólo en la pieza con voz
  const ir = R.ideaImpact
  const domFont = fontFor(ir, DOMINANT_WIDTH)
  // Ajuste al ancho máximo declarado (deja aire para etiquetas de colaboradores fuera de la caja).
  let domSize = s.dominantSize

  const widest = muda ? 0 : Math.max(...s.dominant.replace(/\*\*|\[\[|\]\]/g, '').split('|').map(t => { const k = shape(t.trim(), domFont, domSize, s.dominantTracking ?? em(ir.tracking));



return k.ink.right - k.ink.left }))

  if (s.dominantMax && widest > s.dominantMax * W) domSize = domSize * (s.dominantMax * W) / widest

  const dom = muda
    ? { svg: '', box: { left: 0, right: 0, top: 0, bottom: 0 }, accentBoxes: [] }
    : richBlock({ text: s.dominant, fonts: { base: domFont, bold: domFont }, size: domSize, tracking: s.dominantTracking ?? em(ir.tracking), leading: ir.lineHeight, x, topY: y, maxWidth: W * 0.9, fill: INK, align: s.align })

  if (!muda) {
    checks.push({ id: 'dominante', box: dom.box, inkL: INK_L })
    tramos.push(['dominante', dom.box, domSize])
    dom.accentBoxes.forEach((b, i) => checks.push({ id: `dominante-acento-${i}`, box: b, inkL: lum(255, 101, 0) }))
    voces.push({ id: 'dominante', box: dom.box, tinta: INK, peso: ir.weight, px: domSize, lineas: dom.lines.length })
    dom.accentBoxes.forEach((b, i) => voces.push({ id: `dominante-acento-${i}`, box: b, tinta: ACCENT, peso: ir.weight, px: domSize, lineas: 1, daltonismo: true }))
  }

  let selection = ''
  let selEvidence = null

  if (s.selection) {
    const onObject = Array.isArray(s.selection.box)

    const targetBox = onObject
      ? { left: s.selection.box[0] * W, top: s.selection.box[1] * H, right: s.selection.box[2] * W, bottom: s.selection.box[3] * H }
      : dom.box

    const manifest = resolveCollaborationSelectionIntent({
      targetId: 'dominante',
      targetKind: onObject ? (s.selection.targetKind ?? 'object') : 'text',
      variant: s.selection.variant ?? 'eight-handles',
      padding: s.selection.padding ?? 'standard',
      overlay: s.selection.overlay ?? 'subtle',
      cursors: s.selection.cursors.map(c =>
        c.state === 'moving'
          ? { id: c.id, kind: 'collaborator', state: 'moving', canvasRegion: c.region, action: 'move', label: c.label, participantKind: c.who ?? 'role' }
          : c.kind === 'local'
            ? { id: c.id, kind: 'local', targetId: 'dominante', anchor: c.anchor, action: c.action ?? 'select' }
            : { id: c.id, kind: 'collaborator', targetId: 'dominante', anchor: c.anchor, action: c.action ?? 'select', label: c.label, participantKind: c.who ?? 'role' }
      )
    })

    const colors = Object.fromEntries(s.selection.cursors.filter(c => c.color).map(c => [c.id, c.color]))

    const rendered = renderCollaborationSelection({
      manifest,
      targetBounds: targetBox,
      canvas: { width: W, height: H },
      measureLabel,
      presentation: { collaboratorScale: s.selection.scale ?? 1.8, localCursorScale: 1.2, participantColors: colors }
    })

    if (!rendered.evidence.withinCanvas) throw new LienzoError(`${s.id}: selección fuera del lienzo ${JSON.stringify({ target: rendered.evidence.target, bounds: rendered.bounds, labels: rendered.evidence.cursorEvidence.map(c => [c.id, c.labelBounds]) })}`)
    under += rendered.underlay
    selection = labelToPaths(rendered.overlay)
    if (/<text/.test(selection)) throw new Error(`${s.id}: quedó <text>`)
    selEvidence = { selection: rendered.evidence.selection, cursores: rendered.evidence.cursorEvidence.map(c => ({ id: c.id, labelBounds: c.labelBounds })) }
    if (!onObject) for (const c of rendered.evidence.cursorEvidence) { guard.push({ id: `cursor-${c.id}`, box: c.bounds }, { id: `etiqueta-${c.id}`, box: c.labelBounds }) }
    visibles.push({ id: 'seleccion', box: rendered.bounds }, ...rendered.evidence.cursorEvidence.flatMap(c => [{ id: `cursor-${c.id}`, box: c.bounds }, { id: `etiqueta-${c.id}`, box: c.labelBounds }]))
    if (!onObject) elementosSeleccion.push(...rendered.evidence.cursorEvidence.flatMap(c => [{ id: `cursor «${c.label ?? c.id}»`, box: c.bounds, destino: 'dominante' }, ...(c.labelBounds ? [{ id: `etiqueta «${c.label}»`, box: c.labelBounds, destino: 'dominante' }] : [])]))
  }

  body += dom.svg
  y = dom.box.bottom

  // display posterior (cierre de la frase) si existe
  if (s.after) {
    const ar = R.ideaMedium
    const afterPoppins = (s.afterFamily ?? 'poppins') === 'poppins'
    const af = richBlock({ text: s.after, fonts: afterPoppins ? POP : BRIC(ar, ar.width, 800), size: s.afterSize ?? 74, tracking: afterPoppins ? em(R.structureCopy.tracking) : em(ar.tracking), leading: afterPoppins ? 1.5 : ar.lineHeight, x, topY: y + Math.round((s.afterGap ?? 0.09) * domSize), maxWidth: W * (s.textWidth ?? 0.8), fill: s.afterFill ?? INK, align: s.align })

    af.accentBoxes.forEach((b, i) => checks.push({ id: `cierre-acento-${i}`, box: b, inkL: lum(255, 101, 0) }))
    af.accentBoxes.forEach((b, i) => voces.push({ id: `cierre-acento-${i}`, box: b, tinta: ACCENT, peso: afterPoppins ? 700 : ar.weight, px: s.afterSize ?? 74, lineas: 1, daltonismo: true }))

    body += af.svg
    lineas.cierre = af.lines
    voces.push({ id: 'cierre-frase', box: af.box, tinta: s.afterFill ?? INK, peso: afterPoppins ? 400 : ar.weight, px: s.afterSize ?? 74, lineas: af.lines.length })
    checks.push({ id: 'cierre-frase', box: af.box, inkL: s.afterFill ? undefined : INK_L }); tramos.push(['cierre', af.box, s.afterSize ?? 74])
    y = af.box.bottom
  }

  // gesto Guttery (máx. 1)
  if (s.gesture && gutt) {
    const g = shape(s.gesture.text, gutt, s.gesture.size, 0)
    const gx = s.gesture.x * W
    const gy = s.gesture.y * H

    body += `<g fill="${s.gesture.color ?? ACCENT}" transform="translate(${gx} ${gy}) rotate(${s.gesture.rotate ?? -6})">${g.paths}</g>`
    const gc = (s.gesture.color ?? ACCENT).replace('#', '')

    checks.push({ id: 'gesto', box: { left: gx + g.ink.left, right: gx + g.ink.right, top: gy + g.ink.top, bottom: gy + g.ink.bottom }, inkL: lum(parseInt(gc.slice(0, 2), 16), parseInt(gc.slice(2, 4), 16), parseInt(gc.slice(4, 6), 16)) })
  }

  // cierre inferior (sobre el piso oscuro de la escena)
  if (s.footer) {
    const fr = R.ideaLead
    const ft = richBlock({ text: s.footer.text, fonts: BRIC(fr, fr.width, 780), size: s.footer.size, tracking: em(fr.tracking), leading: fr.lineHeight, x: W / 2, topY: s.footer.y * H, maxWidth: W * 0.84, fill: SOFT, accentFill: INK, align: 'center' })

    ft.accentBoxes.forEach((b, i) => checks.push({ id: `cierre-inferior-acento-${i}`, box: b }))

    body += ft.svg
    checks.push({ id: 'cierre-inferior', box: ft.box })
    voces.push({ id: 'cierre-inferior', box: ft.box, tinta: SOFT, peso: fr.weight, px: s.footer.size, lineas: ft.lines.length })
  }

  // 4 · nota de dato: Poppins sobre la foto limpia (la tarjeta de vidrio era del post de GTA VI, no del lenguaje)
  if (s.note) {
    // En un bloque centrado que encadena la nota bajo el cierre, la nota se centra con él: alineada a la
    // izquierda sobre un eje centrado se lee como un error. La nota ubicada a mano (`x`/`y`) queda como está.
    const notaCentrada = s.align === 'center' && s.note.x == null && s.note.gapAfterClosure != null
    // `note.x: "columna"`: la nota arranca en la columna de las voces (tramo 4), como `cta.x`.
    const xNota = s.note.x === 'columna' ? MX : s.note.x != null ? s.note.x * W : (notaCentrada ? AXIS_X : MX)
    const nt = richBlock({ text: s.note.text, fonts: POP, size: s.note.size ?? Math.round(W * 0.026), tracking: 0, leading: 1.5, x: xNota, topY: s.note.gapAfterClosure != null ? y+s.note.gapAfterClosure : s.note.y * H, maxWidth: W * (s.note.width ?? 0.34), fill: SOFT, accentFill: INK, align: notaCentrada ? 'center' : 'left' })

    body += nt.svg
    lineas.nota = nt.lines
    voces.push({ id: 'nota', box: nt.box, tinta: SOFT, peso: 400, px: s.note.size ?? Math.round(W * 0.026), lineas: nt.lines.length })
    checks.push({ id: 'nota', box: nt.box, inkL: INK_L }); y=nt.box.bottom
  }

  // 4 · tarjeta
  let cardEl = null

  if (s.card) {
    if (!s.card.allowGtaCard) throw new Error(`${s.id}: la tarjeta de vidrio con línea naranja fue puntual del post de GTA VI; usa "note" (texto limpio) o declara card.allowGtaCard`)
    const cw = W * (s.card.width ?? 0.74)
    const cx = s.card.align === 'right' ? W - M - cw : s.align === 'center' ? AXIS_X - cw / 2 : M

    cardEl = card({ header: s.card.header, body: s.card.body, x: cx, bottom: s.card.bottom * H, width: cw })
  }

  // Composición: plate → (tarjeta: vidrio esmerilado real del propio plate) → underlay → texto → selección → logo

  // Campaign-only CTA experiment explicitly requested by operator. Existing AXIS renderer,
  // shaping and contrast helpers reused unchanged; no shared contract modified.
  if (s.cta) {
    let c=s.cta;
    const cy=y+c.gapAfterNote, padX=c.paddingX, padY=c.paddingY;
    // `cta.x: "columna"`: el CTA arranca en la columna del texto (el mismo x que las voces), en vez de una fracción
    // medida a mano que deja el botón 11–21 px corrido de la columna (auditoría 2026-09-23, hallazgo 9).
    const xCta=cc=>(cc.x==='columna'?(cc.variant==='text'?x-cc.paddingX:x):W*cc.x);
    let cx=xCta(c);

    // `variant: "auto"`: el autor declara la intención del canon (`prominencia`: discreta | delimitada | destacada →
    // texto | contorno | relleno) y la medición sobre la escena decide si la permite; si no, se escala a la variante
    // que separa más, nunca a una menos visible (scripts/foto/cta-variantes.mjs). La geometría del botón no depende
    // de la variante, así que se mide sobre la caja real antes de pintar.
    if(c.variant==='auto'&&s.ctaVarianteResuelta){
      c={...c,...s.ctaVarianteResuelta.tokens,variant:s.ctaVarianteResuelta.elegida};
      ctaVariante=s.ctaVarianteResuelta.qa;
    } else if(c.variant==='auto'){
      if(c.align==='center')cx=AXIS_X-(shape(c.text,pop[700],c.fontSize).advance+padX*2)/2;
      const t0=block({text:c.text,font:pop[700],size:c.fontSize,tracking:0,leading:1.2,x:cx+padX,topY:cy+padY,maxWidth:W*.65,fill:'#ffffff'});
      const caja={left:cx,top:cy,right:t0.box.right+padX,bottom:t0.box.bottom+padY};
      const escena=await sharp(plate).removeAlpha().raw().toBuffer();
      const acento=c.surfaceToken??'growthOnDark';
      const e=elegirVariante({prominencia:c.prominencia??'delimitada',rgb:escena,ancho:W,alto:H,caja,cssPx:tamanoEnPantalla(c.fontSize,W,ANCHO),tokens:{acento:C[acento],tintaDeclarada:c.inkToken?C[c.inkToken]:null,tintaSobreRelleno:C.inkOnLight,tintaSegura:C.inkOnDark}});
      const tokens=e.elegida==='solid'?{surfaceToken:acento,inkToken:'inkOnLight'}:e.elegida==='outline'?{surfaceToken:acento,inkToken:e.degradada?'inkOnDark':(c.inkToken??acento)}:{surfaceToken:acento,inkToken:acento};

      c={...c,variant:e.elegida,...tokens};
      ctaVariante={prominencia:s.cta.prominencia??'delimitada',elegida:e.elegida,escalo:e.escalo,motivo:e.motivo,...(e.degradada?{tintaDegradada:true}:{}),...(e.sinMargen?{sinMargen:true}:{})};
      ctaVarianteTokens=tokens;
      cx=xCta(c);
    }

    const solid=c.variant==='solid', outline=c.variant==='outline';
    // Retrocompatible: un plan que no declara tokens usa el par por defecto de la familia aprobada
    // (relleno = superficie de acento con tinta oscura; texto/contorno = tinta de acento).
    // `surfaceToken`/`inkToken` permiten variar el color por pieza — la regla dice «lima no obligatorio».
    const surfaceColor=C[c.surfaceToken] ?? C.growthOnDark;
    const ink=C[c.inkToken] ?? (c.variant==='solid' ? C.inkOnLight : C.growthOnDark);
    const hexLum=h=>lum(...h.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)));

    // La columna se resuelve con la variante YA decidida: en `text` es el texto el que va a la columna (tramo 4).
    cx=xCta(c);
    if(c.align==='center')cx=AXIS_X-(shape(c.text,pop[700],c.fontSize).advance+padX*2)/2;
    const t=block({text:c.text,font:pop[700],size:c.fontSize,tracking:0,leading:1.2,x:cx+padX,topY:cy+padY,maxWidth:W*.65,fill:ink});
    const b={left:cx,top:cy,right:t.box.right+padX,bottom:t.box.bottom+padY};

    ctaBoton=b;

    // El borde del contorno mide al menos 1 CSS px en un teléfono (390 px de ancho): 2 px fijos en un lienzo de 1920
    // eran 0,4 CSS px y se mezclaban con la escena (auditoría 2026-09-23, hallazgo 12). El relleno conserva su trazo
    // de 2 px: ahí separa el relleno, no la línea.
    const grosorBorde=outline?Math.max(2,Math.ceil(W/ANCHO)):2;

    if(outline)ctaBorde={box:b,L:hexLum(surfaceColor),radio:c.radius??0,grosor:grosorBorde};
    if(solid||outline)body+=`<rect x="${b.left}" y="${b.top}" width="${b.right-b.left}" height="${b.bottom-b.top}" rx="${c.radius}" fill="${solid?surfaceColor:'none'}" stroke="${surfaceColor}" stroke-width="${grosorBorde}"/>`;
    body+=t.svg;
    // 🔴 En `solid` NO se mide la tinta contra la escena: bajo un relleno opaco ese número no
    // significa nada, y por eso existía `skipContrast`. Pero saltar el bloque entero dejaba la clave
    // `contraste.cta` sin escribir, así que el QA salía limpio porque el dato NO EXISTÍA.
    // Ahora `solid` declara las DOS mediciones que sí importan:
    //   · ctaTextoTeorico  — tinta contra relleno (teórico basta: el relleno es plano)
    //   · surfaceBox       — para medir el RELLENO contra la escena sobre el píxel (mínimo local)
    checks.push({id:'cta',box:t.box,inkL:hexLum(ink),
      ...(solid?{skipContrast:true,ctaTextoTeorico:(Math.max(hexLum(surfaceColor),hexLum(ink))+.05)/(Math.min(hexLum(surfaceColor),hexLum(ink))+.05),surfaceBox:b,surfaceL:hexLum(surfaceColor)}:{})});
    // La selección se resuelve ANTES del descriptor: sólo depende de la caja del botón, y el descriptor
    // tiene que ubicarse bajo TODO el grupo —botón, corchetes y cursor—, no bajo el botón solo.
    // El CTA es un destino SELECCIONABLE completo del contrato AXIS (8 anclas: esquinas y centros de cada lado).
    // `cta.seleccion` (opcional; sin ella: marco según el tratamiento y cursor local en `end-center`):
    //   · marco: open-brackets | four-corners | eight-handles | ninguno. Por defecto (operador, 2026-09-23):
    //     contorno y relleno SIN marco —su rectángulo ya delimita la acción y los corchetes no cumplían ninguna
    //     función—; el de TEXTO conserva los corchetes, porque sin rectángulo «queda huérfano».
    //   · padding: compact | standard | open
    //   · cursores: [{ id, kind: local|collaborator, anchor, action, label, who, color }] — los colaboradores se
    //     anclan a esquinas (regla AXIS) y llevan etiqueta; la validación del plan los revisa antes de componer.
    const ci=intencionSeleccionCta(c);
    const cm=resolveCollaborationSelectionIntent(ci);
    const sel=c.seleccion??{};
    const coloresCta=Object.fromEntries((sel.cursores??[]).filter(k=>k.color).map(k=>[k.id,k.color]));
    const cr=renderCollaborationSelection({manifest:cm,targetBounds:b,canvas:{width:W,height:H},measureLabel,presentation:{localCursorScale:c.cursorScale,collaboratorScale:sel.escala??1.8,participantColors:coloresCta,frame:marcoCta(c)!=='ninguno'}});

    ctaMarco=cr.bounds;
    ctaMarcoPintado=marcoCta(c)!=='ninguno'||cm.selection.overlayOpacity>0;

    // Corchetes del CTA de texto (tramo 8; auditoría de diseño, N10): el trazo que AXIS dibuja (22 % del manejador, que
    // es el 0,8 % del ancho) medido como se ve en un teléfono, y su contraste contra la escena en las cuatro esquinas.
    if(marcoCta(c)==='open-brackets'){const hs=Math.max(7,W*0.008),g=hs*0.22,arm=Math.min(cr.bounds.right-cr.bounds.left,cr.bounds.bottom-cr.bounds.top)*0.12;const bb=cr.bounds;

corchetes={grosorCssPx:+(g*ANCHO/W).toFixed(2),esquinas:[[bb.left,bb.top],[bb.right-arm,bb.top],[bb.left,bb.bottom-arm],[bb.right-arm,bb.bottom-arm]].map(([x0,y0])=>({left:x0-g,top:y0-g,right:x0+arm+g,bottom:y0+arm+g}))};}

    // 🔴 Descriptor bajo el GRUPO, no bajo el botón [2026-09-22, operador: «el texto debajo del CTA está
    // muy pegado»]. Antes se medía `descriptorGap` desde el borde del botón, pero los corchetes se dibujan
    // ~8 px por fuera de ese borde: con el gap de 14 que usaban los planes, entre el corchete y el texto
    // quedaban ~6 px. Ahora el gap se mide desde el borde de la selección y tiene un piso de 0,6 × el
    // cuerpo del descriptor, así que ningún plan puede dejarlo pegado. Y si el cursor cae sobre el
    // descriptor en el eje X (botón más angosto que el descriptor, §8 del doc), el descriptor baja
    // bajo la flecha: el choque que antes sólo se veía mirando la pieza ya no puede ocurrir.
    const descGap=Math.max(c.descriptorGap??0,Math.round(c.descriptorSize*0.6));
    // El descriptor esquiva CUALQUIER cursor o etiqueta de la selección del CTA que caiga sobre él en el eje X.
    const obstaculos=cr.evidence.cursorEvidence.flatMap(k=>[k.bounds,k.labelBounds].filter(Boolean));
    const descAt=topY=>block({text:c.descriptor,font:pop[400],size:c.descriptorSize,tracking:0,leading:1.2,x:c.align==='center'?AXIS_X:(c.x==='columna'?x:cx),topY,maxWidth:W*.7,fill:'#ffffff',align:c.align});
    let descriptor=descAt(cr.bounds.bottom+descGap);

    for(let paso=0;paso<obstaculos.length;paso++){
      const choque=obstaculos.find(o=>descriptor.box.left<o.right&&descriptor.box.right>o.left&&descriptor.box.top<o.bottom+descGap&&descriptor.box.bottom>o.top);

      if(!choque)break;
      descriptor=descAt(choque.bottom+descGap);
    }

    body+=descriptor.svg;checks.push({id:'descriptor',box:descriptor.box,inkL:1});
    lineas.cta=t.lines;lineas.descriptor=descriptor.lines;
    // CTA: en `solid` la tinta se mide contra su relleno; en las otras, contra la escena. El relleno y el BORDE del
    // contorno son límites no textuales (WCAG 1.4.11, 3:1): el borde del contorno no se medía antes.
    voces.push({id:'cta',box:t.box,tinta:ink,peso:700,px:c.fontSize,lineas:t.lines.length,daltonismo:true,pisoTexto:UMBRALES.normalTextContrast,...(solid?{sobreColor:surfaceColor}:{})});
    if(solid||outline)voces.push({id:solid?'cta-relleno':'cta-borde',box:b,tinta:surfaceColor,limite:true,daltonismo:true});
    voces.push({id:'descriptor',box:descriptor.box,tinta:'#ffffff',peso:400,px:c.descriptorSize,lineas:descriptor.lines.length});

    if(!cr.evidence.withinCanvas){
      // Decir QUÉ se sale y POR DÓNDE: «se sale del lienzo» a secas no le dice al autor qué ancla cambiar.
      const lados=box=>[box.left<0&&'izquierda',box.top<0&&'arriba',box.right>W&&'derecha',box.bottom>H&&'abajo'].filter(Boolean);
      const fuera=[{id:'marco',box:cr.bounds},...cr.evidence.cursorEvidence.flatMap(k=>[{id:`cursor «${k.label??k.id}»`,box:k.bounds},...(k.labelBounds?[{id:`etiqueta «${k.label}»`,box:k.labelBounds}]:[])])].filter(o=>o.box&&lados(o.box).length);

      throw new LienzoError(`${s.id}: la selección del CTA se sale del lienzo — ${fuera.map(o=>`${o.id} por ${lados(o.box).join(' y ')}`).join(', ')||'(sin detalle)'}. Prueba otra esquina para el colaborador o acerca el CTA al centro.`);
    }

    guard.push({ id: 'cta-grupo', box: { left: b.left - 14, top: b.top - 14, right: b.right + 14, bottom: b.bottom + 14 } });
    elementosSeleccion.push(...cr.evidence.cursorEvidence.flatMap(k => [{ id: `cursor «${k.label ?? k.id}» del CTA`, box: k.bounds, destino: 'cta' }, ...(k.labelBounds ? [{ id: `etiqueta «${k.label}» del CTA`, box: k.labelBounds, destino: 'cta' }] : [])]));

    for (const cc of cr.evidence.cursorEvidence) {
      guard.push({ id: `cursor-cta`, box: cc.bounds });
      if (cc.labelBounds) guard.push({ id: `etiqueta-cta-${cc.id}`, box: cc.labelBounds });
    }

    visibles.push({ id: 'cta-seleccion', box: cr.bounds }, ...cr.evidence.cursorEvidence.flatMap(cc => [{ id: 'cursor-cta', box: cc.bounds }, ...(cc.labelBounds ? [{ id: `etiqueta-cta-${cc.id}`, box: cc.labelBounds }] : [])]));
    const ctaOverlay=labelToPaths(cr.overlay);

    if(/<text/.test(ctaOverlay))throw new Error(`${s.id}: el overlay del CTA quedó con <text> — se pintaría con una fuente del sistema`);
    body+=cr.underlay+ctaOverlay;
    salidas.push([`${s.id}-controls.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${cr.overlay}</svg>`]);
    salidas.push([`${s.id}-cta-evidence.json`,JSON.stringify({intent:ci,manifest:cm,geometry:cr.evidence,textBounds:t.box,descriptorBounds:descriptor.box,surface:b,variant:c.variant,colors:{surface:surfaceColor,ink},solidTextContrast:solid?(Math.max(hexLum(surfaceColor),hexLum(ink))+.05)/(Math.min(hexLum(surfaceColor),hexLum(ink))+.05):null},null,2)]);
  }

  const descriptorBox=checks.find(c=>c.id==='descriptor').box;

  // INVARIANTES DE MAQUETACIÓN (tramo 3): una sola función —cta-invariantes.mjs— para la búsqueda del tamaño, la
  // composición final y el gate. Cajas no degeneradas; texto, botón y firma sin tocarse; ninguna selección sobre una
  // voz que no es su destino (la regla que existía desde el 2026-09-22, ahora compartida); reserva editorial. La firma
  // y la url se ubican con la misma fórmula que el dibujo, así el crecimiento las ve antes de pintarlas.
  const elementosMaquetacion = cajasFirma => [
    ...checks.filter(c => GUARD_IDS.has(c.id)).map(c => ({ id: c.id, tipo: 'texto', box: c.box, ...(c.id === 'cta' && ctaBoton ? { dentroDe: 'cta-boton' } : {}) })),
    ...checks.filter(c => /-acento-/.test(c.id)).map(c => ({ id: c.id, tipo: 'acento', box: c.box })),
    ...(ctaBoton ? [{ id: 'cta-boton', tipo: 'cta', box: ctaBoton }] : []),
    ...(cardEl ? [{ id: 'tarjeta', tipo: 'texto', box: { left: cardEl.rect.left, top: cardEl.rect.top, right: cardEl.rect.left + cardEl.rect.width, bottom: cardEl.rect.top + cardEl.rect.height } }] : []),
    ...cajasFirma.map(f => ({ id: f.id, tipo: 'firma', box: f.box })),
    ...elementosSeleccion.map(el => ({ id: el.id, tipo: 'seleccion', box: el.box, destino: el.destino === 'cta' ? 'cta-boton' : el.destino }))
  ]

  const firmaPrevista = [
    ...(s.logo && s.logo.y !== 'auto' ? [{ id: 'logo', box: cajaLogo(s) }] : []),
    ...(firmaExternaDeclarada(s) ? [{ id: 'firma-externa', box: cajaFirmaExterna(s) }] : []),
    ...(s.url ? [{ id: 'url', box: await cajaUrl(s) }] : [])
  ]

  const maquetacion = invariantesMaquetacion({ ancho: W, alto: H, elementos: elementosMaquetacion(firmaPrevista) })
  // La búsqueda del tamaño respeta SIEMPRE la reserva: una excepción cambia el veredicto del gate sobre la pieza, nunca
  // cuánto crece (antes una excepción «reserva-editorial» la hacía crecer ×1,251 en vez de ×1,236; tramo 7).
  const reservaRota = fueraDeReserva({ elementos: elementosMaquetacion(firmaPrevista), reserva: s.editorialReserve })

  const violaDeclarada = Boolean(s.subjectProtection && descriptorBox.bottom > s.subjectProtection.top - s.subjectProtection.minClearance)
  const hits = opts.mask ? guardHits(opts.mask, [...checks.filter(c => GUARD_IDS.has(c.id)).map(c => ({ id: c.id, box: c.box })), ...guard], W, H, opts.dry ? CLEAR_GROW : CLEAR_TOUCH, opts.dry ? 0 : MASK_NOISE_PX) : []

  const fuera = checks.some(c => c.box.left < 0 || c.box.right > W || c.box.top < 0 || c.box.bottom > H)

  // Zona segura DECLARADA (`safeArea`, fracciones): la UI de la plataforma tapa lo que quede afuera. El
  // crecimiento no puede sacar nada de ella; a tamaño original, lo que ya esté afuera se avisa.
  const zona = zonaDeclarada && { left: zonaDeclarada.x0 * W - 0.5, top: zonaDeclarada.y0 * H - 0.5, right: zonaDeclarada.x1 * W + 0.5, bottom: zonaDeclarada.y1 * H + 0.5 }

  const fueraDeZona = zona
    ? [...checks.filter(c => GUARD_IDS.has(c.id)), ...visibles].filter(({ box }) => box && (box.left < zona.left || box.right > zona.right || box.top < zona.top || box.bottom > zona.bottom)).map(b => b.id)
    : []

  const resuelta = ctaVariante && ctaVarianteTokens ? { elegida: ctaVariante.elegida, tokens: ctaVarianteTokens, qa: ctaVariante } : null

  // Zonas PROTEGIDAS (`protect`): objetos de la escena que el texto no tapa aunque no sean una persona —el canto
  // iluminado de un monitor, un producto— (auditoría 2026-09-23, hallazgo 3). Mismo trato que el sujeto: al crecer
  // se descarta el factor; a tamaño final, aborta.
  const protegidas = (s.protect ?? []).flatMap(z => {
    const zb = { left: z.box[0] * W, top: z.box[1] * H, right: z.box[2] * W, bottom: z.box[3] * H }

    return [...checks.filter(c => GUARD_IDS.has(c.id)), ...guard].filter(c => c.box.left < zb.right && c.box.right > zb.left && c.box.top < zb.bottom && c.box.bottom > zb.top).map(c => `${c.id} tapa «${z.reason}»`)
  })

  if (opts.dry && (violaDeclarada || hits.length || fuera || fueraDeZona.length || protegidas.length || maquetacion.length || reservaRota.length)) return { ok: false, hits, resuelta }
  if (protegidas.length) throw Error(`${s.id}: el texto tapa una zona protegida — ${[...new Set(protegidas)].join(', ')}. Mueve el texto o acota la zona.`)
  if (fueraDeZona.length) console.warn(`  ⚠ ${s.id}: fuera de la zona segura declarada${zonaDeclarada.profile ? ` (${zonaDeclarada.profile})` : ''}: ${[...new Set(fueraDeZona)].join(', ')}`)
  if (violaDeclarada) throw Error(`${s.id}: el descriptor invade \`subjectProtection\` (baja hasta ${Math.round(descriptorBox.bottom)} px; el límite es ${s.subjectProtection.top - s.subjectProtection.minClearance})`)
  if (hits.length) throw Error(`${s.id}: el texto tapa al sujeto — ${hits.map(h => `${h.id} (${h.px} px)`).join(', ')}. Sube el \`top\`, acorta el copy o regenera el plate con más reserva.`)
  if (maquetacion.length) throw new LienzoError(`${s.id}: la maquetación no cumple — ${[...new Set(maquetacion)].join(' · ')}. Cambia la esquina del colaborador, el ancla del cursor o la posición de la firma.`)
  const base = sharp(plate)
  const baseBuf = await base.png().toBuffer()

  if (cardEl) {
    const { left, top, width, height, radius } = cardEl.rect
    const L = Math.round(left)
    const T = Math.round(top)
    const Wc = Math.round(width)
    const Hc = Math.round(height)
    const blurred = await sharp(baseBuf).extract({ left: L, top: T, width: Wc, height: Hc }).blur(22).modulate({ saturation: 1.15 }).png().toBuffer()
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Wc}" height="${Hc}"><rect width="${Wc}" height="${Hc}" rx="${radius}" fill="#fff"/></svg>`)
    const rounded = await sharp(blurred).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()

    layers.push({ input: rounded, left: L, top: T })
  }

  // Capa de TEXTO sola (RGBA): el cuerpo tal como se pinta, sin plate ni selección. Contra el fondo sin texto (`bare`)
  // da el contraste de cada TRAZO (auditoría 2026-09-23, hallazgo 3: la caja promediaba el aire entre letras).
  const capaTexto = async () => (await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${body}</svg>`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data
  // `pisoTexto`: la voz exige ese umbral aunque su tamaño la haga «texto grande» (el CTA: 4,5:1 siempre, tramo 7).
  const medirTrazos = (fondoRgb, texto) => Object.fromEntries(voces.filter(v => !v.limite && !v.sobreColor).map(v => [v.id, medirGlifos({ rgb: fondoRgb, texto, ancho: W, alto: H, caja: v.box, cssPx: tamanoEnPantalla(v.px, W, ANCHO), peso: v.peso, ...(v.pisoTexto ? { umbral: v.pisoTexto } : {}) })]))
  const underSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${under}${cardEl ? cardEl.svg.split('\n')[0] : ''}</svg>`)
  const bare = await sharp(baseBuf).composite([...layers, { input: underSvg, left: 0, top: 0 }]).png().toBuffer()

  // En la búsqueda del tamaño (dry) se mide el contraste de cada voz sobre el píxel real: crecer mueve las
  // cajas y puede dejar una voz sobre una zona clara (medido: «SEO + AEO» bajó sobre un monitor, 2,98).
  if (opts.dry) {
    const contraste = {}

    for (const c of checks) if (!c.skipContrast) contraste[c.id] = await contrastUnder(bare, c.box, c.inkL ?? 1)

    // Los LÍMITES del CTA también se miden al crecer (hallado por P05, 2026-09-22): el relleno del sólido y el borde
    // del contorno contra la escena. Antes el crecimiento podía mover el botón a una zona clara sin enterarse.
    for (const c of checks) if (c.surfaceBox) contraste[`${c.id}_superficie_vs_escena`] = await contrastUnder(bare, c.surfaceBox, c.surfaceL)
    if (ctaBorde) contraste.cta_borde_vs_escena = await contrastUnder(bare, ctaBorde.box, ctaBorde.L)

    // Y el TRAZO de cada voz (tramo 2): el crecimiento lo exige con margen, no sólo la caja.
    const { data: fondoRgb } = await sharp(bare).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const glifos = Object.fromEntries(Object.entries(medirTrazos(fondoRgb, await capaTexto())).filter(([, m]) => m).map(([k, m]) => [k, { wcag: m.wcag, umbral: m.umbralWcag }]))

    return { ok: true, hits, contraste, glifos, resuelta }
  }

  const top = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${body}${cardEl ? cardEl.svg.split('\n').slice(1).join('\n') : ''}${selection}</svg>`)

  salidas.push([`${s.id}-overlay.svg`, top])
  const topLayers = [{ input: top, left: 0, top: 0 }]

  let firmaSobreSujeto = null

  if (s.logo) {
    // `logo.y: "auto"` (tramo 4, hallazgo 7): desde el pie hacia arriba, la primera Y donde la firma mide ≥ 4,5:1, queda
    // dentro de la zona segura, no toca al sujeto y no choca con nada. Si no la hay, queda al pie y el gate la mide.
    let buscada
    let banda = null

    if (s.logo.y === 'auto') {
      const ocupados = [...elementosMaquetacion([]).filter(e => e.tipo !== 'acento').map(e => e.box), ...visibles.map(v => v.box).filter(Boolean), ...(cardEl ? [cardEl.box] : [])]
      const protect = (s.protect ?? []).map(z => ({ left: z.x0 * W, top: z.y0 * H, right: z.x1 * W, bottom: z.y1 * H }))
      const r = await buscarYFirma(s, bare, opts.mask, zonaFirma(s, W, H), ocupados, protect)

      buscada = r.y
      banda = r.banda
      if (buscada == null) console.warn(`  ⚠ ${s.id}: \`logo.y: "auto"\` no encontró en la banda del pie (${Math.round(r.banda[0] * 100)}–${Math.round(r.banda[1] * 100)} % del alto) una Y con ≥ 4,5:1 en la caja y el trazo, lejos del sujeto: la firma queda al pie y el gate la mide. Opciones: acortar o subir el texto para abrir la banda, \`logo.y\` explícito o un plate con lecho más oscuro/claro.`)
      // La tinta que cumplió en la búsqueda es la que se dibuja (si el plan no fija una).
      if (buscada != null && (!s.logo.variant || s.logo.variant === 'auto')) s.logo = { ...s.logo, variant: r.variante }
      s.logo = { ...s.logo, y: buscada ?? undefined }
    }

    // Variante automática por contraste medido en la zona real del logo (salvo que la pieza la declare).
    if (!s.logo.variant || s.logo.variant === 'auto') {
      const { left: lxTmp, top: lyTmp, right: rxTmp, bottom: byTmp } = cajaLogo(s)
      const lwTmp = rxTmp - lxTmp
      const lhTmp = byTmp - lyTmp
      // Se mide DONDE va la firma: antes se medía al pie aunque la pieza declarara `logo.y`.
      const cNeg = await contrastUnder(bare, { left: lxTmp, right: lxTmp + lwTmp, top: lyTmp, bottom: lyTmp + lhTmp }, 1)
      const cCol = await contrastUnder(bare, { left: lxTmp, right: lxTmp + lwTmp, top: lyTmp, bottom: lyTmp + lhTmp }, lum(2, 60, 112))

      s.logo.variant = cNeg >= cCol ? 'negative' : 'color'
    }

    const lb = await sharp(repo(`public/branding/${s.logo.variant === 'color' ? 'logo-full.svg' : 'logo-negative.svg'}`), { density: 600 }).resize({ width: Math.round(s.logo.width <= 1 ? s.logo.width * Math.min(W, H) : s.logo.width) }).png().toBuffer()
    const { width: lw, height: lh } = await sharp(lb).metadata()
    const lx = s.logo.x != null ? Math.round(s.logo.x * W - lw / 2) : Math.round(W / 2 - lw / 2)
    // `logo.y` (fracción del alto) ubica la firma fuera de la safe zone de la plataforma.
    // Sin el campo: firma al pie, comportamiento histórico.
    // 🔴 En 9:16 de pauta la firma al pie cae dentro de la UI — ver la receta en la skill.
    const ly = typeof s.logo.y === 'number' ? Math.round(s.logo.y * H) : Math.round(H - M * 0.85 - lh)

    topLayers.push({ input: lb, left: lx, top: ly })
    // El trazo de la firma tal como se dibuja (tramo 6): el gate lo exige ≥ 4,5:1, como la caja.
    const { data: rgbFirma } = await sharp(bare).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const { data: lbCrudo, info: lbInfo } = await sharp(lb).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const trazoFirma = trazoLogo(rgbFirma, { data: lbCrudo, w: lbInfo.width, h: lbInfo.height }, lx, ly)

    firmaQa = { anchoLadoCorto: +(lw / Math.min(W, H)).toFixed(3), y: +(ly / H).toFixed(4), ...(trazoFirma ? { trazo: { wcag: trazoFirma.wcag, umbralWcag: trazoFirma.umbralWcag, cumpleWcag: trazoFirma.cumpleWcag, pctBajoUmbral: trazoFirma.pctBajoUmbral } } : {}), ...(buscada !== undefined ? { auto: true, encontrada: buscada != null, banda } : {}) }
    checks.push({ id: 'logo', box: { left: lx, right: lx + lw, top: ly, bottom: ly + lh }, inkL: s.logo.variant === 'color' ? lum(2, 60, 112) : 1 })

    // La firma sobre el sujeto se AVISA, no aborta: hay piezas aprobadas así (medido 2026-09-22: KV-01-916 con la
    // firma sobre la cadera de la persona, mo3-no-creernos-916 sobre el pedestal) y decidir si bloquearla es del
    // operador. Queda en el QA para que el gate lo muestre.
    const firmaHits = opts.mask ? guardHits(opts.mask, [{ id: 'firma', box: { left: lx, right: lx + lw, top: ly, bottom: ly + lh } }], W, H, 0) : []

    if (firmaHits.length) {
      firmaSobreSujeto = firmaHits[0].px
      console.warn(`  ⚠ ${s.id}: la firma queda sobre el sujeto (${firmaSobreSujeto} px de su silueta) — revisa \`logo.y\`/\`logo.x\`.`)
    }
  }

  let master = await sharp(bare).composite(topLayers).png().toBuffer()

  // Firma web: SVG canónico url-lum con fusión de luminosidad no separable (compositor canónico, opacidad 0.72).
  if (s.url) {
    const src = await sharp(repo('src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg'), { density: 600 }).png().toBuffer()
    const uw = Math.round(s.url.width * W)
    const { height: uh0, width: uw0 } = await sharp(src).metadata()
    const uh = Math.round((uh0 * uw) / uw0)
    const left = Math.round(W / 2 - uw / 2)
    const topU = Math.round(s.url.y * H)
    const res = await compositeLuminosity({ backdropBytes: master, sourceBytes: src, left, top: topU, width: uw, opacity: 0.72 })

    master = res.output
    if (!res.evidence || res.evidence.method !== 'non-separable-luminosity') throw new Error('url-lum sin evidencia de fusión')
    checks.push({ id: 'url', box: { left, right: left + uw, top: topU, bottom: topU + uh }, skipContrast: true })
  }

  const contraste = {}

  // Con la firma y la url REALES (su tamaño sale del SVG rasterizado), las invariantes se verifican otra vez.
  const firmaReal = [...checks.filter(c => c.id === 'logo' || c.id === 'url').map(c => ({ id: c.id, box: c.box })), ...(firmaExternaDeclarada(s) ? [{ id: 'firma-externa', box: cajaFirmaExterna(s) }] : [])]

  // Firma externa: el mismo contrato que el logo (contraste, tamaño, sujeto), medido sobre la pieza sin firma.
  if (firmaExternaDeclarada(s)) {
    const caja = cajaFirmaExterna(s)
    const medida = await contrasteFirmaExterna(master, caja)
    const sobre = opts.mask ? guardHits(opts.mask, [{ id: 'firma', box: caja }], W, H, 0) : []

    contraste.firmaExterna = medida.contraste
    firmaQa = { externa: true, anchoLadoCorto: +((caja.right - caja.left) / Math.min(W, H)).toFixed(3), y: +(((caja.top + caja.bottom) / 2) / H).toFixed(4), variante: medida.variante }
    if (sobre.length) firmaSobreSujeto = sobre[0].px
  }

  const elementosFinales = elementosMaquetacion(firmaReal)
  const maquetacionFinal = invariantesMaquetacion({ ancho: W, alto: H, elementos: elementosFinales })
  const reservaFinal = fueraDeReserva({ elementos: elementosFinales, reserva: s.editorialReserve })

  if (maquetacionFinal.length) throw new LienzoError(`${s.id}: la maquetación no cumple — ${[...new Set(maquetacionFinal)].join(' · ')}. Cambia la esquina del colaborador, el ancla del cursor o la posición de la firma.`)
  if (reservaFinal.length) console.warn(`  ⚠ ${s.id}: ${reservaFinal.join(' · ')} (el gate lo bloquea salvo excepción «reserva-editorial»).`)
  // Zona segura VERIFICADA (tramo 4): la de AXIS como piso, con texto, botón, selección y firma. Aviso aquí; el gate
  // la bloquea (salvo excepción auditada).
  const ZE = zonaEfectiva(s, W, H)
  const ZF = zonaFirma(s, W, H)
  const fueraDe = (b, z) => b.left < z.x0 * W - 0.5 || b.right > z.x1 * W + 0.5 || b.top < z.y0 * H - 0.5 || b.bottom > z.y1 * H + 0.5

  // Un solo recorrido, en el orden de la maquetación: cada elemento contra SU zona (la firma, contra la de la firma).
  const fueraDeZonaFinal = [...new Set([...elementosFinales.filter(e => e.tipo !== 'acento'), ...visibles.filter(v => v.id !== 'cta-seleccion' || ctaMarcoPintado)].filter(e => e.box && fueraDe(e.box, e.tipo === 'firma' ? ZF : ZE)).map(e => e.id))]

  if (fueraDeZonaFinal.length) console.warn(`  ⚠ ${s.id}: fuera de la zona segura ${ZE.perfil} de AXIS: ${fueraDeZonaFinal.join(', ')}`)
  // El layout se escribe con la firma incluida y con los elementos que el gate vuelve a verificar.
  const layoutJson = JSON.stringify({ canvas: { width: W, height: H }, subjectProtection: s.subjectProtection, elements: checks.map(({ id, box }) => ({ id, box })), typography: { lead: s.leadSize, dominant: domSize, closure: s.afterSize, benefit: s.note?.size, cta: s.cta.fontSize, descriptor: s.cta.descriptorSize }, selection: selEvidence, maquetacion: { elementos: elementosFinales }, columna: s.align === 'center' ? null : x, ctaMarco, zonaSegura: { ...ZE } }, null, 2)

  salidas.push([`${s.id}-layout.json`, layoutJson])
  const out = s.final ? sharp(master).resize({ width: s.final[0], height: s.final[1] }) : sharp(master)

  const pngFinal = await out.png().toBuffer()

  salidas.push([`${s.id}.png`, pngFinal], [`preview-390/${s.id}.png`, await sharp(master).resize({ width: 390 }).png().toBuffer()])

  for (const c of checks) {
    if (c.box.left < 0 || c.box.right > W || c.box.top < 0 || c.box.bottom > H) throw new Error(`${s.id}: ${c.id} fuera del lienzo`)

    if (!c.skipContrast) contraste[c.id] = await contrastUnder(bare, c.box, c.inkL ?? 1)
    else if (c.ctaTextoTeorico) {
      // La clave que el QA lee, SIEMPRE presente sea cual sea la variante.
      contraste[c.id] = +c.ctaTextoTeorico.toFixed(2)
      // Y la que faltaba del todo: ¿se despega el botón del plate? Se mide sobre el píxel.
      contraste[`${c.id}_superficie_vs_escena`] = await contrastUnder(bare, c.surfaceBox, c.surfaceL)
    }
  }

  if (cardEl) contraste.tarjeta = await contrastUnder(bare, cardEl.textBoxes[0])

  // ── Accesibilidad sobre el píxel (scripts/foto/accesibilidad.mjs) ──────────────────────────────────
  // WCAG 2.2 AA por voz según su tamaño EN PANTALLA (390 CSS px), APCA Bronze como verificación de respaldo,
  // área bajo el umbral, daltonismo en las tintas de color y el texto alternativo con todo el texto visible.
  // Se mide sobre `bare` (plate + underlay, sin el texto). No cambia un solo píxel de la pieza.
  const { data: bareRgb } = await sharp(bare).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const accesibilidad = { voces: {} }

  for (const v of voces) {
    const m = v.sobreColor
      ? medirContraColor({ tinta: hexARgb(v.tinta), fondo: hexARgb(v.sobreColor), cssPx: tamanoEnPantalla(v.px, W, ANCHO), peso: v.peso, lineas: v.lineas, ...(v.pisoTexto ? { umbral: v.pisoTexto } : {}) })
      : medirVoz({
          rgb: bareRgb, ancho: W, alto: H, caja: v.box, tinta: hexARgb(v.tinta), daltonismo: Boolean(v.daltonismo),
          ...(v.limite ? { umbral: UMBRALES.essentialBoundaryContrast, apca: false } : { cssPx: tamanoEnPantalla(v.px, W, ANCHO), peso: v.peso, lineas: v.lineas, ...(v.pisoTexto ? { umbral: v.pisoTexto } : {}) })
        })

    // `metodo` le dice al gate qué medición exigir: sobre el píxel (y su trazo), contra un color plano, o un límite.
    accesibilidad.voces[v.id] = m && { ...m, metodo: v.sobreColor ? 'color' : v.limite ? 'limite' : 'pixel' }
  }

  // El VELO (`scrimTop`/`scrimBottom`) oscurece la foto para que el texto se lea. Si una voz pasa SÓLO gracias a él, el
  // QA lo registra y el gate lo muestra: es una decisión de diseño que alguien mira, no un pase que nadie ve
  // (auditoría de diseño, N5; tramo 7). Se mide la misma voz sobre la foto sin el velo ni los fondos del plan.
  if (s.scrimTop || s.scrimBottom) {
    const { data: sinVeloRgb } = await sharp(await sharp(baseBuf).composite(layers).png().toBuffer()).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const rescatadas = []

    for (const v of voces.filter(v => !v.limite && !v.sobreColor)) {
      const con = accesibilidad.voces[v.id]
      const sin = medirVoz({ rgb: sinVeloRgb, ancho: W, alto: H, caja: v.box, tinta: hexARgb(v.tinta), cssPx: tamanoEnPantalla(v.px, W, ANCHO), peso: v.peso, lineas: v.lineas, ...(v.pisoTexto ? { umbral: v.pisoTexto } : {}) })

      if (con?.cumpleWcag && sin && !sin.cumpleWcag) rescatadas.push({ voz: v.id, sinVelo: sin.wcag, conVelo: con.wcag })
    }

    if (rescatadas.length) accesibilidad.rescate = { por: ['scrimTop', 'scrimBottom'].filter(k => s[k]), voces: rescatadas }
  }

  // Una voz que no se pudo medir NO pasa por no tener dato (su caja no tiene píxeles dentro del lienzo). Antes el
  // nulo se filtraba y la voz desaparecía del veredicto en silencio.
  const sinMedir = Object.entries(accesibilidad.voces).filter(([, m]) => !m).map(([id]) => id)

  if (sinMedir.length) throw new Error(`${s.id}: no se pudo medir ${sinMedir.map(v => `«${v}»`).join(', ')} — su caja no tiene píxeles dentro del lienzo`)

  // El TRAZO de cada voz sobre el píxel (tramo 2). Una voz sin trazos visibles en su caja no pasa por no tener dato.
  const texto = await capaTexto()

  for (const [id, m] of Object.entries(medirTrazos(bareRgb, texto))) {
    if (!m) throw new Error(`${s.id}: «${id}» no tiene trazos visibles en su caja — no se puede medir su contraste`)
    const b = voces.find(v => v.id === id).box

    // `caja`: el rango EXACTO de píxeles medido (el mismo redondeo que medirGlifos), para que un oráculo lo repita.
    accesibilidad.voces[id].glifo = { ...m, caja: [Math.max(0, Math.floor(b.left)), Math.max(0, Math.floor(b.top)), Math.min(W, Math.ceil(b.right)), Math.min(H, Math.ceil(b.bottom))] }
  }

  // El BORDE del contorno como se ve en un teléfono: la pieza reducida a 390 CSS px × DPR 2 (tramo 2).
  if (ctaBorde && accesibilidad.voces['cta-borde']) {
    const k = (ANCHO * DPR_REFERENCIA) / W
    const [fin, fon] = await Promise.all([master, bare].map(b => sharp(b).resize({ width: Math.round(W * k) }).removeAlpha().raw().toBuffer({ resolveWithObject: true })))
    const esc = b => ({ left: b.left * k, top: b.top * k, right: b.right * k, bottom: b.bottom * k })
    const anillo = medirAnillo({ final: fin.data, fondo: fon.data, ancho: fin.info.width, alto: fin.info.height, caja: esc(ctaBorde.box), radio: ctaBorde.radio * k, grosor: ctaBorde.grosor * k })

    if (!anillo) throw new Error(`${s.id}: no se pudo medir el borde del CTA en la vista de teléfono`)
    accesibilidad.voces['cta-borde'].anillo = anillo
  }

  if (process.env.FOTO_EVIDENCIA === '1') salidas.push([`${s.id}-texto.png`, await sharp(texto, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()], [`${s.id}-fondo.png`, bare])
  const medidas = Object.values(accesibilidad.voces)

  accesibilidad.cumpleWcag = medidas.every(m => m.cumpleWcag)
  accesibilidad.cumpleApca = medidas.filter(m => m.cumpleApca != null).every(m => m.cumpleApca)
  accesibilidad.cumpleDaltonismo = medidas.filter(m => m.daltonismo).every(m => m.cumpleDaltonismo)
  accesibilidad.cumpleTrazo = medidas.filter(m => m.glifo).every(m => m.glifo.cumpleWcag) && medidas.filter(m => m.anillo).every(m => m.anillo.cumpleWcag)

  // Corchetes: el peor contraste de las cuatro esquinas (tinta del marco AXIS #a6cdf5 contra la escena, 3:1 de límite).
  if (corchetes) {
    const medidas = corchetes.esquinas.map(b => medirVoz({ rgb: bareRgb, ancho: W, alto: H, caja: b, tinta: hexARgb('#a6cdf5'), umbral: UMBRALES.essentialBoundaryContrast, apca: false })).filter(Boolean)

    accesibilidad.corchetes = { grosorCssPx: corchetes.grosorCssPx, wcag: medidas.length ? Math.min(...medidas.map(m => m.wcag)) : null, umbralWcag: UMBRALES.essentialBoundaryContrast }
  }

  accesibilidad.altText = textoAlternativo(s)
  accesibilidad.altTextEscena = Boolean(String(s.altText ?? '').trim())
  salidas.push([`${s.id}.alt.txt`, `${accesibilidad.altText}\n`])

  // Gap de tinta real entre tramos (no leading): top(siguiente) − bottom(anterior)
  const gaps = []

  for (let i = 1; i < tramos.length; i++) gaps.push({ entre: `${tramos[i - 1][0]}→${tramos[i][0]}`, px: +(tramos[i][1].top - tramos[i - 1][1].bottom).toFixed(1), ratioDominante: +((tramos[i][1].top - tramos[i - 1][1].bottom) / domSize).toFixed(3) })
  // REGLA DE LAS TRES VECES [operador, 2026-09-21]: el dominante manda sólo si mide al menos 3× la
  // entrada. Medido en esta misma pieza a lo largo de cuatro versiones: a 2,8× el operador dijo que la
  // jerarquía no estaba resuelta; a 4,0× la aprobó. El caso canónico («Nivel de búsqueda») está en 3,8×.
  // Es condición NECESARIA, no suficiente: la versión de 2,8× fallaba además por color y por no tener
  // cierre. Avisa, no aborta — en columna angosta (16:9) el ratio compite con la legibilidad a 390 px y
  // ahí gana la legibilidad, pero entonces la excepción se declara mirando el número, no por descuido.
  const ratio = s.lead && !muda ? +(domSize / (s.leadSize ?? 70)).toFixed(1) : null

  if (ratio !== null && ratio < 3) {
    console.warn(
      `  ⚠ ${s.id}: el dominante mide ${ratio}× la entrada (regla de las tres veces: ≥3×). ` +
        'Debajo de 3× la jerarquía se aplana. Sube `dominantSize` o baja `leadSize`; si es un formato de ' +
        'columna angosta y el ratio compite con la legibilidad a 390 px, declara la excepción.'
    )
  }

  const huellas = { pieza: opts.huellaPieza ?? null, plate: opts.plateSha ?? null, compositor: HUELLA_COMANDO, png: sha(pngFinal), layout: sha(layoutJson) }
  const registro = { id: s.id, dominante: dom.lines, ratioDominanteEntrada: ratio, contraste, gapsTinta: gaps, seleccion: selEvidence, escala: opts.factor ?? 1, lineas, accesibilidad, guardaSujeto: opts.mask ? 'segmentacion' : 'sin-mascara', ...(opts.mask ? { mascara: { origen: opts.mask.origen, sha: opts.mask.sha, cobertura: opts.mask.cobertura } } : {}), ...(s.subjectGuard?.ignore?.length ? { zonasIgnoradas: s.subjectGuard.ignore } : {}), ...(firmaSobreSujeto ? { firmaSobreSujeto } : {}), ...(ctaVariante ? { ctaVariante } : {}), maquetacion: maquetacionFinal, ...(reservaFinal.length ? { fueraDeReserva: reservaFinal } : {}), zonaSegura: ZE, zonaFirma: ZF, fueraDeZona: fueraDeZonaFinal, anchoPantalla: ANCHO, ...(firmaQa ? { firma: firmaQa } : {}), huellas }

  for (const [rel, datos] of salidas) escribirAtomico(`${OUT}/${rel}`, datos)
  qa.push(registro)
  registrarQa(registro)
}

// El QA se escribe pieza por pieza, DESPUÉS de sus archivos: en ningún momento el registro apunta a un PNG que no es el
// suyo. Una corrida completa arrancó con el registro vacío; una parcial FUSIONA sus piezas con las que ya estaban.
// Sólo quedan piezas que siguen en el plan.
function registrarQa(registro) {
  let previo = []

  try {
    previo = JSON.parse(fs.readFileSync(QA_FILE, 'utf8'))
  } catch {
    previo = []
  }

  const vigentes = (Array.isArray(previo) ? previo : []).filter(r => r?.id !== registro.id && (VARIANTES || HUELLAS_PLAN.has(r?.id)))

  escribirAtomico(QA_FILE, JSON.stringify([...vigentes, registro], null, 2))
}

// Driver: decide el factor de escala MIDIENDO, no estimando. Sólo formatos donde el texto se pierde en el
// lienzo (horizontal y vertical alto); 4:5 nunca crece. Busca el mayor factor ≤ 1,6 que cumpla DOS cosas:
// (1) ninguna caja protegida toca al sujeto; (2) ninguna voz pierde legibilidad — su contraste no baja de
// lo que tenía a tamaño original (con techo de exigencia 4,5). Sin máscara no se crece: la ausencia de
// prueba no es permiso.
const GROW_CAP = 1.6
const CONTRAST_FLOOR = 4.5
const MARGEN_CRECER = 1.1

// Zonas que la pieza declara como falso positivo de la segmentación (un afiche, una pantalla del fondo que el
// modelo tomó por sujeto). Se apagan SÓLO para esta pieza, cada una con su razón, y quedan en el QA para
// quien revise. Nunca se apaga la guarda entera.
function maskForPiece(mask, s, canvasW, canvasH) {
  const zonas = s.subjectGuard?.ignore ?? []

  if (!mask || !zonas.length) return mask
  const data = Buffer.from(mask.data)
  const sx = mask.W / canvasW, sy = mask.H / canvasH

  for (const { box: [x0, y0, x1, y1] } of zonas) {
    for (let y = Math.max(0, Math.floor(y0 * canvasH * sy)); y < Math.min(mask.H, Math.ceil(y1 * canvasH * sy)); y++) {
      data.fill(0, y * mask.W + Math.max(0, Math.floor(x0 * canvasW * sx)), y * mask.W + Math.min(mask.W, Math.ceil(x1 * canvasW * sx)))
    }
  }

  return { ...mask, data }
}

// Una prueba de tamaño que se sale del lienzo descarta ese factor; cualquier otro error sigue siendo un error.
async function probar(s, mask) {
  try {
    return await composePiece(s, { dry: true, mask })
  } catch (e) {
    if (e instanceof LienzoError) return { ok: false, hits: [] }
    throw e
  }
}

// En `--variantes`, cada pieza se compone en sus tres tratamientos con el mismo acento: el sólido lo porta en el
// relleno (tinta oscura encima), el contorno en el borde y la tinta, el de texto en la tinta (canon).
function especVariante(s0, v) {
  const s = structuredClone(s0)
  const acento = s.cta.surfaceToken ?? 'growthOnDark'

  s.id = `${s0.id}--${v}`
  s.cta.variant = v
  if (v === 'solid') Object.assign(s.cta, { surfaceToken: acento, inkToken: 'inkOnLight' })
  else if (v === 'outline') Object.assign(s.cta, { surfaceToken: acento, inkToken: s0.cta.variant === 'outline' ? (s0.cta.inkToken ?? acento) : acento })
  else Object.assign(s.cta, { surfaceToken: acento, inkToken: acento })

  return s
}

const trabajo = SLIDES.filter(x => !only.length || only.includes(x.id)).flatMap(s0 => (VARIANTES ? ORDEN_VARIANTES.map(v => especVariante(s0, v)) : [s0]))

// Un plate que no se puede leer se nombra con su pieza ANTES de componer nada (tramo 8; auditoría de arquitectura,
// hallazgo 14): antes salía «Input file contains unsupported image format» sin decir de qué pieza.
for (const s0 of trabajo) {
  try {
    await sharp(path.resolve(PLAN_DIR, s0.plate)).stats()
  } catch (e) {
    throw new Error(`${s0.id}: el plate \`${s0.plate}\` no es una imagen legible (${e.message})`)
  }
}

for (let s0 of trabajo) {
  const plate0 = path.resolve(PLAN_DIR, s0.plate)
  const { width: pw, height: ph } = await sharp(plate0).metadata()
  const plateSha = sha(fs.readFileSync(plate0))
  const huellaBase = HUELLAS_PLAN.get(VARIANTES ? s0.id.replace(/--(text|outline|solid)$/, '') : s0.id) ?? null
  const mask = maskForPiece(await subjectMask(plate0), s0, pw, ph)

  if (!mask) console.warn(`  ⚠ ${s0.id}: la segmentación del sujeto no corrió — sólo protege \`subjectProtection\` si está declarada.`)
  const fill = fillFactor(s0, pw)
  let factor = 1

  // `textGrowth: false` congela la pieza a su tamaño declarado: sirve para recomponer un set YA APROBADO sin
  // que el crecimiento lo cambie (medido 2026-09-22: 40 piezas aprobadas cambiarían de tamaño al recomponer).
  // `variant: "auto"` se resuelve UNA vez, a tamaño original, y queda fija mientras el texto crece: si se volviera a
  // decidir en cada prueba de tamaño, el crecimiento compararía contrastes de variantes distintas.
  if (s0.cta?.variant === 'auto') {
    const r = await probar(scaleSpec(s0, 1, pw), mask)

    if (r.resuelta) s0 = { ...s0, ctaVarianteResuelta: r.resuelta }
  }

  if (s0.textGrowth !== false && (pw > ph || ph / pw > 1.5) && fill > 1.01) {
    if (mask) {
      const base = await probar(scaleSpec(s0, 1, pw), mask)

      const ok = async f => {
        if (!base.ok) return false

        const r = await probar(scaleSpec(s0, f, pw), mask)

        if (!r.ok) return false

        // Techo por tipo (AXIS): texto 4,5:1; los límites no textuales del CTA, 3:1.
        const techo = k => (/superficie|borde/.test(k) ? UMBRALES.essentialBoundaryContrast : CONTRAST_FLOOR)

        // La tolerancia de 0,05 es para ruido de medición y nunca cruza el umbral: una voz que cumplía a ×1 no puede
        // quedar en 4,47 al crecer (hallado 2026-09-22 comparando \`auto\` con \`--variantes\`).
        const cajas = Object.entries(base.contraste ?? {}).every(([k, v]) => (r.contraste[k] ?? 0) >= Math.min(v - 0.05, techo(k)))

        // El TRAZO, con margen (tramo 2): crecer mueve el texto sobre fondo nuevo, y una voz que queda justo en el umbral
        // en el plate queda bajo él en la primera compresión de la red. Piso: umbral × 1,1, o lo que ya tenía a ×1.
        const trazos = Object.entries(base.glifos ?? {}).every(([k, g]) => (r.glifos?.[k]?.wcag ?? 0) >= Math.min(g.wcag - 0.05, g.umbral * MARGEN_CRECER))

        return cajas && trazos
      }

      const hi0 = Math.min(fill, GROW_CAP)

      if (await ok(hi0)) factor = hi0
      else if (await ok(1.02)) {
        let lo = 1.02, hi = hi0

        for (let i = 0; i < 6; i++) {
          const m = (lo + hi) / 2

          if (await ok(m)) lo = m
          else hi = m
        }

        factor = lo
      }
    }
  }

  await composePiece(scaleSpec(s0, factor, pw), { mask, factor, plateSha, huellaPieza: huellaBase })
}

// Hoja comparativa: las tres variantes a 390 px con lo que dice la medición de cada una.
if (VARIANTES) {
  for (const s0 of SLIDES.filter(x => !only.length || only.includes(x.id))) {
    const paneles = []

    for (const v of ORDEN_VARIANTES) {
      const q = qa.find(r => r.id === `${s0.id}--${v}`)
      const f = `${OUT}/preview-390/${s0.id}--${v}.png`

      if (!q || !fs.existsSync(f)) continue
      const m = q.accesibilidad?.voces ?? {}
      const limite = m['cta-relleno'] ?? m['cta-borde']
      const peorDalt = m.cta?.daltonismo ? Math.min(...Object.values(m.cta.daltonismo)) : null

      const rotulo = [`${{ text: 'texto', outline: 'contorno', solid: 'relleno' }[v]}${q.accesibilidad?.cumpleWcag ? '' : ' · ✗ WCAG'}`,
        `tinta ${m.cta?.wcag ?? '—'}:1${limite ? ` · límite ${limite.wcag}:1` : ''} · APCA ${m.cta?.apca ?? '—'}${peorDalt != null ? ` · daltonismo ${peorDalt}:1` : ''}`]

      paneles.push({ img: await sharp(f).png().toBuffer(), rotulo })
    }

    if (!paneles.length) continue
    const meta = await sharp(paneles[0].img).metadata()
    const alto = meta.height + 46

    const capas = paneles.flatMap((p, i) => [
      { input: p.img, left: i * (meta.width + 12), top: 46 },
      { input: Buffer.from(`<svg width="${meta.width}" height="46"><text x="4" y="18" font-family="Helvetica" font-size="14" font-weight="700" fill="#fff">${p.rotulo[0]}</text><text x="4" y="38" font-family="Helvetica" font-size="11" fill="#ccc">${p.rotulo[1]}</text></svg>`), left: i * (meta.width + 12), top: 0 }
    ])

    await sharp({ create: { width: paneles.length * (meta.width + 12) - 12, height: alto, channels: 3, background: '#161616' } }).composite(capas).png().toFile(`${OUT}/${s0.id}.png`)
    console.log(`variantes: ${OUT}/${s0.id}.png`)
  }
}

for (const q of qa) console.log(q.id, 'contraste', JSON.stringify(q.contraste), 'gaps', JSON.stringify(q.gapsTinta))
