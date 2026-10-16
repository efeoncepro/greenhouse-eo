// «Nórtica»: marca de EJEMPLO inventada para la narrativa del brochure (no es cliente ni existe).
// Sistema: símbolo N itálica con punta al norte · wordmark condensado itálico · lima eléctrico de firma · diagonal.
export const VOLT = '#d7ff2e', INK = '#05080c';
export const WM = "'Barlow Condensed', sans-serif";
export const FONTS = 'family=Barlow+Condensed:ital,wght@1,600;1,700;1,800;1,900';
const EJ = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-13_brochure-agencia-medios/marca-ejemplo';
export const HERO = `${EJ}/ej-hero-volt.png`, SHOE = `${EJ}/ej-zapatilla-volt.png`;

// símbolo: N itálica de tres trazos; el trazo derecho remata en una punta hacia el norte
export const mark = (h, color = VOLT) => `<svg width="${Math.round(h * 1.05)}" height="${h}" viewBox="0 0 105 100" style="display:block;flex:none"><path d="M6 96 L26 96 L41 30 L60 96 L80 96 L99 14 L104 14 L88 0 L66 14 L74 14 L62 66 L44 4 L24 4 Z" fill="${color}"/></svg>`;
export const lockup = (h, color = '#fff', markColor = VOLT) => `<div style="display:flex;align-items:center;gap:${Math.round(h * 0.28)}px">${mark(h, markColor)}<span style="font-family:${WM};font-style:italic;font-weight:900;font-size:${Math.round(h * 1.05)}px;line-height:0.8;letter-spacing:0.02em;color:${color}">NÓRTICA</span></div>`;
export const headline = (px, lines = ['CORRE', 'DE NOCHE']) => `<div style="font-family:${WM};font-style:italic;font-weight:900;font-size:${px}px;line-height:0.86;letter-spacing:-0.005em;color:#fff;text-transform:uppercase">${lines.map((l, i) => i === lines.length - 1 ? `<span style="color:${VOLT}">${l}</span>` : l).join('<br>')}</div>`;
export const cta = (px, label = 'Ver modelo') => `<span style="display:inline-block;font-family:${WM};font-style:italic;font-weight:800;font-size:${px}px;line-height:1;letter-spacing:0.04em;text-transform:uppercase;color:${INK};background:${VOLT};padding:${Math.round(px * 0.38)}px ${Math.round(px * 0.9)}px;transform:skewX(-12deg)"><span style="display:inline-block;transform:skewX(12deg)">${label} →</span></span>`;
// diagonal de firma (banda lima con corte)
export const slash = (x, y, w, h, o = 1) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${VOLT};opacity:${o};transform:skewX(-24deg)"></div>`;

// anuncio completo en una caja; variantes según proporción
export const nortAd = (w, h, { img = HERO, pos = 'center', kind = 'auto', lines, label, sizeTag = '', lock = true } = {}) => {
  const k = kind !== 'auto' ? kind : (w / h > 4 ? 'row' : w / h > 1.3 ? 'wide' : 'tall');
  let inner = '';
  if (k === 'row') {
    const u = h;
    inner = `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,8,12,0.92) 0,rgba(5,8,12,0.55) 45%,rgba(5,8,12,0.2))"></div>
${slash(Math.round(u * 2.6), -10, Math.round(u * 0.16), h + 20)}${slash(Math.round(u * 2.85), -10, Math.round(u * 0.07), h + 20, 0.7)}
<div style="position:absolute;left:${Math.round(u * 0.22)}px;top:50%;transform:translateY(-50%)">${lockup(Math.round(u * 0.34))}</div>
${lines !== null ? `<div style="position:absolute;left:${Math.round(u * 3.3)}px;top:50%;transform:translateY(-50%)">${headline(Math.round(u * 0.46), [(lines || ['CORRE', 'DE NOCHE']).join(' ')])}</div>` : ''}
<div style="position:absolute;right:${Math.round(u * 0.22)}px;top:50%;transform:translateY(-50%)">${cta(Math.round(u * 0.22), label || 'Ver modelo')}</div>`;
  } else if (k === 'wide') {
    const u = h;
    inner = `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,8,12,0) 30%,rgba(5,8,12,0.88) 78%)"></div>
${slash(Math.round(w - u * 1.0), -20, Math.round(u * 0.05), h + 40, 0.95)}
<div style="position:absolute;right:${Math.round(u * 0.08)}px;top:${Math.round(u * 0.09)}px">${lockup(Math.round(u * 0.075))}</div>
<div style="position:absolute;right:${Math.round(u * 0.08)}px;top:50%;transform:translateY(-46%);text-align:right">${headline(Math.round(u * 0.2), lines)}</div>
${label !== null ? `<div style="position:absolute;right:${Math.round(u * 0.08)}px;bottom:${Math.round(u * 0.1)}px">${cta(Math.round(u * 0.055), label || 'Ver modelo')}</div>` : ''}`;
  } else {
    const u = w;
    inner = `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,8,12,0.55),rgba(5,8,12,0) 30%,rgba(5,8,12,0) 45%,rgba(5,8,12,0.92) 82%)"></div>
${slash(Math.round(w * 0.7), Math.round(h * 0.38), Math.round(u * 0.07), Math.round(h * 0.3), 0.95)}
${lock ? `<div style="position:absolute;left:${Math.round(u * 0.08)}px;top:${Math.round(u * 0.08)}px">${lockup(Math.round(u * 0.09))}</div>` : ''}
<div style="position:absolute;left:${Math.round(u * 0.08)}px;right:${Math.round(u * 0.06)}px;bottom:${Math.round(u * 0.08)}px">${headline(Math.round(u * 0.17), lines)}${label !== null ? `<div style="margin-top:${Math.round(u * 0.06)}px">${cta(Math.round(u * 0.06), label || 'Ver modelo')}</div>` : ''}</div>`;
  }
  return `<div style="position:absolute;inset:0;background:${INK} url(${img}) ${pos}/cover no-repeat"></div>${inner}${sizeTag ? `<div style="position:absolute;right:6px;bottom:4px;font-family:Poppins,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.1em;color:rgba(255,255,255,0.6)">${sizeTag}</div>` : ''}`;
};
