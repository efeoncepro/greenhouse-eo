// Compone anuncios de la marca de ejemplo en pantallas blancas de una foto (esquinas medidas + homografía).
// Uso: node componer-pantallas.mjs <base.png> <salida.png> '<json [{seed:[x,y], box:[x0,y0,x1,y1], w, h, ad:{...}}]>'
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { nortAd, FONTS, HERO, SHOE } from './nortica.mjs';
import * as UI from './ui.mjs';
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json');
const sharp = require('sharp');
const SHOT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs';
const [base, out, spec] = process.argv.slice(2);
const items = JSON.parse(spec).map(it => it.ui ? it : ({ ...it, ad: { ...it.ad, img: it.ad.img === 'SHOE' ? SHOE : HERO } }));
const { data, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const BLUE = process.env.SCREEN === 'blue';
const ok = (x, y) => { const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2]; return BLUE ? (b > 150 && b > r + 70 && b > g + 20) : (Math.min(r, g, b) > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 34); };
const region = (seed, [x0, y0, x1, y1]) => {
  const seen = new Uint8Array(W * H), st = [seed], pts = [];
  while (st.length) { const [x, y] = st.pop(); if (x < x0 || y < y0 || x >= x1 || y >= y1) continue; const k = y * W + x; if (seen[k]) continue; seen[k] = 1; if (!ok(x, y)) continue; pts.push([x, y]); st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  // bordes rectos: recta por cada lado usando sólo el tramo central (las esquinas redondeadas no cuentan)
  const bb = pts.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1, -1]);
  const rows = new Map(), cols = new Map();
  for (const [x, y] of pts) { const r = rows.get(y) || [1e9, -1]; rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]); const c = cols.get(x) || [1e9, -1]; cols.set(x, [Math.min(c[0], y), Math.max(c[1], y)]); }
  const fit = (pairs) => { const n = pairs.length, sx = pairs.reduce((a, p) => a + p[0], 0), sy = pairs.reduce((a, p) => a + p[1], 0), sxx = pairs.reduce((a, p) => a + p[0] * p[0], 0), sxy = pairs.reduce((a, p) => a + p[0] * p[1], 0); const m = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1); return [m, (sy - m * sx) / n]; };
  const hb = bb[3] - bb[1], wb = bb[2] - bb[0];
  const mid = (map, lo, hi, k) => [...map].filter(([t]) => t > lo && t < hi).map(([t, v]) => [t, v[k]]);
  const L = fit(mid(rows, bb[1] + hb * 0.25, bb[3] - hb * 0.25, 0)), Rr = fit(mid(rows, bb[1] + hb * 0.25, bb[3] - hb * 0.25, 1)); // x = m*y + b
  const T = fit(mid(cols, bb[0] + wb * 0.25, bb[2] - wb * 0.25, 0)), Bt = fit(mid(cols, bb[0] + wb * 0.25, bb[2] - wb * 0.25, 1)); // y = m*x + b
  const meet = ([ma, ba], [mb, bbb]) => { const y = (mb * ba + bbb) / (1 - mb * ma), x = ma * y + ba; return [x, y]; }; // x=ma*y+ba ; y=mb*x+bbb
  return { n: pts.length, q: [meet(L, T), meet(Rr, T), meet(Rr, Bt), meet(L, Bt)] };
};
const homography = (w, h, q) => {
  const src = [[0, 0], [w, 0], [w, h], [0, h]], M = [];
  src.forEach(([x, y], i) => { const [u, v] = q[i]; M.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]); M.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]); });
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= 8; k++) M[r][k] -= f * M[c][k]; } }
  const [a, b, c, d, e, f, g, hh] = M.map((r, i) => r[8] / r[i]);
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
};
let overlay = '';
const meta = [];
for (const it of items) {
  const { q, n } = region(it.seed, it.box);
  const cx = q.reduce((a, p) => a + p[0], 0) / 4, cy = q.reduce((a, p) => a + p[1], 0) / 4, g = it.grow ?? 0.012;
  const quad = q.map(([x, y]) => [x + (x - cx) * g, y + (y - cy) * g]);
  meta.push({ n, quad });
  overlay += `<div style="position:absolute;left:0;top:0;width:${it.w}px;height:${it.h}px;transform-origin:0 0;transform:${homography(it.w, it.h, quad)};overflow:hidden">${it.ui ? UI[it.ui](it.w, it.h, it.opts || {}) : nortAd(it.w, it.h, it.ad)}</div>`;
}
const html = out.replace(/\.png$/, '.html');
fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONTS}&family=Poppins:wght@400;600&${UI.UI_FONTS}&display=swap"><style>body{margin:0;background:#000}</style></head><body><div style="position:relative;width:1920px;height:1080px;overflow:hidden"><img src="file://${base}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px">${overlay}</div></body></html>`);
const tmp = out.replace(/\.png$/, '-1920.png');
execFileSync('node', [SHOT, html, tmp]);
// sólo donde la foto tenía pantalla blanca (dilatada 1 px): calza con las esquinas redondeadas y respeta dedos y marco
const comp = await sharp(tmp).extract({ left: 0, top: 0, width: W, height: H }).removeAlpha().png().toBuffer();
const m = Buffer.alloc(W * H);
for (let p = 0, i = 0; p < m.length; p++, i += C) { const r = data[i], g2 = data[i + 1], b = data[i + 2]; m[p] = (BLUE ? (b > 120 && b > r + 50 && b > g2 + 10) : (Math.min(r, g2, b) > 175 && Math.max(r, g2, b) - Math.min(r, g2, b) < 45)) ? 255 : 0; }
const mask = await sharp(m, { raw: { width: W, height: H, channels: 1 } }).blur(0.8).png().toBuffer();
await sharp(base).composite([{ input: await sharp(comp).joinChannel(mask).png().toBuffer() }]).toFile(out);
fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify(meta));
console.log(JSON.stringify(meta));
