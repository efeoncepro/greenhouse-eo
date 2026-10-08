import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'
import { efeonceGraphicLine as gl, axisGeometry, axisSurface } from '@efeoncepro/axis-tokens'
import { brandAssetUrl } from '@efeoncepro/axis-brand-assets'
import { orbitSvg, sphereDividerSvg } from '@efeoncepro/axis-graphic-line'

// Renderer documental local para esta oferta multimoneda detallada. No opera el cotizador Greenhouse.
const dir = path.dirname(fileURLToPath(import.meta.url))
let repo = dir
while (!(await fs.stat(path.join(repo, 'package.json')).catch(() => null))) {
  const parent = path.dirname(repo)
  if (parent === repo) throw Error('Repo no localizado')
  repo = parent
}
const args = process.argv.slice(2),
  output = path.resolve(dir, args.shift() ?? 'v2-usd')
const options = {}
while (args.length) {
  const key = args.shift()
  if (!['--currency', '--fx', '--data', '--locale'].includes(key) || !args.length)
    throw Error('Uso: node render.mjs salida [--currency PEN --fx fx/snapshot.json] [--data datos.json]')
  options[key.slice(2)] = args.shift()
}
if ((await fs.readdir(output).catch(e => (e.code === 'ENOENT' ? [] : Promise.reject(e)))).length)
  throw Error('Salida ocupada; use una versión nueva.')
const dataPath = path.resolve(dir, options.data ?? 'cotizacion.json')
const q = JSON.parse(await fs.readFile(dataPath, 'utf8'))
if (q.currency !== 'USD' || q.status !== 'draft_for_review' || q.submitted || q.signed)
  throw Error('Precio base USD: sólo borrador no presentado.')
if (q.tax.amount !== null || q.tax.gross !== null)
  throw Error('Impuestos pendientes no pueden representarse como cero.')
const { createMoneyPresentation } = await import(path.join(repo, 'scripts/documents/document-money.mjs'))
const currency = options.currency ?? q.presentation?.currency ?? q.currency
const fx = options.fx
  ? JSON.parse(await fs.readFile(path.resolve(dir, options.fx), 'utf8'))
  : currency === q.presentation?.currency
    ? q.presentation?.fx
    : undefined
const presentation = createMoneyPresentation({
  currency: q.currency,
  date: q.date,
  locale: q.locale,
  presentation: {
    currency,
    locale: options.locale ?? q.presentation?.locale ?? (currency === 'PEN' ? 'es-PE' : q.locale),
    ...(fx ? { fx } : {})
  }
})
if (presentation.fx && presentation.fx.purpose !== 'reference_conversion')
  throw Error(
    'Este expediente usa equivalencias referenciales; una tasa contractual fijada requiere revisión de condiciones.'
  )
q.presentation = {
  currency: presentation.currency,
  locale: presentation.locale,
  ...(presentation.fx ? { fx: presentation.fx } : {})
}
const esc = v =>
  String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const sha = b => createHash('sha256').update(b).digest('hex')
const money = (n, divisor = 1) => presentation.format(n, divisor)
const currencyName = new Intl.DisplayNames([presentation.locale], { type: 'currency' }).of(currency)
const fxNote = presentation.converted
  ? `Equivalencia referencial: 1 USD = ${presentation.fx.rate} ${currency}. Tasa del ${presentation.fx.date}; ${presentation.fx.source}. Redondeo al menor decimal de la moneda. Moneda y tipo de cambio contractual por acordar; se conserva el precio base USD.`
  : 'Precio base y presentación en USD. La distribución mensual es presupuesto; proyectos y campañas tienen hitos de pago. Moneda y condiciones se formalizan en la contratación.'
function textValue(value) {
  return String(value ?? '')
    .replace(/\{\{money:(\d+(?:\.\d+)?)(?:\/(\d+))?\}\}/g, (_, n, d) => money(n, d ? Number(d) : 1))
    .replaceAll('{{currency.name}}', currencyName)
    .replaceAll('{{currency.code}}', currency)
    .replaceAll('{{currency.fxNote}}', fxNote)
}
const content = value => esc(textValue(value))

