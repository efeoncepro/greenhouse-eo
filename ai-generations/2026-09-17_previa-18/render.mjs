// «Hay días que sí rediseñaríamos» — Efeonce · previa Fiestas Patrias Chile 2026 (17/09).
// Composición tipográfica determinística, sin generación IA. Bricolage/Poppins reales → paths (fontkit), selección y
// cursor AXIS, logo oficial, paleta corporativa Efeonce (efeonceTokens + axisAdvertising). Render 2x → PNG 1080×1350.
// Ejecutar desde la raíz del repo: node ai-generations/2026-09-17_previa-18/render.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'
import { axisAdvertising, efeonceTokens } from '@efeoncepro/axis-tokens'

import { renderCollaborationSelection } from '../../scripts/creative/layout-compiler/axis-advertising.mjs'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')

const DIR = path.dirname(new URL(import.meta.url).pathname)
const W = 1080
const H = 1350
const A = axisAdvertising.color
const R = axisAdvertising.recipes
const BLUE = efeonceTokens.color.action // #0375db
const NAVY = efeonceTokens.color.actionStrong // #023c70
const SOFT = A.softOnDark // #cfe4fa

const bricolage = fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf')
const poppins = { 500: fontkit.openSync('src/assets/fonts/Poppins-Medium.ttf'), 700: fontkit.openSync('src/assets/fonts/Poppins-Bold.ttf') }
const em = v => (typeof v === 'string' && v.endsWith('em') ? Number(v.slice(0, -2)) : Number(v ?? 0))
const fontFor = s => (s.family === 'Bricolage' ? bricolage.getVariation({ wght: s.weight, wdth: s.width, opsz: s.opticalSize }) : poppins[s.weight])

/** Shaping real: paths por glifo + caja de tinta total y por glifo (para seleccionar sólo el «7»). */
const shape = (text, spec) => {
  const font = fontFor(spec)
  const run = font.layout(text)
  const scale = spec.size / font.unitsPerEm
  const tracking = em(spec.tracking) * spec.size
  let x = 0
  const glyphs = []

  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i]
    const gx = x + pos.xOffset * scale
    const gy = -pos.yOffset * scale
    const b = glyph.bbox
    const ink = b && b.maxX > b.minX ? { left: gx + b.minX * scale, right: gx + b.maxX * scale, top: gy - b.maxY * scale, bottom: gy - b.minY * scale } : null

    glyphs.push({ d: glyph.path.toSVG(), gx, gy, scale, ink })
    x += pos.xAdvance * scale + (i === run.glyphs.length - 1 ? 0 : tracking)
  })

  const inks = glyphs.map(g => g.ink).filter(Boolean)
  const ink = { left: Math.min(...inks.map(i => i.left)), right: Math.max(...inks.map(i => i.right)), top: Math.min(...inks.map(i => i.top)), bottom: Math.max(...inks.map(i => i.bottom)) }
  const paths = (list = glyphs) => list.map(g => (g.d ? `<path d="${g.d}" transform="translate(${g.gx.toFixed(2)} ${g.gy.toFixed(2)}) scale(${g.scale} ${-g.scale})"/>` : '')).join('')

  return { glyphs, ink, advance: x, paths }
}

const offset = (b, dx, dy) => ({ left: b.left + dx, right: b.right + dx, top: b.top + dy, bottom: b.bottom + dy })

