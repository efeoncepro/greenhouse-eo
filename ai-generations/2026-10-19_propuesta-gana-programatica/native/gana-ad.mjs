// Piezas de Gana para simular los formatos digitales en la propuesta (mismo sistema que las piezas DOOH de metro/:
// verde con rayos, Kaushan Script, Montserrat, cifra dorada, logo oficial y línea legal). No son piezas aprobadas por Gana:
// adaptan su campaña vigente («Jugar bien, es jugar en Gana» y Súper Chance) para mostrar cada formato.
// Cada variante se diseña a un tamaño de referencia y se escala para cubrir la caja pedida.
const LOGO = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-19_propuesta-gana-programatica/logos/gana-on-dark.svg';
export const GANA_FONTS = 'family=Kaushan+Script&family=Montserrat:ital,wght@0,500;0,700;0,800;0,900;1,800;1,900';
const M = 'Montserrat,sans-serif', K = "'Kaushan Script',cursive";
const BG = 'radial-gradient(120% 90% at 18% 20%,#a6ec4f 0%,rgba(166,236,79,0) 60%),linear-gradient(120deg,#5fcf3c 0%,#1f9e3e 45%,#0b5e2c 100%)';
const RAYS = '<div style="position:absolute;inset:0;background:repeating-conic-gradient(from 200deg at 30% 120%,rgba(255,255,255,.07) 0 6deg,rgba(255,255,255,0) 6deg 14deg)"></div>';
const script = (px, t, rot = -4) => `<div style="font-family:${K};font-size:${px}px;line-height:1;color:#fff;-webkit-text-stroke:${Math.max(1.5, px / 40)}px #0b5e2c;paint-order:stroke fill;text-shadow:0 ${Math.round(px / 26)}px 0 #0b5e2c;transform:rotate(${rot}deg);transform-origin:left;white-space:nowrap">${t}</div>`;
const gold = (px, t) => `<span style="font-family:${M};font-style:italic;font-weight:900;font-size:${px}px;line-height:.92;letter-spacing:-.02em;background:linear-gradient(180deg,#fff7c2 0%,#ffd84a 45%,#e9a400 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 ${Math.max(2, Math.round(px / 30))}px 0 #0b5e2c);white-space:nowrap">${t}</span>`;
const pill = (px, t) => `<span style="display:inline-block;padding:${Math.round(px * 0.42)}px ${Math.round(px)}px;border-radius:999px;background:#0b5e2c;font-family:${M};font-size:${px}px;font-weight:700;color:#fff;white-space:nowrap">${t}</span>`;
const logo = (h) => `<img src="${LOGO}" style="height:${h}px;width:auto;display:block;filter:drop-shadow(0 ${Math.round(h / 30)}px ${Math.round(h / 16)}px rgba(0,0,0,.25))">`;
const legal = (px, bottom) => `<div style="position:absolute;left:0;right:0;bottom:${bottom}px;text-align:center;font-family:${M};font-size:${px}px;font-weight:500;color:#fff;opacity:.85;white-space:nowrap">Juega con responsabilidad · Solo para mayores de 18 años</div>`;
const it = (px, t, w = 800) => `<div style="font-family:${M};font-style:italic;font-weight:${w};font-size:${px}px;line-height:1.05;color:#fff;white-space:nowrap">${t}</div>`;

