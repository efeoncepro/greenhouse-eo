// Logo BLACK con neón (ronda 4, acentos de esquina) en PNG grande: transparente y sobre negro, ES/PT/EN.
// Base: logo corregido de 4000 px (logo-export.cjs). Marco medido: centro de trazo L 159, R 3379, B 1577 → escala 6,253.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const fs = require('fs');
const { gauss } = require('./neon6.cjs');
const SRC = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif/logo-black';
const OUT = __dirname + '/logo-neon'; fs.mkdirSync(OUT, { recursive: true });
const HALO = [80, 255, 45], CORE = [240, 255, 235];
const OPC = { '0-ACTUAL': null, '1-ACENTOS': { m: 0, l: 0 }, '2-ACENTOS-MARCO': { m: 1, l: 0 }, '3-ACENTOS-MARCO-LETRAS': { m: 1, l: 1 } };
const PAD = 300;
// peso de acento en coordenadas del KV (misma función que neon6: SVG + (59, 53), escala 1)
const Lk = 25.54 + 59, Rk = 540.49 + 59, Tk = 81.56 + 53, Bk = 242.49 + 53, r = 18.49, arc = Math.PI * r / 4;
function peso(x, y) {
  const cx = Lk + r, cy = Tk + r;
  if (x < cx && y < 176.72 + 53 + 2 && x < Lk + 8) { const d = y < cy ? arc * (cy - y) / r : arc + (y - cy); return Math.pow(Math.max(0, 1 - Math.max(0, d) / (arc + 176.72 + 53 - cy)), 1.4); }
  if (y < cy && x < 79.53 + 59 + 2 && y < Tk + 8) { const d = x < cx ? arc * (cx - x) / r : arc + (x - cx); return Math.pow(Math.max(0, 1 - Math.max(0, d) / (arc + 79.53 + 59 - cx)), 1.4); }
  const dx = Rk - r, dy = Bk - r;
  if (x > dx && y > 181.11 + 53 - 2 && x > Rk - 8) { const d = y > dy ? arc * (y - dy) / r : arc + (dy - y); return Math.pow(Math.max(0, 1 - Math.max(0, d) / (arc + dy - (181.11 + 53))), 1.4); }
  if (y > dy && x > 514.10 + 59 - 2 && y > Bk - 8) { const d = x > dx ? arc * (x - dx) / r : arc + (dx - x); return Math.pow(Math.max(0, 1 - Math.max(0, d) / (arc + dx - (514.10 + 59))), 1.4); }
  return 0;
}
(async () => {
  for (const lang of ['ES', 'PT', 'EN']) {
    const base = await sharp(`${SRC}/SKY_LOGO_BLACK_${lang}_4000px.png`).ensureAlpha().extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } }).raw().toBuffer({ resolveWithObject: true });
    const W = base.info.width, H = base.info.height, px = base.data;
    // marco medido en el PNG por idioma (borde exterior → centro del trazo)
    const g = (x, y) => { const i = (y * W + x) * 4; return px[i + 3] > 128 && px[i + 1] - Math.max(px[i], px[i + 2]) > 100; };
    const cols = new Array(W).fill(0), rows = new Array(H).fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g(x, y)) { cols[x]++; rows[y]++; }
    const L0 = cols.findIndex(c => c > 300), R0 = W - 1 - [...cols].reverse().findIndex(c => c > 300), B0 = H - 1 - [...rows].reverse().findIndex(c => c > 50);
    const s = (R0 - L0) / (514.95 + 1.99), Lc = L0 + s, Bc = B0 - s, Tc = Bc - 160.93 * s;
    const kx = x => Lk + (x - Lc) / s, ky = y => Tk + (y - Tc) / s;
    const m = Buffer.alloc(W * H);
    for (let j = 0, i = 0; j < W * H; j++, i += 4) {
      const y = (j / W) | 0; if (y < Tc - 3 * s) continue;            // avión y bajada fuera
      m[j] = Math.round(Math.max(0, Math.min(1, (px[i + 1] - Math.max(px[i], px[i + 2]) - 40) / 100)) * px[i + 3]);
    }
    const t6 = gauss(m, W, H, 6 * s, false), nuc = Buffer.alloc(W * H);
    for (let j = 0; j < W * H; j++) nuc[j] = t6[j] > 0.38 ? 255 : 0;
    const ex = gauss(nuc, W, H, 7 * s, false), le = Buffer.alloc(W * H), mc = Buffer.alloc(W * H), ac = Buffer.alloc(W * H);
    for (let j = 0; j < W * H; j++) {
      if (!m[j]) continue; const esL = ex[j] > 0.04;
      if (esL) le[j] = m[j]; else { mc[j] = m[j]; const w = peso(kx(j % W), ky((j / W) | 0)); if (w) ac[j] = Math.round(m[j] * Math.min(1, w)); }
    }
    const a1 = gauss(ac, W, H, 1.1 * s, true), a3 = gauss(ac, W, H, 3 * s, true), a9 = gauss(ac, W, H, 9 * s, true);
    const m2 = gauss(mc, W, H, 2.2 * s, true), l3 = gauss(le, W, H, 3 * s, true), l9 = gauss(le, W, H, 9 * s, true);
    const bufs = {};
    for (const [nom, op] of Object.entries(OPC)) {
      const o = Buffer.alloc(px.length);
      for (let j = 0, i = 0; j < W * H; j++, i += 4) {
        let L = 0, core = 0;
        if (op) {
          L = 1.1 * a3[j] + 0.45 * a9[j]; core = Math.min(1, a1[j] * 1.4) * 0.9;
          if (op.m) { L += 0.5 * m2[j]; core = Math.max(core, (mc[j] / 255) * 0.22); }
          if (op.l) L += 0.75 * l3[j] + 0.3 * l9[j];
          L = 1 - Math.exp(-L);
        }
        // capas: halo (debajo) → logo → núcleo de los acentos (encima)
        let R = HALO[0] / 255 * L, G = HALO[1] / 255 * L, Bb = HALO[2] / 255 * L, A = L;   // premultiplicado
        const la = px[i + 3] / 255;
        R = px[i] / 255 * la + R * (1 - la); G = px[i + 1] / 255 * la + G * (1 - la); Bb = px[i + 2] / 255 * la + Bb * (1 - la); A = la + A * (1 - la);
        R = CORE[0] / 255 * core + R * (1 - core); G = CORE[1] / 255 * core + G * (1 - core); Bb = CORE[2] / 255 * core + Bb * (1 - core); A = core + A * (1 - core);
        if (A > 0) { o[i] = Math.round(Math.min(1, R / A) * 255); o[i + 1] = Math.round(Math.min(1, G / A) * 255); o[i + 2] = Math.round(Math.min(1, Bb / A) * 255); }
        o[i + 3] = Math.round(Math.min(1, A) * 255);
      }
      bufs[nom] = o;
    }
    // un solo encuadre para las cuatro opciones: lo visible de la opción más amplia + 3 % de margen
    const ref = bufs['3-ACENTOS-MARCO-LETRAS']; let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let j = 0; j < W * H; j++) if (ref[j * 4 + 3] > 2) { const x = j % W, y = (j / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const mg = Math.round((x1 - x0) * 0.03), box = { left: Math.max(0, x0 - mg), top: Math.max(0, y0 - mg) };
    box.width = Math.min(W, x1 + mg + 1) - box.left; box.height = Math.min(H, y1 + mg + 1) - box.top;
    for (const [nom, o] of Object.entries(bufs)) {
      const fin = await sharp(o, { raw: { width: W, height: H, channels: 4 } }).extract(box).resize({ width: 4000, kernel: 'lanczos3' }).png().toBuffer();
      const f = `${OUT}/SKY_LOGO_BLACK_NEON_${lang}_${nom}_4000px`;
      await sharp(fin).png().toFile(`${f}.png`);
      await sharp(fin).flatten({ background: '#000' }).png().toFile(`${f}_SOBRE-NEGRO.png`);
    }
    console.log(lang, { s: s.toFixed(3), Lc, Tc: Tc.toFixed(1), Bc, W, H });
  }
})();
