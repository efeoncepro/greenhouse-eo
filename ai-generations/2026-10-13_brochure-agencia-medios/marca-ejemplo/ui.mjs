// Interfaces GENÉRICAS de ubicaciones de anuncios (sin la marca ni el diseño propio de ninguna plataforma) con las
// marcas de ejemplo: Nórtica (B2C) y Andara (B2B, inventada para la lámina de LinkedIn). Todo es ilustrativo.
import { nortAd, lockup, mark, headline, VOLT, WM, HERO, SHOE } from './nortica.mjs';
export const UI_FONTS = 'family=Inter:wght@400;500;600;700;800&family=Manrope:wght@500;700;800';
const SF = "'Inter', sans-serif";
export const CYAN = '#38d6ff';
const ic = {
  heart: (s, c = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 20s-7-4.4-9.3-8.6C1.2 8.4 3 5 6.4 5c2 0 3.3 1.2 3.9 2.2.3.5.9.5 1.2 0C12.1 6.2 13.5 5 15.5 5 19 5 20.8 8.4 19.3 11.4 17 15.6 12 20 12 20z"/></svg>`,
  chat: (s, c = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M4 12a8 8 0 1 1 3.4 6.5L3 20l1.5-4.2A8 8 0 0 1 4 12z"/></svg>`,
  send: (s, c = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/></svg>`,
  save: (s, c = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
  share: (s, c = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M14 4l7 7-7 7v-4c-6 0-9 2-11 6 0-7 4-11 11-12z"/></svg>`,
  music: (s, c = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="7" cy="18" r="3"/><path d="M10 18V5l10-2v13"/><circle cx="17" cy="16" r="3"/></svg>`
};
const avatar = (s, bg, inner) => `<div style="flex:none;width:${s}px;height:${s}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center">${inner}</div>`;
const nAv = (s) => avatar(s, '#05080c', mark(Math.round(s * 0.5)));

// Feed cuadrado/4:5 con anuncio
export const feed = (w, h) => {
  const u = w / 100;
  return `<div style="position:absolute;inset:0;background:#0b0f14;font-family:${SF};color:#fff">
<div style="height:${8 * u}px"></div>
<div style="display:flex;align-items:center;gap:${2.5 * u}px;padding:${2 * u}px ${3.5 * u}px">${nAv(9 * u)}<div><div style="font-size:${3.6 * u}px;font-weight:700">nortica</div><div style="font-size:${3 * u}px;opacity:0.7">Publicidad</div></div></div>
<div style="position:relative;width:${w}px;height:${w * 1.15}px;overflow:hidden">${nortAd(w, w * 1.15, { kind: 'tall', label: null })}</div>
<div style="display:flex;align-items:center;justify-content:space-between;padding:${2.2 * u}px ${3.5 * u}px;background:#1a2433;font-size:${3.6 * u}px;font-weight:600">Comprar ahora<span>›</span></div>
<div style="display:flex;gap:${4 * u}px;padding:${3 * u}px ${3.5 * u}px">${ic.heart(6.5 * u)}${ic.chat(6.5 * u)}${ic.send(6.5 * u)}<div style="flex:1"></div>${ic.save(6.5 * u)}</div>
<div style="padding:0 ${3.5 * u}px;font-size:${3.4 * u}px;line-height:1.35"><b>nortica</b> La suela que se nota de noche. Nueva colección.</div></div>`;
};
// Historia vertical
export const story = (w, h) => {
  const u = w / 100;
  return `<div style="position:absolute;inset:0;background:#000;font-family:${SF};color:#fff"><div style="position:absolute;left:0;top:0;width:${w}px;height:${h - 18 * u}px">${nortAd(w, h - 18 * u, { pos: '30% 45%', kind: 'tall', label: null, lock: false })}</div>
<div style="position:absolute;left:${3 * u}px;right:${3 * u}px;top:${5 * u}px;display:flex;gap:${1.2 * u}px">${[1, 0.4, 0.4].map(o => `<div style="flex:1;height:${0.8 * u}px;border-radius:2px;background:rgba(255,255,255,${o})"></div>`).join('')}</div>
<div style="position:absolute;left:${3.5 * u}px;top:${8.5 * u}px;display:flex;align-items:center;gap:${2.2 * u}px">${nAv(8 * u)}<div style="font-size:${3.6 * u}px;font-weight:700">nortica <span style="font-weight:400;opacity:0.75">· Publicidad</span></div></div>
<div style="position:absolute;left:50%;bottom:${5 * u}px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:${1 * u}px;font-size:${3.6 * u}px;font-weight:700"><span>︿</span><span style="background:#fff;color:#05080c;padding:${1.6 * u}px ${5 * u}px;border-radius:${4 * u}px">Ver modelo</span></div></div>`;
};
// Video vertical con riel derecho (reels / video corto)
export const reel = (w, h, { handle = 'nortica', caption = 'Corre de noche, en serio. Nueva suela lima.', cta = 'Ver modelo', tag = 'Publicidad', lines } = {}) => {
  const u = w / 100;
  const rail = [['heart', '12,4 mil'], ['chat', '318'], ['share', '1.204']].map(([k, n]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:${0.8 * u}px">${ic[k](9 * u)}<span style="font-size:${3 * u}px;font-weight:600">${n}</span></div>`).join('');
  return `<div style="position:absolute;inset:0;background:#000;font-family:${SF};color:#fff">
<div style="position:absolute;inset:0;background:#000 url(${HERO}) 30% 45%/cover"></div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0) 20%,rgba(0,0,0,0) 50%,rgba(0,0,0,0.85))"></div>
<div style="position:absolute;left:${5 * u}px;top:${20 * u}px">${headline(Math.round(13 * u), lines || ['CORRE', 'DE NOCHE'])}</div>
<div style="position:absolute;right:${3.5 * u}px;bottom:${30 * u}px;display:flex;flex-direction:column;gap:${5 * u}px;align-items:center">${rail}</div>
<div style="position:absolute;left:${4 * u}px;right:${20 * u}px;bottom:${17 * u}px"><div style="display:flex;align-items:center;gap:${2 * u}px">${nAv(8 * u)}<span style="font-size:${3.8 * u}px;font-weight:700">${handle}</span><span style="font-size:${2.8 * u}px;border:1px solid rgba(255,255,255,0.7);border-radius:${1 * u}px;padding:${0.3 * u}px ${1.4 * u}px">${tag}</span></div><div style="margin-top:${1.6 * u}px;font-size:${3.4 * u}px;line-height:1.35">${caption}</div><div style="margin-top:${1.4 * u}px;display:flex;gap:${1.5 * u}px;align-items:center;font-size:${3 * u}px;opacity:0.85">${ic.music(4 * u)} Audio original</div></div>
<div style="position:absolute;left:${4 * u}px;right:${4 * u}px;bottom:${5 * u}px;height:${9 * u}px;border-radius:${2 * u}px;background:${VOLT};color:#05080c;display:flex;align-items:center;justify-content:center;font-family:${WM};font-style:italic;font-weight:800;font-size:${4.6 * u}px;text-transform:uppercase;letter-spacing:0.04em">${cta} →</div></div>`;
};

// ── Andara (B2B, ejemplo) ──
export const andaraMark = (s, c = CYAN) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40" style="display:block;flex:none"><path d="M4 34 L20 6 L36 34 L28 34 L20 19 L12 34 Z" fill="${c}"/><path d="M15 30 L25 30" stroke="${c}" stroke-width="3"/></svg>`;
export const andaraLockup = (s, c = '#fff') => `<div style="display:flex;align-items:center;gap:${Math.round(s * 0.3)}px">${andaraMark(s)}<span style="font-family:'Manrope',sans-serif;font-weight:800;font-size:${Math.round(s * 0.95)}px;letter-spacing:-0.02em;color:${c}">andara</span></div>`;
export const andaraDoc = (w, h, page = 1) => {
  const u = w / 100;
  return `<div style="position:absolute;inset:0;background:linear-gradient(150deg,#0a1f3d,#04101f);font-family:'Manrope',sans-serif;color:#fff;overflow:hidden">
<svg style="position:absolute;inset:0" width="${w}" height="${h}">${Array.from({ length: 7 }, (_, i) => `<path d="M${-10 + i * 18 * u} ${h} L${40 * u + i * 18 * u} ${h * 0.35}" stroke="${CYAN}" stroke-opacity="${0.08 + i * 0.02}" stroke-width="${0.6 * u}"/>`).join('')}</svg>
<div style="position:absolute;left:${7 * u}px;top:${7 * u}px">${andaraLockup(Math.round(6 * u))}</div>
<div style="position:absolute;left:${7 * u}px;right:${7 * u}px;top:${26 * u}px;font-size:${10 * u}px;font-weight:800;line-height:1.02;letter-spacing:-0.03em">5 señales de que tu bodega <span style="color:${CYAN}">pierde margen</span></div>
<div style="position:absolute;left:${7 * u}px;top:${76 * u}px;font-size:${4 * u}px;font-weight:500;opacity:0.85">Guía para gerentes de operaciones</div>
<div style="position:absolute;right:${5 * u}px;bottom:${5 * u}px;font-size:${3.4 * u}px;font-weight:700;background:rgba(255,255,255,0.12);padding:${1 * u}px ${2.4 * u}px;border-radius:${3 * u}px">${page} / 12</div></div>`;
};
// Feed profesional (escritorio) con documento promocionado de Andara
export const proFeed = (w, h) => {
  const u = w / 100;
  const ghost = (y, hh) => `<div style="position:absolute;left:${3 * u}px;top:${y}px;width:${21 * u}px;height:${hh}px;border-radius:${1 * u}px;background:#151d28"></div>`;
  return `<div style="position:absolute;inset:0;background:#0d131b;font-family:${SF};color:#e8eef5">
<div style="position:absolute;left:0;right:0;top:0;height:${5 * u}px;background:#151d28"></div>
${ghost(8 * u, 20 * u)}${ghost(30 * u, 12 * u)}
<div style="position:absolute;left:${27 * u}px;top:${8 * u}px;width:${46 * u}px;bottom:0;border-radius:${1 * u}px ${1 * u}px 0 0;background:#151d28;overflow:hidden">
<div style="display:flex;align-items:center;gap:${1.2 * u}px;padding:${1.6 * u}px ${2 * u}px">${avatar(5 * u, '#0a1f3d', andaraMark(3 * u))}<div><div style="font-size:${1.5 * u}px;font-weight:700">Andara Logística</div><div style="font-size:${1.2 * u}px;opacity:0.65">Promocionado</div></div></div>
<div style="padding:0 ${2 * u}px ${1.2 * u}px;font-size:${1.45 * u}px;line-height:1.4">¿Tu bodega cumple los pedidos pero pierde margen en cada despacho? Descarga la guía con las 5 señales para detectarlo.</div>
<div style="position:relative;width:${46 * u}px;height:${46 * u}px">${andaraDoc(46 * u, 46 * u)}</div>
<div style="display:flex;align-items:center;justify-content:space-between;padding:${1.4 * u}px ${2 * u}px;border-bottom:1px solid #253041"><span style="font-size:${1.4 * u}px;font-weight:600">Guía gratuita · 12 páginas</span><span style="font-size:${1.4 * u}px;font-weight:700;color:#05080c;background:${CYAN};padding:${0.6 * u}px ${1.8 * u}px;border-radius:${3 * u}px">Descargar</span></div></div>
${ghost(8 * u, 30 * u).replace(`left:${3 * u}px`, `left:${76 * u}px`)}</div>`;
};
