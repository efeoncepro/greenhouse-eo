/**
 * Source-led compiler for the Agencia de Medios landing (/servicios/agencia-de-medios/).
 *
 * Reads the approved canvas (medios-source/Main.dc.html), expands its dynamic parts (sales-model and platform
 * selectors) into static markup and emits one schema + template per section into the eo-elementor-widgets plugin:
 * includes/medios/{schemas,templates}, assets/css/medios-landing.css. Same contract as the Agencia Creativa
 * compiler (compile-creativa-elementor-source.cjs). It never touches WordPress. Re-run after changing the source.
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const cheerio = require('cheerio')
const postcss = require('postcss')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets')
const source = fs.readFileSync(path.join(__dirname, 'medios-source/Main.dc.html'), 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(__dirname, 'medios-source/assets.json'), 'utf8'))
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex')

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

// 16 Agenda: the governed Growth Form renderer owns fields, consent, submit and the success state.
{
  const card = $('section#agenda .formcard')
  // The trust line sat above the canvas submit; the renderer owns the submit, so it closes the card on paper colours.
  const trust = card.find('div[aria-label="Por qué confiar"]').clone()

  trust.attr('style', 'display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; margin-top: 22px; padding: 14px 16px; border-radius: 16px; border: 1px solid rgba(2,60,112,0.16); background: #ffffff; color: #023c70')

  // The renderer paints for light surfaces (color-scheme="light", like the other landings), so the card turns to paper.
  card.empty().append('<p id="form-h" style="margin: 0; font-family: \'Bricolage Grotesque\', sans-serif; font-size: 30px; font-weight: 760; letter-spacing: -0.03em; color: #023c70">Agenda tu diagnóstico</p><p style="margin: 6px 0 22px; font-size: 14px; color: #5c5866">Los campos con * son obligatorios.</p><gh-growth-form></gh-growth-form>').append(trust)
  card.attr('class', 'formcard gh-medios-form-card')
  card.attr('role', 'region').attr('aria-labelledby', 'form-h')
  card.attr('style', 'padding: 40px 38px; border-radius: 28px; background: #f7f8f6; color: #023c70; box-shadow: 0 40px 100px rgba(0,0,0,0.5)')
}

if ($('sc-if').length) throw new Error('Unexpanded sc-if left: ' + $('sc-if').length)
if (/\{\{\w+\}\}/.test($.html())) throw new Error('Unresolved binding left in the markup')

// Editable collections: FAQ rows (FAQPage is built from them at render time).
$('section#faq details').each((_, el) => { $(el).attr('data-gh-repeat', 'faq') })

const sections = $('section')

if (sections.length !== MODULES.length) throw new Error(`Expected ${MODULES.length} sections, found ${sections.length}`)
sections.each((i, el) => { $(el).attr('data-gh-module', MODULES[i][0]) })

/* ---------- 2. Compile each section into schema + template ---------- */

const slug = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24)
const token = key => '%%' + key + '%%'
const excerpt = value => value.replace(/\s+/g, ' ').trim().slice(0, 48)

const textLabel = (q, node, value) => {
  const tag = node.parent.tagName
  const heading = q(node.parent).closest('h1,h2,h3,h4').get(0)

  const kind = heading
    ? { h1: 'Título principal', h2: 'Título', h3: 'Subtítulo', h4: 'Subtítulo' }[heading.tagName]
    : ({ p: 'Descripción', a: 'Botón', button: 'Botón', summary: 'Pregunta', figcaption: 'Pie', blockquote: 'Testimonio', li: 'Ítem', strong: 'Destacado', b: 'Destacado' }[tag] || 'Texto')

  return kind + ' · ' + excerpt(value)
}

const assetRef = src => {
  const m = /^\/_blob\/([0-9a-z-]+)$/.exec(src || '')

  if (!m) return src
  if (!assets[m[1]]) throw new Error('Unmapped asset ' + src)

  return '@medios/' + assets[m[1]]
}

