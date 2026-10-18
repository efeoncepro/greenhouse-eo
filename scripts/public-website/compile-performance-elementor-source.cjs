/**
 * Source-led compiler for the Performance Marketing landing (/servicios/performance-marketing/, TASK-1865).
 *
 * Reads the approved canvas (performance-source/Main.dc.html), evaluates its DCLogic once per state, expands every
 * dynamic part (platform tabs, self-diagnosis quiz, creative race, FAQ) into static editable markup and emits one
 * schema + template per section into the eo-elementor-widgets plugin: includes/performance/{schemas,templates},
 * assets/css/performance-landing.css. Stages 2–3 (schemas, templates, scoped CSS) live in
 * lib/source-led-compiler.cjs; this file only expands its canvas. It never touches WordPress.
 * Re-run after changing the source, then node verify-source-led-compilers.cjs.
 */
const fs = require('node:fs')
const path = require('node:path')

const cheerio = require('cheerio')

const { compileSourceLedLanding } = require('./lib/source-led-compiler.cjs')

const sourceDir = path.join(__dirname, 'performance-source')
const source = fs.readFileSync(path.join(sourceDir, 'Main.dc.html'), 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(sourceDir, 'assets.json'), 'utf8'))

// Order = document order of the canvas sections. [module, editor title, Ohio section scheme]
const MODULES = [
  ['hero', 'Hero · ¿Dónde termina mi pauta?', 'dark'],
  ['confianza', 'Partners y clientes', 'dark'],
  ['problema', 'El problema · 3 ≠ 1', 'dark'],
  ['solucion', 'Cómo lo resolvemos · la señal', 'dark'],
  ['plataformas', 'Plataformas · explorador', 'dark'],
  ['creatividad', 'Creatividad que aprende · carrera', 'dark'],
  ['autodiagnostico', 'Por qué ahora · autodiagnóstico', 'dark'],
  ['recibes', 'Qué recibes · bitácora e informe', 'dark'],
  ['condiciones', 'Sin letra chica', 'dark'],
  ['diagnostico', 'Diagnóstico · formulario y preguntas', 'dark'],
]

/* ---------- 0. Evaluate the canvas logic (one render per state) ---------- */

const bodyHtml = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('</x-dc>'))
const scriptTag = source.match(/<script type="text\/x-dc"[^>]*data-props='([^']*)'[^>]*>([\s\S]*?)<\/script>/)
const propsDecl = JSON.parse(scriptTag[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'"))
const props = {}

for (const [k, v] of Object.entries(propsDecl)) if (v && 'default' in v) props[k] = v.default

class DCLogic { constructor(p) { this.props = p || {}; this.state = {} } setState(s) { Object.assign(this.state, s) } }
const Component = new Function('DCLogic', scriptTag[2] + '\nreturn Component;')(DCLogic)

const valsFor = state => {
  const inst = new Component(props)

  Object.assign(inst.state, state || {})

  return inst.renderVals()
}

const lookup = (expr, scope) => {
  expr = expr.trim()
  if (expr === 'true') return true
  if (expr === 'false') return false

  return expr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope)
}

const interp = (s, scope) => s.replace(/\{\{([^}]+)\}\}/g, (_, e) => { const v = lookup(e, scope);

 

return v == null || typeof v === 'function' ? '' : String(v) })

