// Prueba «El oficio a la vista»: selección AXIS opcional sobre el objeto + logo centrado sobre el lecho.
// Uso: node componer-oficio.mjs <plate> <out> '<json opcional selección>'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const REPO = '/Users/jreye/Documents/greenhouse-eo'
const require = createRequire(REPO + '/package.json')
const sharp = require('sharp'); const fontkit = require('fontkit')
const { resolveCollaborationSelectionIntent } = await import(pathToFileURL(require.resolve('@efeoncepro/axis-ui-contracts')).href)
const { renderCollaborationSelection } = await import(pathToFileURL(REPO + '/scripts/creative/layout-compiler/axis-advertising.mjs').href)
const [PLATE, OUT, SEL] = process.argv.slice(2)
const { width: W, height: H } = await sharp(PLATE).metadata()
const bold = fontkit.openSync(REPO + '/src/assets/fonts/Poppins-Bold.ttf')
const shape = (text, size) => { const run = bold.layout(text); const sc = size / bold.unitsPerEm; let x = 0, paths = ''
  run.glyphs.forEach((g, i) => { const d = g.path.toSVG(); if (d) paths += `<path d="${d}" transform="translate(${(x + run.positions[i].xOffset * sc).toFixed(2)} 0) scale(${sc} ${-sc})"/>`; x += run.positions[i].xAdvance * sc }); return { paths, advance: x } }
const layers = []
// Logo centrado sobre el lecho, color por contraste
const rel = (r, g, b) => { const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const lw = Math.round(Math.min(W, H) * Number(process.env.LOGO ?? 0.20)), lh = Math.round(lw * 196.68 / 837.07), left = Math.round((W - lw) / 2), top = Math.round(0.935 * H - lh / 2)
const { data } = await sharp(PLATE).extract({ left, top, width: lw, height: lh }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const Ls = []; for (let i = 0; i < data.length; i += 3) Ls.push(rel(data[i], data[i + 1], data[i + 2])); Ls.sort((a, b) => a - b)
const white = 1.05 / (Ls.at(-1) + 0.05), navy = (Ls[0] + 0.05) / (rel(2, 60, 112) + 0.05), useWhite = white >= navy
layers.push({ input: await sharp(`${REPO}/public/branding/${useWhite ? 'logo-negative.svg' : 'logo-full.svg'}`, { density: 600 }).resize(lw, lh).png().toBuffer(), left, top })
let selInfo = null
if (SEL) {
  const s = JSON.parse(SEL)
  const manifest = resolveCollaborationSelectionIntent({ targetId: 'obra', targetKind: 'object', variant: 'eight-handles', padding: s.padding ?? 'standard', overlay: 'subtle',
    cursors: s.cursors.map(c => ({ ...c, targetId: 'obra', action: 'select', participantKind: 'role' })).concat([{ id: 'local', kind: 'local', targetId: 'obra', anchor: s.local ?? 'bottom-end', action: 'select' }]) })
  const r = renderCollaborationSelection({ manifest, targetBounds: s.box, canvas: { width: W, height: H }, measureLabel: (l, size) => shape(l, size).advance,
    presentation: { collaboratorScale: Number(process.env.CSCALE ?? 1.8), localCursorScale: 1.2, participantColors: s.colors } })
  const svgSel = r.overlay.replace(/<text x="(-?[\d.]+)" y="(-?[\d.]+)" fill="([^"]+)" font-family="[^"]*" font-size="([\d.]+)" font-weight="700">([^<]*)<\/text>/g,
    (_, x, y, fill, size, label) => `<g fill="${fill}" transform="translate(${x} ${y})">${shape(label.replaceAll('&amp;', '&'), Number(size)).paths}</g>`)
  if (/<text/.test(svgSel)) throw new Error('quedó <text>')
  if (!r.evidence.withinCanvas) throw new Error('fuera del lienzo ' + JSON.stringify(r.evidence.cursorEvidence?.map(c => c.labelBounds)))
  layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svgSel}</svg>`), left: 0, top: 0 })
  selInfo = { dentroDelLienzo: r.evidence.withinCanvas }
}
await sharp(PLATE).composite(layers).png().toFile(OUT)
console.log(OUT, 'logo', useWhite ? 'blanco' : 'navy', (useWhite ? white : navy).toFixed(2) + ':1', selInfo ? 'selección OK' : '')