const provenancePath = path.join(dir, 'provenance-snapshot.json'),
  provenanceBytes = await fs.readFile(provenancePath),
  provenance = JSON.parse(provenanceBytes)
if (
  provenance.version !== 1 ||
  !provenance.capturedAt ||
  !Array.isArray(provenance.sources) ||
  !provenance.sources.length ||
  provenance.sources.some(s => typeof s.file !== 'string' || !s.file || !/^[a-f0-9]{64}$/.test(s.sha256))
)
  throw Error('Snapshot de procedencia inválido')
const sources = provenance.sources
const sourceEvidence = {
  kind: 'recorded_readback',
  snapshot: path.relative(repo, provenancePath),
  sha256: sha(provenanceBytes),
  capturedAt: provenance.capturedAt,
  liveSourcesRechecked: false
}
const assets = []
async function embed(file, mime, source) {
  const b = await fs.readFile(file)
  assets.push({ file: path.relative(repo, file), source, sha256: sha(b), bytes: b.length })
  return `data:${mime};base64,${b.toString('base64')}`
}
const logo = await embed(
  fileURLToPath(brandAssetUrl('efeonce-logo-positive')),
  'image/svg+xml',
  '@efeoncepro/axis-brand-assets:efeonce-logo-positive'
)
const bubble = await embed(
  fileURLToPath(brandAssetUrl('url-bubble-baked-light')),
  'image/svg+xml',
  '@efeoncepro/axis-brand-assets:url-bubble-baked-light'
)
const client = await embed(
  path.resolve(dir, '../../propuesta/assets/pibank-logo-inverso.svg'),
  'image/svg+xml',
  'Paquete Pibank existente; referencia de identidad https://www.pibank.pe/'
)
let fonts = ''
for (const [family, weight, file] of [
  [gl.type.answer.family, '100 900', 'bricolage-grotesque-variable.ttf'],
  ...['400', '500', '600', '700'].map(w => [gl.type.text.family, w, `poppins-${w}.ttf`])
])
  fonts += `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:block;src:url("${await embed(path.join(repo, 'src/lib/artifact-composer/brand-packs/axis/fonts', file), 'font/ttf', 'axis-fonts')}") format("truetype")}\n`
const contactSource = 'src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json'
const contact = JSON.parse(await fs.readFile(path.join(repo, contactSource), 'utf8')).slots.contactDetails.value
const engine = gl.lines.find(l => l.key === 'engine'),
  W = gl.orbit.baseWidthPx
