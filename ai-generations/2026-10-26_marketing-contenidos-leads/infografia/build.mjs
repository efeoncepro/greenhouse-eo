// Infografía «Una idea, cada formato» del artículo «Marketing de contenidos para generar leads» (post 244883).
// Mismo método que las del ICP (2026-10-25_icp-infografias): valores de La órbita desde @efeoncepro/axis-tokens,
// órbita con orbitSvg e íconos con resolveIcon; línea `brand`, la de la portada. Source con texto vivo; delivery
// con texto contorneado (fontkit). Uso: node build.mjs
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

const LINE = 'brand'
const runDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(runDir, '../../..')
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
  b760: bric.getVariation({ wght: GL.type.answer.weight, opsz: 96 })
}
const family = { p400: ['Poppins', 400], p500: ['Poppins', 500], p600: ['Poppins', 600], b400: ['Bricolage Grotesque', 400], b760: ['Bricolage Grotesque', 760] }

const line = GL.lines.find(l => l.key === LINE)
const palette = theme => theme === 'dark'
  ? { theme, bg: GL.color.dark, ink: '#ffffff', soft: 'rgba(255,255,255,0.72)', faint: 'rgba(255,255,255,0.16)', line: 'rgba(255,255,255,0.28)', accent: line.accentOnDark, surface: 'dark' }
  : { theme, bg: GL.color.paper, ink: GL.color.navy, soft: 'rgba(2,60,112,0.74)', faint: 'rgba(2,60,112,0.12)', line: 'rgba(2,60,112,0.3)', accent: line.accentOnLight, surface: 'light' }

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
const icon = (glyph, x, y, size, p) => { const r = resolveIcon({ glyph, state: 'rest', size, line: LINE, surface: p.surface }); return `<g transform="translate(${x} ${y})">${r.svg.replace('<svg ', '<svg x="0" y="0" ')}</g>` }
// La idea como el cubo de la portada: un cubo isométrico al trazo, del mismo grosor que los íconos.
const cube = (cx, cy, s, p) => { const h = s * 0.5, q = s * 0.29; return `<g fill="none" stroke="${p.ink}" stroke-width="${(s / 20).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"><path d="M${cx} ${cy - h}L${cx + h * 0.87} ${cy - q}V${cy + q}L${cx} ${cy + h}L${cx - h * 0.87} ${cy + q}V${cy - q}Z"/><path d="M${cx - h * 0.87} ${cy - q}L${cx} ${cy}L${cx + h * 0.87} ${cy - q}M${cx} ${cy}V${cy + h}"/></g>` }
const chip = (p, label, x, y, size = 20) => { const w = measure(label, size, 'p500') + 32; return `<rect x="${x}" y="${y}" width="${w}" height="${size * 1.8}" rx="${size * 0.9}" fill="${p.faint}"/>${text(label, x + 16, y + size * 1.26, size, 'p500', p.ink)}` }
const orbitBody = o => o.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')

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

// [glifo, formato, trabajo, dónde vive]
const FORMATS = [
  ['contenido', 'Artículo', 'Explica a fondo, con fuentes', 'Blog y buscadores'],
  ['swipe', 'Carrusel', 'La enseña lámina por lámina', 'LinkedIn e Instagram'],
  ['correo', 'Newsletter', 'La lleva a quien ya te sigue', 'Correo'],
  ['multimedia', 'Video corto', 'La muestra en segundos', 'Reels, Shorts y TikTok'],
  ['ia', 'Respuesta en la IA', 'Puede citarte cuando alguien pregunta', 'ChatGPT, Gemini y Google']
]
const TITLE = 'Una idea, cada formato'
const DESC = 'Al centro, una idea: «Una pieza suelta compite sola». De ella salen cinco formatos, cada uno con su trabajo: el artículo la explica a fondo con fuentes, el carrusel la enseña lámina por lámina, el newsletter la lleva a quien ya te sigue, el video corto la muestra en segundos y la respuesta en la IA puede citarte cuando alguien pregunta. Cierre: la idea es el activo; cada formato la lleva a otro lugar.'
const SOURCE = 'Esquema ilustrativo · Marco editorial Efeonce'
const CLOSE = [['La idea es el activo; ', 'b400'], ['cada formato la lleva a otro lugar.', 'b760']]

