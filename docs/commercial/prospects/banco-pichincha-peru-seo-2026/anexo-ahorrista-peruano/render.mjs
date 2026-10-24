// Anexo «Cómo busca y decide el ahorrista peruano» para Pibank (19-10-2026).
// Renderer documental local: lee la investigación ya capturada (sin gasto nuevo de proveedor), compone A4 con la
// línea gráfica Efeonce (línea Engine) desde tokens y assets oficiales y emite HTML + PDF + manifiesto.
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
const output = path.resolve(dir, process.argv[2] ?? 'v1')
if ((await fs.readdir(output).catch(() => [])).length) throw Error('Salida ocupada; use una versión nueva.')

const sha = b => createHash('sha256').update(b).digest('hex')
const esc = v =>
  String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const nf = new Intl.NumberFormat('es-CL')
const pct = (n, d) => Math.round((100 * n) / d)
const sources = []
async function read(rel) {
  const file = path.join(prospect, rel)
  const b = await fs.readFile(file)
  sources.push({ file: path.relative(repo, file), sha256: sha(b) })
  return b.toString('utf8')
}

// ── Datos: demanda (33 familias, Google Perú, DataForSEO Labs) ────────────────────────────────────────────────
const csv = (await read('reconstruccion-2027/demanda-audiencia-2026-10-08/panel.csv')).trim().split('\n')
const head = csv.shift().split(',')
const panel = csv.map(l => Object.fromEntries(l.split(',').map((v, i) => [head[i], v])))
if (panel.length !== 33) throw Error('Panel de 33 familias esperado')
const total = panel.reduce((s, r) => s + Number(r.monthly), 0)
if (total !== 66030) throw Error(`Total de demanda inesperado: ${total}`)
const bucketOf = g =>
  ({ competitor: 'rival', competidor: 'rival', direct: 'own', conditional: 'own', alternativa: 'alt' })[g] ?? 'learn'
const buckets = { rival: 0, learn: 0, own: 0, alt: 0 }
for (const r of panel) buckets[bucketOf(r.group)] += Number(r.monthly)
const top = [...panel].sort((a, b) => b.monthly - a.monthly).slice(0, 10)
const label = q =>
  ({
    'cuenta simple interbank': 'Cuenta Simple Interbank',
    'cuenta de ahorro del bcp': 'Cuenta de ahorro BCP',
    'cuenta digital bbva': 'Cuenta digital BBVA',
    'depósito a plazo fijo': 'Depósito a plazo fijo',
    'cuenta millonaria interbank': 'Cuenta Millonaria Interbank',
    'cuenta independencia bbva': 'Cuenta Independencia BBVA',
    'cuenta de ahorros': 'Cuenta de ahorros',
    trea: 'TREA',
    'cuenta ganadora bbva': 'Cuenta Ganadora BBVA',
    'cuenta super tasa interbank': 'Cuenta Súper Tasa Interbank'
  })[q] ?? q

// ── Datos: fuentes que cita Google AI Mode (3 consultas de ahorro, 28-09-2026) ────────────────────────────────
const aiMode = JSON.parse(await read('research/pichincha-ai-mode-results.json')).filter(t =>
  /ahorro|plazo fijo/i.test(t.keyword)
)
if (aiMode.length !== 3) throw Error('Se esperaban tres consultas de ahorro en AI Mode')
const kind = {
  'www.pichincha.pe': 'bank',
  'Banco Ripley Perú': 'bank',
  'comparabanca.com': 'compare',
  'comparabancaperu.com': 'compare',
  Prestamype: 'compare',
  'América TV': 'media',
  'Agencia Andina': 'media',
  YouTube: 'social',
  Facebook: 'social',
  Instagram: 'social',
  'Portal SBS': 'regulator'
}
const cited = { bank: 0, compare: 0, media: 0, social: 0, regulator: 0 }
let pichinchaCites = 0,
  pibankCites = 0
for (const t of aiMode) {
  const seen = new Set()
  for (const r of t.references) {
    const key = `${r.source}|${r.title}`
    if (seen.has(key)) continue
    seen.add(key)
    if (!kind[r.source]) throw Error(`Fuente sin clasificar: ${r.source}`)
    cited[kind[r.source]]++
    if (r.source === 'www.pichincha.pe') pichinchaCites++
    if (/pibank/i.test(`${r.source} ${r.title}`)) pibankCites++
  }
}
const citedTotal = Object.values(cited).reduce((a, b) => a + b, 0)
const notBank = citedTotal - cited.bank
const notBankValue = notBank / citedTotal

