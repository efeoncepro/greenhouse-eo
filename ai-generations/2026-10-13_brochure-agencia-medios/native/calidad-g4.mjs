// Lámina G4 «¿Quién cuida dónde aparezco? Nosotros.» hecha a mano (mismo lenguaje que L03 y la V04 del 360).
// Un muro de inventario (sitios, apps y pantallas): lo excluido se apaga, y la lente de La órbita (anillo + arco con
// la esfera) enfoca el grupo donde sí aparece la marca. Abajo, los cuatro controles con íconos Trazo de AXIS en reposo.
// Contenido: ficha de programática §7.6 (calidad, seguridad de marca y trazabilidad).
// Uso: node calidad-g4.mjs <salida.html>
import fs from 'node:fs';
import { resolveIcon } from '@efeoncepro/axis-graphic-line/icons';

const out = process.argv[2];
const ID = "'Bricolage Grotesque', system-ui, sans-serif", ST = "'Poppins', system-ui, sans-serif";
const BUB = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const ACC = '#f83902', BG = '#001a33';

// muro: 12 × 7 tarjetas en perspectiva leve
const cols = 12, rows = 7, gx = 880, gy = 200, tw = 70, th = 50, gap = 12;
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const focus = { c0: 6, c1: 9, r0: 2, r1: 4 }; // el grupo limpio que enfoca la lente
let tiles = '';
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const x = gx + c * (tw + gap), y = gy + r * (th + gap);
  const inFocus = c >= focus.c0 && c <= focus.c1 && r >= focus.r0 && r <= focus.r1;
  const excluded = !inFocus && rnd() < 0.42;
  if (inFocus) {
    tiles += `<rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="8" fill="rgba(255,255,255,0.10)" stroke="${ACC}" stroke-opacity="0.85" stroke-width="1.6"/>` +
      `<rect x="${x + 9}" y="${y + 10}" width="${tw * 0.45}" height="5" rx="2.5" fill="#ffffff" opacity="0.9"/><rect x="${x + 9}" y="${y + 21}" width="${tw * 0.7}" height="4" rx="2" fill="#ffffff" opacity="0.45"/><rect x="${x + 9}" y="${y + 31}" width="${tw * 0.55}" height="4" rx="2" fill="#ffffff" opacity="0.35"/>`;
  } else if (excluded) {
    tiles += `<rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="8" fill="rgba(255,255,255,0.025)" stroke="#9fb4c8" stroke-opacity="0.12" stroke-width="1"/>` +
      `<path d="M${x + 24} ${y + 14} L${x + 46} ${y + 36} M${x + 46} ${y + 14} L${x + 24} ${y + 36}" stroke="#9fb4c8" stroke-opacity="0.28" stroke-width="1.6" stroke-linecap="round"/>`;
  } else {
    tiles += `<rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="8" fill="rgba(255,255,255,0.05)" stroke="#9fb4c8" stroke-opacity="0.2" stroke-width="1"/>` +
      `<rect x="${x + 9}" y="${y + 10}" width="${tw * 0.45}" height="5" rx="2.5" fill="#c9d6e3" opacity="0.28"/><rect x="${x + 9}" y="${y + 21}" width="${tw * 0.7}" height="4" rx="2" fill="#c9d6e3" opacity="0.16"/>`;
  }
}
// lente sobre el grupo limpio
const fx0 = gx + focus.c0 * (tw + gap), fx1 = gx + (focus.c1 + 1) * (tw + gap) - gap;
const fy0 = gy + focus.r0 * (th + gap), fy1 = gy + (focus.r1 + 1) * (th + gap) - gap;
const lcx = (fx0 + fx1) / 2, lcy = (fy0 + fy1) / 2, lr = Math.hypot(fx1 - fx0, fy1 - fy0) / 2 + 26;
const arcFrom = -90, arcTo = 28; // arco (estela) desde las 12, la esfera en la punta
const pt = d => { const a = d * Math.PI / 180; return [lcx + lr * Math.cos(a), lcy + lr * Math.sin(a)]; };
let arc = '';
for (let s = 0, N = 40; s < N; s++) {
  const d0 = arcFrom + (arcTo - arcFrom) * s / N, d1 = arcFrom + (arcTo - arcFrom) * (s + 1) / N + 0.3;
  const [x0, y0] = pt(d0), [x1, y1] = pt(d1); const t = s / N;
  arc += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${lr},${lr} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke="${ACC}" stroke-width="${(2 + t * 6).toFixed(1)}" stroke-opacity="${(0.15 + t * t * 0.85).toFixed(2)}" fill="none" stroke-linecap="round"/>`;
}
const [sx, sy] = pt(arcTo);

const controls = [
  ['checklist', 'Listas y exclusiones', 'Dónde sí y dónde no, definido contigo'],
  ['seguridad', 'Sitios hechos para monetizar', 'Fuera del plan, con revisión de listas'],
  ['buscador', 'Tráfico inválido', 'Inventario evaluado con evidencia'],
  ['informe', 'Reporte de placements', 'Cada sitio, app o pantalla a la vista']
];
let ctrl = '';
controls.forEach(([glyph, title, desc], i) => {
  const x = 880 + i * 250, y = 740;
  const icon = resolveIcon({ glyph, size: 34, line: 'voice', surface: 'dark', state: 'rest', label: title, idPrefix: `g4-${glyph}` }).svg;
  ctrl += `<div style="position:absolute;left:${x}px;top:${y}px;width:225px"><div style="height:34px">${icon}</div><div style="margin-top:14px;font-family:${ID};font-size:24px;font-weight:760;letter-spacing:-0.02em;line-height:1.08;color:#fff">${title}</div><div style="margin-top:8px;font-family:${ST};font-size:16px;font-weight:300;line-height:1.4;color:#d9e3ec">${desc}</div></div>`;
});

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${BG}">
<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0"><defs>
<radialGradient id="halo" cx="${lcx}" cy="${lcy}" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a2030" stop-opacity="0.55"/><stop offset="0.45" stop-color="#0d2b4c" stop-opacity="0.4"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient>
<radialGradient id="focusGlow" cx="${lcx}" cy="${lcy}" r="${lr * 1.3}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${ACC}" stop-opacity="0.22"/><stop offset="1" stop-color="${ACC}" stop-opacity="0"/></radialGradient>
<radialGradient id="sph" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.28" stop-color="${ACC}" stop-opacity="0.9"/><stop offset="0.85" stop-color="${ACC}"/><stop offset="1" stop-color="#7a1c02"/></radialGradient>
<radialGradient id="sphGlow"><stop offset="0" stop-color="${ACC}" stop-opacity="0.8"/><stop offset="0.45" stop-color="${ACC}" stop-opacity="0.2"/><stop offset="1" stop-color="${ACC}" stop-opacity="0"/></radialGradient>
<filter id="b1"><feGaussianBlur stdDeviation="8"/></filter></defs>
<rect width="1920" height="1080" fill="url(#halo)"/>
<circle cx="${lcx}" cy="${lcy}" r="${lr * 1.3}" fill="url(#focusGlow)"/>
${tiles}
<circle cx="${lcx}" cy="${lcy}" r="${lr}" fill="none" stroke="#ffd2bf" stroke-opacity="0.16" stroke-width="1.5"/>
<g filter="url(#b1)" opacity="0.7">${arc}</g>${arc}
<circle cx="${sx}" cy="${sy}" r="70" fill="url(#sphGlow)"/><circle cx="${sx}" cy="${sy}" r="19" fill="url(#sph)"/>
</svg>
<div style="position:absolute;left:${lcx - lr - 30}px;top:${lcy + lr + 10}px;width:${2 * lr + 60}px;text-align:center;font-family:${ST};font-size:15px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#ffd2bf">Aquí aparece tu marca</div>
${ctrl}
<div style="position:absolute;left:140px;top:110px;width:640px">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">Programática · Calidad y seguridad de marca</div>
<div style="margin-top:44px;display:flex;align-items:flex-start;gap:16px;font-family:${ST};font-size:40px;font-weight:300;line-height:1.25;color:#fff"><span style="flex:none;margin-top:16px;display:inline-block;width:18px;height:18px;border-radius:50%;border:3px solid ${ACC}"></span><span>¿Quién cuida dónde aparezco?</span></div>
<div style="margin-top:30px;font-family:${ID};font-size:150px;font-weight:760;letter-spacing:-0.045em;line-height:0.92;color:#fff">Nosotros<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span></div>
<div style="margin-top:48px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:520px">No todo el inventario sirve. Antes de comprar, sacamos lo que pone en riesgo tu marca y te mostramos <b>dónde</b> apareciste.</div></div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">
</div></body></html>`;
fs.writeFileSync(out, html);
console.log('ok', out);