function pieza(viewport, theme) {
  const p = palette(theme); boxes.length = 0
  let W, H, x, body, orbit
  if (viewport === 'desktop') {
    W = 1600; H = 1000; x = 96
    // La idea, a la izquierda.
    const ix = 96, iy = 150, iw = 500, ih = 610
    const tcx = ix + iw / 2, tcy = iy + 210
    orbit = { cx: tcx, cy: tcy, r: 96 }
    const o = orbitSvg({ width: W, height: H, line: LINE, surface: p.surface, channel: 'screen', circle: orbit, halo: true, idPrefix: `idea-${viewport}-${theme}` })
    const idea = `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="40" fill="none" stroke="${p.line}" stroke-width="1.5"/>
      ${text('LA IDEA', tcx, iy + 64, 22, 'p600', p.accent, { anchor: 'middle', tracking: 2.4 })}
      ${orbitBody(o)}<rect x="${tcx - 58}" y="${tcy - 58}" width="116" height="116" rx="28" fill="none" stroke="${p.accent}" stroke-width="3"/>${cube(tcx, tcy, 60, p)}
      ${lines(['«Una pieza suelta', 'compite sola.»'], tcx, iy + 404, 46, 'b760', p.ink, 54, { anchor: 'middle', tracking: -0.5 })}
      ${lines(['Una que se puede defender,', 'adaptar y recordar.'], tcx, iy + 530, 24, 'p400', p.soft, 34, { anchor: 'middle' })}`
    // Cinco formatos, a la derecha.
    const rx = 740, rw = 1504 - rx, ry = 150, rh = ih / FORMATS.length
    let rows = '', wires = ''
    FORMATS.forEach(([g, name, job, where], i) => {
      const cy = ry + rh * i + rh / 2
      rows += `<rect x="${rx}" y="${cy - 42}" width="84" height="84" rx="22" fill="${p.faint}"/>${icon(g, rx + 18, cy - 24, 48, p)}
        ${text(name, rx + 112, cy - 6, 28, 'p600', p.ink)}${text(job, rx + 112, cy + 32, 24, 'p400', p.soft)}
        ${chip(p, where, rx + 112 + measure(name, 28, 'p600') + 18, cy - 34)}`
      if (i < FORMATS.length - 1) rows += `<path d="M${rx + 112} ${ry + rh * (i + 1)}H1504" stroke="${p.line}" stroke-width="1" opacity=".7"/>`
      const x0 = ix + iw, y0 = iy + ih / 2, x1 = rx - 14
      wires += `<path d="M${x0} ${y0}C${x0 + 80} ${y0} ${x1 - 80} ${cy} ${x1} ${cy}" fill="none" stroke="${p.line}" stroke-width="2"/><circle cx="${x1}" cy="${cy}" r="4" fill="${p.soft}"/>`
    })
    body = `${text(TITLE, x, 84, 30, 'p600', p.ink)}${wires}${idea}${rows}
      ${runs(CLOSE, x, 868, 48, p.ink, { tracking: -0.5 })}`
  } else {
    W = 900; H = 2150; x = 64
    const ix = 64, iy = 130, iw = 772, ih = 520
    const tcx = ix + iw / 2, tcy = iy + 200
    orbit = { cx: tcx, cy: tcy, r: 104 }
    const o = orbitSvg({ width: W, height: H, line: LINE, surface: p.surface, channel: 'screen', circle: orbit, halo: true, idPrefix: `idea-${viewport}-${theme}` })
    const idea = `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="40" fill="none" stroke="${p.line}" stroke-width="1.5"/>
      ${text('LA IDEA', tcx, iy + 66, 26, 'p600', p.accent, { anchor: 'middle', tracking: 2.4 })}
      ${orbitBody(o)}<rect x="${tcx - 62}" y="${tcy - 62}" width="124" height="124" rx="30" fill="none" stroke="${p.accent}" stroke-width="3"/>${cube(tcx, tcy, 66, p)}
      ${lines(['«Una pieza suelta', 'compite sola.»'], tcx, iy + 396, 50, 'b760', p.ink, 58, { anchor: 'middle', tracking: -0.5 })}`
    // Tronco: la idea baja y se reparte.
    const ty0 = iy + ih, rx = 64, ry = ty0 + 96, rh = 196
    let rows = `<path d="M${tcx} ${ty0}V${ty0 + 56}" stroke="${p.line}" stroke-width="2"/><circle cx="${tcx}" cy="${ty0 + 60}" r="5" fill="${p.soft}"/>`
    FORMATS.forEach(([g, name, job, where], i) => {
      const top = ry + rh * i, cy = top + 70
      rows += `<rect x="${rx}" y="${cy - 50}" width="100" height="100" rx="26" fill="${p.faint}"/>${icon(g, rx + 22, cy - 28, 56, p)}
        ${text(name, rx + 132, cy - 24, 34, 'p600', p.ink)}${text(job, rx + 132, cy + 22, 28, 'p400', p.soft)}${text(where, rx + 132, cy + 62, 26, 'p500', p.soft, { opacity: 0.85 })}`
      if (i < FORMATS.length - 1) rows += `<path d="M${rx} ${top + rh - 18}H${W - 64}" stroke="${p.line}" stroke-width="1" opacity=".7"/>`
    })
    const cy0 = ry + rh * FORMATS.length + 70
    body = `${text(TITLE, x, 84, 36, 'p600', p.ink)}${idea}${rows}
      ${text('La idea es el activo;', x, cy0, 48, 'b400', p.ink, { tracking: -0.5 })}${lines(['cada formato la lleva', 'a otro lugar.'], x, cy0 + 60, 48, 'b760', p.ink, 58, { tracking: -0.5 })}`
  }
  return { svg: shell(W, H, p, TITLE, DESC, body, SOURCE, x), W, H, orbit, boxes: [...boxes] }
}

