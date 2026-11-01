/**
 * TASK-2051 — Tablet board (768–1099 px), requested by the operator on 2026-10-24 («diseña uno de tablet»).
 *
 * The tablet board is the approved desktop board recomposed for the tablet width: same components, same data
 * contract (`portada`), same logic, its own composition layer. It is generated from the frozen desktop canvas so it
 * can never drift from it: (1) its own ids (two boards live on one page), (2) root class `v3t`, (3) the tablet
 * composition CSS below, appended to the board's stylesheet. Output: source/Tablet-v3.dc.html, also published as a
 * board of the canvas «Portada Blog Efeonce» for review.
 *
 * Composition at the 820 px reference (iPad portrait), fluid from 768 to 1099:
 *   hero 820 high, copy over a reading gradient, title at 62 %, no «next» card;
 *   ask in two columns with a smaller Spark; Glitch header stacked, Flash on its own row over three back issues;
 *   event card in one column (key art as a banner on top, countdown in four columns under its label);
 *   rail cards at 82 %; topics as a centred orbit with the six topics in a grid under it; archive and
 *   subscription in one column.
 */
const fs = require('node:fs')
const path = require('node:path')

const SRC = path.join(__dirname, 'source')

/** Desktop id → tablet id. Bijective; desktop ids never appear in the tablet board. */
const IDS = {
  'v3-q': 't3-q',
  'v3-res': 't3-res',
  'v3-rail': 't3-rail',
  'v3-mail': 't3-mail',
  'gx-mail': 'gxt-mail',
  'ev-mail': 'evtb-mail',
  'ev-h': 'evtb-h',
  glitch: 't-glitch',
  eventos: 't-eventos',
  temas: 't-temas',
  archivo: 't-archivo',
  suscripcion: 't-suscripcion',
}

function swapIds(src, map) {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length).map(k => k.replace(/-/g, '\\-'))
  const re = new RegExp(`(?<=["'#])(${keys.join('|')})(?=["'])`, 'g')

  return src.replace(re, m => map[m])
}

const toTablet = src => swapIds(src, IDS)
const toDesktop = src => swapIds(src, Object.fromEntries(Object.entries(IDS).map(([a, b]) => [b, a])))

