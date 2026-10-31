// Infografías del artículo «ICP B2B» (post 249108). Valores de La órbita desde @efeoncepro/axis-tokens,
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

const growth = GL.lines.find(l => l.key === 'growth')
const palette = theme => theme === 'dark'
  ? { theme, bg: GL.color.dark, ink: '#ffffff', soft: 'rgba(255,255,255,0.72)', faint: 'rgba(255,255,255,0.16)', line: 'rgba(255,255,255,0.28)', accent: growth.accentOnDark, surface: 'dark' }
  : { theme, bg: GL.color.paper, ink: GL.color.navy, soft: 'rgba(2,60,112,0.74)', faint: 'rgba(2,60,112,0.12)', line: 'rgba(2,60,112,0.3)', accent: growth.accentOnLight, surface: 'light' }

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
const icon = (glyph, x, y, size, p) => { const r = resolveIcon({ glyph, state: 'rest', size, line: 'growth', surface: p.surface }); return `<g transform="translate(${x} ${y})">${r.svg.replace('<svg ', '<svg x="0" y="0" ')}</g>` }

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

const ROLES = [['reunion', ['Quien tiene', 'el problema']], ['checklist', ['Quien', 'evalúa']], ['finanzas', ['Quien libera', 'el presupuesto']], ['talent', ['Quienes', 'lo usarán']], ['contrato', ['Compras', 'y legal']], ['seguridad', ['TI y', 'seguridad']]]

function capas(viewport, theme) {
  const p = palette(theme); boxes.length = 0
  const title = 'Cuatro preguntas sobre una misma cuenta'
  const desc = 'La cuenta es el ICP. Dentro de ella está el grupo de compra; la órbita enfoca al IPP, la persona por la que conviene entrar; abajo, el job que explica por qué compra.'
  const source = 'Marco editorial Efeonce · Grupos de 5 a 16 personas: Gartner, 2025'
  let W, H, x, body, orbit
  if (viewport === 'desktop') {
    W = 1600; H = 1030; x = 96
    const cx0 = 96, cy0 = 130, cw = 1408, ch = 770
    let chips = '', cxp = cx0 + 48
    for (const c of ['Industria', 'Tamaño', 'Madurez', 'Problema', 'Trigger']) { const k = chip(p, c, cxp, cy0 + 84); chips += k.svg; cxp += k.w + 14 }
    const slot = (cw - 96) / 6, ty = cy0 + 332
    const tiles = ROLES.map(([g, l], i) => { const tx = cx0 + 48 + slot * i + slot / 2; return `<rect x="${tx - 56}" y="${ty - 56}" width="112" height="112" rx="26" fill="${i === 0 ? 'none' : p.faint}" stroke="${i === 0 ? p.accent : 'none'}" stroke-width="3"/>${icon(g, tx - 30, ty - 30, 60, p)}${lines(l, tx, ty + 120, 24, i === 0 ? 'p600' : 'p500', p.ink, 32, { anchor: 'middle' })}` }).join('')
    const ox = cx0 + 48 + slot / 2
    orbit = { cx: ox, cy: ty, r: 92 }
    const o = orbitSvg({ width: W, height: H, line: 'growth', surface: p.surface, channel: 'screen', circle: orbit, halo: true, idPrefix: `capas-${viewport}-${theme}` })
    body = `${figLabel(p, x, title, 30)}
      <rect x="${cx0}" y="${cy0}" width="${cw}" height="${ch}" rx="40" fill="none" stroke="${p.line}" stroke-width="1.5"/>
      ${step(p, '01', cx0 + 48, cy0 + 60, 'ICP', '¿Qué empresa perseguir?')}${chips}
      <path d="M${cx0 + 48} ${cy0 + 182}H${cx0 + cw - 48}" stroke="${p.line}" stroke-width="1" opacity=".7"/>
      ${step(p, '02', cx0 + 48, cy0 + 222, 'Grupo de compra', '¿Quiénes deciden? · De 5 a 16 personas')}
      ${o.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}${tiles}
      ${text('03', ox - (measure('03', 39, 'b760') + 14 + measure('IPP', 26, 'p600')) / 2, ty + 210, 39, 'b760', p.accent)}${text('IPP', ox - (measure('03', 39, 'b760') + 14 + measure('IPP', 26, 'p600')) / 2 + measure('03', 39, 'b760') + 14, ty + 208, 26, 'p600', p.accent)}${text('Por aquí se entra', ox, ty + 238, 24, 'p400', p.soft, { anchor: 'middle' })}
      <path d="M${cx0 + 48} ${cy0 + 618}H${cx0 + cw - 48}" stroke="${p.line}" stroke-width="1" opacity=".7"/>
      ${step(p, '04', cx0 + 48, cy0 + 666, 'Job', '¿Por qué compra?')}
      ${runs([['«Cerrar cada mes ', 'b400'], ['sin errores ni horas extra.»', 'b760']], cx0 + 48, cy0 + 734, 46, p.ink, { tracking: -0.5 })}`
  } else {
    W = 900; H = 1740; x = 64
    const cx0 = 64, cy0 = 160, cw = 772, ch = 1330
    let chips = '', row = 0, cxp = cx0 + 40
    for (const c of ['Industria', 'Tamaño', 'Madurez', 'Problema', 'Trigger']) { const w = measure(c, 30, 'p500') + 52; if (cxp + w > cx0 + cw - 40) { row++; cxp = cx0 + 40 } chips += chip(p, c, cxp, cy0 + 96 + row * 78, 30).svg; cxp += w + 14 }
    const gy = cy0 + 330, colW = (cw - 80) / 3
    const tiles = ROLES.map(([g, l], i) => { const tx = cx0 + 40 + colW * (i % 3) + colW / 2, ty = gy + 120 + Math.floor(i / 3) * 360; return `<rect x="${tx - 62}" y="${ty - 62}" width="124" height="124" rx="28" fill="${i === 0 ? 'none' : p.faint}" stroke="${i === 0 ? p.accent : 'none'}" stroke-width="3"/>${icon(g, tx - 34, ty - 34, 68, p)}${lines(l, tx, ty + 128, 30, i === 0 ? 'p600' : 'p500', p.ink, 38, { anchor: 'middle' })}` }).join('')
    const ox = cx0 + 40 + colW / 2, oy = gy + 120
    orbit = { cx: ox, cy: oy, r: 100 }
    const o = orbitSvg({ width: W, height: H, line: 'growth', surface: p.surface, channel: 'screen', circle: orbit, halo: true, idPrefix: `capas-${viewport}-${theme}` })
    body = `${lines(['Cuatro preguntas sobre', 'una misma cuenta'], x, 84, 34, 'p600', p.ink, 46)}
      <rect x="${cx0}" y="${cy0}" width="${cw}" height="${ch}" rx="40" fill="none" stroke="${p.line}" stroke-width="1.5"/>
      ${step(p, '01', cx0 + 40, cy0 + 64, 'ICP', '¿Qué empresa?', 30)}${chips}
      <path d="M${cx0 + 40} ${cy0 + 276}H${cx0 + cw - 40}" stroke="${p.line}" stroke-width="1" opacity=".7"/>
      ${step(p, '02', cx0 + 40, gy, 'Grupo de compra', '5 a 16 personas', 30)}
      ${o.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}${tiles}
      ${text('03', ox - (measure('03', 45, 'b760') + 14 + measure('IPP', 30, 'p600')) / 2, oy + 226, 45, 'b760', p.accent)}${text('IPP', ox - (measure('03', 45, 'b760') + 14 + measure('IPP', 30, 'p600')) / 2 + measure('03', 45, 'b760') + 14, oy + 224, 30, 'p600', p.accent)}${text('Por aquí se entra', ox, oy + 260, 26, 'p400', p.soft, { anchor: 'middle' })}
      <path d="M${cx0 + 40} ${cy0 + 1040}H${cx0 + cw - 40}" stroke="${p.line}" stroke-width="1" opacity=".7"/>
      ${step(p, '04', cx0 + 40, cy0 + 1100, 'Job', '¿Por qué compra?', 30)}
      ${text('«Cerrar cada mes', cx0 + 40, cy0 + 1176, 46, 'b400', p.ink)}${lines(['sin errores ni', 'horas extra.»'], cx0 + 40, cy0 + 1232, 46, 'b760', p.ink, 56)}`
  }
  return { svg: shell(W, H, p, title, desc, body, source, x), W, H, orbit, boxes: [...boxes] }
}