// Íconos en reposo; la pieza ya tiene la esfera de la órbita.
const audit = auditIconGroup(FORMATS.map(([glyph]) => ({ glyph, state: 'rest', line: LINE })), { pieceHasSphere: true })
const report = { iconAudit: audit, files: [] }
const name = 'contenido-una-idea-cada-formato'
for (const v of ['desktop', 'mobile']) for (const t of ['light', 'dark']) {
  for (const m of ['source', 'delivery']) {
    mode = m
    const r = pieza(v, t)
    const file = path.join(out[m], `${name}-${v}-${t}${m === 'source' ? '-source' : ''}.svg`)
    await writeFile(file, r.svg)
    if (m === 'delivery') {
      const prot = r.boxes.filter(b => !b.footer && !b.footerText)
      const out1 = prot.filter(b => b.x < 0 || b.y < 0 || b.x + b.w > r.W || b.y + b.h > r.H - (r.W < 1000 ? 220 : 100)).map(b => b.label)
        .concat(r.boxes.filter(b => b.footerText && (b.x < 0 || b.x + b.w > r.W - 40)).map(b => 'footer:' + b.label))
      const cross = r.orbit ? prot.filter(b => textCrossesRing(b, r.orbit)).map(b => b.label) : []
      const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
      const overlaps = prot.flatMap((a, i) => prot.slice(i + 1).filter(b => hit(a, b)).map(b => `${a.label} × ${b.label}`))
      report.files.push({ file: path.relative(runDir, file), w: r.W, h: r.H, bytes: Buffer.byteLength(r.svg), sha256: createHash('sha256').update(r.svg).digest('hex'), outOfCanvasOrFooter: out1, textCrossesOrbit: cross, textOverlaps: overlaps })
    }
  }
}
await writeFile(path.join(runDir, 'build-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report.files.map(f => [f.file, f.bytes, f.outOfCanvasOrFooter, f.textCrossesOrbit, f.textOverlaps]), null, 0))
console.log('icons', JSON.stringify(audit).slice(0, 400))