// ── Marca: tokens, fuentes tipográficas, logos ────────────────────────────────────────────────────────────────
const assets = []
async function embed(file, mime, source) {
  const b = await fs.readFile(file)
  assets.push({ file: path.relative(repo, file), source, sha256: sha(b) })
  return `data:${mime};base64,${b.toString('base64')}`
}
const logo = await embed(fileURLToPath(brandAssetUrl('efeonce-logo-positive')), 'image/svg+xml', 'efeonce-logo-positive')
const bubble = await embed(fileURLToPath(brandAssetUrl('url-bubble-baked-light')), 'image/svg+xml', 'url-bubble-baked-light')
const client = await embed(path.join(prospect, 'propuesta/assets/pibank-logo-inverso.svg'), 'image/svg+xml', 'Pibank, versión para fondo claro (archivo «inverso» del sitio oficial)')
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
const W = gl.orbit.baseWidthPx
// La medida exige el camino recorrido (contrato de la órbita 0.5.0, 2026-09-29). Greenhouse fija axis-graphic-line
// 0.11.0, anterior a esa regla; se usa el build de AXIS main (0.17.0) del checkout hermano y se registra en el manifiesto.
const axisGraphicLinePath = path.resolve(repo, '../axis-design-system/packages/graphic-line/dist/index.js')
const { measureSvg } = await import(axisGraphicLinePath)
const axisGraphicLineVersion = JSON.parse(
  await fs.readFile(path.resolve(axisGraphicLinePath, '../../package.json'), 'utf8')
).version
const divider = sphereDividerSvg({ widthPx: W - 136, line: 'engine', surface: 'light' })
const measureSource = `Google AI Mode vía DataForSEO · Perú · 3 consultas de ahorro · 28-09-2026 · ${citedTotal} fuentes únicas`
// La medida se dibuja a escala de página (794 × 1123 px, la base de la órbita) para conservar el trazo canónico.
const RING = { cx: 68 + 150, cy: 470 + 150, r: 150 }
const ring = measureSvg({
  width: W,
  height: Math.round((W * 297) / 210),
  value: notBankValue,
  source: measureSource,
  circle: RING,
  line: 'engine',
  surface: 'light',
  channel: 'print',
  idPrefix: 'pibank-annex'
})

// ── Composición ───────────────────────────────────────────────────────────────────────────────────────────────
const PAGES = 3
const footer = n =>
  `<footer class="page-footer"><div class="brand-divider">${divider.svg ?? divider}</div><div class="footer-body"><div class="footer-contact"><span>${esc(contact.address)}</span><span>${esc(contact.chilePhone)}</span></div><img class="url-bubble" src="${bubble}" alt="efeoncepro.com"><span class="folio">${String(n).padStart(2, '0')} / ${String(PAGES).padStart(2, '0')}</span></div></footer>`
const header = section =>
  `<header class="page-header"><img src="${logo}" alt="Efeonce"><div><b>Pibank Perú · Anexo de la propuesta SEO, GEO y AEO 2027</b><span>${esc(section)} · 19 de octubre de 2026</span></div></header>`
const bar = (value, max, cls = '') =>
  `<span class="bar ${cls}"><i style="width:${((100 * value) / max).toFixed(2)}%"></i></span>`

const split = [
  ['rival', 'Productos de otros bancos, por su nombre'],
  ['learn', 'Entender antes de decidir: TREA, seguro de depósitos, ahorro familiar'],
  ['own', 'Ahorro, intereses y apertura de cuenta'],
  ['alt', 'Depósito a plazo fijo como alternativa']
]
const mix = [
  ['social', 'Video y redes', 'YouTube, Facebook, Instagram'],
  ['compare', 'Comparadores y fintech', 'comparabanca, comparabancaperu, Prestamype'],
  ['bank', 'Bancos', `Banco Pichincha (${pichinchaCites}), Banco Ripley (${cited.bank - pichinchaCites})`],
  ['media', 'Medios', 'América TV, Agencia Andina'],
  ['regulator', 'Regulador', 'SBS · Compara y Elige']
]

