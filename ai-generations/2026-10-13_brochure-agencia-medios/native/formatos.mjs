// Láminas de formatos programáticos hechas a mano (mismo lenguaje que L03 y G4): voz de la línea Voice a la izquierda
// y, a la derecha, maquetas de vidrio con la posición del anuncio rotulada. Contenido: ficha de programática §7.3.
// Reglas: el acento #f83902 sólo en trazos, contornos, arcos y la esfera; nunca en texto de menos de 24 px.
// Íconos: Trazo oficiales de AXIS (resolveIcon, en reposo). Maquetas ilustrativas, sin marcas de terceros.
// Uso: node formatos.mjs <carpeta-salida>
import fs from 'node:fs';
import { resolveIcon } from '@efeoncepro/axis-graphic-line/icons';
const EJF = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-13_brochure-agencia-medios/marca-ejemplo';
const PLAT = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/platforms';
const LOGOS = 'file:///Users/jreye/Documents/greenhouse-eo/public/images/logos';
const iso = (f, h = 40) => `<img src="${PLAT}/${f}.svg" style="height:${h}px;width:auto;display:block">`;
import { andaraLockup, andaraMark, CYAN } from '../marca-ejemplo/ui.mjs';
import { nortAd, lockup, headline, cta, slash, mark, HERO, SHOE, WM, VOLT, FONTS } from '../marca-ejemplo/nortica.mjs';

const OUT = process.argv[2];
const ID = "'Bricolage Grotesque', system-ui, sans-serif", ST = "'Poppins', system-ui, sans-serif";
const BUB = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const ACC = '#f83902', BG = '#001a33', SOFT = '#d9e3ec', MUTE = '#9fb4c8';
const icon = (glyph, size = 32) => resolveIcon({ glyph, size, line: 'voice', surface: 'dark', state: 'rest', idPrefix: `f-${glyph}-${size}` }).svg;

const voice = ({ eyebrow, question, answer, body }) => `
<div style="position:absolute;left:140px;top:110px;width:640px">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">${eyebrow}</div>
<div style="margin-top:44px;display:flex;align-items:flex-start;gap:16px;font-family:${ST};font-size:40px;font-weight:300;line-height:1.25;color:#fff"><span style="flex:none;margin-top:16px;display:inline-block;width:18px;height:18px;border-radius:50%;border:3px solid ${ACC}"></span><span>${question}</span></div>
<div style="margin-top:26px;font-family:${ID};font-size:${answer.length > 1 ? 128 : 140}px;font-weight:760;letter-spacing:-0.045em;line-height:0.92;color:#fff;white-space:nowrap">${answer.join('<br>')}<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span></div>
<div style="margin-top:40px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:540px">${body}</div></div>`;

const statement = ({ eyebrow, lines, body }) => `
<div style="position:absolute;left:140px;top:110px;width:680px">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">${eyebrow}</div>
<div style="margin-top:48px;font-family:${ID};font-size:${Math.min(112, Math.round(660 / (Math.max(...lines.map(l => l.length)) * 0.56)))}px;font-weight:760;letter-spacing:-0.045em;line-height:0.92;color:#fff;white-space:nowrap">${lines.join('<br>')}<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span></div>
<div style="margin-top:40px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:540px">${body}</div></div>`;

const facts = (items, left = 140, top = 880, w = 230) => items.map(([glyph, k, v], i) => `
<div style="position:absolute;left:${left + i * (w + 20)}px;top:${top}px;width:${w}px">
<div style="height:30px">${icon(glyph, 30)}</div>
<div style="margin-top:10px;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${k}</div>
<div style="margin-top:4px;font-family:${ST};font-size:17px;font-weight:500;line-height:1.35;color:#fff">${v}</div></div>`).join('');

// rótulo con línea guía: del punto (x,y) al texto en (tx,ty)
const callout = (x, y, tx, ty, title, desc, align = 'left') => `
<svg style="position:absolute;inset:0;pointer-events:none" width="1920" height="1080"><path d="M${x} ${y} L${tx} ${ty}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.4" fill="none"/><circle cx="${x}" cy="${y}" r="4" fill="#ffffff"/></svg>
<div style="position:absolute;${align === 'left' ? `left:${tx + 10}px` : `left:${tx - 270}px;text-align:right`};top:${ty - 22}px;width:260px"><div style="font-family:${ID};font-size:24px;font-weight:760;letter-spacing:-0.02em;line-height:1.05;color:#fff">${title}</div><div style="margin-top:4px;font-family:${ST};font-size:16px;font-weight:300;line-height:1.35;color:${SOFT}">${desc}</div></div>`;

const page = (inner, haloX = 1300, haloY = 520) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&${FONTS}&family=Inter:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${BG}">
<svg width="1920" height="1080" style="position:absolute;inset:0"><defs><radialGradient id="halo" cx="${haloX}" cy="${haloY}" r="820" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1b4f7a" stop-opacity="0.55"/><stop offset="0.5" stop-color="#0a3358" stop-opacity="0.3"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient>
<radialGradient id="pool" cx="${haloX}" cy="1000" r="560" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 1000) scale(1 0.16) translate(0 -1000)"><stop offset="0" stop-color="#7fb6ff" stop-opacity="0.3"/><stop offset="1" stop-color="#7fb6ff" stop-opacity="0"/></radialGradient></defs>
<rect width="1920" height="1080" fill="url(#halo)"/><rect y="900" width="1920" height="180" fill="url(#pool)"/></svg>
${inner}
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">
</div></body></html>`;

// piezas de maqueta
const glass = (x, y, w, h, r = 22, extra = '') => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;background:linear-gradient(160deg,rgba(255,255,255,0.10),rgba(10,40,70,0.55));border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2);${extra}"></div>`;
const bar = (x, y, w, h = 8, o = 0.28) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${h / 2}px;background:rgba(201,214,227,${o})"></div>`;
const block = (x, y, w, h, o = 0.12) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:10px;background:rgba(201,214,227,${o})"></div>`;
const ad = (x, y, w, h, label = '', glow = true) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:10px;background:linear-gradient(135deg,rgba(127,182,255,0.55),rgba(255,255,255,0.18));border:2.5px solid ${ACC};${glow ? `box-shadow:0 0 34px rgba(127,182,255,0.55);` : ''}display:flex;align-items:center;justify-content:center;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.12em;color:#fff">${label}</div>`;

// anuncio de la marca de ejemplo (ficticia): foto + wordmark + bajada + CTA. El contorno naranja marca la posición del anuncio.
const brandAd = (x, y, w, h, { glow = true, ...o } = {}) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:8px;overflow:hidden;outline:2.5px solid ${ACC};outline-offset:2px;${glow ? 'box-shadow:0 0 44px rgba(215,255,46,0.22),0 20px 50px rgba(0,0,0,0.55);' : ''}">${nortAd(w, h, o)}</div>`;
const ejemplo = (x, y, align = 'left') => `<div style="position:absolute;left:${x}px;top:${y}px;${align === 'right' ? 'transform:translateX(-100%);' : ''}font-family:${ST};font-size:14px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">Anuncios de una marca de ejemplo</div>`;

const slides = {};

// A · Mapa de formatos por objetivo
{
  const cols = [
    ['Alcance', 'Que te vean muchos', [['multimedia', 'TV conectada'], ['ubicacion', 'pDOOH'], ['medios', 'Audio digital'], ['multimedia', 'Video instream']]],
    ['Consideración', 'Que te conozcan', [['multimedia', 'Video outstream'], ['contenido', 'Native'], ['web', 'Rich media'], ['objetivo', 'In-game']]],
    ['Respuesta', 'Que actúen', [['web', 'Display'], ['republicar', 'Retargeting'], ['swipe', 'Interstitials'], ['embudo', 'Hacia tu sitio']]]
  ];
  let inner = voice({ eyebrow: 'Programática · Mapa de formatos', question: '¿Qué formato uso?', answer: ['Según tu', 'objetivo'], body: 'Cada formato hace un trabajo distinto. Partimos por lo que necesitas lograr y elegimos los que lo <b>sirven</b>.' });
  const x0 = 900, w = 300, gap = 30, top = 190, h = 640;
  cols.forEach(([t, s, items], i) => {
    const x = x0 + i * (w + gap), lit = i === 2;
    inner += glass(x, top + (2 - i) * 40, w, h - (2 - i) * 40, 26, lit ? `border-color:${ACC};box-shadow:0 0 60px rgba(248,57,2,0.25),0 30px 80px rgba(0,0,0,0.55)` : '');
    inner += `<div style="position:absolute;left:${x + 28}px;top:${top + (2 - i) * 40 + 30}px;width:${w - 56}px"><div style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">0${i + 1} · ${s}</div><div style="margin-top:6px;font-family:${ID};font-size:40px;font-weight:760;letter-spacing:-0.03em;line-height:1;color:#fff">${t}</div></div>`;
    items.forEach(([g, n], j) => {
      const y = top + (2 - i) * 40 + 150 + j * 100;
      inner += `<div style="position:absolute;left:${x + 24}px;top:${y}px;width:${w - 48}px;height:76px;border-radius:16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);display:flex;align-items:center;gap:16px;padding:0 18px;box-sizing:border-box"><div style="flex:none;width:32px;height:32px">${icon(g, 32)}</div><div style="font-family:${ST};font-size:20px;font-weight:500;color:#fff">${n}</div></div>`;
    });
  });
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M${x0 + 150} ${top + 70} Q ${x0 + 495} ${top - 60} ${x0 + 2 * (w + gap) + 150} ${top - 2}" stroke="${ACC}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9"/></svg>`;
  inner += `<div style="position:absolute;left:900px;top:870px;width:960px;font-family:${ST};font-size:16px;font-weight:400;color:${MUTE}">Un plan suele combinar formatos de las tres columnas. Cada formato se confirma por campaña y mercado.</div>`;
  slides['A-mapa'] = page(inner, 1380, 520);
}

// B · Display y rich media
{
  let inner = statement({ eyebrow: 'Programática · Display y rich media', lines: ['Donde tu', 'cliente lee'], body: 'En sitios y apps elegidos por calidad: banners estáticos, piezas animadas HTML5 y formatos que se <b>expanden</b> al tocarlos.' });
  // laptop
  const lx = 860, ly = 170, lw = 820, lh = 520;
  inner += glass(lx, ly, lw, lh, 22);
  inner += `<div style="position:absolute;left:${lx + 24}px;top:${ly + 20}px;display:flex;gap:8px">${[0, 1, 2].map(() => '<div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.25)"></div>').join('')}</div>`;
  inner += bar(lx + 110, ly + 22, 300, 10, 0.18);
  inner += brandAd(lx + 46, ly + 64, 728, 74, { pos: 'center 55%', sizeTag: '728 × 90' });
  inner += block(lx + 46, ly + 162, 470, 200, 0.12) + bar(lx + 46, ly + 384, 430) + bar(lx + 46, ly + 404, 400) + bar(lx + 46, ly + 424, 450) + bar(lx + 46, ly + 444, 360) + bar(lx + 46, ly + 470, 420);
  inner += brandAd(lx + 540, ly + 162, 234, 196, { img: SHOE, pos: '62% 40%', kind: 'tall', lines: ['MÁS', 'LIVIANA'], sizeTag: '300 × 250' });
  inner += block(lx + 540, ly + 378, 234, 110, 0.1);
  inner += `<div style="position:absolute;left:${lx - 40}px;top:${ly + lh}px;width:${lw + 80}px;height:22px;border-radius:0 0 18px 18px;background:linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))"></div>`;
  // teléfono con interstitial
  // teléfono fotografiado; el interstitial de ejemplo va compuesto en la pantalla y terminado por el modelo
  const px = 1520, py = 318, pw = 480, ph = 614;
  inner += `<div style="position:absolute;left:${px}px;top:${py}px;width:${pw}px;height:${ph}px;background:url(${EJF}/telefono-final.png) 50% 50%/auto ${ph}px no-repeat;-webkit-mask-image:radial-gradient(ellipse 46% 52% at 50% 50%,#000 70%,transparent 100%);mask-image:radial-gradient(ellipse 46% 52% at 50% 50%,#000 70%,transparent 100%)"></div>`;
  inner += `<div style="position:absolute;left:${px + 134}px;top:${py + 38}px;width:228px;height:499px;border:2.5px solid ${ACC};border-radius:36px;pointer-events:none"></div>`;
  inner += callout(lx + 120, ly + 64, lx + 70, 118, 'Leaderboard', 'Arriba del contenido, lo primero que se ve', 'left');
  inner += callout(lx + 540, ly + 300, 900, 760, 'Banner 300 × 250', 'El formato más vendido de la web', 'left');
  inner += callout(px + 134, py + 430, 1470, 935, 'Interstitial', 'Pantalla completa entre dos contenidos', 'right');
  inner += ejemplo(lx, 1000);
  inner += facts([['medios', 'Se compra', 'Por mil impresiones (CPM)'], ['medicion', 'Se mide', 'Impresiones, visibilidad y clics'], ['contenido', 'Necesitas', 'Piezas en tamaños estándar o HTML5']], 140, 860, 230);
  slides['B-display'] = page(inner, 1300, 480);
}

// C · Native
{
  let inner = statement({ eyebrow: 'Programática · Native', lines: ['Anuncios', 'que se leen'], body: 'Se adapta al diseño del medio: titular, texto e imagen de tu marca entre las notas, siempre <b>rotulado</b> como patrocinado.' });
  const px = 1080, py = 120, pw = 420, ph = 820;
  inner += glass(px, py, pw, ph, 46, 'background:linear-gradient(160deg,rgba(255,255,255,0.12),rgba(6,25,48,0.94))');
  inner += bar(px + 150, py + 24, 120, 10, 0.25);
  const card = (y, native) => native
    ? `<div style="position:absolute;left:${px + 22}px;top:${y}px;width:${pw - 44}px;height:250px;border-radius:16px;border:2.5px solid ${ACC};background:rgba(255,255,255,0.06);box-shadow:0 0 44px rgba(127,182,255,0.45);overflow:hidden"></div>` +
      `<div style="position:absolute;left:${px + 36}px;top:${y + 14}px;width:${pw - 72}px;height:124px;border-radius:10px;background:url(${SHOE}) 50% 55%/cover"></div>` + slash(px + pw - 110, y + 14, 14, 124, 0.95) +
      `<div style="position:absolute;left:${px + 36}px;top:${y + 150}px;display:flex;align-items:center;gap:8px;font-family:${ST};font-size:11px;font-weight:600;letter-spacing:0.12em;color:#fff"><span style="background:rgba(255,255,255,0.2);padding:3px 8px;border-radius:6px">PATROCINADO</span>${lockup(13)}</div>` +
      `<div style="position:absolute;left:${px + 36}px;top:${y + 176}px;width:${pw - 72}px;font-family:${ST};font-size:17px;font-weight:600;line-height:1.25;color:#fff">Cómo elegir tu primera zapatilla para correr de noche</div>` +
      `<div style="position:absolute;left:${px + 36}px;top:${y + 222}px;font-family:${ST};font-size:13px;font-weight:300;color:${SOFT}">Una guía de 5 minutos</div>`
    : block(px + 22, y, 120, 100, 0.12) + bar(px + 160, y + 14, 220, 12, 0.35) + bar(px + 160, y + 36, 190, 12, 0.35) + bar(px + 160, y + 66, 150, 8, 0.2);
  inner += card(py + 70, false) + card(py + 200, false) + card(py + 330, true) + card(py + 610, false) + card(py + 730, false);
  inner += callout(px + pw - 22, py + 400, 1620, 330, 'Titular y texto', 'Escritos para el medio, no un banner', 'left');
  inner += callout(px + pw - 40, py + 470, 1620, 500, 'Imagen y logo', 'De tu marca, con el estilo del sitio', 'left');
  inner += callout(px + 40, py + 488, 1000, 640, 'Rótulo visible', 'Siempre identificado como patrocinado', 'right');
  inner += ejemplo(px, py - 34);
  inner += facts([['contenido', 'Sirve para', 'Consideración y lectura'], ['medicion', 'Se mide', 'Clics, visitas y tiempo en tu sitio'], ['checklist', 'Necesitas', 'Titular, texto, imagen, logo y landing']], 140, 860, 230);
  slides['C-native'] = page(inner, 1290, 520);
}

