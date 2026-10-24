/**
 * Source-led compiler for the Agenda landing (/agenda/, rediseño 2026-10-20, línea gráfica «La órbita»).
 *
 * Reads agenda-source/Main.dc.html (the approved canvas without the drawn scheduler and without site chrome: Ohio's own
 * header and footer frame the page) and emits one schema + template per section into the eo-elementor-widgets plugin:
 * includes/agenda/{schemas,templates}, assets/css/agenda-landing.css. The real scheduler is NOT a module: the publisher
 * places agenda-source/scheduler-host.html (the pilot's host adapter for <efeonce-meeting-scheduler>) in its own HTML
 * widget between the hero and «Cómo es la reunión». Stages 2–3 live in lib/source-led-compiler.cjs. It never touches
 * WordPress. Re-run after changing the source, then node verify-source-led-compilers.cjs.
 */
const fs = require('node:fs')
const path = require('node:path')

const cheerio = require('cheerio')

const { compileSourceLedLanding } = require('./lib/source-led-compiler.cjs')

const sourceDir = path.join(__dirname, 'agenda-source')
const source = fs.readFileSync(path.join(sourceDir, 'Main.dc.html'), 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(sourceDir, 'assets.json'), 'utf8'))

// Order = document order of the canvas sections. [module, editor title, Ohio section scheme]
const MODULES = [
  ['hero', 'Hero · ¿Por dónde empiezo? Por aquí', 'dark'],
  ['como', 'Cómo es la reunión', 'light'],
  ['preguntas', 'Preguntas antes de agendar', 'light'],
  ['cierre', 'Cierre · Elige tu horario', 'dark'],
]

const bodyHtml = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('</x-dc>'))
const $ = cheerio.load('<div id="__root">' + bodyHtml + '</div>', { decodeEntities: false }, false)

if ($('sc-if, sc-for').length) throw new Error('Unexpanded canvas control left')
if (/\{\{[^}]+\}\}/.test($('#__root').html())) throw new Error('Unresolved binding left in the markup')

// Editable collection: FAQ rows; the first one opens.
$('details.faq').each((i, el) => { $(el).attr('data-gh-repeat', 'faq'); if (i === 0) $(el).attr('open', ''); else $(el).removeAttr('open') })

const sections = $('#__root > section')

if (sections.length !== MODULES.length) throw new Error(`Expected ${MODULES.length} sections, found ${sections.length}`)
sections.each((i, el) => { $(el).attr('data-gh-module', MODULES[i][0]) })

const result = compileSourceLedLanding({
  landing: 'agenda',
  sourceDir,
  source,
  assets,
  $: cheerio.load($('#__root').html(), { decodeEntities: false }, false),
  modules: MODULES,
  tabCss: [],
  repeatLabels: { faq: 'Preguntas' },
  pageLayer: true,
})

console.log(JSON.stringify(result, null, 2))