const page1 = `<article class="page cover" id="p1">
<header class="cover-head"><img class="efeonce" src="${logo}" alt="Efeonce"><img class="client" src="${client}" alt="Pibank"></header>
<p class="overline">Anexo · Propuesta SEO, GEO y AEO 2027 · Pibank Perú</p>
<p class="question">¿Cómo busca y decide el ahorrista peruano?</p>
<h1>${answerHtml('Compara antes de abrir', accent)}</h1>
<p class="deck">Lo que muestran hoy Google Perú y su inteligencia artificial cuando alguien decide dónde poner su ahorro, y lo que eso significa para Pibank.</p>
<div class="cover-layer">${ring.svg}</div>
<div class="ring-value" style="left:${RING.cx - RING.r}px;top:${RING.cy - RING.r}px;width:${2 * RING.r}px;height:${2 * RING.r}px"><strong>${pct(notBank, citedTotal)}<small>%</small></strong></div>
<section class="hero">
  <div class="hero-copy">
    <p class="hero-lead">de las fuentes que cita la IA de Google al responder dónde ahorrar en Perú <b>no son bancos</b>.</p>
    <p>Son videos, redes, comparadores y medios. De ${citedTotal} fuentes, sólo ${cited.bank} son sitios de bancos: ${pichinchaCites} de Banco Pichincha y ninguna de Pibank.</p>
    <p class="src">${esc(measureSource)}.</p>
  </div>
</section>
<section class="kpis">
  <div><strong>${nf.format(total)}</strong><span>búsquedas al mes en 33 decisiones de ahorro en Google Perú</span></div>
  <div><strong>${pct(buckets.rival, total)}<small>%</small></strong><span>nombran un producto de otro banco: BCP, Interbank, BBVA, Scotiabank</span></div>
  <div><strong>0<small> de 3</small></strong><span>búsquedas genéricas con pibank.pe entre los 20 primeros, al 06-10-2026</span></div>
</section>
<p class="cover-note">Preparado por el equipo de Efeonce con datos de búsqueda y de IA en Perú. Las cifras de búsqueda son estimaciones mensuales del proveedor, no personas ni tráfico; las observaciones de resultados y de IA tienen fecha y muestra declaradas en cada página.</p>
${footer(1)}</article>`

const maxTop = Number(top[0].monthly)
const page2 = `<article class="page" id="p2">${header('Qué busca y con quién compite')}
<div class="page-content">
<p class="overline">01 · Demanda en Google Perú</p>
<h2>Dos de cada tres búsquedas del panel nombran un producto de la competencia</h2>
<p class="intro">El ahorrista no busca «una cuenta»: busca la de su banco y la compara. Por eso Pibank compite en las búsquedas de otros bancos, y gana cuando explica sus condiciones frente a cada producto, al mismo saldo.</p>
<div class="stack">${split.map(([k]) => `<i class="s-${k}" style="width:${((100 * buckets[k]) / total).toFixed(2)}%"></i>`).join('')}</div>
<div class="stack-legend">${split
  .map(
    ([k, t]) =>
      `<div class="s-${k}"><b>${pct(buckets[k], total)}%</b><span>${esc(t)}</span><em>${nf.format(buckets[k])}/mes</em></div>`
  )
  .join('')}</div>
<div class="two">
  <section>
    <h3>Las 10 búsquedas con más volumen</h3>
    <ol class="ranking">${top
      .map(
        r =>
          `<li class="${['competitor', 'competidor'].includes(r.group) ? 'is-rival' : ''}"><span>${esc(label(r.query))}</span>${bar(Number(r.monthly), maxTop)}<b>${nf.format(Number(r.monthly))}</b></li>`
      )
      .join('')}</ol>
    <p class="caption">Búsquedas mensuales estimadas, Google Perú, español. Barra azul: producto de otro banco.</p>
  </section>
  <section>
    <h3>Lo que encuentra quien compara al ticket del banco</h3>
    <table class="rates"><thead><tr><th>Producto</th><th>Tasa publicada</th></tr></thead><tbody>
      <tr class="own"><td><b>Pibank · Cuenta Soles</b><span>Desde el primer sol, sin mínimo ni mantenimiento</span></td><td><b>5% TREA</b></td></tr>
      <tr><td>Interbank · Súper Tasa<span>Tramo de S/ 10.000 a S/ 29.999,99</span></td><td>0,5%</td></tr>
      <tr><td>Scotiabank · Cuenta Power<span>Tasa anunciada como máximo</span></td><td>hasta 4,6% TREA</td></tr>
      <tr><td>Efectibank · Ahorro digital<span>Sin mínimo ni mantenimiento</span></td><td>4,5% TREA</td></tr>
    </tbody></table>
    <p class="caption">Ticket de referencia de la meta: US$ 2.500 ≈ S/ 10.000. Tasas publicadas en los sitios oficiales, consultadas el 06-10-2026; cambian y se revalidan antes de cualquier publicación.</p>
    <aside class="insight"><b>La oportunidad</b><p>Una comparativa honesta por producto —Súper Tasa, Simple, Millonaria, Power, Independencia— responde la pregunta exacta que ya se está haciendo el ahorrista, con condiciones al mismo saldo y aprobación de Cumplimiento.</p></aside>
  </section>
</div>
</div>${footer(2)}</article>`

