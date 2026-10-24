// Láminas de formatos digitales para la propuesta Gana: misma gramática que las nativas del brochure «Agencia de Medios»
// (formatos.mjs: voz a la izquierda, maquetas de vidrio con la posición del anuncio rotulada), con piezas de Gana en vez
// de la marca de ejemplo. Cubre los formatos del RFP fuera de DOOH: Display, Mobile, Video, CTV, Audio digital y Native.
// Reglas: el acento #f83902 sólo en trazos, contornos y la esfera; nunca en texto de menos de 24 px.
// Uso: node formatos-gana.mjs <carpeta-salida>
import fs from 'node:fs';
import { resolveIcon } from '@efeoncepro/axis-graphic-line/icons';
import { ganaAd, GANA_FONTS } from './gana-ad.mjs';

const OUT = process.argv[2];
const ID = "'Bricolage Grotesque', system-ui, sans-serif", ST = "'Poppins', system-ui, sans-serif";
const BUB = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const ACC = '#f83902', BG = '#001a33', SOFT = '#d9e3ec', MUTE = '#9fb4c8';
const icon = (glyph, size = 32) => resolveIcon({ glyph, size, line: 'voice', surface: 'dark', state: 'rest', idPrefix: `fg-${glyph}-${size}` }).svg;
const sphere = `<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span>`;

const voice = ({ eyebrow, question, answer, body, size }) => `
<div style="position:absolute;left:140px;top:110px;width:660px">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">${eyebrow}</div>
<div style="margin-top:44px;display:flex;align-items:flex-start;gap:16px;font-family:${ST};font-size:40px;font-weight:300;line-height:1.25;color:#fff"><span style="flex:none;margin-top:16px;display:inline-block;width:18px;height:18px;border-radius:50%;border:3px solid ${ACC}"></span><span>${question}</span></div>
<div style="margin-top:26px;font-family:${ID};font-size:${size ?? 128}px;font-weight:760;letter-spacing:-0.045em;line-height:0.92;color:#fff;white-space:nowrap">${answer.join('<br>')}${sphere}</div>
<div style="margin-top:40px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:560px">${body}</div></div>`;

const facts = (items, left = 140, top = 868, w = 220) => items.map(([glyph, k, v], i) => `
<div style="position:absolute;left:${left + i * (w + 22)}px;top:${top}px;width:${w}px">
<div style="height:30px">${icon(glyph, 30)}</div>
<div style="margin-top:10px;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${k}</div>
<div style="margin-top:4px;font-family:${ST};font-size:17px;font-weight:500;line-height:1.35;color:#fff">${v}</div></div>`).join('');

const callout = (x, y, tx, ty, title, desc, align = 'left') => `
<svg style="position:absolute;inset:0;pointer-events:none" width="1920" height="1080"><path d="M${x} ${y} L${tx} ${ty}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.4" fill="none"/><circle cx="${x}" cy="${y}" r="4" fill="#ffffff"/></svg>
<div style="position:absolute;${align === 'left' ? `left:${tx + 10}px` : `left:${tx - 270}px;text-align:right`};top:${ty - 22}px;width:260px"><div style="font-family:${ID};font-size:24px;font-weight:760;letter-spacing:-0.02em;line-height:1.05;color:#fff">${title}</div><div style="margin-top:4px;font-family:${ST};font-size:16px;font-weight:300;line-height:1.35;color:${SOFT}">${desc}</div></div>`;