const orbit = orbitSvg({
  width: W,
  height: Math.round((W * 297) / 210),
  line: 'engine',
  surface: 'light',
  channel: 'print',
  circle: { cx: W, cy: 0, r: W * gl.orbit.radiusRatio.portraitOfWidth },
  start: 'bottom',
  span: 'accent',
  halo: false,
  idPrefix: 'pibank-quote'
})
const divider = sphereDividerSvg({ widthPx: W - 136, line: 'engine', surface: 'light' })
const slots = {
  'brand.fonts': fonts,
  'brand.ink': gl.color.navy,
  'brand.paper': axisSurface.light.paper,
  'brand.soft': gl.color.paper,
  'brand.navy': engine.darkBg,
  'brand.accent': engine.accentOnLight,
  'brand.textFamily': gl.type.text.family,
  'brand.displayFamily': gl.type.answer.family,
  'brand.radius': axisGeometry.radius.display,
  'brand.step': axisGeometry.spacing.base,
  'brand.round': axisGeometry.radius.round,
  'brand.weight': gl.type.answer.weight,
  'brand.tracking': gl.type.answer.tracking
}
let css = (await fs.readFile(path.join(repo, 'docs/commercial/templates/cotizacion-a4/template.css'), 'utf8')).replace(
  /\{\{([\w.]+)\}\}/g,
  (_, k) => {
    if (!Object.hasOwn(slots, k)) throw Error(k)
    return slots[k]
  }
)
css += `
.header-meta span{display:block}.header-meta .ref{font-size:7pt}.page-content>h2{font-size:29pt;max-width:95%;margin:8px 0 14px}.page-content>.intro{font-size:10.2pt;margin-bottom:18px;max-width:100%}.block{margin-top:18px}.block h3{font-size:14pt;margin-bottom:8px}.block p{font-size:10pt;line-height:1.6;margin:7px 0}.block p:last-child{margin-bottom:0}.detail-table{margin:18px 0;font-size:9pt;line-height:1.5}.detail-table th{font-size:7.6pt;letter-spacing:.02em;text-transform:none;padding:10px}.detail-table td{padding:10px 10px;vertical-align:top;border-bottom:1px solid var(--line);overflow-wrap:break-word}.detail-table td:first-child{font-weight:500}.detail-table td:last-child{padding-right:6px}.note{margin-top:18px;padding:17px 19px;border-left:3px solid var(--accent);background:var(--soft);border-radius:0 var(--radius) var(--radius) 0}.note h3{font-size:12pt;margin-bottom:7px}.note p{font-size:9.3pt;line-height:1.6;white-space:pre-line}.price-detail td:nth-last-child(-n+2),.price-detail th:nth-last-child(-n+2){text-align:right}.price-detail td:last-child{font-weight:600;white-space:nowrap}.price-detail td{font-size:9.3pt;padding:12px 10px}.price-detail .small{display:block;font-size:8pt;font-weight:400;color:var(--muted);margin-top:3px}.totals{margin-top:16px}.totals>div{font-size:10.5pt;padding:11px 0}.totals .grand-total{padding:18px 20px;margin-top:12px}.grand-total strong{font-size:27pt}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.metrics>div{padding-top:14px;border-top:2px solid var(--accent)}.metrics strong{font:600 30pt var(--display);display:block;line-height:1.2}.metrics span{display:block;font-size:8.5pt;margin-top:8px;color:var(--muted)}.calendar td{padding:7px 10px;font-size:9.2pt}.calendar td:last-child,.calendar th:last-child{text-align:right;white-space:nowrap}.calendar .annual td{border:0;background:var(--navy);color:var(--paper);font-weight:600;padding:11px 10px}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:20px 0}.comparison>div{background:var(--soft);padding:20px;border-radius:var(--radius)}.comparison .selected{background:var(--navy);color:var(--paper)}.comparison .label{font-size:8pt}.comparison strong{font:600 27pt var(--display);display:block;margin:10px 0}.comparison p{font-size:9pt;line-height:1.6}.cover-content{margin-top:44px}.cover-content>h1{font-size:43pt;line-height:1.04;max-width:600px;letter-spacing:-.035em;margin:16px 0 22px}.cover-deck{font-size:17pt;max-width:520px}.cover-investment{margin-top:24px}.cover-investment strong{font-size:36pt}.client-block{margin-top:26px}.client-block img{width:195px;margin:0 0 12px}.cover-supplier{margin-top:22px}.cover-status{font-size:9pt;line-height:1.6;max-width:580px;margin-top:22px;color:var(--muted)}.cover-code{font-size:9pt}.cover-note{font-size:8.5pt;line-height:1.6;margin-top:8px}.bullets{margin:18px 0}.bullets ul{padding-left:18px;margin:8px 0}.bullets li{margin:7px 0;font-size:10pt;line-height:1.6}.document-status{font-size:7pt;letter-spacing:.06em;color:var(--muted);text-transform:uppercase}
@media screen and (max-width:820px){.cover-content>h1{font-size:35pt}.metrics{grid-template-columns:repeat(2,1fr)}.comparison{grid-template-columns:1fr}.detail-table{font-size:8.5pt}.detail-table td{padding:8px}.cover-investment strong{font-size:30pt}}
`
const labels = Object.fromEntries(q.prices.map(r => [r.id, r.capability]))
const units = {
  BASE: 'meses',
  HUB: 'proyecto',
  CALCULADORA: 'proyecto',
  COMPARADOR: 'proyecto',
  PLANIFICADOR: 'proyecto',
  COMUNIDAD: 'meses activos',
  PR: 'campañas',
  REFUERZO_PR: 'rondas',
  CUIDADO: 'meses activos'
}
const short = {
  HUB: 'Hub',
  CALCULADORA: 'Calculadora',
  COMPARADOR: 'Comparador',
  PLANIFICADOR: 'Planificador',
  COMUNIDAD: 'Comunidad',
  PR: 'PR',
  REFUERZO_PR: 'Refuerzo PR',
  CUIDADO: 'Mantenimiento'
}
const moduleTotals = plan =>
  Object.fromEntries(
    q.prices.map(r => [
      r.id,
      q.plans[plan].months.reduce(
        (sum, m) => sum + m.items.filter(i => i.module === r.id).reduce((s, i) => s + i.amount, 0),
        0
      )
    ])
  )
