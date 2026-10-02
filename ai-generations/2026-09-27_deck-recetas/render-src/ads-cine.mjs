// Pruebas publicitarias del registro cine (9:16 y 4:5). Voz de la línea gráfica + firma (logo centrado).
import { answerHtml } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'

const R = '/Users/jreye/Documents/greenhouse-eo/'
const D = R + 'ai-generations/2026-09-27_ads-cine/'
const OUT = D + 'out/'
mkdirSync(OUT, { recursive: true })
const BA = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/'
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const LOGO = 'data:image/svg+xml;base64,' + readFileSync(BA + 'efeonce-logo-negative.svg').toString('base64')
const line = k => GL.lines.find(l => l.key === k).accentOnDark
const ring = c => `<span aria-hidden="true" style="display:inline-block;width:.62em;height:.62em;border-radius:50%;border:.1em solid ${c};box-sizing:border-box;margin-right:.42em;vertical-align:-.04em"></span>`

// Valores de la receta de ads medida (RECETA-POR-FORMATO), escalados de 1152 a 1080 de ancho.
const FMT = {
  '9:16': { W: 1080, H: 1920, top: 0.10, lead: 43, dom: 178 },
  '4:5': { W: 1080, H: 1350, top: 0.075, lead: 41, dom: 164 }
}
const pieces = [
  { id: 'AD1-916-nexa-orbita', plate: 'AD1d-916-nexa-orbita-isotipo', fmt: '9:16', q: '¿Qué hace Efeonce?', a: 'Crecer', line: 'growth' },
  { id: 'AD2-916-revops', plate: 'AD2b-916-revops-mono-isotipo', fmt: '9:16', q: '¿Tu CRM vende contigo?', a: 'Con agentes', line: 'revenue-hubspot' },
  { id: 'AD3-45-aeo', plate: 'AD3b-45-aeo-foco-isotipo', fmt: '4:5', q: '¿Te encuentra la IA?', a: 'Visible', line: 'engine' },
  { id: 'AD4-45-equipo', plate: 'AD4f-45-equipo-isotipo', fmt: '4:5', q: '¿Quién hace crecer tu marca?', a: 'Este equipo', line: 'growth' }
]
const css = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}body{margin:0}</style>`

const b = await chromium.launch({ channel: 'chrome' })
const qa = []
for (const p of pieces) {
  const F = FMT[p.fmt], M = Math.round(F.W * 0.08), maxW = Math.round(F.W * 0.84)
  const logoW = Math.round(Math.min(F.W, F.H) * GL.signature.widthOfShortSide.default)
  const bg = 'data:image/jpeg;base64,' + (await sharp(D + 'plates/' + p.plate + '.png').resize(F.W, F.H, { fit: 'cover' }).jpeg({ quality: 92 }).toBuffer()).toString('base64')
  const pg = await b.newPage({ viewport: { width: F.W, height: F.H } })
  const accent = line(p.line)
  await pg.setContent(`<html><head>${css}</head><body><div id="root" style="position:relative;width:${F.W}px;height:${F.H}px;overflow:hidden;background:${GL.color.dark}">
<img src="${bg}" alt="" style="position:absolute;inset:0;width:${F.W}px;height:${F.H}px">
<div id="voice" style="position:absolute;left:${M}px;top:${Math.round(F.H * F.top)}px;width:${maxW}px">
<p id="q" style="margin:0;font:300 ${F.lead}px/1.2 Pop;color:#F4F6F8">${ring(accent)}${p.q}</p>
<p id="a" style="margin:${Math.round(F.lead * 0.35)}px 0 0 -4px;font:760 ${F.dom}px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;white-space:nowrap;display:inline-block">${answerHtml(p.a, accent)}</p></div>
<img id="logo" src="${LOGO}" alt="Efeonce" style="position:absolute;left:${(F.W - logoW) / 2}px;bottom:${Math.round(Math.min(F.W, F.H) * GL.signature.marginOfShortSide)}px;width:${logoW}px;height:auto">
</div></body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  // La respuesta cabe en el ancho del texto: si no, baja de tamaño (nunca bajo 3× la pregunta).
  const dom = await pg.evaluate(({ maxW, dom, lead }) => {
    const a = document.getElementById('a'); let s = dom
    while (a.getBoundingClientRect().width > maxW && s > lead * 3) { s -= 2; a.style.fontSize = s + 'px' }
    return s
  }, { maxW, dom: F.dom, lead: F.lead })
  const box = await pg.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return { voice: r('voice'), logo: r('logo') } })
  const png = OUT + p.id + '.png'
  await pg.screenshot({ path: png })
  // Contraste de la firma: luminancia media del lecho bajo la caja del logo, contra blanco.
  const L = box.logo
  const { data } = await sharp(D + 'plates/' + p.plate + '.png').resize(F.W, F.H, { fit: 'cover' }).removeAlpha().extract({ left: Math.round(L.left), top: Math.round(L.top), width: Math.round(L.width), height: Math.round(L.height) }).raw().toBuffer({ resolveWithObject: true })
  let sum = 0, n = 0
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  for (let i = 0; i < data.length; i += 3) { sum += 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]); n++ }
  const contrast = 1.05 / (sum / n + 0.05)
  await sharp(png).jpeg({ quality: 90 }).toFile(OUT + p.id + '.jpg')
  const r = { id: p.id, fmt: p.fmt, dominante: dom, pregunta: F.lead, ratio: +(dom / F.lead).toFixed(2), vozFinAlto: +((box.voice.bottom) / F.H).toFixed(3), firmaContraste: +contrast.toFixed(2) }
  qa.push(r); console.log(JSON.stringify(r))
  await pg.close()
}
writeFileSync(OUT + 'qa.json', JSON.stringify(qa, null, 2))
await b.close()