// Inline style values can carry background images; map their blobs too (not editable, versioned with the plugin).
const styleAssets = html => html.replace(/url\((['"]?)\/_blob\/([0-9a-f]{32})\1\)/g, (_, quote, id) => {
  if (!assets[id]) throw new Error('Unmapped style asset ' + id)

  return `url(${quote}%%asset_base%%${assets[id]}${quote})`
})
  // SVG <image> nodes (the isotypes inside the measurement diagrams) are part of the drawing, not editable media.
  .replace(/(<image\b[^>]*?\shref=")\/_blob\/([0-9a-f]{32})"/g, (_, head, id) => {
    if (!assets[id]) throw new Error('Unmapped SVG image ' + id)

    return head + '%%asset_base%%' + assets[id] + '"'
  })

function compileFragment(html, module) {
  const q = cheerio.load(html, { decodeEntities: false }, false)
  const fields = []
  const defaults = {}
  let serial = 0

  const field = (type, label, value, extra = {}) => {
    const key = 'f' + String(++serial).padStart(3, '0') + '_' + slug(label.split(' · ')[0])

    fields.push({ key, type, label, ...extra })
    defaults[key] = value

    return token(key)
  }

  q('*').each((_, el) => {
    const node = q(el)

    for (const attr of Object.keys(el.attribs || {})) if (/^on/i.test(attr)) node.removeAttr(attr)

    if (el.tagName === 'gh-growth-form') {
      node.replaceWith(token('growth_form'))

      return
    }

    if (el.tagName === 'img') {
      node.attr('src', field('media', 'Imagen · ' + (node.attr('alt') || module), { url: assetRef(node.attr('src')), id: 0 }))
      if (node.attr('alt')) node.attr('alt', field('text', 'Texto alternativo · ' + excerpt(node.attr('alt')), node.attr('alt')))
      if (!node.attr('loading') && module !== 'hero') node.attr('loading', 'lazy')
      node.attr('decoding', 'async')
    }

    if (el.tagName === 'video') {
      const label = node.attr('aria-label') || 'Video'

      node.attr('src', field('video', 'Video · ' + excerpt(label), { url: assetRef(node.attr('src')), id: 0 }))
      if (node.attr('poster')) node.attr('poster', field('media', 'Póster del video · ' + excerpt(label), { url: assetRef(node.attr('poster')), id: 0 }))
      if (node.attr('aria-label')) node.attr('aria-label', field('text', 'Nombre accesible del video', node.attr('aria-label')))
    }

    if (el.tagName === 'source' && node.attr('src')) node.attr('src', field('video', 'Video · fuente', { url: assetRef(node.attr('src')), id: 0 }))

    if (node.attr('href') && el.tagName === 'a') node.attr('href', field('url', 'Destino · ' + excerpt(node.text()), { url: node.attr('href') }))

    for (const a of ['aria-label', 'placeholder', 'title']) {
      if (!node.attr(a) || el.tagName === 'video' || q(el).closest('svg').length || node.attr(a).includes('%%')) continue
      node.attr(a, field('text', 'Nombre accesible · ' + excerpt(node.attr(a)), node.attr(a)))
    }
  })

  const visit = n => {
    if (n.type === 'text') {
      const value = n.data

      if (!value.trim() || value.includes('%%')) return
      // Decorative glyphs (aria-hidden arrows, the FAQ «+») stay in the template, not in the editor.
      if (!n.parent || ['style', 'script'].includes(n.parent.tagName) || q(n.parent).closest('svg, [aria-hidden="true"]').length) return
      n.data = field(value.trim().length > 90 ? 'textarea' : 'text', textLabel(q, n, value), value)

      return
    }

    (n.children || []).forEach(visit)
  }

  q.root().contents().each((_, el) => visit(el))
  let template = styleAssets(q.html())

  // Namespace SVG ids so a duplicated widget never collides.
  q('svg [id]').each((_, el) => {
    const id = q(el).attr('id')

    template = template.replaceAll('id="' + id + '"', 'id="' + id + '-%%instance%%"').replaceAll('url(#' + id + ')', 'url(#' + id + '-%%instance%%)').replaceAll('href="#' + id + '"', 'href="#' + id + '-%%instance%%"')
  })

  return { template, fields, defaults }
}

const written = []

const emit = (file, value) => {
  const target = path.join(plugin, file)

  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, value.endsWith('\n') ? value : value + '\n')
  written.push(file)
}

const titleFor = (q, el, i) => excerpt(q(el).find('summary,h3,h4,strong').first().text() || q(el).text()).slice(0, 40) || 'Elemento ' + (i + 1)
const REPEAT_LABELS = { faq: 'Preguntas' }

const SERVICE_DEFAULTS = {
  schema_service_name: 'Agencia de medios',
  schema_service_type: 'Planificación, compra y medición de medios pagados',
  schema_service_description: 'Planificamos, compramos, optimizamos y medimos tu inversión publicitaria en search, social, video, TV conectada, audio, DOOH y retail media, conectada a tus ventas y a tu CRM.',
  schema_audience: 'Equipos de marketing',
  schema_area_served: 'Chile, Colombia, México, Perú',
}

for (const [key, title, scheme] of MODULES) {
  const root = $('section[data-gh-module="' + key + '"]').clone()
  const q = cheerio.load($.html(root), { decodeEntities: false }, false)
  const groups = [...new Set(q('[data-gh-repeat]').map((_, el) => q(el).attr('data-gh-repeat')).get())]
  const repeaters = []

  for (const group of groups) {
    const nodes = q('[data-gh-repeat="' + group + '"]')
    const rows = []
    const fields = new Map()
    const variants = {}
    const seen = new Map()

    nodes.each((i, node) => {
      const el = q(node).clone()

      el.removeAttr('data-gh-repeat')
      // The first FAQ opens by default; that is a row option, not a separate layout.
      const open = el.attr('open') !== undefined

      el.removeAttr('open').attr('data-gh-open', '%%row_first%%')
      const compiled = compileFragment(q.html(el), key)
      let variant = seen.get(compiled.template)

      if (!variant) {
        variant = 'layout_' + seen.size
        seen.set(compiled.template, variant)
        const file = `${key}--${group}-${variant}.html`

        variants[variant] = { label: titleFor(q, node, i), templates: { item: file } }
        emit('includes/medios/templates/' + file, compiled.template)
      }

      compiled.fields.forEach(f => { if (!fields.has(f.key)) fields.set(f.key, f) })
      rows.push({ _id: crypto.createHash('sha1').update(key + group + i).digest('hex').slice(0, 7), _layout: variant, ...compiled.defaults, ...(open ? {} : {}) })
    })

    nodes.first().before(token('repeat_' + group))
    nodes.remove()
    if (Object.keys(variants).length === 1) Object.values(variants)[0].label = 'Estándar'
    const kinds = {}

    const rowFields = [...fields.values()].map(f => {
      const kind = f.label.split(' · ')[0]

      kinds[kind] = (kinds[kind] || 0) + 1

      return { ...f, label: kind + (kinds[kind] > 1 ? ' ' + kinds[kind] : '') }
    })

    repeaters.push({ key: group, label: REPEAT_LABELS[group] || group, parts: ['item'], fields: rowFields, variants, defaults: rows })
  }

  const compiled = compileFragment(q.html(), key)
  const extra = []
  const extraDefaults = {}
  let structuredData

  if (key === 'agenda') {
    extra.push(
      { key: 'form_key', type: 'text', label: 'Formulario · form key publicado' },
      { key: 'form_surface', type: 'text', label: 'Formulario · surface' },
      { key: 'form_fallback', type: 'textarea', label: 'Formulario · texto sin JavaScript' },
    )
    Object.assign(extraDefaults, {
      form_key: process.env.MEDIOS_FORM_KEY || '',
      form_surface: process.env.MEDIOS_FORM_SURFACE || '',
      form_fallback: 'Este formulario necesita JavaScript. Puedes escribirnos a hola@efeoncepro.com o agendar en efeoncepro.com/agenda.',
    })
  }

  if (key === 'preguntas') {
    structuredData = { faq: { repeaters: ['faq'], question: 'f001_pregunta', answer: 'f002_descripcion' }, service: true }
    extra.push(
      { key: 'schema_service_name', type: 'text', label: 'Datos estructurados · nombre del servicio' },
      { key: 'schema_service_type', type: 'text', label: 'Datos estructurados · tipo de servicio' },
      { key: 'schema_service_description', type: 'textarea', label: 'Datos estructurados · descripción del servicio' },
      { key: 'schema_audience', type: 'text', label: 'Datos estructurados · audiencia' },
      { key: 'schema_area_served', type: 'text', label: 'Datos estructurados · países (separados por coma)' },
    )
    Object.assign(extraDefaults, SERVICE_DEFAULTS)
  }

  const definition = {
    schema: 'mediosModule.v1', module: key, title, scheme,
    fields: [...compiled.fields, ...extra], defaults: { ...compiled.defaults, ...extraDefaults },
    repeaters, ...(structuredData ? { structuredData } : {}), sourceSha256,
  }

  emit('includes/medios/templates/' + key + '.html', compiled.template)
  emit('includes/medios/schemas/' + key + '.json', JSON.stringify(definition, null, 2))
}

/* ---------- 3. Scoped stylesheet ---------- */

const canvasCss = source.match(/<style>([\s\S]*?)<\/style>/)[1]
const css = styleAssets(canvasCss).replaceAll('%%asset_base%%', '../img/medios/') + '\n/* Expanded selectors */\n' + tabCss.join('\n') + '\n' + fs.readFileSync(path.join(__dirname, 'medios-source/host.css'), 'utf8')
const ast = postcss.parse(css)

ast.walkRules(rule => {
  for (let p = rule.parent; p; p = p.parent) if (p.type === 'atrule' && /keyframes/.test(p.name)) return
  rule.selectors = rule.selectors.map(s => {
    s = s.replace(/:root|\bhtml\b|\bbody\b/g, '.gh-medios')

    return s.startsWith('.gh-medios') ? s : '.gh-medios ' + s
  })
})
emit('assets/css/medios-landing.css', '/* Generated by greenhouse-eo scripts/public-website/compile-medios-elementor-source.cjs. Do not edit by hand. */\n' + ast.toString())

const usedAssets = [...new Set(written.flatMap(f => [...fs.readFileSync(path.join(plugin, f), 'utf8').matchAll(/@medios\/([\w.-]+)|\.\.\/img\/medios\/([\w.-]+)|%%asset_base%%([\w.-]+)/g)].map(m => m[1] || m[2] || m[3])))]

fs.writeFileSync(path.join(__dirname, 'medios-source/used-assets.json'), JSON.stringify(usedAssets.sort(), null, 2) + '\n')
console.log(JSON.stringify({ files: written.length, modules: MODULES.length, assets: usedAssets.length, sourceSha256 }, null, 2))