for (const [name, expected] of Object.entries({ base: 54000, gradual: 79200, integral: 89200 })) {
  const plan = q.plans[name]
  if (plan.annual !== expected || plan.months.reduce((s, m) => s + m.total, 0) !== expected)
    throw Error(`Total ${name}`)
  for (const m of plan.months)
    if (m.total !== m.items.reduce((s, i) => s + i.amount, 0)) throw Error(`Mes ${name}/${m.month}`)
  const totals = moduleTotals(name)
  for (const r of q.prices) if (totals[r.id] % Number(r.price_usd)) throw Error(`Unidad parcial anual ${r.id}`)
}
const moneyAudit = {}
for (const name of ['base', 'gradual', 'integral']) {
  const plan = q.plans[name],
    minor = n => presentation.convertMinor(n),
    sum = values => values.reduce((a, b) => a + b, 0n)
  const modules = moduleTotals(name),
    monthly = plan.months.map(m => minor(m.total))
  const annual = minor(plan.annual),
    moduleSum = sum(Object.values(modules).map(minor))
  const monthSum = sum(monthly)
  const monthsReconcile = plan.months.every(m => minor(m.total) === sum(m.items.map(i => minor(i.amount))))
  const unitsReconcile = q.prices.every(
    r =>
      modules[r.id] === 0 || minor(modules[r.id]) === minor(r.price_usd) * BigInt(modules[r.id] / Number(r.price_usd))
  )
  if (annual !== moduleSum || annual !== monthSum || !monthsReconcile || !unitsReconcile)
    throw Error(
      `Redondeo ${currency}: subtotales, meses o unidades de ${name} no concilian. Defina y documente un ajuste antes de presentar.`
    )
  moneyAudit[name] = {
    annualMinor: String(annual),
    moduleSumMinor: String(moduleSum),
    monthSumMinor: String(monthSum),
    monthsReconcile,
    unitsReconcile
  }
}
if (
  moduleTotals('gradual').PLANIFICADOR !== 0 ||
  moduleTotals('gradual').PR !== 4000 ||
  moduleTotals('gradual').COMUNIDAD !== 10000
)
  throw Error('Alcance gradual incorrecto')
