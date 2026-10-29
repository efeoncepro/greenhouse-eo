/**
 * Source-led compiler for the Home (/, rediseño 2026-10-28 «La órbita × Pingback»).
 *
 * Reads inicio-source/Main.dc.html (the approved canvas «Home Efeonce en órbita» without its drawn navigation: the
 * site's global navigation and the Ohio footer frame the page), evaluates its DCLogic once, expands every state the
 * canvas swaps at runtime (hero words, descriptions and captions, AEO questions and answer states, Greenhouse views,
 * method steps, testimonials, comparison columns, the FAQ panel) into static editable markup and emits one schema +
 * template per section into the eo-elementor-widgets plugin: includes/inicio/{schemas,templates},
 * assets/css/inicio-landing.css. Behaviour lives in assets/js/inicio-landing.js (hand-written, reads only the DOM).
 * Stages 2–3 live in lib/source-led-compiler.cjs. It never touches WordPress.
 * Re-run after changing the source, then node verify-source-led-compilers.cjs.
 */
const fs = require('node:fs')
const path = require('node:path')

const cheerio = require('cheerio')

const { compileSourceLedLanding } = require('./lib/source-led-compiler.cjs')

const sourceDir = path.join(__dirname, 'inicio-source')
const rawSource = fs.readFileSync(path.join(sourceDir, 'Main.dc.html'), 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(sourceDir, 'assets.json'), 'utf8'))

// The canvas styles its root wrapper as `.page`; on the site every module root is `.gh-inicio`, which the core
// reaches through the `body` selector. The rest of the stylesheet stays as approved.
const source = rawSource.replace(/<style>([\s\S]*?)<\/style>/, (_, css) => '<style>' + css.replace(/\.page(?=[\s{:,.>*])/g, 'body') + '</style>')

// Order = document order. [module, editor title, Ohio section scheme]
const MODULES = [
  ['hero', 'Hero · ¿Qué necesita tu marketing?', 'dark'],
  ['marcas', 'Marcas y plataformas', 'light'],
  ['motor', 'De trabajar por separado a un solo motor', 'light'],
  ['lineas', 'Cinco especialidades · líneas de servicio', 'dark'],
  ['trabajo', 'Del desafío al trabajo hecho', 'light'],
  ['aeo', 'Efeonce | AEO · pregunta en vivo', 'dark'],
  ['agentes', 'Agentes con contexto · Sparks', 'light'],
  ['greenhouse', 'Tu cuenta en Greenhouse', 'dark'],
  ['metodo', 'Nuestro método', 'dark'],
  ['respaldo', 'Testimonios, alianzas y comparación', 'light'],
  ['faq', 'Preguntas frecuentes', 'dark'],
  ['agenda', 'Conversemos · agenda', 'light'],
]

/* ---------- 0. Evaluate the canvas logic (default state) ---------- */

const bodyHtml = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('</x-dc>'))
const scriptTag = source.match(/<script type="text\/x-dc"[^>]*data-props='([^']*)'[^>]*>([\s\S]*?)<\/script>/)

class DCLogic { constructor(p) { this.props = p || {}; this.state = {} } setState(s) { Object.assign(this.state, typeof s === 'function' ? s(this.state) : s) } }
const C = new Function('DCLogic', scriptTag[2] + '\nreturn { Component, LINES, ENGINES, QUOTES, GH, CURVE, STEPS, CMP_LABELS, CMP_THEM, CMP_US, CMP_NAMES, FAQ, curvePath, LOGOS, TOOLS, ROW_A, ROW_B };')(DCLogic)
const vals = new C.Component({}).renderVals()

const lookup = (expr, scope) => {
  expr = expr.trim()
  if (expr === 'true') return true
  if (expr === 'false') return false

  return expr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope)
}

const interp = (s, scope) => s.replace(/\{\{([^}]+)\}\}/g, (_, e) => { const v = lookup(e, scope); return v == null || typeof v === 'function' ? '' : String(v) })

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
      if (/^on[A-Z]/.test(k) || k === 'ref') { delete child.attribs[k]; continue }
      if (v.includes('{{')) child.attribs[k] = interp(v, scope)
    }

    walk(child, scope)
  }
}

walk($('#__root')[0], vals)