// D · Video online
{
  let inner = voice({ eyebrow: 'Programática · Video online', question: '¿Dónde se ve mi video?', answer: ['Dentro', 'y fuera'], body: 'Instream corre dentro de otro video: antes, durante o después. Outstream aparece entre los párrafos de un artículo y se activa al <b>verlo</b>.' });
  const vx = 880, vy = 150, vw = 760, vh = 430;
  inner += `<div style="position:absolute;left:${vx}px;top:${vy}px;width:${vw}px;height:${vh}px;border-radius:22px;overflow:hidden;border:2.5px solid ${ACC};box-sizing:border-box;box-shadow:0 0 70px rgba(215,255,46,0.18),0 30px 80px rgba(0,0,0,0.6);">${nortAd(vw - 5, vh - 5, { pos: '30% 45%', label: null })}
<div style="position:absolute;left:24px;top:22px;font-family:${ST};font-size:14px;font-weight:600;color:#fff;background:rgba(0,0,0,0.55);padding:5px 10px;border-radius:6px">Anuncio · 0:15</div>
<div style="position:absolute;left:24px;bottom:84px;font-family:${ST};font-size:15px;font-weight:500;color:#fff;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.4);padding:8px 14px;border-radius:6px">Omitir anuncio en 5</div></div>`;
  
  // línea de tiempo
  const ty = vy + vh - 60, tx0 = vx + 40, tx1 = vx + vw - 40;
  inner += `<div style="position:absolute;left:${tx0}px;top:${ty}px;width:${tx1 - tx0}px;height:6px;border-radius:3px;background:rgba(255,255,255,0.25)"></div><div style="position:absolute;left:${tx0}px;top:${ty}px;width:${(tx1 - tx0) * 0.5}px;height:6px;border-radius:3px;background:rgba(255,255,255,0.75)"></div>`;
  const marks = [[0, 'Pre-roll', 'Antes del video'], [0.5, 'Mid-roll', 'En una pausa'], [1, 'Post-roll', 'Al terminar']];
  marks.forEach(([t, n, d]) => {
    const x = tx0 + (tx1 - tx0) * t;
    inner += `<div style="position:absolute;left:${x - 3}px;top:${ty - 16}px;width:6px;height:38px;border-radius:3px;background:${ACC};box-shadow:0 0 14px rgba(248,57,2,0.6)"></div>`;
    inner += `<div style="position:absolute;left:${x - 100}px;top:${vy + vh + 22}px;width:200px;text-align:center"><div style="font-family:${ID};font-size:26px;font-weight:760;color:#fff">${n}</div><div style="font-family:${ST};font-size:16px;font-weight:300;color:${SOFT}">${d}</div></div>`;
  });
  // outstream
  const ox = 1680, oy = 240, ow = 200, oh = 380;
  inner += glass(ox, oy, ow, oh, 30, 'background:linear-gradient(160deg,rgba(255,255,255,0.12),rgba(6,25,48,0.94))');
  inner += bar(ox + 18, oy + 30, 150, 8, 0.35) + bar(ox + 18, oy + 46, 130, 8, 0.35) + bar(ox + 18, oy + 62, 160, 8, 0.35);
  inner += brandAd(ox + 14, oy + 90, ow - 28, 110, { img: SHOE, pos: '60% 40%', kind: 'tall', lines: ['MÁS', 'LIVIANA'], label: null }) + `<svg style="position:absolute;left:${ox + ow / 2 - 16}px;top:${oy + 126}px" width="32" height="32"><circle cx="16" cy="16" r="15" fill="rgba(0,0,0,0.45)" stroke="#fff" stroke-opacity="0.6"/><path d="M12 9 L23 16 L12 23 Z" fill="#fff"/></svg>`;
  inner += bar(ox + 18, oy + 222, 150, 8, 0.3) + bar(ox + 18, oy + 238, 160, 8, 0.3) + bar(ox + 18, oy + 254, 120, 8, 0.3) + bar(ox + 18, oy + 270, 155, 8, 0.3);
  inner += `<div style="position:absolute;left:${ox - 20}px;top:${oy + oh + 18}px;width:${ow + 40}px;text-align:center"><div style="font-family:${ID};font-size:26px;font-weight:760;color:#fff">Outstream</div><div style="font-family:${ST};font-size:16px;font-weight:300;color:${SOFT}">Entre los párrafos</div></div>`;
  inner += ejemplo(vx, vy - 40);
  inner += facts([['medicion', 'Se mide', 'Reproducciones y video completado'], ['reloj', 'Duración', '6, 15 o 30 segundos'], ['multimedia', 'Necesitas', 'Tu video en las duraciones del plan']], 140, 860, 230);
  slides['D-video'] = page(inner, 1280, 420);
}

// G · In-game
{
  let inner = statement({ eyebrow: 'Programática · In-game', lines: ['Tu marca,', 'en el juego'], body: 'Vallas dentro del escenario y videos que el jugador elige ver, en títulos revisados y con seguridad de <b>marca</b>.' });
  const gx = 860, gy = 130, gw = 1000, gh = 620, cx = gw / 2, hz = 250;
  // ciudad de juego: avenida en perspectiva con niebla, ventanas encendidas y bordes de neón frío
  const rnd = (i) => (Math.sin(i * 127.1) * 43758.5453) % 1;
  const win = (x0, y0, w, h, n, seed) => Array.from({ length: n }, (_, i) => { const r = Math.abs(rnd(seed + i)), r2 = Math.abs(rnd(seed + i * 3.7)); return `<rect x="${x0 + r * w}" y="${y0 + r2 * h}" width="${3 + r * 5}" height="${4 + r2 * 6}" fill="#bfe0ff" opacity="${0.15 + r2 * 0.6}"/>`; }).join('');
  // captura de juego generada; la valla lleva el anuncio de ejemplo compuesto en perspectiva y terminado por el modelo
  inner += `<div style="position:absolute;left:${gx}px;top:${gy}px;width:${gw}px;height:${gh}px;border-radius:26px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 40px 100px rgba(0,0,0,0.7),0 0 120px rgba(27,79,122,0.6);background:#000 url(${EJF}/juego-final.png) 50% 50%/cover">
<div style="position:absolute;left:22px;top:20px;display:flex;gap:12px;align-items:center">${[0, 1, 2].map(() => '<div style="width:56px;height:10px;border-radius:5px;background:rgba(255,255,255,0.55)"></div>').join('')}<div style="margin-left:10px;font-family:${ST};font-size:14px;font-weight:600;color:#fff;opacity:0.85">VUELTA 2/3</div></div>
<svg style="position:absolute;inset:0" width="${gw}" height="${gh}"><polygon points="733,108 924,-10 931,145 733,212" fill="none" stroke="${ACC}" stroke-width="2.5" stroke-linejoin="round"/></svg></div>`;
  inner += callout(gx + 760, gy + 205, 1500, 845, 'Valla en el escenario', 'Aparece como parte del juego, sin interrumpir', 'left');
  // tarjeta de video con recompensa
  inner += glass(980, 790, 420, 130, 18, 'background:linear-gradient(160deg,rgba(255,255,255,0.12),rgba(6,25,48,0.94))');
  inner += `<div style="position:absolute;left:996px;top:806px;width:150px;height:98px;border-radius:10px;border:2px solid ${ACC};background:url(${SHOE}) 50% 50%/cover"></div><svg style="position:absolute;left:1055px;top:839px" width="32" height="32"><circle cx="16" cy="16" r="15" fill="rgba(0,0,0,0.45)" stroke="#fff" stroke-opacity="0.6"/><path d="M12 9 L23 16 L12 23 Z" fill="#fff"/></svg>`;
  inner += `<div style="position:absolute;left:1164px;top:812px;width:224px"><div style="font-family:${ID};font-size:24px;font-weight:760;line-height:1.05;color:#fff">Video con recompensa</div><div style="margin-top:6px;font-family:${ST};font-size:15px;font-weight:300;line-height:1.3;color:${SOFT}">El jugador elige verlo a cambio de un premio</div></div>`;
  inner += ejemplo(gx, gy - 40);
  inner += facts([['medicion', 'Se mide', 'Impresiones visibles y tiempo en pantalla'], ['seguridad', 'Selección', 'Títulos y entornos revisados']], 140, 860, 280);
  slides['G-ingame'] = page(inner, 1360, 440);
}

