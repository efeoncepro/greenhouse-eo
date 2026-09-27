import { paintSelection } from './sel.mjs'
// Brochure: portada y contraportada (opciones para el canvas). Medidas de portada y cierre del canon de AXIS
// (deckSlideHtml cover/close); fotos del registro cine con Nexa protagonista.
import { answerHtml, deckSlideHtml } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'

const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('./out-brochure/', import.meta.url).pathname
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

const DA = R + 'src/lib/artifact-composer/catalogs/deck-axis/assets/'
const SOCIAL = ['spotify', 'instagram', 'linkedin', 'threads', 'youtube', 'tiktok'].map(n => ({ n, src: svgUri(DA + 'social/' + n + '.svg') }))
const SOCIAL_ALT = { spotify: 'Spotify', instagram: 'Instagram', linkedin: 'LinkedIn', threads: 'Threads', youtube: 'YouTube', tiktok: 'TikTok' }
const ICON_FILTER = 'filter:brightness(0) invert(1);opacity:.78'
const socialsHtml = px => `<nav aria-label="Redes sociales de Efeonce" style="display:flex;align-items:center;gap:${Math.round(px * 0.45)}px">${SOCIAL.map(s => `<img src="${s.src}" alt="${SOCIAL_ALT[s.n]}" style="width:${px}px;height:${px}px;object-fit:contain;${ICON_FILTER}">`).join('')}</nav>`
const CI = { mail: svgUri(DA + 'contact/letter-bold.svg'), phone: svgUri(DA + 'contact/phone-calling-bold.svg'), pin: svgUri(DA + 'contact/map-point-bold.svg') }
const CONTACTS = [['mail', 'sales@efeoncepro.com'], ['phone', '+56 9 3732 3064'], ['phone', '+1 (239) 235-2073'], ['pin', 'Dr. Manuel Barros Borgoño 71 OF 1105, Providencia, Chile']]
const contactItem = (k, t, px) => `<span style="display:inline-flex;align-items:center;gap:${Math.round(px * 0.4)}px;white-space:nowrap"><img src="${CI[k]}" alt="" style="width:${Math.round(px * 1.15)}px;height:${Math.round(px * 1.15)}px;${ICON_FILTER}">${t}</span>`

const ringMark = ring

const glowF = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
const giantOrbitBg = (cx, cy, r, deg) => {
  const a = deg * Math.PI / 180, sx = cx + r * Math.cos(a), sy = cy + r * Math.sin(a)
  return `<svg style="position:absolute;inset:0" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><defs>${glowF('g1', 10)}${glowF('g2', 18)}<radialGradient id="halo" cx="${cx}" cy="${cy}" r="${r * 1.1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${TEAL}" stop-opacity=".10"/><stop offset=".75" stop-color="${TEAL}" stop-opacity=".03"/><stop offset="1" stop-color="${TEAL}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="${GL.color.dark}"/><circle cx="${cx}" cy="${cy}" r="${r * 1.1}" fill="url(#halo)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TEAL}" stroke-width="6" filter="url(#g1)"/><circle cx="${sx}" cy="${sy}" r="30" fill="${TEAL}" filter="url(#g2)"/><circle cx="${sx}" cy="${sy}" r="22" fill="#e9fffd"/></svg>`
}

const coverVoice = (eyebrow, q, a, px = 150, qpx = 40, qTop = 640, aTop = 715, lead = '', sel = false) => `
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:110px;width:230px;height:auto;z-index:3">
<p style="position:absolute;left:400px;top:118px;margin:0;font:500 18px/1.2 Pop;letter-spacing:.22em;text-transform:uppercase;color:${SOFT};white-space:nowrap;z-index:3">${eyebrow}</p>
<p style="position:absolute;left:${M}px;top:${qTop}px;margin:0;font:300 ${qpx}px/1.2 Pop;color:#F4F6F8;z-index:3">${ring}${q}</p>
<p ${sel ? 'data-sel ' : ''}style="position:absolute;left:${M - 4}px;top:${aTop}px;margin:0;font:760 ${px}px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;white-space:nowrap;z-index:3">${lead}${answerHtml(a, TEAL)}</p>`