const page3 = `<article class="page" id="p3">${header('Qué responde la IA y qué hace Pibank')}
<div class="page-content">
<p class="overline">02 · Respuestas de IA y resultados de Google</p>
<h2>La IA ya explica el argumento de Pibank. Todavía no cita a Pibank</h2>
<p class="intro">Al preguntar por las mejores cuentas de ahorro en Perú, la respuesta de Google enseña a mirar la TREA, recuerda que los bancos pequeños y digitales suelen pagar tasas más altas y remite al comparador de la SBS. Es la propuesta de Pibank, contada con fuentes de otros.</p>
<div class="two">
  <section>
    <h3>De dónde saca la IA sus respuestas</h3>
    <ul class="mix">${mix
      .map(
        ([k, t, d]) =>
          `<li class="${k === 'bank' ? 'is-bank' : ''}"><div><b>${esc(t)}</b><span>${esc(d)}</span></div>${bar(cited[k], citedTotal)}<em>${pct(cited[k], citedTotal)}%</em></li>`
      )
      .join('')}</ul>
    <p class="caption">${citedTotal} fuentes únicas citadas en 3 consultas: «mejor cuenta de ahorros Perú», «cuenta de ahorros alto interés Perú» y «depósito a plazo fijo Perú». Google AI Mode vía DataForSEO, 28-09-2026.</p>
    <h3 class="mt">Dónde aparece pibank.pe en Google</h3>
    <table class="serp"><tbody>
      <tr><td>pibank peru</td><td>Posición 5, una página de preguntas frecuentes</td></tr>
      <tr><td>mejor cuenta de ahorros peru</td><td>Fuera de los 20 primeros. Aparecen comparadores, Scotiabank, Mibanco, BCP, SBS, Efectibank, BanBif y Falabella</td></tr>
      <tr><td>cuenta de ahorros de alto rendimiento</td><td>Fuera de los 20 primeros</td></tr>
      <tr><td>abrir cuenta de ahorros online</td><td>Fuera de los 20 primeros</td></tr>
    </tbody></table>
    <p class="caption">Google Perú, español, móvil, 20 resultados por búsqueda, 06-10-2026.</p>
  </section>
  <section>
    <h3>Cuatro movimientos para Pibank</h3>
    <ol class="moves">
      <li><b>Ganar las comparaciones</b><span>Comparativas por producto rival y un comparador propio, con condiciones al mismo saldo y fecha visible.</span></li>
      <li><b>Ser la fuente que la IA cita</b><span>Respuestas directas y verificables sobre TREA, seguro de depósitos y ahorro separado del gasto, con datos estructurados.</span></li>
      <li><b>Estar donde la IA ya busca</b><span>PR y referencias en los medios y comparadores que hoy alimentan las respuestas: televisión, agencias de noticias y sitios de comparación.</span></li>
      <li><b>Que «Pibank Perú» lleve al producto</b><span>Hoy la marca llega primero a una página de preguntas frecuentes; el producto y la apertura deben ser la primera respuesta.</span></li>
    </ol>
    <aside class="local"><b>Lo local que cuidamos en cada contenido</b>
      <p>TREA siempre con moneda, saldo y fecha. Cobertura del Fondo de Seguro de Depósitos con su cifra vigente y su fuente. Tasas y costos según las reglas de transparencia de la SBS. Y la audiencia A/B de 35 a 55 años: 10,4% de los hogares del país y 21% de los de Lima (APEIM 2025), por lo que Lima tiene prioridad sin dejar fuera a las regiones.</p>
    </aside>
  </section>
</div>
<p class="method">Método: demanda de 33 familias de búsqueda, DataForSEO Labs, Google Perú en español (base actualizada en septiembre de 2026, último mes completo agosto); resultados de Google en móvil del 06-10-2026; respuestas de Google AI Mode del 28-09-2026; sitios oficiales de cada banco, 06-10-2026; APEIM, Niveles socioeconómicos 2025. Ninguna cifra se presenta como tráfico, personas o resultado garantizado.</p>
</div>${footer(3)}</article>`

