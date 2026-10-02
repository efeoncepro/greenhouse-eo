// Cuadros reales del spot pDOOH (mupi 1080×1920), pintados con axis-graphic-line sobre la pieza medida lens.story.
import { paintGraphicLine } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { resolveGraphicLineIntent } from '/Users/jreye/Documents/axis-design-system/packages/contracts/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/'
mkdirSync('out-frames', { recursive: true })
const W = 1080, H = 1920, p = GL.pieces.lens.story
const photo = 'data:image/jpeg;base64,' + (await sharp(R + 'ai-generations/2026-09-26_ooh-caminero-lente/plates/D1-mupi-rodaje-en-vivo.png').resize(W, H).jpeg({ quality: 92 }).toBuffer()).toString('base64')
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const logo = 'data:image/svg+xml;base64,' + readFileSync(R + 'node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg').toString('base64')
const T = GL.color.teal
function lens(sweep, zoom) {
  const m = resolveGraphicLineIntent({ canvas: { width: W, height: H, line: 'growth', surface: 'dark', channel: 'social' }, elements: [{ kind: 'lens', id: 'lens', photoId: 'd1', alt: 'x', region: 'upper-center', accentSphere: 'upper-start' }] })
  const el = m.elements[0]
  el.ring = { ...el.ring, strokePx: p.ring.strokePx, opacity: p.ring.opacity }
  el.arc = { ...el.arc, strokePx: p.arc.strokePx, startDeg: p.arc.startDeg, sweepDeg: sweep }
  el.sphere = { ...el.sphere, radiusPx: p.sphereRadiusPx }
  if (el.inside) el.inside = { ...el.inside, zoom }
  return paintGraphicLine(m, { photos: { d1: photo }, background: true, idPrefix: 'f' + sweep + '-' + zoom, circles: { lens: { cx: p.ring.cx, cy: p.ring.cy, r: p.ring.r / (1 + GL.orbit.ringAirRatio) } } }).svg
}
const q = `<p style="position:absolute;left:97px;top:1210px;margin:0;font:300 42px Pop;line-height:1.35;color:#e2e2e2;white-space:nowrap"><span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>¿Cómo va?</p>`
const ans = (sphere, pulse) => `<p style="position:absolute;left:97px;top:1267px;margin:0;font:760 160px Bric;letter-spacing:-.035em;line-height:1.02;color:#fff;white-space:nowrap">En vivo${sphere ? `<span style="position:relative;display:inline-block;width:.2em;height:.2em;border-radius:50%;background:${T};margin-left:.035em">${pulse ? `<span style="position:absolute;left:50%;top:50%;width:1.1em;height:1.1em;margin:-.55em 0 0 -.55em;border:2px solid ${T};border-radius:50%;opacity:.55"></span>` : ''}</span>` : ''}</p>`
const lw = W * 0.35, lh = lw / (837.07 / 196.68)
const sig = `<img src="${logo}" style="position:absolute;left:${(W - lw) / 2}px;top:${H - 97.2 - lh}px;width:${lw}px;height:${lh}px">`
const frames = [
  ['f1', lens(1, 1.25), q + sig],
  ['f2', lens(28, 1.25), q + ans(false) + sig],
  ['f3', lens(50, 1.25), q + ans(true, true) + sig],
  ['f4', lens(50, 1.42), q + ans(true, false) + sig]
]
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
for (const [id, svg, over] of frames) {
  await pg.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}body{margin:0}</style></head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden">${svg}${over}</div></body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.screenshot({ path: `out-frames/${id}.png` })
  await sharp(`out-frames/${id}.png`).resize(540).jpeg({ quality: 86 }).toFile(`out-frames/${id}.jpg`)
}
await b.close(); console.log('ok')
