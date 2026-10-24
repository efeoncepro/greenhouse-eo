/**
 * TASK-2051 — Server/browser parity: the PHP renderer of the plugin (EOBH_Template + EOBH_View) must emit exactly
 * the HTML of the browser runtime's first render (dc-runtime.js + canvas logic) for the same data and clock. Byte
 * equality, no normalization: the browser patch on load must be a no-op.
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { parseDcFile } = require('./lib/dc-template.cjs')
const { loadRuntime, loadComponent, FROZEN_NOW, RUNTIME_DIR } = require('./lib/render-node.cjs')

const PLUGIN = path.join(RUNTIME_DIR, 'wp-content/plugins/eo-blog-home')
const SRC = path.join(__dirname, 'source')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'eobh-parity-'))

// Variants exercise the branches the approved fixture does not: another default topic and year order, the event
// hidden or without seats, a single-post topic, an archive year that shows everything, and the countdown at zero.
const variants = {
  base: d => d,
  branches: d => ({
    ...d,
    topicDefault: d.topics[d.topics.length - 1].key,
    years: [...d.years].reverse(),
    event: { ...d.event, showSeats: false, startMs: 0 },
    glitch: { ...d.glitch, back: d.glitch.back.slice(0, 1) },
  }),
  noEvent: d => ({ ...d, event: { ...d.event, show: false } }),
  // A pinned Efeonce announcement (format «Novedad», operator 2026-10-24) leads the slider.
  photo: d => ({ ...d, slides: [{ ...d.slides[0], authorName: 'Julio Reyes', authorInitials: 'JR', authorPhoto: 'https://efeoncepro.com/wp-content/uploads/2024/07/avatar-150x150.png' }, ...d.slides.slice(1)] }),
  liveSub: d => ({ ...d, subscribe: { ...d.subscribe, live: true, formKey: '6bc62588-a4a0-4214-9501-13b0c2948c81', surface: 'fhsf-efeonce-blog-subscription', base: 'https://greenhouse.efeoncepro.com' } }),
  noForm: d => ({ ...d, subscribe: { ...d.subscribe, live: false, formKey: '', surface: '', base: '' } }),
  novedad: d => ({ ...d, slides: [{ ...d.slides[0], fmt: 'nove', fmtLabel: 'Novedad', topic: 'Novedades', cta: 'Leer la novedad', scrim: true }, ...d.slides.slice(1)] }),
}

const CASES = [
  ['Portada-v3', 'portada', 'fixture.json'],
  ['Tablet-v3', 'tablet', 'fixture.json'],
  ['Movil-v3', 'movil', 'fixture.mobile.json'],
]

let failed = 0
const cases = []

for (const [board, slug, fixture] of CASES) for (const [variant, make] of Object.entries(variants)) {
  const data = make(JSON.parse(fs.readFileSync(path.join(SRC, fixture), 'utf8')))
  const file = path.join(TMP, `${slug}-${variant}.json`)

  fs.writeFileSync(file, JSON.stringify(data))

  // The browser side renders the AST the plugin ships (with its build transforms) with the board's canvas logic.
  const runtime = loadRuntime()
  const Component = loadComponent(parseDcFile(fs.readFileSync(path.join(SRC, `${board}.bound.dc.html`), 'utf8')).logic, runtime)
  const ast = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'assets/generated', `${slug}.ast.json`), 'utf8'))
  const js = runtime.renderToString(Component, ast, { data })

  cases.push({ name: `${slug}-${variant}`, board: slug, now: FROZEN_NOW, data, html: js })
  const php = execFileSync('php', [path.join(__dirname, 'fidelity/php-render.php'), PLUGIN, slug, file, String(FROZEN_NOW)], { encoding: 'utf8', maxBuffer: 64 << 20 })

  if (js === php) {
    console.log(`✓ ${board} [${variant}]: PHP = browser first render (${php.length} bytes)`)
    continue
  }

  failed++
  let i = 0

  while (i < js.length && js[i] === php[i]) i++
  console.log(`✗ ${board}: first difference at ${i}`)
  console.log('  js :', js.slice(Math.max(0, i - 160), i + 160))
  console.log('  php:', php.slice(Math.max(0, i - 160), i + 160))
}

// --write-fixtures: the browser renders become the expected output of the runtime repo's own PHP test
// (tests/eo-blog-home.test.php), so that repo checks parity without greenhouse-eo.
if (!failed && process.argv.includes('--write-fixtures')) {
  const dir = path.join(RUNTIME_DIR, 'tests/fixtures/blog-home')

  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'cases.json'), JSON.stringify(cases) + '\n')
  console.log('fixtures →', path.join(dir, 'cases.json'), cases.length, 'cases')
}

process.exit(failed ? 1 : 0)