// H · Glosario
{
  const terms = [
    ['RTB', 'Subasta en tiempo real: cada impresión se compra en milisegundos'],
    ['PMP', 'Mercado privado: sitios elegidos, con acuerdo propio'],
    ['PG', 'Programmatic Guaranteed: precio y entrega pactados antes'],
    ['CTV', 'TV conectada a internet, donde corren las apps de streaming'],
    ['OTT', 'Video por streaming, en cualquier pantalla'],
    ['DOOH', 'Publicidad digital fuera del hogar: calles, malls, aeropuertos'],
    ['pDOOH', 'Esas mismas pantallas, compradas de forma programática'],
    ['Visibilidad', 'Que el anuncio estuvo de verdad a la vista en la pantalla'],
    ['MFA', 'Sitios hechos sólo para mostrar anuncios: los sacamos del plan'],
    ['Prueba de emisión', 'El registro de que tu pieza salió en esa pantalla']
  ];
  let inner = statement({ eyebrow: 'Programática · Glosario', lines: ['Las siglas,', 'en simple'], body: 'Lo que vas a ver en un plan y en un reporte de medios, en una <b>línea</b> cada uno.' });
  terms.forEach(([t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 880 + col * 500, y = 130 + row * 158;
    inner += `<div style="position:absolute;left:${x}px;top:${y}px;width:470px;height:136px;box-sizing:border-box;padding:22px 26px;border-radius:20px;background:linear-gradient(160deg,rgba(255,255,255,0.09),rgba(10,40,70,0.5));border:1.5px solid rgba(255,255,255,0.16)"><div style="font-family:${ID};font-size:34px;font-weight:760;letter-spacing:-0.025em;line-height:1;color:#fff">${t}</div><div style="margin-top:10px;font-family:${ST};font-size:17px;font-weight:300;line-height:1.35;color:${SOFT}">${d}</div></div>`;
  });
  slides['H-glosario'] = page(inner, 1360, 520);
}


// K · DOOH dinámico
{
  let inner = voice({ eyebrow: 'Programática · DOOH dinámico', question: '¿Cambia según el momento?', answer: ['Al instante'], body: 'La misma pantalla muestra otra versión según la hora, el clima o el tráfico, con reglas definidas antes de salir al <b>aire</b>.' });
  const states = [['nube', 'Si llueve', ['HOY LLUEVE', 'CORRE IGUAL'], SHOE, '58% 50%'], ['reloj', 'De noche', ['CORRE', 'DE NOCHE'], HERO, '28% 45%'], ['ubicacion', 'En hora punta', ['GÁNALE', 'AL TRÁFICO'], HERO, '35% 60%']];
  const x0 = 900, w = 290, gap = 36, sy = 250, sh = 470;
  // señal → regla → pantalla
  inner += `<div style="position:absolute;left:${x0}px;top:140px;width:${3 * w + 2 * gap}px;text-align:center;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE};white-space:nowrap">Una pantalla · tres reglas</div>`;
  states.forEach(([g, cond, lines, img, pos], i) => {
    const x = x0 + i * (w + gap);
    inner += `<div style="position:absolute;left:${x + w / 2 - 95}px;top:186px;width:190px;height:44px;border-radius:22px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;gap:10px;font-family:${ST};font-size:17px;font-weight:500;color:#fff"><span style="width:24px;height:24px">${icon(g, 24)}</span>${cond}</div>`;
    inner += `<div style="position:absolute;left:${x}px;top:${sy}px;width:${w}px;height:${sh}px;border-radius:12px;padding:10px;box-sizing:border-box;background:linear-gradient(160deg,rgba(255,255,255,0.14),rgba(6,25,48,0.9));border:1.5px solid rgba(255,255,255,0.25);box-shadow:0 30px 80px rgba(0,0,0,0.6),0 0 60px rgba(215,255,46,0.12)"><div style="position:relative;width:100%;height:100%;border-radius:6px;overflow:hidden;outline:2.5px solid ${ACC};outline-offset:2px">${nortAd(w - 20, sh - 20, { img, pos, kind: 'tall', lines, label: null })}</div></div>`;
    inner += `<div style="position:absolute;left:${x + w / 2 - 4}px;top:${sy + sh}px;width:8px;height:70px;background:linear-gradient(180deg,#0e2c4d,#06182c)"></div>`;
  });
  inner += `<div style="position:absolute;left:${x0}px;top:820px;width:${3 * w + 2 * gap}px;text-align:center;font-family:${ST};font-size:16px;color:${MUTE}">Anuncios de una marca de ejemplo · las reglas y las señales se confirman por pantalla y mercado</div>`;
  inner += facts([['nube', 'Señales', 'Clima, hora, tráfico o evento'], ['contenido', 'Necesitas', 'Una versión por regla'], ['checklist', 'Se aprueba', 'Cada versión antes de salir']], 140, 860, 230);
  slides['K-dooh-dinamico'] = page(inner, 1360, 480);
}

// N · Una campaña completa
{
  let inner = statement({ eyebrow: 'Programática · Una campaña completa', lines: ['Una campaña,', 'cinco pantallas'], body: 'Una misma persona y cinco momentos de una campaña de ejemplo: cada pantalla cumple su papel y la frecuencia se controla entre <b>todas</b>.' });
  const steps = [['rec-1-tv', '1', 'En casa', 'TV conectada'], ['rec-2-calle', '2', 'En la calle', 'pDOOH'], ['rec-3-audio', '3', 'En el metro', 'Audio digital'], ['rec-4-movil', '4', 'En el teléfono', 'Retargeting'], ['rec-5-compra', '5', 'Compra', 'En tu sitio']];
  const x0 = 860, w = 186, gap = 22, ys = [210, 290, 170, 270, 190], h = 330;
  const labels = ['La conoce', 'La recuerda', 'La vuelve a ver', 'Vuelve a tu sitio', 'Compra'];
  let conn = '';
  for (let i = 0; i < 4; i++) { const xa = x0 + i * (w + gap) + w, xb = xa + gap, ya = ys[i] + h / 2, yb = ys[i + 1] + h / 2; conn += `<path d="M${xa - 6} ${ya} C ${xa + 14} ${ya}, ${xb - 14} ${yb}, ${xb + 6} ${yb}" stroke="${ACC}" stroke-width="3" fill="none" stroke-linecap="round"/>`; }
  steps.forEach(([img, n, where, fmt], i) => {
    const x = x0 + i * (w + gap), y = ys[i];
    inner += `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:20px;overflow:hidden;border:1.5px solid ${i === 4 ? ACC : 'rgba(255,255,255,0.25)'};box-shadow:0 30px 70px rgba(0,0,0,0.6)${i === 4 ? ',0 0 50px rgba(248,57,2,0.25)' : ''};background:#000 url(${EJF}/${img}.png) 50% 50%/cover"><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,10,25,0) 45%,rgba(0,10,25,0.92))"></div>
<div style="position:absolute;left:14px;top:14px;width:34px;height:34px;border-radius:50%;background:rgba(0,10,25,0.7);border:1.5px solid rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;font-family:${ID};font-size:18px;font-weight:760;color:#fff">${n}</div>
<div style="position:absolute;left:16px;bottom:16px;right:12px"><div style="font-family:${ST};font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${where}</div><div style="margin-top:2px;font-family:${ID};font-size:24px;font-weight:760;letter-spacing:-0.02em;line-height:1.05;color:#fff">${fmt}</div></div></div>`;
    inner += `<div style="position:absolute;left:${x}px;top:${y + h + 14}px;width:${w}px;text-align:center;font-family:${ST};font-size:16px;font-weight:500;color:${SOFT}">${labels[i]}</div>`;
  });
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080">${conn}</svg>`;
  inner += `<div style="position:absolute;left:${x0}px;top:690px;width:${5 * w + 4 * gap}px;font-family:${ST};font-size:15px;color:${MUTE}">Recorrido ilustrativo con una marca de ejemplo. El orden y las pantallas cambian según el plan.</div>`;
  inner += facts([['objetivo', 'Se planifica', 'Alcance y frecuencia entre pantallas'], ['republicar', 'Sin repetir de más', 'Tope de frecuencia por persona'], ['medicion', 'Se mide', 'El recorrido, no cada pantalla sola']], 140, 860, 230);
  slides['N-recorrido'] = page(inner, 1370, 460);
}

// L · Creatividad dinámica
{
  let inner = statement({ eyebrow: 'Programática · Creatividad dinámica', lines: ['Una pieza,', 'mil versiones'], body: 'Armamos una plantilla con piezas intercambiables y las reglas eligen qué versión ve cada persona: producto, mensaje, ciudad o <b>momento</b>.' });
  const sig = [['objetivo', 'Audiencia'], ['ubicacion', 'Ciudad'], ['nube', 'Clima'], ['contenido', 'Producto']];
  sig.forEach(([g, t], i) => { inner += `<div style="position:absolute;left:880px;top:${230 + i * 120}px;width:170px;height:60px;border-radius:30px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;gap:12px;padding:0 18px;box-sizing:border-box;font-family:${ST};font-size:18px;font-weight:500;color:#fff"><span style="width:26px;height:26px">${icon(g, 26)}</span>${t}</div>`; });
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080">${sig.map((_, i) => `<path d="M1050 ${260 + i * 120} C 1100 ${260 + i * 120}, 1110 440, 1150 440" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.5" fill="none"/>`).join('')}<path d="M1150 440 L 1190 440" stroke="${ACC}" stroke-width="3"/><circle cx="1150" cy="440" r="7" fill="none" stroke="${ACC}" stroke-width="3"/></svg>`;
  const v = [[['CORRE', 'DE NOCHE'], HERO, '28% 45%'], [['HOY LLUEVE', 'CORRE IGUAL'], SHOE, '58% 50%'], [['MÁS', 'LIVIANA'], SHOE, '70% 40%'], [['TU PRIMER', '10K'], HERO, '35% 30%'], [['VUELVE', 'A CORRER'], HERO, '25% 60%'], [['SANTIAGO', 'CORRE'], HERO, '40% 45%'], [['CDMX', 'CORRE'], HERO, '30% 50%'], [['ÚLTIMAS', 'TALLAS'], SHOE, '50% 60%'], [['ELIGE', 'TU SUELA'], SHOE, '62% 55%']];
  const gx = 1210, gy = 160, cw = 196, cg = 16;
  v.forEach(([lines, img, pos], i) => {
    const x = gx + (i % 3) * (cw + cg), y = gy + Math.floor(i / 3) * (cw + cg);
    inner += `<div style="position:absolute;left:${x}px;top:${y}px;width:${cw}px;height:${cw}px;border-radius:8px;overflow:hidden;${i === 4 ? `outline:2.5px solid ${ACC};outline-offset:3px;box-shadow:0 0 50px rgba(215,255,46,0.3);` : 'opacity:0.92;'}">${nortAd(cw, cw, { img, pos, kind: 'tall', lines, label: null })}</div>`;
  });
  inner += `<div style="position:absolute;left:1210px;top:810px;width:620px;font-family:${ST};font-size:15px;color:${MUTE}">1 plantilla · 9 de muchas versiones posibles · marca de ejemplo</div>`;
  inner += facts([['contenido', 'Necesitas', 'Piezas sueltas: fotos, textos, precios'], ['checklist', 'Se aprueba', 'La plantilla y sus reglas'], ['medicion', 'Se aprende', 'Qué versión rinde con quién']], 140, 860, 230);
  slides['L-dco'] = page(inner, 1400, 460);
}

// M · Medición incremental
{
  let inner = voice({ eyebrow: 'Programática · Medición incremental', question: '¿La campaña sumó de verdad?', answer: ['Lo', 'probamos'], body: 'Comparamos zonas con campaña contra zonas parecidas sin ella, y medimos la recordación antes y después: lo que la campaña agregó, no lo que habría pasado <b>igual</b>.' });
  const map = (x, y, lit, title) => {
    let dots = '';
    for (let r = 0; r < 9; r++) for (let c = 0; c < 13; c++) { const on = lit && ((r * 7 + c * 3) % 5 !== 0); dots += `<circle cx="${22 + c * 30}" cy="${22 + r * 26}" r="${on ? 5 : 3.5}" fill="${on ? '#bfe0ff' : '#ffffff'}" opacity="${on ? 0.9 : 0.18}"/>`; }
    return glass(x, y, 420, 300, 22) + `<svg style="position:absolute;left:${x + 10}px;top:${y + 50}px" width="400" height="240">${lit ? '<defs><radialGradient id="mg" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#7fb6ff" stop-opacity="0.45"/><stop offset="1" stop-color="#7fb6ff" stop-opacity="0"/></radialGradient></defs><rect width="400" height="240" fill="url(#mg)"/>' : ''}${dots}</svg><div style="position:absolute;left:${x + 24}px;top:${y + 18}px;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${lit ? '#fff' : MUTE}">${title}</div>`;
  };
  inner += map(880, 140, true, 'Zonas con campaña') + map(1330, 140, false, 'Zonas de control, sin campaña');
  // gráfico ilustrativo
  const gx = 880, gy = 480, gw = 870, gh = 300;
  inner += glass(gx, gy, gw, gh + 60, 22);
  const X = (t) => gx + 60 + t * (gw - 110), Y = (v) => gy + 40 + (1 - v) * (gh - 60);
  const ctrl = [0.30, 0.31, 0.30, 0.32, 0.31, 0.33, 0.32, 0.33, 0.34], camp = [0.30, 0.31, 0.31, 0.38, 0.47, 0.55, 0.60, 0.63, 0.66];
  const line = (a) => a.map((v, i) => `${i ? 'L' : 'M'}${X(i / 8)} ${Y(v)}`).join(' ');
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="${line(camp)} ${ctrl.slice().reverse().map((v, i) => `L${X((8 - i) / 8)} ${Y(v)}`).join(' ')} Z" fill="#7fb6ff" opacity="0.22"/><path d="${line(ctrl)}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="3" fill="none" stroke-dasharray="8 7"/><path d="${line(camp)}" stroke="#ffffff" stroke-width="4" fill="none"/><line x1="${X(2.5 / 8)}" y1="${gy + 30}" x2="${X(2.5 / 8)}" y2="${gy + gh - 10}" stroke="${ACC}" stroke-width="3"/><circle cx="${X(1)}" cy="${Y(0.66)}" r="7" fill="${ACC}"/></svg>`;
  inner += `<div style="position:absolute;left:${X(2.5 / 8) + 12}px;top:${gy + 26}px;font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#fff">Sale la campaña</div>`;
  inner += `<div style="position:absolute;left:${X(0.5)}px;top:${Y(0.86)}px;width:240px;font-family:${ID};font-size:24px;font-weight:760;line-height:1.05;color:#fff">Lo que sumó la campaña</div>`;
  inner += `<div style="position:absolute;left:${gx + 60}px;top:${gy + gh + 16}px;display:flex;gap:28px;font-family:${ST};font-size:15px;color:${SOFT}"><span>━ Con campaña</span><span style="color:${MUTE}">┅ Control</span><span style="color:${MUTE}">Gráfico ilustrativo, sin datos reales</span></div>`;
  inner += facts([['ubicacion', 'Prueba por zonas', 'Zonas con y sin campaña'], ['informe', 'Recordación', 'Encuesta antes y después'], ['calendario', 'Requisito', 'Se diseña antes de salir al aire']], 140, 860, 230);
  slides['M-incremental'] = page(inner, 1320, 480);
}


// J · DOOH circuitos (foto real con los anuncios de ejemplo compuestos y terminados)
{
  let inner = voice({ eyebrow: 'Programática · DOOH', question: '¿Qué pantallas de la calle?', answer: ['En tu ruta'], body: 'Gran formato, paraderos, metro, malls, aeropuertos y puntos de venta: elegimos el circuito por donde pasa tu cliente y a la <b>hora</b> en que pasa.' });
  const fx = 860, fy = 120, fw = 1000, fh = 667, k = fw / 1536;
  inner += `<div style="position:absolute;left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;border-radius:24px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 40px 100px rgba(0,0,0,0.7);background:url(${EJF}/calle-final.png) 0 0/${fw}px ${fh}px"></div>`;
  const P = (x, y) => [fx + x * k, fy + y * k];
  const pts = [[P(330, 215), 'Gran formato', 'Fachadas y autopistas'], [P(855, 492), 'Metro', 'Accesos y andenes'], [P(1295, 575), 'Paradero', 'A la altura de la vista']];
  inner += callout(pts[0][0][0], pts[0][0][1], fx + 40, fy + fh + 50, pts[0][1], pts[0][2], 'left');
  inner += callout(pts[1][0][0], pts[1][0][1], fx + 380, fy + fh + 50, pts[1][1], pts[1][2], 'left');
  inner += callout(pts[2][0][0], pts[2][0][1], fx + 700, fy + fh + 50, pts[2][1], pts[2][2], 'left');
  inner += `<div style="position:absolute;left:${fx}px;top:${fy - 40}px;font-family:${ST};font-size:14px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">Anuncios de una marca de ejemplo · también malls, aeropuertos y puntos de venta</div>`;
  inner += facts([['ubicacion', 'Se elige', 'Circuito, ciudad y horario'], ['checklist', 'Evidencia', 'Prueba de emisión por pantalla'], ['contenido', 'Necesitas', 'Piezas en los tamaños de cada red']], 140, 860, 230);
  slides['J-dooh-circuitos'] = page(inner, 1360, 460);
}

// O · Retail media
{
  let inner = statement({ eyebrow: 'Programática · Retail media', lines: ['Donde', 'se compra'], body: 'Anuncios en los sitios, apps y pantallas de las cadenas y marketplaces, con sus datos de compra para llegar a quien busca y medir contra la <b>venta</b>.' });
  const fx = 860, fy = 110, fw = 1000, fh = 667;
  inner += `<div style="position:absolute;left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;border-radius:24px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 40px 100px rgba(0,0,0,0.7);background:url(${EJF}/tienda-final.png) 0 0/${fw}px ${fh}px"></div>`;
  const cx = 900, cy = 470, cw = 330, ch = 380;
  inner += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px;border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,0.16),rgba(6,25,48,0.94));border:1.5px solid rgba(255,255,255,0.28);box-shadow:0 30px 80px rgba(0,0,0,0.7);overflow:hidden">
<div style="padding:14px 16px"><div style="height:30px;border-radius:15px;background:rgba(255,255,255,0.1);display:flex;align-items:center;padding:0 12px;gap:8px;font-family:${ST};font-size:14px;color:${SOFT}"><span style="width:18px;height:18px">${icon('busqueda', 18)}</span>zapatillas running</div></div>
<div style="position:relative;margin:0 16px;height:170px;border-radius:12px;overflow:hidden;outline:2.5px solid ${ACC};outline-offset:2px;background:#000 url(${SHOE}) 55% 45%/cover"><div style="position:absolute;left:10px;top:10px;font-family:${ST};font-size:11px;font-weight:600;letter-spacing:0.12em;color:#fff;background:rgba(0,0,0,0.55);padding:3px 8px;border-radius:6px">PATROCINADO</div></div>
<div style="margin:12px 16px 0">${lockup(14)}<div style="margin-top:6px;font-family:${ST};font-size:17px;font-weight:600;color:#fff">Zapatilla de running, suela lima</div><div style="margin-top:4px;font-family:${ST};font-size:14px;color:${SOFT}">★★★★★ · Retiro en tienda</div></div>
<div style="position:absolute;left:16px;right:16px;bottom:16px;height:40px;border-radius:20px;background:#fff;display:flex;align-items:center;justify-content:center;font-family:${ST};font-size:15px;font-weight:600;color:#001a33">Agregar al carro</div></div>`;
  inner += callout(fx + 465, fy + 200, 1640, 850, 'Pantalla en tienda', 'En el pasillo, al momento de elegir', 'left');
  inner += callout(cx + cw - 10, cy + 150, 1300, 850, 'Producto patrocinado', 'Primero en la búsqueda del sitio', 'left');
  inner += `<div style="position:absolute;left:${fx}px;top:${fy - 40}px;font-family:${ST};font-size:14px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">Anuncios de una marca de ejemplo</div>`;
  inner += facts([['base-de-datos', 'Requiere', 'Acceso a venta y catálogo'], ['web', 'Dónde', 'Sitio, app y tienda física'], ['medicion', 'Se mide', 'Contra la venta en la cadena']], 140, 860, 230);
  slides['O-retail'] = page(inner, 1360, 460);
}


// ───────── PERFORMANCE POR PLATAFORMA ─────────
// P-A · Panorama de plataformas (estado por motion según la ficha de Performance, 2026-09-10)
{
  let inner = voice({ eyebrow: 'Performance · Plataformas', question: '¿En qué plataformas pauto?', answer: ['Las justas'], body: 'Elegimos los canales por lo que vendes y a quién. Cada canal es parte del servicio, nunca un producto <b>suelto</b>: se suma cuando tu señal y tu inversión lo sostienen.' });
  const P = [['google-isotype', 'Google', 'Search · PMax · Demand Gen', 'core', 'core'], ['meta-isotype-negative', 'Meta', 'Facebook · Instagram', 'core', 'sel'], ['tiktok-isotype-negative', 'TikTok', 'Con creatividad nativa', 'core', 'no'], ['linkedin-isotype-negative', 'LinkedIn', 'Empresas y cargos', 'sel', 'core'], ['youtube-isotype', 'YouTube', 'Alcance en video', 'sel', 'sel'],
    ['bing-isotype', 'Microsoft', 'Búsqueda corporativa', 'sel', 'sel'], [null, 'Retail media', 'Cadenas y marketplaces', 'core', 'no', 'embudo'], [null, 'Programática', 'Display, video, CTV, DOOH', 'sel', 'sel', 'medios'], ['chatgpt-isotype-negative', 'ChatGPT Ads', 'Donde existe', 'sel', 'sel'], ['x-isotype-negative', 'X Ads', 'Sólo bajo pedido', 'ped', 'ped']];
  const pill = (st, who) => { const t = { core: 'Core', sel: 'Selectivo', ped: 'A pedido', no: '—' }[st];
    const sty = st === 'core' ? 'background:#fff;color:#001a33;border:1.5px solid #fff' : st === 'sel' ? 'background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,0.7)' : st === 'ped' ? 'background:transparent;color:#d9e3ec;border:1.5px dashed rgba(255,255,255,0.5)' : 'background:transparent;color:rgba(255,255,255,0.35);border:1.5px solid rgba(255,255,255,0.12)';
    return `<div style="display:flex;justify-content:space-between;align-items:center;font-family:${ST};font-size:13px;color:${MUTE}"><span>${who}</span><span style="font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;white-space:nowrap;${sty}">${t}</span></div>`; };
  const x0 = 860, tw = 186, th = 300, gap = 18;
  P.forEach(([f, n, d, a, b, g], i) => {
    const x = x0 + (i % 5) * (tw + gap), y = 150 + Math.floor(i / 5) * (th + gap), hot = a === 'core' || b === 'core';
    inner += glass(x, y, tw, th, 20, hot ? 'border-color:rgba(255,255,255,0.45);box-shadow:0 0 50px rgba(127,182,255,0.25),0 30px 80px rgba(0,0,0,0.55)' : 'opacity:0.85');
    inner += `<div style="position:absolute;left:${x + 20}px;top:${y + 22}px;width:${tw - 40}px">
<div style="height:48px;display:flex;align-items:center">${f ? iso(f, 44) : `<div style="width:44px;height:44px">${icon(g, 44)}</div>`}</div>
<div style="margin-top:18px;font-family:${ID};font-size:26px;font-weight:760;letter-spacing:-0.02em;line-height:1;color:#fff">${n}</div>
<div style="margin-top:6px;height:40px;font-family:${ST};font-size:14px;font-weight:300;line-height:1.3;color:${SOFT}">${d}</div>
<div style="margin-top:44px;display:flex;flex-direction:column;gap:10px">${pill(a, 'Consumo')}${pill(b, 'B2B')}</div></div>`;
  });
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M${x0 + 30} 128 Q ${x0 + 500} 96 ${x0 + 960} 128" stroke="${ACC}" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  inner += `<div style="position:absolute;left:${x0}px;top:790px;width:1000px;font-family:${ST};font-size:15px;color:${MUTE}">Core: lo operamos por defecto · Selectivo: cuando el objetivo lo pide · A pedido: con revisión previa. Siempre en la cuenta del cliente.</div>`;
  inner += facts([['objetivo', 'Se decide', 'Por lo que vendes y a quién'], ['seguridad', 'Las cuentas', 'Siempre a tu nombre'], ['medicion', 'Se suma', 'Cuando la señal lo sostiene']], 140, 860, 230);
  slides['QA-plataformas'] = page(inner, 1360, 470);
}

// P-B · Google
{
  let inner = voice({ eyebrow: 'Performance · Google', question: '¿Y en Google, qué cambia?', answer: ['La señal'], body: 'Search, Performance Max, Demand Gen y YouTube aprenden de lo que les mandamos: conversiones con valor, exclusiones de marca y listas desde tu CRM. Cuando la búsqueda migre a AI Max en 2027, llegamos con los controles <b>puestos</b>.' });
  const tag = (f, t) => `<div style="display:flex;align-items:center;gap:8px;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">${iso(f, 18)}${t}</div>`;
  // Search
  inner += glass(860, 130, 560, 380, 22);
  inner += `<div style="position:absolute;left:884px;top:150px">${tag('google-isotype', 'Search')}</div>
