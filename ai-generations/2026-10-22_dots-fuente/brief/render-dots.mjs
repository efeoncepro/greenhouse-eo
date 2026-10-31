// Renderiza a SVG puro los 25 avatares oficiales de los dots (app ChatGPT macOS) sin ejecutar React:
// copia cada módulo, reemplaza sus importaciones por un runtime JSX mínimo y serializa el árbol.
// Uso: node render-dots.mjs <carpeta webview/assets extraída del app.asar> <carpeta de salida>
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [assetsDir, outDir] = process.argv.slice(2)
const NAMES = ['Aime', 'Appy', 'Bloop', 'Brief', 'Chip', 'Clank', 'Clippy', 'Collab', 'Dailee', 'Digit', 'Dot', 'Fuego',
  'Kit', 'MadamLuminary', 'Mailman', 'Paige', 'Pocket', 'Scout', 'Scribble', 'Starry', 'Stax', 'Tome', 'Whirr', 'Yo', 'Zapp']
const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']

const work = fs.mkdtempSync(path.join(outDir, '.work-'))

fs.writeFileSync(path.join(work, 'stub.mjs'), `
const SENT = Symbol.for('react.memo_cache_sentinel')
let n = 0
export const reset = () => { n = 0 }
const U = {
  c: k => Array(k).fill(SENT),
  useId: () => 'u' + (++n),
  Fragment: '__frag',
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
}
export const FBt = () => U, LNt = () => U, PBt = () => U
export const lazy = f => { let done = false, r; return () => { if (!done) { done = true; r = f() } return r } }
`)

const ATTR = { className: null, children: null, key: null }
const kebab = k => (k.startsWith('data-') || k === 'viewBox' || k === 'gradientUnits' || k === 'filterUnits' ||
  k === 'gradientTransform' || k === 'stdDeviation' || k === 'patternUnits' || k === 'maskUnits' || k === 'clipPathUnits' ||
  k === 'preserveAspectRatio' || k === 'xmlns' || k === 'xlinkHref' || /^(dx|dy|k[1-4]|in2|rx|ry|cx|cy|x[12]|y[12])$/.test(k))
  ? (k === 'xlinkHref' ? 'xlink:href' : k)
  : k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
const esc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function ser(node) {
  if (node == null || node === false || node === true) return ''
  if (Array.isArray(node)) return node.map(ser).join('')
  if (typeof node !== 'object') return esc(node)
  const { type, props = {} } = node
  if (typeof type === 'function') return ser(type(props))
  const kids = ser(props.children)
  if (type === '__frag') return kids
  const attrs = Object.entries(props)
    .filter(([k, v]) => !(k in ATTR) && v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${kebab(k)}="${esc(v)}"`).join('')
  return `<${type}${attrs}>${kids}</${type}>`
}

const stub = await import(pathToFileURL(path.join(work, 'stub.mjs')).href)
const manifest = []
fs.mkdirSync(path.join(outDir, 'svg'), { recursive: true })

for (const name of NAMES) {
  const main = fs.readdirSync(assetsDir).filter(f => f.startsWith(name + '-') && f.endsWith('.js'))
    .find(f => /import\{FBt as/.test(fs.readFileSync(path.join(assetsDir, f), 'utf8').slice(0, 400)) ||
      /from"\.\/app-shared/.test(fs.readFileSync(path.join(assetsDir, f), 'utf8').slice(0, 400)) &&
      fs.readFileSync(path.join(assetsDir, f), 'utf8').includes('data-mascot-part'))
  let src = fs.readFileSync(path.join(assetsDir, main), 'utf8')
  src = src.replace(/import\{n as (\w+)\}from"\.\/rolldown-runtime-[^"]+";/, 'import{lazy as $1}from"./stub.mjs";')
    .replace(/from"\.\/app-shared-[^"]+"/, 'from"./stub.mjs"')
    .replace(/\/\/# sourceMappingURL=.*$/m, '')
  const variantKeys = [...new Set([...src.matchAll(/\b(default|red|orange|yellow|green|blue|purple|pink):\{color0:/g)].map(m => m[1]))]
  const file = path.join(work, name + '.mjs')
  fs.writeFileSync(file, src)
  const mod = await import(pathToFileURL(file).href)
  mod.r()
  const colors = [undefined, ...COLORS.filter(c => variantKeys.includes(c))]
  const entry = { name, source: main, variants: variantKeys, renders: [] }
  for (const color of colors) {
    for (const [size, Comp] of [['large', mod.t], ['small', mod.n]]) {
      stub.reset()
      let svg = ser({ type: Comp, props: { color } })
      svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg" (.*?)xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, 'xmlns="http://www.w3.org/2000/svg" $1')
      const slug = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      const out = `dots-${slug}-${color ?? 'nativo'}-${size}.svg`
      fs.writeFileSync(path.join(outDir, 'svg', out), svg)
      entry.renders.push(out)
    }
  }
  manifest.push(entry)
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
fs.rmSync(work, { recursive: true, force: true })
console.log(manifest.map(m => `${m.name}: ${m.variants.join(',')} → ${m.renders.length} svg`).join('\n'))
