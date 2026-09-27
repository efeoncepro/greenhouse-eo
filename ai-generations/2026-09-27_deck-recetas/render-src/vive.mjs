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