const renderTable = (headers, rows, widths, cls = '') =>
  `<div class="table-scroll"><table class="detail-table ${cls}"><thead><tr>${headers.map((h, i) => `<th scope="col"${widths ? ` style="width:${widths[i]}%"` : ''}>${content(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${content(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
function renderBlock(b) {
  if (b.kind === 'section')
    return `<section class="block"><h3>${content(b.title)}</h3>${b.paragraphs.map(t => `<p>${content(t)}</p>`).join('')}</section>`
  if (b.kind === 'note')
    return `<aside class="note"><h3>${content(b.title)}</h3><p>${content(b.text)}</p>${presentation.fx && b.text.includes('{{currency.fxNote}}') ? `<p><a href="${esc(presentation.fx.sourceUrl)}">Consultar serie oficial BCRPData · PD04640PD</a></p>` : ''}</aside>`
  if (b.kind === 'bullets')
    return `<section class="bullets"><h3>${content(b.title)}</h3><ul>${b.items.map(t => `<li>${content(t)}</li>`).join('')}</ul></section>`
  if (b.kind === 'table') return renderTable(b.headers, b.rows, b.widths)
  if (b.kind === 'metrics')
    return `<div class="metrics">${b.items.map(([value, label]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('')}</div>`
  if (b.kind === 'price_table') {
    const totals = moduleTotals(b.plan)
    return `<div class="table-scroll"><table class="detail-table price-detail"><thead><tr><th style="width:42%">Servicio / activación</th><th style="width:20%">Cantidad anual</th><th style="width:18%">Unitario</th><th style="width:20%">Subtotal</th></tr></thead><tbody>${q.prices
      .filter(r => totals[r.id] > 0)
      .map(
        r =>
          `<tr data-module="${esc(r.id)}"><td>${esc(r.capability)}</td><td>${totals[r.id] / Number(r.price_usd)}<span class="small">${units[r.id]}</span></td><td>${money(Number(r.price_usd))}</td><td>${money(totals[r.id])}</td></tr>`
      )
      .join('')}</tbody></table></div>`
  }
  if (b.kind === 'totals')
    return `<div class="totals"><div><span>Servicio continuo · doce meses</span><strong>${money(54000)}</strong></div><div><span>Activaciones previstas</span><strong>${money(q.plans[b.plan].annual - 54000)}</strong></div><div class="grand-total"><span>Inversión anual neta</span><strong>${money(q.plans[b.plan].annual)}</strong></div></div>`
  if (b.kind === 'quarter_budget')
    return renderTable(
      ['Reserva trimestral', 'Servicio continuo', 'Activaciones', 'Total neto'],
      [1, 2, 3, 4].map(n => {
        const months = q.plans[b.plan].months.slice((n - 1) * 3, n * 3),
          total = months.reduce((sum, m) => sum + m.total, 0)
        return [`T${n} · M${(n - 1) * 3 + 1}–M${n * 3}`, money(13500), money(total - 13500), money(total)]
      }),
      [27, 24, 24, 25]
    )
  if (b.kind === 'calendar')
    return `<div class="table-scroll"><table class="detail-table calendar"><thead><tr><th style="width:10%">Mes</th><th style="width:17%">Base</th><th style="width:55%">Activaciones presupuestadas</th><th style="width:18%">Total</th></tr></thead><tbody>${q.plans[
      b.plan
    ].months
      .filter(m => m.month >= (b.start ?? 1) && m.month <= (b.end ?? 12))
      .map(
        m =>
          `<tr data-month="${m.month}"><td>M${m.month}</td><td>${money(m.items.find(i => i.module === 'BASE').amount)}</td><td>${
            m.items
              .filter(i => i.module !== 'BASE')
              .map(i => `${short[i.module]} ${money(i.amount)}`)
              .join(' · ') || '—'
          }</td><td>${money(m.total)}</td></tr>`
      )
      .join(
        ''
      )}<tr class="annual"><td colspan="3">Reserva M${b.start ?? 1}–M${b.end ?? 12}</td><td>${money(q.plans[b.plan].months.filter(m => m.month >= (b.start ?? 1) && m.month <= (b.end ?? 12)).reduce((sum, m) => sum + m.total, 0))}</td></tr></tbody></table></div>`
  if (b.kind === 'alternative_totals')
    return `<div class="comparison"><div class="selected"><span class="label">Gradual · recomendada</span><strong>${money(q.plans.gradual.annual)}</strong><p>Promedio ${money(q.plans.gradual.annual, 12)}/mes<br>Máximo ${money(Math.max(...q.plans.gradual.months.map(m => m.total)))}/mes</p></div><div><span class="label">Integral · alternativa</span><strong>${money(q.plans.integral.annual)}</strong><p>Promedio ${money(q.plans.integral.annual, 12)}/mes<br>Máximo ${money(Math.max(...q.plans.integral.months.map(m => m.total)))}/mes</p></div></div>`
  throw Error(`Bloque ${b.kind}`)
}
function footer(n) {
  return `<footer class="page-footer"><div class="brand-divider">${divider.svg ?? divider}</div><div class="footer-body"><div class="footer-contact"><span>${esc(contact.address)}</span><a href="tel:${esc(contact.chilePhone.replaceAll(' ', ''))}">${esc(contact.chilePhone)}</a></div><a class="url-bubble" href="https://efeoncepro.com/"><img src="${bubble}" alt="efeoncepro.com"></a><span class="folio">${String(n).padStart(2, '0')} / ${q.pages.length}</span></div></footer>`
}
const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(q.date))
const pages = q.pages
  .map((p, i) => {
    const n = i + 1
    if (p.kind === 'cover')
      return `<article class="page cover" id="p${n}"><div class="cover-orbit">${orbit.svg}</div><div class="page-content"><header class="cover-header"><img src="${logo}" alt="Efeonce"><p class="overline">${esc(p.label)}</p><p class="cover-code">${esc(q.reference)} · ${date}</p></header><div class="cover-content"><h1>${p.title.map(esc).join('<br>')}</h1><p class="cover-deck">${esc(p.subtitle)}</p><div class="client-block"><img src="${client}" alt="Pibank"><p>Banco Pichincha Perú<br>Para Jesús Vargas Serpa · Especialista Digital & Performance</p></div><div class="cover-investment"><div><span class="label">Inversión anual neta recomendada</span><strong data-slot="amount.annual">${money(q.plans.gradual.annual)}</strong><span>Servicio continuo + activaciones · Valores en ${esc(currency)}</span></div><div class="cover-total"><span class="label">Servicio base</span><b>${money(4500)}/mes</b><span>Doce meses</span></div></div><div class="cover-supplier"><div><span class="label">Oferente</span><b>${esc(q.supplier.name)}</b><span>RUT ${esc(q.supplier.taxId)}</span></div><div><span class="label">Responsable comercial</span><b>${esc(q.supplier.contact)}</b><a href="mailto:${esc(q.supplier.email)}">${esc(q.supplier.email)}</a></div></div><p class="cover-status">${esc(p.note)}</p><p class="cover-note">Impuestos y total facturable: pendientes de confirmar con la entidad contratante.</p></div></div>${footer(n)}</article>`
    return `<article class="page" id="p${n}"><header class="page-header"><img class="header-logo" src="${logo}" alt="Efeonce"><div class="header-meta"><span>Pibank Perú · Programa anual 2027 · ${esc(currency)}</span><span class="ref">${esc(q.reference)} · ${date}</span></div></header><div class="page-content"><p class="document-status">Cotización detallada · Propuesta para revisión</p><h2>${content(p.title)}</h2><p class="intro">${content(p.lede)}</p>${p.blocks.map(renderBlock).join('')}</div>${footer(n)}</article>`
  })
  .join('\n')
css += `.table-scroll{max-width:100%}.note a{text-decoration:underline;text-underline-offset:2px}@media screen and (max-width:820px){.table-scroll{overflow-x:auto}}.page:not(.cover){padding-top:33mm}.page-content>h2{font-size:27pt;margin-bottom:12px}.page-content>.intro{margin-bottom:14px}.block{margin-top:14px}.block h3{margin-bottom:6px}.block p{line-height:1.55;margin:6px 0}.detail-table{margin:14px 0;line-height:1.45}.detail-table td,.detail-table th{padding-top:7px;padding-bottom:7px}.price-detail td{padding-top:9px;padding-bottom:9px}.note{margin-top:14px;padding:14px 17px}.note p{line-height:1.55}.metrics{margin:18px 0}.comparison{margin:16px 0}@media screen and (max-width:820px){.page:not(.cover){padding-top:120px}}`
const html = `<!doctype html><html lang="${esc(presentation.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pibank · Cotización detallada 2027 · ${esc(currency)} · Efeonce</title><meta name="description" content="Programa anual SEO, AEO y autoridad para Pibank Perú. Ruta gradual ${esc(money(q.plans.gradual.annual))} netos. Propuesta para revisión."><style>${css}</style></head><body><div class="toolbar"><nav><a href="#p3">Inversión</a><a href="#p13">Calendario</a><a href="#p17">Condiciones</a></nav><button type="button" onclick="window.print()">Imprimir / guardar PDF</button></div><main>${pages}</main></body></html>`
await fs.mkdir(output, { recursive: true })
const htmlPath = path.join(output, `Pibank-Cotizacion-detallada-2027-${currency}.html`),
  pdfPath = path.join(output, `Pibank-Cotizacion-detallada-2027-${currency}.pdf`)
await fs.writeFile(htmlPath, html)
const browser = await chromium.launch()
const errors = []
let qa
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(i => i.decode()))
  })
  await page.emulateMedia({ media: 'print' })
  qa = await page.evaluate(() => ({
    pages: [...document.querySelectorAll('.page')].map((p, i) => {
      const content = p.querySelector('.page-content').getBoundingClientRect(),
        footer = p.querySelector('.page-footer').getBoundingClientRect()
      return {
        page: i + 1,
        contentBottom: content.bottom - p.getBoundingClientRect().top,
        footerTop: footer.top - p.getBoundingClientRect().top,
        gap: footer.top - content.bottom,
        overflow: content.bottom > footer.top - 16
      }
    }),
    brokenImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).length,
    unresolvedSlots: /\{\{[^{}]+\}\}/.test(document.body.textContent),
    fontStatus: document.fonts.status,
    fonts: [...document.fonts].map(f => ({ family: f.family, status: f.status })),
    horizontalOverflow: [...document.querySelectorAll('td,h1,h2,h3,p')]
      .filter(e => e.scrollWidth > e.clientWidth + 2)
      .map(e => e.textContent.slice(0, 70))
  }))
  if (
    errors.length ||
    qa.brokenImages ||
    qa.unresolvedSlots ||
    qa.pages.some(p => p.overflow) ||
    qa.horizontalOverflow.length
  ) {
    await fs.writeFile(path.join(output, 'layout-check.json'), JSON.stringify({ ...qa, errors }, null, 2))
    throw Error(
      'QA de layout falló: ' + JSON.stringify(qa.pages.filter(p => p.overflow)) + JSON.stringify(qa.horizontalOverflow)
    )
  }
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,
    outline: true,
    displayHeaderFooter: false
  })
  // Vista angosta: comprueba lectura y ausencia de desborde, sin convertirla en aceptación visual del PDF.
  await page.emulateMedia({ media: 'screen' })
  await page.setViewportSize({ width: 390, height: 844 })
  qa.mobile = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > innerWidth + 2
  }))
  if (qa.mobile.overflow) throw Error('Desborde horizontal del documento móvil')
} finally {
  await browser.close()
}
const manifest = {
  reference: q.reference,
  status: q.status,
  currency,
  sourceCurrency: q.currency,
  presentation: q.presentation,
  principal: q.principal,
  annualNet: presentation.convert(q.plans.gradual.annual),
  baseAnnual: presentation.convert(54000),
  activationsAnnual: presentation.convert(25200),
  sourceAnnualNet: q.plans.gradual.annual,
  tax: q.tax,
  pages: q.pages.length,
  createdAt: new Date().toISOString(),
  review: { automaticLayout: qa, moneyValidated: true, moneyAudit, visualPdf: 'pending' },
  sourceDataSha256: sha(await fs.readFile(dataPath)),
  implementation: await Promise.all(
    [path.join(dir, 'render.mjs'), path.join(repo, 'scripts/documents/document-money.mjs')].map(async f => ({
      file: path.relative(repo, f),
      sha256: sha(await fs.readFile(f))
    }))
  ),
  brand: { line: 'engine', assets, orbit: orbit.manifest, contactSource },
  sources,
  sourceEvidence,
  outputs: await Promise.all(
    [htmlPath, pdfPath].map(async f => ({
      file: path.basename(f),
      sha256: sha(await fs.readFile(f)),
      bytes: (await fs.stat(f)).size
    }))
  ),
  authority: { commerciallyAccepted: false, sent: false, crmUpdated: false, greenhouseQuoteId: null }
}
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
await fs.writeFile(path.join(output, 'datos.json'), JSON.stringify(q, null, 2) + '\n')
console.log(
  JSON.stringify({
    output,
    pages: q.pages.length,
    annual: presentation.convert(q.plans.gradual.annual),
    currency,
    layout: qa.pages.map(p => ({ page: p.page, gap: Math.round(p.gap) })),
    mobile: qa.mobile
  })
)
