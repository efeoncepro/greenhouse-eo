/**
 * Source-led compiler for the Agencia Creativa landing (/agencia-creativa/, page 249582).
 *
 * Reads the approved canvas (creativa-source/Main.dc.html), expands its dynamic parts into static
 * markup and emits one schema + template set per section into the eo-elementor-widgets plugin:
 * includes/creativa/{schemas,templates}, assets/css/creativa-landing.css.
 * It never touches WordPress. Re-run after changing the source; review the diff in the runtime repo.
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const cheerio = require('cheerio')
const postcss = require('postcss')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets')
const sourceFile = path.join(__dirname, 'creativa-source/Main.dc.html')
const source = fs.readFileSync(sourceFile, 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(__dirname, 'creativa-source/assets.json'), 'utf8'))
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex')

const MODULES = [
  ['hero', 'Hero · ¿Mi equipo da para más?', 'dark'],
  ['portafolio', 'Portafolio · Cinta de trabajos', 'light'],
  ['rutas', 'Rutas · Qué te frena hoy', 'dark'],
  ['formatos', 'Formatos · Una idea, todos los formatos', 'light'],
  ['marca', 'Marca · Sistema de marca', 'dark'],
  ['produccion', 'Producción · Set donde estés', 'light'],
  ['ia', 'IA · Sparks y decisión humana', 'dark'],
  ['equipo', 'Equipo · Personas y capacidades', 'light'],
  ['studio', 'Creative Studio · Una sola vista', 'dark'],
  ['compra', 'Cómo se compra · Capacidad', 'light'],
  ['control', 'Control · Quién decide', 'dark'],
  ['prueba', 'Prueba · Caso Sky Airline', 'light'],
  ['diagnostico', 'Diagnóstico · Plan y formulario', 'dark'],
  ['preguntas', 'Preguntas frecuentes', 'light'],
  ['cierre', 'Cierre · ¿Empezamos?', 'dark'],
]

/* ---------- 1. Expand the canvas into static markup ---------- */

const body = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('<script type="text/x-dc"'))
const $ = cheerio.load(body, { decodeEntities: false }, false)
const logic = source.slice(source.indexOf('class Component'))

// Data arrays from the canvas logic (routes and formats), parsed as JS object literals.
const literal = name => {
  const start = logic.indexOf('var ' + name + ' = [')
  const end = logic.indexOf('];', start)

  return Function('"use strict";return ' + logic.slice(logic.indexOf('[', start), end + 1))()
}

const ROUTES = literal('R')
const FORMATS = literal('F')

const fill = (html, prefix, row) => html.replace(new RegExp('\\{\\{' + prefix + '\\.(\\w+)\\}\\}', 'g'), (_, k) => row[k] ?? '')

// 01 Hero: drop the canvas header (the theme header is canonical) and lift the dark wrapper.
const heroWrap = $('header').first().parent()
$('header').first().remove()
const hero = heroWrap.children('section').first()
hero.attr('style', 'background: #001a33; color: #ffffff')
heroWrap.replaceWith(hero)