<div style="position:absolute;left:884px;top:186px;width:512px;height:46px;border-radius:23px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.25);display:flex;align-items:center;gap:12px;padding:0 18px;box-sizing:border-box;font-family:Inter,sans-serif;font-size:17px;color:#fff"><span style="width:20px;height:20px">${icon('busqueda', 20)}</span>zapatillas para correr de noche</div>
<div style="position:absolute;left:884px;top:250px;width:512px;padding:16px 18px;box-sizing:border-box;border-radius:14px;outline:2.5px solid ${ACC};outline-offset:2px;background:rgba(255,255,255,0.05);font-family:Inter,sans-serif">
<div style="display:flex;align-items:center;gap:10px;font-size:13px;color:${SOFT}"><span style="font-weight:700;color:#fff">Patrocinado</span>·<span>nortica.ejemplo</span></div>
<div style="margin-top:6px;font-size:22px;font-weight:600;color:#9fd0ff">Zapatillas de running · Suela lima reflectante</div>
<div style="margin-top:6px;font-size:15px;line-height:1.4;color:#d9e3ec">Corre de noche con más visibilidad. Envío a todo el país y cambio de talla gratis.</div>
<div style="margin-top:10px;display:flex;gap:18px;font-size:14px;font-weight:600;color:#9fd0ff"><span>Nueva colección</span><span>Guía de tallas</span><span>Tiendas</span></div></div>
${bar(884, 440, 420, 10, 0.25)}${bar(884, 462, 340, 8, 0.15)}`;
  // Shopping
  inner += glass(1440, 130, 420, 380, 22);
  inner += `<div style="position:absolute;left:1464px;top:150px">${tag('google-isotype', 'Shopping · PMax')}</div>`;
  [0, 1, 2].forEach(i => { const x = 1464 + i * 128; inner += `<div style="position:absolute;left:${x}px;top:190px;width:116px;height:290px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);${i === 0 ? `outline:2.5px solid ${ACC};outline-offset:2px;` : 'opacity:0.6;'}overflow:hidden">${i === 0 ? `<div style="height:120px;background:#000 url(${SHOE}) 60% 50%/cover"></div><div style="padding:10px;font-family:Inter,sans-serif"><div style="font-size:13px;font-weight:600;color:#fff;line-height:1.25">Nórtica Night Run</div><div style="margin-top:6px;font-size:16px;font-weight:700;color:#fff">$ 89.990</div><div style="margin-top:4px;font-size:11px;color:${SOFT}">nortica.ejemplo</div><div style="margin-top:8px;font-size:10px;font-weight:700;color:#fff;opacity:0.8">PATROCINADO</div></div>` : `<div style="height:120px;background:rgba(201,214,227,0.12)"></div>${bar(10, 136, 90, 8, 0.3).replace('position:absolute;', 'position:relative;margin:136px 0 0 10px;')}`}</div>`; });
  // YouTube
  inner += glass(860, 530, 620, 300, 22);
  inner += `<div style="position:absolute;left:884px;top:548px">${tag('youtube-isotype', 'YouTube')}</div><div style="position:absolute;left:884px;top:580px;width:572px;height:230px;border-radius:12px;overflow:hidden;outline:2.5px solid ${ACC};outline-offset:2px">${nortAd(572, 230, { pos: '28% 40%', kind: 'wide', label: null })}<div style="position:absolute;left:10px;bottom:10px;font-family:Inter;font-size:12px;font-weight:600;color:#fff;background:rgba(0,0,0,0.6);padding:4px 8px;border-radius:4px">Anuncio · 0:06</div><div style="position:absolute;right:10px;bottom:10px;font-family:Inter;font-size:12px;color:#fff;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.4);padding:4px 10px;border-radius:4px">Omitir ›</div></div>`;
  // Demand Gen
  inner += glass(1500, 530, 360, 300, 22);
  inner += `<div style="position:absolute;left:1524px;top:548px">${tag('google-isotype', 'Demand Gen')}</div><div style="position:absolute;left:1524px;top:580px;width:312px;height:150px;border-radius:12px;overflow:hidden;outline:2.5px solid ${ACC};outline-offset:2px;background:#000 url(${HERO}) 30% 40%/cover"></div><div style="position:absolute;left:1524px;top:742px;width:312px;font-family:Inter,sans-serif"><div style="font-size:15px;font-weight:600;color:#fff;line-height:1.3">La suela que se nota de noche</div><div style="margin-top:4px;font-size:12px;color:${SOFT}">Patrocinado · Nórtica</div></div>`;
  inner += `<div style="position:absolute;left:860px;top:96px;font-family:${ST};font-size:14px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">Anuncios de una marca de ejemplo</div>`;
  inner += facts([['base-de-datos', 'Le mandamos', 'Conversiones con valor y listas del CRM'], ['seguridad', 'Controles', 'Exclusiones de marca y de búsqueda'], ['calendario', 'Febrero 2027', 'Búsqueda migra a AI Max']], 140, 860, 230);
  slides['QB-google'] = page(inner, 1360, 470);
}

// P-C · Meta (foto: tres teléfonos con Feed, Stories y Reels)
{
  let inner = voice({ eyebrow: 'Performance · Meta', question: '¿Qué mueve a Meta hoy?', answer: ['La pieza'], body: 'Con Advantage+ el algoritmo elige a quién mostrar. Lo que decide es la creatividad y la señal: producimos y probamos variantes para Feed, Stories y Reels, y leemos el resultado con la atribución que Meta cambió en <b>2026</b>.' });
  const fx = 860, fy = 110, fw = 1000, fh = 667, k = fw / 1536;
  inner += `<div style="position:absolute;left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;border-radius:24px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 40px 100px rgba(0,0,0,0.7);background:url(${EJF}/tres-telefonos-final.png) 0 0/${fw}px ${fh}px"></div>`;
  inner += `<div style="position:absolute;left:${fx + 24}px;top:${fy + 22}px;display:flex;gap:12px">${iso('meta-isotype-negative', 30)}${iso('instagram-isotype-negative', 30)}</div>`;
  [[420, 'Feed', 'Pieza 4:5 con texto'], [763, 'Stories', 'Vertical, de lado a lado'], [1099, 'Reels', 'Video vertical con sonido']].forEach(([x, t, d], i) => {
    inner += `<div style="position:absolute;left:${fx + x * k - 110}px;top:${fy + fh + 16}px;width:220px;text-align:center"><div style="font-family:${ID};font-size:26px;font-weight:760;color:#fff">${t}</div><div style="font-family:${ST};font-size:15px;font-weight:300;color:${SOFT}">${d}</div></div>`;
  });
  inner += `<div style="position:absolute;left:${fx}px;top:${fy - 40}px;font-family:${ST};font-size:14px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">Anuncios de una marca de ejemplo</div>`;
  inner += facts([['contenido', 'La palanca', 'Variantes creativas probadas'], ['base-de-datos', 'La señal', 'API de Conversiones con valor'], ['medicion', 'La lectura', 'Con la atribución de 2026']], 140, 860, 230);
  slides['QC-meta'] = page(inner, 1360, 460);
}

// P-D · TikTok (foto: video vertical en el bus)
{
  let inner = statement({ eyebrow: 'Performance · TikTok', lines: ['Hecho para', 'TikTok'], body: 'TikTok premia lo que parece hecho para TikTok: video vertical, con creadores o con tu equipo, al ritmo de la plataforma. Sin producción nativa, no lo <b>activamos</b>.' });
  const fx = 860, fy = 110, fw = 1000, fh = 667, k = fw / 1536;
  inner += `<div style="position:absolute;left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;border-radius:24px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 40px 100px rgba(0,0,0,0.7);background:url(${EJF}/bus-final.png) -560px -380px/1650px 1100px"></div>`;
  inner += `<div style="position:absolute;left:${fx + 24}px;top:${fy + 22}px">${iso('tiktok-isotype-negative', 34)}</div>`;
  inner += callout(fx + 895 * 1.074 - 560 + 70, fy + 569 * 1.074 - 380, 1500, 845, 'Video vertical', 'Nativo, con sonido, en los primeros segundos', 'left');
  inner += `<div style="position:absolute;left:${fx}px;top:${fy - 40}px;font-family:${ST};font-size:14px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">Anuncio de una marca de ejemplo</div>`;
  inner += `<div style="position:absolute;left:${fx}px;top:${fy + fh + 18}px;width:560px;display:flex;flex-wrap:wrap;gap:10px">${['Creadores y Spark Ads', 'Pruebas de ganchos', 'Compra en la app: México y Brasil'].map(t => `<span style="font-family:${ST};font-size:15px;font-weight:500;color:#fff;padding:7px 14px;border-radius:999px;border:1.5px solid rgba(255,255,255,0.35)">${t}</span>`).join('')}</div>`;
  inner += facts([['multimedia', 'Requisito', 'Producción vertical nativa'], ['base-de-datos', 'La señal', 'Events API con valor'], ['influencer', 'Con quién', 'Creadores o tu propio equipo']], 140, 860, 230);
  slides['QD-tiktok'] = page(inner, 1360, 460);
}

// P-E · LinkedIn (foto: laptop con documento promocionado de Andara, marca B2B de ejemplo)
{
  let inner = statement({ eyebrow: 'Performance · LinkedIn', lines: ['Directo al', 'comité'], body: 'Pautamos a las empresas y cargos que tu equipo comercial ya persigue, con documentos y formularios que vuelven al CRM como oportunidades. Es caro por diseño: se justifica por la cuenta <b>alcanzada</b>.' });
  const fx = 860, fy = 110, fw = 1000, fh = 667;
  inner += `<div style="position:absolute;left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;border-radius:24px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 40px 100px rgba(0,0,0,0.7);background:url(${EJF}/laptop-final.png) -520px -250px/1650px 1100px"></div>`;
  inner += `<div style="position:absolute;left:${fx + 24}px;top:${fy + 22}px">${iso('linkedin-isotype-negative', 34)}</div>`;
  // formulario → CRM
  const cx = 890, cy = 520, cw = 330, ch = 300;
  inner += `<div style="position:absolute;left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px;border-radius:20px;background:linear-gradient(160deg,rgba(255,255,255,0.16),rgba(6,25,48,0.95));border:1.5px solid rgba(255,255,255,0.28);box-shadow:0 30px 80px rgba(0,0,0,0.7);padding:18px 20px;box-sizing:border-box;font-family:Inter,sans-serif">
<div style="display:flex;align-items:center;justify-content:space-between">${andaraLockup(16)}<span style="font-size:11px;color:${SOFT}">Formulario</span></div>
${[['Nombre', 'Camila Rojas'], ['Cargo', 'Gerente de operaciones'], ['Empresa', 'Distribuidora del Sur']].map(([k2, v]) => `<div style="margin-top:12px"><div style="font-size:11px;color:${MUTE}">${k2}</div><div style="margin-top:3px;font-size:14px;color:#fff;padding:7px 10px;border-radius:8px;background:rgba(255,255,255,0.08)">${v}</div></div>`).join('')}
<div style="margin-top:14px;height:36px;border-radius:18px;background:${CYAN};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#05080c">Descargar guía</div></div>`;
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M${cx + cw} ${cy + 150} C ${cx + cw + 90} ${cy + 150}, ${cx + cw + 60} ${cy + 330}, ${cx + cw + 160} ${cy + 330}" stroke="${ACC}" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  inner += `<div style="position:absolute;left:${cx + cw + 170}px;top:${cy + 300}px;height:60px;padding:0 20px;border-radius:30px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.3);display:flex;align-items:center;gap:14px;font-family:${ST};font-size:16px;font-weight:500;color:#fff"><img src="${LOGOS}/axis/hubspot-isotype.svg" style="height:26px"><img src="${LOGOS}/partners/salesforce.com_logo.svg" style="height:26px">Oportunidad en tu CRM</div>`;
  inner += `<div style="position:absolute;left:${fx}px;top:${fy - 40}px;font-family:${ST};font-size:14px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">Anuncio de una marca B2B de ejemplo</div>`;
  inner += facts([['objetivo', 'A quién', 'Empresas y cargos de tu lista'], ['crm', 'Vuelve como', 'Oportunidad, no como like'], ['revenue', 'Se mide', 'Pipeline y cuentas alcanzadas']], 140, 860, 230);
  slides['QE-linkedin'] = page(inner, 1360, 460);
}

// P-F · Microsoft y X
{
  let inner = statement({ eyebrow: 'Performance · Selectivos', lines: ['Microsoft y X,', 'cuando suman'], body: 'Microsoft Advertising suma búsqueda en audiencias corporativas. X entra sólo bajo pedido, con revisión de seguridad de marca, verificación de terceros y una lectura separada del resto del <b>mix</b>.' });
  const card = (x, f, title, tagline, items, accent) => glass(x, 150, 480, 640, 26, accent ? `border-color:rgba(255,255,255,0.45);box-shadow:0 0 60px rgba(127,182,255,0.22),0 30px 80px rgba(0,0,0,0.55)` : '') + `<div style="position:absolute;left:${x + 36}px;top:186px;width:408px">${iso(f, 72)}<div style="margin-top:28px;font-family:${ID};font-size:44px;font-weight:760;letter-spacing:-0.03em;line-height:1;color:#fff">${title}</div><div style="margin-top:10px;font-family:${ST};font-size:18px;font-weight:300;color:${SOFT}">${tagline}</div>