const ink = gl.color.navy
const css = `${fonts}
:root{--ink:${ink};--paper:${axisSurface.light.paper};--soft:${gl.color.paper};--navy:${engine.darkBg};--accent:${accent};--muted:color-mix(in srgb,var(--ink) 74%,var(--paper));--line:color-mix(in srgb,var(--ink) 14%,var(--paper));--track:color-mix(in srgb,var(--ink) 8%,var(--paper));--text:"${gl.type.text.family}";--display:"${gl.type.answer.family}";--radius:${axisGeometry.radius.display}}
*{box-sizing:border-box}html{background:color-mix(in srgb,var(--ink) 7%,var(--paper))}body{margin:0;color:var(--ink);font-family:var(--text);font-size:9.6pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,p,ol,ul{margin:0}ol,ul{padding:0;list-style:none}b,strong{font-weight:600}
@page{size:A4;margin:0}
.page{position:relative;width:210mm;height:297mm;margin:24px auto;padding:34mm 18mm 30mm;background:var(--paper);overflow:hidden;break-after:page;box-shadow:0 8px 30px color-mix(in srgb,var(--ink) 10%,transparent)}.page:last-child{break-after:auto}
@media print{html{background:none}.page{margin:0;box-shadow:none}}
.overline{font-size:7.6pt;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.page-header{position:absolute;top:13mm;left:18mm;right:18mm;display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--line)}.page-header img{width:104px}.page-header div{text-align:right;font-size:7.4pt;line-height:1.7;color:var(--muted)}.page-header b{display:block;color:var(--ink)}
.page-footer{position:absolute;bottom:11mm;left:18mm;right:18mm;font-size:6.8pt;line-height:1.6}.brand-divider svg{width:100%;height:6px;display:block}.footer-body{display:grid;grid-template-columns:1fr auto 42px;align-items:center;gap:18px;margin-top:9px}.footer-contact span{display:block;color:var(--muted)}.url-bubble{width:100px;display:block}.folio{text-align:right;color:var(--muted);font-size:8pt;font-variant-numeric:tabular-nums}
/* Portada */
.cover{padding-top:15mm}.cover-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:30px}.cover-head .efeonce{width:150px}.cover-head .client{width:132px}
.question{font-family:var(--text);font-weight:300;font-size:19pt;line-height:1.25;margin-top:20px;letter-spacing:-.01em}
.cover h1{font-family:var(--display);font-weight:${gl.type.answer.weight};letter-spacing:${gl.type.answer.tracking};font-size:58pt;line-height:1;margin:8px 0 18px}
.deck{font-size:13pt;line-height:1.5;max-width:560px;color:var(--muted)}
.cover-layer{position:absolute;inset:0;pointer-events:none}.cover-layer svg{width:100%;height:100%;display:block}.cover>*:not(.cover-layer):not(.ring-value):not(.page-footer){position:relative}.hero{position:absolute!important;left:418px;top:510px;width:308px}.ring-value{position:absolute;display:flex;align-items:center;justify-content:center}.ring-value strong{font-family:var(--display);font-weight:${gl.type.answer.weight};letter-spacing:-.04em;font-size:78pt;line-height:1;color:var(--ink);font-variant-numeric:tabular-nums}.ring-value small{font-size:.5em;margin-left:2px}
.hero-lead{font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:21pt;line-height:1.2;letter-spacing:-.02em;margin-bottom:12px}.hero-lead b{color:var(--accent);font-weight:inherit}.hero-copy p{font-size:10pt;line-height:1.55}.hero-copy .src{font-size:7.4pt;color:var(--muted);margin-top:10px}
.kpis{position:absolute!important;left:68px;right:68px;top:812px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.kpis div{padding:14px 16px 16px;background:var(--soft);border-radius:var(--radius)}.kpis strong{display:block;font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:32pt;line-height:1.1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}.kpis small{font-size:.48em;letter-spacing:0}.kpis span{display:block;font-size:8.4pt;line-height:1.45;margin-top:6px;color:var(--muted)}
.cover-note{position:absolute!important;left:68px;right:68px;top:976px;font-size:7.4pt;line-height:1.55;color:var(--muted)}
/* Interiores */
.page h2{font-family:var(--display);font-weight:${gl.type.answer.weight};letter-spacing:${gl.type.answer.tracking};font-size:25pt;line-height:1.08;margin:6px 0 10px;max-width:96%}
.intro{font-size:10pt;line-height:1.55;color:var(--muted);margin-bottom:14px}
.stack{display:flex;height:30px;border-radius:999px;overflow:hidden;gap:3px}.stack i{display:block}.s-rival{background:var(--accent)}.stack .s-learn{background:var(--navy)}.stack .s-own{background:color-mix(in srgb,var(--navy) 55%,var(--paper))}.stack .s-alt{background:color-mix(in srgb,var(--navy) 25%,var(--paper))}
.stack-legend{display:grid;grid-template-columns:1.25fr 1.25fr 1fr 1fr;gap:12px;margin:10px 0 16px}.stack-legend div{border-left:3px solid;padding-left:9px;background:none}.stack-legend .s-rival{border-color:var(--accent)}.stack-legend .s-learn{border-color:var(--navy)}.stack-legend .s-own{border-color:color-mix(in srgb,var(--navy) 55%,var(--paper))}.stack-legend .s-alt{border-color:color-mix(in srgb,var(--navy) 25%,var(--paper))}.stack-legend b{display:block;font-family:var(--display);font-size:20pt;line-height:1.1;font-weight:${gl.type.answer.weight};letter-spacing:-.02em}.stack-legend span{display:block;font-size:7.8pt;line-height:1.4}.stack-legend em{display:block;font-style:normal;font-size:7.4pt;color:var(--muted);margin-top:2px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:22px}.two h3{font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:12.5pt;line-height:1.25;margin-bottom:9px}.mt{margin-top:16px}
.ranking li{display:grid;grid-template-columns:118px 1fr 42px;gap:8px;align-items:center;font-size:8.3pt;padding:4px 0}.ranking b{text-align:right;font-variant-numeric:tabular-nums}
.bar{display:block;height:9px;border-radius:999px;background:var(--track);overflow:hidden}.bar i{display:block;height:100%;border-radius:999px;background:var(--navy)}.ranking .is-rival .bar i{background:var(--accent)}
.caption{font-size:7.1pt;line-height:1.45;color:var(--muted);margin-top:7px}
table{width:100%;border-collapse:collapse}.rates th{text-align:left;font-size:7.2pt;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--muted);padding:0 0 6px;border-bottom:1px solid var(--line)}.rates th:last-child,.rates td:last-child{text-align:right;white-space:nowrap}.rates td{padding:8px 0;border-bottom:1px solid var(--line);font-size:8.8pt;vertical-align:top}.rates td span{display:block;font-size:7.3pt;color:var(--muted)}.rates .own td{background:var(--soft)}.rates .own td:first-child{padding-left:8px;border-left:3px solid var(--accent)}.rates .own td:last-child{padding-right:8px;font-size:11pt}
.insight,.local{margin-top:12px;padding:13px 15px;border-radius:var(--radius);background:var(--navy);color:var(--paper)}.insight b,.local b{display:block;font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:11.5pt;margin-bottom:5px}.insight p,.local p{font-size:8.4pt;line-height:1.55}
.mix li{display:grid;grid-template-columns:132px 1fr 34px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line)}.mix b{display:block;font-size:8.6pt}.mix span{display:block;font-size:6.9pt;color:var(--muted);line-height:1.3}.mix em{font-style:normal;text-align:right;font-weight:600;font-variant-numeric:tabular-nums}.mix .bar i{background:var(--navy)}.mix .is-bank .bar i{background:var(--accent)}
.serp td{font-size:8pt;padding:6px 0;border-bottom:1px solid var(--line);vertical-align:top}.serp td:first-child{width:42%;font-weight:500;padding-right:8px}
.moves{counter-reset:m}.moves li{counter-increment:m;position:relative;padding:0 0 10px 34px}.moves li::before{content:counter(m);position:absolute;left:0;top:0;width:24px;height:24px;border-radius:50%;background:var(--soft);font-family:var(--display);font-weight:600;font-size:11pt;display:flex;align-items:center;justify-content:center}.moves b{display:block;font-size:9.4pt}.moves span{display:block;font-size:8.2pt;line-height:1.5;color:var(--muted)}
.method{font-size:6.9pt;line-height:1.5;color:var(--muted);margin-top:12px;padding-top:8px;border-top:1px solid var(--line)}
`
const html = `<!doctype html><html lang="es-PE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pibank · Cómo busca y decide el ahorrista peruano · Efeonce</title><style>${css}</style></head><body><main>${page1}${page2}${page3}</main></body></html>`

