// Brochure: portada y contraportada (opciones para el canvas). Medidas de portada y cierre del canon de AXIS
// (deckSlideHtml cover/close); fotos del registro cine con Nexa protagonista.
import { answerHtml, deckSlideHtml } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'
import { paintSelection } from './sel.mjs'
import { makeVoice, COPY } from './voz.mjs'

const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('./out-vive/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const BA = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/'
const PL = R + 'ai-generations/2026-09-27_brochure/plates/'
const W = 1920, H = 1080, M = 140
const growth = GL.lines.find(l => l.key === 'growth')
const TEAL = growth.accentOnDark, SOFT = GL.slogan.leadColor.onDark
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const svgUri = f => 'data:image/svg+xml;base64,' + readFileSync(f).toString('base64')
const jpg = async f => 'data:image/jpeg;base64,' + (await sharp(f).resize(W, H, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const LOGO = svgUri(BA + 'efeonce-logo-negative.svg')
const ring = `<span aria-hidden="true" style="display:inline-block;width:.62em;height:.62em;border-radius:50%;border:.1em solid ${TEAL};box-sizing:border-box;margin-right:.42em;vertical-align:-.04em"></span>`
const slogan = size => `<span style="font:italic 800 ${size}px Pop;color:${SOFT}">Empower</span> <span style="font:800 ${size}px Pop;color:${SOFT}">your</span> <span style="font:italic 900 ${size}px Pop;color:${TEAL}">Growth</span>`
const CONTACT = ['sales@efeoncepro.com', '+56 9 3732 3064', '+1 (239) 235-2073']
const contactLine = (size, color = SOFT) => CONTACT.map(c => `<span style="white-space:nowrap">${c}</span>`).join(`<span style="opacity:.5;margin:0 .7em">·</span>`)
const bubble = svgUri(BA + 'url-bubble-baked-dark.svg')

// Portada del canon (deckSlideHtml cover): logo arriba a la izquierda con el eyebrow al lado; voz en la mitad baja.
const coverVoice = (eyebrow, q, a, px = 150, qpx = 40, qTop = 640, aTop = 715, lead = '') => `
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:110px;width:230px;height:auto;z-index:3">
<p style="position:absolute;left:400px;top:118px;margin:0;font:500 18px/1.2 Pop;letter-spacing:.22em;text-transform:uppercase;color:${SOFT};white-space:nowrap;z-index:3">${eyebrow}</p>
<p style="position:absolute;left:${M}px;top:${qTop}px;margin:0;font:300 ${qpx}px/1.2 Pop;color:#F4F6F8;z-index:3">${ring}${q}</p>
<p style="position:absolute;left:${M - 4}px;top:${aTop}px;margin:0;font:760 ${px}px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;white-space:nowrap;z-index:3">${lead}${answerHtml(a, TEAL)}</p>`

const GA = R + 'ai-generations/'
// Firma burbuja URL: sólo porque el logo ya está en la pieza. Centrada, 20 % del lado corto, luminosity a opacidad 1 (canon firma §5.1).
const URL_LUM = svgUri(R + 'src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg')
const urlSign = () => `<img src="${URL_LUM}" alt="efeoncepro.com" style="position:absolute;left:${M}px;bottom:51px;width:216px;height:auto;opacity:1;mix-blend-mode:luminosity;z-index:3">`
// Portada PRINCIPAL: identidad del documento (logo protagonista + tipo de documento + título), no una lámina de servicio.
const lockup = ({ kind, title, meta, top = 700, tpx = 132, gap = title.includes('data-sel') ? 78 : 26 }) => `
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:${top - 190}px;width:500px;height:auto;z-index:3">
<p style="position:absolute;left:${M}px;top:${top}px;margin:0;font:500 22px/1.2 Pop;letter-spacing:.24em;text-transform:uppercase;color:${SOFT};z-index:3">${kind}</p>
<p style="position:absolute;left:${M - 4}px;top:${top + 44}px;margin:0;font:760 ${tpx}px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;z-index:3">${title}</p>
<p style="position:absolute;left:${M}px;top:${top + 44 + Math.round(tpx * 0.95 * (title.split('<br>').length)) + gap}px;margin:0;font:300 30px/1.2 Pop;color:#F4F6F8;z-index:3">${meta}</p>`
const V = makeVoice({ LOGO, ring, TEAL, SOFT, M, answerHtml }), BRO = COPY.brochure
const classic = (eyebrow, q, a, line = 'growth') => deckSlideHtml('cover', { sections: 5, current: 0, eyebrow, question: q, answer: a, line, assetBase: '__BA__', idPrefix: 'cv' + Math.random().toString(36).slice(2, 6) }).replaceAll('__BA__efeonce-logo-negative.svg', LOGO)
const classicBig = (...a) => classic(...a).replace('width:230px;height:auto', 'width:500px;height:auto').replace('left:400px;top:118px;', 'left:140px;top:262px;').replace('font-weight:500;font-size:18px', 'font-weight:500;font-size:24px')
const photo = async (p, alt) => `<img src="${await jpg(p)}" alt="${alt}" style="position:absolute;inset:0;width:${W}px;height:${H}px">`
// «Vívelo»: dos láminas que desarrollan el día a día con las herramientas (operador, 2026-09-27: «que quien lo ve VIVA
// la experiencia de trabajar con nosotros»). Pantallas en uso vistas desde el lado del cliente, con su cursor propio
// en el gesto que hace él (aprobar, abrir el reporte). Interfaces genéricas con el isotipo real de cada herramienta
// como contexto: no se recrea el diseño propietario de nadie. Las cifras del panel son las de la vista de muestra.
const CAT = R + 'src/lib/artifact-composer/catalogs/deck-axis/assets/'
const tool = async (f, px) => 'data:image/png;base64,' + (await sharp(CAT + 'tools/' + f + '.svg', { density: 600 }).resize(px * 2, px * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()).toString('base64')
const ISO = svgUri(BA + 'efeonce-isotype-negative.svg')
const INK = '#0B1F33', MUTED = '#5F6B7A', LINE = '#E3E8EE', CARD = '#FFFFFF', PAPER = '#F5F7FA'
const tile = (src, bg = '#fff', px = 34, box = 52) => `<span style="display:inline-flex;width:${box}px;height:${box}px;border-radius:${Math.round(box * .28)}px;background:${bg};align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(0,0,0,.06) inset"><img src="${src}" alt="" style="width:${px}px;height:${px}px"></span>`
const voice = (eyebrow, q, a, ev) => `
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${SOFT}">${eyebrow}</p>
<p style="position:absolute;left:${M}px;top:200px;width:460px;margin:0;font:300 40px/1.2 Pop;color:${SOFT}">${ring}${q}</p>
<p style="position:absolute;left:${M - 6}px;top:${q.length > 22 ? 350 : 290}px;margin:0;font:760 132px Bric;line-height:.95;letter-spacing:-.045em;color:#fff">${a}</p>
<p style="position:absolute;left:${M}px;top:${q.length > 22 ? 640 : 580}px;width:400px;margin:0;font:300 26px/1.45 Pop;color:#E6EDF3">${ev}</p>`
const glow = (cx, cy, r) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0"><defs><radialGradient id="vg${cx}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${GL.color.halo}" stop-opacity=".16"/><stop offset=".6" stop-color="${GL.color.halo}" stop-opacity=".04"/><stop offset="1" stop-color="${GL.color.halo}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#vg${cx})"/></svg>`
const shadow = 'box-shadow:0 0 0 1px rgba(255,255,255,.14),0 30px 70px rgba(0,8,20,.6),0 0 60px rgba(114,222,216,.14)'

// ── Versión con impacto (operador, 2026-09-27: «dale muchísimo más impacto visual a las 3»): profundidad real con CSS 3D
// (pantallas grandes inclinadas, reflejo en el piso), fichas a distinta profundidad, haces de luz y la órbita como
// plataforma de luz bajo el panel. Una sola órbita por lámina; la voz a la izquierda, fuera del escenario.
const stageBg = (cx, cy) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0"><defs>
<radialGradient id="sb1" cx="${cx}" cy="${cy}" r="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${GL.color.halo}" stop-opacity=".28"/><stop offset=".35" stop-color="${GL.color.teal}" stop-opacity=".10"/><stop offset="1" stop-color="${GL.color.teal}" stop-opacity="0"/></radialGradient>
<linearGradient id="sb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000814" stop-opacity=".55"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#sb1)"/><rect y="${H * 0.72}" width="${W}" height="${H * 0.28}" fill="url(#sb2)"/></svg>`
const platform = (cx, cy, rx, ry) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><defs><radialGradient id="pf" cx="${cx}" cy="${cy}" r="${rx}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${cy * (1 - ry / rx)}) scale(1 ${ry / rx})"><stop offset="0" stop-color="${GL.color.halo}" stop-opacity=".30"/><stop offset=".7" stop-color="${GL.color.teal}" stop-opacity=".06"/><stop offset="1" stop-color="${GL.color.teal}" stop-opacity="0"/></radialGradient><filter id="pfg" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#pf)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${GL.color.halo}" stroke-opacity=".55" stroke-width="3"/>
<path d="M ${cx - rx * 0.92} ${cy + ry * 0.39} A ${rx} ${ry} 0 0 0 ${cx + rx * 0.7} ${cy + ry * 0.71}" fill="none" stroke="${GL.color.teal}" stroke-width="14" opacity=".45" filter="url(#pfg)"/>
<path d="M ${cx - rx * 0.92} ${cy + ry * 0.39} A ${rx} ${ry} 0 0 0 ${cx + rx * 0.7} ${cy + ry * 0.71}" fill="none" stroke="${GL.color.teal}" stroke-width="6" stroke-linecap="round"/></svg>`
const beam = (x1, y1, x2, y2, id) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:3;pointer-events:none"><defs><linearGradient id="bm${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${GL.color.halo}" stop-opacity=".9"/><stop offset="1" stop-color="${GL.color.halo}" stop-opacity="0"/></linearGradient><filter id="bmg${id}"><feGaussianBlur stdDeviation="4"/></filter></defs><path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 40} ${x2} ${y2}" fill="none" stroke="url(#bm${id})" stroke-width="8" opacity=".5" filter="url(#bmg${id})"/><path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 40} ${x2} ${y2}" fill="none" stroke="url(#bm${id})" stroke-width="2.5"/></svg>`
const REFLECT = '-webkit-box-reflect:below 14px linear-gradient(transparent 72%, rgba(255,255,255,.16))'
const deep = 'box-shadow:0 0 0 1px rgba(255,255,255,.16),0 50px 110px rgba(0,6,16,.75),0 0 90px rgba(114,222,216,.22)'
const bigVoice = (eyebrow, q, a, ev, qLines = 1, apx = 176) => `
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${SOFT};z-index:9">${eyebrow}</p>
<p style="position:absolute;left:${M}px;top:196px;width:470px;margin:0;font:300 40px/1.2 Pop;color:${SOFT};z-index:9">${ring}${q}</p>
<p style="position:absolute;left:${M - 8}px;top:${qLines > 1 ? 330 : 280}px;margin:0;font:760 ${apx}px Bric;line-height:.9;letter-spacing:-.05em;color:#fff;z-index:9;text-shadow:0 10px 60px rgba(0,0,0,.35)">${a}</p>
<p style="position:absolute;left:${M}px;top:${qLines > 1 ? 690 : 640}px;width:380px;margin:0;font:300 26px/1.45 Pop;color:#E6EDF3;z-index:9">${ev}</p>`

const slides = [
  // 0 · La alternativa con impacto: el panel de Greenhouse gigante en 3D sobre la órbita-plataforma; las cuatro
  // herramientas flotan a distinta profundidad y su luz baja al panel.
  { id: 'V0-herramientas-impacto', body: async () => {
    const panel = 'data:image/jpeg;base64,' + (await sharp(CAT + 'product/greenhouse-seo-dashboard.png').resize(1840).jpeg({ quality: 90 }).toBuffer()).toString('base64')
    const gh = svgUri(R + 'public/images/greenhouse/SVG/negative-isotipo-green.svg')
    const T = [
      { f: 'teams-isotype', n: 'Microsoft Teams', t: 'Nos reunimos', x: 630, y: 132, s: 128, z: 7, bx: 960, by: 380 },
      { f: 'notion-isotype', n: 'Notion', t: 'Proyectos y tareas', x: 1620, y: 40, s: 112, z: 7, bx: 1420, by: 330 },
      { f: 'frameio-isotype', n: 'Frame.io', t: 'Revisas las piezas', x: 1670, y: 540, s: 150, z: 8, bx: 1420, by: 600 },
      { f: null, n: 'Efeonce Insights', t: 'Reportes automáticos', x: 640, y: 560, s: 142, z: 8, bx: 950, by: 620 }
    ]
    let tiles = '', beams = ''
    for (const [k, t] of T.entries()) {
      const img = t.f ? `<img src="${await tool(t.f, Math.round(t.s * 0.36))}" alt="${t.n}" style="width:${Math.round(t.s * 0.56)}px;height:${Math.round(t.s * 0.56)}px">` : `<img src="${ISO}" alt="Efeonce Insights" style="width:${Math.round(t.s * 0.62)}px">`
      const bg = t.f ? 'linear-gradient(155deg,#ffffff 0%,#EAF1F6 55%,#CFDCE6 100%)' : `linear-gradient(155deg,#14506E 0%,${GL.color.dark} 100%)`
      const cxT = t.x + t.s / 2, cyT = t.y + t.s / 2
      beams += beam(cxT, cyT, t.bx, t.by, k)
      tiles += `<div style="position:absolute;left:${t.x}px;top:${t.y}px;width:${t.s}px;height:${t.s}px;border-radius:${Math.round(t.s * .27)}px;background:${bg};box-shadow:0 0 0 1px rgba(255,255,255,${t.f ? '.7' : '.28'}) inset,0 30px 60px rgba(0,6,16,.6),0 0 50px rgba(114,222,216,.35);display:flex;align-items:center;justify-content:center;z-index:${t.z}">${img}</div>
<div style="position:absolute;left:${cxT - 150}px;top:${t.y + t.s + 16}px;width:300px;white-space:nowrap;text-align:center;z-index:${t.z}"><p style="margin:0;font:500 14px Pop;letter-spacing:.12em;text-transform:uppercase;color:${SOFT}">${t.n}</p><p style="margin:2px 0 0;font:600 26px Pop;color:#fff;text-shadow:0 2px 20px rgba(0,0,0,.6)">${t.t}</p></div>`
    }
    return stageBg(1190, 520) + platform(1190, 850, 500, 105) + `
<div style="position:absolute;inset:0;perspective:1700px;perspective-origin:1190px 460px;z-index:2">
 <div style="position:absolute;left:780px;top:260px;width:820px;height:490px;border-radius:22px;overflow:hidden;transform:rotateY(-14deg) rotateX(9deg);${deep};${REFLECT}"><img src="${panel}" alt="Tu panel de Greenhouse, en vivo" style="width:820px;height:490px;display:block"></div>
</div>
<div style="position:absolute;left:930px;top:966px;width:520px;text-align:center;z-index:6"><p style="margin:0;display:inline-flex;align-items:center;gap:12px;font:600 28px Pop;color:#fff"><img src="${gh}" alt="" style="height:30px">Tu panel en Greenhouse</p><p style="margin:2px 0 0;font:300 19px Pop;color:#E6EDF3">todo en un solo lugar, en vivo</p></div>
${beams}${tiles}` + bigVoice('Tu día a día con Efeonce', '¿Cómo trabajamos contigo?', answerHtml('Así', GL.color.teal), `Cada cosa en su herramienta y <b style="font-weight:600;color:#fff">todo</b> a la vista en tu panel, sin esperar el informe.`, 2) + urlSign()
  } },
  // 1 · El trabajo avanza a la vista: el plan en Notion y la aprobación en Frame.io.
  { id: 'V1-avanza-a-la-vista', sel: { mode: 'cta', targetKind: 'object', anchor: 'end-center', scale: 0.6 }, body: async () => {
    const notion = await tool('notion-isotype', 30), frame = await tool('frameio-isotype', 30)
    const piece = await jpg(R + 'ai-generations/2026-09-27_ads-cine/plates/AD3b-45-aeo-foco-isotipo.png')
    const col = (name, cards) => `<div style="flex:1;min-width:0"><p style="margin:0 0 12px;font:600 14px Pop;letter-spacing:.08em;text-transform:uppercase;color:${MUTED}">${name}</p>${cards.map(([t, tag, hi]) => `<div style="background:${CARD};border-radius:12px;padding:14px 14px 12px;margin-bottom:10px;box-shadow:0 0 0 ${hi ? 2 : 1}px ${hi ? GL.color.teal : LINE}${hi ? ',0 0 24px rgba(54,200,191,.35)' : ''}"><p style="margin:0;font:600 17px/1.25 Pop;color:${INK}">${t}</p><p style="margin:8px 0 0;font:500 13px Pop;color:${hi ? GL.color.tealDark : MUTED}">${tag}</p></div>`).join('')}</div>`
    return glow(1290, 540, 760) + `
<div style="position:absolute;left:620px;top:170px;width:600px;border-radius:22px;background:${PAPER};${shadow};z-index:2;overflow:hidden">
 <div style="display:flex;align-items:center;gap:14px;padding:22px 26px 18px;border-bottom:1px solid ${LINE}">${tile(notion)}<div><p style="margin:0;font:500 13px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">En Notion</p><p style="margin:2px 0 0;font:600 22px Pop;color:${INK}">Plan de la campaña</p></div><span style="margin-left:auto;font:500 14px Pop;color:${MUTED}">Semana 3 de 6</span></div>
 <div style="display:flex;gap:14px;padding:22px 26px">
  ${col('En curso', [['Guion del video', 'Producción'], ['Adaptaciones a redes', 'Contenido']])}
  ${col('En revisión', [['Key visual', 'Esperando tu visto bueno', true]])}
  ${col('Listo', [['Brief aprobado', 'Estrategia'], ['Moodboard', 'Dirección de arte']])}
 </div>
</div>
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:3;pointer-events:none"><path d="M 1010 420 C 1060 520 1120 560 1198 560" fill="none" stroke="${GL.color.teal}" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/><circle cx="1198" cy="560" r="6" fill="${GL.color.teal}"/></svg>
<div style="position:absolute;left:1200px;top:430px;width:600px;border-radius:22px;background:${CARD};${shadow};z-index:4;overflow:hidden">
 <div style="display:flex;align-items:center;gap:14px;padding:18px 22px;border-bottom:1px solid ${LINE}">${tile(frame, '#fff')}<div><p style="margin:0;font:500 13px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">En Frame.io</p><p style="margin:2px 0 0;font:600 22px Pop;color:${INK}">Key visual</p></div><span style="margin-left:auto;display:flex;gap:6px"><span style="font:600 13px Pop;color:${MUTED};padding:5px 10px;border-radius:999px;background:${PAPER}">v1</span><span style="font:600 13px Pop;color:#fff;padding:5px 10px;border-radius:999px;background:${INK}">v2</span></span></div>
 <div style="display:flex">
  <div style="position:relative;width:250px;height:312px;flex:none;background:#000"><img src="${piece}" alt="La pieza en revisión: un key visual del registro cine" style="width:250px;height:312px;object-fit:cover;display:block"><span style="position:absolute;left:150px;top:62px;width:30px;height:30px;border-radius:50%;background:${GL.color.teal};color:${INK};font:700 15px/30px Pop;text-align:center;box-shadow:0 0 0 4px rgba(255,255,255,.85)">1</span></div>
  <div style="flex:1;padding:18px 20px">
   <div style="display:flex;gap:10px;align-items:flex-start"><span style="flex:none;width:30px;height:30px;border-radius:50%;background:${GL.color.teal};color:${INK};font:700 15px/30px Pop;text-align:center">1</span><div><p style="margin:0;font:600 15px Pop;color:${INK}">Tú <span style="font-weight:400;color:${MUTED}">· v1</span></p><p style="margin:4px 0 0;font:400 16px/1.4 Pop;color:${INK}">¿Podemos subir el logo?</p></div></div>
   <div style="display:flex;gap:10px;align-items:flex-start;margin-top:16px"><span style="flex:none;display:inline-flex;width:30px;height:30px;border-radius:50%;background:${GL.color.dark};align-items:center;justify-content:center"><img src="${ISO}" alt="" style="width:20px"></span><div><p style="margin:0;font:600 15px Pop;color:${INK}">Efeonce <span style="font-weight:400;color:${MUTED}">· v2</span></p><p style="margin:4px 0 0;font:400 16px/1.4 Pop;color:${INK}">Listo, quedó en la v2.</p></div></div>
   <div style="margin-top:34px;display:flex;gap:10px"><span style="display:inline-block;font:500 18px Pop;color:${INK};background:${PAPER};padding:12px 18px;border-radius:12px">Comentar</span><span data-sel style="display:inline-block;font:600 18px Pop;color:${INK};background:${GL.color.teal};padding:12px 22px;border-radius:12px">Aprobar</span></div>
  </div>
 </div>
</div>` + voice('Tu día a día con Efeonce', '¿Cómo avanza tu proyecto?', `A la<br>${answerHtml('vista', GL.color.teal)}`, `Sigues el plan en Notion y apruebas cada pieza en Frame.io, comentando <b style="font-weight:600;color:#fff">sobre</b> la imagen.`) + urlSign()
  } },
  // 2 · Los resultados llegan solos: Efeonce Insights arma el reporte, lo ves en Greenhouse y lo conversamos en Teams.
  { id: 'V2-resultados-en-vivo', sel: { mode: 'cta', targetKind: 'object', anchor: 'end-center', scale: 0.6 }, body: async () => {
    const teams = await tool('teams-isotype', 30)
    const panel = 'data:image/jpeg;base64,' + (await sharp(CAT + 'product/greenhouse-seo-dashboard.png').resize(1840).jpeg({ quality: 90 }).toBuffer()).toString('base64')
    const gh = svgUri(R + 'public/images/greenhouse/SVG/negative-isotipo-green.svg')
    const kpi = (v, l) => `<div style="flex:1"><p style="margin:0;font:700 30px Pop;color:${INK};letter-spacing:-.02em">${v}</p><p style="margin:2px 0 0;font:400 13px Pop;color:${MUTED}">${l}</p></div>`
    return glow(1260, 520, 780) + `
<div style="position:absolute;left:830px;top:200px;width:920px;height:549px;border-radius:20px;overflow:hidden;${shadow};z-index:2"><img src="${panel}" alt="Panel de Greenhouse del cliente: visibilidad SEO en vivo" style="width:920px;height:549px;display:block"></div>
<div style="position:absolute;left:1490px;top:120px;width:320px;border-radius:18px;background:${CARD};${shadow};z-index:4;padding:18px 20px">
 <div style="display:flex;align-items:center;gap:12px">${tile(teams, '#fff', 28, 44)}<p style="margin:0;font:500 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">En Microsoft Teams</p></div>
 <p style="margin:12px 0 0;font:600 20px Pop;color:${INK}">Revisión de resultados</p><p style="margin:2px 0 0;font:400 15px Pop;color:${MUTED}">Jueves 10:00 · 30 min · con tu equipo</p>
</div>
<div style="position:absolute;left:660px;top:560px;width:560px;border-radius:20px;background:${CARD};${shadow};z-index:3;padding:22px 24px 38px">
 <div style="display:flex;align-items:center;gap:12px"><span style="display:inline-flex;width:44px;height:44px;border-radius:12px;background:${GL.color.dark};align-items:center;justify-content:center"><img src="${ISO}" alt="" style="width:30px"></span><div><p style="margin:0;font:500 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">Efeonce Insights</p><p style="margin:2px 0 0;font:600 20px Pop;color:${INK}">Tu reporte de la semana está listo</p></div><span style="margin-left:auto;align-self:flex-start;font:400 12px Pop;color:${MUTED}">Datos de muestra</span></div>
 <div style="display:flex;gap:14px;margin:18px 0 16px;padding:14px 0;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}">${kpi('+22 %', 'tráfico orgánico')}${kpi('+14', 'keywords top 10')}${kpi('61 %', 'citabilidad IA')}</div>
 <div style="display:flex;align-items:center;gap:12px"><span data-sel style="display:inline-flex;align-items:center;gap:10px;font:600 17px Pop;color:#fff;background:${INK};padding:11px 18px;border-radius:12px"><img src="${gh}" alt="" style="height:20px">Ver en Greenhouse</span></div>
</div>` + voice('Tu día a día con Efeonce', '¿Cómo va?', `En<br>${answerHtml('vivo', GL.color.teal)}`, `Efeonce Insights arma el reporte <b style="font-weight:600;color:#fff">solo</b>: lo ves en tu panel de Greenhouse y lo conversamos en Teams.`) + urlSign()
  } },
  // 1b · Vívelo 1 con impacto: la revisión en Frame.io es la protagonista, grande y en 3D sobre la órbita-plataforma; el
  // plan de Notion queda atrás, girado hacia ella, y un haz lleva la tarjeta «Key visual» a la revisión.
  { id: 'V1b-avanza-impacto', sel: { mode: 'cta', targetKind: 'object', anchor: 'end-center', scale: 1 }, body: async () => {
    const notion = await tool('notion-isotype', 30), frame = await tool('frameio-isotype', 30)
    const piece = await jpg(R + 'ai-generations/2026-09-27_ads-cine/plates/AD3b-45-aeo-foco-isotipo.png')
    const col = (name, cards) => `<div style="flex:1;min-width:0"><p style="margin:0 0 12px;font:600 14px Pop;letter-spacing:.08em;text-transform:uppercase;color:${MUTED}">${name}</p>${cards.map(([t, tag, hi]) => `<div style="background:${CARD};border-radius:12px;padding:14px 14px 12px;margin-bottom:10px;box-shadow:0 0 0 ${hi ? 3 : 1}px ${hi ? GL.color.teal : LINE}${hi ? ',0 0 40px rgba(54,200,191,.55)' : ''}"><p style="margin:0;font:600 17px/1.25 Pop;color:${INK}">${t}</p><p style="margin:8px 0 0;font:500 13px Pop;color:${hi ? GL.color.tealDark : MUTED}">${tag}</p></div>`).join('')}</div>`
    return stageBg(1320, 520) + platform(1400, 800, 460, 92) + `
<div style="position:absolute;inset:0;perspective:1600px;perspective-origin:1200px 480px;z-index:2">
 <div style="position:absolute;left:650px;top:200px;width:540px;border-radius:22px;background:${PAPER};overflow:hidden;transform:rotateY(22deg) rotateX(6deg);transform-origin:right center;${deep};opacity:.96">
  <div style="display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${LINE}">${tile(notion)}<div><p style="margin:0;font:500 13px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">En Notion</p><p style="margin:2px 0 0;font:600 22px Pop;color:${INK}">Plan de la campaña</p></div><span style="margin-left:auto;font:500 14px Pop;color:${MUTED}">Semana 3 de 6</span></div>
  <div style="display:flex;gap:12px;padding:20px 22px">${col('En curso', [['Guion del video', 'Producción'], ['Adaptaciones a redes', 'Contenido']])}${col('En revisión', [['Key visual', 'Esperando tu visto bueno', true]])}${col('Listo', [['Brief aprobado', 'Estrategia'], ['Moodboard', 'Dirección de arte']])}</div>
 </div>
 <div style="position:absolute;left:1070px;top:170px;width:720px;border-radius:24px;background:${CARD};overflow:hidden;transform:rotateY(-13deg) rotateX(6deg);transform-origin:left center;${deep};${REFLECT}">
  <div style="display:flex;align-items:center;gap:14px;padding:20px 24px;border-bottom:1px solid ${LINE}">${tile(frame, '#fff', 34, 56)}<div><p style="margin:0;font:500 14px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">En Frame.io</p><p style="margin:2px 0 0;font:600 26px Pop;color:${INK}">Key visual</p></div><span style="margin-left:auto;display:flex;gap:8px"><span style="font:600 15px Pop;color:${MUTED};padding:6px 12px;border-radius:999px;background:${PAPER}">v1</span><span style="font:600 15px Pop;color:#fff;padding:6px 12px;border-radius:999px;background:${INK}">v2</span></span></div>
  <div style="display:flex">
   <div style="position:relative;width:340px;height:425px;flex:none;background:#000"><img src="${piece}" alt="La pieza en revisión" style="width:340px;height:425px;object-fit:cover;display:block"><span style="position:absolute;left:206px;top:84px;width:38px;height:38px;border-radius:50%;background:${GL.color.teal};color:${INK};font:700 18px/38px Pop;text-align:center;box-shadow:0 0 0 5px rgba(255,255,255,.9),0 0 30px rgba(54,200,191,.9)">1</span></div>
   <div style="flex:1;padding:24px 26px">
    <div style="display:flex;gap:12px;align-items:flex-start"><span style="flex:none;width:36px;height:36px;border-radius:50%;background:${GL.color.teal};color:${INK};font:700 17px/36px Pop;text-align:center">1</span><div><p style="margin:0;font:600 17px Pop;color:${INK}">Tú <span style="font-weight:400;color:${MUTED}">· v1</span></p><p style="margin:4px 0 0;font:400 20px/1.4 Pop;color:${INK}">¿Podemos subir el logo?</p></div></div>
    <div style="display:flex;gap:12px;align-items:flex-start;margin-top:20px"><span style="flex:none;display:inline-flex;width:36px;height:36px;border-radius:50%;background:${GL.color.dark};align-items:center;justify-content:center"><img src="${ISO}" alt="" style="width:24px"></span><div><p style="margin:0;font:600 17px Pop;color:${INK}">Efeonce <span style="font-weight:400;color:${MUTED}">· v2</span></p><p style="margin:4px 0 0;font:400 20px/1.4 Pop;color:${INK}">Listo, quedó en la v2.</p></div></div>
    <div style="margin-top:46px;display:flex;gap:12px;align-items:center"><span style="display:inline-block;font:500 20px Pop;color:${INK};background:${PAPER};padding:14px 20px;border-radius:14px">Comentar</span><span data-sel style="display:inline-block;font:700 22px Pop;color:${INK};background:${GL.color.teal};padding:16px 30px;border-radius:14px;box-shadow:0 0 40px rgba(54,200,191,.7)">Aprobar</span></div>
   </div>
  </div>
 </div>
</div>
${beam(1010, 390, 1130, 470, 'kv')}` + bigVoice('Tu día a día con Efeonce', '¿Cómo avanza tu proyecto?', `A la<br>${answerHtml('vista', GL.color.teal)}`, `Sigues el plan en Notion y apruebas cada pieza en Frame.io, comentando <b style="font-weight:600;color:#fff">sobre</b> la imagen.`, 2) + urlSign()
  } },
  // 2b · Vívelo 2 con impacto: el panel de Greenhouse gigante y en 3D; la tarjeta de Efeonce Insights llega al frente
  // con su luz; la invitación de Teams flota arriba. La órbita es la plataforma bajo el panel.
  { id: 'V2b-resultados-impacto', sel: { mode: 'cta', targetKind: 'object', anchor: 'end-center', scale: 1 }, body: async () => {
    const teams = await tool('teams-isotype', 30)
    const panel = 'data:image/jpeg;base64,' + (await sharp(CAT + 'product/greenhouse-seo-dashboard.png').resize(1840).jpeg({ quality: 90 }).toBuffer()).toString('base64')
    const gh = svgUri(R + 'public/images/greenhouse/SVG/negative-isotipo-green.svg')
    const kpi = (v, l, acc) => `<div style="flex:1"><p style="margin:0;font:760 52px Bric;letter-spacing:-.04em;line-height:1;color:${acc ? GL.color.tealDark : INK}">${v}</p><p style="margin:6px 0 0;font:400 15px Pop;color:${MUTED}">${l}</p></div>`
    return stageBg(1280, 480) + platform(1300, 830, 520, 100) + `
<div style="position:absolute;inset:0;perspective:1700px;perspective-origin:1250px 440px;z-index:2">
 <div style="position:absolute;left:800px;top:140px;width:980px;height:585px;border-radius:24px;overflow:hidden;transform:rotateY(-16deg) rotateX(8deg);${deep};${REFLECT}"><img src="${panel}" alt="Tu panel de Greenhouse, en vivo" style="width:980px;height:585px;display:block"></div>
</div>
<div style="position:absolute;left:1460px;top:60px;width:380px;border-radius:20px;background:${CARD};${deep};z-index:4;padding:20px 22px;transform:perspective(1200px) rotateY(-10deg)">
 <div style="display:flex;align-items:center;gap:12px">${tile(teams, '#fff', 30, 48)}<p style="margin:0;font:500 13px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">En Microsoft Teams</p></div>
 <p style="margin:12px 0 0;font:600 22px Pop;color:${INK}">Revisión de resultados</p><p style="margin:2px 0 0;font:400 16px Pop;color:${MUTED}">Jueves 10:00 · 30 min · con tu equipo</p>
</div>
<div style="position:absolute;left:640px;top:520px;width:640px;border-radius:24px;background:${CARD};z-index:3;padding:26px 30px 42px;box-shadow:0 0 0 2px rgba(114,222,216,.8),0 50px 110px rgba(0,6,16,.8),0 0 120px rgba(54,200,191,.55)">
 <div style="display:flex;align-items:center;gap:14px"><span style="display:inline-flex;width:54px;height:54px;border-radius:15px;background:${GL.color.dark};align-items:center;justify-content:center"><img src="${ISO}" alt="" style="width:36px"></span><div><p style="margin:0;font:500 13px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">Efeonce Insights · ahora</p><p style="margin:2px 0 0;font:600 24px Pop;color:${INK}">Tu reporte de la semana está listo</p></div><span style="margin-left:auto;align-self:flex-start;font:400 12px Pop;color:${MUTED}">Datos de muestra</span></div>
 <div style="display:flex;gap:16px;margin:22px 0 22px;padding:18px 0;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}">${kpi('+22 %', 'tráfico orgánico', true)}${kpi('+14', 'keywords top 10')}${kpi('61 %', 'citabilidad IA')}</div>
 <div style="display:flex;align-items:center;gap:12px"><span data-sel style="display:inline-flex;align-items:center;gap:12px;font:600 20px Pop;color:#fff;background:${INK};padding:14px 22px;border-radius:14px"><img src="${gh}" alt="" style="height:24px">Ver en Greenhouse</span></div>
</div>` + bigVoice('Tu día a día con Efeonce', '¿Cómo va?', `En<br>${answerHtml('vivo', GL.color.teal)}`, `Efeonce Insights arma el reporte <b style="font-weight:600;color:#fff">solo</b>: lo ves en tu panel de Greenhouse y lo conversamos en Teams.`) + urlSign()
  } },
  // EQ · El equipo con impacto (operador, 2026-09-27: «podría mejorar un poco más»): el squad REAL en fichas de vidrio
  // en profundidad alrededor de Julio (el único interlocutor, al frente), sobre la órbita-plataforma donde está «Tu
  // marca». Mismo lenguaje 3D de las láminas del día a día.
  { id: 'EQ-equipo-impacto', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'top-end', scale: 1.1 }, body: async () => {
    const face = async (k, w, h) => 'data:image/jpeg;base64,' + (await sharp(CAT + `squad/squad-${k}.png`).resize(w * 2, h * 2, { fit: 'cover', position: 'north' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
    const T = [
      { k: 'andres', n: 'Andrés', r: 'SEO Specialist', cx: 885, top: 330, w: 190, ry: 18, z: 2 },
      { k: 'maria-fernanda', n: 'María Fernanda', r: 'SEO Copywriter', cx: 1065, top: 300, w: 225, ry: 12, z: 3 },
      { k: 'julio', n: 'Julio', r: 'Responsable de Cuenta', cx: 1300, top: 240, w: 290, ry: 0, z: 5, lead: true },
      { k: 'daniela', n: 'Daniela', r: 'Creative Operations Lead', cx: 1565, top: 300, w: 225, ry: -12, z: 3 },
      { k: 'melkin', n: 'Melkin', r: 'Senior Visual Designer', cx: 1790, top: 330, w: 170, ry: -18, z: 2 }
    ]
    let cards = ''
    for (const t of T) {
      const ph = Math.round(t.w * 1.12)
      const img = await face(t.k, t.w, ph)
      cards += `<div ${t.lead ? 'data-sel ' : ''}style="position:absolute;left:${t.cx - t.w / 2}px;top:${t.top}px;width:${t.w}px;border-radius:${t.lead ? 24 : 20}px;overflow:hidden;background:linear-gradient(180deg,#0E2A44 0%,#081C30 100%);transform:rotateY(${t.ry}deg);z-index:${t.z};box-shadow:0 0 0 ${t.lead ? 2 : 1}px ${t.lead ? 'rgba(114,222,216,.85)' : 'rgba(255,255,255,.16)'},0 40px 90px rgba(0,6,16,.7),0 0 ${t.lead ? 90 : 40}px rgba(114,222,216,${t.lead ? '.45' : '.16'});${REFLECT}">
 <img src="${img}" alt="${t.n}, ${t.r}" style="display:block;width:${t.w}px;height:${ph}px;object-fit:cover">
 <div style="padding:${t.lead ? '18px 20px 20px' : '14px 16px 16px'}"><p style="margin:0;font:600 ${t.lead ? 30 : 22}px Pop;color:#fff">${t.n}</p><p style="margin:3px 0 0;font:400 ${t.lead ? 18 : 15}px/1.3 Pop;color:${t.lead ? GL.color.halo : '#C9D6E2'}">${t.r}</p></div>
</div>`
    }
    return stageBg(1300, 520) + platform(1300, 850, 560, 118) + `
<div style="position:absolute;inset:0;perspective:1800px;perspective-origin:1300px 450px;z-index:2">${cards}</div>
<div style="position:absolute;left:1050px;top:815px;width:500px;text-align:center;z-index:6"><p style="margin:0;font:760 46px Bric;letter-spacing:-.03em;line-height:1;color:#fff;text-shadow:0 0 30px rgba(114,222,216,.45)">Tu marca</p><p style="margin:4px 0 0;font:300 19px Pop;color:#E6EDF3">al centro de todo</p></div>` + bigVoice('Tu equipo', '¿Quién trabaja en tu cuenta?', `Personas<br>${answerHtml('reales', GL.color.teal)}`, `Un squad que orbita tu marca y <b style="font-weight:600;color:#fff">un</b> solo interlocutor: tu Responsable de Cuenta.`, 2, 140) + urlSign()
  } },
  // PL · Plan de 90 días con impacto (operador, 2026-09-27: «hay que mejorarla»): la órbita se vuelve una trayectoria que
  // SUBE en perspectiva, de adelante-izquierda a atrás-derecha; tres paradas con su luz y una ficha de vidrio cada una,
  // cada vez más alta. La primera está encendida («Estás aquí»); el «90» gigante y tenue es el horizonte.
  { id: 'PL-plan-impacto', body: async () => {
    const P0 = [760, 930], C1 = [1420, 940], P2 = [1720, 360]
    const q = t => [(1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * C1[0] + t * t * P2[0], (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * C1[1] + t * t * P2[1]]
    const path = Array.from({ length: 81 }, (_, k) => { const [x, y] = q(k / 80); return `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join(' ')
    const lit = Array.from({ length: 31 }, (_, k) => { const [x, y] = q(0.05 + 0.2 * k / 30); return `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join(' ')
    const stops = [
      { t: 0.14, d: 'Días 1–30', ti: 'Arranque', de: 'Auditoría, línea base y primeras piezas: movimiento desde la primera semana.', on: true },
      { t: 0.52, d: 'Días 31–60', ti: 'Ritmo pleno', de: 'El ciclo mensual completo: planificar, producir, entregar y medir.' },
      { t: 0.86, d: 'Días 61–90', ti: 'Evidencia', de: 'Primera evidencia medible y primer informe de resultados.' }
    ]
    let nodes = '', cards = ''
    for (const [i, s] of stops.entries()) {
      const [x, y] = q(s.t), cw = 300, lift = 64, top = y - lift - 196
      nodes += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - lift}" stroke="${s.on ? GL.color.teal : GL.color.halo}" stroke-opacity="${s.on ? 1 : .5}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${s.on ? 13 : 9}" fill="${s.on ? GL.color.teal : '#0B2A40'}" stroke="${GL.color.halo}" stroke-width="3"${s.on ? ' filter="url(#plg)"' : ''}/>`
      cards += `<div style="position:absolute;left:${x - cw / 2}px;top:${top}px;width:${cw}px;box-sizing:border-box;padding:20px 22px 22px;border-radius:20px;background:${s.on ? 'linear-gradient(160deg,#0F4A5C 0%,#0A2A40 100%)' : 'linear-gradient(160deg,#0E2A44 0%,#081C30 100%)'};z-index:${4 + i};box-shadow:0 0 0 ${s.on ? 2 : 1}px ${s.on ? 'rgba(114,222,216,.9)' : 'rgba(255,255,255,.16)'},0 34px 80px rgba(0,6,16,.65),0 0 ${s.on ? 80 : 30}px rgba(114,222,216,${s.on ? '.45' : '.12'})">
 <p style="margin:0;font:600 15px Pop;letter-spacing:.12em;text-transform:uppercase;color:${s.on ? GL.color.halo : SOFT}">${i + 1} · ${s.d}${s.on ? ' · <span style="color:#fff">Estás aquí</span>' : ''}</p>
 <p style="margin:8px 0 0;font:760 40px Bric;letter-spacing:-.03em;line-height:1;color:#fff">${s.ti}</p>
 <p style="margin:10px 0 0;font:400 17px/1.45 Pop;color:#D6E2EC">${s.de}</p></div>`
    }
    const svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:3"><defs><linearGradient id="plt" gradientUnits="userSpaceOnUse" x1="${P0[0]}" y1="${P0[1]}" x2="${P2[0]}" y2="${P2[1]}"><stop offset="0" stop-color="${GL.color.halo}" stop-opacity=".25"/><stop offset="1" stop-color="${GL.color.halo}" stop-opacity=".7"/></linearGradient><filter id="plg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="plb"><feGaussianBlur stdDeviation="10"/></filter></defs>
<path d="${path}" fill="none" stroke="url(#plt)" stroke-width="4"/>
<path d="${lit}" fill="none" stroke="${GL.color.teal}" stroke-width="18" opacity=".45" filter="url(#plb)"/>
<path d="${lit}" fill="none" stroke="${GL.color.teal}" stroke-width="8" stroke-linecap="round"/>
${nodes}</svg>`
    return stageBg(1360, 560) + `
<p aria-hidden="true" style="position:absolute;left:1050px;top:40px;margin:0;font:760 560px Bric;letter-spacing:-.06em;line-height:1;color:rgba(114,222,216,.07);z-index:1">90</p>
${svg}${cards}` + bigVoice('Plan de trabajo', '¿Qué pasa al empezar?', answerHtml('Movimiento', GL.color.teal), `<b style="font-weight:600;color:#fff">90</b> días a la primera evidencia medible, en tres tramos de 30. Desde la primera semana ya hay piezas en marcha.`, 2, 112) + urlSign()
  } }
  ,
  // PP · PRÓXIMOS PASOS CON IMPACTO (operador, 2026-09-27: «aún no me termina de convencer»). El siguiente paso se
  // VIVE: la agenda abierta con un horario elegido y el cursor del cliente en «Agenda un diagnóstico» (grupo CTA
  // aprobado: corchetes + cursor local). Detrás, en profundidad, los dos pasos que vienen. La órbita rodea la
  // escena y el pie completa la voz. Horarios de muestra.
  { id: 'PP-proximos-impacto', sel: { mode: 'cta', targetKind: 'group', padding: 'compact', anchor: 'end-center', scale: 1.25 }, body: async () => {
    const days = [['Lun', '29'], ['Mar', '30'], ['Mié', '1'], ['Jue', '2'], ['Vie', '3']], times = ['09:30', '11:30', '15:00', '17:00']
    const chip = (t, on, w) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:${w}px;height:54px;border-radius:12px;font:${on ? 600 : 400} 19px Pop;color:${on ? '#fff' : INK};background:${on ? GL.color.dark : PAPER};box-shadow:0 0 0 1px ${on ? GL.color.dark : LINE} inset">${t}</span>`
    const day = ([d, n], on) => `<span style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:92px;height:84px;border-radius:14px;background:${on ? GL.color.dark : PAPER};box-shadow:0 0 0 1px ${on ? GL.color.dark : LINE} inset"><span style="font:500 14px Pop;letter-spacing:.08em;text-transform:uppercase;color:${on ? GL.color.halo : MUTED}">${d}</span><span style="font:760 34px Bric;line-height:1.05;color:${on ? '#fff' : INK}">${n}</span></span>`
    const next = (n, k, t, d, x, y, w, ry, op) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;box-sizing:border-box;padding:24px 26px 26px;border-radius:22px;background:linear-gradient(160deg,#10324C 0%,#081C30 100%);transform:perspective(1400px) rotateY(${ry}deg);transform-origin:left center;opacity:${op};${deep};z-index:2">
<p style="margin:0;font:600 15px Pop;letter-spacing:.12em;text-transform:uppercase;color:${SOFT}"><span style="font:300 34px Bric;letter-spacing:-.03em;color:${GL.color.halo};vertical-align:-4px;margin-right:10px">${n}</span>${k}</p>
<p style="margin:12px 0 0;font:760 44px Bric;letter-spacing:-.03em;line-height:1;color:#fff">${t}</p>
<p style="margin:10px 0 0;font:400 18px/1.45 Pop;color:#C9D6E2">${d}</p></div>`
    const cx = 1420, cy = 560, r = 430
    const orbit = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><defs><filter id="ppg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter></defs>
<ellipse cx="${cx}" cy="${cy}" rx="${r + 120}" ry="${r - 40}" fill="none" stroke="${GL.color.halo}" stroke-opacity=".35" stroke-width="3"/>
<path d="M ${cx - r - 120} ${cy} A ${r + 120} ${r - 40} 0 0 0 ${cx + (r + 120) * Math.cos(1.745)} ${cy + (r - 40) * Math.sin(1.745)}" fill="none" stroke="${GL.color.teal}" stroke-width="16" opacity=".4" filter="url(#ppg)"/>
<path d="M ${cx - r - 120} ${cy} A ${r + 120} ${r - 40} 0 0 0 ${cx + (r + 120) * Math.cos(1.745)} ${cy + (r - 40) * Math.sin(1.745)}" fill="none" stroke="${GL.color.teal}" stroke-width="7" stroke-linecap="round"/>
<circle cx="${cx + (r + 120) * Math.cos(1.745)}" cy="${cy + (r - 40) * Math.sin(1.745)}" r="18" fill="${GL.color.teal}" filter="url(#ppg)" opacity=".8"/><circle cx="${cx + (r + 120) * Math.cos(1.745)}" cy="${cy + (r - 40) * Math.sin(1.745)}" r="13" fill="${GL.color.teal}"/></svg>`
    const card = `<div style="position:absolute;left:900px;top:310px;width:680px;box-sizing:border-box;padding:34px 38px 38px;border-radius:26px;background:${CARD};${deep};z-index:3">
<div style="display:flex;align-items:center;gap:16px">${tile(ISO, GL.color.dark, 30, 56)}<div><p style="margin:0;font:600 14px Pop;letter-spacing:.12em;text-transform:uppercase;color:${GL.color.tealDark}">01 · Diagnóstico · Sin costo</p><p style="margin:4px 0 0;font:760 36px Bric;letter-spacing:-.025em;line-height:1.05;color:${INK}">Agenda tu diagnóstico</p></div></div>
<p style="margin:18px 0 0;font:400 18px/1.45 Pop;color:${MUTED}">45 min por videollamada · Brand Visibility Grader, CRM Gap Analysis o Creative Velocity Audit</p>
<div style="display:flex;gap:12px;margin-top:26px">${days.map((d, i) => day(d, i === 1)).join('')}</div>
<div style="display:flex;gap:12px;margin-top:14px">${times.map((t, i) => chip(t, i === 1, 113)).join('')}</div>
<div style="display:flex;align-items:center;justify-content:space-between;margin-top:30px"><span style="font:400 16px Pop;color:${MUTED}">Martes 30 · 11:30 · hora de Chile</span>
<span data-sel style="display:inline-block;padding:20px 34px;border-radius:14px;background:${GL.color.teal};font:600 23px Pop;color:${GL.color.dark};white-space:nowrap">Agenda un diagnóstico</span></div></div>`
    return stageBg(1330, 520) + orbit
      + next('02', 'Piloto pagado', 'Sample Sprint', 'Acotado y gobernado, para probar el encaje antes de comprometerte.', 1410, 104, 380, -14, .9)
      + next('03', 'On-Going', 'Operación', 'Tus métricas en vivo en Greenhouse.', 1520, 830, 330, -16, .8)
      + card
      + bigVoice('Próximos pasos', '¿Y ahora qué sigue?', answerHtml('Empecemos', GL.color.teal), `Un diagnóstico <b style="font-weight:600;color:#fff">sin costo</b> para saber dónde estás.<span style="display:block;margin-top:22px;font:300 19px/1.6 Pop;color:${SOFT}">sales@efeoncepro.com<br>+56 9 3732 3064</span>`, 1, 128)
      + urlSign()
  } }

  ,
  // CQ1 · COTIZACIÓN EN ESCENA (operador, 2026-09-27: «dos variaciones más, elegantes, con punch»): los tres planes
  // como fichas de vidrio en 3D sobre la órbita-plataforma; Pro al frente, en papel, con el cursor de Finanzas.
  { id: 'CQ1-cotizacion-escena', sel: { targetKind: 'object', label: 'Finanzas', participantKind: 'department', anchor: 'top-end', scale: 1.1 }, body: async () => {
    const P = [
      { n: 'Basic', t: 'Para empezar a medir', f: ['Dashboard y KPIs', 'OTD y RpA', 'Gobierno de marca con IA', 'Reporting mensual'], cx: 960, top: 250, w: 300, ry: 16, z: 2 },
      { n: 'Pro', t: 'Para operar y decidir', f: ['Dashboard, KPIs y acciones', 'Suma Revenue Enabled', 'Recomendaciones de IA', 'Aprobar y solicitar en el portal', 'Reporting quincenal'], cx: 1320, top: 190, w: 370, ry: 0, z: 5, lead: true },
      { n: 'Enterprise', t: 'Para escalar con IA', f: ['Suma IA y API', 'Benchmarks de industria', 'Agentes a medida', 'Integraciones', 'Reporting en tiempo real'], cx: 1680, top: 250, w: 300, ry: -16, z: 2 }
    ]
    const cards = P.map(p => {
      const L = p.lead, ink = L ? INK : '#fff', soft = L ? MUTED : '#9FB3C8', rule = L ? LINE : 'rgba(255,255,255,.12)'
      return `<div ${L ? 'data-sel ' : ''}style="position:absolute;left:${p.cx - p.w / 2}px;top:${p.top}px;width:${p.w}px;box-sizing:border-box;padding:${L ? '34px 32px 30px' : '28px 26px 26px'};border-radius:${L ? 26 : 22}px;background:${L ? CARD : 'linear-gradient(165deg,#12344F 0%,#081C30 100%)'};transform:rotateY(${p.ry}deg);z-index:${p.z};box-shadow:0 0 0 ${L ? 2 : 1}px ${L ? 'rgba(114,222,216,.9)' : 'rgba(255,255,255,.16)'},0 50px 110px rgba(0,6,16,.7),0 0 ${L ? 110 : 40}px rgba(114,222,216,${L ? '.5' : '.14'});${REFLECT}">
${L ? `<p style="margin:0 0 12px;font:600 14px Pop;letter-spacing:.14em;text-transform:uppercase;color:${GL.color.tealDark}">Recomendado</p>` : ''}
<p style="margin:0;font:760 ${L ? 66 : 48}px Bric;letter-spacing:-.035em;line-height:1;color:${ink}">${p.n}</p>
<p style="margin:8px 0 0;font:400 ${L ? 20 : 17}px Pop;color:${soft}">${p.t}</p>
<p style="margin:${L ? 26 : 20}px 0 0;font:600 ${L ? 42 : 32}px Pop;letter-spacing:-.01em;color:${L ? GL.color.dark : '#fff'}">[MONTO]</p>
<p style="margin:2px 0 0;font:400 15px Pop;color:${soft}">al mes · neto + IVA</p>
<div style="margin-top:${L ? 22 : 18}px">${p.f.map(f => `<p style="margin:0;padding:${L ? 12 : 10}px 0;border-top:1.5px solid ${rule};font:400 ${L ? 18 : 16}px/1.3 Pop;color:${L ? INK : '#D6E2EC'}">${f}</p>`).join('')}</div></div>`
    }).join('')
    return stageBg(1320, 520) + platform(1320, 880, 540, 100) + `
<div style="position:absolute;inset:0;perspective:1800px;perspective-origin:1320px 450px;z-index:2">${cards}</div>` + bigVoice('Inversión', '¿Cómo se cotiza?', `Por<br>${answerHtml('capacidad', GL.color.teal)}`, `Capacidad gobernada, <b style="font-weight:600;color:#fff">nunca</b> por horas ni piezas. Greenhouse suma la capa de producto.<span style="display:block;margin-top:18px;font:300 17px/1.5 Pop;color:${SOFT}">Valores netos, IVA no incluido. Los montos se definen en cada propuesta.</span>`, 1, 118) + urlSign()
  } }
  ,
  // CQ2 · LA COTIZACIÓN EN VIVO («vívelo»): la cotización tal como la recibe el cliente, cada línea a la vista y su
  // cursor en «Aprobar propuesta» (grupo CTA aprobado). Montos por definir en cada propuesta.
  { id: 'CQ2-cotizacion-vivo', sel: { mode: 'cta', targetKind: 'group', padding: 'compact', anchor: 'end-center', scale: 1.2 }, body: async () => {
    const rows = [['Equipo', 'Capacidad gobernada del squad', '[MONTO] / mes'], ['Greenhouse Pro', 'Dashboard, KPIs, acciones y reporting quincenal', '[MONTO] / mes'], ['Sample Sprint', 'Piloto pagado y acotado para arrancar', '[MONTO] · único']]
    const row = ([a, b, c], i) => `<div style="display:flex;align-items:center;gap:18px;padding:20px 0;border-top:1.5px solid ${LINE}"><span style="width:44px;height:44px;border-radius:12px;background:${i === 0 ? GL.color.dark : PAPER};display:inline-flex;align-items:center;justify-content:center;font:760 20px Bric;color:${i === 0 ? GL.color.halo : INK}">${i + 1}</span><div style="flex:1"><p style="margin:0;font:600 22px Pop;color:${INK}">${a}</p><p style="margin:2px 0 0;font:400 16px Pop;color:${MUTED}">${b}</p></div><p style="margin:0;font:600 21px Pop;color:${INK};white-space:nowrap">${c}</p></div>`
    const doc = `<div style="position:absolute;left:800px;top:170px;width:780px;box-sizing:border-box;padding:38px 42px 40px;border-radius:26px;background:${CARD};transform:perspective(1800px) rotateY(-7deg);transform-origin:right center;${deep};z-index:3">
<div style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:16px">${tile(ISO, GL.color.dark, 30, 56)}<div><p style="margin:0;font:600 14px Pop;letter-spacing:.12em;text-transform:uppercase;color:${GL.color.tealDark}">Propuesta · Cotización</p><p style="margin:4px 0 0;font:760 34px Bric;letter-spacing:-.025em;line-height:1.05;color:${INK}">Para tu marca</p></div></div></div>
<div style="margin-top:26px">${rows.map(row).join('')}</div>
<div style="display:flex;align-items:flex-end;justify-content:space-between;padding-top:22px;border-top:2px solid ${INK}"><div><p style="margin:0;font:500 15px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">Total mensual</p><p style="margin:6px 0 0;font:760 56px Bric;letter-spacing:-.03em;line-height:1;color:${INK}">[MONTO]</p><p style="margin:6px 0 0;font:400 15px Pop;color:${MUTED}">neto + IVA</p></div>
<span data-sel style="display:inline-block;padding:20px 32px;border-radius:14px;background:${GL.color.teal};font:600 22px Pop;color:${GL.color.dark};white-space:nowrap">Aprobar propuesta</span></div></div>`
    const chip = (x, y, a, b, ry, z) => `<div style="position:absolute;left:${x}px;top:${y}px;box-sizing:border-box;padding:18px 22px;border-radius:18px;background:linear-gradient(160deg,#12344F 0%,#081C30 100%);transform:perspective(1400px) rotateY(${ry}deg);box-shadow:0 0 0 1px rgba(255,255,255,.16),0 30px 70px rgba(0,6,16,.65),0 0 40px rgba(114,222,216,.16);z-index:${z}"><p style="margin:0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${GL.color.halo}">${a}</p><p style="margin:6px 0 0;font:600 21px/1.3 Pop;color:#fff">${b}</p></div>`
    return stageBg(1200, 540) + platform(1200, 960, 560, 90)
      + chip(1520, 110, 'Cómo se mide', 'Capacidad gobernada,<br>nunca horas ni piezas', -14, 4)
      + doc
      + chip(1600, 850, 'Sin sorpresas', 'Valores netos,<br>IVA no incluido', -16, 4)
      + bigVoice('Inversión', '¿Cuánto cuesta?', `Sin letra<br>${answerHtml('chica', GL.color.teal)}`, `Cada línea de la cotización a la vista, con su <b style="font-weight:600;color:#fff">monto</b> y lo que incluye. Los montos se definen en cada propuesta.`, 1, 118) + urlSign()
  } }

  ,
  // ── SEO · AEO (operador, 2026-09-28: «las altas con altísimo nivel de detalle»), desde las landings públicas
  // /aeo-2/ y /servicios/posicionamiento-seo/. Cifras con su fuente tal como la publica el sitio.
  // MX1 · LA RESPUESTA DE LA IA: el mismo prompt, dos respuestas. Atrás «Hoy» (tu marca no aparece); al frente «Con
  // AEO» (tu marca primera, citada). Interfaz genérica de motor de IA —como la landing—, sin imitar ningún producto.
  { id: 'MX1-ia-responde', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const PROMPT = '¿Cuáles son las mejores marcas de [tu categoría] en Chile?'
    const globe = c => `<svg viewBox="0 0 16 16" width="15" height="15" style="flex:none"><circle cx="8" cy="8" r="6.4" fill="none" stroke="${c}" stroke-width="1.3"/><path d="M1.8 8h12.4M8 1.6c2.1 2.2 2.1 10.6 0 12.8M8 1.6c-2.1 2.2-2.1 10.6 0 12.8" fill="none" stroke="${c}" stroke-width="1.1"/></svg>`
    const cite = (t, on) => `<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:${on ? 'rgba(54,200,191,.14)' : PAPER};box-shadow:0 0 0 1px ${on ? 'rgba(20,140,133,.35)' : LINE} inset;font:500 13px Pop;color:${on ? GL.color.tealDark : MUTED};white-space:nowrap">${globe(on ? GL.color.tealDark : MUTED)}${t}</span>`
    const engine = (w, label, tone) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 16px;border-bottom:1px solid ${LINE}"><div style="display:flex;align-items:center;gap:10px"><span style="display:inline-flex;width:30px;height:30px;border-radius:50%;background:${INK};align-items:center;justify-content:center"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8z" fill="#fff"/></svg></span><span style="font:600 16px Pop;color:${INK}">Motor de IA</span></div><span style="padding:6px 13px;border-radius:999px;font:600 13px Pop;letter-spacing:.08em;text-transform:uppercase;${tone}">${label}</span></div>
<div style="display:flex;justify-content:flex-end;margin-top:18px"><p style="margin:0;max-width:${w - 140}px;padding:12px 16px;border-radius:16px 16px 4px 16px;background:${PAPER};font:400 16px/1.4 Pop;color:${INK}">${PROMPT}</p></div>`
    const row = (n, name, desc, cites, on) => `<div ${on ? 'data-sel ' : ''}style="display:flex;gap:14px;padding:${on ? '14px 16px' : '11px 4px'};margin-top:${on ? 10 : 2}px;border-radius:14px;${on ? `background:rgba(54,200,191,.10);box-shadow:0 0 0 2px ${GL.color.teal} inset;` : ''}"><span style="font:760 ${on ? 26 : 20}px Bric;color:${on ? GL.color.tealDark : MUTED};line-height:1.2;width:22px">${n}</span><div style="flex:1"><p style="margin:0;font:${on ? 700 : 600} ${on ? 21 : 17}px Pop;color:${INK}">${name}</p>${desc ? `<p style="margin:4px 0 0;font:400 ${on ? 15 : 14}px/1.45 Pop;color:${MUTED}">${desc}</p>` : ''}${cites ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px">${cites}</div>` : ''}</div></div>`
    const back = `<div style="position:absolute;left:730px;top:168px;width:520px;box-sizing:border-box;padding:24px 26px 26px;border-radius:24px;background:${CARD};opacity:.82;transform:perspective(1600px) rotateY(16deg);transform-origin:right center;${deep};z-index:2">
${engine(520, 'Hoy', `background:${PAPER};color:${MUTED};box-shadow:0 0 0 1px ${LINE} inset`)}
<p style="margin:18px 0 6px;font:400 15px/1.45 Pop;color:${INK}">Estas son las opciones más recomendadas:</p>
${row(1, 'Competidor A', 'Líder en recordación de la categoría.', cite('comparador.cl') + cite('medio-sectorial.com'))}
${row(2, 'Competidor B', null, cite('competidor-b.com'))}
${row(3, 'Competidor C', null, null)}
<div style="display:flex;align-items:center;gap:10px;margin-top:16px;padding:12px 14px;border-radius:12px;background:${PAPER};box-shadow:0 0 0 1px ${LINE} inset"><span style="width:18px;height:18px;border-radius:50%;box-shadow:0 0 0 2px #9AA6B2 inset"></span><span style="font:600 15px Pop;color:${MUTED}">Tu marca no aparece</span></div></div>`
    const front = `<div style="position:absolute;left:1040px;top:246px;width:600px;box-sizing:border-box;padding:26px 28px 28px;border-radius:26px;background:${CARD};box-shadow:0 0 0 2px rgba(114,222,216,.85),0 60px 120px rgba(0,6,16,.75),0 0 120px rgba(114,222,216,.35);z-index:4">
${engine(600, 'Con AEO', `background:${GL.color.dark};color:${GL.color.halo}`)}
<p style="margin:18px 0 0;font:400 15px/1.45 Pop;color:${INK}">Para [tu categoría] en Chile, la opción más recomendada es:</p>
${row(1, 'Tu marca', 'Referente de la categoría: casos verificables, precios claros y reseñas consistentes.', cite('tumarca.com', true) + cite('medio-sectorial.com', true) + cite('comparador.cl', true), true)}
${row(2, 'Competidor A', null, null)}
${row(3, 'Competidor B', null, null)}</div>`
    return stageBg(1330, 560) + platform(1230, 840, 560, 80) + beam(1240, 600, 1080, 470, 'mx1') + back + front
      + `<p style="position:absolute;left:1040px;top:772px;width:600px;text-align:right;margin:0;font:400 15px Pop;color:${SOFT};z-index:5">Ejemplo ilustrativo · tu diagnóstico muestra tu situación real</p>`
      + bigVoice('Visibilidad en IA', '¿A quién recomienda la IA?', `A tu<br>${answerHtml('competencia', GL.color.teal)}`, `Cuando tu comprador pregunta por tu categoría, la IA ya tiene favoritas. El AEO hace que la <b style="font-weight:600;color:#fff">próxima</b> respuesta te nombre.`, 2, 96) + urlSign()
  } }
  ,
  // MX2 · CONTEXTO DE MERCADO: tres monolitos de vidrio sobre la órbita-plataforma, una cifra por fuente, tal como
  // la publica /aeo-2/ (HubSpot 2026, McKinsey 2025, SparkToro 2026). La del centro, la del comprador, adelante.
  { id: 'MX2-mercado', body: async () => {
    const white = async (file, h) => { const b = await sharp(file, { density: 600 }).resize({ height: h * 2 }).ensureAlpha().extractChannel('alpha').toBuffer(); const m = await sharp(b).metadata(); return { src: 'data:image/png;base64,' + (await sharp({ create: { width: m.width, height: m.height, channels: 3, background: '#E6EDF3' } }).joinChannel(b).png().toBuffer()).toString('base64'), w: Math.round(m.width / 2), h } }
    const hs = await white(R + 'public/images/logos/axis/hubspot-logotype.svg', 26)
    const sp = await white(R + 'docs/assets/public-site/aeo-market-logos/sparktoro-logo.svg', 24)
    const C3 = [
      { n: '−27%', t: 'El tráfico que llegaba solo ya no está garantizado.', d: 'El tráfico orgánico de clientes HubSpot cayó 27% interanual.', src: `<img src="${hs.src}" alt="HubSpot" style="height:${hs.h}px;width:${hs.w}px">`, y: '2026', cx: 990, top: 250, w: 300, ry: 16, z: 2 },
      { n: '50%', t: 'Tu comprador ya le pregunta a la IA qué elegir.', d: 'Uno de cada dos consumidores ya usa búsqueda con IA, y la mayoría la prefiere para decidir compras.', src: `<span style="font:700 22px Pop;letter-spacing:-.01em;color:#E6EDF3">McKinsey &amp; Company</span>`, y: '2025', cx: 1320, top: 190, w: 370, ry: 0, z: 5, lead: true },
      { n: '<1 en 100', t: 'Aparecer una vez no es una estrategia.', d: 'Los motores de IA casi nunca repiten la misma lista de marcas.', src: `<img src="${sp.src}" alt="SparkToro" style="height:${sp.h}px;width:${sp.w}px">`, y: '2026', cx: 1650, top: 250, w: 300, ry: -16, z: 2 }
    ]
    const cards = C3.map(c => `<div style="position:absolute;left:${c.cx - c.w / 2}px;top:${c.top}px;width:${c.w}px;height:${c.lead ? 600 : 540}px;box-sizing:border-box;padding:${c.lead ? '34px 32px' : '28px 26px'};border-radius:24px;display:flex;flex-direction:column;background:linear-gradient(165deg,${c.lead ? '#135064' : '#12344F'} 0%,#081C30 100%);transform:rotateY(${c.ry}deg);z-index:${c.z};box-shadow:0 0 0 ${c.lead ? 2 : 1}px ${c.lead ? 'rgba(114,222,216,.9)' : 'rgba(255,255,255,.16)'},0 50px 110px rgba(0,6,16,.7),0 0 ${c.lead ? 120 : 40}px rgba(114,222,216,${c.lead ? '.45' : '.14'});${REFLECT}">
<p style="margin:0;font:760 ${c.n.length > 5 ? 76 : c.lead ? 150 : 116}px Bric;letter-spacing:-.05em;line-height:.95;color:${c.lead ? '#fff' : '#E6EDF3'};white-space:nowrap">${c.n}</p>
<p style="margin:26px 0 0;font:760 ${c.lead ? 30 : 26}px/1.12 Bric;letter-spacing:-.02em;color:#fff">${c.t}</p>
<p style="margin:14px 0 0;font:400 ${c.lead ? 18 : 16}px/1.5 Pop;color:#C9D6E2">${c.d}</p>
<div style="margin-top:auto;padding-top:18px;border-top:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:space-between">${c.src}<span style="font:500 15px Pop;color:${SOFT}">${c.y}</span></div></div>`).join('')
    return stageBg(1320, 520) + platform(1320, 890, 520, 90) + `
<div style="position:absolute;inset:0;perspective:1800px;perspective-origin:1320px 450px;z-index:2">${cards}</div>`
      + bigVoice('El contexto', '¿Dónde busca tu cliente?', answerHtml('En la IA', GL.color.teal), `SEO te hacía competir por el ranking. AEO te hace competir por la <b style="font-weight:600;color:#fff">recomendación</b>: antes de que exista un clic.`, 2, 132) + urlSign()
  } }
  ,
  // MX3 · EL MÉTODO EN CICLO (Surround Discovery): la órbita tendida en perspectiva ES el loop; cuatro estaciones
  // con los íconos 3D del servicio (los mismos de /aeo-2/), el tramo encendido recorre el ciclo y la esfera avanza.
  { id: 'MX3-ciclo', body: async () => {
    const IC = R + 'docs/assets/public-site/aeo-service-icons/v2/'
    const icon = async (f, px) => 'data:image/png;base64,' + (await sharp(IC + f + '.png').resize(px * 2, px * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()).toString('base64')
    const cx = 1290, cy = 600, rx = 380, ry = 140
    const P = a => [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]
    const st = [
      { f: 'measure', n: '01', t: 'Medir', d: 'Tu visibilidad en ChatGPT, AI Overviews, Gemini, Perplexity, Copilot y Claude, por mercado y por prompt.', a: -Math.PI / 2, box: [-180, -300, 360] },
      { f: 'create', n: '02', t: 'Crear', d: 'Los activos que los motores entienden, citan y reproducen. No más contenido: el correcto.', a: 0, box: [-110, -262, 300] },
      { f: 'distribute', n: '03', t: 'Distribuir', d: 'Tu presencia en cada superficie donde los motores descubren marcas, no sólo en tu sitio.', a: Math.PI / 2, box: [-180, 64, 360] },
      { f: 'optimize', n: '04', t: 'Optimizar', d: 'Cada ciclo aprende del anterior: subes un nivel, medimos y corregimos.', a: Math.PI, box: [-290, 60, 300] }
    ]
    let icons = '', cards = ''
    for (const [i, s] of st.entries()) {
      const [x, y] = P(s.a), px = i === 0 ? 118 : 100, on = i === 0
      icons += `<img src="${await icon(s.f, px)}" alt="" style="position:absolute;left:${x - px / 2}px;top:${y - px * .78}px;width:${px}px;height:${px}px;z-index:4;filter:drop-shadow(0 18px 24px rgba(0,6,16,.6))">`
      const [dx, dy, w] = s.box
      cards += `<div style="position:absolute;left:${x + dx}px;top:${y + dy}px;width:${w}px;box-sizing:border-box;padding:16px 20px 18px;border-radius:18px;background:${on ? 'linear-gradient(160deg,#0F4A5C 0%,#0A2A40 100%)' : 'linear-gradient(160deg,#0E2A44 0%,#081C30 100%)'};z-index:5;box-shadow:0 0 0 ${on ? 2 : 1}px ${on ? 'rgba(114,222,216,.9)' : 'rgba(255,255,255,.16)'},0 30px 70px rgba(0,6,16,.6),0 0 ${on ? 70 : 24}px rgba(114,222,216,${on ? '.4' : '.1'})">
<p style="margin:0;font:600 14px Pop;letter-spacing:.12em;text-transform:uppercase;color:${on ? GL.color.halo : SOFT}">${s.n}${on ? ' · <span style="color:#fff">Empieza aquí</span>' : ''}</p>
<p style="margin:6px 0 0;font:760 34px Bric;letter-spacing:-.03em;line-height:1;color:#fff">${s.t}</p>
<p style="margin:8px 0 0;font:400 15px/1.45 Pop;color:#D6E2EC">${s.d}</p></div>`
    }
    // flechas del sentido del ciclo, a mitad de cada tramo
    const arrows = [Math.PI * -0.25, Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25].map(a => { const [x, y] = P(a), dxA = -rx * Math.sin(a), dyA = ry * Math.cos(a), ang = Math.atan2(dyA, dxA) * 180 / Math.PI; return `<g transform="translate(${x} ${y}) rotate(${ang})"><path d="M-9 -8 L5 0 L-9 8" fill="none" stroke="${GL.color.halo}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/></g>` }).join('')
    const [sx, sy] = P(-Math.PI / 2 + 1.25)
    const lit = `M ${P(-Math.PI / 2)[0]} ${P(-Math.PI / 2)[1]} A ${rx} ${ry} 0 0 1 ${sx} ${sy}`
    const ring = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:3"><defs><radialGradient id="lp" cx="${cx}" cy="${cy}" r="${rx}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${cy * (1 - ry / rx)}) scale(1 ${ry / rx})"><stop offset="0" stop-color="${GL.color.halo}" stop-opacity=".22"/><stop offset=".75" stop-color="${GL.color.teal}" stop-opacity=".05"/><stop offset="1" stop-color="${GL.color.teal}" stop-opacity="0"/></radialGradient><filter id="lg"><feGaussianBlur stdDeviation="9"/></filter></defs>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#lp)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${GL.color.halo}" stroke-opacity=".5" stroke-width="3"/>
<path d="${lit}" fill="none" stroke="${GL.color.teal}" stroke-width="16" opacity=".45" filter="url(#lg)"/><path d="${lit}" fill="none" stroke="${GL.color.teal}" stroke-width="7" stroke-linecap="round"/>
${arrows}
<circle cx="${sx}" cy="${sy}" r="20" fill="${GL.color.teal}" filter="url(#lg)"/><circle cx="${sx}" cy="${sy}" r="13" fill="${GL.color.teal}"/></svg>`
    const core = `<div style="position:absolute;left:${cx - 150}px;top:${cy - 42}px;width:300px;text-align:center;z-index:4"><p style="margin:0;font:760 38px Bric;letter-spacing:-.03em;line-height:1;color:#fff;text-shadow:0 0 30px rgba(114,222,216,.5)">Tu marca</p><p style="margin:6px 0 0;font:400 16px Pop;color:#D6E2EC">sube un nivel en cada vuelta</p></div>`
    return stageBg(1290, 600) + ring + core + icons + cards
      + bigVoice('Surround Discovery', '¿Cómo se sostiene?', answerHtml('En ciclo', GL.color.teal), `La visibilidad ante la IA no se «logra»: se sostiene. Cada ciclo aprende del anterior y te sube un <b style="font-weight:600;color:#fff">nivel</b>.`, 1, 150) + urlSign()
  } }

  ,
  // ── SEO · AEO, prioridad media (operador, 2026-09-28: «ahora haz las medias»)
  // MD1 · LA DIFERENCIA: agencia commodity frente al método medible (de /servicios/posicionamiento-seo/) y, abajo,
  // la objeción del equipo propio (de /aeo-2/): complemento, no reemplazo.
  { id: 'MD1-diferencia', body: async () => {
    const rows = [['Promete «el #1 en Google» garantizado', 'Estima según tu punto de partida, sin promesas vacías'], ['Precio «desde $X» que no dice nada de tu caso', 'Alcance definido por prioridad e impacto real'], ['Reporte lleno de vanity metrics', 'Métricas que mueven el negocio + visibilidad en IA'], ['Caja negra: no sabes qué se hace', 'Ves qué se hace en cada ciclo, con entregables'], ['SEO aislado que ignora la era de la IA', 'Cimiento SEO + puente a AEO para que la IA te cite']]
    const x = (c, on) => on ? `<svg viewBox="0 0 20 20" width="22" height="22" style="flex:none"><circle cx="10" cy="10" r="10" fill="${GL.color.teal}"/><path d="M5.5 10.4l3 3 6-6.4" fill="none" stroke="${GL.color.dark}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : `<svg viewBox="0 0 20 20" width="20" height="20" style="flex:none"><circle cx="10" cy="10" r="9" fill="none" stroke="#7D8A98" stroke-width="1.6"/><path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#7D8A98" stroke-width="1.6" stroke-linecap="round"/></svg>`
    const card = (on) => `<div style="position:absolute;left:${on ? 1290 : 790}px;top:${on ? 170 : 210}px;width:${on ? 520 : 470}px;box-sizing:border-box;padding:${on ? '30px 30px 26px' : '26px 26px 22px'};border-radius:24px;background:${on ? CARD : 'linear-gradient(165deg,#12344F 0%,#081C30 100%)'};transform:perspective(1600px) rotateY(${on ? -6 : 14}deg);transform-origin:${on ? 'left' : 'right'} center;opacity:${on ? 1 : .88};z-index:${on ? 4 : 2};box-shadow:0 0 0 ${on ? 2 : 1}px ${on ? 'rgba(114,222,216,.9)' : 'rgba(255,255,255,.16)'},0 50px 110px rgba(0,6,16,.7),0 0 ${on ? 110 : 30}px rgba(114,222,216,${on ? '.4' : '.08'})">
<p style="margin:0;font:600 14px Pop;letter-spacing:.12em;text-transform:uppercase;color:${on ? GL.color.tealDark : '#9FB3C8'}">${on ? 'Efeonce' : 'La alternativa'}</p>
<p style="margin:6px 0 16px;font:760 ${on ? 38 : 32}px Bric;letter-spacing:-.03em;line-height:1;color:${on ? INK : '#E6EDF3'}">${on ? 'Método medible' : 'Agencia commodity'}</p>
${rows.map(r => `<div style="display:flex;gap:12px;align-items:flex-start;padding:${on ? 13 : 12}px 0;border-top:1.5px solid ${on ? LINE : 'rgba(255,255,255,.1)'}">${x(0, on)}<span style="font:${on ? 500 : 400} ${on ? 18 : 16}px/1.35 Pop;color:${on ? INK : '#9FB3C8'};${on ? '' : 'text-decoration:line-through;text-decoration-color:rgba(159,179,200,.55)'}">${on ? r[1] : r[0]}</span></div>`).join('')}</div>`
    const vs = `<div style="position:absolute;left:1238px;top:470px;width:64px;height:64px;border-radius:50%;background:${GL.color.dark};box-shadow:0 0 0 2px ${GL.color.halo},0 0 40px rgba(114,222,216,.5);display:flex;align-items:center;justify-content:center;font:760 22px Bric;color:#fff;z-index:5">vs</div>`
    const own = `<div style="position:absolute;left:790px;top:858px;width:1020px;box-sizing:border-box;padding:18px 24px;border-radius:18px;background:linear-gradient(160deg,#0E2A44 0%,#081C30 100%);box-shadow:0 0 0 1px rgba(255,255,255,.16),0 30px 70px rgba(0,6,16,.55);display:flex;align-items:center;gap:26px;z-index:3">
<div style="flex:none"><p style="margin:0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${GL.color.halo}">¿Y si lo hace mi equipo?</p><p style="margin:4px 0 0;font:760 26px Bric;letter-spacing:-.02em;color:#fff">Complemento, no reemplazo</p></div>
${[['Velocidad', 'Sin meses de curva de aprendizaje'], ['Método', 'Un sistema probado, multimercado y en español'], ['Foco', 'Tu equipo sigue en lo suyo']].map(([t, d]) => `<div style="flex:1;border-left:1px solid rgba(255,255,255,.14);padding-left:18px"><p style="margin:0;font:600 18px Pop;color:#fff">${t}</p><p style="margin:3px 0 0;font:400 14px/1.35 Pop;color:#C9D6E2">${d}</p></div>`).join('')}</div>`
    return stageBg(1300, 520) + card(false) + card(true) + vs + own
      + bigVoice('La diferencia', '¿Qué nos hace distintos?', `Lo puedes<br>${answerHtml('ver', GL.color.teal)}`, `La mayoría vende promesas. Nosotros, un mecanismo que puedes ver y <b style="font-weight:600;color:#fff">medir</b>.`, 2, 118) + urlSign()
  } }
  ,
  // MD2 · E-E-A-T: cuatro letras de vidrio sobre la órbita-plataforma, cada una con lo que construimos; arriba el peso
  // de E-E-A-T en SEO clásico frente a la IA (de /servicios/posicionamiento-seo/).
  { id: 'MD2-eeat', body: async () => {
    const L4 = [['E', 'Experiencia', 'Contenido de primera mano, escrito por quien lo vivió.', 'Autoría demostrable y casos reales', 'Contenido & landings'], ['E', 'Pericia', 'Profundidad, precisión y fuentes que respaldan cada afirmación.', 'Autores con credenciales, contenido revisado', 'Contenido & landings'], ['A', 'Autoridad', 'Que tu marca sea el referente de su sector.', 'PR, link building y entidad clara', 'PR & link building'], ['T', 'Confianza', 'Un sitio seguro, transparente y verificable.', 'Schema, HTTPS y señales de confianza', 'Técnico & schema']]
    const x0 = 780, w = 232, g = 18
    const tiles = L4.map(([l, t, d, b, k], i) => { const on = i === 3; return `<div style="position:absolute;left:${x0 + i * (w + g)}px;top:${on ? 250 : 280}px;width:${w}px;height:${on ? 560 : 530}px;box-sizing:border-box;padding:22px 22px 20px;border-radius:22px;display:flex;flex-direction:column;background:linear-gradient(165deg,${on ? '#135064' : '#12344F'} 0%,#081C30 100%);z-index:${on ? 4 : 2};box-shadow:0 0 0 ${on ? 2 : 1}px ${on ? 'rgba(114,222,216,.9)' : 'rgba(255,255,255,.16)'},0 50px 110px rgba(0,6,16,.7),0 0 ${on ? 100 : 30}px rgba(114,222,216,${on ? '.45' : '.12'});${REFLECT}">
<p style="margin:0;font:760 150px Bric;letter-spacing:-.05em;line-height:.9;color:${on ? '#fff' : '#E6EDF3'}">${l}</p>
<p style="margin:14px 0 0;font:760 30px Bric;letter-spacing:-.02em;color:#fff">${t}</p>
<p style="margin:8px 0 0;font:400 16px/1.45 Pop;color:#C9D6E2">${d}</p>
<div style="margin-top:auto;padding-top:14px;border-top:1px solid rgba(255,255,255,.14)"><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${on ? GL.color.halo : SOFT}">Lo construimos con</p><p style="margin:5px 0 0;font:600 16px/1.35 Pop;color:#fff">${b}</p><p style="margin:6px 0 0;font:400 13px Pop;color:${SOFT}">${k}</p></div></div>` }).join('')
    const meter = `<div style="position:absolute;left:${x0}px;top:132px;width:${4 * w + 3 * g}px;display:flex;gap:18px;z-index:3">${[['En SEO clásico', 'Importante', .55, false], ['En AEO / IA', 'Determinante', 1, true]].map(([a, v, f, on]) => `<div style="flex:1"><div style="display:flex;justify-content:space-between;font:500 15px Pop;color:${SOFT}"><span>Peso de E-E-A-T · ${a}</span><span style="color:${on ? '#fff' : '#C9D6E2'};font-weight:600">${v}</span></div><div style="margin-top:8px;height:8px;border-radius:99px;background:rgba(255,255,255,.1)"><div style="width:${f * 100}%;height:8px;border-radius:99px;background:${on ? GL.color.teal : '#5E7A94'};box-shadow:${on ? '0 0 16px rgba(54,200,191,.6)' : 'none'}"></div></div></div>`).join('')}</div>`
    return stageBg(1270, 560) + platform(1270, 880, 540, 84) + meter + tiles
      + bigVoice('E-E-A-T', '¿Por qué te citaría la IA?', answerHtml('Porque confía', GL.color.teal).replace('Porque confía', 'Porque<br>confía'), `La IA no adivina: cita a quien puede <b style="font-weight:600;color:#fff">verificar</b>. Cada entregable construye una de estas señales.`, 2, 118) + urlSign()
  } }
  ,
  // MD3 · DEL TRÁFICO AL NEGOCIO: cuatro escalones de vidrio que suben (tráfico calificado → leads → pipeline →
  // ingresos); la línea punteada marca dónde se detiene la mayoría y la luz sigue hasta el negocio.
  { id: 'MD3-trafico-negocio', body: async () => {
    const S4 = [['01', 'Tráfico calificado', 'Visitas con intención comercial, segmentadas por cluster de tema.', 'Google · IA'], ['02', 'Leads', 'Quién llegó, desde qué búsqueda y qué pidió.', 'Formularios · CRM'], ['03', 'Pipeline', 'Oportunidades que nacen del orgánico, en tu CRM.', 'HubSpot · Salesforce'], ['04', 'Ingresos', 'Lo que el SEO trae al negocio, medido.', 'Greenhouse']]
    const x0 = 790, w = 250, g = 16, base = 870
    const steps = S4.map(([n, t, d, k], i) => { const h = 250 + i * 110, on = i === 3; return `<div style="position:absolute;left:${x0 + i * (w + g)}px;top:${base - h}px;width:${w}px;height:${h}px;box-sizing:border-box;padding:20px 20px;border-radius:20px 20px 6px 6px;background:${on ? 'linear-gradient(170deg,#1A6E77 0%,#0B3A4A 100%)' : `linear-gradient(170deg,rgba(114,222,216,${0.10 + i * 0.05}) 0%,#081C30 100%)`};z-index:${2 + i};box-shadow:0 0 0 ${on ? 2 : 1}px ${on ? 'rgba(114,222,216,.9)' : 'rgba(255,255,255,.16)'},0 40px 90px rgba(0,6,16,.6),0 0 ${on ? 110 : 20}px rgba(114,222,216,${on ? '.5' : '.1'})">
<p style="margin:0;font:300 40px Bric;line-height:1;color:${on ? '#fff' : GL.color.halo}">${n}</p>
<p style="margin:8px 0 0;font:760 ${on ? 36 : 28}px Bric;letter-spacing:-.025em;line-height:1.02;color:#fff">${t}</p>
<p style="margin:8px 0 0;font:400 15px/1.4 Pop;color:#D6E2EC">${d}</p>
<p style="position:absolute;left:20px;bottom:16px;margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${on ? '#fff' : SOFT}">${k}</p></div>` }).join('')
    const cut = x0 + w + g / 2
    const line = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:6"><line x1="${cut}" y1="300" x2="${cut}" y2="${base + 30}" stroke="#E6EDF3" stroke-opacity=".6" stroke-width="2" stroke-dasharray="7 8"/></svg>
<p style="position:absolute;left:${cut - 200}px;top:262px;width:190px;text-align:right;margin:0;font:600 15px/1.3 Pop;color:#E6EDF3;z-index:6">La mayoría de las agencias se detiene aquí</p>`
    const pts = [0, 1, 2, 3].map(i => [x0 + i * (w + g) + w / 2, base - (250 + i * 110) - 34])
    const d = 'M ' + pts.map(([px, py], i) => i === 0 ? `${px - 110} ${py + 24} L ${px} ${py}` : `${px} ${py}`).join(' L ')
    const [ex, ey] = pts[3]
    const flow = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:7"><defs><linearGradient id="fl" x1="${x0}" y1="0" x2="${x0 + 4 * w}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${GL.color.halo}" stop-opacity=".2"/><stop offset="1" stop-color="${GL.color.teal}"/></linearGradient><filter id="flg"><feGaussianBlur stdDeviation="7"/></filter></defs>
<path d="${d}" fill="none" stroke="url(#fl)" stroke-width="14" opacity=".5" filter="url(#flg)" stroke-linejoin="round"/>
<path d="${d}" fill="none" stroke="url(#fl)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
${pts.slice(0, 3).map(([px, py]) => `<circle cx="${px}" cy="${py}" r="6" fill="${GL.color.halo}" opacity=".8"/>`).join('')}
<circle cx="${ex}" cy="${ey}" r="18" fill="${GL.color.teal}" filter="url(#flg)"/><circle cx="${ex}" cy="${ey}" r="12" fill="${GL.color.teal}"/></svg>`
    return stageBg(1300, 560) + `<div style="position:absolute;left:${x0 - 20}px;top:${base}px;width:${4 * w + 3 * g + 40}px;border-top:2px solid rgba(255,255,255,.18);z-index:1"></div>` + steps + line + flow
      + bigVoice('De tráfico a negocio', '¿Dónde termina el SEO?', answerHtml('En ingresos', GL.color.teal).replace('En ingresos', 'En<br>ingresos'), `Conectamos el SEO con tus indicadores de negocio —leads, pipeline e <b style="font-weight:600;color:#fff">ingresos</b>—, como siempre debió medirse.`, 2, 132) + urlSign()
  } }
  ,
  // MD4 · LO QUE RECIBES EN EL DIAGNÓSTICO («vívelo»): el informe abierto con sus cuatro entregables —score por motor,
  // share of voice, prompts donde no apareces y plan priorizado— y la lectura experta. Datos de muestra.
  { id: 'MD4-diagnostico', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const eng = [['ChatGPT', 38], ['AI Overviews', 52], ['Gemini', 31], ['Perplexity', 24], ['Copilot', 18], ['Claude', 27]]
    const mod = (n, t, inner, w) => `<div style="box-sizing:border-box;padding:16px 18px;border-radius:16px;background:${PAPER};box-shadow:0 0 0 1px ${LINE} inset;${w ? 'grid-column:span 2;' : ''}"><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${GL.color.tealDark}">${n}</p><p style="margin:3px 0 10px;font:760 20px Bric;letter-spacing:-.015em;color:${INK}">${t}</p>${inner}</div>`
    const bars = eng.map(([e, v]) => `<div style="display:flex;align-items:center;gap:8px;margin-top:6px"><span style="width:92px;font:500 12px Pop;color:${MUTED}">${e}</span><span style="flex:1;height:8px;border-radius:9px;background:#E3E8EE"><span style="display:block;width:${v}%;height:8px;border-radius:9px;background:${GL.color.dark}"></span></span><span style="width:30px;text-align:right;font:600 12px Pop;color:${INK}">${v}</span></div>`).join('')
    const sov = `<div style="display:flex;align-items:center;gap:16px"><svg viewBox="0 0 42 42" width="96" height="96"><circle cx="21" cy="21" r="15.9" fill="none" stroke="#E3E8EE" stroke-width="7"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="${GL.color.dark}" stroke-width="7" stroke-dasharray="14 86" stroke-dashoffset="25"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#5E7A94" stroke-width="7" stroke-dasharray="41 59" stroke-dashoffset="11"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#9FB3C8" stroke-width="7" stroke-dasharray="28 72" stroke-dashoffset="-30"/></svg><div style="font:500 13px/1.7 Pop;color:${MUTED}"><div><b style="color:${INK}">14%</b> Tu marca</div><div>41% Competidor A</div><div>28% Competidor B</div><div>17% Otros</div></div></div>`
    const prompts = ['«mejor agencia de [categoría] en Chile»', '«[categoría] precios y comparativa»', '«alternativas a Competidor A»'].map(p => `<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font:400 13px Pop;color:${INK}"><svg viewBox="0 0 16 16" width="15" height="15"><circle cx="8" cy="8" r="7" fill="none" stroke="#B4261A" stroke-width="1.4"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#B4261A" stroke-width="1.4" stroke-linecap="round"/></svg>${p}</div>`).join('')
    const plan = `<div data-sel style="display:flex;gap:10px">${[['1', 'Corregir cómo te describe la IA', 'Alto impacto'], ['2', 'Schema de organización y entidad', 'Base'], ['3', 'Cluster para los prompts perdidos', 'Contenido']].map(([n, t, k]) => `<div style="flex:1;padding:10px 12px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px ${LINE} inset"><p style="margin:0;font:760 18px Bric;color:${GL.color.tealDark}">${n}</p><p style="margin:2px 0 0;font:600 13px/1.3 Pop;color:${INK}">${t}</p><p style="margin:4px 0 0;font:500 11px Pop;letter-spacing:.06em;text-transform:uppercase;color:${MUTED}">${k}</p></div>`).join('')}</div>`
    const report = `<div style="position:absolute;left:800px;top:128px;width:880px;box-sizing:border-box;padding:28px 30px 26px;border-radius:26px;background:${CARD};transform:perspective(1800px) rotateY(-6deg);transform-origin:left center;${deep};z-index:3">
<div style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:14px">${tile(ISO, GL.color.dark, 28, 50)}<div><p style="margin:0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${GL.color.tealDark}">Diagnóstico de visibilidad en IA</p><p style="margin:3px 0 0;font:760 28px Bric;letter-spacing:-.02em;line-height:1.05;color:${INK}">Tu marca · Chile</p></div></div><span style="padding:7px 13px;border-radius:999px;background:${PAPER};font:500 13px Pop;color:${MUTED}">Datos de muestra</span></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px">
${mod('01 · Score real', 'Tu score por motor de IA', bars)}${mod('02 · Share of voice', 'Frente a tus competidores', sov)}
${mod('03 · Prompts críticos', 'Donde hoy no apareces', prompts)}${mod('04 · Plan priorizado', 'Tus primeros movimientos', plan)}</div></div>`
    const chip = `<div style="position:absolute;left:1500px;top:806px;width:330px;box-sizing:border-box;padding:16px 20px;border-radius:18px;background:linear-gradient(160deg,#0F4A5C 0%,#0A2A40 100%);transform:perspective(1400px) rotateY(-14deg);box-shadow:0 0 0 1px rgba(114,222,216,.6),0 30px 70px rgba(0,6,16,.65),0 0 50px rgba(114,222,216,.25);z-index:5"><p style="margin:0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${GL.color.halo}">Lectura experta</p><p style="margin:6px 0 0;font:500 17px/1.35 Pop;color:#fff">El dato lo da la máquina; el criterio lo pone nuestro equipo.</p></div>`
    return stageBg(1260, 520) + platform(1230, 960, 520, 70) + report + chip
      + bigVoice('Diagnóstico gratis', '¿Qué recibes primero?', answerHtml('El mapa', GL.color.teal), `En 24–48 h sabes en qué nivel estás y por dónde empezamos a <b style="font-weight:600;color:#fff">subirte</b>. Gratis y sin compromiso.`, 2, 150) + urlSign()
  } }

]

const css = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:Pop;src:url(${f64('Poppins-ExtraBold.ttf')});font-weight:800}@font-face{font-family:Pop;src:url(${f64('Poppins-ExtraBoldItalic.ttf')});font-weight:800;font-style:italic}@font-face{font-family:Pop;src:url(${f64('Poppins-BlackItalic.ttf')});font-weight:900;font-style:italic}@font-face{font-family:'Poppins';src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:'Poppins';src:url(${f64('Poppins-ExtraBold.ttf')});font-weight:800}@font-face{font-family:'Poppins';src:url(${f64('Poppins-ExtraBoldItalic.ttf')});font-weight:800;font-style:italic}@font-face{font-family:'Poppins';src:url(${f64('Poppins-BlackItalic.ttf')});font-weight:900;font-style:italic}@font-face{font-family:'Bricolage Grotesque';src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}body{margin:0}</style>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
for (const sl of slides.filter(s => !process.env.ONLY || process.env.ONLY.split(',').includes(s.id))) {
  const body = await sl.body()
  await pg.setContent(`<html><head>${css}</head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${GL.color.dark}">${body}</div></body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  if (sl.sel) console.log(sl.id, JSON.stringify(await paintSelection(pg, sl.sel)).slice(0, 160))
  await pg.screenshot({ path: `${OUT}${sl.id}.png` })
  await sharp(`${OUT}${sl.id}.png`).jpeg({ quality: 88 }).toFile(`${OUT}${sl.id}.jpg`)
  console.log('ok', sl.id)
}
await b.close()
