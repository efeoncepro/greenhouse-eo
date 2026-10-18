// Pantallas en movimiento para la landing: rota tres creatividades de la marca de ejemplo dentro de las pantallas de cada
// escena terminada (determinístico, sin modelo de video). Esquinas: las mismas medidas del brochure (*-comp.json /
// *-quad.json) o, si faltan, detectadas en la base blanca. Máscara: polígono de la pantalla; en teléfonos, además, sólo
// donde la base era blanca (respeta esquinas redondeadas y dedos). Loop: A → B → C → A con fundidos cortos (ffmpeg).
// En los formatos de fila (letrero ancho y bajo) va sólo la marca y el botón: el titular choca con el botón.
// Uso: node pantallas-animadas.mjs [escena…]   (calle, tienda, bus, telefono, juego)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { nortAd, FONTS, HERO, SHOE } from './nortica.mjs';
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json');
const sharp = require('sharp');
const DIR = new URL('.', import.meta.url).pathname;
const OUT = `${DIR}animadas/`;
const SHOT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs';
fs.mkdirSync(OUT, { recursive: true });

const VARIANTES = [
  { lines: ['CORRE', 'DE NOCHE'], fila: null, img: HERO, label: 'Ver modelo' },
  { lines: ['HOY LLUEVE', 'CORRE IGUAL'], fila: null, img: SHOE, label: 'Ver modelo' },
  { lines: ['TU CIUDAD', 'TU RITMO'], fila: null, img: HERO, pos: '38% 30%', label: 'Descúbrela' },
];

const ESCENAS = {
  calle: { quads: () => JSON.parse(fs.readFileSync(`${DIR}calle-comp.json`, 'utf8')).map(m => m.quad) },
  tienda: { quads: () => JSON.parse(fs.readFileSync(`${DIR}tienda-comp.json`, 'utf8')).map(m => m.quad) },
  juego: { quads: () => [JSON.parse(fs.readFileSync(`${DIR}juego-quad.json`, 'utf8')).quad], kind: 'wide' },
  bus: { quads: () => JSON.parse(fs.readFileSync(`${DIR}bus-comp.json`, 'utf8')).map(m => m.quad), blanco: true },
  telefono: { detectar: { seed: [780, 480], box: JSON.parse(fs.readFileSync(`${DIR}telefono-quad.json`, 'utf8')).bbox }, blanco: true },
};

const leer = async (f) => sharp(f).raw().toBuffer({ resolveWithObject: true });
const blancoEn = (data, C) => (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; return Math.min(r, g, b) > 175 && Math.max(r, g, b) - Math.min(r, g, b) < 45; };

// mismo método que componer-pantallas.mjs: relleno desde la semilla y rectas por el tramo central de cada lado
const detectar = (data, W, H, C, seed, [x0, y0, x1, y1]) => {
  const ok = (x, y) => { const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2]; return Math.min(r, g, b) > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 34; };
  const seen = new Uint8Array(W * H), st = [seed], pts = [];
  while (st.length) { const [x, y] = st.pop(); if (x < x0 || y < y0 || x >= x1 || y >= y1) continue; const k = y * W + x; if (seen[k]) continue; seen[k] = 1; if (!ok(x, y)) continue; pts.push([x, y]); st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  const bb = pts.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1, -1]);
  const rows = new Map(), cols = new Map();
  for (const [x, y] of pts) { const r = rows.get(y) || [1e9, -1]; rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]); const c = cols.get(x) || [1e9, -1]; cols.set(x, [Math.min(c[0], y), Math.max(c[1], y)]); }
  const fit = (p) => { const n = p.length, sx = p.reduce((a, q) => a + q[0], 0), sy = p.reduce((a, q) => a + q[1], 0), sxx = p.reduce((a, q) => a + q[0] * q[0], 0), sxy = p.reduce((a, q) => a + q[0] * q[1], 0); const m = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1); return [m, (sy - m * sx) / n]; };
  const hb = bb[3] - bb[1], wb = bb[2] - bb[0];
  const mid = (map, lo, hi, k) => [...map].filter(([t]) => t > lo && t < hi).map(([t, v]) => [t, v[k]]);
  const L = fit(mid(rows, bb[1] + hb * 0.25, bb[3] - hb * 0.25, 0)), R = fit(mid(rows, bb[1] + hb * 0.25, bb[3] - hb * 0.25, 1));
  const T = fit(mid(cols, bb[0] + wb * 0.25, bb[2] - wb * 0.25, 0)), B = fit(mid(cols, bb[0] + wb * 0.25, bb[2] - wb * 0.25, 1));
  const meet = ([ma, ba], [mb, bbb]) => { const y = (mb * ba + bbb) / (1 - mb * ma); return [ma * y + ba, y]; };
  const q = [meet(L, T), meet(R, T), meet(R, B), meet(L, B)];
  const cx = q.reduce((a, p) => a + p[0], 0) / 4, cy = q.reduce((a, p) => a + p[1], 0) / 4;
  return q.map(([x, y]) => [x + (x - cx) * 0.012, y + (y - cy) * 0.012]);
};

