/**
 * Source-led compiler for the Inbound Marketing landing (/agencia-inbound-marketing/, rediseño 2026-10-18).
 *
 * Reads the approved canvas (inbound-source/Main.dc.html, «La órbita»; the HubSpot loop graphic is inlined from the
 * canvas' Loop board), evaluates its DCLogic once, expands every dynamic part (market picker of «Arma tu primer
 * ciclo», FAQ, mobile dock) into static editable markup and emits one schema + template per section into the
 * eo-elementor-widgets plugin: includes/inbound/{schemas,templates}, assets/css/inbound-landing.css. Stages 2–3 live
 * in lib/source-led-compiler.cjs; this file only expands its canvas. It never touches WordPress.
 * Re-run after changing the source, then node verify-source-led-compilers.cjs.
 */
const fs = require('node:fs')
const path = require('node:path')

const cheerio = require('cheerio')

const { compileSourceLedLanding } = require('./lib/source-led-compiler.cjs')

const sourceDir = path.join(__dirname, 'inbound-source')
const source = fs.readFileSync(path.join(sourceDir, 'Main.dc.html'), 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(sourceDir, 'assets.json'), 'utf8'))

// Order = document order of the canvas sections. [module, editor title, Ohio section scheme]
const MODULES = [
  ['hero', 'Hero · ¿Qué viene después del inbound?', 'dark'],
  ['confianza', 'Partner y clientes', 'dark'],
  ['partida', 'El punto de partida · 68 sin clic', 'dark'],
  ['vivo', 'No murió · se le murió el clic', 'light'],
  ['cambio', 'El cambio de fondo · embudo vs ciclo', 'dark'],
  ['rompe', '¿Dónde se te rompe?', 'dark'],
  ['metodo', 'Cómo trabajamos · fundamentos y etapas', 'dark'],
  ['ciclo', 'Arma tu primer ciclo', 'dark'],
  ['planes', 'Formas de empezar', 'dark'],
  ['reglas', 'Lo que no te vamos a prometer', 'dark'],
  ['diagnostico', 'Diagnóstico · reunión, formulario y preguntas', 'dark'],
]

/* ---------- 0. Evaluate the canvas logic (default state) ---------- */

const bodyHtml = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('</x-dc>'))
const scriptTag = source.match(/<script type="text\/x-dc"[^>]*data-props='([^']*)'[^>]*>([\s\S]*?)<\/script>/)

class DCLogic { constructor(p) { this.props = p || {}; this.state = {} } setState(s) { Object.assign(this.state, s) } }
const Component = new Function('DCLogic', scriptTag[2] + '\nreturn Component;')(DCLogic)
const vals = new Component({}).renderVals()

const lookup = (expr, scope) => {
  expr = expr.trim()
  if (expr === 'true') return true
  if (expr === 'false') return false

  return expr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope)
}

const interp = (s, scope) => s.replace(/\{\{([^}]+)\}\}/g, (_, e) => { const v = lookup(e, scope);

 

return v == null || typeof v === 'function' ? '' : String(v) })

const $ = cheerio.load('<div id="__root">' + bodyHtml + '</div>', { decodeEntities: false }, false)

const walk = (node, scope) => {
  for (const child of [...$(node).contents()]) {
    if (child.type === 'text') { child.data = interp(child.data, scope); continue }
    if (child.type !== 'tag') continue

    if (child.name === 'sc-if') {
      const v = lookup($(child).attr('value').replace(/[{}]/g, ''), scope)

      if (v) { walk(child, scope); $(child).replaceWith($(child).contents()) } else $(child).remove()
      continue
    }

    if (child.name === 'sc-for') {
      const list = lookup($(child).attr('list').replace(/[{}]/g, ''), scope) || []
      const as = $(child).attr('as')
      const tpl = $(child).html()

      const parts = list.map((item, i) => {
        const holder = cheerio.load('<div id="__h">' + tpl + '</div>', { decodeEntities: false }, false)
        const inner = $('<div></div>').append(holder('#__h').contents())

        walk(inner[0], Object.assign({}, scope, { [as]: item, $index: i }))

        return inner.html()
      })

      $(child).replaceWith(parts.join('\n'))
      continue
    }

    for (const [k, v] of Object.entries(child.attribs || {})) {
      if (/^on[A-Z]/.test(k)) { delete child.attribs[k]; continue }
      if (v.includes('{{')) child.attribs[k] = interp(v, scope)
    }

    walk(child, scope)
  }
}