const page = (inner, haloX = 1300, haloY = 520) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&${GANA_FONTS}&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${BG}">
<svg width="1920" height="1080" style="position:absolute;inset:0"><defs><radialGradient id="halo" cx="${haloX}" cy="${haloY}" r="820" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1b4f7a" stop-opacity="0.55"/><stop offset="0.5" stop-color="#0a3358" stop-opacity="0.3"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient>
<radialGradient id="pool" cx="${haloX}" cy="1000" r="560" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 1000) scale(1 0.16) translate(0 -1000)"><stop offset="0" stop-color="#7fb6ff" stop-opacity="0.3"/><stop offset="1" stop-color="#7fb6ff" stop-opacity="0"/></radialGradient></defs>
<rect width="1920" height="1080" fill="url(#halo)"/><rect y="900" width="1920" height="180" fill="url(#pool)"/></svg>
${inner}
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">
</div></body></html>`;

const glass = (x, y, w, h, r = 22, extra = '') => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;background:linear-gradient(160deg,rgba(255,255,255,0.10),rgba(10,40,70,0.55));border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2);${extra}"></div>`;
const bar = (x, y, w, h = 8, o = 0.28) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${h / 2}px;background:rgba(201,214,227,${o})"></div>`;
const block = (x, y, w, h, o = 0.12) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:10px;background:rgba(201,214,227,${o})"></div>`;
// pieza de Gana en su caja; el contorno naranja marca la posición del anuncio
const adBox = (x, y, w, h, kind, r = 8, glow = true) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;overflow:hidden;outline:2.5px solid ${ACC};outline-offset:2px;${glow ? 'box-shadow:0 0 44px rgba(95,207,60,0.25),0 20px 50px rgba(0,0,0,0.55);' : ''}">${ganaAd(w, h, kind)}</div>`;
const simLabel = (x, y, align = 'left') => `<div style="position:absolute;left:${x}px;top:${y}px;${align === 'right' ? 'transform:translateX(-100%);' : ''}font-family:${ST};font-size:14px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE};white-space:nowrap">Simulación con piezas de campaña de Gana</div>`;
const play = (x, y, s = 32) => `<svg style="position:absolute;left:${x}px;top:${y}px" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 1}" fill="rgba(0,0,0,0.45)" stroke="#fff" stroke-opacity="0.6"/><path d="M${s * 0.38} ${s * 0.28} L${s * 0.72} ${s / 2} L${s * 0.38} ${s * 0.72} Z" fill="#fff"/></svg>`;
const phone = (x, y, w, h) => glass(x, y, w, h, 44, 'background:linear-gradient(160deg,rgba(255,255,255,0.12),rgba(6,25,48,0.94))') + `<div style="position:absolute;left:${x + w / 2 - 44}px;top:${y + 16}px;width:88px;height:22px;border-radius:11px;background:rgba(0,0,0,0.55)"></div>`;

const slides = {};

