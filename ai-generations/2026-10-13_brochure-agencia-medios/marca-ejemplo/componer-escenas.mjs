// Compone los anuncios de la marca de ejemplo en la valla del juego y en la pantalla del teléfono (determinístico).
// Las esquinas se miden en la foto (píxeles blancos planos); la valla va en perspectiva (homografía → matrix3d).
// Después ai:inpaint termina sólo materia y luz.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { nortAd, FONTS } from './nortica.mjs';
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json');
const sharp = require('sharp');
const DIR = new URL('.', import.meta.url).pathname;
const SHOT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs';

const whiteRegion = async (file, box, seed) => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels, pts = [];
  const ok = (x, y) => { const i = (y * W + x) * C, r = data[i], g = data[i + 1], b = data[i + 2]; return Math.min(r, g, b) > 215 && Math.max(r, g, b) - Math.min(r, g, b) < 26; };
  // relleno conectado desde la semilla: sólo la cara blanca continua
  const seen = new Uint8Array(W * H), st = [seed];
  while (st.length) { const [x, y] = st.pop(); if (x < box.x0 || y < box.y0 || x >= box.x1 || y >= box.y1) continue; const k = y * W + x; if (seen[k]) continue; seen[k] = 1; if (!ok(x, y)) continue; pts.push([x, y]); st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  const ext = (f) => pts.reduce((a, p) => (f(p) > f(a) ? p : a));
  return { n: pts.length, tl: ext(p => -(p[0] + p[1])), tr: ext(p => p[0] - p[1]), br: ext(p => p[0] + p[1]), bl: ext(p => p[1] - p[0]),
    bbox: pts.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1, -1]) };
};

// homografía rect (0,0,w,h) → quad
const homography = (w, h, q) => {
  const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], B = [];
  src.forEach(([x, y], i) => { const [u, v] = q[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v); });
  const n = 8, M = A.map((r, i) => [...r, B[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  const s = M.map((r, i) => r[n] / r[i]); // a b c d e f g h
  const [a, b, c, d, e, f, g, hh] = s; // u=(a x+b y+c)/(g x+h y+1)
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
};

const page = (img, iw, ih, overlay) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONTS}&family=Poppins:wght@400;600&display=swap"><style>body{margin:0;background:#000}</style></head><body><div style="position:relative;width:1920px;height:1080px;overflow:hidden"><img src="file://${img}" style="position:absolute;left:0;top:0;width:${iw}px;height:${ih}px">${overlay}</div></body></html>`;

// 1) juego: luces rojas → frío; valla en perspectiva
{
  const base = `${DIR}juego-base.png`, fria = `${DIR}juego-fria.png`;
  const { data, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (false && r > 30 && r > g * 1.25 && r > b * 1.15) { const v = Math.max(r, g, b), t = Math.min(1, (r - Math.max(g, b)) / 40); data[i] = Math.round(r * (1 - t) + v * 0.55 * t); data[i + 1] = Math.round(g * (1 - t) + v * 0.8 * t); data[i + 2] = Math.round(b * (1 - t) + v * t); }
  }
  await sharp(data, { raw: info }).png().toFile(fria);
  const q = await whiteRegion(fria, { x0: 1100, y0: 0, x1: 1460, y1: 400 }, [1280, 190]);
  console.log('valla', q);
  const w = 1200, h = Math.round(1200 * 0.48), inset = 2;
  const quad = [q.tl, q.tr, q.br, q.bl].map(([x, y], i) => [x + (i === 0 || i === 3 ? -inset : inset), y + (i < 2 ? -inset : inset)]);
  const ad = `<div style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;transform:${homography(w, h, quad)};overflow:hidden">${nortAd(w, h, { pos: '30% 45%', kind: 'wide' })}</div>`;
  fs.writeFileSync(`${DIR}juego-comp.html`, page(fria, 1536, 1024, ad));
  execFileSync('node', [SHOT, `${DIR}juego-comp.html`, `${DIR}_juego-1920.png`]);
  await sharp(`${DIR}_juego-1920.png`).extract({ left: 0, top: 0, width: 1536, height: 1024 }).toFile(`${DIR}juego-comp.png`);
  fs.writeFileSync(`${DIR}juego-quad.json`, JSON.stringify({ quad, bbox: q.bbox }));
}

// 2) teléfono: interstitial en la pantalla, recortado por la propia forma de la pantalla
{
  const base = `${DIR}telefono-base.png`;
  const q = await whiteRegion(base, { x0: 500, y0: 20, x1: 1050, y1: 960 }, [770, 470]);
  console.log('pantalla', q.bbox, q.n);
  const [x0, y0, x1, y1] = q.bbox, w = x1 - x0 + 1, h = y1 - y0 + 1;
  const ad = `<div style="position:absolute;left:${x0}px;top:${y0}px;width:${w}px;height:${h}px;border-radius:${Math.round(w * 0.11)}px;overflow:hidden">${nortAd(w, h, { pos: '24% 50%', kind: 'tall' })}
<div style="position:absolute;right:${Math.round(w * 0.05)}px;top:${Math.round(w * 0.05)}px;width:${Math.round(w * 0.085)}px;height:${Math.round(w * 0.085)}px;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;font:600 ${Math.round(w * 0.05)}px Poppins;display:flex;align-items:center;justify-content:center">×</div></div>`;
  fs.writeFileSync(`${DIR}telefono-comp.html`, page(base, 1536, 1024, ad));
  execFileSync('node', [SHOT, `${DIR}telefono-comp.html`, `${DIR}_tel-1920.png`]);
  const comp = await sharp(`${DIR}_tel-1920.png`).extract({ left: 0, top: 0, width: 1536, height: 1024 }).png().toBuffer();
  // sólo dentro de la pantalla: máscara = píxeles blancos (dilatada 1 px), el marco y los dedos quedan del original
  const { data, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
  const m = Buffer.alloc(info.width * info.height);
  for (let p = 0, i = 0; p < m.length; p++, i += info.channels) { const r = data[i], g = data[i + 1], b = data[i + 2]; m[p] = Math.min(r, g, b) > 200 && Math.max(r, g, b) - Math.min(r, g, b) < 30 ? 255 : 0; }
  const mask = await sharp(m, { raw: { width: info.width, height: info.height, channels: 1 } }).blur(0.8).png().toBuffer();
  const top = await sharp(comp).removeAlpha().joinChannel(mask).png().toBuffer();
  await sharp(base).composite([{ input: top }]).toFile(`${DIR}telefono-comp.png`);
  fs.writeFileSync(`${DIR}telefono-quad.json`, JSON.stringify({ bbox: q.bbox }));
}