const slides = [
  { id: 'BRO-portada-orbita', sel: { targetKind: 'text', cursor: 'local', anchor: 'end-center', scale: 1.1 }, body: async () => `<img src="${await jpg(PL + 'BR1b-portada-orbita-isotipo.png')}" alt="Nexa, con la chaqueta de Efeonce, mira a cámara frente a una órbita de luz teal gigante con una sola esfera" style="position:absolute;inset:0;width:${W}px;height:${H}px">${coverVoice('Servicios · 2026', '¿Qué hace Efeonce?', 'Crecer', 150, 40, 630, 745, '', true)}` },
  { id: 'BRO-portada-equipo', body: async () => `<img src="${await jpg(PL + 'BR2b-portada-equipo-isotipo.png')}" alt="Nexa al frente del equipo de Efeonce con sus uniformes y cinco agentes mini robots, todos mirando a cámara" style="position:absolute;inset:0;width:${W}px;height:${H}px">${coverVoice('Nuestro equipo', '¿Quién hace crecer<br>tu marca?', 'equipo', 130, 36, 515, 630, 'Este<br>')}` },
  { id: 'BRO-contraportada-orbita', body: async () => {
    const html = deckSlideHtml('close', { sections: 5, current: 5, question: '¿Conversamos?', answer: 'Cuando quieras', line: 'growth', assetBase: '__BA__', idPrefix: 'bc' })
    return html.replaceAll('__BA__efeonce-logo-negative.svg', LOGO).replace('<div class="axis-deck-slide"', '<div class="axis-deck-slide" data-root') +
      `<div style="position:absolute;left:0;top:962px;width:${W}px;display:flex;justify-content:center;align-items:center;gap:40px;z-index:3"><img src="${bubble}" alt="efeoncepro.com" style="height:32px">${socialsHtml(34)}</div>` +
      `<div style="position:absolute;left:0;top:1020px;width:${W}px;display:flex;justify-content:center;align-items:center;gap:34px;font:500 19px/1 Pop;color:${SOFT};z-index:3">${CONTACTS.map(([k, t]) => contactItem(k, t, 19)).join('')}</div>`
  } },
  { id: 'BRO-contraportada-orbita-v2', body: async () => {
    let html = deckSlideHtml('close', { sections: 5, current: 5, question: '¿Conversamos?', answer: 'Cuando quieras', line: 'growth', assetBase: '__BA__', idPrefix: 'bd' })
    // Propuesta de ajuste al cierre: el anillo crece 1,35× alrededor de su centro y el logo pasa de 220 a 460 px.
    html = html.replace(/(<svg[^>]*>)([\s\S]*?)(<\/svg>)/, (m, a, b, c) => `${a}<g transform="translate(960 330) scale(1.35) translate(-960 -330)">${b}</g>${c}`)
    html = html.replace('left:850px;top:304px;width:220px;height:auto', 'left:730px;top:278px;width:460px;height:auto')
    return html.replaceAll('__BA__efeonce-logo-negative.svg', LOGO) +
      `<div style="position:absolute;left:0;top:962px;width:${W}px;display:flex;justify-content:center;align-items:center;gap:40px;z-index:3"><img src="${bubble}" alt="efeoncepro.com" style="height:32px">${socialsHtml(34)}</div>` +
      `<div style="position:absolute;left:0;top:1020px;width:${W}px;display:flex;justify-content:center;align-items:center;gap:34px;font:500 19px/1 Pop;color:${SOFT};z-index:3">${CONTACTS.map(([k, t]) => contactItem(k, t, 19)).join('')}</div>`
  } },
  { id: 'BRO-contraportada-orbita-v3', body: async () => {
    // Cierre partido: el anillo con el logo a la izquierda, con la proporción del cierre del contrato
    // (logo ≈ 0,57 del diámetro, como 220/400), y la voz a la derecha. Logo de 480 px: 97 px en un teléfono.
    const cx = 600, cy = 470, r = 420
    const ring = `<svg style="position:absolute;inset:0" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><rect width="${W}" height="${H}" fill="${GL.color.dark}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#72ded8" stroke-opacity="0.16" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TEAL}" stroke-width="5"/><circle cx="${cx}" cy="${cy - r}" r="11" fill="${TEAL}"/></svg>`
    return ring +
      `<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${cx - 240}px;top:${cy - 57}px;width:480px;height:auto;z-index:3">` +
      `<p style="position:absolute;left:1140px;top:330px;margin:0;font:300 40px/1.2 Pop;color:#F4F6F8;z-index:3">${ringMark}¿Conversamos?</p>` +
      `<p style="position:absolute;left:1136px;top:405px;margin:0;font:760 140px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;z-index:3">Cuando<br>${answerHtml('quieras', TEAL)}</p>` +
      `<p style="position:absolute;left:1140px;top:700px;margin:0;font:30px/1.15 Pop;white-space:nowrap;z-index:3">${slogan(30)}</p>` +
      `<div style="position:absolute;left:0;top:962px;width:${W}px;display:flex;justify-content:center;align-items:center;gap:40px;z-index:3"><img src="${bubble}" alt="efeoncepro.com" style="height:32px">${socialsHtml(34)}</div>` +
      `<div style="position:absolute;left:0;top:1020px;width:${W}px;display:flex;justify-content:center;align-items:center;gap:34px;font:500 19px/1 Pop;color:${SOFT};z-index:3">${CONTACTS.map(([k, t]) => contactItem(k, t, 19)).join('')}</div>`
  } },
  { id: 'BRO-contraportada-orbita-v4', body: async () => {
    // Cierre con la órbita que lo contiene todo: un solo anillo centrado sostiene el logo (520 px, 105 px en un
    // teléfono), la voz y el eslogan, en un eje central; el pie queda fuera del anillo. Ningún texto cruza el anillo.
    const cx = 960, cy = 480, r = 430
    const ring = `<svg style="position:absolute;inset:0" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><rect width="${W}" height="${H}" fill="${GL.color.dark}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#72ded8" stroke-opacity="0.16" stroke-width="2.4"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TEAL}" stroke-width="4"/><circle cx="${cx}" cy="${cy - r}" r="10" fill="${TEAL}"/></svg>`
    const col = (top, html) => `<div style="position:absolute;left:0;top:${top}px;width:${W}px;display:flex;justify-content:center;z-index:3">${html}</div>`
    return ring +
      col(235, `<img src="${LOGO}" alt="Efeonce" style="width:520px;height:auto">`) +
      col(468, `<p style="margin:0;font:300 38px/1.2 Pop;color:#F4F6F8">${ringMark}¿Conversamos?</p>`) +
      col(528, `<p style="margin:0;font:760 104px Bric;line-height:1;letter-spacing:-.035em;color:#fff;white-space:nowrap">${answerHtml('Cuando quieras', TEAL)}</p>`) +
      col(680, `<p style="margin:0;font:30px/1.15 Pop;white-space:nowrap">${slogan(30)}</p>`) +
      col(958, `<div style="display:flex;align-items:center;gap:40px"><img src="${bubble}" alt="efeoncepro.com" style="height:32px">${socialsHtml(34)}</div>`) +
      col(1018, `<div style="display:flex;align-items:center;gap:34px;font:500 19px/1 Pop;color:${SOFT}">${CONTACTS.map(([k, t]) => contactItem(k, t, 19)).join('')}</div>`)
  } },
  { id: 'BRO-contraportada-horizonte', body: async () => `<img src="${await jpg(PL + 'BR3-contra-horizonte.png')}" alt="Nexa, de espaldas, camina hacia una órbita de luz teal que se levanta como un portal en el horizonte" style="position:absolute;inset:0;width:${W}px;height:${H}px">
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:140px;width:500px;height:auto;z-index:3">
<p style="position:absolute;left:${M}px;top:380px;margin:0;font:300 40px/1.2 Pop;color:#F4F6F8;z-index:3">${ring}¿Conversamos?</p>
<p style="position:absolute;left:${M - 4}px;top:455px;margin:0;font:760 118px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;z-index:3">Cuando<br>${answerHtml('quieras', TEAL)}</p>
<p style="position:absolute;left:${M}px;top:710px;margin:0;font:28px/1.15 Pop;white-space:nowrap;z-index:3">${slogan(28)}</p>
<div style="position:absolute;left:${M}px;top:780px;display:flex;flex-direction:column;gap:18px;font:500 20px/1.3 Pop;color:${SOFT};z-index:3"><div style="display:flex;align-items:center;gap:28px"><img src="${bubble}" alt="efeoncepro.com" style="height:32px">${socialsHtml(32)}</div>${CONTACTS.map(([k, t]) => contactItem(k, t, 20)).join('')}</div>` },
  { id: 'BRO-contraportada-amanecer', body: async () => `<img src="${await jpg(PL + 'BR4-contra-amanecer.png')}" alt="Nexa, de espaldas junto a un agente mini robot, camina por una pasarela sobre el agua hacia una órbita de luz teal inclinada que sale sobre el horizonte al amanecer" style="position:absolute;inset:0;width:${W}px;height:${H}px">
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:140px;width:500px;height:auto;z-index:3">
<p style="position:absolute;left:${M}px;top:380px;margin:0;font:300 40px/1.2 Pop;color:#F4F6F8;z-index:3">${ring}¿Conversamos?</p>
<p style="position:absolute;left:${M - 4}px;top:455px;margin:0;font:760 118px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;z-index:3">Cuando<br>${answerHtml('quieras', TEAL)}</p>
<p style="position:absolute;left:${M}px;top:710px;margin:0;font:28px/1.15 Pop;white-space:nowrap;z-index:3">${slogan(28)}</p>
<div style="position:absolute;left:${M}px;top:780px;display:flex;flex-direction:column;gap:18px;font:500 20px/1.3 Pop;color:${SOFT};z-index:3"><div style="display:flex;align-items:center;gap:28px"><img src="${bubble}" alt="efeoncepro.com" style="height:32px">${socialsHtml(32)}</div>${CONTACTS.map(([k, t]) => contactItem(k, t, 20)).join('')}</div>` },
  // Contraportada de PROPUESTA: la propuesta llega después de conversar, así que el mensaje principal es el eslogan
  // (regla del operador, 2026-09-27); «¿Conversamos?» queda para el brochure, que busca abrir la conversación.
  ...[['PRO-contraportada-horizonte', 'BR3-contra-horizonte.png', 'Nexa, de espaldas, camina hacia una órbita de luz teal que se levanta como un portal en el horizonte'],
    ['PRO-contraportada-amanecer', 'BR4-contra-amanecer.png', 'Nexa, de espaldas junto a un agente mini robot, camina por una pasarela sobre el agua hacia una órbita de luz teal inclinada que sale sobre el horizonte al amanecer']].map(([id, plate, alt]) => ({ id, body: async () => `<img src="${await jpg(PL + plate)}" alt="${alt}" style="position:absolute;inset:0;width:${W}px;height:${H}px">
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:230px;width:500px;height:auto;z-index:3">
<p style="position:absolute;left:${M}px;top:420px;margin:0;font:72px/1.15 Pop;white-space:nowrap;z-index:3">${slogan(72)}</p>
<div style="position:absolute;left:${M}px;top:600px;display:flex;flex-direction:column;gap:18px;font:500 20px/1.3 Pop;color:${SOFT};z-index:3"><div style="display:flex;align-items:center;gap:28px"><img src="${bubble}" alt="efeoncepro.com" style="height:32px">${socialsHtml(32)}</div>${CONTACTS.map(([k, t]) => contactItem(k, t, 20)).join('')}</div>` })),
  { id: 'BRO-contraportada-orbita-gigante', sel: { mode: 'cta', targetKind: 'text', anchor: 'end-center' }, body: async () => `${giantOrbitBg(1640, 540, 820, 212)}
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:140px;width:500px;height:auto;z-index:3">
<p style="position:absolute;left:${M}px;top:380px;margin:0;font:300 40px/1.2 Pop;color:#F4F6F8;z-index:3">${ring}¿Conversamos?</p>
<p data-sel style="position:absolute;left:${M - 4}px;top:455px;margin:0;font:760 118px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;z-index:3">Cuando<br>${answerHtml('quieras', TEAL)}</p>
<p style="position:absolute;left:${M}px;top:710px;margin:0;font:28px/1.15 Pop;white-space:nowrap;z-index:3">${slogan(28)}</p>
<div style="position:absolute;left:${M}px;top:780px;display:flex;flex-direction:column;gap:18px;font:500 20px/1.3 Pop;color:${SOFT};z-index:3"><div style="display:flex;align-items:center;gap:28px"><img src="${bubble}" alt="efeoncepro.com" style="height:32px">${socialsHtml(32)}</div>${CONTACTS.map(([k, t]) => contactItem(k, t, 20)).join('')}</div>` }
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
