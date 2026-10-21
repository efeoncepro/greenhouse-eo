// Complemento «Experiencia en el mercado peruano» para Pibank (21-10-2026): el Blog de SKY Airline como trabajo de
// búsqueda en Perú. Documento A4 de cuatro páginas con la línea gráfica Efeonce (línea Engine), mismo sistema que el
// anexo del 19-10. Lee data.json (agregados de GSC y GA4 del blog, ver derive.mjs) y las imágenes de assets/.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'
import { efeonceGraphicLine as gl, axisGeometry, axisSurface } from '@efeoncepro/axis-tokens'
import { brandAssetUrl } from '@efeoncepro/axis-brand-assets'
import { sphereDividerSvg, answerHtml } from '@efeoncepro/axis-graphic-line'

const dir = path.dirname(fileURLToPath(import.meta.url))
const prospect = path.resolve(dir, '..')
let repo = dir
while (!(await fs.stat(path.join(repo, 'package.json')).catch(() => null))) repo = path.dirname(repo)
const output = path.resolve(dir, process.argv[2] ?? 'v2')
if ((await fs.readdir(output).catch(() => [])).length) throw Error('Salida ocupada; use una versión nueva.')

const sha = b => createHash('sha256').update(b).digest('hex')
const esc = v =>
  String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const nf = new Intl.NumberFormat('es-CL')
const pct1 = v => (100 * v).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct0 = v => Math.round(100 * v)

// ── Datos ─────────────────────────────────────────────────────────────────────────────────────────────────────
const dataBuf = await fs.readFile(path.join(dir, 'data.json'))
const D = JSON.parse(dataBuf.toString('utf8'))
const share = D.gsc.peru.clicks / D.gsc.all.clicks
if (D.gsc.peru.clicks !== 128101 || D.ga4.peruSessions !== 151884) throw Error('data.json cambió: revisar el copy')
const monthLabel = m => ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(m.slice(5)) - 1]
const minShare = Math.min(...D.gsc.monthly.map(m => m.share))
const maxShare = Math.max(...D.gsc.monthly.map(m => m.share))
const lastShare = D.gsc.monthly.at(-1).share
const millions = v => (v / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })
const thousands = v => Math.round(v / 1000)
const P = D.gsc.pages
const duration = `${Math.floor(D.ga4.avgDurationSec / 60)} min ${D.ga4.avgDurationSec % 60} s`

// ── Marca y assets ────────────────────────────────────────────────────────────────────────────────────────────
const assets = []
async function embed(file, mime, source) {
  const b = await fs.readFile(file)
  assets.push({ file: path.relative(repo, file), source, sha256: sha(b) })
  return `data:${mime};base64,${b.toString('base64')}`
}
const logo = await embed(fileURLToPath(brandAssetUrl('efeonce-logo-positive')), 'image/svg+xml', 'efeonce-logo-positive')
const bubble = await embed(fileURLToPath(brandAssetUrl('url-bubble-baked-light')), 'image/svg+xml', 'url-bubble-baked-light')
const pibank = await embed(path.join(prospect, 'propuesta/assets/pibank-logo-inverso.svg'), 'image/svg+xml', 'Pibank, versión para fondo claro')
const sky = await embed(
  path.join(repo, 'src/lib/artifact-composer/catalogs/deck-axis/assets/clients/sky-on-dark.svg'),
  'image/svg+xml',
  'SKY Airline, versión sobre oscuro (geometría oficial de skyairline.com)'
)
const img = async name => embed(path.join(dir, 'assets', name), 'image/jpeg', `blog.skyairline.com (${name})`)
const shots = { lima: await img('shot-lima-mobile.jpg'), talara: await img('shot-talara-desktop.jpg') }
const banners = Object.fromEntries(
  await Promise.all(['punta-sal', 'canon-shucto', 'tarapoto', 'trujillo'].map(async k => [k, await img(`${k}-900.jpg`)]))
)
let fonts = ''
for (const [family, weight, file] of [
  [gl.type.answer.family, '100 900', 'bricolage-grotesque-variable.ttf'],
  ...['300', '400', '500', '600', '700'].map(w => [gl.type.text.family, w, `poppins-${w}.ttf`])
]) {
  const f = path.join(repo, 'src/lib/artifact-composer/brand-packs/axis/fonts', file)
  if (!(await fs.stat(f).catch(() => null))) continue
  fonts += `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:block;src:url("${await embed(f, 'font/ttf', 'axis-fonts')}") format("truetype")}\n`
}
const contact = JSON.parse(
  await fs.readFile(path.join(repo, 'src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json'), 'utf8')
).slots.contactDetails.value
const engine = gl.lines.find(l => l.key === 'engine')
const accent = engine.accentOnLight
const navy = engine.darkBg
const W = gl.orbit.baseWidthPx
// Igual que el anexo del 19-10: la medida con camino recorrido viene del build de AXIS main (Greenhouse fija 0.11.0).
const axisGraphicLinePath = path.resolve(repo, '../axis-design-system/packages/graphic-line/dist/index.js')
const { measureSvg } = await import(axisGraphicLinePath)
const axisGraphicLineVersion = JSON.parse(
  await fs.readFile(path.resolve(axisGraphicLinePath, '../../package.json'), 'utf8')
).version
const divider = sphereDividerSvg({ widthPx: W - 136, line: 'engine', surface: 'light' })
const measureSource = 'Google Search Console del Blog de SKY Airline · clics por país · octubre 2025 a septiembre 2026'
const RING = { cx: 68 + 118, cy: 488, r: 118 }
const ring = measureSvg({
  width: W,
  height: Math.round((W * 297) / 210),
  value: share,
  source: measureSource,
  circle: RING,
  line: 'engine',
  surface: 'light',
  channel: 'print',
  idPrefix: 'pibank-peru'
})

