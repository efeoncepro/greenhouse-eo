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
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { removeBackground } from '@imgly/background-removal-node'
import { axisAdvertising } from '@efeoncepro/axis-tokens'
import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'

import { renderCollaborationSelection } from '../../scripts/creative/layout-compiler/axis-advertising.mjs'
import { compositeLuminosity } from '../../scripts/creative/layout-compiler/compiler.mjs'

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

const richBlock = ({ text, fonts, size, tracking = 0, leading, x, topY, maxWidth = W, fill, accentFill = ACCENT, align = 'left' }) => {
  const segW = seg => shape(seg.text, seg.bold ? fonts.bold : fonts.base, size, tracking)
  const wordWidth = word => word.reduce((a, seg) => a + segW(seg).advance, 0)
  const space = shape('a a', fonts.base, size).advance - shape('aa', fonts.base, size).advance
  const lines = []

  for (const chunk of parseRich(text)) {
    let line = []
    let width = 0

    for (const word of chunk) {
      const ww = wordWidth(word)

      if (line.length && width + space + ww > maxWidth) { lines.push(line); line = []; width = 0 }
      width += (line.length ? space : 0) + ww
      line.push(word)
    }

    if (line.length) lines.push(line)
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
    (_, x, y, fill, size, label) => `<g fill="${fill}" transform="translate(${x} ${y})">${shape(label.replaceAll('&amp;', '&'), pop[700], Number(size)).paths}</g>`
  )

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
const PLAN_DIR = path.dirname(path.resolve(PLAN))
const only = process.argv.slice(3)
const qa = []

// ════════════════════════════════════════════════════════════════════════════════════════════════
// 🔴 VALIDACIÓN DEL PLAN, ANTES DE COMPONER NADA [2026-09-22]
// Un campo que el comando no lee se ignoraba EN SILENCIO: así se perdió `centerX` y 03-referencia-916 salió con
// el CTA sobre una proyección clara, con el comando en verde. Y un campo numérico faltante no fallaba: producía
// coordenadas NaN y reventaba lejos, con un mensaje que no nombraba ni la pieza ni el campo («CTA selection
// outside canvas»). Ahora el plan se valida entero primero: cada error nombra pieza y campo, y los campos que el
// comando no lee se avisan. Los metadatos que usan OTRAS herramientas están declarados abajo para no avisar.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const CAMPOS = new Set([
  // composición: este comando los lee
  'id', 'plate', 'align', 'centerX', 'top', 'textWidth', 'ink', 'scrimTop', 'scrimBottom', 'hud',
  'label', 'labelSize', 'labelGap', 'labelStar', 'lead', 'leadFamily', 'leadFill', 'leadSize', 'leadGap',
  'dominant', 'dominantSize', 'dominantMax', 'dominantTracking', 'after', 'afterFamily', 'afterFill', 'afterSize', 'afterGap',
  'selection', 'gesture', 'footer', 'note', 'card', 'cta', 'logo', 'url', 'final',
  'subjectProtection', 'subjectGuard', 'safeArea', 'textGrowth',
  // metadatos de otras herramientas (firma, validadores de zona segura, trazabilidad editorial): acá no se leen
  'altText', 'styleReason', 'editorialReserve', 'productionNote', 'copyFormula', 'placementLimitation', 'signatureY', 'signatureSafeArea'
])

