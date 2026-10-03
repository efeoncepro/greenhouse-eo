// Capa de voz de «La órbita» sobre las portadas del spot (marca propia, línea Engine). Pregunta en Poppins 300 con su
// anillo en el acento; respuesta en Bricolage 760 (tracking del token) cerrada con la esfera. La esfera y la firma las
// pinta el paquete de AXIS (`composeGraphicLine` + `answerSphere` de @efeoncepro/axis-graphic-line). El adapter de
// Greenhouse (`pnpm creative:orbit:render`) está fijado al contrato 0.3.1 y rechaza el 0.5.0 instalado (2026-10-03);
// aquí sólo se dibujan las palabras con las fuentes reales y se mide el contraste sobre los píxeles finales.
// La escena ya trae su órbita (el vórtice de luz): no se agrega otra (una sola órbita por pieza).
//   node componer-voz-orbita.mjs
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { efeonceGraphicLine as G } from '@efeoncepro/axis-tokens'
import { composeGraphicLine, answerSphere } from '@efeoncepro/axis-graphic-line'
const require = createRequire(import.meta.url)
const ROOT = '/Users/jreye/Documents/greenhouse-eo'
const sharp = require(`${ROOT}/node_modules/sharp`)
const fontkit = require(`${ROOT}/node_modules/fontkit`)
const D = path.dirname(new URL(import.meta.url).pathname)
const ENGINE = Object.values(G.lines).find(l => l.key === 'engine')
const ACCENT = ENGINE.accentOnDark, SOFT = G.slogan.leadColor.onDark, INK = '#ffffff'
const pop = fontkit.openSync(`${ROOT}/src/assets/fonts/Poppins-Light.ttf`)
const bric = fontkit.openSync(`${ROOT}/src/assets/fonts/BricolageGrotesque-Variable.ttf`).getVariation({ wght: G.type.answer.weight, opsz: 96, wdth: 100 })
const TRACK = Number.parseFloat(G.type.answer.tracking)
const shape = (text, font, size, track = 0) => {
  const run = font.layout(text), k = size / font.unitsPerEm; let x = 0, d = ''
  run.glyphs.forEach((g, i) => { const p = run.positions[i]; const s = g.path.toSVG(); if (s) d += `<path d="${s}" transform="translate(${(x + p.xOffset * k).toFixed(2)} 0) scale(${k} ${-k})"/>`; x += p.xAdvance * k + (i < run.glyphs.length - 1 ? track * size : 0) })
  return { d, w: x }
}
const COPY = { question: '¿La IA te nombra cuando preguntan por ti?', answer: 'Mídelo' }
// x, y = esquina superior del bloque; q/a = cuerpo de pregunta y respuesta (respuesta ≥ 3× pregunta); sigY opcional.
const PIEZAS = [
  { id: 'ig-b', plate: 'compuestos/ig-b.png', x: 0.075, y: 0.055, q: 52, a: 210 },
  { id: 'historia', plate: 'compuestos/historia.png', x: 0.075, y: 0.145, q: 54, a: 220, sigY: 0.79 },
  { id: 'li-a', plate: 'compuestos/li-a.png', x: 0.068, y: 0.15, q: 44, a: 180 },
  { id: 'li-b', plate: 'compuestos/li-b.png', x: 0.068, y: 0.15, q: 44, a: 180 }
]
const relLum = (r, g, b) => { const c = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b) }
const worstContrast = async (plateBuf, box, inkL) => {
  const { data, info } = await sharp(plateBuf).extract(box).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const r = []; for (let i = 0; i < data.length; i += 3) { const l = relLum(data[i], data[i + 1], data[i + 2]); r.push((Math.max(l, inkL) + 0.05) / (Math.min(l, inkL) + 0.05)) }
  r.sort((a, b) => a - b); return +r[Math.floor(r.length * 0.01)].toFixed(2)
}
const out = path.join(D, 'orbita'); fs.mkdirSync(out, { recursive: true })
const report = []
for (const p of PIEZAS) {
  const meta = await sharp(path.join(D, p.plate)).metadata(), W = meta.width, H = meta.height
  if (p.a < 3 * p.q) throw new Error(`${p.id}: respuesta < 3× pregunta`)
  const x = Math.round(p.x * W), qTop = Math.round(p.y * H)
  // Pregunta: anillo (0,42 em, trazo 0,06 em, separación 0,35 em) y texto, como la receta del paquete.
  const ringD = 0.42 * p.q, ringStroke = Math.max(1, 0.06 * p.q), qBase = qTop + Math.round(p.q * 0.95)
  const q = shape(COPY.question, pop, p.q), qx = x + ringD + 0.35 * p.q
  const qSvg = `<circle cx="${(x + ringD / 2).toFixed(1)}" cy="${(qBase - 0.08 * p.q - ringD / 2 - 0.25 * p.q).toFixed(1)}" r="${((ringD - ringStroke) / 2).toFixed(1)}" fill="none" stroke="${ACCENT}" stroke-width="${ringStroke.toFixed(1)}"/><g fill="${SOFT}" transform="translate(${qx.toFixed(1)} ${qBase})">${q.d}</g>`
  const aTop = qBase + Math.round(p.q * 0.55), aBase = aTop + Math.round(p.a * 0.78)
  const a = shape(COPY.answer, bric, p.a, TRACK)
  const aSvg = `<g fill="${INK}" transform="translate(${x} ${aBase})">${a.d}</g>`
  const texts = [
    { id: 'question', x, y: qTop, w: Math.round(qx - x + q.w), h: Math.round(p.q * 1.25), content: COPY.question, svg: qSvg },
    { id: 'answer', x, y: aTop, w: Math.round(a.w), h: Math.round(p.a * 0.95), content: COPY.answer, svg: aSvg, fontSize: p.a, baseline: aBase, lastChar: COPY.answer.at(-1) }
  ]
  const intent = { canvas: { width: W, height: H, line: 'engine', surface: 'dark', channel: 'social' }, elements: [
    { kind: 'voice', id: 'voice', questionId: 'question', answerId: 'answer', answerText: COPY.answer }, { kind: 'signature', id: 'firma' } ] }
  const dir = path.join(out, p.id); fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'intent.json'), JSON.stringify(intent, null, 1))
  const ASSETS = `${ROOT}/node_modules/@efeoncepro/axis-brand-assets/assets/`
  const { svg: gl, manifest } = composeGraphicLine(intent, { assetBase: ASSETS })
  // Esfera de la respuesta: diámetro y hueco óptico desde los tokens (answerSphere), en el acento de la línea.
  const sph = answerSphere(COPY.answer), sd = sph.diameterEm * p.a
  const sphere = `<circle cx="${(x + a.w + sph.gapEm * p.a + sd / 2).toFixed(1)}" cy="${(aBase - sd / 2).toFixed(1)}" r="${(sd / 2).toFixed(1)}" fill="${manifest.palette.accent}"/>`
  // Firma del paquete; sin fondo propio (la escena es el fondo). En la historia sube a la zona segura (sigY).
  let body = gl.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect width="[^"]+" height="[^"]+" fill="[^"]+"\/>/, '')
  // El rasterizador no carga un href a archivo local: el logo oficial se incrusta como data URI (mismo archivo).
  body = body.replace(/href="([^"]+\.svg)"/g, (m, f) => `href="data:image/svg+xml;base64,${fs.readFileSync(f.replace(/^file:\/\//, '')).toString('base64')}"`)
  const img = body.match(/<image[^>]*>/)?.[0] ?? ''
  const sig = img ? { x: +img.match(/ x="([\d.]+)"/)[1], y: +img.match(/ y="([\d.]+)"/)[1], w: +img.match(/width="([\d.]+)"/)[1], h: +img.match(/height="([\d.]+)"/)[1] } : null
  if (sig && p.sigY) { const ny = Math.round(p.sigY * H); body = body.replace(img, img.replace(/ y="[\d.]+"/, ` y="${ny}"`)); sig.y = ny }
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">${body}${qSvg}${aSvg}${sphere}</svg>`
  fs.writeFileSync(path.join(dir, 'piece.svg'), overlay)
  await sharp(Buffer.from(overlay), { limitInputPixels: false }).png().toFile(path.join(dir, 'piece.png'))
  const res = JSON.stringify({ accent: manifest.palette.accent, contrato: manifest.contract?.version })
  const final = await sharp(path.join(D, p.plate)).composite([{ input: path.join(dir, 'piece.png') }]).png().toBuffer()
  fs.writeFileSync(path.join(dir, `${p.id}.png`), final)
    const plate = fs.readFileSync(path.join(D, p.plate))
  const clip = b => ({ left: Math.max(0, Math.round(b.x)), top: Math.max(0, Math.round(b.y)), width: Math.min(W - Math.round(b.x), Math.round(b.w)), height: Math.min(H - Math.round(b.y), Math.round(b.h)) })
  report.push({ id: p.id, render: res, contraste: {
    pregunta: await worstContrast(plate, clip(texts[0]), relLum(...SOFT.match(/\w\w/g).map(h => parseInt(h, 16)))),
    respuesta: await worstContrast(plate, clip(texts[1]), 1),
    firma: sig ? await worstContrast(plate, clip(sig), 1) : null }, firma: sig && { x: sig.x, y: sig.y, w: sig.w, h: sig.h }, ratio: +(p.a / p.q).toFixed(2) })
}
console.log(JSON.stringify(report, null, 1))
