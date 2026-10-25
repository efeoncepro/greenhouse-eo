// Infografía del artículo «SEO y AEO» (post 248463). Valores de La órbita desde @efeoncepro/axis-tokens,
// órbita con orbitSvg e íconos con resolveIcon de @efeoncepro/axis-graphic-line. Source con texto vivo;
// delivery con texto contorneado (fontkit). Uso: node build.mjs
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import * as fontkit from 'fontkit'

const require = createRequire(import.meta.url)
const { efeonceGraphicLine: GL } = require('@efeoncepro/axis-tokens')
const { orbitSvg, textCrossesRing } = require('@efeoncepro/axis-graphic-line')
const { resolveIcon, auditIconGroup } = require('@efeoncepro/axis-graphic-line/icons')

const runDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(runDir, '../..')
const out = { source: path.join(runDir, 'source'), delivery: path.join(runDir, 'delivery') }
for (const d of Object.values(out)) await mkdir(d, { recursive: true })

const b64 = async rel => Buffer.from(await readFile(path.join(root, rel))).toString('base64')
const logos = { light: await b64('public/branding/logo-full.svg'), dark: await b64('public/branding/logo-negative.svg'), url: await b64('src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg') }

const bric = fontkit.openSync(path.join(root, 'src/assets/fonts/BricolageGrotesque-Variable.ttf'))
const fonts = {
  p400: fontkit.openSync(path.join(root, 'src/assets/fonts/Poppins-Regular.ttf')),
  p500: fontkit.openSync(path.join(root, 'src/assets/fonts/Poppins-Medium.ttf')),
  p600: fontkit.openSync(path.join(root, 'src/assets/fonts/Poppins-SemiBold.ttf')),
  b400: bric.getVariation({ wght: 400, opsz: 72 }),
  b700: bric.getVariation({ wght: 700, opsz: 72 }),
  b760: bric.getVariation({ wght: GL.type.answer.weight, opsz: 96 })
}
const family = { p400: ['Poppins', 400], p500: ['Poppins', 500], p600: ['Poppins', 600], b400: ['Bricolage Grotesque', 400], b700: ['Bricolage Grotesque', 700], b760: ['Bricolage Grotesque', 760] }

const engine = GL.lines.find(l => l.key === 'engine')
const palette = theme => theme === 'dark'
  ? { theme, bg: GL.color.dark, ink: '#ffffff', soft: 'rgba(255,255,255,0.72)', faint: 'rgba(255,255,255,0.16)', line: 'rgba(255,255,255,0.28)', accent: engine.accentOnDark, surface: 'dark' }
  : { theme, bg: GL.color.paper, ink: GL.color.navy, soft: 'rgba(2,60,112,0.74)', faint: 'rgba(2,60,112,0.12)', line: 'rgba(2,60,112,0.3)', accent: engine.accentOnLight, surface: 'light' }

const esc = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
let mode = 'source'
const boxes = []
const measure = (value, size, f, tracking = 0) => {
  const run = fonts[f].layout(String(value)); const s = size / fonts[f].unitsPerEm
  return run.positions.reduce((w, p) => w + p.xAdvance * s + tracking, 0) - (run.positions.length ? tracking : 0)
}
function text(value, x, y, size, f, fill, o = {}) {
  const { anchor = 'start', tracking = 0, opacity = 1, protect = true, footerText = false } = o
  const w = measure(value, size, f, tracking)
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x
  if (protect) boxes.push({ x: x0, y: y - size * 0.82, w, h: size * 1.05, label: value, footerText })
  if (mode === 'source') {
    const [fam, wt] = family[f]
    return `<text x="${x}" y="${y}" font-family="${fam}" font-size="${size}" font-weight="${wt}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${tracking}" opacity="${opacity}">${esc(value)}</text>`
  }
  const font = fonts[f]; const run = font.layout(String(value)); const s = size / font.unitsPerEm
  let cur = x0 - x; const paths = run.glyphs.map((g, i) => { const p = run.positions[i]; const dx = cur + p.xOffset * s; cur += p.xAdvance * s + tracking; return `<g transform="translate(${dx.toFixed(2)} ${(-p.yOffset * s).toFixed(2)}) scale(${s.toFixed(6)} ${(-s).toFixed(6)})"><path d="${g.path.toSVG()}"/></g>` }).join('')
  return `<g transform="translate(${x} ${y})" fill="${fill}" opacity="${opacity}">${paths}</g>`
}
const runs = (parts, x, y, size, fill, o = {}) => { let cx = x; return parts.map(([t, f]) => { const out = text(t, cx, y, size, f, fill, o); cx += measure(t, size, f, o.tracking || 0); return out }).join('') }
const lines = (arr, x, y, size, f, fill, gap, o) => arr.map((t, i) => text(t, x, y + i * gap, size, f, fill, o)).join('')
const icon = (glyph, x, y, size, p) => { const r = resolveIcon({ glyph, state: 'rest', size, line: 'engine', surface: p.surface }); return `<g transform="translate(${x} ${y})">${r.svg.replace('<svg ', '<svg x="0" y="0" ')}</g>` }