function validarPlan(plan) {
  const errores = []
  const avisos = []

  if (!Array.isArray(plan) || !plan.length) return { errores: ['el plan debe ser un arreglo con al menos una pieza'], avisos }
  const ids = plan.map(p => p?.id)
  const repetidos = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
  const faltan = only.filter(id => !ids.includes(id))
  const num = v => typeof v === 'number' && Number.isFinite(v)

  if (repetidos.length) errores.push(`ids repetidos (uno sobrescribiría al otro en out/): ${repetidos.join(', ')}`)
  if (faltan.length) errores.push(`no están en el plan: ${faltan.join(', ')}`)

  for (const p of plan.filter(x => !only.length || only.includes(x?.id))) {
    const e = m => errores.push(`${p?.id ?? '(sin id)'}: ${m}`)

    if (typeof p?.id !== 'string' || !p.id) { e('falta `id`'); continue }
    const desconocidos = Object.keys(p).filter(k => !CAMPOS.has(k))

    if (desconocidos.length) avisos.push(`${p.id}: campos que este comando no lee — ${desconocidos.join(', ')}`)
    if (typeof p.plate !== 'string' || !fs.existsSync(path.resolve(PLAN_DIR, p.plate))) e(`no existe el plate \`${p.plate}\``)
    if (!p.dominant && !p.label && !p.lead) { e('pieza muda (sin texto): este comando compone piezas con CTA — usa `pnpm foto:componer`'); continue }
    if (typeof p.dominant !== 'string' || !p.dominant.trim()) e('falta `dominant` (el titular)')
    if (!num(p.dominantSize)) e('falta `dominantSize` numérico')
    if (!p.cta || typeof p.cta !== 'object') { e('falta `cta`: este comando es para piezas con CTA — sin CTA usa `pnpm foto:componer`'); continue }
    const c = p.cta

    for (const k of ['text', 'descriptor']) if (typeof c[k] !== 'string' || !c[k].trim()) e(`falta \`cta.${k}\``)
    if (!['solid', 'outline', 'text'].includes(c.variant)) e(`\`cta.variant\` debe ser solid, outline o text (vino ${JSON.stringify(c.variant)})`)
    for (const k of ['fontSize', 'descriptorSize', 'paddingX', 'paddingY', 'gapAfterNote']) if (!num(c[k])) e(`falta \`cta.${k}\` numérico`)
    if (c.align !== 'center' && !num(c.x)) e('falta `cta.x` numérico (o `cta.align: "center"`)')
    for (const k of ['surfaceToken', 'inkToken']) if (c[k] != null && !C[c[k]]) e(`\`cta.${k}: ${c[k]}\` no existe en los tokens AXIS de publicidad`)
    if (p.gesture && !gutt) e(`declara \`gesture\` y la fuente Guttery no está en ${GUTTERY}: el gesto se perdería en silencio`)
    if (p.safeArea && !['x0', 'y0', 'x1', 'y1'].every(k => num(p.safeArea[k]))) e('`safeArea` necesita x0, y0, x1 e y1 numéricos (fracciones del lienzo)')

    for (const z of p.subjectGuard?.ignore ?? []) {
      if (!Array.isArray(z?.box) || z.box.length !== 4 || !z.box.every(num) || typeof z.reason !== 'string' || z.reason.trim().length < 10) {
        e('cada zona de `subjectGuard.ignore` necesita `box: [x0, y0, x1, y1]` (fracciones) y `reason` (≥ 10 caracteres)')
      }
    }
  }

  return { errores, avisos }
}

const validacion = validarPlan(SLIDES)

for (const a of validacion.avisos) console.warn(`  ⚠ ${a}`)
if (validacion.errores.length) throw new Error(`plan inválido — ${validacion.errores.join(' · ')}`)

fs.mkdirSync(`${PLAN_DIR}/out/preview-390`, { recursive: true })

// Un QA de una corrida ANTERIOR no puede sobrevivir a una corrida que falla: el gate lo leería como vigente.
fs.rmSync(`${PLAN_DIR}/out/qa${only.length ? '-parcial' : ''}.json`, { force: true })

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
const MASK_CACHE = repo('node_modules/.cache/foto-sujeto')
const GUARD_IDS = new Set(['etiqueta', 'entrada', 'dominante', 'cierre-frase', 'cierre-inferior', 'nota', 'cta', 'descriptor'])