// 10b · Display y mobile
{
  let inner = voice({ eyebrow: 'Programática · Display y mobile', question: '¿Dónde ven a Gana?', answer: ['Donde', 'navegan'], body: 'Banners estáticos y animados en sitios y apps elegidos por calidad, y formatos móviles que ocupan la pantalla entre dos contenidos. Siempre sólo para <b>mayores de edad</b>.' });
  const lx = 880, ly = 190, lw = 640, lh = 420;
  inner += glass(lx, ly, lw, lh, 22);
  inner += `<div style="position:absolute;left:${lx + 22}px;top:${ly + 18}px;display:flex;gap:8px">${[0, 1, 2].map(() => '<div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.25)"></div>').join('')}</div>`;
  inner += bar(lx + 100, ly + 20, 260, 10, 0.18);
  inner += adBox(lx + 36, ly + 56, 568, 70, 'row');
  inner += block(lx + 36, ly + 150, 330, 170, 0.12) + bar(lx + 36, ly + 338, 320) + bar(lx + 36, ly + 358, 290) + bar(lx + 36, ly + 378, 330);
  inner += adBox(lx + 390, ly + 150, 214, 178, 'rect');
  inner += block(lx + 390, ly + 346, 214, 46, 0.1);
  inner += `<div style="position:absolute;left:${lx - 36}px;top:${ly + lh}px;width:${lw + 72}px;height:20px;border-radius:0 0 18px 18px;background:linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))"></div>`;
  // teléfono con interstitial y teléfono con banner móvil
  const px = 1580, py = 150, pw = 280, ph = 580;
  inner += phone(px, py, pw, ph);
  inner += adBox(px + 14, py + 48, pw - 28, ph - 62, 'tall', 30);
  const qx = 1600, qy = 772;
  inner += callout(lx + 90, ly + 56, lx + 60, ly - 62, 'Leaderboard 728 × 90', 'Arriba del contenido, lo primero que se ve', 'left');
  inner += callout(lx + 497, ly + 328, 1090, 690, 'Banner 300 × 250', 'El formato más vendido de la web', 'left');
  inner += callout(px + 14, py + 360, 1560, 780, 'Interstitial móvil', 'Pantalla completa entre dos contenidos', 'right');
  inner += `<div style="position:absolute;left:${qx}px;top:${qy}px;width:260px;height:84px;border-radius:14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16)"></div>`;
  inner += adBox(qx + 14, qy + 17, 232, 36, 'strip', 4, false);
  inner += `<div style="position:absolute;left:${qx}px;top:${qy + 96}px;width:260px;text-align:center"><div style="font-family:${ID};font-size:24px;font-weight:760;color:#fff">Banner 320 × 50</div><div style="font-family:${ST};font-size:16px;font-weight:300;color:${SOFT}">Fijo al pie, dentro de apps</div></div>`;
  inner += simLabel(lx, 1000);
  inner += facts([['medios', 'Se compra', 'Por mil impresiones (CPM)'], ['medicion', 'Se mide', 'Impresiones, visibilidad y clics'], ['contenido', 'Necesitas', 'Piezas estándar o HTML5']]);
  slides['10b-display-mobile'] = page(inner, 1340, 470);
}

// 10c · Video online y TV conectada
{
  let inner = voice({ eyebrow: 'Programática · Video y TV conectada', question: '¿Y el video?', answer: ['Del celular', 'a la tele'], size: 108, body: 'Instream antes, durante o después de otro video, y spots en las apps de streaming del televisor, comprados por hogar, horario y <b>audiencia</b>.' });
  // reproductor instream
  const vx = 880, vy = 130, vw = 600, vh = 338;
  inner += `<div style="position:absolute;left:${vx}px;top:${vy}px;width:${vw}px;height:${vh}px;border-radius:20px;overflow:hidden;outline:2.5px solid ${ACC};outline-offset:2px;box-shadow:0 0 60px rgba(95,207,60,0.22),0 30px 80px rgba(0,0,0,0.6)">${ganaAd(vw, vh, 'wide')}
<div style="position:absolute;left:18px;top:16px;font-family:${ST};font-size:13px;font-weight:600;color:#fff;background:rgba(0,0,0,0.55);padding:5px 10px;border-radius:6px">Anuncio · 0:15</div>
<div style="position:absolute;right:18px;bottom:46px;font-family:${ST};font-size:14px;font-weight:500;color:#fff;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.4);padding:7px 12px;border-radius:6px">Omitir anuncio en 5</div></div>`;
  const ty = vy + vh - 26, tx0 = vx + 30, tx1 = vx + vw - 30;
  inner += `<div style="position:absolute;left:${tx0}px;top:${ty}px;width:${tx1 - tx0}px;height:5px;border-radius:3px;background:rgba(255,255,255,0.3)"></div><div style="position:absolute;left:${tx0}px;top:${ty}px;width:${(tx1 - tx0) * 0.5}px;height:5px;border-radius:3px;background:rgba(255,255,255,0.8)"></div>`;
  [[0, 'Pre-roll', 'Antes del video'], [0.5, 'Mid-roll', 'En una pausa'], [1, 'Post-roll', 'Al terminar']].forEach(([t, n, d]) => {
    const x = tx0 + (tx1 - tx0) * t;
    inner += `<div style="position:absolute;left:${x - 3}px;top:${ty - 14}px;width:6px;height:32px;border-radius:3px;background:${ACC};box-shadow:0 0 14px rgba(248,57,2,0.6)"></div>`;
    inner += `<div style="position:absolute;left:${x - 90}px;top:${vy + vh + 18}px;width:180px;text-align:center"><div style="font-family:${ID};font-size:24px;font-weight:760;color:#fff">${n}</div><div style="font-family:${ST};font-size:15px;font-weight:300;color:${SOFT}">${d}</div></div>`;
  });
  // televisor conectado
  const sx = 1240, sy = 560, sw = 620, sh = 349;
  inner += `<div style="position:absolute;left:${sx - 12}px;top:${sy - 12}px;width:${sw + 24}px;height:${sh + 24}px;border-radius:14px;background:linear-gradient(160deg,#1c2a38,#060b12);box-shadow:0 40px 90px rgba(0,0,0,0.7)"></div>`;
  inner += `<div style="position:absolute;left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;border-radius:4px;overflow:hidden;outline:2.5px solid ${ACC};outline-offset:2px">${ganaAd(sw, sh, 'wide')}
<div style="position:absolute;left:16px;top:14px;font-family:${ST};font-size:13px;font-weight:600;color:#fff;background:rgba(0,0,0,0.55);padding:5px 10px;border-radius:6px">Anuncio · 0:30</div></div>`;
  inner += `<div style="position:absolute;left:${sx + sw / 2 - 90}px;top:${sy + sh + 12}px;width:180px;height:14px;border-radius:0 0 10px 10px;background:linear-gradient(180deg,#1c2a38,#0b131c)"></div>`;
  inner += callout(sx, sy + 110, 1160, 640, 'TV conectada', 'Spot de 15 o 30 s en apps de streaming', 'right');
  inner += simLabel(vx, vy - 38);
  inner += facts([['reloj', 'Duración', '6, 15 o 30 segundos'], ['objetivo', 'Compra', 'Por hogar y audiencia'], ['medicion', 'Se mide', 'Video completado y alcance']]);
  slides['10c-video-ctv'] = page(inner, 1360, 520);
}