/* ---------- 1. Expand the dynamic parts ---------- */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const one = (sel, ctx) => { const n = ctx ? ctx.find(sel) : $(sel); if (n.length !== 1) throw new Error(`Expected one ${sel}, found ${n.length}`); return n }

// The canvas wraps everything in `.page`; the modules are its sections. The logo band sits between hero and motor.
{
  const page = one('#__root > div.page')

  one('div.band-wrap', page).wrap('<section class="band-sec" aria-label="Marcas y plataformas"></section>')
  page.replaceWith(page.contents())
}

// Hero: the five answers, descriptions and captions are editable spans; inicio-landing.js rotates them and splits
// the visible word into letters. The <h1> keeps the full question plus the first answer as accessible text.
{
  const hero = one('section#top')

  hero.attr('data-gh-hero', '')
  // The visible question sits above as its own paragraph; the <h1> carries it with every answer for crawlers and screen
  // readers, while the letters are decorative. The five answers live in a <template> (editable, outside the page text).
  const all = C.LINES.map(l => l.word.toLowerCase())
  const sr = '¿Qué necesita tu marketing? ' + all.slice(0, -1).join(', ').replace(/^./, c => c.toUpperCase()) + ' y ' + all[all.length - 1] + '.'

  one('p.q', hero).attr('aria-hidden', 'true')
  one('h1.answer', hero).html('<span class="sr">' + esc(sr) + '</span><span class="word" aria-hidden="true"></span>' +
    '<template data-gh-words>' + C.LINES.map((l, i) => `<span data-gh-word="${i}">${esc(l.word)}</span>`).join('') + '</template>')
  one('p.desc', hero).html(C.LINES.map((l, i) => `<span class="gh-st${i ? '' : ' on'}" data-gh-state="${i}">${esc(l.desc)}</span>`).join(''))
  one('.lens-cap', hero).html(C.LINES.map((l, i) => `<span class="gh-st${i ? '' : ' on'}" data-gh-state="${i}">${esc(l.service)}</span>`).join(''))
}

// Marquees: one editable set per row; the loop copies are created by JS (decorative, aria-hidden).
{
  const marquees = $('section.band-sec .marquee')

  if (marquees.length !== 2) throw new Error('Expected two marquees')
  marquees.each((_, mq) => {
    const tracks = $(mq).children('.mq-track')

    tracks.slice(1).remove()
    const first = tracks.first()

    first.attr('data-gh-loop', '')
    // The canvas doubled the client logos inside the track to fill the band: keep one set.
    const items = first.children()
    const half = $(mq).hasClass('rev') ? items.length : items.length / 2

    items.slice(half).remove()
  })
  $('section.band-sec .marquee').first().find('.mq-track > img').attr('data-gh-repeat', 'logos')
  $('section.band-sec .marquee.rev .mq-track > .tool').attr('data-gh-repeat', 'herramientas')
}

// Motor scene: JS drives the scroll progress; without it the solved state stays readable.
one('section#motor').attr('data-gh-scene', '')

// Lines accordion: one editable row per line, JS opens on click and hover (rows are found by position).
one('section#lineas').attr('data-gh-lines', '')

// Work ribbons: the canvas doubled each row for its loop; keep one set (editable) and let JS copy it.
$('section#trabajo .rb-track').each((_, t) => {
  const figs = $(t).children('figure')

  figs.slice(figs.length / 2).remove()
  $(t).attr('data-gh-loop', '')
})
$('section#trabajo .ribbon').first().find('figure.ad').attr('data-gh-repeat', 'piezas_a')
$('section#trabajo .ribbon.rev').find('figure.ad').attr('data-gh-repeat', 'piezas_b')
$('section#trabajo video').each((_, v) => { $(v).attr({ autoplay: '', muted: '', loop: '', playsinline: '' }).removeAttr('autoPlay').removeAttr('playsInline') })