<div style="margin-top:34px;display:flex;flex-direction:column;gap:18px">${items.map(([g, t]) => `<div style="display:flex;gap:14px;align-items:flex-start"><span style="flex:none;width:28px;height:28px">${icon(g, 28)}</span><span style="font-family:${ST};font-size:18px;font-weight:400;line-height:1.35;color:#fff">${t}</span></div>`).join('')}</div></div>`;
  inner += card(860, 'bing-isotype', 'Microsoft Advertising', 'Selectivo · consumo y B2B', [['busqueda', 'Búsqueda incremental a la de Google'], ['objetivo', 'Audiencias de empresas y cargos'], ['integracion', 'Se importa desde tus campañas de Search'], ['medicion', 'Se lee junto con Search, sin duplicar']], true);
  inner += card(1380, 'x-isotype-negative', 'X Ads', 'Sólo bajo pedido', [['seguridad', 'Revisión de seguridad de marca antes de pautar'], ['checklist', 'Verificación de terceros en cada campaña'], ['medicion', 'Resultados leídos aparte del resto'], ['reunion', 'Lo activa una decisión explícita tuya']], false);
  inner += facts([['busqueda', 'Microsoft', 'Cuando hay búsqueda corporativa'], ['seguridad', 'X Ads', 'Sólo con verificación de terceros']], 140, 860, 280);
  slides['QF-selectivos'] = page(inner, 1360, 470);
}

// P-G · Una pieza, cada plataforma
{
  let inner = voice({ eyebrow: 'Performance · Creatividad por plataforma', question: '¿Una pieza sirve para todo?', answer: ['Se adapta'], body: 'Partimos de una idea y la llevamos al formato, la duración y el lenguaje de cada plataforma. Lo vertical no es un horizontal <b>recortado</b>.' });
  const F = [['9:16', 180, 320, ['tiktok-isotype-negative', 'instagram-isotype-negative'], 'Reels, Stories, TikTok', 'tall', HERO, '28% 45%'], ['4:5', 224, 280, ['meta-isotype-negative'], 'Feed', 'tall', HERO, '35% 40%'], ['1:1', 240, 240, ['meta-isotype-negative', 'linkedin-isotype-negative'], 'Feed y carrusel', 'tall', SHOE, '60% 50%'], ['16:9', 300, 169, ['youtube-isotype'], 'YouTube y CTV', 'wide', HERO, '30% 40%']];
  let x = 850; const base = 640;
  F.forEach(([r, w, h, isos, d, kind, img, pos], i) => {
    inner += `<div style="position:absolute;left:${x}px;top:${base - h}px;width:${w}px;height:${h}px;border-radius:12px;overflow:hidden;outline:2.5px solid ${ACC};outline-offset:3px;box-shadow:0 30px 70px rgba(0,0,0,0.6),0 0 50px rgba(215,255,46,0.15)">${nortAd(w, h, { img, pos, kind, label: null, lines: i === 2 ? ['MÁS', 'LIVIANA'] : undefined })}</div>`;
    inner += `<div style="position:absolute;left:${x}px;top:${base + 26}px;width:${Math.max(w, 180)}px"><div style="font-family:${ID};font-size:40px;font-weight:760;letter-spacing:-0.03em;color:#fff">${r}</div><div style="margin-top:2px;font-family:${ST};font-size:15px;color:${SOFT}">${d}</div><div style="margin-top:10px;display:flex;gap:8px">${isos.map(f => iso(f, 22)).join('')}</div></div>`;
    x += w + 26;
  });
  inner += `<div style="position:absolute;left:860px;top:200px;font-family:${ST};font-size:14px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">Una idea · cuatro formatos · marca de ejemplo</div>`;
  inner += facts([['contenido', 'Desde', 'Una idea, no un formato'], ['multimedia', 'Duraciones', '6, 15 y 30 segundos'], ['medicion', 'Se prueba', 'Variantes por plataforma']], 140, 860, 230);
  slides['QG-formatos'] = page(inner, 1360, 470);
}

// P-H · Lo que le mandamos a cada plataforma
{
  let inner = voice({ eyebrow: 'Performance · Señal por plataforma', question: '¿Qué le mandan a cada una?', answer: ['Tu venta'], body: 'Cada plataforma recibe tus conversiones con valor desde el sitio y el CRM, servidor a servidor, con consentimiento y sin duplicar: así optimiza hacia ventas, no hacia <b>clics</b>.' });
  const src = [['web', 'Tu sitio', 'Compras y formularios'], ['crm', 'Tu CRM', 'Oportunidades y ventas'], ['revenue', 'Venta offline', 'Tienda y teléfono']];
  src.forEach(([g, t, d], i) => { const y = 240 + i * 170; inner += glass(860, y, 250, 120, 18) + `<div style="position:absolute;left:884px;top:${y + 22}px;display:flex;gap:14px;align-items:center"><span style="width:34px;height:34px">${icon(g, 34)}</span><div><div style="font-family:${ID};font-size:24px;font-weight:760;color:#fff">${t}</div><div style="font-family:${ST};font-size:14px;color:${SOFT}">${d}</div></div></div>`; });
  // núcleo
  const hx = 1290, hy = 465;
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><defs><radialGradient id="core" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#7fb6ff" stop-opacity="0.5"/><stop offset="1" stop-color="#7fb6ff" stop-opacity="0"/></radialGradient></defs>
${src.map((_, i) => { const ys = 300 + i * 170, a = Math.PI - (i - 1) * 0.42, ex = hx + 128 * Math.cos(a), ey = hy + 128 * Math.sin(a); return `<path d="M1110 ${ys} C 1150 ${ys}, ${ex - 40} ${ey}, ${ex} ${ey}" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" fill="none"/>`; }).join('')}
<circle cx="${hx}" cy="${hy}" r="150" fill="url(#core)"/><ellipse cx="${hx}" cy="${hy}" rx="128" ry="128" fill="none" stroke="${ACC}" stroke-width="3"/><circle cx="${hx + 90}" cy="${hy - 90}" r="10" fill="${ACC}"/>
${[0, 1, 2, 3, 4].map(i => { const yc = 192 + i * 130, a = (i - 2) * 0.3, sx = hx + 128 * Math.cos(a), sy = hy + 128 * Math.sin(a); return `<path d="M${sx} ${sy} C ${sx + 70} ${sy + (yc - sy) * 0.1}, 1420 ${yc}, 1494 ${yc}" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" fill="none"/>`; }).join('')}</svg>`;
  inner += `<div style="position:absolute;left:${hx - 110}px;top:${hy - 46}px;width:220px;text-align:center"><div style="font-family:${ID};font-size:26px;font-weight:760;color:#fff;line-height:1.05">Limpia, deduplica y da valor</div><div style="margin-top:6px;font-family:${ST};font-size:13px;color:${SOFT}">con consentimiento</div></div>`;
  const dst = [['meta-isotype-negative', 'Meta', 'API de Conversiones'], ['google-ads-isotype', 'Google', 'Conversiones mejoradas y offline'], ['tiktok-isotype-negative', 'TikTok', 'Events API'], ['linkedin-isotype-negative', 'LinkedIn', 'API de Conversiones'], ['bing-isotype', 'Microsoft', 'Conversiones offline']];
  dst.forEach(([f, t, d], i) => { const y = 150 + i * 130; inner += glass(1500, y, 360, 84, 18) + `<div style="position:absolute;left:1516px;top:${y}px;height:84px;display:flex;gap:14px;align-items:center"><div style="flex:none;width:56px;height:44px;display:flex;align-items:center;justify-content:center">${iso(f, 36)}</div><div><div style="font-family:${ID};font-size:22px;font-weight:760;color:#fff;line-height:1">${t}</div><div style="margin-top:3px;font-family:${ST};font-size:14px;color:${SOFT}">${d}</div></div></div>`; });
  inner += facts([['seguridad', 'Con permiso', 'Base de licitud documentada'], ['checklist', 'Sin duplicar', 'Navegador y servidor conciliados'], ['medicion', 'Salud', 'Se revisa cada mes por plataforma']], 140, 860, 230);
  slides['QH-senal'] = page(inner, 1360, 470);
}


// P8 · Probado (rehecha a mano en la línea Voice: luz fría, órbita blanca, naranja sólo en el arco activo y la esfera)
{
  let inner = voice({ eyebrow: 'Performance · Social', question: '¿Qué pieza pauto?', answer: ['Probado'], body: 'Lo orgánico prueba y la pauta escala: publicamos versiones, leemos cuál retiene y ponemos <b>presupuesto</b> en las que ganan.' });
  const cx = 1290, cy = 590, rx = 400, ry = 150;
  const pt = (deg) => { const a = deg * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; };
  const nodes = [[-90, 'contenido'], [0, 'medicion'], [90, 'medios'], [180, 'republicar']];
  const arc = (a0, a1) => { const p0 = pt(a0), p1 = pt(a1); return `M${p0[0]} ${p0[1]} A ${rx} ${ry} 0 0 1 ${p1[0]} ${p1[1]}`; };
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><defs><radialGradient id="pcore" cx="${cx}" cy="${cy}" r="330" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3d86d8" stop-opacity="0.45"/><stop offset="0.6" stop-color="#1b4f7a" stop-opacity="0.2"/><stop offset="1" stop-color="#001a33" stop-opacity="0"/></radialGradient><filter id="pglow"><feGaussianBlur stdDeviation="5"/></filter></defs>
<ellipse cx="${cx}" cy="${cy}" rx="330" ry="230" fill="url(#pcore)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2"/>
${[45, 135, 225, 315].map(d => { const [x, y] = pt(d), [x2, y2] = pt(d + 4); const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI; return `<path d="M-7 -6 L3 0 L-7 6" transform="translate(${x} ${y}) rotate(${ang})" stroke="#ffffff" stroke-opacity="0.7" stroke-width="2" fill="none" stroke-linecap="round"/>`; }).join('')}
<path d="${arc(-82, -10)}" stroke="${ACC}" stroke-width="10" fill="none" opacity="0.35" filter="url(#pglow)"/>
<path d="${arc(-82, -10)}" stroke="${ACC}" stroke-width="4" fill="none" stroke-linecap="round"/>
<circle cx="${pt(-10)[0]}" cy="${pt(-10)[1]}" r="9" fill="${ACC}"/></svg>`;
  nodes.forEach(([d, g]) => { const [x, y] = pt(d); inner += `<div style="position:absolute;left:${x - 52}px;top:${y - 52}px;width:104px;height:104px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#1d4f80,#06213f);border:1.5px solid rgba(255,255,255,0.35);box-shadow:0 20px 50px rgba(0,0,0,0.6),0 0 40px rgba(61,134,216,0.35);display:flex;align-items:center;justify-content:center"><span style="width:40px;height:40px">${icon(g, 40)}</span></div>`; });
  inner += `<div style="position:absolute;left:${cx - 170}px;top:${cy - 38}px;width:340px;text-align:center"><div style="font-family:${ID};font-size:40px;font-weight:760;letter-spacing:-0.03em;color:#fff">Tu contenido</div><div style="margin-top:4px;font-family:${ST};font-size:18px;font-weight:400;color:${SOFT}">mejora en cada vuelta</div></div>`;
  const card = (x, y, n, t, d, hot) => glass(x, y, 360, 148, 18, hot ? `border-color:${ACC};box-shadow:0 0 40px rgba(248,57,2,0.18),0 30px 80px rgba(0,0,0,0.55)` : '') + `<div style="position:absolute;left:${x + 22}px;top:${y + 20}px;width:316px"><div style="font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${n}</div><div style="margin-top:4px;font-family:${ID};font-size:34px;font-weight:760;letter-spacing:-0.025em;line-height:1;color:#fff">${t}</div><div style="margin-top:8px;font-family:${ST};font-size:16px;font-weight:300;line-height:1.35;color:${SOFT}">${d}</div></div>`;
  inner += card(1110, 170, '01 · Empieza aquí', 'Publicar', 'Varias versiones de cada idea en orgánico, con ganchos distintos.', true);
  inner += card(1530, 330, '02', 'Leer', 'Cuál retiene de verdad: tiempo de vista, guardados y comentarios.');
  inner += card(1110, 800, '03', 'Pautar', 'Presupuesto a las piezas elegidas, con la razón registrada.');
  inner += card(640, 690, '04', 'Aprender', 'Lo que la pauta enseña vuelve al calendario editorial.');
  slides['P8-probado'] = page(inner, 1290, 560);
}


// T · Tecnología con la que operamos (stack por capas). Proveedores sin logo oficial en la biblioteca → ficha de texto neutra.
{
  let inner = statement({ eyebrow: 'Performance · Tecnología', lines: ['Tecnología', 'de primer nivel'], body: 'Compramos en DSP de primer nivel según mercado e inventario, verificamos con terceros y medimos en tu propio stack. La tecnología se elige por campaña; cuentas y datos quedan a tu <b>nombre</b>.' });
  const NG = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-12_brochure-efeonce-360/native-growth/logos';
  const tileImg = (src, name) => `<div style="display:flex;align-items:center;gap:12px;height:52px;padding:0 16px 0 8px;border-radius:14px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.16)"><div style="width:38px;height:38px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center"><img src="${src}" style="max-width:26px;max-height:24px"></div><span style="font-family:${ST};font-size:15px;font-weight:600;color:#fff;white-space:nowrap">${name}</span></div>`;
  const tileTxt = (mark, name) => `<div style="display:flex;align-items:center;gap:12px;height:52px;padding:0 16px 0 8px;border-radius:14px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.16)"><div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-family:${ID};font-size:16px;font-weight:760;color:#fff">${mark}</div><span style="font-family:${ST};font-size:15px;font-weight:600;color:#fff;white-space:nowrap">${name}</span></div>`;
  const layers = [
    ['01', 'Compra programática', 'DSP según mercado e inventario', [tileTxt(icon('medios', 22), 'Basis'), tileImg(`${PLAT}/google-isotype.svg`, 'Display &amp; Video 360'), tileTxt(icon('objetivo', 22), 'The Trade Desk')], true],
    ['02', 'Verificación', 'Seguridad de marca, fraude y visibilidad', [tileTxt(icon('seguridad', 22), 'IAS'), tileTxt(icon('checklist', 22), 'DoubleVerify')]],
    ['03', 'Medición', 'El mismo evento en cada herramienta', [tileImg(`${PLAT}/google-analytics-isotype.svg`, 'Google Analytics 4'), tileImg(`${NG}/google-tag-manager.svg`, 'Tag Manager server-side')]],
    ['04', 'Señal y CRM', 'Conversiones de vuelta a cada plataforma', [tileImg(`${LOGOS}/axis/hubspot-isotype.svg`, 'HubSpot'), tileImg(`${NG}/salesforce.svg`, 'Salesforce')]],
    ['05', 'Reportes', 'Lectura mensual lista para el comité', [`<div style="display:flex;align-items:center;height:52px;padding:0 18px;border-radius:14px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.16)"><img src="file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/insights-lockup-negative.svg" style="height:26px"></div>`]]
  ];
  const x0 = 880, y0 = 130, lw = 960, lh = 128, gap = 22;
  layers.forEach(([n, t, d, tiles, hot], i) => {
    const x = x0 + i * 0, y = y0 + i * (lh + gap);
    inner += glass(x, y, lw, lh, 22, hot ? `border-color:${ACC};box-shadow:0 0 50px rgba(248,57,2,0.16),0 30px 80px rgba(0,0,0,0.55)` : '');
    inner += `<div style="position:absolute;left:${x + 28}px;top:${y + 26}px;width:330px"><div style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${n}</div><div style="margin-top:4px;font-family:${ID};font-size:30px;font-weight:760;letter-spacing:-0.025em;line-height:1;color:#fff">${t}</div><div style="margin-top:6px;font-family:${ST};font-size:15px;font-weight:300;color:${SOFT}">${d}</div></div>`;
    inner += `<div style="position:absolute;left:${x + 340}px;top:${y + 38}px;display:flex;gap:10px">${tiles.join('')}</div>`;
  });
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M${x0 - 24} ${y0 + 20} L ${x0 - 24} ${y0 + 4 * (lh + gap) + lh - 20}" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2"/><path d="M${x0 - 24} ${y0 + 20} L ${x0 - 24} ${y0 + lh - 20}" stroke="${ACC}" stroke-width="3" stroke-linecap="round"/><circle cx="${x0 - 24}" cy="${y0 + 20}" r="8" fill="${ACC}"/></svg>`;
  inner += `<div style="position:absolute;left:${x0}px;top:${y0 + 5 * (lh + gap) + 2}px;width:${lw}px;font-family:${ST};font-size:15px;color:${MUTE}">La tecnología se confirma por campaña y mercado. Cada proveedor opera con su contrato; no es una alianza ni una certificación de Efeonce.</div>`;
  inner += facts([['seguridad', 'Tus cuentas', 'Siempre a tu nombre'], ['checklist', 'Verificación', 'De terceros, en cada campaña'], ['integracion', 'Tus datos', 'Viajan con consentimiento']], 140, 860, 230);
  slides['T-tecnologia'] = page(inner, 1360, 480);
}


// AT · ¿Le creo a cada plataforma? A tu CRM. (atribución deduplicada; datos ilustrativos)
{
  let inner = voice({ eyebrow: 'Performance · Atribución', question: '¿Le creo a cada plataforma?', answer: ['A tu CRM'], body: 'Cada plataforma se atribuye la misma venta. Cruzamos sus reportes con tu CRM, quitamos los duplicados y leemos un solo costo por venta: el que de verdad <b>pagaste</b>.' });
  const src = [['meta-isotype-negative', 'Meta', 120, 0.44], ['google-isotype', 'Google', 110, 0.41], ['tiktok-isotype-negative', 'TikTok', 40, 0.15]];
  const cx = 1420, cy = 400;
  src.forEach(([f, n, v], i) => {
    const y = 150 + i * 170;
    inner += glass(880, y, 300, 130, 20) + `<div style="position:absolute;left:904px;top:${y + 22}px;display:flex;align-items:center;gap:12px"><div style="width:44px;display:flex;justify-content:center">${iso(f, 32)}</div><div style="font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">Según ${n}</div></div><div style="position:absolute;left:904px;top:${y + 64}px;font-family:${ID};font-size:48px;font-weight:760;letter-spacing:-0.03em;line-height:1;color:#fff">${v}<span style="font-family:${ST};font-size:18px;font-weight:400;color:${SOFT};letter-spacing:0;margin-left:10px">ventas</span></div>`;
  });
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><defs><radialGradient id="atc" cx="${cx}" cy="${cy}" r="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3d86d8" stop-opacity="0.5"/><stop offset="1" stop-color="#3d86d8" stop-opacity="0"/></radialGradient></defs>
${src.map((_, i) => { const y = 215 + i * 170, a = Math.PI - (i - 1) * 0.5, ex = cx + 110 * Math.cos(a), ey = cy + 110 * Math.sin(a); return `<path d="M1180 ${y} C 1240 ${y}, ${ex - 60} ${ey}, ${ex} ${ey}" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" fill="none"/>`; }).join('')}
<circle cx="${cx}" cy="${cy}" r="170" fill="url(#atc)"/><circle cx="${cx}" cy="${cy}" r="110" fill="none" stroke="${ACC}" stroke-width="3"/><circle cx="${cx + 78}" cy="${cy - 78}" r="9" fill="${ACC}"/>
<path d="M${cx + 110} ${cy} L 1556 ${cy}" stroke="#ffffff" stroke-opacity="0.7" stroke-width="2.5"/><path d="M1548 ${cy - 7} L1558 ${cy} L1548 ${cy + 7}" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
  inner += `<div style="position:absolute;left:${cx - 95}px;top:${cy - 40}px;width:190px;text-align:center"><div style="width:34px;height:34px;margin:0 auto">${icon('crm', 34)}</div><div style="margin-top:6px;font-family:${ID};font-size:22px;font-weight:760;line-height:1.05;color:#fff">Cruza con tu CRM</div></div>`;
  // resultado real
  inner += glass(1560, 250, 300, 300, 22, `border-color:${ACC};box-shadow:0 0 60px rgba(248,57,2,0.18),0 30px 80px rgba(0,0,0,0.55)`);
  inner += `<div style="position:absolute;left:1586px;top:276px;width:250px"><div style="font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">En tu CRM</div><div style="margin-top:8px;font-family:${ID};font-size:86px;font-weight:760;letter-spacing:-0.04em;line-height:0.95;color:#fff">150</div><div style="font-family:${ST};font-size:18px;color:${SOFT}">ventas, sin duplicados</div>
<div style="margin-top:22px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.18);font-family:${ST};font-size:14px;color:${MUTE}">Costo por venta real</div><div style="font-family:${ID};font-size:40px;font-weight:760;color:#fff">US$ 100</div></div>`;
  // barra comparativa
  const bx = 880, bw = 980, sc = bw / 270;
  let x = bx;
  inner += `<div style="position:absolute;left:${bx}px;top:690px;font-family:${ST};font-size:15px;font-weight:600;color:#fff">Suman las plataformas · <span style="font-weight:400;color:${SOFT}">270 ventas · US$ 56 por venta</span></div>`;
  src.forEach(([f, n, v], i) => { const w = v * sc; inner += `<div style="position:absolute;left:${x}px;top:720px;width:${w - 4}px;height:38px;border-radius:8px;background:${['#7fb6ff', '#4f87c9', '#2f5f9a'][i]};display:flex;align-items:center;padding-left:12px;box-sizing:border-box;font-family:${ST};font-size:14px;font-weight:600;color:#001a33">${n} ${v}</div>`; x += w; });
  inner += `<div style="position:absolute;left:${bx}px;top:782px;font-family:${ST};font-size:15px;font-weight:600;color:#fff">Pasó en tu CRM · <span style="font-weight:400;color:${SOFT}">150 ventas · US$ 100 por venta</span></div>`;
  inner += `<div style="position:absolute;left:${bx}px;top:812px;width:${150 * sc}px;height:38px;border-radius:8px;background:#fff;box-shadow:0 0 30px rgba(255,255,255,0.25)"></div>`;
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M${bx + 150 * sc + 8} 831 L ${bx + bw - 4} 831" stroke="${ACC}" stroke-width="2.5" stroke-dasharray="6 6"/><path d="M${bx + bw - 4} 818 L ${bx + bw - 4} 844" stroke="${ACC}" stroke-width="2.5"/></svg>`;
  inner += `<div style="position:absolute;left:${bx + 150 * sc + 20}px;top:788px;width:${bw - 150 * sc - 30}px;text-align:center;font-family:${ID};font-size:24px;font-weight:760;color:#fff">120 ventas contadas dos veces</div>`;
  inner += `<div style="position:absolute;left:${bx}px;top:872px;font-family:${ST};font-size:14px;color:${MUTE}">Ejemplo ilustrativo con una inversión de US$ 15.000. Cada plataforma usa su propia ventana y su propio modelo de atribución.</div>`;
  inner += facts([['crm', 'La fuente', 'Tu CRM, no el panel de cada red'], ['checklist', 'Sin duplicar', 'Cada venta cuenta una vez'], ['medicion', 'Se lee', 'Costo por venta real del mix']], 140, 860, 230);
  slides['AT-atribucion'] = page(inner, 1360, 460);
}


