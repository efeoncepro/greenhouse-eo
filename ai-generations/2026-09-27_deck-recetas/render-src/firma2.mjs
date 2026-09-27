// Firma con los ajustes aplicados: (1) social y pauta con la regla única 20 % / 25 % si ancho > 1,2 × alto / máx. 35 %,
// vista a 390 px con el piso de 50 px; (4) la firma por soporte: web, deck, OOH (paleta, caminero, LED) y motion.
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'

const S = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/6775986c-94e4-44e8-8897-c999463292ce/scratchpad/'
const AI = '/Users/jreye/Documents/greenhouse-eo/ai-generations/'
const logo = 'data:image/svg+xml;base64,' + readFileSync(S + 'ooh-design/assets/efeonce-logo-negative-inline.svg').toString('base64')
const f64 = n => 'data:font/ttf;base64,' + readFileSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/' + n).toString('base64')
const b64 = async (file, w, h) => 'data:image/jpeg;base64,' + (await sharp(file).resize(w, h, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer()).toString('base64')
const LR = 837.07 / 196.68, PHONE = 390, T = GL.color.teal
const rule = (w, h) => { const short = Math.min(w, h); const pct = w > 1.2 * h ? 0.25 : 0.2; return { pct, lw: Math.min(short * pct, short * 0.35) } }

// Fila A — social y pauta
const social = [
  ['4:5', 4 / 5, AI + '2026-09-21_ads-brand-visibility/plates/a1-marcado-45-plate.png'],
  ['1:1', 1, AI + '2026-09-26_ronda-1x1/plates/Q3-retrato-directora.png'],
  ['9:16', 9 / 16, AI + '2026-09-26_ooh-caminero-lente/plates/D1-mupi-rodaje-en-vivo.png'],
  ['16:9', 16 / 9, AI + '2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png'],
  ['1,91:1', 1.91, AI + '2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png']
]
const A = []
for (const [id, ratio, file] of social) {
  const w = PHONE, h = Math.round(PHONE / ratio), short = Math.min(w, h), { pct, lw } = rule(w, h), lh = lw / LR
  const bottom = short * GL.signature.marginOfShortSide * 0.6
  A.push(`<figure style="margin:0;width:${w}px"><div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;border-radius:6px">
<img src="${await b64(file, w * 2, h * 2)}" style="position:absolute;inset:0;width:${w}px;height:${h}px">
<img src="${logo}" style="position:absolute;left:${(w - lw) / 2}px;top:${h - bottom - lh}px;width:${lw}px;height:${lh}px"></div>
<figcaption style="margin-top:10px;font:600 15px Pop;color:#00284D">${id} · ${Math.round(pct * 100)} %</figcaption>
<p style="margin:2px 0 0;font:300 14px/1.4 Pop;color:#5F5A69">logo de <b style="font-weight:600;color:#1B7F4B">${Math.round(lw)} px ✓</b> en el teléfono</p></figure>`)
}

// Fila B — por soporte (cada pieza a su escala real de lámina, reducida para el tablero)
const scaled = (W, H, k, inner) => `<div style="width:${W * k}px;height:${H * k}px;overflow:hidden;border-radius:6px;position:relative"><div style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform:scale(${k});transform-origin:0 0">${inner}</div></div>`
const voice = (x, y, qpx, apx, qt, at) => `${qt ? `<p style="position:absolute;left:${x}px;top:${y}px;margin:0;font:300 ${qpx}px Pop;line-height:1.35;color:#e2e2e2;white-space:nowrap"><span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>${qt}</p>` : ''}
<p style="position:absolute;left:${x}px;top:${qt ? y + qpx * 1.45 : y}px;margin:0;font:760 ${apx}px Bric;letter-spacing:-.035em;line-height:1.02;color:#fff;white-space:nowrap">${at}<span style="display:inline-block;width:.2em;height:.2em;border-radius:50%;background:${T};margin-left:.035em"></span></p>`
const out = S + 'ooh/out-dwm/'
const paleta = scaled(500, 1000, 0.36, `<img src="${await b64(S + 'ooh-design/assets/panaderia-paleta-1x2.jpg', 500, 1000)}" style="position:absolute;inset:0;width:500px;height:1000px">
${voice(45, 65, 36, 108, '¿Lo medimos?', 'Siempre')}<img src="${logo}" style="position:absolute;left:${(500 - 175) / 2}px;top:${1000 - 45 - 175 / LR}px;width:175px;height:${175 / LR}px">`)
const caminero = scaled(1500, 500, 0.4, `<img src="${await b64(S + 'ooh-design/assets/caminero-lente-C2.jpg', 1500, 500)}" style="position:absolute;inset:0;width:1500px;height:500px">
${voice(45, 100, 55, 165, '¿Lo medimos?', 'Siempre')}<img src="${logo}" style="position:absolute;left:45px;top:${500 - 45 - 250 / LR}px;width:250px;height:${250 / LR}px">`)
const led = scaled(960, 540, 0.5, `<img src="${await b64(S + 'ooh-design/assets/pdooh-led.jpg', 960, 540)}" style="position:absolute;inset:0;width:960px;height:540px">
${voice(48.6, 186, 0, 66, '', 'Siempre')}<img src="${logo}" style="position:absolute;left:48.6px;top:${186 + 67.3 + 30}px;width:163.2px;height:${163.2 / LR}px">`)
const web = scaled(960, 600, 0.5, `<img src="${await b64(out + 'W1-hero-sobre-foto.jpg', 960, 600)}" style="position:absolute;inset:0;width:960px;height:600px">`)
const deck = scaled(960, 540, 0.5, `<img src="${await b64(out + 'D3-respiro.jpg', 960, 540)}" style="position:absolute;inset:0;width:960px;height:540px">`)
const motion = scaled(960, 540, 0.5, `<img src="${await b64(out + 'M4-cierre-reveal.jpg', 960, 540)}" style="position:absolute;inset:0;width:960px;height:540px">`)
const card = (piece, title, text) => `<figure style="margin:0"><div>${piece}</div><figcaption style="margin-top:10px;font:600 15px Pop;color:#00284D">${title}</figcaption><p style="margin:2px 0 0;max-width:480px;font:300 14px/1.45 Pop;color:#5F5A69">${text}</p></figure>`
const B = [
  card(web, 'Web', 'La foto no lleva logo: firma el encabezado del sitio.'),
  card(deck, 'Deck', 'La lámina con foto no lleva logo: firman la portada y el cierre del deck.'),
  card(motion, 'Motion', 'La toma nunca lleva logo: firma el cierre (reveal o sting).'),
  card(paleta, 'OOH ciudad · paleta y mupi', 'Logo centrado abajo al 35 % del ancho: se lee a 15 m.'),
  card(caminero, 'OOH carretera · caminero 12 × 4 m', 'Logo de 2 m, abajo a la izquierda, al final del recorrido de lectura.'),
  card(led, 'OOH digital · pantalla LED', 'Logo al 17 % del ancho, justo bajo la respuesta.')
]
const html = `<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}body{margin:0;background:#F4F6F8}h2{margin:0 0 20px;font:600 22px Pop;color:#00284D}</style></head>
<body><div id="b" style="padding:40px;width:2150px">
<h2>1 · Social y pauta: 20 % del lado corto; 25 % si el ancho supera 1,2 × el alto; máximo 35 %</h2>
<div style="display:flex;gap:36px;align-items:flex-end">${A.join('')}</div>
<h2 style="margin-top:56px">4 · Firma por soporte: fuera de social y pauta, el porcentaje no manda</h2>
<div style="display:flex;flex-wrap:wrap;gap:40px 48px;align-items:flex-end">${B.join('')}</div></div></body></html>`
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 2240, height: 1600 }, deviceScaleFactor: 2 })
await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready)
await (await p.$('#b')).screenshot({ path: out + 'F2-firma-ajustada.png' }); await b.close()
const m = await sharp(out + 'F2-firma-ajustada.png').metadata()
await sharp(out + 'F2-firma-ajustada.png').resize(2150).jpeg({ quality: 86 }).toFile(out + 'F2-firma-ajustada.jpg')
console.log(m.width / 2, m.height / 2)