function footer(p, W, H, x, source) {
  const narrow = W < 1000
  const y = H - 46, logoW = 132, urlW = 190, urlX = W - x - urlW, logoX = urlX - 26 - logoW
  const ruleY = narrow ? H - 210 : y - 44
  const parts = source.split(' · ')
  const src = narrow ? lines([parts[0], parts.slice(1).join(' · ')], x, H - 158, 28, 'p500', p.soft, 38, { footerText: true }) : text(source, x, y, 22, 'p500', p.soft, { footerText: true })
  boxes.push({ footer: true })
  return `<g data-footer="true"><path d="M${x} ${ruleY}H${W - x}" stroke="${p.line}" stroke-width="2"/>${src}<image href="data:image/svg+xml;base64,${logos[p.theme]}" x="${logoX}" y="${y - 28}" width="${logoW}" height="33"/><image href="data:image/svg+xml;base64,${logos.url}" x="${urlX}" y="${y - 31}" width="${urlW}" height="38" opacity=".85"/></g>`
}
const shell = (W, H, p, title, desc, body, source, x) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d"><title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc><rect width="${W}" height="${H}" fill="${p.bg}"/>${body}${footer(p, W, H, x, source)}</svg>`
const figLabel = (p, x, label, size) => text(label, x, 84, size, 'p600', p.ink)
const header = (p, x, kicker, title, sub, tSize, sSize, subGap = 58) => `${text(kicker, x, 92, 24, 'p600', p.accent, { tracking: 2.4 })}${Array.isArray(title) ? lines(title, x, 168, tSize, 'b760', p.ink, tSize * 1.08) : text(title, x, 168, tSize, 'b760', p.ink)}${Array.isArray(sub) ? lines(sub, x, 168 + (Array.isArray(title) ? (title.length - 1) * tSize * 1.08 : 0) + subGap, sSize, 'p400', p.soft, sSize * 1.4) : text(sub, x, 168 + subGap, sSize, 'p400', p.soft)}`
const step = (p, n, x, y, label, q, size = 26) => { const ns = Math.round(size * 1.5), off = measure(n, ns, 'b760') + size * 0.7; return `${text(n, x, y + size * 0.1, ns, 'b760', p.accent)}${text(label, x + off, y, size, 'p600', p.ink)}${text(q, x + off + measure(label, size, 'p600') + 16, y, size, 'p400', p.soft)}` }
const chip = (p, label, x, y, size = 24) => { const w = measure(label, size, 'p500') + 48; return { w, svg: `<rect x="${x}" y="${y}" width="${w}" height="${size * 2.1}" rx="${size * 1.05}" fill="${p.faint}"/>${text(label, x + 24, y + size * 1.42, size, 'p500', p.ink)}` } }

// ── «Cómo arma su respuesta un motor de IA» ─────────────────────────────────────────────────────────────
const SUBQ = ['qué es AEO', 'AEO vs. SEO', 'qué cambiar en mi sitio', 'cómo se mide']
const PASSAGES = [['informe', 'Guía oficial', true], ['prensa', 'Medio', false], ['social', 'Comunidad', false], ['multimedia', 'Video', false], ['web', 'Tu sitio', true], ['contenido', 'Otro blog', false]]
const skeleton = (p, x, y, widths, h = 12, gap = 22) => widths.map((w, i) => `<rect x="${x}" y="${y + i * gap}" width="${w}" height="${h}" rx="${h / 2}" fill="${p.faint}"/>`).join('')
const chevronR = (p, x0, y0, s) => `<path d="M${x0} ${y0 - s}L${x0 + s * 0.9} ${y0}L${x0} ${y0 + s}" fill="none" stroke="${p.soft}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
const chevronD = (p, x0, y0, s) => `<path d="M${x0 - s} ${y0}L${x0} ${y0 + s * 0.9}L${x0 + s} ${y0}" fill="none" stroke="${p.soft}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
const fits = []
const fit = (label, w, max) => { if (w > max) fits.push(`${label}: ${Math.round(w)} > ${max}`) }