// 10d · Audio digital y native
{
  let inner = voice({ eyebrow: 'Programática · Audio digital y native', question: '¿Y fuera del banner?', answer: ['Al oído', 'y en la nota'], size: 108, body: 'Cuñas entre canciones y episodios de podcast con un banner que acompaña, y anuncios nativos con el estilo del medio, siempre <b>rotulados</b> como publicidad.' });
  // reproductor de audio en el teléfono
  const px = 900, py = 130, pw = 340, ph = 690;
  inner += phone(px, py, pw, ph);
  inner += adBox(px + 34, py + 74, pw - 68, pw - 68, 'square', 16);
  inner += `<div style="position:absolute;left:${px + 34}px;top:${py + 362}px;width:${pw - 68}px"><div style="font-family:${ST};font-size:12px;font-weight:600;letter-spacing:0.14em;color:${MUTE}">ANUNCIO DE AUDIO · 0:15</div><div style="margin-top:6px;font-family:${ST};font-size:22px;font-weight:600;color:#fff">Gana · Súper Chance</div><div style="font-family:${ST};font-size:15px;font-weight:300;color:${SOFT}">Entre dos canciones</div></div>`;
  const bars = Array.from({ length: 34 }, (_, i) => { const h = 6 + Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37)) * 30; return `<rect x="${i * 8}" y="${20 - h / 2}" width="4" height="${h}" rx="2" fill="#ffffff" opacity="${i < 13 ? 0.95 : 0.3}"/>`; }).join('');
  inner += `<svg style="position:absolute;left:${px + 34}px;top:${py + 470}px" width="272" height="40">${bars}</svg>`;
  inner += `<div style="position:absolute;left:${px + 34}px;top:${py + 530}px;width:${pw - 68}px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2)"><div style="width:38%;height:4px;border-radius:2px;background:#fff"></div></div>`;
  inner += `<div style="position:absolute;left:${px + 34}px;top:${py + 542}px;width:${pw - 68}px;display:flex;justify-content:space-between;font-family:${ST};font-size:12px;color:${MUTE}"><span>0:06</span><span>0:15</span></div>`;
  inner += `<svg style="position:absolute;left:${px + pw / 2 - 30}px;top:${py + 584}px" width="60" height="60"><circle cx="30" cy="30" r="29" fill="rgba(255,255,255,0.12)" stroke="#fff" stroke-opacity="0.5"/><rect x="21" y="18" width="6" height="24" rx="2" fill="#fff"/><rect x="33" y="18" width="6" height="24" rx="2" fill="#fff"/></svg>`;
  // native en un medio
  const nx = 1330, ny = 120, nw = 530, nh = 720;
  inner += glass(nx, ny, nw, nh, 26, 'background:linear-gradient(160deg,rgba(255,255,255,0.12),rgba(6,25,48,0.94))');
  inner += bar(nx + 30, ny + 30, 160, 12, 0.35) + bar(nx + nw - 120, ny + 32, 90, 8, 0.2);
  const row = (y) => block(nx + 30, y, 130, 96, 0.12) + bar(nx + 180, y + 12, 300, 12, 0.35) + bar(nx + 180, y + 34, 260, 12, 0.35) + bar(nx + 180, y + 64, 180, 8, 0.2);
  inner += row(ny + 80) + row(ny + 196);
  const cy = ny + 316;
  inner += `<div style="position:absolute;left:${nx + 22}px;top:${cy}px;width:${nw - 44}px;height:278px;border-radius:16px;border:2.5px solid ${ACC};background:rgba(255,255,255,0.06);box-shadow:0 0 44px rgba(127,182,255,0.4)"></div>`;
  inner += `<div style="position:absolute;left:${nx + 38}px;top:${cy + 16}px;width:${nw - 76}px;height:140px;border-radius:10px;overflow:hidden">${ganaAd(nw - 76, 140, 'card')}</div>`;
  inner += `<div style="position:absolute;left:${nx + 38}px;top:${cy + 170}px;display:flex;align-items:center;gap:10px;font-family:${ST};font-size:11px;font-weight:600;letter-spacing:0.12em;color:#fff"><span style="background:rgba(255,255,255,0.2);padding:3px 8px;border-radius:6px">PUBLICIDAD</span><span style="letter-spacing:0.04em;font-size:13px">Gana</span></div>`;
  inner += `<div style="position:absolute;left:${nx + 38}px;top:${cy + 198}px;width:${nw - 76}px;font-family:${ST};font-size:18px;font-weight:600;line-height:1.25;color:#fff">Así se juega el Súper Chance: guía en tres pasos</div>`;
  inner += `<div style="position:absolute;left:${nx + 38}px;top:${cy + 246}px;font-family:${ST};font-size:13px;font-weight:300;color:${SOFT}">Una lectura de 2 minutos</div>`;
  inner += row(ny + 616);
  inner += callout(nx + nw - 22, cy + 210, 1670, 940, 'Native', 'Titular, texto e imagen con el estilo del medio', 'right');
  inner += callout(px + pw - 10, py + 380, 1300, 900, 'Audio digital', 'Cuña de 15 o 30 s con banner en pantalla', 'right');
  inner += simLabel(px, py - 38);
  inner += facts([['medios', 'Dónde', 'Música, podcast y medios'], ['checklist', 'Necesitas', 'Audio, titular, texto e imagen'], ['medicion', 'Se mide', 'Escucha completa, clics y visitas']]);
  slides['10d-audio-native'] = page(inner, 1360, 480);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [k, html] of Object.entries(slides)) fs.writeFileSync(`${OUT}/${k}.html`, html);
console.log(Object.keys(slides).join(' '));