async function subjectMask(platePath) {
  const bytes = fs.readFileSync(platePath)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const cached = path.join(MASK_CACHE, `${sha}.png`)
  let alphaPng

  if (fs.existsSync(cached)) alphaPng = fs.readFileSync(cached)
  else {
    try {
      const mime = /\.jpe?g$/i.test(platePath) ? 'image/jpeg' : (/\.webp$/i.test(platePath) ? 'image/webp' : 'image/png')
      const blob = await removeBackground(new Blob([new Uint8Array(bytes)], { type: mime }), { model: 'medium', output: { format: 'image/png', quality: 1 } })

      alphaPng = await sharp(Buffer.from(await blob.arrayBuffer())).ensureAlpha().extractChannel(3).png().toBuffer()
      fs.mkdirSync(MASK_CACHE, { recursive: true })
      const tmp = `${cached}.${process.pid}.tmp`

      fs.writeFileSync(tmp, alphaPng)
      fs.renameSync(tmp, cached)
    } catch (e) {
      // Sin máscara no se inventa protección: la pieza se compone sin agrandar y sin guarda 2D, y se avisa.
      console.warn(`  ⚠ no se pudo segmentar ${path.basename(platePath)}: ${e.message}`)

      return null
    }
  }

  // extractChannel(0) OBLIGATORIO: un PNG de un canal puede volver con 3 o 4 canales al leerlo, y entonces
  // `data[y * W + x]` indexa píxeles equivocados — medido: marcaba 19.794 px de sujeto bajo un texto que estaba
  // a 250 px de la persona. Se verifica el número de canales para que el error no vuelva en silencio.
  const { data, info } = await sharp(alphaPng).extractChannel(0).raw().toBuffer({ resolveWithObject: true })

  if (info.channels !== 1) throw new Error(`máscara de sujeto con ${info.channels} canales; se esperaba 1`)

  return { data, W: info.width, H: info.height }
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

function guardHits(mask, boxes, canvasW, canvasH, clearFrac = CLEAR_TOUCH) {
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

    if (px > MASK_NOISE_PX) hits.push({ id, px })
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

async function composePiece(s, opts = {}) {
  const guard = []
  const visibles = []
  const plate = path.resolve(PLAN_DIR, s.plate)
  const meta = await sharp(plate).metadata()

  W = meta.width; H = meta.height; M = Math.round(W * 0.07)

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
  const MX = Math.max(M, (s.safeArea?.x0 ?? 0) * W)
  const x = s.align === 'center' ? AXIS_X : MX
  let y = (s.top ?? 0.05) * H

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
  }

  body += dom.svg
  y = dom.box.bottom

  // display posterior (cierre de la frase) si existe
  if (s.after) {
    const ar = R.ideaMedium
    const afterPoppins = (s.afterFamily ?? 'poppins') === 'poppins'
    const af = richBlock({ text: s.after, fonts: afterPoppins ? POP : BRIC(ar, ar.width, 800), size: s.afterSize ?? 74, tracking: afterPoppins ? em(R.structureCopy.tracking) : em(ar.tracking), leading: afterPoppins ? 1.5 : ar.lineHeight, x, topY: y + Math.round((s.afterGap ?? 0.09) * domSize), maxWidth: W * (s.textWidth ?? 0.8), fill: s.afterFill ?? INK, align: s.align })

    af.accentBoxes.forEach((b, i) => checks.push({ id: `cierre-acento-${i}`, box: b, inkL: lum(255, 101, 0) }))

    body += af.svg
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
  }

  // 4 · nota de dato: Poppins sobre la foto limpia (la tarjeta de vidrio era del post de GTA VI, no del lenguaje)
  if (s.note) {
    // En un bloque centrado que encadena la nota bajo el cierre, la nota se centra con él: alineada a la
    // izquierda sobre un eje centrado se lee como un error. La nota ubicada a mano (`x`/`y`) queda como está.
    const notaCentrada = s.align === 'center' && s.note.x == null && s.note.gapAfterClosure != null
    const nt = richBlock({ text: s.note.text, fonts: POP, size: s.note.size ?? Math.round(W * 0.026), tracking: 0, leading: 1.5, x: s.note.x != null ? s.note.x * W : (notaCentrada ? AXIS_X : MX), topY: s.note.gapAfterClosure != null ? y+s.note.gapAfterClosure : s.note.y * H, maxWidth: W * (s.note.width ?? 0.34), fill: SOFT, accentFill: INK, align: notaCentrada ? 'center' : 'left' })

    body += nt.svg
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
    const c=s.cta, cy=y+c.gapAfterNote, padX=c.paddingX, padY=c.paddingY;
    let cx=W*c.x;
    const solid=c.variant==='solid', outline=c.variant==='outline';
    // Retrocompatible: un plan que no declara tokens usa el par por defecto de la familia aprobada
    // (relleno = superficie de acento con tinta oscura; texto/contorno = tinta de acento).
    // `surfaceToken`/`inkToken` permiten variar el color por pieza — la regla dice «lima no obligatorio».
    const surfaceColor=C[c.surfaceToken] ?? C.growthOnDark;
    const ink=C[c.inkToken] ?? (c.variant==='solid' ? C.inkOnLight : C.growthOnDark);
    const hexLum=h=>lum(...h.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)));

    if(c.align==='center')cx=AXIS_X-(shape(c.text,pop[700],c.fontSize).advance+padX*2)/2;
    const t=block({text:c.text,font:pop[700],size:c.fontSize,tracking:0,leading:1.2,x:cx+padX,topY:cy+padY,maxWidth:W*.65,fill:ink});
    const b={left:cx,top:cy,right:t.box.right+padX,bottom:t.box.bottom+padY};

    if(solid||outline)body+=`<rect x="${b.left}" y="${b.top}" width="${b.right-b.left}" height="${b.bottom-b.top}" rx="${c.radius}" fill="${solid?surfaceColor:'none'}" stroke="${surfaceColor}" stroke-width="2"/>`;
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
    const ci={targetId:'cta',targetKind:'group',variant:'open-brackets',padding:'compact',overlay:'none',cursors:[{id:'usuario',kind:'local',targetId:'cta',anchor:'end-center',action:'select'}]};
    const cm=resolveCollaborationSelectionIntent(ci);
    const cr=renderCollaborationSelection({manifest:cm,targetBounds:b,canvas:{width:W,height:H},measureLabel,presentation:{localCursorScale:c.cursorScale}});

    // 🔴 Descriptor bajo el GRUPO, no bajo el botón [2026-09-22, operador: «el texto debajo del CTA está
    // muy pegado»]. Antes se medía `descriptorGap` desde el borde del botón, pero los corchetes se dibujan
    // ~8 px por fuera de ese borde: con el gap de 14 que usaban los planes, entre el corchete y el texto
    // quedaban ~6 px. Ahora el gap se mide desde el borde de la selección y tiene un piso de 0,6 × el
    // cuerpo del descriptor, así que ningún plan puede dejarlo pegado. Y si el cursor cae sobre el
    // descriptor en el eje X (botón más angosto que el descriptor, §8 del doc), el descriptor baja
    // bajo la flecha: el choque que antes sólo se veía mirando la pieza ya no puede ocurrir.
    const descGap=Math.max(c.descriptorGap??0,Math.round(c.descriptorSize*0.6));
    const cursorBox=cr.evidence.cursorEvidence.find(k=>k.id==='usuario')?.bounds;
    const descAt=topY=>block({text:c.descriptor,font:pop[400],size:c.descriptorSize,tracking:0,leading:1.2,x:c.align==='center'?AXIS_X:cx,topY,maxWidth:W*.7,fill:'#ffffff',align:c.align});
    let descriptor=descAt(cr.bounds.bottom+descGap);

    if(cursorBox&&descriptor.box.left<cursorBox.right&&descriptor.box.right>cursorBox.left&&descriptor.box.top<cursorBox.bottom+descGap)
      descriptor=descAt(cursorBox.bottom+descGap);

    body+=descriptor.svg;checks.push({id:'descriptor',box:descriptor.box,inkL:1});

    if(!cr.evidence.withinCanvas)throw new LienzoError(`${s.id}: la selección del CTA se sale del lienzo`);
    guard.push({ id: 'cta-grupo', box: { left: b.left - 14, top: b.top - 14, right: b.right + 14, bottom: b.bottom + 14 } });
    for (const cc of cr.evidence.cursorEvidence) guard.push({ id: `cursor-cta`, box: cc.bounds });
    visibles.push({ id: 'cta-seleccion', box: cr.bounds }, ...cr.evidence.cursorEvidence.map(cc => ({ id: 'cursor-cta', box: cc.bounds })));
    const ctaOverlay=labelToPaths(cr.overlay);

    if(/<text/.test(ctaOverlay))throw new Error(`${s.id}: el overlay del CTA quedó con <text> — se pintaría con una fuente del sistema`);
    body+=cr.underlay+ctaOverlay;
    fs.writeFileSync(`${PLAN_DIR}/out/${s.id}-controls.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${cr.overlay}</svg>`);
    fs.writeFileSync(`${PLAN_DIR}/out/${s.id}-cta-evidence.json`,JSON.stringify({intent:ci,manifest:cm,geometry:cr.evidence,textBounds:t.box,descriptorBounds:descriptor.box,surface:b,variant:c.variant,colors:{surface:surfaceColor,ink},solidTextContrast:solid?(Math.max(hexLum(surfaceColor),hexLum(ink))+.05)/(Math.min(hexLum(surfaceColor),hexLum(ink))+.05):null},null,2));
  }

  fs.writeFileSync(`${PLAN_DIR}/out/${s.id}-layout.json`,JSON.stringify({canvas:{width:W,height:H},subjectProtection:s.subjectProtection,elements:checks.map(({id,box})=>({id,box})),typography:{lead:s.leadSize,dominant:domSize,closure:s.afterSize,benefit:s.note?.size,cta:s.cta.fontSize,descriptor:s.cta.descriptorSize},selection:selEvidence},null,2));
  const descriptorBox=checks.find(c=>c.id==='descriptor').box;

  const violaDeclarada = Boolean(s.subjectProtection && descriptorBox.bottom > s.subjectProtection.top - s.subjectProtection.minClearance)
  const hits = opts.mask ? guardHits(opts.mask, [...checks.filter(c => GUARD_IDS.has(c.id)).map(c => ({ id: c.id, box: c.box })), ...guard], W, H, opts.dry ? CLEAR_GROW : CLEAR_TOUCH) : []

  const fuera = checks.some(c => c.box.left < 0 || c.box.right > W || c.box.top < 0 || c.box.bottom > H)

  // Zona segura DECLARADA (`safeArea`, fracciones): la UI de la plataforma tapa lo que quede afuera. El
  // crecimiento no puede sacar nada de ella; a tamaño original, lo que ya esté afuera se avisa.
  const zona = s.safeArea && { left: s.safeArea.x0 * W - 0.5, top: s.safeArea.y0 * H - 0.5, right: s.safeArea.x1 * W + 0.5, bottom: s.safeArea.y1 * H + 0.5 }

  const fueraDeZona = zona
    ? [...checks.filter(c => GUARD_IDS.has(c.id)), ...visibles].filter(({ box }) => box && (box.left < zona.left || box.right > zona.right || box.top < zona.top || box.bottom > zona.bottom)).map(b => b.id)
    : []

  if (opts.dry && (violaDeclarada || hits.length || fuera || fueraDeZona.length)) return { ok: false, hits }
  if (fueraDeZona.length) console.warn(`  ⚠ ${s.id}: fuera de la zona segura declarada${s.safeArea.profile ? ` (${s.safeArea.profile})` : ''}: ${[...new Set(fueraDeZona)].join(', ')}`)
  if (violaDeclarada) throw Error(`${s.id}: el descriptor invade \`subjectProtection\` (baja hasta ${Math.round(descriptorBox.bottom)} px; el límite es ${s.subjectProtection.top - s.subjectProtection.minClearance})`)
  if (hits.length) throw Error(`${s.id}: el texto tapa al sujeto — ${hits.map(h => `${h.id} (${h.px} px)`).join(', ')}. Sube el \`top\`, acorta el copy o regenera el plate con más reserva.`)
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

  const underSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${under}${cardEl ? cardEl.svg.split('\n')[0] : ''}</svg>`)
  const bare = await sharp(baseBuf).composite([...layers, { input: underSvg, left: 0, top: 0 }]).png().toBuffer()

  // En la búsqueda del tamaño (dry) se mide el contraste de cada voz sobre el píxel real: crecer mueve las
  // cajas y puede dejar una voz sobre una zona clara (medido: «SEO + AEO» bajó sobre un monitor, 2,98).
  if (opts.dry) {
    const contraste = {}

    for (const c of checks) if (!c.skipContrast) contraste[c.id] = await contrastUnder(bare, c.box, c.inkL ?? 1)

    return { ok: true, hits, contraste }
  }

  const top = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${body}${cardEl ? cardEl.svg.split('\n').slice(1).join('\n') : ''}${selection}</svg>`)

  fs.writeFileSync(`${PLAN_DIR}/out/${s.id}-overlay.svg`,top);
  const topLayers = [{ input: top, left: 0, top: 0 }]

  let firmaSobreSujeto = null

  if (s.logo) {
    // Variante automática por contraste medido en la zona real del logo (salvo que la pieza la declare).
    if (!s.logo.variant || s.logo.variant === 'auto') {
      const lwTmp = Math.round(s.logo.width <= 1 ? s.logo.width * Math.min(W, H) : s.logo.width)
      const lhTmp = Math.round(lwTmp * 196.68 / 837.07)
      const lxTmp = Math.round((s.logo.x != null ? s.logo.x * W : W / 2) - lwTmp / 2)
      // Se mide DONDE va la firma: antes se medía al pie aunque la pieza declarara `logo.y`.
      const lyTmp = typeof s.logo.y === 'number' ? Math.round(s.logo.y * H) : Math.round(H - M * 0.85 - lhTmp)
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

  const out = s.final ? sharp(master).resize({ width: s.final[0], height: s.final[1] }) : sharp(master)

  await out.png().toFile(`${PLAN_DIR}/out/${s.id}.png`)
  await sharp(master).resize({ width: 390 }).png().toFile(`${PLAN_DIR}/out/preview-390/${s.id}.png`)

  const contraste = {}

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

  qa.push({ id: s.id, dominante: dom.lines, ratioDominanteEntrada: ratio, contraste, gapsTinta: gaps, seleccion: selEvidence, escala: opts.factor ?? 1, guardaSujeto: opts.mask ? 'segmentacion' : 'sin-mascara', ...(s.subjectGuard?.ignore?.length ? { zonasIgnoradas: s.subjectGuard.ignore } : {}), ...(firmaSobreSujeto ? { firmaSobreSujeto } : {}) })
}

// Driver: decide el factor de escala MIDIENDO, no estimando. Sólo formatos donde el texto se pierde en el
// lienzo (horizontal y vertical alto); 4:5 nunca crece. Busca el mayor factor ≤ 1,6 que cumpla DOS cosas:
// (1) ninguna caja protegida toca al sujeto; (2) ninguna voz pierde legibilidad — su contraste no baja de
// lo que tenía a tamaño original (con techo de exigencia 4,5). Sin máscara no se crece: la ausencia de
// prueba no es permiso.
const GROW_CAP = 1.6
const CONTRAST_FLOOR = 4.5

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

for (const s0 of SLIDES.filter(x => !only.length || only.includes(x.id))) {
  const plate0 = path.resolve(PLAN_DIR, s0.plate)
  const { width: pw, height: ph } = await sharp(plate0).metadata()
  const mask = maskForPiece(await subjectMask(plate0), s0, pw, ph)

  if (!mask) console.warn(`  ⚠ ${s0.id}: la segmentación del sujeto no corrió — sólo protege \`subjectProtection\` si está declarada.`)
  const fill = fillFactor(s0, pw)
  let factor = 1

  // `textGrowth: false` congela la pieza a su tamaño declarado: sirve para recomponer un set YA APROBADO sin
  // que el crecimiento lo cambie (medido 2026-09-22: 40 piezas aprobadas cambiarían de tamaño al recomponer).
  if (s0.textGrowth !== false && (pw > ph || ph / pw > 1.5) && fill > 1.01) {
    if (mask) {
      const base = await probar(scaleSpec(s0, 1, pw), mask)

      const ok = async f => {
        if (!base.ok) return false

        const r = await probar(scaleSpec(s0, f, pw), mask)

        if (!r.ok) return false

        return Object.entries(base.contraste ?? {}).every(([k, v]) => (r.contraste[k] ?? 0) >= Math.min(v, CONTRAST_FLOOR) - 0.05)
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

  await composePiece(scaleSpec(s0, factor, pw), { mask, factor })
}

fs.writeFileSync(`${PLAN_DIR}/out/qa${only.length ? '-parcial' : ''}.json`, JSON.stringify(qa, null, 2))
for (const q of qa) console.log(q.id, 'contraste', JSON.stringify(q.contraste), 'gaps', JSON.stringify(q.gapsTinta))
