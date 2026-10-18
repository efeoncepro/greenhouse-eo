// Lámina 03 «¿Qué hace mi agencia de medios? Todo el ciclo.» hecha a mano, adaptada de
// ai-generations/2026-10-12_brochure-efeonce-360/native-growth/orbita-cinco-lineas-v04.mjs (lámina V04 del 360).
// Diferencias: una sola línea (Voice, acento #f83902), una órbita con UNA esfera, los cinco frentes como
// estaciones con íconos Trazo oficiales de AXIS (resolveIcon, en reposo) y la voz pregunta/respuesta a la izquierda.
// Uso: node orbita-frentes-l03.mjs <salida.html>
import fs from 'node:fs';
import { resolveIcon } from '@efeoncepro/axis-graphic-line/icons';

const out = process.argv[2];
const ID = "'Bricolage Grotesque', system-ui, sans-serif", ST = "'Poppins', system-ui, sans-serif";
const BUB = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const ACC = '#f83902', BG = '#001a33';
const cx = 1210, cy = 575, rx = 350, ry = 230;

const items = [
  ['01', 'Estrategia', 'Audiencias, mix y presupuesto', 'objetivo', -90],
  ['02', 'Compra y operación', 'Search, social, retail y programática', 'medios', -18],
  ['03', 'Creatividad', 'Formatos que aprenden', 'multimedia', 54],
  ['04', 'Medición', 'Señales de negocio', 'medicion', 126],
  ['05', 'Gestión de inversión', 'Pacing y próximo peso', 'finanzas', 198]
];
const sphereAt = -54; // la única esfera: la inversión viajando entre estrategia y compra

