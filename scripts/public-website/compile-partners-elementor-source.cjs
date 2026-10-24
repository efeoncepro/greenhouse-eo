/**
 * Source-led compiler for the Partners landing (/partnership/, rediseño 2026-10-23, línea gráfica «La órbita»).
 *
 * Reads partners-source/Main.dc.html (the approved canvas «Partners — Efeonce» v14 without its drawn header, footer and
 * the «Quiero ser partner» popup: the site's canonical navigation and Ohio footer frame the page, and the popup arrives
 * as a governed Growth Form in a Growth CTA dialog with TASK-2044/2045; until then the button opens /agenda/, the same
 * destination as the previous page's button) and emits one schema + template per section into the eo-elementor-widgets
 * plugin: includes/partners/{schemas,templates}, assets/css/partners-landing.css. Stages 2–3 live in
 * lib/source-led-compiler.cjs. It never touches WordPress. Re-run after changing the source, then
 * node verify-source-led-compilers.cjs.
 */
const fs = require('node:fs')
const path = require('node:path')

const cheerio = require('cheerio')
const postcss = require('postcss')

const { compileSourceLedLanding } = require('./lib/source-led-compiler.cjs')

const sourceDir = path.join(__dirname, 'partners-source')
const source = fs.readFileSync(path.join(sourceDir, 'Main.dc.html'), 'utf8')
const assets = JSON.parse(fs.readFileSync(path.join(sourceDir, 'assets.json'), 'utf8'))

// Order = document order of the canvas sections. [module, editor title, Ohio section scheme]
const MODULES = [
  ['hero', 'Hero · Hagamos que trabajen juntas', 'dark'],
  ['verdad', 'Que todo converse · Lo que hacemos', 'dark'],
  ['ecosistema', '01 · El ecosistema', 'dark'],
  ['banda', 'Empieza el trabajo', 'dark'],
  ['como', '02 · Cómo trabajamos', 'dark'],
  ['cierre', 'Cierre · Conversemos y Sumémonos', 'dark'],
]

const bodyHtml = source.slice(source.indexOf('</helmet>') + 9, source.indexOf('</x-dc>'))
const $ = cheerio.load('<div id="__root">' + bodyHtml + '</div>', { decodeEntities: false }, false)

if ($('sc-if, sc-for').length) throw new Error('Unexpanded canvas control left')
if (/\{\{[^}]+\}\}/.test($('#__root').html())) throw new Error('Unresolved binding left in the markup')

// Editable collections (one row per item): marquee logos, what we do per platform, partner tiles and steps.
$('.mq-track > div > span').attr('data-gh-repeat', 'marquesina')
$('.svc > .svc-item').attr('data-gh-repeat', 'servicios')
$('.bento > .tile').attr('data-gh-repeat', 'partners')
$('.steps > .step').attr('data-gh-repeat', 'pasos')

// «Sumémonos»: «Quiero ser partner» opens the governed Growth CTA `partners-become-partner` (open_growth_form,
// presentation dialog; TASK-2045). The launcher is the shared native one; without key it degrades to /agenda/.
const partnerButton = $('a.btn-o').filter((_, el) => $(el).text().trim() === 'Quiero ser partner')

if (partnerButton.length !== 1) throw new Error('«Quiero ser partner» button not found')
partnerButton.replaceWith('<div class="partner-cta"><gh-meeting-cta location="partners_close"></gh-meeting-cta></div>')

// The dialog lives in <body> (top layer), outside the landing scope: its skin ships as the unscoped page layer,
// guarded by :has so it only applies on this page.
const skin = postcss.parse(fs.readFileSync(path.join(sourceDir, 'partner-dialog-skin.css'), 'utf8'))

skin.walkRules(rule => {
  for (let p = rule.parent; p; p = p.parent) if (p.type === 'atrule' && /keyframes/.test(p.name)) return
  rule.selectors = rule.selectors.map(sel => 'body:has(.gh-partners) ' + sel)
})
fs.writeFileSync(path.join(sourceDir, 'page.css'), '/* Generated from partner-dialog-skin.css by compile-partners-elementor-source.cjs. Do not edit by hand. */\n' + skin.toString().trim() + '\n')

const sections = $('#__root > section')

if (sections.length !== MODULES.length) throw new Error(`Expected ${MODULES.length} sections, found ${sections.length}`)
sections.each((i, el) => { $(el).attr('data-gh-module', MODULES[i][0]) })

const result = compileSourceLedLanding({
  landing: 'partners',
  sourceDir,
  source,
  assets,
  $: cheerio.load($('#__root').html(), { decodeEntities: false }, false),
  modules: MODULES,
  tabCss: [],
  repeatLabels: { marquesina: 'Logos', servicios: 'Lo que hacemos', partners: 'Partners', pasos: 'Pasos' },
  meeting: { module: 'cierre', cta: 'partners-become-partner', location: 'partners_close', fallbackUrl: 'https://efeoncepro.com/agenda/', fallbackLabel: 'Quiero ser partner' },
  pageLayer: true,
})

console.log(JSON.stringify(result, null, 2))
