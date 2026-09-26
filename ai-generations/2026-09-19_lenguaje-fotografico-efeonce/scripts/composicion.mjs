// Capa de composición completa sobre un plate: voces tipográficas AXIS + selección/cursores + firma.
// Uso: node composicion.mjs <plate> <out> '<plan.json>'   (o --plan archivo.json)
// Plan: { label, lead, dominant, closing, hud, gesture, selection, logo }  — todas opcionales.
//  Cada capa de texto: { text: "Línea 1|Línea 2", zone: [x0,y0,x1,y1] fracciones, align: left|center|right, autofit: true }
//  dominant/lead/closing aceptan [[acento]] (naranja) y **negrita** (peso superior de la misma familia).
//  gesture: { text, x, y, rotate }  · hud: { text, zone }  · logo: { cy, w }
//  selection: { box:[x0,y0,x1,y1] px, variant, overlay, padding, cursors:[{id,label,anchor,color,state}], local }
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
const REPO = '/Users/jreye/Documents/greenhouse-eo'
const require = createRequire(REPO + '/package.json')
const sharp = require('sharp'); const fontkit = require('fontkit')
const { axisAdvertising } = await import(pathToFileURL(require.resolve('@efeoncepro/axis-tokens')).href)
const { resolveCollaborationSelectionIntent } = await import(pathToFileURL(require.resolve('@efeoncepro/axis-ui-contracts')).href)
const { renderCollaborationSelection } = await import(pathToFileURL(REPO + '/scripts/creative/layout-compiler/axis-advertising.mjs').href)
const [PLATE, OUT, ARG] = process.argv.slice(2)
const plan = ARG.endsWith('.json') && fs.existsSync(ARG) ? JSON.parse(fs.readFileSync(ARG, 'utf8')) : JSON.parse(ARG)
const { width: W, height: H } = await sharp(PLATE).metadata()
const R = axisAdvertising.recipes, C = axisAdvertising.color
const BRIC = REPO + '/src/assets/fonts/BricolageGrotesque-Variable.ttf'
const bric = r => fontkit.openSync(BRIC).getVariation({ wght: r.weight, wdth: r.width ?? 96, opsz: r.opticalSize ?? 68 })
const bricBold = r => fontkit.openSync(BRIC).getVariation({ wght: Math.min(800, r.weight + 160), wdth: r.width ?? 96, opsz: r.opticalSize ?? 68 })
const POP = { 700: fontkit.openSync(REPO + '/src/assets/fonts/Poppins-Bold.ttf'), 600: fontkit.openSync(REPO + '/src/assets/fonts/Poppins-SemiBold.ttf'), 400: fontkit.openSync(REPO + '/src/assets/fonts/Poppins-Regular.ttf') }
const GUTTERY = '/Users/jreye/Library/Fonts/Guttery.otf'
const rel = (r, g, b) => { const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const hexRel = h => rel(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16))
const box = async (x0, y0, x1, y1) => { const { data } = await sharp(PLATE).extract({ left: Math.max(0, x0), top: Math.max(0, y0), width: Math.max(2, Math.min(W, x1) - Math.max(0, x0)), height: Math.max(2, Math.min(H, y1) - Math.max(0, y0)) }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const L = []; for (let i = 0; i < data.length; i += 3) L.push(rel(data[i], data[i + 1], data[i + 2])); L.sort((a, b) => a - b); return p => L[Math.floor(p * (L.length - 1))] }
const contrastFor = async (hex, x0, y0, x1, y1) => { const q = await box(x0, y0, x1, y1); const c = hexRel(hex); const bg = c > 0.3 ? q(0.98) : q(0.02); return (Math.max(c, bg) + 0.05) / (Math.min(c, bg) + 0.05) }
// ── shaping ──────────────────────────────────────────────────────────────────
const parseRich = t => { const out = []; const re = /(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g; let i = 0, m
  while ((m = re.exec(t))) { if (m.index > i) out.push({ t: t.slice(i, m.index) }); const v = m[0]
    out.push(v.startsWith('**') ? { t: v.slice(2, -2), bold: true } : { t: v.slice(2, -2), accent: true }); i = m.index + v.length }
  if (i < t.length) out.push({ t: t.slice(i) }); return out }
const assertGlyphs = (font, text, where) => { const run = font.layout(text)
  const missing = run.glyphs.filter(g => g.id === 0).length
  if (missing) throw new Error(`${where}: ${missing} glifo(s) inexistente(s) en la fuente para «${text}» (p. ej. → ↑ ✓ emoji). Usa un carácter soportado o compón el símbolo aparte.`) }
const shapeRun = (segs, fonts, size, track) => { let x = 0, paths = []
  for (const s of segs) { const f = s.bold ? fonts.bold : fonts.base; assertGlyphs(f, s.t, 'texto'); const run = f.layout(s.t); const sc = size / f.unitsPerEm; let p = ''
    run.glyphs.forEach((g, i) => { const d = g.path.toSVG(); if (d) p += `<path d="${d}" transform="translate(${x.toFixed(1)} 0) scale(${sc} ${-sc})"/>`; x += run.positions[i].xAdvance * sc + track * size })
    paths.push({ p, accent: !!s.accent }) }
  return { paths, w: x - track * size } }
const textLayer = async (cfg, recipe, fonts, colorMode) => {
  let [x0, y0, x1, y1] = cfg.zone.map((v, i) => Math.round(v * (i % 2 ? H : W)))
  const track = Number.parseFloat(recipe.tracking) || 0, lh = recipe.lineHeight ?? 1.1
  const upper = !!cfg.uppercase
  const lines = cfg.text.split('|').map(l => parseRich(upper ? l.toUpperCase() : l))
  const fit = async (bx0, by0, bx1, by1) => { let size = Math.min(by1 - by0, 600)
    for (;;) { const ws = lines.map(l => shapeRun(l, fonts, size, track).w); const th = size * (1 + (lines.length - 1) * lh)
      if (Math.max(...ws) <= (bx1 - bx0) * 0.97 && th <= (by1 - by0) * 0.92) return size; size -= 2; if (size < 8) return 8 } }
  // color por contraste
  const pick = async (bx0, by0, bx1, by1) => { const q = await box(bx0, by0, bx1, by1)
    const white = 1.05 / (q(0.98) + 0.05), dark = (q(0.02) + 0.05) / (hexRel(C.inkOnLight) + 0.05)
    return colorMode === 'onDark' ? { fill: C.inkOnDark, c: white } : colorMode === 'onLight' ? { fill: C.inkOnLight, c: dark } : (white >= dark ? { fill: C.inkOnDark, c: white } : { fill: C.inkOnLight, c: dark }) }
  let chosen = await pick(x0, y0, x1, y1)
  if (cfg.autofit !== false && chosen.c < 4.5) { const W0 = x1 - x0, H0 = y1 - y0; let done = false
    for (let s = 0.05; s <= 0.45 && !done; s += 0.05) for (const side of ['r', 'l', 'b']) {
      const nx0 = side === 'l' ? x0 + Math.round(W0 * s) : x0, nx1 = side === 'r' ? x1 - Math.round(W0 * s) : x1, ny1 = side === 'b' ? y1 - Math.round(H0 * s) : y1
      const cand = await pick(nx0, y0, nx1, ny1)
      if (cand.c >= 4.5) { [x0, x1, y1] = [nx0, nx1, ny1]; chosen = cand; done = true; break } } }
  const size = await fit(x0, y0, x1, y1)
  let g = '', accentBoxes = []
  let y = y0 + ((y1 - y0) - size * (1 + (lines.length - 1) * lh)) / 2 + size * 0.8
  for (const l of lines) { const r = shapeRun(l, fonts, size, track)
    const x = cfg.align === 'center' ? x0 + ((x1 - x0) - r.w) / 2 : cfg.align === 'right' ? x1 - r.w : x0
    for (const p of r.paths) g += `<g fill="${p.accent ? (cfg.accentFill ?? C.accentSurface) : chosen.fill}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${p.p}</g>`
    y += size * lh }
  return { svg: g, size: Math.round(size), fill: chosen.fill, contrast: chosen.c, zone: [x0, y0, x1, y1] }
}
const layers = [], report = {}
const add = async (key, recipe, fonts, colorMode) => { if (!plan[key]) return; const r = await textLayer(plan[key], recipe, fonts, colorMode)
  layers.push(r.svg); report[key] = { tam: r.size, tinta: r.fill === C.inkOnDark ? 'blanco' : 'tinta', contraste: +r.contrast.toFixed(2) } }
await add('label', R.structureLabel, { base: POP[600], bold: POP[700] })
await add('lead', R.ideaLead, { base: bric(R.ideaLead), bold: bricBold(R.ideaLead) })
await add('dominant', R.ideaImpact, { base: bric(R.ideaImpact), bold: bricBold(R.ideaImpact) })
await add('closing', R.ideaMedium, { base: bric(R.ideaMedium), bold: bricBold(R.ideaMedium) })
await add('hud', R.structureCopy, { base: POP[400], bold: POP[700] })
if (plan.gesture) { const f = fontkit.openSync(GUTTERY); const size = Math.round((plan.gesture.size ?? 0.07) * H)
  const run = f.layout(plan.gesture.text); const sc = size / f.unitsPerEm; let x = 0, p = ''
  run.glyphs.forEach((g, i) => { const d = g.path.toSVG(); if (d) p += `<path d="${d}" transform="translate(${x.toFixed(1)} 0) scale(${sc} ${-sc})"/>`; x += run.positions[i].xAdvance * sc })
  const gx = plan.gesture.x * W, gy = plan.gesture.y * H
  const q = await box(Math.round(gx), Math.round(gy - size), Math.round(gx + x), Math.round(gy + size * 0.2))
  assertGlyphs(f, plan.gesture.text, 'gesto Guttery')
  const white = 1.05 / (q(0.98) + 0.05), dark = (q(0.02) + 0.05) / (hexRel(C.inkOnLight) + 0.05)
  const useWhite = white >= dark, fill = useWhite ? C.inkOnDark : C.inkOnLight, c = useWhite ? white : dark
  if (c < 4.5) { if (plan.gesture.force) console.log(`AVISO gesto ${c.toFixed(2)}:1 < 4,5 — forzado`); else throw new Error(`gesto en ${c.toFixed(2)}:1 (<4,5): muévelo a una zona más pareja o cámbialo de lugar`) }
  layers.push(`<g fill="${fill}" transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)}) rotate(${plan.gesture.rotate ?? -4})">${p}</g>`)
  report.gesture = { tam: size, tinta: useWhite ? 'blanco' : 'tinta', contraste: +c.toFixed(2) } }
if (plan.selection) { const s = plan.selection
  const shapeLabel = (t, size) => { const f = POP[700]; const run = f.layout(t); const sc = size / f.unitsPerEm; let x = 0, p = ''
    run.glyphs.forEach((g, i) => { const d = g.path.toSVG(); if (d) p += `<path d="${d}" transform="translate(${x.toFixed(1)} 0) scale(${sc} ${-sc})"/>`; x += run.positions[i].xAdvance * sc }); return { p, advance: x } }
  const manifest = resolveCollaborationSelectionIntent({ targetId: 'obj', targetKind: s.targetKind ?? 'object', variant: s.variant ?? 'eight-handles', padding: s.padding ?? 'standard', overlay: s.overlay ?? 'subtle',
    cursors: (s.cursors ?? []).map(c => ({ id: c.id, kind: 'collaborator', targetId: 'obj', anchor: c.anchor, action: c.action ?? 'select', label: c.label, participantKind: 'role' }))
      .concat(s.local === false ? [] : [{ id: 'local', kind: 'local', targetId: 'obj', anchor: s.local ?? 'bottom-end', action: 'select' }]) })
  const r = renderCollaborationSelection({ manifest, targetBounds: { left: s.box[0], top: s.box[1], right: s.box[2], bottom: s.box[3] }, canvas: { width: W, height: H },
    measureLabel: (l, size) => shapeLabel(l, size).advance, presentation: { collaboratorScale: s.scale ?? 1.5, localCursorScale: 1.2, participantColors: Object.fromEntries((s.cursors ?? []).filter(c => c.color).map(c => [c.id, c.color])) } })
  const svg = r.overlay.replace(/<text x="(-?[\d.]+)" y="(-?[\d.]+)" fill="([^"]+)" font-family="[^"]*" font-size="([\d.]+)" font-weight="700">([^<]*)<\/text>/g,
    (_, x, y, fill, size, label) => `<g fill="${fill}" transform="translate(${x} ${y})">${shapeLabel(label.replaceAll('&amp;', '&'), Number(size)).p}</g>`)
  if (/<text/.test(svg)) throw new Error('quedó <text> en la selección')
  if (!r.evidence.withinCanvas) throw new Error('selección fuera del lienzo: ' + JSON.stringify(r.evidence.cursorEvidence?.map(c => c.labelBounds)))
  layers.push(svg); report.selection = { cursores: manifest.cursors.map(c => c.id), dentroDelLienzo: true } }
const composite = [{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${layers.join('')}</svg>`), left: 0, top: 0 }]
if (plan.logo !== false) { const lw = Math.round(Math.min(W, H) * (plan.logo?.w ?? 0.15)), lh = Math.round(lw * 196.68 / 837.07)
  const ll = Math.round((W - lw) / 2), lt = Math.round((plan.logo?.cy ?? 0.935) * H - lh / 2)
  const q = await box(ll, lt, ll + lw, lt + lh)
  const white = 1.05 / (q(0.98) + 0.05), navy = (q(0.02) + 0.05) / (hexRel('#023c70') + 0.05), useWhite = white >= navy
  composite.push({ input: await sharp(`${REPO}/public/branding/${useWhite ? 'logo-negative.svg' : 'logo-full.svg'}`, { density: 600 }).resize(lw, lh).png().toBuffer(), left: ll, top: lt })
  report.logo = { tinta: useWhite ? 'blanco' : 'navy', contraste: +(useWhite ? white : navy).toFixed(2) } }
await sharp(PLATE).composite(composite).png().toFile(OUT)
console.log(OUT.split('/').pop(), JSON.stringify(report))