walk($('#__root')[0], vals)

/* ---------- 1. Expand the dynamic parts ---------- */

const tabCss = []

// «Arma tu primer ciclo»: the market picker keeps its pressed look from the canvas' own on/off styles;
// inbound-landing.js keeps the product name, the market and the AI question in sync.
{
  const on = vals.markets.find(m => m.pressed === 'true').style
  const off = vals.markets.find(m => m.pressed === 'false').style
  const sel = '[data-gh-cycle] [data-gh-market]'

  tabCss.push(`${sel}{${off}}`, `${sel}[aria-pressed="true"]{${on}}`)
  $('#ciclo').attr('data-gh-cycle', '')
  $('#ciclo [data-gh-market]').each((_, b) => { $(b).removeAttr('style') })
}

// Mobile dock: lives in the hero module (fixed), so it ships with the first widget.
{
  const dock = $('nav.mbar')

  $('section.hero-sec').append(dock.clone())
  dock.remove()
}

// Diagnosis: the governed Growth Form renderer owns fields, steps, consent, submit and the success state.
{
  const form = $('form.form-card')

  form.replaceWith(`<div class="form-card gh-inbound-form-card" role="region" aria-labelledby="form-h">
<p style="margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #33506b">Diagnóstico de inbound marketing</p>
<p id="form-h" class="idea t-short" style="font-size: clamp(28px, 2.6vw, 36px); color: #001a33"><span class="lt">Pide tu</span> diagnóstico.</p>
<p style="margin: 0; font-size: 14px; color: #33506b">Sin costo. Toma 2 minutos; los campos con * son obligatorios.</p>
<gh-growth-form></gh-growth-form>
</div>`)
}

if ($('sc-if, sc-for').length) throw new Error('Unexpanded canvas control left')
if (/\{\{[^}]+\}\}/.test($('#__root').html())) throw new Error('Unresolved binding left in the markup')

// Editable collections: FAQ rows (FAQPage is built from them at render time); the first one opens.
$('#diagnostico details.faq').each((i, el) => { $(el).attr('data-gh-repeat', 'faq'); if (i === 0) $(el).attr('open', '') })

const sections = $('#__root section')

if (sections.length !== MODULES.length) throw new Error(`Expected ${MODULES.length} sections, found ${sections.length}`)
sections.each((i, el) => { $(el).attr('data-gh-module', MODULES[i][0]) })

/* ---------- 2–3. Schemas, templates and scoped stylesheet (shared core) ---------- */

const SERVICE_DEFAULTS = {
  schema_service_name: 'Inbound marketing',
  schema_service_type: 'Agencia de inbound marketing y Loop Marketing',
  schema_service_description: 'Agencia de inbound marketing que diseña la estrategia y opera el ciclo completo —definir, adaptar, amplificar y optimizar— con contenido, búsqueda (SEO y AEO), redes, medios, creatividad a escala y datos conectados, en las herramientas que el cliente ya usa.',
  schema_audience: 'Equipos de marketing y ventas de empresas B2B y B2C',
  // The markets the visible FAQ names.
  schema_area_served: 'Chile, México, Colombia, Perú, Estados Unidos',
  // One component per line, only what the page itself shows; becomes Service.hasOfferCatalog (no prices).
  schema_service_catalog: [
    'Diagnóstico de inbound marketing',
    'Mapa del cliente, guía de estilo y capa de datos',
    'Estrategia y creación de contenido',
    'Hiperpersonalización y automatización en el CRM',
    'SEO y AEO',
    'Redes sociales, influencers y medios pagados',
    'Medición, experimentos y optimización semanal',
    'Operación mensual del ciclo completo',
  ].join('\n'),
}

const result = compileSourceLedLanding({
  landing: 'inbound',
  sourceDir,
  source,
  assets,
  $: cheerio.load($('#__root').html(), { decodeEntities: false }, false),
  modules: MODULES,
  tabCss,
  formModule: 'diagnostico',
  serviceModule: 'diagnostico',
  faq: { repeaters: ['faq'], question: 'f001_subtitulo', answer: 'f002_descripcion' },
  serviceDefaults: SERVICE_DEFAULTS,
  pageLayer: true,
})

console.log(JSON.stringify(result, null, 2))
