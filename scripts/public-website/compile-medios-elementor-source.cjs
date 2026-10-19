/**
 * Source-led compiler for the Agencia de Medios landing (/servicios/agencia-de-medios/).
 *
 * Reads the approved canvas (medios-source/Main.dc.html), expands its dynamic parts (sales-model and platform
 * selectors) into static markup and emits one schema + template per section into the eo-elementor-widgets plugin:
 * includes/medios/{schemas,templates}, assets/css/medios-landing.css.
 * Stages 2–3 (schemas, templates, scoped CSS) live in lib/source-led-compiler.cjs; this file only expands its canvas.
 * It never touches WordPress. Re-run after changing the source, then node verify-source-led-compilers.cjs.
 */
const fs = require('node:fs')
const path = require('node:path')

const cheerio = require('cheerio')

const { compileSourceLedLanding } = require('./lib/source-led-compiler.cjs')

const source = fs.readFileSync(path.join(__dirname, 'medios-source/Main.dc.html'), 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(__dirname, 'medios-source/assets.json'), 'utf8'))

// Order = document order of the canvas sections. [module, editor title, Ohio section scheme]
const MODULES = [
  ['hero', 'Hero · ¿Dónde invierto?', 'dark'],
  ['canales', 'Canales que operamos', 'dark'],
  ['numeros', 'Efeonce en números', 'dark'],
  ['diferencia', 'La diferencia · comparativo', 'dark'],
  ['ciclo', 'Todo el ciclo · cuatro frentes', 'dark'],
  ['modo', '¿Cómo vendes? · Commerce / B2B', 'dark'],
  ['senal', 'La señal · por qué revisar tu pauta', 'dark'],
  ['performance', 'Performance · cada plataforma', 'dark'],
  ['pantallas', 'Pantallas · recorrido horizontal', 'dark'],
  ['medicion', 'Medición · órbita y tablero', 'dark'],
  ['equipo', 'Equipo · el squad', 'dark'],
  ['cobro', 'Cómo cobramos', 'light'],
  ['metodo', 'Método · cómo trabajamos', 'dark'],
  ['partners', 'Partners oficiales', 'dark'],
  ['preguntas', 'Preguntas frecuentes', 'dark'],
  ['agenda', 'Agenda · diagnóstico y formulario', 'dark'],
]

/* ---------- 1. Expand the canvas into static markup ---------- */

const body = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('<script type="text/x-dc"'))
const $ = cheerio.load(body, { decodeEntities: false }, false)

// The theme header and footer are canonical: drop the canvas footer and its mobile CTA bar.
$('footer').remove()
$('.mbar').remove()

const styleOf = el => $(el).attr('style') || ''
const ifs = expr => $('sc-if').filter((_, el) => $(el).attr('value') === '{{' + expr + '}}')

// Segmented selectors become plain tabs: one button per option, the pressed look comes from CSS keyed on
// aria-pressed (generated below from the canvas' own on/off inline styles), panels are toggled by the JS.
const tabCss = []

function buildTabs({ name, group, options, panelsAfter }) {
  const buttons = options.map(o => o.on)
  const onStyle = styleOf(buttons[0])
  const offStyle = styleOf(options[0].off)
  const sel = `[data-gh-tabs="${name}"] [data-gh-tab]`

  tabCss.push(`${sel}{${offStyle};cursor:pointer}`, `${sel}[aria-pressed="true"]{${onStyle}}`)
  const icon = $(buttons[0]).children('span').first()

  if (icon.length) {
    tabCss.push(`${sel} > span{${styleOf(icon)}}`, `${sel}[aria-pressed="false"] > span{background:transparent}`)
  }

  group.attr('data-gh-tabs', name)
  group.html(options.map((o, i) => {
    const b = $(o.on).clone()

    b.removeAttr('style').removeAttr('onClick').attr('data-gh-tab', '').attr('aria-pressed', i === 0 ? 'true' : 'false')
    b.find('span').first().removeAttr('style')

    return $.html(b)
  }).join('\n'))
  const panels = $(`<div data-gh-panels="${name}"></div>`)

  panels.html(options.map((o, i) => `<div data-gh-panel${i ? ' hidden' : ''}>${o.panel}</div>`).join('\n'))
  panelsAfter.first().before(panels)
  panelsAfter.remove()
}