const TABLET_CSS = `
/* ═══ Tablet (768–1099): composición propia sobre los componentes del escritorio ═══ */
.v3t .w{padding:0 40px}
/* 0 · slider */
.v3t .hs{height:820px}
.v3t .hs-par::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,26,51,.94) 0%,rgba(0,26,51,.62) 42%,rgba(0,26,51,0) 74%);pointer-events:none}
.v3t .hs-copy{bottom:150px}
.v3t .hs-title{zoom:.62}
.v3t .hs-copy p{font-size:18px!important;max-width:480px!important}
.v3t .hs-next{display:none}
.v3t .hs-bar{gap:24px;bottom:32px}
.v3t .hs-bar > div:first-child{gap:12px!important}
.v3t .hs-seg > span:last-child > span:last-child{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* 3 · pregúntale al blog */
.v3t .hs + section{padding:96px 0 88px!important}
.v3t .hs + section > .w{grid-template-columns:minmax(0,1fr) minmax(0,200px)!important;gap:24px!important;align-items:start!important}
.v3t .hs + section h2{zoom:.68}
.v3t .hs + section form.sf{margin-top:36px!important;height:72px!important;padding:0 8px 0 24px!important}
.v3t .hs + section figure{margin-top:72px!important}
.v3t .hs + section figcaption{text-align:left!important}
/* 4 · Glitch */
.v3t #t-glitch{padding:96px 0!important}
.v3t #t-glitch > img{width:300px!important;right:-48px!important;top:300px!important}
.v3t #t-glitch > div:first-child{width:600px!important;height:600px!important;right:-180px!important;top:180px!important}
.v3t #t-glitch .w > div:first-child{flex-direction:column;align-items:flex-start!important;gap:28px!important}
.v3t #t-glitch .gxw{align-items:flex-start}
.v3t #t-glitch .w > a.lnk{margin-top:72px!important;max-width:min(620px,68%)!important}
.v3t #t-glitch .w > a.lnk > p{zoom:.72}
.v3t #t-glitch .w > div:last-child{grid-template-columns:repeat(3,minmax(0,1fr))!important;margin-top:72px!important}
.v3t #t-glitch .w > div:last-child > a:first-child{grid-column:1/-1;margin:28px 0 0!important}
.v3t #t-glitch .w > div:last-child > a:nth-child(2){padding:28px 24px 0 0!important}
.v3t #t-glitch .w > div:last-child .gx-num{zoom:.75}
/* 4b · eventos */
.v3t #t-eventos{padding:96px 0 104px!important}
.v3t .evx{grid-template-columns:minmax(0,1fr);border-radius:32px}
.v3t .evx__side{order:-1}
.v3t .evx__art{min-height:320px}
.v3t .evx__main{padding:44px 40px 44px}
.v3t .evx__main h2{zoom:.74}
.v3t .evcta{flex-wrap:wrap;gap:20px 28px}
.v3t .evband{grid-template-columns:repeat(4,minmax(0,1fr))!important;padding:32px 40px 36px!important}
.v3t .evband > p{grid-column:1/-1;margin-bottom:20px!important}
.v3t .evband > div{padding:4px 0 4px 20px!important}
.v3t .evband > div:nth-child(2){border-left:0!important;padding-left:0!important}
.v3t .evband .idea{zoom:.66}
.v3t .evplus{grid-template-columns:minmax(0,1fr);gap:56px;margin-top:64px}
.v3t .ev-more{grid-template-columns:minmax(0,1fr);gap:56px;margin-top:72px}
/* 5 · riel */
.v3t .hs ~ section .w > h2.idea{zoom:.72}
.v3t .rail{padding:16px 40px 24px;scroll-padding-inline:40px}
.v3t .rc{zoom:.82}
/* 1 · órbita */
.v3t #t-temas{padding:96px 0 88px!important}
.v3t .stage{width:auto;height:auto;max-width:1100px;padding:0 40px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:24px;row-gap:4px}
.v3t .stage > div:first-child{position:static!important;width:auto!important;grid-column:1/-1}
.v3t .stage > div:first-child h2{zoom:.8}
.v3t .stage .ring{position:relative;left:auto;top:auto;grid-column:1/-1;grid-row:2;justify-self:center;width:min(560px,100%);height:auto;aspect-ratio:1;margin:40px 0 24px}
.v3t .core{position:relative;left:auto;top:auto;grid-column:1/-1;grid-row:2;align-self:center;justify-self:center;width:min(330px,60%);height:auto}
.v3t .core .swap{zoom:.74}
.v3t .lab{position:relative!important;left:auto!important;right:auto!important;top:auto!important;width:auto!important;align-items:flex-start!important;text-align:left!important;padding:14px 4px!important;border-top:1px solid rgba(207,228,250,.16)}
.v3t .lab .nm{font-size:24px}
.v3t .lab .nm{white-space:normal!important}
.v3t .lab .bar{align-self:flex-start!important}
/* 6 · archivo */
.v3t #t-archivo{padding:96px 0!important}
.v3t .arch{grid-template-columns:minmax(0,1fr);gap:48px}
.v3t .arch > div:first-child{position:static!important}
.v3t .arch > div:first-child > p.idea{zoom:.7}
.v3t .arch-row{grid-template-columns:84px minmax(0,1fr) 150px}
.v3t .arch-row .idea{font-size:24px!important}
/* 7 · suscripción */
.v3t #t-suscripcion{padding:96px 0 104px!important}
.v3t .marq .idea{zoom:.7}
.v3t #t-suscripcion > .w{grid-template-columns:minmax(0,1fr)!important;gap:40px!important;margin-top:44px!important}
`

function makeTablet() {
  let src = fs.readFileSync(path.join(SRC, 'Portada-v3.dc.html'), 'utf8')

  src = toTablet(src)
  src = src.replace('<title>Portada del blog v3 · escritorio</title>', '<title>Portada del blog v3 · tablet</title>')
  src = src.replace(`data-props='{"$preview":{"width":1440,"height":10250}}'`, `data-props='{"$preview":{"width":820,"height":10400}}'`)
  src = src.replace('<div class="v3">', '<div class="v3 v3t">')
  src = src.replace('\n</style>', '\n' + TABLET_CSS + '</style>')

  for (const must of ['<div class="v3 v3t">', 'v3t .hs{height:820px}', '"width":820']) if (!src.includes(must)) throw new Error('Tablet transform failed: ' + must)
  if (/(["'#])(v3-q|v3-rail|gx-mail|ev-mail)["']/.test(src)) throw new Error('Desktop id left in the tablet board')

  return src
}

if (require.main === module) {
  const out = makeTablet()

  fs.writeFileSync(path.join(SRC, 'Tablet-v3.dc.html'), out)
  console.log('Tablet-v3.dc.html', out.length, 'bytes')
}

module.exports = { makeTablet, toTablet, toDesktop, IDS }