// ── Fondo: degradado azul Efeonce → marino, luz suave arriba, grano fino anti-banding ─────────────────
const background = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BLUE}"/>
      <stop offset="0.58" stop-color="#0359a8"/>
      <stop offset="1" stop-color="${NAVY}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.36" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.6" stop-color="${NAVY}" stop-opacity="0"/>
      <stop offset="1" stop-color="#01203d" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>`

// ── Banderines de fonda: cuerda en parábola, triángulos que siguen la tangente, dos planos de profundidad ─
const bunting = ({ x0, x1, y, sag, spacing, flagW, flagH, colors, opacity, stroke, shadow }) => {
  const at = t => ({ x: x0 + (x1 - x0) * t, y: y + sag * (1 - (2 * t - 1) ** 2) })
  const slope = t => (sag * -4 * (2 * t - 1) * 2) / (x1 - x0) // dy/dx
  let svg = `<path d="M ${x0} ${y} Q ${(x0 + x1) / 2} ${y + sag * 2} ${x1} ${y}" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round"/>`
  const count = Math.floor((x1 - x0) / spacing)

  for (let i = 0; i <= count; i++) {
    const t = (i * spacing + spacing / 2) / (x1 - x0)

    if (t > 1) break

    const p = at(t)
    const angle = (Math.atan(slope(t)) * 180) / Math.PI
    const color = colors[i % colors.length]
    // Pequeña variación de caída para que no parezca un patrón clonado.
    const sway = ((i * 37) % 7) - 3
    const tri = `M ${-flagW / 2} 0 L ${flagW / 2} 0 L ${sway} ${flagH} Z`

    svg += `<g transform="translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${angle.toFixed(2)})">`
    if (shadow) svg += `<path d="${tri}" transform="translate(5 8)" fill="#011a33" opacity="0.28"/>`
    svg += `<path d="${tri}" fill="${color}"/><path d="M ${-flagW / 2} 0 L ${flagW / 2} 0" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/></g>`
  }

  return `<g opacity="${opacity}">${svg}</g>`
}

// Ambas cuerdas nacen y mueren fuera del lienzo; la de atrás va más alta y chica (profundidad) y no cruza a la de adelante.
const buntingBack = bunting({ x0: -60, x1: 1160, y: -6, sag: 46, spacing: 64, flagW: 40, flagH: 52, colors: [SOFT, NAVY, '#ffffff'], opacity: 0.5, stroke: '#ffffff80', shadow: false })
const buntingFront = bunting({ x0: -90, x1: 1170, y: 34, sag: 88, spacing: 96, flagW: 70, flagH: 86, colors: ['#ffffff', NAVY, SOFT], opacity: 1, stroke: '#ffffffcc', shadow: true })

// ── «17» gigante y fantasma del «8» ───────────────────────────────────────────────────────────────
const numberSpec = { family: 'Bricolage', weight: 800, width: 96, opticalSize: 96, tracking: '-0.045em', size: 100 }
const probe = shape('17', numberSpec)
numberSpec.size = (100 * W * 0.63) / (probe.ink.right - probe.ink.left)
const number = shape('17', numberSpec)
const NUM_CENTER_Y = H * 0.43
const nx = W / 2 - (number.ink.left + number.ink.right) / 2
const ny = NUM_CENTER_Y - (number.ink.top + number.ink.bottom) / 2
const sevenInk = offset(number.glyphs[1].ink, nx, ny)
const oneInk = offset(number.glyphs[0].ink, nx, ny)

// El «8» se dibuja como vista previa de arrastre: misma fuente/tamaño, centrado sobre el «7», desplazado hacia el cursor.
const eight = shape('8', numberSpec)
const DRAG = { dx: 34, dy: 26 }
const ex = (sevenInk.left + sevenInk.right) / 2 - (eight.ink.left + eight.ink.right) / 2 + DRAG.dx
const ey = (sevenInk.top + sevenInk.bottom) / 2 - (eight.ink.top + eight.ink.bottom) / 2 + DRAG.dy
const eightGhost = `<g transform="translate(${ex.toFixed(2)} ${ey.toFixed(2)})"><g fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.85" stroke-width="3.5" stroke-dasharray="14 10" stroke-linejoin="round">${eight.paths()}</g></g>`

// Sombra suave marino bajo el número: profundidad sin efecto decorativo sobre la tinta.
const numberShadow = `<defs><filter id="numShadow" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="16"/></filter></defs><g transform="translate(${(nx + 6).toFixed(2)} ${(ny + 22).toFixed(2)})" fill="#011a33" opacity="0.38" filter="url(#numShadow)">${number.paths()}</g>`
const numberSvg = `${numberShadow}<g transform="translate(${nx.toFixed(2)} ${ny.toFixed(2)})" fill="#ffffff">${number.paths()}</g>`