// ── Gráficos (SVG propio, colores desde tokens) ───────────────────────────────────────────────────────────────
const ink = gl.color.navy
function shareChart() {
  const w = 658, h = 190, l = 34, r = 16, t = 26, b = 26
  const lo = 0.15, hi = 0.38
  const xs = i => l + (i * (w - l - r)) / (D.gsc.monthly.length - 1)
  const ys = v => t + ((hi - v) * (h - t - b)) / (hi - lo)
  const pts = D.gsc.monthly.map((m, i) => [xs(i), ys(m.share)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  const area = `${line}L${pts.at(-1)[0].toFixed(1)},${h - b}L${pts[0][0].toFixed(1)},${h - b}Z`
  const grid = [0.2, 0.25, 0.3, 0.35]
    .map(v => `<line x1="${l}" x2="${w - r}" y1="${ys(v)}" y2="${ys(v)}" stroke="${ink}" stroke-opacity=".1"/><text x="${l - 6}" y="${ys(v) + 3}" text-anchor="end" class="ax">${pct0(v)}%</text>`)
    .join('')
  const months = D.gsc.monthly.map((m, i) => `<text x="${xs(i)}" y="${h - 8}" text-anchor="middle" class="ax">${monthLabel(m.month)}</text>`).join('')
  const marks = D.gsc.monthly
    .map((m, i) => {
      const [x, y] = pts[i]
      const key = m.share === minShare || m.share === maxShare || i === D.gsc.monthly.length - 1
      return `<circle cx="${x}" cy="${y}" r="${key ? 4.5 : 2.5}" fill="${key ? accent : navy}"/>${key ? `<text x="${x}" y="${y - 10}" text-anchor="middle" class="lab">${pct1(m.share)}%</text>` : ''}`
    })
    .join('')
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Peso de Perú en los clics del blog, mes a mes"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity=".22"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#sg)"/><path d="${line}" fill="none" stroke="${navy}" stroke-width="2.2" stroke-linejoin="round"/>${marks}${months}</svg>`
}
function aiChart() {
  const rows = D.ga4.ai.monthlyPeru
  const w = 400, h = 190, l = 8, r = 8, t = 24, b = 26
  const max = Math.max(...rows.map(m => m.sessions)) * 1.08
  const bw = (w - l - r) / rows.length
  const bars = rows
    .map((m, i) => {
      const hot = m.month >= '2026-07'
      const bh = ((h - t - b) * m.sessions) / max
      const x = l + i * bw + 3
      return `<rect x="${x}" y="${h - b - bh}" width="${bw - 6}" height="${bh}" rx="3" fill="${hot ? accent : navy}" fill-opacity="${hot ? 1 : 0.85}"/><text x="${x + (bw - 6) / 2}" y="${h - b - bh - 5}" text-anchor="middle" class="lab sm">${m.sessions}</text><text x="${x + (bw - 6) / 2}" y="${h - 8}" text-anchor="middle" class="ax">${monthLabel(m.month)}</text>`
    })
    .join('')
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Visitas desde asistentes de IA desde Perú, mes a mes">${bars}</svg>`
}

// ── Composición ───────────────────────────────────────────────────────────────────────────────────────────────
const PAGES = 4
const CLOSE_LOGO = 150
// El eslogan es un elemento gráfico: 64% del ancho del logo, cuerpo derivado del ancho en em de la palabra.
const sloganFont = +((gl.motion.layout.sloganOfLogo * CLOSE_LOGO) / gl.slogan.widthEmByWord.Engine).toFixed(2)
const footer = n =>
  `<footer class="page-footer"><div class="brand-divider">${divider.svg ?? divider}</div><div class="footer-body"><div class="footer-contact"><span>${esc(contact.address)}</span><span>${esc(contact.chilePhone)}</span></div><img class="url-bubble" src="${bubble}" alt="efeoncepro.com"><span class="folio">${String(n).padStart(2, '0')} / ${String(PAGES).padStart(2, '0')}</span></div></footer>`
const header = section =>
  `<header class="page-header"><img src="${logo}" alt="Efeonce"><div><b>Pibank Perú · Experiencia en el mercado peruano</b><span>${esc(section)} · 21 de octubre de 2026</span></div></header>`

const page1 = `<article class="page cover" id="p1">
<header class="cover-head"><img class="efeonce" src="${logo}" alt="Efeonce"><img class="client" src="${pibank}" alt="Pibank"></header>
<p class="overline">Complemento a la respuesta del 19-10 · Punto 4 · Experiencia en el mercado peruano</p>
<p class="question">¿Dónde trabajamos hoy la búsqueda en Perú?</p>
<h1>${answerHtml('En SKY Airline', accent)}</h1>
<p class="deck">Desde 2025 hacemos el SEO del Blog de SKY, con lectores en todos los mercados de la aerolínea. Hicimos de Perú su segundo mercado, con datos, contenido y medición propios.</p>
<div class="cover-layer">${ring.svg}</div>
<div class="ring-value" style="left:${RING.cx - RING.r}px;top:${RING.cy - RING.r}px;width:${2 * RING.r}px;height:${2 * RING.r}px"><strong>${pct1(share)}<small>%</small></strong></div>
<section class="hero">
  <p class="hero-lead">de los clics que Google le da al Blog de SKY <b>llegan desde Perú</b>.</p>
  <p>Uno de cada cuatro. Le sigue a Chile y supera al resto de los mercados juntos.</p>
  <p class="src">${esc(measureSource)}.</p>
</section>
<section class="kpis">
  <div><strong>${thousands(D.gsc.peru.clicks)}<small> mil</small></strong><span>clics desde Google Perú en 12 meses</span></div>
  <div><strong>${millions(D.gsc.peru.impressions)}<small> M</small></strong><span>apariciones en resultados de Google Perú</span></div>
  <div><strong>${thousands(D.ga4.peruSessions)}<small> mil</small></strong><span>visitas peruanas al blog en 12 meses</span></div>
  <div class="hot"><strong>×${D.ga4.ai.multiple.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</strong><span>visitas desde asistentes de IA desde Perú, jul–sep vs. ene–jun</span></div>
</section>
<section class="client-card">
  <img src="${sky}" alt="SKY Airline">
  <p><b>SKY Airline es cliente de Efeonce desde 2025</b>, y desde ese año nuestro equipo hace el SEO de su blog. Por esos resultados, en septiembre de 2026 nos adjudicó por licitación el SEO y el AEO del blog por dos años más: auditoría, SEO técnico, contenido y medición por mercado.</p>
</section>
${footer(1)}</article>`

const page2 = `<article class="page" id="p2">${header('Perú en números')}
<div class="page-content">
<p class="overline">01 · Google Perú y Google Analytics del blog</p>
<h2>Hicimos crecer el peso de Perú en el blog</h2>
<p class="intro">Con nuestra gestión, su parte de los clics pasó de ${pct1(minShare)}% en enero a ${pct1(lastShare)}% en septiembre, con un máximo de ${pct1(maxShare)}% en julio. Lo logramos leyéndolo por separado cada mes: el viajero peruano busca, compara y decide distinto que el chileno.</p>
<figure class="panel">${shareChart()}<figcaption>Clics desde Perú sobre el total del blog, por mes. Google Search Console, datos finales, octubre 2025 a septiembre 2026.</figcaption></figure>
<div class="two">
  <section>
    <h3>Multiplicamos las visitas desde la IA</h3>
    <p class="sub">Visitas al blog desde Perú que vienen de ChatGPT, Gemini, Perplexity, Copilot o Claude.</p>
    <figure class="panel tight">${aiChart()}</figure>
    <p class="caption">GA4, host blog.skyairline.com, país Perú, sesiones por fuente de asistente de IA. En azul, julio a septiembre de 2026.</p>
  </section>
  <section class="facts">
    <div><strong>×${D.ga4.ai.multiple.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</strong><span>Promedio mensual de julio a septiembre (${Math.round(D.ga4.ai.avgJulSep)}) frente a enero–junio (${Math.round(D.ga4.ai.avgJanJun)}).</span></div>
    <div><strong>${pct0(D.ga4.ai.chatgptShare)}%</strong><span>de esas visitas llega desde ChatGPT.</span></div>
    <div><strong>${pct0(D.ga4.ai.peruShareOfBlogAi)}%</strong><span>de todas las visitas del blog desde IA son peruanas: Perú es el 2.º país, después de Chile.</span></div>
  </section>
</div>
<section class="strip">
  <div><strong>${pct0(D.ga4.organicShare)}%</strong><span>de las visitas peruanas llega por búsqueda orgánica</span></div>
  <div><strong>${pct0(D.ga4.engagedRate)}%</strong><span>de esas visitas interactúa con el contenido</span></div>
  <div><strong>${duration}</strong><span>de duración promedio por visita</span></div>
  <div class="wide"><strong>En regiones</strong><span>${esc(D.ga4.cities.slice(0, 7).join(', '))} y otras ciudades</span></div>
</section>
</div>${footer(2)}</article>`

const card = (k, title, p) =>
  `<figure class="banner"><img src="${banners[k]}" alt=""><figcaption><b>${esc(title)}</b><span>${nf.format(p.impressions)} impresiones en Google Perú</span></figcaption></figure>`

const page3 = `<article class="page" id="p3">${header('El blog ya habla de Perú')}
<div class="page-content">
<p class="overline">02 · Contenido para el viajero peruano</p>
<h2>Contenido peruano que posicionamos en Google</h2>
<p class="intro">Guías de destinos, rutas nacionales y cocina peruana que nuestro equipo trabaja para el viajero peruano. Cada pieza se mide en Google Perú y se prioriza por su intención y su potencial.</p>
<div class="screens">
  <figure class="browser"><div class="bar"><i></i><i></i><i></i><span>blog.skyairline.com/sky-lanza-nueva-ruta-en-peru-lima-talara</span></div><img src="${shots.talara}" alt="Artículo «SKY lanza nueva ruta en Perú: Lima-Talara» en el Blog de SKY"></figure>
  <figure class="phone"><img src="${shots.lima}" alt="Artículo «11 platos típicos de Lima» en el Blog de SKY, en móvil"></figure>
  <div class="screen-notes">
    <p><b>Lima–Talara</b><span>${nf.format(P['lima-talara'].clicks)} clics y ${nf.format(P['lima-talara'].impressions)} impresiones desde Perú.</span></p>
    <p><b>Platos típicos de Lima</b><span>${nf.format(P['platos-lima'].impressions)} impresiones; entre los tres primeros resultados de Google Perú para «platos típicos de Lima».</span></p>
  </div>
</div>
<div class="banners">
  ${card('punta-sal', 'Punta Sal, Perú', P['punta-sal'])}
  ${card('canon-shucto', 'Cañón de Shucto', P['canon-shucto'])}
  ${card('tarapoto', 'Cuándo viajar a Tarapoto', P.tarapoto)}
  ${card('trujillo', 'Guía de Trujillo', P.trujillo)}
</div>
<aside class="insight"><b>Trujillo, nuestro piloto de turismo doméstico</b><p>La guía de Trujillo ya suma ${nf.format(P.trujillo.impressions)} apariciones en Google Perú. Es la pieza que elegimos para abrir el plan editorial peruano: convertir esa visibilidad en visitas y luego llevar el modelo a más destinos del país.</p></aside>
<p class="caption">Google Search Console, país Perú, por página, octubre 2025 a septiembre 2026. Posición media. «Platos típicos de Lima»: agosto–septiembre de 2026. Imágenes y capturas: blog.skyairline.com, 21-10-2026.</p>
</div>${footer(3)}</article>`

const work = [
  ['Medimos Perú por separado', 'Search Console y GA4 del blog conectados y leídos por país, página, consulta y ciudad. Perú tiene su propia lectura, no un promedio con Chile.'],
  ['Vemos lo que muestra Google Perú', 'Seguimos las búsquedas de viaje en Google Perú y estimamos su valor publicitario en el mercado peruano, con fecha y método.'],
  ['Escribimos para el viajero peruano', 'El plan editorial incluye un piloto de turismo doméstico (Trujillo), sobre destinos que el blog ya trabaja, como Piura, Punta Sal o Huacachina.'],
  ['Medimos la IA mercado por mercado', 'Cada mes revisamos cómo responden los motores de IA sobre SKY en siete mercados, Perú entre ellos, con su propio set de preguntas y competidores.']
]
const page4 = `<article class="page" id="p4">${header('Qué hacemos y qué significa para Pibank')}
<div class="page-content">
<p class="overline">03 · Método en Perú</p>
<h2>Lo que ya hacemos para SKY en Perú</h2>
<ol class="work">${work.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol>
<section class="bridge">
  <p class="bq">¿Y para Pibank?</p>
  <p class="ba">El mismo método, <b>en ahorro</b>.</p>
  <div class="bcols">
    <p><b>Datos propios por país.</b> Search Console y GA4 de pibank.pe leídos por consulta, página y ciudad, como hoy con SKY.</p>
    <p><b>Google Perú y su IA como vara.</b> El ahorrista peruano ya pregunta a ChatGPT y al Modo IA de Google; medimos qué responden y a quién citan.</p>
    <p><b>Contenido con intención local.</b> TREA, seguro de depósitos y comparativas al mismo saldo, con aprobación de Cumplimiento, como hicimos con BICE en Chile.</p>
  </div>
</section>
<div class="brand-close"><img src="${logo}" alt="Efeonce"><p class="slogan" style="font-size:${sloganFont}px;margin-top:${(gl.motion.layout.sloganGapOfFont * sloganFont).toFixed(1)}px"><span>${esc(gl.slogan.lead)}</span> <b>Engine</b></p></div>
<p class="method">Fuentes: Google Search Console del Blog de SKY Airline (propiedad blog.skyairline.com, datos finales, agregación por fecha, octubre 2025 a septiembre 2026); Google Analytics 4 de SKY (host blog.skyairline.com, mismas fechas; IA: ChatGPT, Gemini, Perplexity, Copilot y Claude como fuente de sesión). Lectura del 21-10-2026 con el acceso que SKY nos dio. Las cifras corresponden a la gestión del Blog de SKY por nuestro equipo en ese período.</p>
</div>${footer(4)}</article>`

const css = `${fonts}
:root{--ink:${ink};--paper:${axisSurface.light.paper};--soft:${gl.color.paper};--navy:${navy};--accent:${accent};--muted:color-mix(in srgb,var(--ink) 74%,var(--paper));--line:color-mix(in srgb,var(--ink) 14%,var(--paper));--text:"${gl.type.text.family}";--display:"${gl.type.answer.family}";--radius:${axisGeometry.radius.display}}
*{box-sizing:border-box}html{background:color-mix(in srgb,var(--ink) 7%,var(--paper))}body{margin:0;color:var(--ink);font-family:var(--text);font-size:9.6pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,p,ol,figure{margin:0}ol{padding:0;list-style:none}b,strong{font-weight:600}
@page{size:A4;margin:0}
.page{position:relative;width:210mm;height:297mm;margin:24px auto;padding:32mm 18mm 30mm;background:var(--paper);overflow:hidden;break-after:page;box-shadow:0 8px 30px color-mix(in srgb,var(--ink) 10%,transparent)}.page:last-child{break-after:auto}
@media print{html{background:none}.page{margin:0;box-shadow:none}}
.overline{font-size:7.4pt;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.page-header{position:absolute;top:13mm;left:18mm;right:18mm;display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--line)}.page-header img{width:104px}.page-header div{text-align:right;font-size:7.4pt;line-height:1.7;color:var(--muted)}.page-header b{display:block;color:var(--ink)}
.page-footer{position:absolute;bottom:11mm;left:18mm;right:18mm;font-size:6.8pt;line-height:1.6}.brand-divider svg{width:100%;height:6px;display:block}.footer-body{display:grid;grid-template-columns:1fr auto 42px;align-items:center;gap:18px;margin-top:9px}.footer-contact span{display:block;color:var(--muted)}.url-bubble{width:100px;display:block}.folio{text-align:right;color:var(--muted);font-size:8pt;font-variant-numeric:tabular-nums}
/* Portada */
.cover{padding-top:15mm}.cover>*:not(.cover-layer):not(.ring-value):not(.page-footer){position:relative}
.cover-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px}.cover-head .efeonce{width:140px}.cover-head .client{width:120px}
.question{font-weight:300;font-size:18pt;line-height:1.25;margin-top:14px;letter-spacing:-.01em}
.cover h1{font-family:var(--display);font-weight:${gl.type.answer.weight};letter-spacing:${gl.type.answer.tracking};font-size:52pt;line-height:1;margin:6px 0 14px}
.deck{font-size:11.5pt;line-height:1.5;max-width:610px;color:var(--muted)}
.cover-layer{position:absolute;inset:0;pointer-events:none}.cover-layer svg{width:100%;height:100%;display:block}
.ring-value{position:absolute;display:flex;align-items:center;justify-content:center}.ring-value strong{font-family:var(--display);font-weight:${gl.type.answer.weight};letter-spacing:-.04em;font-size:50pt;line-height:1;font-variant-numeric:tabular-nums}.ring-value small{font-size:.5em;margin-left:2px}
.hero{position:absolute!important;left:350px;top:398px;width:376px}.hero .hero-lead{font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:20pt;line-height:1.2;letter-spacing:-.02em;margin-bottom:10px}.hero-lead b{color:var(--accent);font-weight:inherit}.hero p{font-size:9.8pt;line-height:1.55}.hero .src{font-size:7.2pt;color:var(--muted);margin-top:9px}
.kpis{position:absolute!important;left:68px;right:68px;top:668px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.kpis div{padding:13px 14px 14px;background:var(--soft);border-radius:var(--radius)}.kpis strong{display:block;font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:28pt;line-height:1.05;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.kpis small{font-size:.5em;letter-spacing:0}.kpis span{display:block;font-size:7.8pt;line-height:1.4;margin-top:6px;color:var(--muted)}.kpis .hot strong{color:var(--accent)}
.client-card{position:absolute!important;left:68px;right:68px;top:830px;display:grid;grid-template-columns:110px 1fr;gap:22px;align-items:center;padding:18px 22px;border-radius:var(--radius);background:var(--navy);color:var(--paper)}.client-card img{width:110px;display:block}.client-card p{font-size:9.4pt;line-height:1.55}
/* Interiores */
.page h2{font-family:var(--display);font-weight:${gl.type.answer.weight};letter-spacing:${gl.type.answer.tracking};font-size:25pt;line-height:1.08;margin:6px 0 9px}
.intro{font-size:10pt;line-height:1.55;color:var(--muted);margin-bottom:14px}
.panel{background:var(--soft);border-radius:var(--radius);padding:12px 14px 10px}.panel.tight{padding:10px 8px 4px}.chart{width:100%;display:block}.chart .ax{font:500 8px var(--text);fill:var(--muted)}.chart .lab{font:600 10px var(--display);fill:var(--ink)}.chart .lab.sm{font-size:9px}
figcaption,.caption{font-size:7.1pt;line-height:1.45;color:var(--muted);margin-top:7px}
.two{display:grid;grid-template-columns:1.25fr 1fr;gap:22px;margin-top:18px}.two h3{font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:13pt;line-height:1.25}.sub{font-size:8.2pt;color:var(--muted);margin:2px 0 8px}
.facts{display:flex;flex-direction:column;gap:12px;justify-content:center}.facts div{border-left:3px solid var(--accent);padding-left:12px}.facts strong{display:block;font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:24pt;line-height:1.05;letter-spacing:-.02em;color:var(--ink)}.facts span{display:block;font-size:8.2pt;line-height:1.45;color:var(--muted)}
.strip{display:grid;grid-template-columns:1fr 1fr 1fr 1.5fr;gap:12px;margin-top:18px;padding:14px 16px;border-radius:var(--radius);background:var(--navy);color:var(--paper)}.strip strong{display:block;font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:17pt;line-height:1.1}.strip span{display:block;font-size:7.6pt;line-height:1.4;opacity:.85;margin-top:3px}
.screens{position:relative;height:300px;margin-bottom:14px}.browser{position:absolute;left:0;top:0;width:470px;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 10px 28px color-mix(in srgb,var(--ink) 18%,transparent);border:1px solid var(--line)}.browser .bar{display:flex;align-items:center;gap:5px;height:22px;padding:0 10px;background:var(--soft);border-bottom:1px solid var(--line)}.browser .bar i{width:7px;height:7px;border-radius:50%;background:color-mix(in srgb,var(--ink) 22%,var(--paper))}.browser .bar span{margin-left:10px;font-size:6.6pt;color:var(--muted);white-space:nowrap;overflow:hidden}.browser img{display:block;width:100%;height:262px;object-fit:cover;object-position:top}
.phone{position:absolute;left:392px;top:28px;width:150px;padding:7px;border-radius:24px;background:var(--navy);box-shadow:0 12px 30px color-mix(in srgb,var(--ink) 25%,transparent)}.phone img{display:block;width:100%;height:262px;object-fit:cover;object-position:top;border-radius:18px}
.screen-notes{position:absolute;left:562px;top:36px;width:96px;display:flex;flex-direction:column;gap:14px}.screen-notes p{font-size:7.4pt;line-height:1.4}.screen-notes b{display:block;font-size:8.4pt;color:var(--ink)}.screen-notes span{color:var(--muted)}
.banners{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.banner{border-radius:var(--radius);overflow:hidden;background:var(--soft)}.banner img{display:block;width:100%;height:92px;object-fit:cover;object-position:center 40%}.banner figcaption{margin:0;padding:8px 9px 9px}.banner b{display:block;font-size:8.4pt;color:var(--ink);line-height:1.3}.banner span{display:block;font-size:6.9pt;line-height:1.4;color:var(--muted);margin-top:2px}
.insight{margin-top:12px;padding:12px 15px;border-radius:var(--radius);background:var(--navy);color:var(--paper)}.insight b{display:block;font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:11.5pt;margin-bottom:4px}.insight p{font-size:8.6pt;line-height:1.55}
.work{display:grid;grid-template-columns:1fr 1fr;gap:16px 26px;counter-reset:w;margin-top:8px}.work li{counter-increment:w;position:relative;padding-left:40px}.work li::before{content:counter(w);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:var(--soft);font-family:var(--display);font-weight:600;font-size:12pt;display:flex;align-items:center;justify-content:center}.work b{display:block;font-size:10pt;margin-bottom:2px}.work span{display:block;font-size:8.6pt;line-height:1.5;color:var(--muted)}
.bridge{margin-top:30px;padding:26px 28px;border-radius:var(--radius);background:var(--navy);color:var(--paper)}.bq{font-weight:300;font-size:16pt;line-height:1.25;opacity:.9}.ba{font-family:var(--display);font-weight:${gl.type.answer.weight};letter-spacing:${gl.type.answer.tracking};font-size:34pt;line-height:1.05;margin:4px 0 18px}.ba b{color:${engine.accentOnDark ?? accent};font-weight:inherit}.bcols{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.bcols p{font-size:8.6pt;line-height:1.55;opacity:.92}.bcols b{display:block;font-size:9.4pt;margin-bottom:3px;opacity:1}
.brand-close{display:flex;flex-direction:column;align-items:center;margin-top:34px}.brand-close img{width:${CLOSE_LOGO}px;display:block}.slogan{white-space:nowrap;line-height:1;font-family:var(--text);color:${gl.slogan.leadColor.onLight}}.slogan b{color:var(--accent);font-weight:inherit}
.method{font-size:6.9pt;line-height:1.5;color:var(--muted);margin-top:22px;padding-top:9px;border-top:1px solid var(--line)}
`
const html = `<!doctype html><html lang="es-PE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pibank · Experiencia en el mercado peruano · Efeonce</title><style>${css}</style></head><body><main>${page1}${page2}${page3}${page4}</main></body></html>`

await fs.mkdir(output, { recursive: true })
const base = 'Pibank-Complemento-experiencia-Peru-2026-10-21'
const htmlPath = path.join(output, `${base}.html`),
  pdfPath = path.join(output, `${base}.pdf`)
await fs.writeFile(htmlPath, html)
const browser = await chromium.launch()
let qa
try {
  const pg = await browser.newPage({ viewport: { width: 1000, height: 1300 } })
  const errors = []
  pg.on('pageerror', e => errors.push(e.message))
  await pg.setContent(html, { waitUntil: 'load' })
  await pg.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(i => i.decode()))
  })
  await pg.emulateMedia({ media: 'print' })
  qa = await pg.evaluate(() => {
    const r = e => e.getBoundingClientRect()
    return {
      pages: [...document.querySelectorAll('.page')].map((p, i) => {
        const footer = r(p.querySelector('.page-footer'))
        const kids = [...p.querySelectorAll('.page-content > *, .cover > section, .cover > p, .cover > h1')]
        const bottom = Math.max(...kids.map(c => r(c).bottom))
        return { page: i + 1, gap: Math.round(footer.top - bottom), overflow: bottom > footer.top - 8 }
      }),
      coverCollisions: (() => {
        const p = document.querySelector('#p1')
        const order = ['.deck', '.ring-value', '.kpis', '.client-card'].map(s => r(p.querySelector(s)))
        const hero = r(p.querySelector('.hero'))
        const out = []
        for (let i = 0; i < order.length - 1; i++) if (order[i].bottom > order[i + 1].top - 6) out.push(i)
        if (hero.bottom > order[2].top - 6) out.push('hero')
        return out
      })(),
      brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).length,
      fonts: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))],
      textOverflow: [...document.querySelectorAll('li,p,h1,h2,h3,strong,figcaption b')]
        .filter(e => e.scrollWidth > e.clientWidth + 2)
        .map(e => e.textContent.slice(0, 60))
    }
  })
  qa.errors = errors
  for (let i = 1; i <= PAGES; i++) await pg.locator(`#p${i}`).screenshot({ path: path.join(output, `qa-p${i}.png`) })
  if (errors.length || qa.brokenImages || qa.pages.some(p => p.overflow) || qa.coverCollisions.length || qa.textOverflow.length) {
    await fs.writeFile(path.join(output, 'layout-check.json'), JSON.stringify(qa, null, 2))
    throw Error('QA de layout falló: ' + JSON.stringify(qa))
  }
  await pg.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true })
} finally {
  await browser.close()
}
const manifest = {
  document: base,
  createdAt: new Date().toISOString(),
  status: 'draft_for_review',
  line: 'engine',
  measureRenderer: { package: '@efeoncepro/axis-graphic-line', version: axisGraphicLineVersion, from: 'axis-design-system main, checkout local' },
  data: { file: 'data.json', sha256: sha(dataBuf), share, measure: { value: share, label: ring.trajectory.valueLabel, source: measureSource } },
  hardcodedFacts: [
    'SKY cliente desde 2025 (Agencia Creativa, ago-2025) y Blog SEO/AEO adjudicado el 23-09-2026: deal HubSpot 62535094842; operación completa desde 01-11-2026',
    'Grader AEO de SKY en siete mercados con regrade mensual, Perú incluido: docs/tasks/to-do/TASK-1961-efeonce-insights-aeo-per-market.md',
    'Piloto Trujillo en el primer lote: docs/services/sky-blog-seo/PLAN_RECUPERACION_PRIMER_LOTE_2026-10-15.md',
    'BICE como antecedente de banca: ya declarado a Jesús el 19-10 (outreach/2026-10-19-respuesta-precisiones-jesus.md)'
  ],
  assets,
  qa,
  outputs: await Promise.all([htmlPath, pdfPath].map(async f => ({ file: path.basename(f), sha256: sha(await fs.readFile(f)) }))),
  authority: { sent: false, skyDataShare: 'pedido por Julio el 21-10 (clics, impresiones, crecimiento, visitas desde IA)' }
}
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ output: path.relative(repo, output), qa }, null, 2))