const P = d => { const a = d * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// anillo con profundidad: delante (mitad baja) más grueso y brillante
let ring = '', ringGlow = '';
for (let k = 0, N = 240; k < N; k++) {
  const d0 = k * 360 / N, d1 = d0 + 360 / N + 0.4;
  const [x0, y0] = P(d0), [x1, y1] = P(d1);
  const depth = (Math.sin(((d0 + d1) / 2) * Math.PI / 180) + 1) / 2;
  const c = mix('#7a2a1a', ACC, 0.35 + depth * 0.65);
  ring += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${rx},${ry} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke="${c}" stroke-width="${(1.6 + depth * 3.4).toFixed(1)}" stroke-opacity="${(0.35 + depth * 0.6).toFixed(2)}" fill="none"/>`;
  ringGlow += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${rx},${ry} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke="${ACC}" stroke-width="${(8 + depth * 18).toFixed(1)}" stroke-opacity="${(0.12 + depth * 0.22).toFixed(2)}" fill="none"/>`;
}

// estela corta detrás de la esfera (sentido horario)
let trail = '';
for (let s = 0, steps = 34; s < steps; s++) {
  const d0 = sphereAt - 40 + s * 40 / steps, d1 = d0 + 40 / steps + 0.3;
  const [x0, y0] = P(d0), [x1, y1] = P(d1); const t = s / steps;
  trail += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${rx},${ry} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke="${ACC}" stroke-width="${(2 + t * 9).toFixed(1)}" stroke-opacity="${(t * t * 0.95).toFixed(2)}" fill="none" stroke-linecap="round"/>`;
}
const [sx, sy] = P(sphereAt); const sr = 22;

// estaciones: disco de vidrio con el ícono Trazo, etiqueta fuera del anillo
let stations = '', labels = '';
for (const [n, name, desc, glyph, d] of items) {
  const [x, y] = P(d); const a = d * Math.PI / 180; const depth = (Math.sin(a) + 1) / 2; const r = 40 + depth * 10;
  const icon = resolveIcon({ glyph, size: Math.round(r * 0.95), line: 'voice', surface: 'dark', state: 'rest', label: name, idPrefix: `l03-${glyph}` }).svg;
  stations += `<div style="position:absolute;left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:radial-gradient(circle at 35% 30%, rgba(255,255,255,0.16), rgba(10,40,70,0.82) 70%);border:1.5px solid rgba(255,140,100,0.45);box-shadow:0 0 ${18 + depth * 22}px rgba(248,57,2,${(0.18 + depth * 0.22).toFixed(2)}), inset 0 1px 0 rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center">${icon}</div>`;
  const cs = Math.cos(a), sn = Math.sin(a), w = 236;
  let style;
  if (Math.abs(cs) < 0.3) style = `left:${x - 180}px;text-align:center;${sn < 0 ? `top:${y - r - 96}px;` : `top:${y + r + 16}px;`}`;
  else if (cs > 0) style = `left:${x + r + 22}px;text-align:left;top:${y - 34}px;`;
  else style = `left:${x - r - 22 - w}px;text-align:right;top:${y - 34}px;`;
  labels += `<div style="position:absolute;${style}width:${Math.abs(cs) < 0.3 ? 360 : w}px"><div style="font-family:${ST};font-size:15px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#ffd2bf">${n}</div><div style="margin-top:4px;font-family:${ID};font-size:34px;font-weight:760;letter-spacing:-0.025em;line-height:1.02;color:#fff;text-shadow:0 0 24px rgba(0,8,20,0.9)">${name}</div><div style="margin-top:6px;font-family:${ST};font-size:17px;font-weight:300;line-height:1.35;color:#d9e3ec">${desc}</div></div>`;
}

let dust = '';
for (let k = 0; k < 150; k++) {
  const a = rnd() * Math.PI * 2, rr = 0.55 + rnd() * 0.9;
  const x = cx + Math.cos(a) * rx * rr * 1.2, y = cy + Math.sin(a) * ry * rr * 1.35;
  if (x < 820) continue;
  dust += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + rnd() * 1.6).toFixed(2)}" fill="#ffd9c8" opacity="${(0.1 + rnd() * 0.35).toFixed(2)}"/>`;
}

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${BG}">
<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0"><defs>
<radialGradient id="halo" cx="${cx}" cy="${cy}" r="880" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a2030" stop-opacity="0.55"/><stop offset="0.4" stop-color="#0d2b4c" stop-opacity="0.45"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient>
<radialGradient id="core" cx="${cx}" cy="${cy}" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity="0.26"/><stop offset="0.3" stop-color="#ffb08f" stop-opacity="0.16"/><stop offset="1" stop-color="${ACC}" stop-opacity="0"/></radialGradient>
<radialGradient id="pool" cx="${cx}" cy="${cy + 300}" r="440" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${cy + 300}) scale(1 0.18) translate(0 ${-(cy + 300)})"><stop offset="0" stop-color="${ACC}" stop-opacity="0.28"/><stop offset="1" stop-color="${ACC}" stop-opacity="0"/></radialGradient>
<radialGradient id="sph" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.28" stop-color="${ACC}" stop-opacity="0.9"/><stop offset="0.85" stop-color="${ACC}"/><stop offset="1" stop-color="${mix(ACC, '#000814', 0.45)}"/></radialGradient>
<radialGradient id="sphGlow"><stop offset="0" stop-color="${ACC}" stop-opacity="0.85"/><stop offset="0.45" stop-color="${ACC}" stop-opacity="0.22"/><stop offset="1" stop-color="${ACC}" stop-opacity="0"/></radialGradient>
<linearGradient id="vig" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${BG}" stop-opacity="1"/><stop offset="0.3" stop-color="${BG}" stop-opacity="0.75"/><stop offset="0.42" stop-color="${BG}" stop-opacity="0"/></linearGradient>
<filter id="b1"><feGaussianBlur stdDeviation="9"/></filter><filter id="b2"><feGaussianBlur stdDeviation="24"/></filter></defs>
<rect width="1920" height="1080" fill="url(#halo)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.34}" ry="${ry * 1.34}" fill="none" stroke="#ffd2bf" stroke-opacity="0.09" stroke-width="1.5" stroke-dasharray="2 10"/>
${dust}
<rect y="${cy + 250}" width="1920" height="${1080 - cy - 250}" fill="url(#pool)"/>
<ellipse cx="${cx}" cy="${cy}" rx="270" ry="160" fill="url(#core)"/>
<g filter="url(#b2)">${ringGlow}</g><g filter="url(#b1)" opacity="0.7">${ring}</g>${ring}
<g filter="url(#b1)" opacity="0.7">${trail}</g>${trail}
<circle cx="${sx}" cy="${sy}" r="${sr * 3.6}" fill="url(#sphGlow)"/><circle cx="${sx}" cy="${sy}" r="${sr}" fill="url(#sph)"/>
<rect width="1920" height="1080" fill="url(#vig)"/>
</svg>
<div style="position:absolute;left:${cx - 200}px;top:${cy - 48}px;width:400px;text-align:center"><div style="font-family:${ID};font-size:60px;font-weight:780;letter-spacing:-0.04em;line-height:1;color:#fff;text-shadow:0 0 40px rgba(248,57,2,0.35)">Tu inversión</div><div style="margin-top:10px;font-family:${ST};font-size:15px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#ffd2bf">al centro de la operación</div></div>
${stations}
${labels}
<div style="position:absolute;left:140px;top:110px;width:720px">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">Oferta integral de medios</div>
<div style="margin-top:44px;display:flex;align-items:center;gap:16px;font-family:${ST};font-size:40px;font-weight:300;color:#fff"><span style="display:inline-block;width:18px;height:18px;border-radius:50%;border:3px solid ${ACC}"></span>¿Qué hace mi agencia de medios?</div>
<div style="margin-top:18px;font-family:${ID};font-size:132px;font-weight:760;letter-spacing:-0.045em;line-height:0.92;color:#fff">Todo<br>el ciclo<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span></div>
<div style="margin-top:44px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:500px">Cinco frentes bajo <b>una sola</b> responsabilidad, conectados alrededor de lo que de verdad importa: tu inversión.</div></div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">
</div></body></html>`;
fs.writeFileSync(out, html);
console.log('ok', out);