function filtro(viewport, theme) {
  const p = palette(theme); boxes.length = 0
  const title = 'Un buen ICP sirve para descartar'
  const desc = 'Cuatro grillas iguales de empresas: el mercado, las que calzan con el ICP, las que además tienen un trigger reciente y las que además tienen identificado su grupo de compra. Cada filtro deja menos cuentas; las últimas, en el color del acento.'
  const source = 'Proporciones ilustrativas · Marco editorial Efeonce'
  const cols = 6, rows = 5, N = cols * rows
  // Mismo subconjunto a lo largo de los filtros: 30 → 12 → 6 → 3.
  const keep = [new Set([...Array(N).keys()]), new Set([1, 3, 4, 7, 9, 12, 14, 16, 19, 22, 25, 27]), new Set([3, 7, 12, 16, 22, 27]), new Set([7, 16, 22])]
  const labels = [['El mercado', 'Todas las empresas', ['Todas las empresas']], ['Calzan con el ICP', 'Tipo de empresa correcto', ['Tipo de empresa', 'correcto']], ['Tienen un trigger', 'Algo cambió: compran ahora', ['Algo cambió:', 'compran ahora']], ['Grupo a la vista', 'Sabes quién decide', ['Sabes quién decide']]]
  const grid = (gx, gy, cell, gap, k, last) => [...Array(N).keys()].map(i => { const cx = gx + (i % cols) * (cell + gap), cy = gy + Math.floor(i / cols) * (cell + gap); const on = keep[k].has(i); const fill = on ? (last ? p.accent : p.ink) : 'none'; const stroke = on ? 'none' : p.line; return `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="${cell * 0.2}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" opacity="${on ? (last ? 1 : 0.9) : 0.9}"/>` }).join('')
  const chevron = (x0, y0, s) => `<path d="M${x0} ${y0 - s}L${x0 + s * 0.9} ${y0}L${x0} ${y0 + s}" fill="none" stroke="${p.soft}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  let W, H, x, body
  if (viewport === 'desktop') {
    W = 1600; H = 790; x = 96
    const cell = 42, gap = 12, gw = cols * cell + (cols - 1) * gap, slotW = (1408 - 3 * 48) / 4
    let panels = ''
    for (let k = 0; k < 4; k++) { const px = 96 + k * (slotW + 48); const gx = px + (slotW - gw) / 2; panels += `${runs([[String(k + 1) + '  ', 'b760'], [labels[k][0], 'p600']], px + slotW / 2 - (measure(String(k + 1) + '  ', 26, 'b760') + measure(labels[k][0], 26, 'p600')) / 2, 160, 26, k === 3 ? p.accent : p.ink)}${text(labels[k][1], px + slotW / 2, 198, 22, 'p400', p.soft, { anchor: 'middle' })}${grid(gx, 236, cell, gap, k, k === 3)}`; if (k < 3) panels += chevron(px + slotW + 18, 236 + (rows * (cell + gap) - gap) / 2, 14) }
    body = `${figLabel(p, x, title, 30)}${panels}
      ${text('Las que quedan fuera no se borran:', 96, 592, 48, 'b400', p.ink, { tracking: -0.5 })}${text('pasan a contenido hasta que aparece un trigger.', 96, 652, 48, 'b760', p.ink, { tracking: -0.5 })}`
  } else {
    W = 900; H = 1640; x = 64
    const cell = 48, gap = 12, gw = cols * cell + (cols - 1) * gap, colW = 386
    let panels = ''
    for (let k = 0; k < 4; k++) { const px = 64 + (k % 2) * (colW); const py = 224 + Math.floor(k / 2) * 460; const gx = px + (colW - gw) / 2; panels += `${runs([[String(k + 1) + '  ', 'b760'], [labels[k][0], 'p600']], px + colW / 2 - (measure(String(k + 1) + '  ', 30, 'b760') + measure(labels[k][0], 30, 'p600')) / 2, py, 30, k === 3 ? p.accent : p.ink)}${lines(labels[k][2], px + colW / 2, py + 42, 26, 'p400', p.soft, 34, { anchor: 'middle' })}${grid(gx, py + 104, cell, gap, k, k === 3)}` }
    body = `${lines(['Un buen ICP sirve', 'para descartar'], x, 84, 34, 'p600', p.ink, 46)}${panels}
      ${lines(['Las que quedan fuera', 'no se borran:'], 64, 1180, 46, 'b400', p.ink, 54)}${lines(['pasan a contenido hasta', 'que aparece un trigger.'], 64, 1288, 46, 'b760', p.ink, 54)}`
  }
  return { svg: shell(W, H, p, title, desc, body, source, x), W, H, boxes: [...boxes] }
}

// Íconos: todos en reposo; la pieza 1 ya tiene la esfera de la órbita.
const audit = auditIconGroup(ROLES.map(([glyph]) => ({ glyph, state: 'rest', line: 'growth' })), { pieceHasSphere: true })
const report = { iconAudit: audit, files: [] }
for (const [name, fn] of [['icp-cuatro-capas', capas], ['icp-filtro-de-cuentas', filtro]]) for (const v of ['desktop', 'mobile']) for (const t of ['light', 'dark']) {
  for (const m of ['source', 'delivery']) {
    mode = m
    const r = fn(v, t)
    const file = path.join(out[m], `${name}-${v}-${t}${m === 'source' ? '-source' : ''}.svg`)
    await writeFile(file, r.svg)
    if (m === 'delivery') {
      const prot = r.boxes.filter(b => !b.footer && !b.footerText)
      const out1 = prot.filter(b => b.x < 0 || b.y < 0 || b.x + b.w > r.W || b.y + b.h > r.H - (r.W < 1000 ? 220 : 100)).map(b => b.label)
        .concat(r.boxes.filter(b => b.footerText && (b.x < 0 || b.x + b.w > r.W - 40)).map(b => 'footer:' + b.label))
      const cross = r.orbit ? prot.filter(b => textCrossesRing(b, r.orbit)).map(b => b.label) : []
      report.files.push({ file: path.relative(runDir, file), w: r.W, h: r.H, bytes: Buffer.byteLength(r.svg), sha256: createHash('sha256').update(r.svg).digest('hex'), outOfCanvasOrFooter: out1, textCrossesOrbit: cross })
    }
  }
}
await writeFile(path.join(runDir, 'build-report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report.files.map(f => [f.file, f.bytes, f.outOfCanvasOrFooter, f.textCrossesOrbit]), null, 0))
console.log('icons', JSON.stringify(audit).slice(0, 300))
