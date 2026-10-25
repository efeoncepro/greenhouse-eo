// Órbita oficial (paquete axis-graphic-line, línea Voice, superficie oscura, canal social) alrededor de la tarjeta.
// Escribe el SVG por formato, el CSS de movimiento y el CSS congelado por cuadro (orbitMotionFrameCss), sin reescribir tiempos.
import fs from 'node:fs'
import * as GL from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
import * as M from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/motion.js'
const out = new URL('.', import.meta.url).pathname
const R = 430, info = {}
for (const [fmt, H] of [['feed', 1350], ['story', 1920]]) {
  const cy = (H - 1350) / 2 + 640
  const o = GL.orbitSvg({ width: 1080, height: H, line: 'voice', surface: 'dark', channel: 'social', circle: { cx: 540, cy, r: R }, idPrefix: 'orb-' + fmt })
  fs.writeFileSync(out + `orbita-${fmt}.svg`, o.svg)
  const m = o.svg.match(/data-axis-part="sphere" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="(#[0-9a-f]+)"/i)
  info[fmt] = { cx: 540, cy, r: R, sphere: { x: +m[1], y: +m[2], r: +m[3], color: m[4] } }
}
fs.writeFileSync(out + 'orbit-motion.css', M.ORBIT_MOTION_CSS)
const frames = {}; for (let f = 0; f <= Math.ceil(M.ORBIT_MOTION_TOTAL_MS / (1000 / 24)); f++) { const ms = Math.round(f * 1000 / 24); frames[f] = M.orbitMotionFrameCss(ms, 'orb') }
fs.writeFileSync(out + 'orbit-frames.json', JSON.stringify(frames))
fs.writeFileSync(out + 'orbit-info.json', JSON.stringify({ ...info, totalMs: M.ORBIT_MOTION_TOTAL_MS, answer: GL.answerSphere('Preguntando.') }, null, 1))
console.log(JSON.stringify(info), GL.answerSphere('Preguntando.'))
// Datos inline para la página (file:// no permite fetch)
const svgs = { feed: fs.readFileSync(out + 'orbita-feed.svg', 'utf8'), story: fs.readFileSync(out + 'orbita-story.svg', 'utf8') }
const accent = info.feed.sphere.color
fs.writeFileSync(out + 'orbit-data.js', `window.ORB=${JSON.stringify({ ...info, totalMs: M.ORBIT_MOTION_TOTAL_MS })};window.OFR=${JSON.stringify(frames)};window.ORBSVG=${JSON.stringify(svgs)};window.ANSWER_HTML=${JSON.stringify(GL.answerHtml('Preguntando', accent))};`)
fs.appendFileSync(out + 'orbit-data.js', `window.HEAD=${JSON.stringify(GL.answerSphere('tuyo'))};`)