function searchBar(p, x, y, w, size, q) {
  const lh = size * 1.3, h = 40 + q.length * lh
  q.forEach(t => fit(`pregunta «${t}»`, measure(t, size, 'p500'), w - 72 - 24))
  return { h, svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="#ffffff" stroke="${p.line}" stroke-width="1.5"/>${icon('busqueda', x + 20, y + 20 + (lh - 36) / 2, 36, p)}${lines(q, x + 72, y + 20 + size * 1.02, size, 'p500', p.ink, lh)}` }
}
function passageRow(p, [g, label, on], x, y, w, h, size) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${on ? '#ffffff' : 'none'}" stroke="${on ? p.accent : p.line}" stroke-width="${on ? 3 : 1.5}"/>${icon(g, x + 16, y + h / 2 - h * 0.28, h * 0.56, p)}${text(label, x + 24 + h * 0.66, y + h / 2 + size * 0.36, size, on ? 'p600' : 'p500', p.ink)}${skeleton(p, x + w - 112, y + h / 2 - 11, [88, 58], 9, 15)}`
}
function answerCard(p, x, y, w, h, size, idPrefix, W, H, k = 1) {
  const tile = 96 * k, gap = 48 * k, tx0 = x + 32 * k, ty = y + 232 * k
  const tiles = [['informe', 'Guía oficial'], ['web', 'Tu sitio']].map(([g, l], i) => {
    const tx = tx0 + i * (tile + gap), on = i === 1
    return `<rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" rx="${24 * k}" fill="${on ? '#ffffff' : p.faint}" stroke="${on ? p.accent : 'none'}" stroke-width="3"/>${icon(g, tx + tile / 2 - 28 * k, ty + tile / 2 - 28 * k, 56 * k, p)}${text(String(i + 1), tx + 12 * k, ty + 28 * k, 22 * k, 'b760', on ? p.accent : p.ink)}${text(l, tx + tile / 2, ty + tile + 52 * k, size, on ? 'p600' : 'p500', p.ink, { anchor: 'middle' })}`
  }).join('')
  const orbit = { cx: tx0 + tile + gap + tile / 2, cy: ty + tile / 2, r: 70 * k }
  const o = orbitSvg({ width: W, height: H, line: 'engine', surface: p.surface, channel: 'screen', circle: orbit, halo: true, idPrefix })
  return { orbit, svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="#ffffff" stroke="${p.line}" stroke-width="1.5"/>${icon('ia', x + 28 * k, y + 26 * k, 38 * k, p)}${text('Respuesta', x + 28 * k + 52 * k, y + 54 * k, size, 'p600', p.ink)}${skeleton(p, x + 32 * k, y + 100 * k, [w - 64 * k, w - 92 * k, w - 140 * k], 12 * k, 26 * k)}${text('Fuentes citadas', x + 32 * k, y + 196 * k, size - 2, 'p500', p.soft)}${o.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}${tiles}` }
}

function motor(viewport, theme) {
  const p = palette(theme); boxes.length = 0
  const title = 'Cómo arma su respuesta un motor de IA'
  const desc = 'Una pregunta («¿Cómo aparezco en ChatGPT?») entra a un motor de IA y se abre en cuatro sub-preguntas: qué es AEO, AEO vs. SEO, qué cambiar en mi sitio y cómo se mide. El motor revisa pasajes de seis fuentes (guía oficial, medio, comunidad, video, tu sitio y otro blog), elige dos y redacta una respuesta que cita la guía oficial y tu sitio. La órbita marca la cita de tu sitio. Conclusión: no cita páginas, cita el pasaje que mejor responde.'
  const source = 'Esquema ilustrativo · Google, OpenAI y Ahrefs (2025–2026)'
  let W, H, x, body, orbit
  if (viewport === 'desktop') {
    W = 1600; H = 930; x = 96
    const cols = [300, 300, 330, 358], gap = 40, xs = []; let cx = 96
    for (const c of cols) { xs.push(cx); cx += c + gap }
    const top = 250, sz = 22
    const heads = [['01', 'La pregunta'], ['02', 'Se abre'], ['03', 'Busca pasajes'], ['04', 'Responde y cita']].map(([n, l], i) => step(p, n, xs[i], 178, l, '', 26)).join('')
    const bar = searchBar(p, xs[0], top, cols[0], 24, ['¿Cómo aparezco', 'en ChatGPT?'])
    let chips = ''; SUBQ.forEach((q, i) => { const c = chip(p, q, xs[1], top + i * 64, 20); fit(`chip «${q}»`, c.w, cols[1]); chips += c.svg })
    const rows = PASSAGES.map((r, i) => passageRow(p, r, xs[2], top + i * 72, cols[2], 60, 21)).join('')
    const card = answerCard(p, xs[3], top, cols[3], 420, 21, `motor-${viewport}-${theme}`, W, H); orbit = card.orbit
    const arrows = [0, 1, 2].map(i => chevronR(p, xs[i] + cols[i] + gap / 2 - 5, top + 205, 11)).join('')
    body = `${figLabel(p, x, title, 30)}${heads}${bar.svg}
      ${lines(['Lo que escribe', 'tu comprador'], xs[0], top + bar.h + 40, 20, 'p400', p.soft, 28)}
      ${chips}${lines(['Sub-preguntas que el motor', 'busca por su cuenta'], xs[1], top + 4 * 64 + 34, 20, 'p400', p.soft, 28)}
      ${rows}${card.svg}${arrows}
      ${runs([['No cita páginas: ', 'b400'], ['cita el pasaje que mejor responde.', 'b760']], 96, 770, 46, p.ink, { tracking: -0.5 })}`
  } else {
    W = 900; x = 64
    const cw = 772
    let y = 230
    const parts = [lines(['Cómo arma su respuesta', 'un motor de IA'], x, 92, 36, 'p600', p.ink, 48)]
    const gapStep = 56
    parts.push(step(p, '01', x, y, 'La pregunta', '', 30)); y += 40
    const bar = searchBar(p, x, y, cw, 32, ['¿Cómo aparezco en ChatGPT?']); parts.push(bar.svg); y += bar.h + 30
    parts.push(chevronD(p, W / 2, y, 14)); y += 24 + gapStep
    parts.push(step(p, '02', x, y, 'Se abre en sub-preguntas', '', 30)); y += 40
    let cxp = x, row = 0
    for (const q of SUBQ) { const w = measure(q, 28, 'p500') + 48; if (cxp + w > x + cw) { row++; cxp = x } parts.push(chip(p, q, cxp, y + row * 76, 28).svg); cxp += w + 14 }
    y += (row + 1) * 76 + 10
    parts.push(chevronD(p, W / 2, y, 14)); y += 24 + gapStep
    parts.push(step(p, '03', x, y, 'Busca pasajes', '', 30)); y += 40
    PASSAGES.forEach((r, i) => parts.push(passageRow(p, r, x, y + i * 86, cw, 72, 28))); y += PASSAGES.length * 86 + 16
    parts.push(chevronD(p, W / 2, y, 14)); y += 24 + gapStep
    parts.push(step(p, '04', x, y, 'Responde y cita', '', 30)); y += 40
    const cardY = y
    y += 590 + 110
    parts.push(lines(['No cita páginas:'], x, y, 50, 'b400', p.ink, 60)); parts.push(lines(['cita el pasaje que', 'mejor responde.'], x, y + 62, 50, 'b760', p.ink, 60))
    H = Math.round(y + 120 + 260)
    const card = answerCard(p, x, cardY, cw, 590, 28, `motor-${viewport}-${theme}`, W, H, 1.4); orbit = card.orbit; parts.push(card.svg)
    body = parts.join('')
  }
  return { svg: shell(W, H, p, title, desc, body, source, x), W, H, orbit, boxes: [...boxes] }
}

const audit = auditIconGroup([...PASSAGES.map(([g]) => ({ glyph: g, state: 'rest', line: 'engine' })), { glyph: 'busqueda', state: 'rest', line: 'engine' }, { glyph: 'ia', state: 'rest', line: 'engine' }], { pieceHasSphere: true })
const report = { iconAudit: audit, files: [] }
for (const v of ['desktop', 'mobile']) for (const t of ['light']) for (const m of ['source', 'delivery']) {
  mode = m
  const r = motor(v, t)
  const file = path.join(out[m], `aeo-motor-respuesta-${v}-${t}${m === 'source' ? '-source' : ''}.svg`)
  await writeFile(file, r.svg)
  if (m === 'delivery') {
    const prot = r.boxes.filter(b => !b.footer && !b.footerText)
    const out1 = prot.filter(b => b.x < 0 || b.y < 0 || b.x + b.w > r.W || b.y + b.h > r.H - (r.W < 1000 ? 220 : 100)).map(b => b.label)
    const cross = r.orbit ? prot.filter(b => textCrossesRing(b, r.orbit)).map(b => b.label) : []
    report.files.push({ file: path.relative(runDir, file), w: r.W, h: r.H, bytes: Buffer.byteLength(r.svg), sha256: createHash('sha256').update(r.svg).digest('hex'), outOfCanvasOrFooter: out1, textCrossesOrbit: cross })
  }
}
report.fit = [...new Set(fits)]
await writeFile(path.join(runDir, 'build-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report.files.map(f => [f.file, f.h, f.outOfCanvasOrFooter, f.textCrossesOrbit])), 'fit:', report.fit, 'icons ok:', audit.ok)