await fs.mkdir(output, { recursive: true })
const base = 'Pibank-Anexo-ahorrista-peruano-2026-10-19'
const htmlPath = path.join(output, `${base}.html`),
  pdfPath = path.join(output, `${base}.pdf`)
await fs.writeFile(htmlPath, html)
const browser = await chromium.launch()
let qa
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(i => i.decode()))
  })
  await page.emulateMedia({ media: 'print' })
  qa = await page.evaluate(() => ({
    pages: [...document.querySelectorAll('.page')].map((p, i) => {
      const box = p.getBoundingClientRect()
      const footer = p.querySelector('.page-footer').getBoundingClientRect()
      const kids = [...p.children].filter(c => !['page-footer', 'cover-layer', 'page-header'].some(k => c.classList.contains(k)))
      const bottom = Math.max(...kids.map(c => c.getBoundingClientRect().bottom))
      return { page: i + 1, gap: Math.round(footer.top - bottom), overflow: bottom > footer.top - 8, height: Math.round(box.height) }
    }),
    brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).length,
    fonts: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))],
    textOverflow: [...document.querySelectorAll('td,li,p,h1,h2,h3,strong')]
      .filter(e => e.scrollWidth > e.clientWidth + 2)
      .map(e => e.textContent.slice(0, 60))
  }))
  qa.errors = errors
  if (errors.length || qa.brokenImages || qa.pages.some(p => p.overflow) || qa.textOverflow.length) {
    await fs.writeFile(path.join(output, 'layout-check.json'), JSON.stringify(qa, null, 2))
    throw Error('QA de layout falló: ' + JSON.stringify(qa))
  }
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true })
  for (let i = 1; i <= PAGES; i++) {
    const el = await page.$(`#p${i}`)
    await el.screenshot({ path: path.join(output, `qa-p${i}.png`) })
  }
} finally {
  await browser.close()
}
const manifest = {
  document: base,
  createdAt: new Date().toISOString(),
  status: 'draft_for_review',
  line: 'engine',
  measureRenderer: { package: '@efeoncepro/axis-graphic-line', version: axisGraphicLineVersion, from: 'axis-design-system main, checkout local' },
  data: {
    demandFamilies: panel.length,
    demandMonthly: total,
    buckets,
    aiMode: { queries: aiMode.map(t => t.keyword), cited, citedTotal, notBank, pichinchaCites, pibankCites },
    measure: { value: notBankValue, label: ring.trajectory.valueLabel, source: measureSource }
  },
  hardcodedFacts: [
    'Tasas publicadas Pibank/Interbank/Scotiabank/Efectibank consultadas el 06-10-2026: research/PIBANK-DEMAND-2026-10-06.md §5',
    'Posiciones SERP del 06-10-2026: research/PIBANK-DEMAND-2026-10-06.md §4',
    'APEIM 2025 A/B 10,4% hogares Perú y 21% Lima: reconstruccion-2027/demanda-audiencia-2026-10-08/README.md §16.3'
  ],
  sources,
  assets,
  qa,
  outputs: await Promise.all(
    [htmlPath, pdfPath].map(async f => ({ file: path.basename(f), sha256: sha(await fs.readFile(f)) }))
  ),
  authority: { sent: false, clientApproved: false }
}
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ output: path.relative(repo, output), qa: qa.pages, fonts: qa.fonts, data: manifest.data }, null, 2))