// ───────── HILO CONDUCTOR: mapa del recorrido + aperturas de capítulo ─────────
// Seis estaciones en una órbita; la apertura de cada capítulo enciende la suya (las pasadas quedan en blanco, las que vienen, tenues).
const CAPS = [
  ['01', 'El cambio', '¿Qué cambió en la pauta?', 'Las reglas', 'La automatización, la privacidad y la IA movieron cómo se compra y cómo se mide. Por eso cambiamos cómo se opera.'],
  ['02', 'Plataformas', '¿Dónde está mi cliente?', 'Donde compra', 'Search, social, video y anuncios en IA: cada plataforma con su señal, su creatividad y su forma de leer el resultado.'],
  ['03', 'Creatividad', '¿Qué le muestro?', 'Lo que rinde', 'Una idea adaptada a cada formato, probada primero en orgánico y escalada con pauta.'],
  ['04', 'Programática', '¿Hasta dónde llego?', 'A todas', 'Display, video, TV conectada, audio, la calle, los juegos y las tiendas, comprados por audiencia y con seguridad de marca.'],
  ['05', 'Medición', '¿Cómo sé si funcionó?', 'Medido', 'Del tag a tu CRM: un solo número en el que confiar y un reporte que llega listo.'],
  ['06', 'Trabajar juntos', '¿Cómo es trabajar con ustedes?', 'En vivo', 'Quién opera tu cuenta, a quién ya acompañamos, con quién somos partners y cómo empezamos.']
];
const orbitMap = (cur, cx = 1390, cy = 540, rx = 370, ry = 310) => {
  const ang = (i) => (-90 + i * 60) * Math.PI / 180;
  let svg = `<svg style="position:absolute;inset:0" width="1920" height="1080"><defs><radialGradient id="omc" cx="${cx}" cy="${cy}" r="320" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3d86d8" stop-opacity="0.35"/><stop offset="1" stop-color="#3d86d8" stop-opacity="0"/></radialGradient><filter id="omg"><feGaussianBlur stdDeviation="6"/></filter></defs>
<ellipse cx="${cx}" cy="${cy}" rx="${rx - 60}" ry="${ry - 60}" fill="url(#omc)"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#ffffff" stroke-opacity="0.32" stroke-width="2"/>`;
  if (cur > 0) { const a0 = ang(0), a1 = ang(cur - 1); const large = (cur - 1) * 60 > 180 ? 1 : 0; svg += `<path d="M${cx + rx * Math.cos(a0)} ${cy + ry * Math.sin(a0)} A ${rx} ${ry} 0 ${large} 1 ${cx + rx * Math.cos(a1)} ${cy + ry * Math.sin(a1)}" stroke="${ACC}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M${cx + rx * Math.cos(a0)} ${cy + ry * Math.sin(a0)} A ${rx} ${ry} 0 ${large} 1 ${cx + rx * Math.cos(a1)} ${cy + ry * Math.sin(a1)}" stroke="${ACC}" stroke-width="10" fill="none" opacity="0.3" filter="url(#omg)"/>`; }
  svg += `</svg>`;
  let html = svg;
  CAPS.forEach(([n, t], i) => {
    const x = cx + rx * Math.cos(ang(i)), y = cy + ry * Math.sin(ang(i));
    const st = cur === 0 ? 'all' : i + 1 < cur ? 'past' : i + 1 === cur ? 'now' : 'next';
    const r = st === 'now' ? 30 : 22;
    const dot = st === 'now' ? `background:${ACC};box-shadow:0 0 40px rgba(248,57,2,0.55)` : st === 'past' || st === 'all' ? 'background:#ffffff' : 'background:#0b2a4a;border:2px solid rgba(255,255,255,0.4)';
    html += `<div style="position:absolute;left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;box-sizing:border-box;${dot}"></div>`;
    const right = Math.cos(ang(i)) > 0.2, left = Math.cos(ang(i)) < -0.2;
    const lx = right ? x - r - 14 - 220 : left ? x + r + 14 : x - 120, ly = Math.abs(Math.cos(ang(i))) <= 0.2 ? (Math.sin(ang(i)) < 0 ? y - r - 70 : y + r + 12) : y - 30;
    const op = st === 'next' ? 0.45 : 1;
    html += `<div style="position:absolute;left:${lx}px;top:${ly}px;width:${right || left ? 220 : 240}px;text-align:${right ? 'right' : left ? 'left' : 'center'};opacity:${op}"><div style="font-family:${ST};font-size:15px;font-weight:600;letter-spacing:0.14em;color:${st === 'now' ? '#fff' : MUTE}">${n}</div><div style="font-family:${ID};font-size:${st === 'now' ? 34 : 26}px;font-weight:760;letter-spacing:-0.02em;line-height:1.05;color:#fff">${t}</div></div>`;
  });
  return html;
};
// mapa del recorrido (después de la portada)
{
  let inner = voice({ eyebrow: 'El recorrido', question: '¿Qué vamos a ver?', answer: ['Seis', 'preguntas'], body: 'Las mismas que te haces antes de mover un peso de tu pauta, en el orden en que te las haces. Cada capítulo responde una y abre la <b>siguiente</b>.' });
  inner += orbitMap(0);
  inner += `<div style="position:absolute;left:1390px;top:540px;transform:translate(-50%,-50%);text-align:center;width:230px"><div style="font-family:${ID};font-size:28px;font-weight:760;line-height:1.1;color:#fff">Tu inversión,<br>donde rinde</div></div>`;
  slides['R0-recorrido'] = page(inner, 1390, 540);
}
// aperturas de capítulo
CAPS.forEach(([n, t, q, a, body], i) => {
  let inner = voice({ eyebrow: `Capítulo ${n} · ${t}`, question: q, answer: a.length > 9 ? [a.slice(0, a.lastIndexOf(' ')), a.slice(a.lastIndexOf(' ') + 1)] : [a], body });
  inner += orbitMap(i + 1);
  inner += `<div style="position:absolute;left:1390px;top:540px;transform:translate(-50%,-50%);text-align:center;width:230px"><div style="font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">Capítulo ${n}</div><div style="margin-top:6px;font-family:${ID};font-size:40px;font-weight:760;letter-spacing:-0.03em;line-height:1.05;color:#fff">${t}</div></div>`;
  slides[`R${i + 1}-capitulo`] = page(inner, 1390, 540);
});


// TC · ¿De quién son las cuentas? Tuyas. (requisito 1 de intake de la ficha de Performance)
{
  let inner = voice({ eyebrow: 'Trabajar juntos · Tus cuentas', question: '¿De quién son las cuentas?', answer: ['Tuyas'], body: 'Operamos en tus cuentas publicitarias, tus píxeles, tus audiencias y tu CRM, con acceso de partner. Si un día te vas, te quedas con <b>todo</b>: campañas, datos y lo aprendido.' });
  const acc = [['google-ads-isotype', 'Google Ads', 'Cuenta y conversiones'], ['meta-isotype-negative', 'Meta', 'Business Manager y dataset'], ['tiktok-isotype-negative', 'TikTok', 'Ads Manager y eventos'], ['linkedin-isotype-negative', 'LinkedIn', 'Campaign Manager'], ['google-analytics-isotype', 'Google Analytics 4', 'Propiedad y eventos'], [null, 'Tu CRM', 'HubSpot o Salesforce']];
  acc.forEach(([f, n, d], i) => {
    const x = 880 + (i % 2) * 490, y = 140 + Math.floor(i / 2) * 210;
    inner += glass(x, y, 470, 180, 22, i === 0 ? `border-color:${ACC};box-shadow:0 0 50px rgba(248,57,2,0.16),0 30px 80px rgba(0,0,0,0.55)` : '');
    inner += `<div style="position:absolute;left:${x + 26}px;top:${y + 24}px;display:flex;align-items:center;gap:14px"><div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center">${f ? iso(f, 38) : `<span style="width:38px;height:38px">${icon('crm', 38)}</span>`}</div><div><div style="font-family:${ID};font-size:26px;font-weight:760;letter-spacing:-0.02em;color:#fff">${n}</div><div style="font-family:${ST};font-size:15px;color:${SOFT}">${d}</div></div></div>
<div style="position:absolute;left:${x + 26}px;top:${y + 102}px;width:418px;display:flex;flex-direction:column;gap:10px;font-family:${ST};font-size:15px">
<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:${MUTE}">Propietario</span><span style="font-weight:600;color:#001a33;background:#fff;padding:3px 12px;border-radius:999px">Tu empresa</span></div>
<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:${MUTE}">Efeonce</span><span style="font-weight:600;color:#fff;border:1.5px solid rgba(255,255,255,0.6);padding:2px 12px;border-radius:999px">Acceso de partner</span></div></div>`;
  });
  inner += `<div style="position:absolute;left:880px;top:780px;width:960px;font-family:${ST};font-size:15px;color:${MUTE}">No operamos desde cuentas propiedad de Efeonce. Los datos propios se suben sólo con consentimiento y acuerdo de tratamiento revisados.</div>`;
  inner += facts([['seguridad', 'Propiedad', 'Cuentas, píxeles y audiencias'], ['base-de-datos', 'Tus datos', 'Con consentimiento documentado'], ['republicar', 'Si te vas', 'Te quedas con todo']], 140, 860, 230);
  slides['TC-cuentas'] = page(inner, 1360, 470);
}


