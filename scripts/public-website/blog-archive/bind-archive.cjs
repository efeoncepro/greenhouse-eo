/**
 * TASK-2055 — Binds the frozen «Archivo del blog» canvas (direction D, approved 2026-10-24) to WordPress data.
 *
 * Input:  source/Archivo-D-<view>-{1440,390}.dc.html (the 12 approved boards, frozen) + source/archive-body.template.html
 * Output: source/Archivo-<view>.reference.dc.html — each approved board with the closed list of deviations applied
 *         source/Archivo.bound.dc.html             — one template for the six views, data from `props.data`
 *
 * The 1440 and 390 boards of a view carry the same markup (the phone rules are emitted twice in the canvas: as a media
 * query and under the `.mob` root class); this script proves it and keeps one reference per view. Every replacement
 * declares how many times it must match, so a changed canvas fails instead of binding the wrong thing.
 * Fidelity proof: `node test-bound-equivalence.cjs` (template + fixture = reference).
 */
const fs = require('node:fs')
const path = require('node:path')

const postcss = require('postcss')

const SRC = path.join(__dirname, 'source')
const VIEWS = ['tema', 'etiqueta', 'autor', 'busqueda', 'tema-vacio', 'busqueda-vacia', 'tema-glitch']
// TASK-2056 — the Glitch variant of the topic view: its canvas CSS is the D CSS plus the `.gl` rules (checked as an exact
// prefix), and its fonts link adds Bricolage's width axis; the bound template takes both (a superset for the D views).
const VARIANT = 'tema-glitch'

