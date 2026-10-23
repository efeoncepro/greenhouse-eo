/**
 * Source-led compiler for the Nosotros landing (/about-us-efeonce/, rediseño 2026-10-23, línea gráfica «La órbita»).
 *
 * Reads nosotros-source/Main.dc.html (the approved canvas «Nosotros — Efeonce» without its drawn header and footer:
 * the site's canonical navigation and Ohio footer frame the page) and emits one schema + template per section into the
 * eo-elementor-widgets plugin: includes/nosotros/{schemas,templates}, assets/css/nosotros-landing.css. Stages 2–3 live
 * in lib/source-led-compiler.cjs. It never touches WordPress. Re-run after changing the source, then
 * node verify-source-led-compilers.cjs.
 */
const fs = require('node:fs')
const path = require('node:path')

const cheerio = require('cheerio')

const { compileSourceLedLanding } = require('./lib/source-led-compiler.cjs')

const sourceDir = path.join(__dirname, 'nosotros-source')
const source = fs.readFileSync(path.join(sourceDir, 'Main.dc.html'), 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(sourceDir, 'assets.json'), 'utf8'))

// Order = document order of the canvas sections. [module, editor title, Ohio section scheme]
const MODULES = [
  ['hero', 'Hero · Lo construimos contigo', 'dark'],
  ['quees', '¿Qué es Efeonce?', 'dark'],
  ['marcas', 'Marcas que crecen con nosotros', 'dark'],
  ['porque', '01 · Nuestro porqué', 'dark'],
  ['como', '02 · Cómo lo hacemos', 'light'],
  ['equipo', '03 · Quiénes lo hacen', 'dark'],
  ['mercados', '¿Dónde trabajamos?', 'dark'],
  ['prueba', '04 · La prueba', 'light'],
  ['partners', 'Partners y testimonios', 'dark'],
  ['founder', '05 · Quién lo dirige', 'dark'],
  ['cierre', 'Cierre · Cuando quieras', 'dark'],
]

const bodyHtml = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('</x-dc>'))
const $ = cheerio.load('<div id="__root">' + bodyHtml + '</div>', { decodeEntities: false }, false)

if ($('sc-if, sc-for').length) throw new Error('Unexpanded canvas control left')
if (/\{\{[^}]+\}\}/.test($('#__root').html())) throw new Error('Unresolved binding left in the markup')

// Editable collections (one row per item): client logos, partner logos, team members, metrics and testimonials.
$('.mq-track > div > span').attr('data-gh-repeat', 'clientes')
$('.partners-grid > div').attr('data-gh-repeat', 'partners')
$('.team-strip > li').attr('data-gh-repeat', 'equipo')
$('.pgrid > .pcell').attr('data-gh-repeat', 'cifras')
$('.tq-grid > figure').attr('data-gh-repeat', 'testimonios')

const sections = $('#__root > section')

if (sections.length !== MODULES.length) throw new Error(`Expected ${MODULES.length} sections, found ${sections.length}`)
sections.each((i, el) => { $(el).attr('data-gh-module', MODULES[i][0]) })

const result = compileSourceLedLanding({
  landing: 'nosotros',
  sourceDir,
  source,
  assets,
  $: cheerio.load($('#__root').html(), { decodeEntities: false }, false),
  modules: MODULES,
  tabCss: [],
  repeatLabels: { clientes: 'Marcas', partners: 'Partners', equipo: 'Equipo', cifras: 'Cifras', testimonios: 'Testimonios' },
})

console.log(JSON.stringify(result, null, 2))