// ── Selección AXIS sobre el «7» + cursor local arrastrando ──────────────────────────────────────────
const labelFont = { family: 'Poppins', weight: 700, tracking: 0 }
const manifest = resolveCollaborationSelectionIntent({
  targetId: 'siete',
  targetKind: 'text',
  variant: 'eight-handles',
  padding: 'standard',
  overlay: 'subtle',
  cursors: [{ id: 'local', kind: 'local', targetId: 'siete', anchor: 'bottom-end', action: 'resize' }]
})
const selection = renderCollaborationSelection({ manifest, targetBounds: sevenInk, canvas: { width: W, height: H }, measureLabel: (l, s) => shape(l, { ...labelFont, size: s }).advance })

if (!selection.evidence.withinCanvas) throw new Error('Selección fuera del lienzo')
if (/<text/.test(selection.overlay)) throw new Error('Quedó texto sin convertir')

// ── Remate: entrada Poppins + remate Bricolage (contraste de función, peso y escala) ────────────────
const lead = shape('Hay días que', { family: 'Poppins', weight: 500, size: 50, tracking: '-0.005em' })
const punch = shape('sí rediseñaríamos.', { family: 'Bricolage', weight: R.ideaImpact.weight, width: R.ideaImpact.width, opticalSize: 72, tracking: '-0.03em', size: 100 })
const punchSize = (100 * W * 0.7) / (punch.ink.right - punch.ink.left)
const punchFinal = shape('sí rediseñaríamos.', { family: 'Bricolage', weight: R.ideaImpact.weight, width: R.ideaImpact.width, opticalSize: 72, tracking: '-0.03em', size: punchSize })
const leadScale = 1
const COPY_TOP = Math.max(selection.evidence ? 0 : 0, number.ink.bottom + ny) + 108
const leadY = COPY_TOP - lead.ink.top
const INK_GAP = 16
const punchY = leadY + lead.ink.bottom + INK_GAP - punchFinal.ink.top
const leadX = W / 2 - (lead.ink.left + lead.ink.right) / 2
const punchX = W / 2 - (punchFinal.ink.left + punchFinal.ink.right) / 2
const copySvg = `<g fill="${SOFT}" transform="translate(${leadX.toFixed(2)} ${leadY.toFixed(2)}) scale(${leadScale})">${lead.paths()}</g><g fill="#ffffff" transform="translate(${punchX.toFixed(2)} ${punchY.toFixed(2)})">${punchFinal.paths()}</g>`
const copyBounds = { left: Math.min(leadX + lead.ink.left, punchX + punchFinal.ink.left), right: Math.max(leadX + lead.ink.right, punchX + punchFinal.ink.right), top: leadY + lead.ink.top, bottom: punchY + punchFinal.ink.bottom }

// ── Logo oficial ─────────────────────────────────────────────────────────────────────────────────
const LOGO_W = 190
const LOGO_H = LOGO_W * (196.68 / 837.07)
const logoBox = { x: (W - LOGO_W) / 2, y: H - H * 0.06 - LOGO_H }
const logoRaw = fs.readFileSync('public/branding/logo-negative.svg', 'utf8').replace(/<\?xml[^>]*>/, '')
const logoSvg = `<g transform="translate(${logoBox.x.toFixed(2)} ${logoBox.y.toFixed(2)})">${logoRaw.replace('<svg ', `<svg width="${LOGO_W}" height="${LOGO_H.toFixed(2)}" `)}</g>`

console.error(JSON.stringify({numberTop: (number.ink.top + ny).toFixed(1), numberBottom: (number.ink.bottom + ny).toFixed(1), numberH: (number.ink.bottom - number.ink.top).toFixed(1), copyTop: copyBounds.top.toFixed(1), copyBottom: copyBounds.bottom.toFixed(1), punchH: (punchFinal.ink.bottom - punchFinal.ink.top).toFixed(1), logoY: logoBox.y.toFixed(1)}))
if (copyBounds.bottom > logoBox.y - 48) throw new Error(`El remate invade el aire de la firma (${copyBounds.bottom.toFixed(1)} > ${(logoBox.y - 48).toFixed(1)})`)

