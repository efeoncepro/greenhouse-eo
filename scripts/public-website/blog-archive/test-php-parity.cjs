/**
 * TASK-2055 — Server/browser parity of the archive template: PHP (EOBH_Template) must emit exactly what the browser
 * runtime renders for the same AST and data. Byte equality. The archive ships no browser JS today; parity keeps the
 * option open and proves the PHP port of every branch (variants cover what the canvas fixtures do not show).
 */
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { loadRuntime, RUNTIME_DIR } = require('../blog-v3/lib/render-node.cjs')

const PLUGIN = path.join(RUNTIME_DIR, 'wp-content/plugins/eo-blog-home')
const GEN = path.join(PLUGIN, 'assets/generated')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'eoba-parity-'))
const VIEWS = ['tema', 'etiqueta', 'autor', 'busqueda', 'tema-vacio', 'busqueda-vacia', 'tema-glitch']

const variants = {
  base: d => d,
  page2: d => (d.list ? { ...d, list: { ...d.list, pager: { ...d.list.pager, prev: '/x/', next: null, pages: d.list.pager.pages.map((p, i) => ({ ...p, cur: i === 1 ? 'page' : null })) } } } : d),
  onePage: d => (d.list ? { ...d, list: { ...d.list, pager: { ...d.list.pager, multi: false } } } : d),
  noPhoto: d => (d.author ? { ...d, author: { ...d.author, photo: null, initials: 'JR' } } : d),
  glitchHero: d => (d.hero ? { ...d, hero: { ...d.hero, glitch: true, plain: false, kind: 'Flash' } } : d),
  escaping: d => ({ ...d, crumb: 'A & B <x> "q"', desc: d.desc ? 'Tom & Jerry <b>' : d.desc }),
}

const runtime = loadRuntime()
const Component = class extends runtime.DCLogic { renderVals() { return this.props.data } }
const ast = JSON.parse(fs.readFileSync(path.join(GEN, 'archive.ast.json'), 'utf8'))
let failed = 0
let n = 0

for (const view of VIEWS) {
  const base = JSON.parse(fs.readFileSync(path.join(GEN, `fixture.archive-${view}.json`), 'utf8').split('%%img%%').join('/img'))

  for (const [variant, make] of Object.entries(variants)) {
    const data = make(base)
    const file = path.join(TMP, `${view}-${variant}.json`)

    fs.writeFileSync(file, JSON.stringify(data))
    const js = runtime.renderToString(Component, ast, { data })
    const php = execFileSync('php', [path.join(__dirname, 'fidelity/php-render-archive.php'), PLUGIN, file], { encoding: 'utf8', maxBuffer: 64 << 20 })

    n++
    if (js === php) continue
    failed++
    let i = 0

    while (i < js.length && js[i] === php[i]) i++
    console.log(`✗ ${view} [${variant}]: first difference at ${i}`)
    console.log('  js :', js.slice(Math.max(0, i - 160), i + 160))
    console.log('  php:', php.slice(Math.max(0, i - 160), i + 160))
  }
}

console.log(failed ? `✗ ${failed}/${n} cases differ` : `✓ ${n}/${n} cases: PHP = browser render (byte equality)`)
process.exit(failed ? 1 : 0)