// ───────── CAPÍTULO 06 · TRABAJAR JUNTOS ─────────
const CL = 'file:///Users/jreye/Documents/greenhouse-eo/src/lib/artifact-composer/catalogs/deck-axis/assets/clients';
const AXA = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets';
// X1 · Experiencia: lo que vives (fichas de Performance: diagnóstico 2–4 sem, activación 8–12 sem, operación mensual con gobierno trimestral)
{
  let inner = voice({ eyebrow: 'Trabajar juntos · Lo que vives', question: '¿Qué vivo cada mes?', answer: ['Un ritmo'], body: 'Sabes qué pasa con tu pauta cada semana, recibes la lectura cada mes y decides el siguiente trimestre con nosotros. Las decisiones grandes son <b>tuyas</b>.' });
  const st = [['01', 'Diagnóstico', '2 a 4 semanas', 'Revisamos inversión, cuentas, señal y creatividad. Sales con un plan de 90 días.', 'checklist'],
    ['02', 'Activación', '8 a 12 semanas', 'Ordenamos la medición, lanzamos campañas y probamos las primeras piezas.', 'enviar'],
    ['03', 'Operación', 'Cada semana', 'Presupuesto, ritmo de gasto, pruebas creativas y ajustes, con tu aprobación en lo grande.', 'reloj'],
    ['04', 'Lectura', 'Cada mes', 'Un reporte ejecutivo con lo que movió el negocio y lo que haremos distinto.', 'informe'],
    ['05', 'Gobierno', 'Cada trimestre', 'Revisamos objetivos, mix e inversión contigo, con la evidencia sobre la mesa.', 'reunion']];
  const x0 = 880, w = 178, gap = 18, y = 230;
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M${x0 + w / 2} ${y - 40} L ${x0 + 4 * (w + gap) + w / 2} ${y - 40}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/><path d="M${x0 + w / 2} ${y - 40} L ${x0 + 2 * (w + gap) + w / 2} ${y - 40}" stroke="${ACC}" stroke-width="3"/><path d="M${x0 + 2 * (w + gap) + w / 2} ${y - 40} m -46 0 a 46 30 0 1 0 92 0 a 46 30 0 1 0 -92 0" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" fill="none" stroke-dasharray="4 6"/></svg>`;
  st.forEach(([n, t, c, d, g], i) => {
    const x = x0 + i * (w + gap), hot = i === 2;
    inner += `<div style="position:absolute;left:${x + w / 2 - 9}px;top:${y - 49}px;width:18px;height:18px;border-radius:50%;background:${hot ? ACC : '#fff'};${hot ? 'box-shadow:0 0 24px rgba(248,57,2,0.6)' : ''}"></div>`;
    inner += glass(x, y, w, 470, 20, hot ? `border-color:${ACC};box-shadow:0 0 50px rgba(248,57,2,0.16),0 30px 80px rgba(0,0,0,0.55)` : '');
    inner += `<div style="position:absolute;left:${x + 20}px;top:${y + 24}px;width:${w - 40}px"><div style="width:34px;height:34px">${icon(g, 34)}</div><div style="margin-top:18px;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;color:${MUTE}">${n}</div><div style="margin-top:4px;font-family:${ID};font-size:28px;font-weight:760;letter-spacing:-0.02em;line-height:1;color:#fff">${t}</div><div style="margin-top:10px;font-family:${ST};font-size:15px;font-weight:600;color:#fff">${c}</div><div style="margin-top:12px;font-family:${ST};font-size:15px;font-weight:300;line-height:1.4;color:${SOFT}">${d}</div></div>`;
  });
  inner += `<div style="position:absolute;left:${x0 + 2 * (w + gap) - 20}px;top:${y - 100}px;width:${3 * w + 2 * gap + 40}px;text-align:center;font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#fff">Se repite cada mes</div>`;
  inner += facts([['reunion', 'Un interlocutor', 'Una persona responsable de tu cuenta'], ['seguridad', 'Tú apruebas', 'Presupuesto, piezas y cambios grandes'], ['medicion', 'Sin letra chica', 'Lo que no se mide, no se promete']], 140, 860, 230);
  slides['X1-experiencia'] = page(inner, 1360, 470);
}
// X2 · Equipo: roles (sin nombres; el elenco ficticio nunca es equipo real)
{
  let inner = voice({ eyebrow: 'Trabajar juntos · Equipo', question: '¿Quién opera mi pauta?', answer: ['Un squad'], body: 'Personas con oficio en medios, datos y creatividad trabajan sobre tu cuenta, con agentes que leen las plataformas y un humano que decide cada <b>cambio</b>.' });
  const cx = 1360, cy = 470;
  const roles = [['objetivo', 'Estrategia de medios', 'Plan, mix e inversión'], ['medios', 'Operación de campañas', 'Search, social y programática'], ['medicion', 'Datos y medición', 'Tags, señal, tableros y lectura'], ['contenido', 'Creatividad de performance', 'Piezas, variantes y pruebas'], ['crm', 'CRM y señal de negocio', 'HubSpot o Salesforce, de vuelta a la pauta'], ['ia', 'Agentes', 'Leen y proponen; una persona confirma']];
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><defs><radialGradient id="eqc" cx="${cx}" cy="${cy}" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3d86d8" stop-opacity="0.4"/><stop offset="1" stop-color="#3d86d8" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="300" fill="url(#eqc)"/><ellipse cx="${cx}" cy="${cy}" rx="330" ry="250" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="92" fill="none" stroke="${ACC}" stroke-width="3"/><circle cx="${cx + 65}" cy="${cy - 65}" r="8" fill="${ACC}"/></svg>`;
  inner += `<div style="position:absolute;left:${cx - 85}px;top:${cy - 40}px;width:170px;text-align:center"><div style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">Tu marca</div><div style="margin-top:4px;font-family:${ID};font-size:22px;font-weight:760;line-height:1.1;color:#fff">Responsable de cuenta</div></div>`;
  roles.forEach(([g, t, d], i) => {
    const a = (-90 + i * 60) * Math.PI / 180, x = cx + 330 * Math.cos(a), y = cy + 250 * Math.sin(a);
    inner += glass(x - 135, y - 46, 270, 92, 18, i === 5 ? 'border-style:dashed' : '');
    inner += `<div style="position:absolute;left:${x - 135}px;top:${y - 46}px;width:270px;height:92px;display:flex;align-items:center;gap:14px;padding:0 18px;box-sizing:border-box"><span style="flex:none;width:32px;height:32px">${icon(g, 32)}</span><div><div style="font-family:${ID};font-size:20px;font-weight:760;line-height:1.05;color:#fff">${t}</div><div style="margin-top:3px;font-family:${ST};font-size:13px;color:${SOFT}">${d}</div></div></div>`;
  });
  inner += facts([['reunion', 'Un interlocutor', 'Tu responsable de cuenta'], ['talent', 'Con oficio', 'Medios, datos y creatividad'], ['ia', 'Con agentes', 'Proponen; una persona decide']], 140, 860, 230);
  slides['X2-equipo'] = page(inner, 1360, 470);
}
// X3 · Casos: mismo esquema que la lámina de caso aprobada del deck de contenidos (C12, 2026-10-10), en oscuro y línea Voice.
// Sky: autorizado por el operador; avión = montaje del PNG oficial sobre cielo generado (C12). Bresler: cifra del caso publicado.
{
  const AV = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-09_deck-contenidos/sky/caso-sky-avion.png';
  let inner = `<div style="position:absolute;left:880px;top:0;width:1040px;height:1080px;background:#000 url(${AV}) -60px -300px/1150px auto no-repeat"></div>
<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M0 0 L 760 0 C 940 0, 1000 160, 1000 330 L 1000 1080 L 0 1080 Z" fill="${BG}"/><path d="M760 0 C 940 0, 1000 160, 1000 330 L 1000 1080" fill="none" stroke="${ACC}" stroke-width="3"/></svg>`;
  inner += `<div style="position:absolute;left:140px;top:110px;display:flex;align-items:center;gap:22px"><img src="${CL}/sky.svg" style="height:58px"><span style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">Caso · Travel Sale 2026</span></div>`;
  inner += `<div style="position:absolute;left:140px;top:212px;display:flex;align-items:center;gap:16px;font-family:${ST};font-size:40px;font-weight:300;color:#fff"><span style="flex:none;display:inline-block;width:18px;height:18px;border-radius:50%;border:3px solid ${ACC}"></span>¿Lo han hecho antes?</div>`;
  inner += `<div style="position:absolute;left:136px;top:276px;font-family:${ID};font-size:118px;font-weight:760;letter-spacing:-0.045em;line-height:0.92;color:#fff;white-space:nowrap">Sí, con Sky<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span></div>`;
  const F = [['10 min', 'para cambiar precios en 27 piezas'], ['5', 'mercados en la misma campaña'], ['178', 'piezas, 66 hechas por Efeonce'], ['−25 %', 'tiempo total de campaña']];
  F.forEach(([v, l], i) => { const x = 140 + (i % 2) * 400, y = 470 + Math.floor(i / 2) * 250; inner += `<div style="position:absolute;left:${x}px;top:${y}px;width:360px;border-top:1px solid rgba(255,255,255,0.25);padding-top:18px"><div style="font-family:${ID};font-size:84px;font-weight:300;letter-spacing:-0.03em;line-height:1;color:#fff">${v}</div><div style="margin-top:10px;font-family:${ST};font-size:20px;color:${SOFT}">${l}</div></div>`; });
  // selección AXIS sobre la cifra clave
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><rect x="124" y="480" width="370" height="148" fill="none" stroke="#a6cdf5" stroke-width="2" stroke-dasharray="7 6"/>${[[124, 480], [309, 480], [494, 480], [124, 554], [494, 554], [124, 628], [309, 628], [494, 628]].map(([x, y]) => `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" fill="#fff" stroke="#a6cdf5" stroke-width="2"/>`).join('')}<path d="M500 636 L 548 655 L 528 662 L 521 682 Z" fill="#5d50ff" transform="translate(0 -8)"/></svg>`;
  inner += `<div style="position:absolute;left:550px;top:652px;padding:6px 16px;border-radius:12px;background:#5d50ff;font-family:${ID};font-size:22px;font-weight:700;color:#fff">Performance</div>`;
  inner += `<div style="position:absolute;left:140px;top:930px;width:820px;font-family:${ST};font-size:14px;color:${MUTE}">Fuente: caso Travel Sale de Sky Airline, marzo de 2026.</div>`;
  // Bresler, discreto sobre la foto
  inner += `<div style="position:absolute;left:1500px;top:830px;width:360px;padding:20px 22px;box-sizing:border-box;border-radius:22px;background:rgba(0,26,51,0.82);border:1.5px solid rgba(255,255,255,0.3);box-shadow:0 30px 70px rgba(0,0,0,0.5)"><div style="display:flex;align-items:center;gap:14px"><div style="height:40px;padding:0 12px;border-radius:10px;background:#fff;display:flex;align-items:center"><img src="${CL}/bresler.svg" style="height:24px"></div><span style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE}">También</span></div><div style="margin-top:10px;display:flex;align-items:baseline;gap:12px"><span style="font-family:${ID};font-size:52px;font-weight:760;letter-spacing:-0.04em;color:#fff;white-space:nowrap">+180 %</span><span style="font-family:${ST};font-size:16px;color:#fff">en ventas digitales</span></div><div style="margin-top:2px;font-family:${ST};font-size:12px;color:${MUTE}">Caso publicado de Bresler</div></div>`;
  inner += `<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">`;
  slides['X3-casos'] = `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}</style></head><body><div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${BG}">${inner}</div></body></html>`;
}
// X4 · Clientes, a sangre al estilo de la franja de canales de basis.com: foto arquitectónica, logos en blanco monocromo, gran cifra.
// Logos del catálogo (autorización pendiente, TASK-1937); «+120 empresas en 4 países» = proof point del context pack (09_marca-agencia).
{
  const BGI = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-13_brochure-agencia-medios/marca-ejemplo/torres-fondo.png';
  const L = [['sky-on-dark.svg', 76], ['berel.svg', 74], ['bresler.svg', 54], ['carozzi.svg', 44], ['aguas-andinas.svg', 62], ['anam.svg', 48], ['marca-chile.svg', 70]];
  let inner = `<div style="position:absolute;inset:0;background:url(${BGI}) 50% 50%/cover"></div><div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 46%,rgba(0,26,51,0.55),rgba(0,26,51,0.88) 70%,#001a33 100%)"></div>`;
  inner += `<div style="position:absolute;left:0;top:96px;width:1920px;text-align:center;font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">Trabajar juntos · Clientes</div>`;
  inner += `<div style="position:absolute;left:0;top:170px;width:1920px;text-align:center;font-family:${ID};font-size:170px;font-weight:760;letter-spacing:-0.05em;line-height:1;color:#fff">Crecemos con líderes<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span></div>`;
  const row = (items, y) => { const w = 300, x0 = (1920 - items.length * w) / 2; return items.map(([f, h], i) => `<div style="position:absolute;left:${x0 + i * w}px;top:${y}px;width:${w}px;height:120px;display:flex;align-items:center;justify-content:center"><img src="${f.startsWith('aguas') ? 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-13_brochure-agencia-medios/logos/aguas-andinas-negativo.svg' : `${CL}/${f}`}" style="${f.startsWith('sky') ? 'height:64px;width:auto;' : ''}max-width:220px;max-height:${h}px;opacity:0.94;filter:${f.startsWith('aguas') ? '' : 'brightness(0) invert(1)'} drop-shadow(0 0 18px rgba(127,182,255,0.45))"></div>`).join(''); };
  inner += row(L.slice(0, 4), 470) + row(L.slice(4), 610);
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M560 790 Q 960 830 1360 790" stroke="${ACC}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="960" cy="810" r="8" fill="${ACC}"/></svg>`;
  inner += `<div style="position:absolute;left:0;top:846px;width:1920px;text-align:center"><span style="font-family:${ID};font-size:72px;font-weight:760;letter-spacing:-0.04em;color:#fff">+120</span><span style="margin-left:18px;font-family:${ST};font-size:26px;font-weight:300;color:#fff">empresas han crecido con Efeonce</span></div>`;
  inner += `<img src="${BUB}" style="position:absolute;left:879px;top:990px;width:162px;height:38px">`;
  slides['X4-clientes'] = `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}</style></head><body><div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${BG}">${inner}</div></body></html>`;
}
// X5 · Partners. Registro de partnerships: HubSpot Gold (readback 2026-10-06) y Salesforce Partner (autorizado 2026-09-29) como protagonistas;
// declarados por el operador: Adobe, AWS, Microsoft AI Cloud, Anthropic (Claude), OpenAI, BytePlus; Google Cloud = «registrado» (no claim pleno).
// Sprocket 3D: autorizado por HubSpot para piezas externas (2026-10-14), desde el kit, sin modificar.
{
  let inner = statement({ eyebrow: 'Trabajar juntos · Partners', lines: ['Partners', 'oficiales'], body: 'De los CRM donde vive tu venta y de las plataformas de nube, creatividad e IA con las que construimos tu <b>operación</b>.' });
  const SP = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-17_sprocket-3d/final/efeonce-sprocket-hubspot-3d-02-tres-cuartos-izquierda-1x1-1600x1600-v01-transparente.png';
  const SF = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-12_brochure-efeonce-360/native-growth/logos/salesforce.svg';
  const PL = 'file:///Users/jreye/Documents/greenhouse-eo/public/images/logos/partners';
  const hx = 1100, sx = 1640, cy = 320;
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><defs>
<radialGradient id="hg" cx="${hx}" cy="${cy}" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff7a59" stop-opacity="0.42"/><stop offset="0.5" stop-color="#ff7a59" stop-opacity="0.1"/><stop offset="1" stop-color="#ff7a59" stop-opacity="0"/></radialGradient>
<radialGradient id="sg" cx="${sx}" cy="${cy}" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1798c1" stop-opacity="0.5"/><stop offset="0.5" stop-color="#1798c1" stop-opacity="0.12"/><stop offset="1" stop-color="#1798c1" stop-opacity="0"/></radialGradient>
<filter id="pgl"><feGaussianBlur stdDeviation="6"/></filter></defs>
<circle cx="${hx}" cy="${cy}" r="260" fill="url(#hg)"/><circle cx="${sx}" cy="${cy}" r="260" fill="url(#sg)"/>
<ellipse cx="1370" cy="580" rx="560" ry="390" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2"/>
<path d="M${hx + 130} ${cy - 30} Q 1370 ${cy - 120} ${sx - 140} ${cy - 30}" stroke="${ACC}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M${hx + 130} ${cy - 30} Q 1370 ${cy - 120} ${sx - 140} ${cy - 30}" stroke="${ACC}" stroke-width="12" fill="none" opacity="0.3" filter="url(#pgl)"/><circle cx="1370" cy="${cy - 75}" r="9" fill="${ACC}"/></svg>`;
  inner += `<img src="${SP}" style="position:absolute;left:${hx - 165}px;top:${cy - 180}px;width:330px;height:330px;filter:drop-shadow(0 30px 50px rgba(0,0,0,0.55))">`;
  inner += `<div style="position:absolute;left:${sx - 150}px;top:${cy - 110}px;width:300px;height:220px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 60px rgba(23,152,193,0.55)) drop-shadow(0 30px 40px rgba(0,0,0,0.5))"><img src="${SF}" style="width:270px"></div>`;
  inner += `<div style="position:absolute;left:1240px;top:${cy - 150}px;width:260px;text-align:center;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#fff">Tu señal de venta</div>`;
  const cap = (x, t, d) => `<div style="position:absolute;left:${x - 200}px;top:${cy + 150}px;width:400px;text-align:center"><div style="font-family:${ID};font-size:26px;font-weight:760;letter-spacing:-0.02em;color:#fff">${t}</div><div style="margin-top:2px;font-family:${ST};font-size:15px;color:${SOFT}">${d}</div></div>`;
  inner += cap(hx, 'HubSpot Solutions Partner', 'Nivel Gold') + cap(sx, 'Salesforce Partner', 'Partner oficial');
  // constelación de partners de nube, creatividad e IA
  const P = [['amazon_web_services_logo.svg', 'Nube', 46], ['google_cloud_logo.svg', 'Nube · registrado', 34], ['microsoft_logo_2012.svg', 'Nube e IA', 34], ['adobe-logotype.svg', 'Creatividad', 34], ['claude-logotype.svg', 'IA', 36], ['openai_logo.svg', 'IA', 36], ['byteplus.png', 'IA y video', 34]];
  const tw = 136, tg = 12, tx0 = 880 + (980 - (7 * tw + 6 * tg)) / 2, ty = 700;
  P.forEach(([f, t, h], i) => { const x = tx0 + i * (tw + tg); inner += `<div style="position:absolute;left:${x}px;top:${ty}px;width:${tw}px;height:96px;border-radius:16px;background:#fff;box-shadow:0 20px 50px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><img src="${PL}/${f}" style="max-width:${tw - 28}px;max-height:${h}px"></div><div style="position:absolute;left:${x}px;top:${ty + 104}px;width:${tw}px;text-align:center;font-family:${ST};font-size:13px;color:${SOFT}">${t}</div>`; });
  inner += `<div style="position:absolute;left:880px;top:${ty - 40}px;width:980px;text-align:center;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">Y partners de nube, creatividad e IA</div>`;
  inner += `<div style="position:absolute;left:880px;top:964px;width:980px;display:flex;align-items:center;justify-content:center;gap:18px"><span style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE};white-space:nowrap">Operamos en</span>${['google-ads-isotype', 'meta-isotype-negative', 'tiktok-isotype-negative', 'linkedin-isotype-negative', 'youtube-isotype', 'bing-isotype', 'x-isotype-negative'].map(f => iso(f, 24)).join('')}<span style="font-family:${ST};font-size:13px;color:${MUTE}">· plataformas, no alianzas</span></div>`;
  inner += facts([['crm', 'CRM', 'HubSpot Gold y Salesforce'], ['nube', 'Nube', 'AWS, Microsoft y Google Cloud'], ['ia', 'IA y creatividad', 'Claude, OpenAI, Adobe, BytePlus']], 140, 860, 230);
  slides['X5-partners'] = page(inner, 1360, 430);
}
// X6 · Mercados (países, sin ciudades ni oficinas)
{
  let inner = voice({ eyebrow: 'Trabajar juntos · Mercados', question: '¿Operan en mi país?', answer: ['En cinco'], body: 'Un solo equipo opera campañas en Chile, México, Colombia, Perú y Estados Unidos, con el contexto de cada mercado y una lectura <b>común</b>.' });
  const C = [['Chile'], ['México'], ['Colombia'], ['Perú'], ['Estados Unidos']];
  C.forEach(([n], i) => { const x = 880 + (i % 3) * 330, y = 200 + Math.floor(i / 3) * 230; inner += glass(x, y, 310, 200, 24, i === 0 ? `border-color:${ACC};box-shadow:0 0 50px rgba(248,57,2,0.16),0 30px 80px rgba(0,0,0,0.55)` : '') + `<div style="position:absolute;left:${x + 28}px;top:${y + 28}px"><div style="width:34px;height:34px">${icon('ubicacion', 34)}</div><div style="margin-top:40px;font-family:${ID};font-size:36px;font-weight:760;letter-spacing:-0.03em;color:#fff">${n}</div></div>`; });
  inner += glass(1540, 430, 310, 200, 24, 'border-style:dashed') + `<div style="position:absolute;left:1568px;top:458px;width:260px"><div style="width:34px;height:34px">${icon('integracion', 34)}</div><div style="margin-top:22px;font-family:${ID};font-size:26px;font-weight:760;line-height:1.1;color:#fff">Un solo equipo y una sola lectura</div></div>`;
  inner += `<div style="position:absolute;left:880px;top:680px;width:960px;font-family:${ST};font-size:15px;color:${MUTE}">Mercados donde operamos campañas. No implica oficina ni entidad legal en cada país.</div>`;
  inner += facts([['ubicacion', 'Cinco países', 'Una operación'], ['medicion', 'Una lectura', 'El mismo tablero para todos'], ['contenido', 'Contexto local', 'Idioma, inventario y temporada']], 140, 860, 230);
  slides['X6-mercados'] = page(inner, 1360, 470);
}


