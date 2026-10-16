/**
 * Source-led compiler for the HubSpot services landing v2 (/servicios-contratar-hubspot/, page 244079).
 *
 * Reads the approved canvas (hubspot-v2-source/Main.dc.html, design artifact K5kub2AHMQzB1sAwACe9X9 of 2026-10-16),
 * resolves its editor-only parts (hero variants, interactive form mock) and emits one schema + template per section
 * into the eo-elementor-widgets plugin: includes/hubspot-v2/{schemas,templates}, assets/css/hubspot-v2-landing.css.
 * Same contract as the Agencia de Medios compiler (compile-medios-elementor-source.cjs). It never touches WordPress.
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const cheerio = require('cheerio')
const postcss = require('postcss')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets')
const sourceDir = path.join(__dirname, 'hubspot-v2-source')
const source = fs.readFileSync(path.join(sourceDir, 'Main.dc.html'), 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(sourceDir, 'assets.json'), 'utf8'))
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex')

// Order = document order of the canvas sections. [module, editor title, Ohio section scheme]
const MODULES = [
  ['hero', 'Hero · ¿Mi IA conoce mi negocio?', 'dark'],
  ['marquesina', 'Marquesina · los cuatro resultados', 'dark'],
  ['numeros', 'Efeonce en números y clientes', 'dark'],
  ['punto', '¿En qué punto estás?', 'dark'],
  ['diferencia', 'La diferencia · comparativo', 'dark'],
  ['resultados', 'Tres capas y cuatro resultados', 'dark'],
  ['riesgo', 'Te quitamos el riesgo', 'dark'],
  ['agentes', 'Capa de coordinación · agentes', 'dark'],
  ['metodo', 'Cómo trabajamos', 'dark'],
  ['seguridad', 'Seguridad y privacidad', 'dark'],
  ['caso', 'Caso ANAM', 'dark'],
  ['partner', 'Partner Gold de HubSpot', 'dark'],
  ['preguntas', 'Preguntas frecuentes', 'dark'],
  ['agenda', 'Agenda · evidencia y formulario', 'dark'],
]

/* ---------- 1. Resolve the canvas into static markup ---------- */

const body = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('<script type="text/x-dc"'))
const $ = cheerio.load(body, { decodeEntities: false }, false)

// Header and footer are Ohio's (canonical site chrome); the canvas only leaves comments in their place.
$('header, footer').remove()

const ifs = expr => $('sc-if').filter((_, el) => $(el).attr('value') === '{{ ' + expr + ' }}' || $(el).attr('value') === '{{' + expr + '}}')

// Hero: the published pair is «¿Mi IA conoce mi negocio? Ahora sí» (operator, 2026-10-16); the other canvas variants are editor-only.
ifs('pairMore').remove()
ifs('pairFriday').remove()
ifs('pairContext').each((_, el) => { $(el).replaceWith($(el).html()) })

// Agenda: the governed Growth Form renderer owns fields, steps, consent, submit and the success state.
{
  const form = $('section#agenda form')
  const trust = form.find('div').filter((_, el) => /Sin presentación de ventas/.test($(el).text()) && $(el).children('span').length === 3).first().clone()

  trust.attr('style', 'display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; margin-top: 22px; padding: 14px 16px; border-radius: 16px; border: 1px solid rgba(2,60,112,0.16); background: #ffffff; color: #023c70; font-size: 13px')
  const card = $('<div class="formcard gh-hsv2-form-card" role="region" aria-labelledby="form-h"></div>')

  card.attr('style', 'padding: 40px 38px; border-radius: 28px; background: #f7f8f6; color: #023c70; box-shadow: 0 40px 100px rgba(0,0,0,0.5)')
  card.append('<p id="form-h" style="margin: 0; font-family: \'Bricolage Grotesque\', sans-serif; font-size: 30px; font-weight: 760; letter-spacing: -0.03em; color: #023c70">Agenda tu reunión de alcance</p><p style="margin: 6px 0 22px; font-size: 14px; color: #5c5866">Tres pasos cortos. Te respondemos en un día hábil.</p><gh-growth-form></gh-growth-form>').append(trust)
  form.replaceWith(card)
}