// 03 Rutas: tabs + panels rendered statically; JS switches them.
{
  const section = $('section#rutas')
  const group = section.find('div[role="group"]').first()
  const tabTpl = $.html(group.find('sc-for').children('button'))
  const panel = group.next()
  const panelTpl = $.html(panel)
  const off = 'min-height: 48px; padding: 12px 20px; border-radius: 9999px; border: 1px solid rgba(207, 228, 250, 0.45); background: transparent; color: #ffffff; font-family: inherit; font-size: 16px; font-weight: 500; cursor: pointer'

  group.attr('data-gh-tabs', 'rutas')
  group.html(ROUTES.map(r => fill(tabTpl, 'item', { ...r, tabStyle: off, pressed: 'false' })
    .replace(/ onClick="[^"]*"/, '').replace('<button', '<button data-gh-tab data-gh-repeat="routes" data-gh-part="tab"')).join('\n'))
  const panels = $('<div data-gh-panels="rutas"></div>')
  panels.html(ROUTES.map(r => fill(panelTpl, 'cur', r).replace(/^<div/, '<div data-gh-panel data-gh-repeat="routes" data-gh-part="panel"')).join('\n'))
  panel.replaceWith(panels)
}

// 04 Formatos: chips + one image per format.
{
  const section = $('section#formatos')
  const group = section.find('div[role="group"]').first()
  const chipTpl = $.html(group.find('sc-for').children('button'))
  const figure = section.find('figure').first()
  const imgTpl = $.html(figure.children('img'))
  const off = 'min-height: 44px; padding: 10px 18px; border-radius: 9999px; border: 1px solid rgba(2, 60, 112, 0.3); background: transparent; color: #023c70; font-family: inherit; font-size: 15px; font-weight: 500; cursor: pointer'

  group.attr('data-gh-tabs', 'formatos')
  group.html(FORMATS.map(f => fill(chipTpl, 'f', { ...f, chipStyle: off, pressed: 'false' })
    .replace(/ onClick="[^"]*"/, '').replace('<button', '<button data-gh-tab data-gh-repeat="formats" data-gh-part="tab"')).join('\n'))
  figure.attr('data-gh-panels', 'formatos')
  figure.html(FORMATS.map(f => fill(imgTpl, 'fmt', f).replace('<img', '<img data-gh-panel data-gh-repeat="formats" data-gh-part="panel"')).join('\n'))
}

// 09 Creative Studio: the canvas imports live screens; the page uses captured screenshots.
$('dc-import').each((_, el) => {
  const name = $(el).attr('name')
  const id = name === 'CS-Home' ? 'cs-home' : 'cs-campaigns'
  const alt = name === 'CS-Home'
    ? 'Pantalla Hoy de Creative Studio: decisiones pendientes, calendario e inventario de piezas'
    : 'Pantalla Campañas de Creative Studio: cada campaña con su estado de creatividad, medios y lanzamiento'

  $(el).parent().replaceWith(`<img src="/_blob/${id}" alt="${alt}" style="width: 100%; height: 100%; object-fit: cover; object-position: left top; display: block">`)
})

// 13 Diagnóstico: the governed Growth Form renderer owns the fields, consent and submit.
{
  const form = $('form.eo-brief')
  const grid = form.find('.eo-brief-grid')

  grid.nextAll().remove()
  grid.replaceWith('<gh-growth-form></gh-growth-form>')
  form.find('*').addBack().each((_, el) => { for (const a of ['onClick', 'onclick']) $(el).removeAttr(a) })
  const host = $('<div></div>')
  host.attr('class', 'eo-brief gh-creativa-form-card')
  host.attr('style', form.attr('style'))
  host.attr('role', 'region')
  host.attr('aria-label', form.attr('aria-label'))
  host.html(form.html())
  form.replaceWith(host)
  $('section#diagnostico a[href="#"]').attr('href', '/agenda/')
}

// 12 Prueba: the meter is drawn server-side from an editable percentage.
$('svg.eo-meter').replaceWith('<gh-meter></gh-meter>')

// Portafolio marquees: one row per piece; JS clones the loop copy.
$('.eo-track, .eo-track-rev').each((i, el) => {
  $(el).children('[aria-hidden="true"]').remove()
  $(el).children('figure').attr('data-gh-repeat', i === 0 ? 'track_a' : 'track_b')
})

// Simple editable collections.
const markRows = (nodes, key) => nodes.each((_, el) => { $(el).attr('data-gh-repeat', key) })

markRows($('section#marca > div').last().children('div'), 'pillars')
markRows($('section#produccion').find('span').filter((_, el) => $(el).children('svg').length === 1 && $(el).parent().children('span').length > 3), 'locations')
markRows($('.eo-caps').children('article'), 'capabilities')
markRows($('section#como-se-compra').find('div.eo-cap'), 'offers')
markRows($('section#como-se-compra').find('h4').parent(), 'commitments')
markRows($('.eo-sa-text ul').children('li'), 'talent_benefits')
markRows($('section#diagnostico ol').children('li'), 'steps')
$('section#preguntas details.eo-faq').each((_, el) => {
  const groupIndex = $(el).parent().index()

  $(el).attr('data-gh-repeat', 'faq_' + (groupIndex + 1))
})

// Assign module identities in document order.
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
    : ({ p: 'Descripción', a: 'Botón', button: 'Botón', summary: 'Pregunta', figcaption: 'Pie', blockquote: 'Testimonio', li: 'Ítem', strong: 'Destacado' }[tag] || 'Texto')

  return kind + ' · ' + excerpt(value)
}

const assetRef = src => {
  const m = /^\/_blob\/([0-9a-z-]+)$/.exec(src || '')

  if (!m) return src
  if (!assets[m[1]]) throw new Error('Unmapped asset ' + src)

  return '@creativa/' + assets[m[1]]
}

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

    if (el.tagName === 'gh-meter') {
      node.replaceWith(token('meter'))

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
      if (!n.parent || ['style', 'script'].includes(n.parent.tagName) || q(n.parent).closest('svg').length) return
      n.data = field(value.trim().length > 90 ? 'textarea' : 'text', textLabel(q, n, value), value)

      return
    }

    (n.children || []).forEach(visit)
  }

  q.root().contents().each((_, el) => visit(el))
  let template = q.html()

  // Namespace SVG ids so a duplicated widget never collides.
  q('svg [id]').each((_, el) => {
    const id = q(el).attr('id')

    template = template.replaceAll('id="' + id + '"', 'id="' + id + '-%%instance%%"').replaceAll('url(#' + id + ')', 'url(#' + id + '-%%instance%%)')
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

const titleFor = (q, el, i) => excerpt(q(el).find('h3,h4,summary,figcaption,strong').first().text() || q(el).attr('alt') || q(el).text()).slice(0, 40) || 'Elemento ' + (i + 1)
const REPEAT_LABELS = {
  track_a: 'Trabajos · Fila superior', track_b: 'Trabajos · Fila inferior', routes: 'Rutas', formats: 'Formatos',
  pillars: 'Pilares del sistema', locations: 'Lugares del set', capabilities: 'Capacidades', offers: 'Formas de compra',
  commitments: 'Compromisos', talent_benefits: 'Beneficios del talento embebido', steps: 'Pasos del plan',
  faq_1: 'Preguntas · Grupo 1', faq_2: 'Preguntas · Grupo 2', faq_3: 'Preguntas · Grupo 3', faq_4: 'Preguntas · Grupo 4',
}

for (const [key, title, scheme] of MODULES) {
  const root = $('section[data-gh-module="' + key + '"]').clone()
  const q = cheerio.load($.html(root), { decodeEntities: false }, false)
  const groups = [...new Set(q('[data-gh-repeat]').map((_, el) => q(el).attr('data-gh-repeat')).get())]
  const repeaters = []

  for (const group of groups) {
    const nodes = q('[data-gh-repeat="' + group + '"]')
    const parts = [...new Set(nodes.map((_, el) => q(el).attr('data-gh-part') || 'item').get())]
    const byPart = Object.fromEntries(parts.map(p => [p, nodes.filter((_, el) => (q(el).attr('data-gh-part') || 'item') === p)]))
    const count = byPart[parts[0]].length
    const rows = []
    const fields = new Map()
    const variants = {}
    const seen = new Map()

    for (let i = 0; i < count; i++) {
      const html = parts.map(p => {
        const el = q(byPart[p].get(i)).clone()

        el.removeAttr('data-gh-repeat').removeAttr('data-gh-part')
        if (p === 'tab') el.attr('aria-pressed', '%%row_first%%')

        return `<gh-part data-part="${p}">${q.html(el)}</gh-part>`
      }).join('')
      const compiled = compileFragment(html, key)
      const split = cheerio.load(compiled.template, { decodeEntities: false }, false)
      const byName = Object.fromEntries(parts.map(p => [p, split('gh-part[data-part="' + p + '"]').html()]))
      const signature = JSON.stringify(byName)
      let variant = seen.get(signature)

      if (!variant) {
        variant = 'layout_' + seen.size
        seen.set(signature, variant)
        variants[variant] = { label: titleFor(q, byPart[parts[0]].get(i), i), templates: {} }
        for (const p of parts) {
          const file = `${key}--${group}-${variant}${parts.length > 1 ? '-' + p : ''}.html`

          variants[variant].templates[p] = file
          emit('includes/creativa/templates/' + file, byName[p])
        }
      }

      compiled.fields.forEach(f => { if (!fields.has(f.key)) fields.set(f.key, f) })
      rows.push({ _id: crypto.createHash('sha1').update(key + group + i).digest('hex').slice(0, 7), _layout: variant, ...compiled.defaults })
    }

    for (const p of parts) {
      byPart[p].first().before(token('repeat_' + group + (parts.length > 1 ? '__' + p : '')))
      byPart[p].remove()
    }

    if (Object.keys(variants).length === 1) Object.values(variants)[0].label = 'Estándar'
    // Row fields are shared by every row: name them by role, never by the first row's copy.
    const kinds = {}
    const rowFields = [...fields.values()].map(f => {
      const kind = f.label.split(' · ')[0]

      kinds[kind] = (kinds[kind] || 0) + 1

      return { ...f, label: kind + (kinds[kind] > 1 ? ' ' + kinds[kind] : '') }
    })

    repeaters.push({ key: group, label: REPEAT_LABELS[group] || group, parts, fields: rowFields, variants, defaults: rows })
  }

  const compiled = compileFragment(q.html(), key)
  const extra = []
  const extraDefaults = {}

  if (key === 'prueba') {
    extra.push({ key: 'meter_value', type: 'number', label: 'Cifra de la órbita (%)', min: 0, max: 100 }, { key: 'meter_label', type: 'text', label: 'Nombre accesible de la órbita' })
    Object.assign(extraDefaults, { meter_value: 94, meter_label: 'Órbita que mide {value} % de entregas a tiempo' })
  }

  if (key === 'diagnostico') {
    extra.push(
      { key: 'form_key', type: 'text', label: 'Formulario · form key publicado' },
      { key: 'form_surface', type: 'text', label: 'Formulario · surface' },
      { key: 'form_fallback', type: 'textarea', label: 'Formulario · texto sin JavaScript' },
    )
    Object.assign(extraDefaults, { form_key: 'e913d958-2ad7-48a5-8015-dbff53eca4a3', form_surface: 'fhsf-efeonce-creative-diagnostic', form_fallback: 'Este formulario necesita JavaScript. Puedes escribirnos a hola@efeoncepro.com o agendar en efeoncepro.com/agenda.' })
  }

  const definition = {
    schema: 'creativaModule.v1', module: key, title, scheme,
    fields: [...compiled.fields, ...extra], defaults: { ...compiled.defaults, ...extraDefaults },
    repeaters, sourceSha256,
  }

  emit('includes/creativa/templates/' + key + '.html', compiled.template)
  emit('includes/creativa/schemas/' + key + '.json', JSON.stringify(definition, null, 2))
}

/* ---------- 3. Scoped stylesheet ---------- */

const css = source.match(/<style>([\s\S]*?)<\/style>/)[1] + '\n' + fs.readFileSync(path.join(__dirname, 'creativa-source/host.css'), 'utf8')
const ast = postcss.parse(css)

ast.walkRules(rule => {
  for (let p = rule.parent; p; p = p.parent) if (p.type === 'atrule' && /keyframes/.test(p.name)) return
  rule.selectors = rule.selectors.map(s => {
    s = s.replace(/:root|\bbody\b/g, '.gh-creativa')

    return s.startsWith('.gh-creativa') ? s : '.gh-creativa ' + s
  })
})
emit('assets/css/creativa-landing.css', '/* Generated by greenhouse-eo scripts/public-website/compile-creativa-elementor-source.cjs. Do not edit by hand. */\n' + ast.toString())

const usedAssets = [...new Set(written.filter(f => f.startsWith('includes/creativa')).flatMap(f => [...fs.readFileSync(path.join(plugin, f), 'utf8').matchAll(/@creativa\/([\w.-]+)/g)].map(m => m[1])))]
fs.writeFileSync(path.join(__dirname, 'creativa-source/used-assets.json'), JSON.stringify(usedAssets.sort(), null, 2) + '\n')
console.log(JSON.stringify({ files: written.length, modules: MODULES.length, assets: usedAssets.length, sourceSha256 }, null, 2))