function rep(text, from, to, times = 1) {
  const n = typeof from === 'string' ? text.split(from).length - 1 : [...text.matchAll(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g'))].length

  if (n !== times) throw new Error(`Expected ${times} match(es), found ${n}: ${String(from).slice(0, 90)}`)

  return typeof from === 'string' ? text.split(from).join(to) : text.replace(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g'), to)
}

const count = (text, s) => text.split(s).length - 1

/** CSS deviations (shared by reference and template): no `.mob` duplicate; links where the canvas had buttons. */
function deviateCss(css) {
  const ast = postcss.parse(css)

  // 6. The `.mob` rules are the phone media query a second time (for the canvas artboards): drop them.
  ast.walkRules(rule => {
    if (rule.selectors.some(s => s.startsWith('.mob '))) {
      if (!rule.selectors.every(s => s.startsWith('.mob '))) throw new Error('Mixed .mob selector: ' + rule.selector)
      rule.remove()
    }
  })

  let out = ast.toString()

  // 3. Selected state of the filter: links carry aria-current instead of the buttons' aria-pressed.
  out = rep(out, '.segc--n .segc__b[aria-pressed="true"]', '.segc--n .segc__b[aria-current="page"]')
  out = rep(out, ':is(.v3,.m3) .segc__b[aria-pressed="false"]:hover', ':is(.v3,.m3) .segc__b:not([aria-current]):hover')
  if (/segc__b\[aria-pressed/.test(out)) throw new Error('aria-pressed left in the filter CSS')

  // 3. The format filter is made of links (no JS): no underline on the segments.
  out = rep(out, '.fb__m{display:none}', '.fb__m{display:none}\n.segc__b{text-decoration:none}')
  // 3. The author without a profile photo shows initials in the photo's circle (as the home's author circle).
  out = rep(out, '.au__r{margin:', '.au__ph--i{display:grid;place-items:center;background:#023c70;color:#ffffff;font-family:\'Bricolage Grotesque\',sans-serif;font-size:48px;font-weight:700}\n.au__r{margin:')

  // 8. Fluid type (no board between 768 and 1099, nor between 1100 and 1439): the H1 follows the viewport up to the
  // canvas size and shrinks with `--ah-fit` (set by the data for a name whose longest word would not fit its column).
  // At 1440 and 390 the computed sizes are the canvas ones: min(184px, 12.8vw) = 184px, 76px × 1.
  out = rep(out, '.ah__t{margin:16px 0 0;font-size:184px;', '.ah__t{margin:16px 0 0;font-size:calc(min(184px,12.8vw)*var(--ah-fit,1));')
  out = rep(out, '.ah__t--m{font-size:132px;', '.ah__t--m{font-size:calc(min(132px,9.2vw)*var(--ah-fit,1));')
  // Below 390 (no board) the phone sizes follow the viewport too: min(76px, 19.5vw) and min(60px, 15.4vw) are the
  // canvas sizes at 390.
  out = rep(out, '.ah__t{margin-top:12px;font-size:76px;', '.ah__t{margin-top:12px;font-size:calc(min(76px,19.5vw)*var(--ah-fit,1));')
  out = rep(out, '.ah__t--m{font-size:60px;', '.ah__t--m{font-size:calc(min(60px,15.4vw)*var(--ah-fit,1));')
  out += `
@media (min-width:768px) and (max-width:1099.98px){
.w{padding:0 32px}
.ah__t{font-size:calc(13vw*var(--ah-fit,1))}
.ah__t--m{font-size:calc(9.5vw*var(--ah-fit,1))}
.ah__g,.ah__g--f{grid-template-columns:minmax(0,1fr);align-items:start}
.ah--f{padding-bottom:72px}
.hc{margin-bottom:0;max-width:600px}
.ah__side{justify-self:start}
.fb--f .fb__in{max-width:none}
.yg{grid-template-columns:minmax(0,3fr) minmax(0,9fr);gap:40px}
.yg__n{font-size:88px}
.arch-row--x{grid-template-columns:90px minmax(0,1fr) 180px}
.rw__t{font-size:26px}
.mt__g{grid-template-columns:minmax(0,1fr)}
.ot__t{font-size:60px}
}
`

  return out
}

/** Markup deviations of the closed list (README of the direction, TASK-2055 Detailed Spec). */
function deviate(src) {
  // 1. Canonical site header and footer: the canvas stand-ins go away.
  src = rep(src, /\n<div class="nvs" aria-hidden="true">[\s\S]*?\n<\/div>/, '')
  src = rep(src, /\n<footer style="background: #f7f8f6; padding: 64px 16px 72px;">[\s\S]*?<\/footer>/, '')
  // 6. One markup for both widths: the `.mob` root class of the 390 board goes (the media query does its job).
  // (5. The page's <main id="main"> is opened by the plugin's page template around the board, as Ohio's page.php does.)
  src = rep(src, /<div class="v3 arc( gl)?( mob)?" style="position: relative;">/, '<div class="v3 arc$1" style="position: relative;">')
  // 5. Ids prefixed (the site header may use `q`).
  for (const id of ['q', 'ot-h', 'mt-h', 'gl-sub-h']) {
    const n = count(src, `id="${id}"`)

    if (n > 1) throw new Error('Duplicated id ' + id)
    src = src.split(`id="${id}"`).join(`id="eoba-${id}"`).split(`for="${id}"`).join(`for="eoba-${id}"`).split(`aria-labelledby="${id}"`).join(`aria-labelledby="eoba-${id}"`)
  }
  // 3. Format filter without JS: links with aria-current; 4. indicator placed by the server.
  src = src.replace(/<button type="button" class="segc__b" aria-pressed="true">([\s\S]*?)<\/button>/g, '<a href="#" class="segc__b" aria-current="page">$1</a>')
  src = src.replace(/<button type="button" class="segc__b" aria-pressed="false">([\s\S]*?)<\/button>/g, '<a href="#" class="segc__b">$1</a>')
  src = src.split('<span class="segc__ind" aria-hidden="true"></span>').join('<span class="segc__ind" aria-hidden="true" style="transform: translateX(0%);"></span>')
  src = src.split('aria-pressed="true"').join('aria-current="page"').split(' aria-pressed="false"').join('')
  if (src.includes('aria-pressed')) throw new Error('aria-pressed left on a link')
  // 5. TASK-2056: an aria-label on a plain <span> is not exposed (axe aria-prohibited-attr); «#17» reads as is.
  src = src.replace(/<span class="(gl-b|gl-mh__n gl-mh__n--e)" aria-label="[^"]*">/g, '<span class="$1">')
  // 7. Performance without pixel change: the section-front image loads first; the Glitch card image lazily.
  src = src.replace(/(<span class="hc__img[^"]*"><img src="[^"]+" alt="")>/g, '$1 fetchpriority="high">')
  src = src.replace(/(<span class="fc__img"><img src="[^"]+" alt="")>/g, '$1 loading="lazy" decoding="async">')

  return src
}

function splitBoard(src) {
  const helmet = src.indexOf('<helmet>')
  const helmetEnd = src.indexOf('</helmet>') + '</helmet>'.length
  const css = src.match(/<style>([\s\S]*?)<\/style>/)[1]

  return { head: src.slice(0, helmet), helmet: src.slice(helmet, helmetEnd), css, body: src.slice(helmetEnd, src.indexOf('</x-dc>')), tail: src.slice(src.indexOf('</x-dc>')) }
}

let sharedCss = null
let rawShared = null
let boundCss = null
let shell = null

for (const view of VIEWS) {
  const desk = fs.readFileSync(path.join(SRC, `Archivo-D-${view}-1440.dc.html`), 'utf8')
  const mob = fs.readFileSync(path.join(SRC, `Archivo-D-${view}-390.dc.html`), 'utf8')
  const strip = s => s.replace(/<title>[^<]*<\/title>/, '').replace(/"\$preview":\{[^}]*\}/, '').replace(/<div class="v3 arc( gl)? mob"/, '<div class="v3 arc$1"')

  if (strip(desk) !== strip(mob)) throw new Error(`${view}: the 1440 and 390 boards differ beyond the .mob root class`)

  const parts = splitBoard(desk)
  parts.body = deviate(parts.body + '</x-dc>').replace(/<\/x-dc>$/, '')
  const css = deviateCss(parts.css)

  if (view === VARIANT) {
    if (!parts.css.startsWith(rawShared)) throw new Error(`${view}: the variant CSS must extend the D CSS (exact prefix)`)
    boundCss = css
    shell = parts
  } else if (sharedCss === null) {
    sharedCss = css
    rawShared = parts.css
  } else if (sharedCss !== css) throw new Error(`${view}: the canvas CSS differs between views`)

  const out = parts.head + parts.helmet.replace(parts.css, css) + parts.body + parts.tail
  fs.writeFileSync(path.join(SRC, `Archivo-${view}.reference.dc.html`), out)
  console.log(`reference ${view}`)
}

// The bound template: the shared shell (fonts, CSS) + the hand-bound body + logic that renders the data document.
const body = fs.readFileSync(path.join(SRC, 'archive-body.template.html'), 'utf8')
const logic = `<script type="text/x-dc" data-dc-script data-props='{"data":{"editor":null},"$preview":{"width":1440,"height":4000}}'>
class Component extends DCLogic {
  renderVals() { return this.props.data; }
}
</script>`
const bound = shell.head.replace(/<title>[^<]*<\/title>/, '<title>Archivo del blog · plantilla enlazada</title>') + shell.helmet.replace(shell.css, boundCss) + '\n' + body + '</x-dc>\n' + logic + '\n</body>\n</html>\n'

fs.writeFileSync(path.join(SRC, 'Archivo.bound.dc.html'), bound)
console.log('bound template → source/Archivo.bound.dc.html')
