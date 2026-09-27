// Storyboard de producción audiovisual: cuadros clave generados con foto:generar (registro documental, uniforme por
// registro) + cierre con el reveal aprobado. Cada cuadro trae la ficha del plano.
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const A = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_audiovisual/plates/'
const f64 = n => 'data:font/ttf;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/' + n).toString('base64')
const img = async (file, w, h) => 'data:image/jpeg;base64,' + (await sharp(file).resize(w * 2, h * 2, { fit: 'cover' }).jpeg({ quality: 86 }).toBuffer()).toString('base64')
const reveal = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/13- Branding/Motion Órbita Efeonce/v1.1/reveal/16x9/navy/efeonce-orbita-reveal_16x9_navy_cuadro-final.png'
const shots = [
  [A + 'V1-terreno.png', '01 · 0–3 s · Plano general', 'Terreno, panadería del cliente · 35 mm · cámara en mano, avanza despacio · luz del horno + ventana', 'Documental: nadie mira a cámara · gorra + hoodie (terreno)'],
  [A + 'V2-detalle.png', '02 · 3–5 s · Inserto', 'Detalle de manos · macro 100 mm · fijo, foco en la punta del lápiz · una lámpara rasante', 'El oficio en primer plano · manga del polo (oficina)'],
  [A + 'V3-sala.png', '03 · 5–9 s · Plano medio', 'Sala del cliente · 50 mm · sobre el hombro del cliente, empuje lento · la pantalla es la luz', 'Documental · chaqueta sobre polo (reunión importante)'],
  [reveal, '04 · 9–12,6 s · Cierre', 'Reveal aprobado (3,6 s, con sonido) · masters de AXIS v1.1', 'La toma nunca lleva logo: firma el cierre']
]
const W = 380, H = 214
let cells = ''
for (const [f, t, spec, reg] of shots) cells += `<figure style="margin:0;width:${W}px"><img src="${await img(f, W, H)}" style="width:${W}px;height:${H}px;display:block;border-radius:4px"><figcaption style="margin-top:12px;font:600 16px Pop;color:#00284D">${t}</figcaption><p style="margin:4px 0 0;font:300 14px/1.45 Pop;color:#3a4756">${spec}</p><p style="margin:6px 0 0;font:600 13px/1.4 Pop;color:#0375db">${reg}</p></figure>`
const rules = ['El primer cuadro de cada plano es una foto que pasó el QA fijo (foto:validar) y recién entonces se anima', 'Una luz con carácter y un registro por pieza; los planos se emparejan, no se mezclan', 'Grade: sólo empareja los planos hacia la colorimetría de la foto; sin look propio, sombras sin azul', 'Uniforme por registro de escena; el emblema se revisa cuadro a cuadro: si el modelo lo reinventa, no se lee o se compone', 'Texto sólo en las reservas planeadas del plano, como cartela compuesta después, nunca generada', 'Formato nativo por plano: se pide cobertura 16:9, 9:16 y 1:1; no se recorta uno desde otro']
const html = `<html><head><style>@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}body{margin:0;background:#F4F6F8}</style></head><body><div id="b" style="padding:40px;width:1640px">
<p style="margin:0 0 24px;font:600 22px Pop;color:#00284D">Producción audiovisual · un video de 12,6 s «Cómo trabajamos», cuadros clave generados</p>
<div style="display:flex;gap:40px">${cells}</div>
<div style="margin-top:34px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 40px">${rules.map((r, i) => `<p style="margin:0;font:300 15px/1.5 Pop;color:#3a4756"><b style="font-weight:600;color:#00284D">${i + 1}.</b> ${r}</p>`).join('')}</div></div></body></html>`
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1720, height: 900 }, deviceScaleFactor: 2 })
await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready)
await (await p.$('#b')).screenshot({ path: 'out-dwm/AV-storyboard.png' }); await b.close()
await sharp('out-dwm/AV-storyboard.png').resize(1720).jpeg({ quality: 86 }).toFile('out-dwm/AV-storyboard.jpg')
console.log((await sharp('out-dwm/AV-storyboard.jpg').metadata()).height)