function render(state) {
  const vals = valsFor(state)
  const $r = cheerio.load('<div id="__root">' + bodyHtml + '</div>', { decodeEntities: false }, false)

  const walk = (node, scope) => {
    for (const child of [...$r(node).contents()]) {
      if (child.type === 'text') { child.data = interp(child.data, scope); continue }
      if (child.type !== 'tag') continue

      if (child.name === 'sc-if') {
        const v = lookup($r(child).attr('value').replace(/[{}]/g, ''), scope)

        if (v) { walk(child, scope); $r(child).replaceWith($r(child).contents()) } else $r(child).remove()
        continue
      }

      if (child.name === 'sc-for') {
        const list = lookup($r(child).attr('list').replace(/[{}]/g, ''), scope) || []
        const as = $r(child).attr('as')
        const tpl = $r(child).html()

        const parts = list.map((item, i) => {
          const holder = cheerio.load('<div id="__h">' + tpl + '</div>', { decodeEntities: false }, false)
          const inner = $r('<div></div>').append(holder('#__h').contents())

          walk(inner[0], Object.assign({}, scope, { [as]: item, $index: i }))

          return inner.html()
        })

        $r(child).replaceWith(parts.join('\n'))
        continue
      }

      for (const [k, v] of Object.entries(child.attribs || {})) {
        if (/^on[A-Z]/.test(k)) { delete child.attribs[k]; continue }
        if (v.includes('{{')) child.attribs[k] = interp(v, scope)
      }

      walk(child, scope)
    }
  }

  walk($r('#__root')[0], vals)

  return $r('#__root').html()
}

const base = render({ platform: 'g' })
const $ = cheerio.load(base, { decodeEntities: false }, false)

/* ---------- 1. Expand the dynamic parts ---------- */

const tabCss = []

// Platform explorer: one panel per tab, pressed look generated from the canvas' own on/off styles.
{
  const vals = valsFor({ platform: 'g' })
  const on = vals.tabs[0].style
  const off = vals.tabs[1].style
  const sel = '[data-gh-tabs="plataforma"] [data-gh-tab]'

  tabCss.push(`${sel}{${off};cursor:pointer}`, `${sel}[aria-pressed="true"]{${on}}`)
  const group = $('#plataformas [role="group"]').first()

  group.attr('data-gh-tabs', 'plataforma')
  group.find('button').each((i, b) => { $(b).removeAttr('style').attr('data-gh-tab', '').attr('aria-pressed', i === 0 ? 'true' : 'false') })

  const panelOf = html => cheerio.load(html, { decodeEntities: false }, false)('#plataformas .split-r').first()
  const panels = ['g', 'm', 't', 'l'].map(p => $.html(panelOf(render({ platform: p })).removeClass('swap')))
  const current = $('#plataformas .split-r').first()

  current.replaceWith(`<div data-gh-panels="plataforma">${panels.map((p, i) => `<div data-gh-panel${i ? ' hidden' : ''}>${p}</div>`).join('\n')}</div>`)
}

// Self-diagnosis: the server renders state 0; performance-landing.js keeps score, orbit and result.
{
  const section = $('#autodiagnostico')
  const sel = '[data-gh-quiz] [data-gh-answer]'

  tabCss.push(`${sel}{background:transparent;color:#ffffff;border:1.5px solid rgba(255,255,255,0.35)}`, `${sel}[aria-pressed="true"]{background:#ffffff;color:#001a33;border:1.5px solid #ffffff}`)
  section.attr('data-gh-quiz', '')
  section.find('.auto-q').attr('data-gh-q', '')
  section.find('.auto-q button').each((i, b) => { $(b).removeAttr('style').attr('data-gh-answer', i % 2 === 0 ? 'yes' : 'no').attr('aria-pressed', 'false') })
  const svg = section.find('svg[role="img"]').first()

  svg.attr('data-gh-quiz-orbit', '')
  const paths = svg.find('path')

  paths.eq(0).attr('data-gh-quiz-arc', '').attr('d', 'M 130 20')
  paths.eq(1).attr('data-gh-quiz-trail', '').attr('d', 'M 130 20')
  svg.find('circle').eq(1).attr('data-gh-quiz-halo', '')
  svg.find('circle').eq(2).attr('data-gh-quiz-sphere', '')
  svg.attr('aria-label', '0 de 5 señales de que tu pauta pierde dinero')
  section.find('span').filter((_, el) => $(el).text().trim() === '0').first().attr('data-gh-quiz-score', '')
  const result = section.find('p[aria-live="polite"]').first()

  const messages = [
    'Responde las cinco. Cada sí mueve la esfera una señal.',
    'Tu pauta va bien encaminada. Un diagnóstico te dice dónde escalar.',
    'Tu pauta pierde señal. Corregirla suele ser lo más rentable que puedes hacer este trimestre.',
    'Tu pauta aprende de lo que no vende. Empecemos por ahí.',
  ]

  // The four messages are editable copy; the script shows the one the score selects.
  result.attr('data-gh-quiz-result', '').html(messages.map((m, i) => `<span data-gh-quiz-msg="${i}"${i ? ' hidden' : ''}>${m}</span>`).join(''))
}