// AEO: five questions (the category is highlighted), the stage of «Tu marca» per answer, engine icon/name from the
// pressed engine button. JS types the active question letter by letter and moves the rows.
{
  const aeo = one('section#aeo')

  aeo.attr('data-gh-aeo', '')
  aeo.removeAttr('style')
  one('.aeo2-sticky', aeo).removeAttr('style')
  const box = one('.cmp-box', aeo)

  box.find('p.cmp-q').remove()
  box.prepend(C.ENGINES.map((e, i) => `<p class="cmp-q gh-q${i ? '' : ' on'}" data-gh-state="${i}">${esc(e.q[0])}<span class="cat">${esc(e.q[1])}</span>${esc(e.q[2])}</p>`).join(''))
  aeo.find('.eng-b').each((i, b) => { $(b).attr('data-gh-engine', String(i)) })
  aeo.find('.stp-b').each((i, b) => { $(b).attr('data-gh-stage', String(i)) })

  const you = aeo.find('.row.you')

  if (you.length !== 1) throw new Error('AEO: «Tu marca» row not found')
  const txt = ['no aparece en la respuesta.', 'mencionada, sin fuente citada.', 'guías claras, datos propios y casos verificables.']
  const holder = you.find('.rv > span').eq(1)

  holder.html('<b>Tu marca</b>' + txt.map((t, s) => `<span class="gh-yt" data-gh-ystate="${s}">: ${esc(t)}</span>`).join(''))
  aeo.find('.row').each((_, r) => { const rk = /--rk:\s*(\d+)/.exec($(r).attr('style') || ''); $(r).attr('data-gh-row', $(r).hasClass('you') ? 'you' : 'other') })
}

// Agents constellation: JS adds the entrance, cursor parallax and scroll depth.
one('section#agentes').attr('data-gh-cst', '')
$('section#agentes .sk').attr('data-gh-repeat', 'sparks')
// Sparks at mid height sit behind the copy on phones (the copy takes the full width): the host hides them there.
$('section#agentes .sk').each((_, el) => { const y = parseFloat((/--y:\s*([\d.]+)%/.exec($(el).attr('style') || '') || [])[1]); if (y > 20 && y < 84) $(el).addClass('gh-mid') })

// Greenhouse: both views are editable; JS shows one, counts the numbers up and redraws the chart.
{
  const gh = one('section#greenhouse')

  gh.attr('data-gh-gh', '')
  gh.find('.seg button').each((i, b) => { $(b).attr('data-gh-view', i ? 'ger' : 'mkt') })
  const kpis = one('.kpis', gh)
  const view = (k, on) => `<div class="kpis gh-view${on ? ' on' : ''}" data-gh-view-panel="${k}">` +
    C.GH[k].map(x => `<div class="kpi"><div class="l">${esc(x.l)}</div><div class="v" data-gh-count>${esc(x.f(x.v))}</div><div class="d">${esc(x.d)}</div></div>`).join('') + '</div>'

  kpis.replaceWith(view('mkt', true) + view('ger', false))
  gh.find('.dash-row .panel h4').first().html(`<span class="gh-st on" data-gh-state="mkt">Leads calificados por semana</span><span class="gh-st" data-gh-state="ger">Evolución de ingresos</span>`)
  const svg = one('svg.chart', gh)

  svg.find('path.area, path.cur').remove()
  for (const k of ['mkt', 'ger']) {
    const d = C.curvePath(C.CURVE[k])

    svg.append(`<path class="area gh-chart${k === 'mkt' ? ' on' : ''}" data-gh-chart="${k}" d="${d} L520 190 L0 190 Z"></path><path class="cur gh-chart${k === 'mkt' ? ' on' : ''}" data-gh-chart="${k}" pathLength="1" d="${d}"></path>`)
  }
}

// Method: JS moves the sphere with the scroll; the four steps plus the closing state are editable panels.
{
  const m = one('section#metodo')

  m.attr('data-gh-method', '')
  const core = one('.mcore', m)

  core.html(C.STEPS.map((s, i) => `<div class="swapper gh-st${i ? '' : ' on'}" data-gh-state="${i}"><span class="num">Paso ${i + 1} de 4</span><h3>${esc(s[2])}</h3><p>${esc(s[3])}</p></div>`).join('') +
    '<div class="swapper gh-st" data-gh-state="4"><span class="num">Ciclo completo</span><h3>Y empieza el siguiente</h3><p>Con decisiones mejor informadas.</p></div>')
  m.find('.mstep').each((i, s) => { $(s).removeClass('on').attr('data-gh-step', String(i)) })
}