// ── Composición y render 2x ─────────────────────────────────────────────────────────────────────
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${background}
${buntingBack}
${buntingFront}
${selection.underlay}
${numberSvg}
${eightGhost}
${selection.overlay}
${copySvg}
${logoSvg}
</svg>`

fs.writeFileSync(path.join(DIR, 'post-17-source.svg'), svg)

const hi = await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer()
const base = await sharp(hi).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer()

// Grano fino monocromo (±3 niveles) para romper el banding del degradado sin ensuciar.
const noise = Buffer.alloc(W * H * 4)
let seed = 1789
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }

for (let i = 0; i < W * H; i++) {
  const v = Math.round(128 + (rand() - 0.5) * 6)
  noise[i * 4] = v; noise[i * 4 + 1] = v; noise[i * 4 + 2] = v; noise[i * 4 + 3] = 255
}

const grain = await sharp(noise, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
const out = path.join(DIR, 'post-17.png')

await sharp(base).composite([{ input: grain, blend: 'soft-light' }]).png({ compressionLevel: 9 }).toFile(out)

// ── QA: contraste peor caso bajo cada texto (p98 del fondo sin texto) ───────────────────────────────
const bgOnly = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${background}${buntingBack}${buntingFront}${selection.underlay}</svg>`), { density: 72 }).png().toBuffer()
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const hexLum = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) }
const worst = async (b, inkHex) => {
  const left = Math.max(0, Math.floor(b.left)), top = Math.max(0, Math.floor(b.top))
  const width = Math.min(W - left, Math.ceil(b.right - b.left)), height = Math.min(H - top, Math.ceil(b.bottom - b.top))
  const { data, info } = await sharp(bgOnly).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const lums = []

  for (let i = 0; i < data.length; i += info.channels) lums.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
  lums.sort((x, y) => x - y)

  const bg = lums[Math.floor(lums.length * 0.98)]
  const fg = hexLum(inkHex)

  return Number(((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)).toFixed(2))
}

const numberBounds = offset(number.ink, nx, ny)
const qa = {
  file: 'post-17.png',
  size: `${W}x${H}`,
  numberSize: Number(numberSpec.size.toFixed(1)),
  punchSize: Number(punchSize.toFixed(1)),
  contrast: {
    number: await worst(numberBounds, '#ffffff'),
    lead: await worst({ left: leadX + lead.ink.left, right: leadX + lead.ink.right, top: leadY + lead.ink.top, bottom: leadY + lead.ink.bottom }, SOFT),
    punch: await worst({ left: punchX + punchFinal.ink.left, right: punchX + punchFinal.ink.right, top: punchY + punchFinal.ink.top, bottom: punchY + punchFinal.ink.bottom }, '#ffffff'),
    logo: await worst({ left: logoBox.x, right: logoBox.x + LOGO_W, top: logoBox.y, bottom: logoBox.y + LOGO_H }, '#ffffff')
  },
  inkGapLeadPunch: Number((punchY + punchFinal.ink.top - (leadY + lead.ink.bottom)).toFixed(2)),
  numberBounds,
  sevenBounds: sevenInk,
  oneBounds: oneInk,
  copyBounds,
  logoBox,
  selection: { withinCanvas: selection.evidence.withinCanvas, bounds: selection.bounds, cursors: selection.evidence.cursorEvidence }
}

fs.writeFileSync(path.join(DIR, 'qa.json'), `${JSON.stringify(qa, null, 2)}\n`)
await sharp(out).resize(390, 488).png().toFile(path.join(DIR, 'post-17-mobile-390.png'))
console.log(JSON.stringify({ contrast: qa.contrast, gap: qa.inkGapLeadPunch, number: qa.numberSize, punch: qa.punchSize, sel: qa.selection.withinCanvas }))