// 06 ¿Cómo vendes?: Commerce / B2B.
{
  const commerce = ifs('isCommerce')
  const b2b = ifs('isB2b')
  const group = commerce.first().parent()
  const commerceButtons = commerce.first().children('button')
  const b2bButtons = b2b.first().children('button')

  buildTabs({
    name: 'modo',
    group,
    options: [
      { on: commerceButtons.get(0), off: b2bButtons.get(0), panel: commerce.eq(1).html() },
      { on: b2bButtons.get(1), off: commerceButtons.get(1), panel: b2b.eq(1).html() },
    ],
    panelsAfter: commerce.eq(1).add(b2b.eq(1)),
  })
}

// 08 Performance: Google / Meta / TikTok / LinkedIn.
{
  const keys = ['G', 'M', 'T', 'L']
  const group = ifs('isG').first().parent()

  const options = keys.map(k => ({
    on: ifs('is' + k).first().children('button').get(0),
    off: ifs('not' + k).first().children('button').get(0),
    panel: ifs('is' + k).eq(1).html(),
  }))

  buildTabs({ name: 'plataforma', group, options, panelsAfter: keys.reduce((acc, k) => acc.add(ifs('is' + k).eq(1)), $()) })
  keys.forEach(k => ifs('not' + k).remove())
}

// 16 Agenda: the governed Growth Form renderer owns fields, consent, submit and the success state. The card keeps the
// canvas look (dark, title, trust line, calendar link); the renderer is themed dark with host tokens (host.css).
{
  const card = $('section#agenda .formcard')
  const trust = card.find('div[aria-label="Por qué confiar"]').clone()
  const heading = card.find('#form-h').parent().clone()
  const calendar = card.find('p').filter((_, el) => $(el).text().includes('Prefieres elegir el horario')).clone()

  calendar.find('a').attr('href', '/agenda/')
  card.empty().append(heading).append('<gh-growth-form></gh-growth-form>').append(trust).append(calendar)
  heading.attr('style', 'margin-bottom: 22px')
  trust.attr('style', (trust.attr('style') || '') + '; margin-top: 20px')
  calendar.attr('style', (calendar.attr('style') || '') + '; margin-top: 18px')
  card.attr('class', 'formcard gh-medios-form-card')
  card.attr('role', 'region').attr('aria-labelledby', 'form-h')
}

if ($('sc-if').length) throw new Error('Unexpanded sc-if left: ' + $('sc-if').length)
if (/\{\{\w+\}\}/.test($.html())) throw new Error('Unresolved binding left in the markup')

// Editable collections: FAQ rows (FAQPage is built from them at render time).
$('section#faq details').each((_, el) => { $(el).attr('data-gh-repeat', 'faq') })

const sections = $('section')

if (sections.length !== MODULES.length) throw new Error(`Expected ${MODULES.length} sections, found ${sections.length}`)
sections.each((i, el) => { $(el).attr('data-gh-module', MODULES[i][0]) })

/* ---------- 2–3. Schemas, templates and scoped stylesheet (shared core) ---------- */

const SERVICE_DEFAULTS = {
  schema_service_name: 'Agencia de medios',
  schema_service_type: 'Planificación, compra y medición de medios pagados',
  schema_service_description: 'Planificamos, compramos, optimizamos y medimos tu inversión publicitaria en search, social, video, TV conectada, audio, DOOH y retail media, conectada a tus ventas y a tu CRM.',
  schema_audience: 'Equipos de marketing',
  // Same five countries the visible FAQ names (operator, 2026-10-16).
  schema_area_served: 'Chile, Colombia, Perú, México, Estados Unidos',
  // One component per line, only what the page itself shows; becomes Service.hasOfferCatalog (no prices).
  schema_service_catalog: [
    'Planificación de medios',
    'Compra en search y social: Google, Meta, TikTok y LinkedIn',
    'Compra programática',
    'TV conectada y audio',
    'Pantallas digitales en la calle (DOOH)',
    'Retail media',
    'Creatividad para performance',
    'Medición, atribución e incrementalidad',
  ].join('\n'),
}

const result = compileSourceLedLanding({
  landing: 'medios',
  sourceDir: path.join(__dirname, 'medios-source'),
  source,
  assets,
  $,
  modules: MODULES,
  tabCss,
  formModule: 'agenda',
  serviceModule: 'preguntas',
  faq: { repeaters: ['faq'], question: 'f001_pregunta', answer: 'f002_descripcion' },
  serviceDefaults: SERVICE_DEFAULTS,
  pageLayer: false,
})

console.log(JSON.stringify(result, null, 2))