// Respaldo: both SKY testimonials, the comparison columns per alternative.
{
  const r = $('section[aria-label="Respaldo"]')

  if (r.length !== 1) throw new Error('Respaldo section not found')
  r.attr('id', 'respaldo').attr('data-gh-trust', '')
  const qbox = one('.qbox', r)

  qbox.replaceWith(C.QUOTES.map((q, i) => `<div class="qbox gh-st${i ? '' : ' on'}" data-gh-state="${i}"><p class="quote quote-s"><span class="qm" aria-hidden="true">“</span>${esc(q.pre)}<b>${esc(q.bold)}</b>${esc(q.post)}”</p></div>`).join(''))
  r.find('.q-tab').each((i, b) => { $(b).attr('data-gh-quote', String(i)) })
  r.find('.seg button').each((i, b) => { $(b).attr('data-gh-cmp', String(i)) })
  const cmp = one('.cmp', r)

  cmp.attr('data-gh-cmp-table', '0')
  one('.cmp-row.head .them', cmp).html(C.CMP_NAMES.map((n, k) => `<span class="gh-k" data-gh-k="${k}">${esc(n)}</span>`).join(''))
  cmp.find('.cmp-row:not(.head)').each((i, row) => {
    $(row).find('.them').html(C.CMP_THEM.map((col, k) => `<span class="gh-k" data-gh-k="${k}">${esc(col[i])}</span>`).join(''))
  })
}

// FAQ: the list carries every answer (the mobile accordion); the desktop panel mirrors the open one through JS.
{
  const f = one('section#faq')

  f.attr('data-gh-faq', '')
  one('.faq-panel', f).html('<div class="swapper" data-gh-faq-panel></div>')
}

// Agenda: the canvas' sample slots become the site's native scheduler (Growth CTA open_meeting_scheduler, the same
// governed CTA as the global menu); the e-mail stays with its copy button.
{
  const card = one('section#agenda .cta-card')

  card.html(`<h3>Agenda una reunión</h3>
<p>Elige el día y la hora en el agendador de Efeonce. La reunión dura 30 minutos.</p>
<div class="meet-cta"><gh-meeting-cta location="home_agenda"></gh-meeting-cta></div>
<div class="mail">¿Prefieres escribirnos? <code>hola@efeoncepro.com</code><button class="copy" type="button" data-gh-copy="hola@efeoncepro.com">Copiar</button></div>`)
}

// Buttons that only switch state are not form submits.
$('#__root button').each((_, b) => { if (!$(b).attr('type')) $(b).attr('type', 'button') })

if ($('sc-if, sc-for').length) throw new Error('Unexpanded canvas control left')
if (/\{\{[^}]+\}\}/.test($('#__root').html())) throw new Error('Unresolved binding left in the markup')

// Editable collections (one row per item).
$('section#top .line-pill').attr('data-gh-repeat', 'lineas_hero')
$('section#top .lens-inner > img.cast').attr('data-gh-repeat', 'elenco')
$('section#lineas .acc').attr('data-gh-repeat', 'lineas')
$('section#respaldo .fan-card').attr('data-gh-repeat', 'partners')
$('section#faq .faq-list > div').attr('data-gh-repeat', 'faq')

const sections = $('#__root > section')

if (sections.length !== MODULES.length) throw new Error(`Expected ${MODULES.length} sections, found ${sections.length}`)
sections.each((i, el) => { $(el).attr('data-gh-module', MODULES[i][0]) })

/* ---------- 2–3. Schemas, templates and scoped stylesheet (shared core) ---------- */

const result = compileSourceLedLanding({
  landing: 'inicio',
  sourceDir,
  source,
  assets,
  $: cheerio.load($('#__root').html(), { decodeEntities: false }, false),
  modules: MODULES,
  tabCss: [],
  pageLayer: true,
  meeting: {
    modules: ['agenda'],
    cta: 'site-nav-discovery-meeting',
    location: 'home_agenda',
    fallbackUrl: 'https://efeoncepro.com/agenda/',
    fallbackLabel: 'Agenda una reunión',
  },
  repeatLabels: {
    lineas_hero: 'Líneas (hero)', elenco: 'Elenco del hero', logos: 'Marcas', herramientas: 'Plataformas',
    lineas: 'Líneas de servicio', piezas_a: 'Piezas · fila 1', piezas_b: 'Piezas · fila 2', sparks: 'Sparks',
    partners: 'Alianzas', faq: 'Preguntas',
  },
})

console.log(JSON.stringify(result, null, 2))