const designs = {
  // leaderboard / banner de fila (ref 1456 × 180)
  row: [1456, 180, () => `<div style="position:absolute;left:40px;top:28px">${logo(104)}</div>
<div style="position:absolute;left:360px;top:32px">${script(58, 'Jugar bien,', -3)}${it(28, 'es jugar en Gana')}</div>
<div style="position:absolute;left:760px;top:40px;display:flex;align-items:center;gap:16px">${gold(78, '$5.439')}<div>${it(24, 'MILLONES', 900)}${it(24, 'EN PREMIOS', 900)}</div></div>
<div style="position:absolute;right:40px;top:60px">${pill(26, 'Juega ya')}</div>${legal(13, 6)}`],
  // banner móvil 320 × 50 (ref 960 × 150)
  strip: [960, 150, () => `<div style="position:absolute;left:30px;top:30px">${logo(90)}</div>
<div style="position:absolute;left:300px;top:34px;display:flex;align-items:center;gap:14px">${gold(70, '$5.439')}<div>${it(22, 'MILLONES', 900)}${it(22, 'EN PREMIOS', 900)}</div></div>
<div style="position:absolute;right:28px;top:48px">${pill(26, 'Juega')}</div>`],
  // medium rectangle 300 × 250 (ref 600 × 500)
  rect: [600, 500, () => `<div style="position:absolute;left:40px;top:34px">${script(76, 'Jugar bien,')}${it(32, 'es jugar en')}</div>
<div style="position:absolute;left:40px;top:172px">${logo(124)}</div>
<div style="position:absolute;left:40px;top:330px;display:flex;align-items:center;gap:14px">${it(24, 'Más de')}${gold(62, '$5.439')}<div>${it(20, 'MILLONES', 900)}${it(20, 'EN PREMIOS', 900)}</div></div>
<div style="position:absolute;left:40px;top:410px">${pill(24, 'Juega ya')}</div>${legal(13, 12)}`],
  // tarjeta de native (ref 1000 × 310)
  card: [1000, 310, () => `<div style="position:absolute;left:40px;top:40px">${script(76, 'Jugar bien,', -3)}${it(34, 'es jugar en Gana')}</div>
<div style="position:absolute;left:40px;top:188px">${logo(84)}</div>
<div style="position:absolute;right:44px;top:56px;text-align:right">${it(30, 'Más de')}<div>${gold(96, '$5.439')}</div>${it(30, 'MILLONES EN PREMIOS', 900)}</div>${legal(14, 10)}`],
  // interstitial vertical (ref 540 × 1170)
  tall: [540, 1170, () => `<div style="position:absolute;left:44px;top:150px">${it(40, '¡Celebramos tu')}${script(104, 'intuición')}</div>
<div style="position:absolute;left:44px;top:430px">${it(40, 'con', 900)}${gold(84, 'SÚPER')}<br>${gold(84, 'CHANCE!')}</div>
<div style="position:absolute;left:44px;top:740px">${logo(166)}</div>
<div style="position:absolute;left:44px;top:990px">${pill(30, 'Juégalo en tu punto Gana')}</div>${legal(15, 40)}
<div style="position:absolute;right:26px;top:70px;width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,.35);color:#fff;font-family:${M};font-size:26px;font-weight:600;display:flex;align-items:center;justify-content:center">×</div>`],
  // video / TV 16:9 (ref 1920 × 1080)
  wide: [1920, 1080, () => `<div style="position:absolute;left:110px;top:200px">${it(64, '¡Celebramos tu')}${script(190, 'intuición')}
<div style="margin-top:34px;display:flex;align-items:baseline;gap:22px">${it(66, 'con', 900)}${gold(104, 'SÚPER CHANCE!')}</div>
<div style="margin-top:46px">${pill(44, 'Juégalo en tu punto Gana')}</div></div>
<div style="position:absolute;right:110px;top:640px">${logo(300)}</div>${legal(22, 16)}`],
  // miniatura cuadrada para native y audio (ref 600 × 600)
  square: [600, 600, () => `<div style="position:absolute;left:46px;top:70px">${it(40, 'con', 900)}${gold(96, 'SÚPER')}<br>${gold(96, 'CHANCE!')}</div>
<div style="position:absolute;left:46px;top:370px">${logo(170)}</div>`]
};

export const ganaAd = (w, h, kind) => {
  const [rw, rh, html] = designs[kind];
  const s = Math.max(w / rw, h / rh);
  return `<div style="position:absolute;inset:0;overflow:hidden;background:#0b5e2c"><div style="position:absolute;left:${(w - rw * s) / 2}px;top:${(h - rh * s) / 2}px;width:${rw}px;height:${rh}px;transform:scale(${s});transform-origin:0 0;background:${BG}">${RAYS}${html()}</div></div>`;
};