// Mobile dock: lives in the hero module (fixed); the page layer hoists the form timeline to <body>.
{
  const dock = $('nav.mbar')

  $('section.hero').append(dock.clone())
  dock.remove()
}

// Diagnosis: the governed Growth Form renderer owns fields, steps, consent, submit and the success state.
{
  const form = $('form.form-card')

  form.replaceWith(`<div class="form-card card-pad gh-performance-form-card" role="region" aria-labelledby="form-h">
<p style="margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #33506b">Diagnóstico de tu pauta</p>
<p id="form-h" style="margin: 8px 0 0; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 740; letter-spacing: -0.03em; font-size: clamp(28px, 2.6vw, 34px); line-height: 1.05; color: #001a33">Cuéntanos de tu pauta</p>
<p style="margin: 6px 0 4px; font-size: 14px; color: #33506b">Toma 2 minutos. Los campos con * son obligatorios.</p>
<gh-growth-form></gh-growth-form>
<p class="trust"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"></path><path d="M9 12l2 2 4-4"></path></svg>Te responde una persona del equipo en un día hábil. Tus datos no se comparten.</p>
</div>`)
}

if ($('sc-if, sc-for').length) throw new Error('Unexpanded canvas control left')
if (/\{\{[^}]+\}\}/.test($.html())) throw new Error('Unresolved binding left in the markup')

// Editable collections: FAQ rows (FAQPage is built from them at render time); the first one opens.
$('#diagnostico details.faq').each((i, el) => { $(el).attr('data-gh-repeat', 'faq'); if (i === 0) $(el).attr('open', '') })

const sections = $('section')

if (sections.length !== MODULES.length) throw new Error(`Expected ${MODULES.length} sections, found ${sections.length}`)
sections.each((i, el) => { $(el).attr('data-gh-module', MODULES[i][0]) })

/* ---------- 2–3. Schemas, templates and scoped stylesheet (shared core) ---------- */

const SERVICE_DEFAULTS = {
  schema_service_name: 'Performance marketing',
  schema_service_type: 'Performance marketing y publicidad digital',
  schema_service_description: 'Agencia de performance marketing que opera Google Ads, Meta, TikTok y LinkedIn para que cada campaña aprenda de las ventas y oportunidades reales, medidas en el sitio y en el CRM, con las cuentas a nombre del cliente.',
  schema_audience: 'Equipos de marketing de marcas de consumo, e-commerce y B2B',
  // The five countries the visible FAQ names.
  schema_area_served: 'Chile, México, Colombia, Perú, Estados Unidos',
  // One component per line, only what the page itself shows; becomes Service.hasOfferCatalog (no prices).
  schema_service_catalog: [
    'Medición y señal de conversión',
    'Gestión de Google Ads',
    'Gestión de Meta Ads',
    'Gestión de TikTok Ads',
    'Gestión de LinkedIn Ads para B2B',
    'Pruebas de creatividad',
    'Optimización semanal y reporte mensual en ventas',
    'Diagnóstico de performance',
  ].join('\n'),
}

const result = compileSourceLedLanding({
  landing: 'performance',
  sourceDir: sourceDir,
  source,
  assets,
  $,
  modules: MODULES,
  tabCss,
  formModule: 'diagnostico',
  serviceModule: 'diagnostico',
  faq: { repeaters: ['faq'], question: 'f001_subtitulo', answer: 'f002_descripcion' },
  serviceDefaults: SERVICE_DEFAULTS,
  pageLayer: true,
})

console.log(JSON.stringify(result, null, 2))