if ($('sc-if').length) throw new Error('Unexpanded sc-if left: ' + $('sc-if').length)
if (/\{\{\s*\w+\s*\}\}/.test($.html())) throw new Error('Unresolved binding left in the markup')

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

  return '@hubspotv2/' + assets[m[1]]
}

const styleAssets = html => html.replace(/url\((['"]?)\/_blob\/([0-9a-f]{32})\1\)/g, (_, quote, id) => {
  if (!assets[id]) throw new Error('Unmapped style asset ' + id)

  return `url(${quote}%%asset_base%%${assets[id]}${quote})`
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

    if (node.attr('href') && el.tagName === 'a') node.attr('href', field('url', 'Destino · ' + excerpt(node.text()), { url: node.attr('href') }))

    for (const a of ['aria-label', 'placeholder', 'title']) {
      if (!node.attr(a) || q(el).closest('svg').length || node.attr(a).includes('%%')) continue
      node.attr(a, field('text', 'Nombre accesible · ' + excerpt(node.attr(a)), node.attr(a)))
    }
  })

  const visit = n => {
    if (n.type === 'text') {
      const value = n.data

      if (!value.trim() || value.includes('%%')) return
      // Decorative glyphs (aria-hidden marks, the FAQ «+») stay in the template, not in the editor.
      if (!n.parent || ['style', 'script'].includes(n.parent.tagName) || q(n.parent).closest('[aria-hidden="true"]').length) return
      // SVG text (the measure label) is part of the drawing, but its words are editable copy.
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
  schema_service_name: 'Implementación y operación de HubSpot',
  schema_service_type: 'Implementación de HubSpot CRM y agentes de IA',
  schema_service_description: 'Implementamos y operamos HubSpot, la Agentic Customer Platform: Smart CRM, Hubs, workspaces y agentes de IA para generar demanda, cerrar negocios, superar las expectativas de los clientes y acelerar el crecimiento.',
  schema_audience: 'Equipos de marketing, ventas, servicio y operaciones',
  // Five operating markets (operator, 2026-10-16: «no operamos solo en Chile»).
  schema_area_served: 'Chile, Colombia, Perú, México, Estados Unidos',
  // One component per line, only what the page itself shows; becomes Service.hasOfferCatalog (no prices).
  schema_service_catalog: [
    'Genera demanda: Marketing Hub, Content Hub y AEO',
    'Cierra negocios: Sales Hub, Sales Workspace y Revenue Hub',
    'Supera las expectativas de tus clientes: Service Hub y Customer Agent',
    'Acelera el crecimiento: Smart CRM, Data Hub e integraciones',
    'Diseño y operación de agentes de IA',
    'Blueprint de implementación',
    'Operación continua de HubSpot',
  ].join('\n'),
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

      el.removeAttr('data-gh-repeat').removeAttr('open').attr('data-gh-open', '%%row_first%%')
      const compiled = compileFragment(q.html(el), key)
      let variant = seen.get(compiled.template)

      if (!variant) {
        variant = 'layout_' + seen.size
        seen.set(compiled.template, variant)
        const file = `${key}--${group}-${variant}.html`

        variants[variant] = { label: titleFor(q, node, i), templates: { item: file } }
        emit('includes/hubspot-v2/templates/' + file, compiled.template)
      }

      compiled.fields.forEach(f => { if (!fields.has(f.key)) fields.set(f.key, f) })
      rows.push({ _id: crypto.createHash('sha1').update(key + group + i).digest('hex').slice(0, 7), _layout: variant, ...compiled.defaults })
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
    const form = JSON.parse(fs.readFileSync(path.join(sourceDir, 'form.json'), 'utf8'))

    extra.push(
      { key: 'form_key', type: 'text', label: 'Formulario · form key publicado' },
      { key: 'form_surface', type: 'text', label: 'Formulario · surface' },
      { key: 'form_fallback', type: 'textarea', label: 'Formulario · texto sin JavaScript' },
    )
    Object.assign(extraDefaults, {
      form_key: form.formKey,
      form_surface: form.surface,
      form_fallback: 'Este formulario necesita JavaScript. Puedes escribirnos a hola@efeoncepro.com o agendar en efeoncepro.com/agenda.',
    })
  }

  if (key === 'preguntas') {
    const faqFields = repeaters.find(r => r.key === 'faq').fields
    const question = faqFields.find(f => f.label.startsWith('Pregunta')).key
    const answer = faqFields.find(f => f.label.startsWith('Descripción')).key

    structuredData = { faq: { repeaters: ['faq'], question, answer }, service: true }
    extra.push(
      { key: 'schema_service_name', type: 'text', label: 'Datos estructurados · nombre del servicio' },
      { key: 'schema_service_type', type: 'text', label: 'Datos estructurados · tipo de servicio' },
      { key: 'schema_service_description', type: 'textarea', label: 'Datos estructurados · descripción del servicio' },
      { key: 'schema_audience', type: 'text', label: 'Datos estructurados · audiencia' },
      { key: 'schema_area_served', type: 'text', label: 'Datos estructurados · países (separados por coma)' },
      { key: 'schema_service_catalog', type: 'textarea', label: 'Datos estructurados · componentes del servicio (uno por línea)' },
    )
    Object.assign(extraDefaults, SERVICE_DEFAULTS)
  }

  const definition = {
    schema: 'hubspotV2Module.v1', module: key, title, scheme,
    fields: [...compiled.fields, ...extra], defaults: { ...compiled.defaults, ...extraDefaults },
    repeaters, ...(structuredData ? { structuredData } : {}), sourceSha256,
  }

  emit('includes/hubspot-v2/templates/' + key + '.html', compiled.template)
  emit('includes/hubspot-v2/schemas/' + key + '.json', JSON.stringify(definition, null, 2))
}

/* ---------- 3. Scoped stylesheet ---------- */

const canvasCss = source.match(/<style>([\s\S]*?)<\/style>/)[1]
const css = styleAssets(canvasCss).replaceAll('%%asset_base%%', '../img/hubspot-v2/') + '\n' + fs.readFileSync(path.join(sourceDir, 'host.css'), 'utf8')
const ast = postcss.parse(css)

ast.walkRules(rule => {
  for (let p = rule.parent; p; p = p.parent) if (p.type === 'atrule' && /keyframes/.test(p.name)) return
  rule.selectors = rule.selectors.map(s => {
    s = s.replace(/:root|\bhtml\b|\bbody\b/g, '.gh-hsv2')

    return s.startsWith('.gh-hsv2') ? s : '.gh-hsv2 ' + s
  })
})
emit('assets/css/hubspot-v2-landing.css', '/* Generated by greenhouse-eo scripts/public-website/compile-hubspot-v2-elementor-source.cjs. Do not edit by hand. */\n' + ast.toString())

const usedAssets = [...new Set(written.flatMap(f => [...fs.readFileSync(path.join(plugin, f), 'utf8').matchAll(/@hubspotv2\/([\w.-]+)|\.\.\/img\/hubspot-v2\/([\w.-]+)|%%asset_base%%([\w.-]+)/g)].map(m => m[1] || m[2] || m[3])))]

fs.writeFileSync(path.join(sourceDir, 'used-assets.json'), JSON.stringify(usedAssets.sort(), null, 2) + '\n')
console.log(JSON.stringify({ files: written.length, modules: MODULES.length, assets: usedAssets.length, sourceSha256 }, null, 2))