const homography = (w, h, q) => {
  const src = [[0, 0], [w, 0], [w, h], [0, h]], M = [];
  src.forEach(([x, y], i) => { const [u, v] = q[i]; M.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]); M.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]); });
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= 8; k++) M[r][k] -= f * M[c][k]; } }
  const [a, b, c, d, e, f, g, hh] = M.map((r, i) => r[8] / r[i]);
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const escenas = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ESCENAS);
for (const nombre of escenas) {
  const cfg = ESCENAS[nombre];
  const final = `${DIR}${nombre}-final.png`, base = `${DIR}${nombre}-base.png`;
  const { data, info } = await leer(base);
  const W = info.width, H = info.height, C = info.channels;
  const quads = cfg.quads ? cfg.quads() : [detectar(data, W, H, C, cfg.detectar.seed, cfg.detectar.box)];
  // máscara: polígonos (dilatados 2 px por el blur) ∩ blanco de la base cuando la pantalla tiene dedos o esquinas redondeadas
  const poly = await sharp(Buffer.from(`<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000"/>${quads.map(q => `<polygon points="${q.map(p => p.join(',')).join(' ')}" fill="#fff" stroke="#fff" stroke-width="2"/>`).join('')}</svg>`)).extractChannel(0).raw().toBuffer();
  if (cfg.blanco) { const es = blancoEn(data, C); for (let p = 0, i = 0; p < poly.length; p++, i += C) if (!es(i)) poly[p] = 0; }
  const mask = await sharp(poly, { raw: { width: W, height: H, channels: 1 } }).blur(0.8).extractChannel(0).png().toBuffer();
  const frames = [];
  for (const [k, v] of VARIANTES.entries()) {
    const overlay = quads.map(q => {
      const w = Math.round((dist(q[0], q[1]) + dist(q[3], q[2])) / 2 * 1.8), h = Math.round((dist(q[0], q[3]) + dist(q[1], q[2])) / 2 * 1.8);
      return `<div style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;transform:${homography(w, h, q)};overflow:hidden">${nortAd(w, h, { ...v, lines: w / h > 4 ? v.fila : v.lines, kind: cfg.kind || 'auto' })}</div>`;
    }).join('');
    const html = `${OUT}${nombre}-v${k + 1}.html`;
    fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONTS}&family=Poppins:wght@400;600&display=swap"><style>body{margin:0;background:#000}</style></head><body><div style="position:relative;width:1920px;height:1080px;overflow:hidden">${overlay}</div></body></html>`);
    const tmp = `${OUT}_${nombre}-v${k + 1}-1920.png`;
    execFileSync('node', [SHOT, html, tmp]);
    const capa = await sharp(tmp).extract({ left: 0, top: 0, width: W, height: H }).removeAlpha().png().toBuffer();
    const top = await sharp(capa).joinChannel(mask).png().toBuffer();
    const f = `${OUT}${nombre}-v${k + 1}.png`;
    await sharp(final).composite([{ input: top }]).toFile(f);
    frames.push(f);
  }
  // loop A → B → C → A: 2,6 s por creatividad, fundido de 0,35 s (rotación de pantalla digital)
  const seq = [...frames, frames[0]], hold = 2.6, fade = 0.35;
  const inputs = seq.flatMap(f => ['-loop', '1', '-t', String(hold), '-i', f]);
  let fc = '', prev = '[0:v]', off = 0;
  for (let i = 1; i < seq.length; i++) { off += hold - fade; const o = i === seq.length - 1 ? '[v]' : `[x${i}]`; fc += `${prev}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${off.toFixed(2)}${o};`; prev = o; }
  const mp4 = `${OUT}${nombre}-loop.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', fc.replace(/;$/, ''), '-map', '[v]', '-t', (off + fade).toFixed(2), '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
  console.log(nombre, quads.length, 'pantallas →', mp4, fs.statSync(mp4).size);
}