// CB · Cómo se cobra (política aprobada 2026-10-09: fee propio y medios/costos externos separados; rebates siempre declarados por escrito)
{
  let inner = voice({ eyebrow: 'Trabajar juntos · Cómo se cobra', question: '¿Cómo pago medios y fee?', answer: ['Por', 'separado'], body: 'Tu inversión va a las plataformas al costo, con su factura a la vista. Nuestro fee es fijo y va aparte: no sube porque inviertas <b>más</b>.' });
  // dos carriles desde tu presupuesto
  const y0 = 170;
  inner += glass(880, y0, 280, 520, 24);
  inner += `<div style="position:absolute;left:906px;top:${y0 + 30}px;width:230px"><div style="width:36px;height:36px">${icon('finanzas', 36)}</div><div style="margin-top:20px;font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">Tu presupuesto</div><div style="margin-top:8px;font-family:${ID};font-size:40px;font-weight:760;letter-spacing:-0.03em;line-height:1;color:#fff">Se divide en dos</div><div style="margin-top:14px;font-family:${ST};font-size:16px;line-height:1.4;color:${SOFT}">Cada parte con su propia factura. Nunca se mezclan.</div></div>`;
  inner += `<div style="position:absolute;left:906px;top:${y0 + 300}px;width:228px;height:160px;display:flex;gap:8px"><div style="flex:4;border-radius:12px;background:linear-gradient(180deg,#ffffff,#cfe4fa);display:flex;align-items:flex-end;padding:10px;box-sizing:border-box;font-family:${ST};font-size:13px;font-weight:600;color:#001a33">Medios</div><div style="flex:1;border-radius:12px;border:2.5px solid ${ACC};display:flex;align-items:flex-end;justify-content:center;padding:10px 0;box-sizing:border-box;font-family:${ST};font-size:13px;font-weight:600;color:#fff">Fee</div></div><div style="position:absolute;left:906px;top:${y0 + 470}px;width:228px;font-family:${ST};font-size:12px;color:${MUTE}">Proporción ilustrativa</div>`;
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M1160 ${y0 + 200} C 1240 ${y0 + 200}, 1240 ${y0 + 110}, 1320 ${y0 + 110}" stroke="#ffffff" stroke-opacity="0.6" stroke-width="3" fill="none"/><path d="M1160 ${y0 + 320} C 1240 ${y0 + 320}, 1240 ${y0 + 410}, 1320 ${y0 + 410}" stroke="${ACC}" stroke-width="3" fill="none"/></svg>`;
  // carril medios
  inner += glass(1320, y0, 540, 230, 24);
  inner += `<div style="position:absolute;left:1350px;top:${y0 + 26}px;width:480px"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">01 · Tus medios</div><div style="display:flex;gap:10px">${['google-ads-isotype', 'meta-isotype-negative', 'tiktok-isotype-negative', 'linkedin-isotype-negative'].map(f => iso(f, 22)).join('')}</div></div>
<div style="margin-top:12px;font-family:${ID};font-size:44px;font-weight:760;letter-spacing:-0.03em;line-height:1;color:#fff">Al costo</div>
<div style="margin-top:12px;font-family:${ST};font-size:17px;line-height:1.4;color:${SOFT}">Lo que inviertes va a cada plataforma o proveedor de medios, sin recargo, y ves sus facturas.</div></div>`;
  // carril fee
  inner += glass(1320, y0 + 290, 540, 230, 24, `border-color:${ACC};box-shadow:0 0 50px rgba(248,57,2,0.16),0 30px 80px rgba(0,0,0,0.55)`);
  inner += `<div style="position:absolute;left:1350px;top:${y0 + 316}px;width:480px"><div style="font-family:${ST};font-size:14px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">02 · Nuestro fee</div>
<div style="margin-top:12px;font-family:${ID};font-size:44px;font-weight:760;letter-spacing:-0.03em;line-height:1;color:#fff">Fijo y aparte</div>
<div style="margin-top:12px;font-family:${ST};font-size:17px;line-height:1.4;color:${SOFT}">Por campaña o por mes, según el alcance que acordamos. No es un porcentaje de tu inversión.</div></div>`;
  // regla rebates
  inner += `<div style="position:absolute;left:880px;top:740px;width:980px;height:80px;border-radius:20px;border:1.5px dashed rgba(255,255,255,0.4);display:flex;align-items:center;gap:16px;padding:0 24px;box-sizing:border-box"><span style="flex:none;width:30px;height:30px">${icon('contrato', 30)}</span><span style="font-family:${ST};font-size:18px;color:#fff"><b>Sin comisiones ocultas.</b> <span style="color:${SOFT}">Si un proveedor paga una comisión o un rebate, te lo declaramos por escrito en la propuesta y en el contrato.</span></span></div>`;
  inner += facts([['finanzas', 'Medios', 'Al costo, con factura del proveedor'], ['contrato', 'Fee', 'Fijo, por campaña o por mes'], ['seguridad', 'Rebates', 'Siempre declarados por escrito']], 140, 860, 230);
  slides['CB-cobro'] = page(inner, 1360, 470);
}


// CN · Canales (como «All systems for any advertising» de basis.com, consultado 2026-10-16: medios en Direct Automation, búsqueda y social,
// e inventory partners de basis.com/technology/integrations). Logos monocromos: simple-icons, AXIS y logotipos oficiales de Wikimedia Commons en logos/terceros/ (Hulu 2018, ESPN, Forbes, Peacock 2026, DIRECTV 2025; 2026-10-16).
{
  let inner = statement({ eyebrow: 'Programática · Canales', lines: ['Los medios', 'que conoces'], body: 'Con la tecnología con la que compramos llegas a medios, plataformas de streaming, audio y redes que tu cliente usa todos los días, en una sola <b>campaña</b>.' });
  const SI = (n) => `file:///Users/jreye/Documents/greenhouse-eo/node_modules/simple-icons/icons/${n}.svg`;
  const mono = 'filter:brightness(0) invert(1);opacity:0.9';
  const T = [
    ['lg', 'hulu', 44], ['si', 'cnn', 'CNN'], ['si', 'twitch', 'Twitch'], ['lg', 'espn', 34], ['si', 'spotify', 'Spotify'],
    ['si', 'newyorktimes', 'The New York Times'], ['lg', 'forbes', 40], ['lg', 'peacock', 38], ['si', 'tubi', 'Tubi'], ['lg', 'directv', 30],
    ['si', 'youtube', 'YouTube'], ['ax', 'instagram-isotype-negative', 'Instagram'], ['ax', 'linkedin-isotype-negative', 'LinkedIn'], ['ax', 'meta-isotype-negative', 'Facebook'], ['ax', 'google-isotype', 'Google']];
  const cw = 196, ch = 130, gx = 880, gy = 150, gap = 0;
  inner += `<div style="position:absolute;left:${gx - 30}px;top:${gy - 30}px;width:${5 * cw + 60}px;height:${3 * ch + 60}px;border-radius:30px;background:radial-gradient(ellipse at 50% 50%,rgba(61,134,216,0.28),rgba(0,26,51,0) 70%)"></div>`;
  T.forEach(([k, a, b], i) => {
    const x = gx + (i % 5) * cw, y = gy + Math.floor(i / 5) * ch;
    let mark = '';
    if (k === 'lg') mark = `<img src="file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-13_brochure-agencia-medios/logos/terceros/${a}.svg" style="height:${b}px;max-width:150px;object-fit:contain;${mono}">`;
    else if (k === 'txt') mark = `<span style="font-family:${ID};font-size:${a.length > 6 ? 34 : 44}px;font-weight:760;letter-spacing:-0.02em;color:#fff;opacity:0.9">${a}</span>`;
    else if (k === 'si') mark = `<div style="display:flex;align-items:center;gap:10px"><img src="${SI(a)}" style="height:${a === 'cnn' ? 100 : a === 'tubi' ? 118 : 40}px;${mono}">${a === 'cnn' || a === 'tubi' ? '' : a === 'newyorktimes' ? `<span style="font-family:${ID};font-size:18px;font-weight:760;line-height:1.05;color:#fff;opacity:0.9">The New<br>York Times</span>` : `<span style="font-family:${ID};font-size:26px;font-weight:760;color:#fff;opacity:0.9">${b}</span>`}</div>`;
    else mark = `<div style="display:flex;align-items:center;gap:10px"><img src="${PLAT}/${a}.svg" style="height:36px;${mono}"><span style="font-family:${ID};font-size:24px;font-weight:760;color:#fff;opacity:0.9">${b}</span></div>`;
    inner += `<div style="position:absolute;left:${x}px;top:${y}px;width:${cw}px;height:${ch}px;display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(255,255,255,${i % 5 === 4 ? 0 : 0.1});border-bottom:1px solid rgba(255,255,255,${i >= 10 ? 0 : 0.1})">${mark}</div>`;
  });
  inner += `<svg style="position:absolute;inset:0" width="1920" height="1080"><path d="M${gx} ${gy - 40} Q ${gx + 490} ${gy - 80} ${gx + 980} ${gy - 40}" stroke="${ACC}" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  // socios de inventario
  const inv = ['Magnite', 'PubMatic', 'Index Exchange', 'Equativ', 'TripleLift', 'Teads', 'Taboola', 'Outbrain', 'Vistar Media', 'Place Exchange', 'Triton Digital', 'AdsWizz'];
  inner += glass(gx, 600, 980, 190, 22);
  inner += `<div style="position:absolute;left:${gx + 28}px;top:622px;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">Y el inventario de</div><div style="position:absolute;left:${gx + 28}px;top:656px;width:924px;display:flex;flex-wrap:wrap;gap:10px 12px">${inv.map(n => `<span style="font-family:${ST};font-size:16px;font-weight:600;color:#fff;padding:6px 14px;border-radius:999px;border:1.5px solid rgba(255,255,255,0.3)">${n}</span>`).join('')}</div>`;
  inner += `<div style="position:absolute;left:${gx}px;top:806px;width:980px;font-family:${ST};font-size:13px;color:${MUTE}">Medios e inventario disponibles a través de Basis, nuestra tecnología de compra programática. La disponibilidad se confirma por mercado y campaña. No son alianzas de Efeonce.</div>`;
  inner += facts([['multimedia', 'Streaming y TV', 'Hulu, Peacock, Tubi, DIRECTV'], ['medios', 'Audio', 'Spotify y audio digital'], ['contenido', 'Noticias y deporte', 'CNN, The New York Times, ESPN']], 140, 860, 230);
  slides['CN-canales'] = page(inner, 1370, 420);
}


// IX · Índice con vínculos (en el PDF cada fila salta a su página: href="#p<N>")
{
  let inner = statement({ eyebrow: 'Índice', lines: ['Lo que', 'vas a ver'], body: 'Seis capítulos, en el orden en que te preguntas por tu pauta. Toca uno para ir directo.' });
  const ch = [['01', 'El cambio', 'Qué cambió en la pauta y por qué revisarla ahora', 6], ['02', 'Plataformas', 'Google, Meta, TikTok, LinkedIn, Microsoft, X y anuncios en IA', 10], ['03', 'Creatividad', 'Una idea en cada formato, probada y escalada', 20], ['04', 'Programática', 'Display, video, TV conectada, audio, DOOH, in-game y retail', 24], ['05', 'Medición', 'Del tag a tu CRM: un número en el que confiar', 44], ['06', 'Trabajar juntos', 'Equipo, cuentas, clientes, partners y cómo empezar', 54]];
  const x0 = 880, y0 = 120, w = 980, h = 92, g = 10;
  ch.forEach(([n, t, d, pg], i) => { const y = y0 + i * (h + g);
    inner += `<a href="#p${pg}" style="position:absolute;left:${x0}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;display:flex;align-items:center;gap:26px;padding:0 30px;border-radius:20px;text-decoration:none;background:linear-gradient(160deg,rgba(255,255,255,0.09),rgba(10,40,70,0.5));border:1.5px solid ${i === 0 ? ACC : 'rgba(255,255,255,0.18)'}">
<span style="flex:none;width:64px;font-family:${ID};font-size:40px;font-weight:760;letter-spacing:-0.03em;color:${MUTE}">${n}</span>
<span style="flex:1"><span style="display:block;font-family:${ID};font-size:32px;font-weight:760;letter-spacing:-0.02em;line-height:1;color:#fff">${t}</span><span style="display:block;margin-top:6px;font-family:${ST};font-size:16px;font-weight:300;color:${SOFT}">${d}</span></span>
<span style="flex:none;font-family:${ST};font-size:18px;font-weight:600;color:#fff">${String(pg).padStart(2, '0')}</span><span style="flex:none;width:22px;height:22px">${icon('enviar', 22)}</span></a>`; });
  const k = [['Plataformas', 11], ['Canales', 26], ['DOOH', 35], ['Tecnología', 41], ['Atribución', 48], ['Partners', 58], ['Cómo se cobra', 62], ['Próximos pasos', 63], ['Glosario', 65]];
  inner += `<div style="position:absolute;left:${x0}px;top:${y0 + 6 * (h + g) + 18}px;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">Accesos directos</div>`;
  inner += `<div style="position:absolute;left:${x0}px;top:${y0 + 6 * (h + g) + 48}px;width:${w}px;display:flex;flex-wrap:wrap;gap:10px">${k.map(([t, pg]) => `<a href="#p${pg}" style="text-decoration:none;font-family:${ST};font-size:16px;font-weight:600;color:#fff;padding:8px 16px;border-radius:999px;border:1.5px solid rgba(255,255,255,0.35)">${t} <span style="color:${MUTE};font-weight:500">${pg}</span></a>`).join('')}</div>`;
  slides['IX-indice'] = page(inner, 1360, 470);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [k, html] of Object.entries(slides)) fs.writeFileSync(`${OUT}/${k}.html`, html);
console.log(Object.keys(slides).join(' '));
