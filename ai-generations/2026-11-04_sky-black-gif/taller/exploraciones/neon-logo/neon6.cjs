// Neón elegante: acentos de las esquinas del marco encendidos; escalada contenida. Sin niebla ni penumbra.
// Geometría: el SVG del logo cae en el KV a escala 1 con (+59, +53). Taller en solo lectura.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const fs = require('fs');
const K = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif/taller/kvhm-canvas';
const OUTD = __dirname + '/out6'; fs.mkdirSync(OUTD, { recursive: true });
const FRAME_TOP = 134, LETRA = [38, 222, 0], HALO = [80, 255, 45], CORE = [240, 255, 235];
const OPCIONES = {
  '1-acentos': { acento: 1, marco: 0, letras: 0 },
  '2-acentos-marco': { acento: 1, marco: 1, letras: 0 },
  '3-acentos-marco-letras': { acento: 1, marco: 1, letras: 1 },
};
const raw1 = (b, w, h) => sharp(b, { raw: { width: w, height: h, channels: 1 } });
function box(src, W, H, r) {
  const t = new Float32Array(src.length), o = new Float32Array(src.length), d = 2 * r + 1;
  for (let y = 0; y < H; y++) { let a = 0; const row = y * W;
    for (let x = -r; x <= r; x++) a += src[row + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) { t[row + x] = a / d; a += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; } }
  for (let x = 0; x < W; x++) { let a = 0;
    for (let y = -r; y <= r; y++) a += t[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) { o[y * W + x] = a / d; a += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; } }
  return o;
}
function gauss(buf, W, H, s, norm) {
  let f = new Float32Array(buf.length); for (let i = 0; i < buf.length; i++) f[i] = buf[i] / 255;
  const r = Math.max(1, Math.round((Math.sqrt(4 * s * s + 1) - 1) / 2));
  f = box(box(box(f, W, H, r), W, H, r), W, H, r);
  if (norm) { let mx = 1e-6; for (const v of f) if (v > mx) mx = v; for (let i = 0; i < f.length; i++) f[i] /= mx; }
  return f;
}
// Máscaras en coordenadas del KV: verde, letras (núcleo grueso crecido), marco y peso de acentos.
async function mascarasKV(n) {
  const { data, info } = await sharp(`${K}/parts/${n}__logo.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, m = Buffer.alloc(W * H);
  let lb = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]], y = (j / W) | 0, x = j % W;
    m[j] = y < FRAME_TOP ? 0 : Math.round(Math.max(0, Math.min(1, (g - Math.max(r, b) - 40) / 100)) * a);
    if (a > 40) { lb.x0 = Math.min(lb.x0, x); lb.x1 = Math.max(lb.x1, x); lb.y0 = Math.min(lb.y0, y); lb.y1 = Math.max(lb.y1, y); }
  }
  const t6 = gauss(m, W, H, 6, false), nuc = Buffer.alloc(W * H);
  for (let j = 0; j < W * H; j++) nuc[j] = t6[j] > 0.38 ? 255 : 0;
  const ex = gauss(nuc, W, H, 7, false);
  const letra = Buffer.alloc(W * H), marco = Buffer.alloc(W * H), acento = Buffer.alloc(W * H);
  const L = 25.54 + 59, R = 540.49 + 59, T = 81.56 + 53, B = 242.49 + 53, r = 18.49, arc = Math.PI * r / 4;
  const peso = (x, y) => {
    // Arriba-izquierda: lado izquierdo hasta y=176.72+53, esquina y borde superior hasta x=79.53+59.
    const cx = L + r, cy = T + r;
    if (x < cx && y < 176.72 + 53 + 2 && x < L + 8) { const d = y < cy ? arc * (cy - y) / r : arc + (y - cy); return Math.pow(Math.max(0, 1 - Math.max(0, d) / (arc + 176.72 + 53 - cy)), 1.4); }
    if (y < cy && x < 79.53 + 59 + 2 && y < T + 8) { const d = x < cx ? arc * (cx - x) / r : arc + (x - cx); return Math.pow(Math.max(0, 1 - Math.max(0, d) / (arc + 79.53 + 59 - cx)), 1.4); }
    // Abajo-derecha: lado derecho desde y=181.11+53, esquina y borde inferior hasta x=514.10+59.
    const dx = R - r, dy = B - r;
    if (x > dx && y > 181.11 + 53 - 2 && x > R - 8) { const d = y > dy ? arc * (y - dy) / r : arc + (dy - y); return Math.pow(Math.max(0, 1 - Math.max(0, d) / (arc + dy - (181.11 + 53))), 1.4); }
    if (y > dy && x > 514.10 + 59 - 2 && y > B - 8) { const d = x > dx ? arc * (x - dx) / r : arc + (dx - x); return Math.pow(Math.max(0, 1 - Math.max(0, d) / (arc + dx - (514.10 + 59))), 1.4); }
    return 0;
  };
  for (let j = 0; j < W * H; j++) {
    const mm = m[j], esL = ex[j] > 0.04;
    letra[j] = esL ? mm : 0; marco[j] = esL ? 0 : mm;
    if (!esL && mm) acento[j] = Math.round(mm * Math.min(1, peso(j % W, (j / W) | 0)));
  }
  return { W, H, letra, marco, acento, lb: { x: lb.x0, y: lb.y0, w: lb.x1 - lb.x0 + 1, h: lb.y1 - lb.y0 + 1 } };
}
// Lleva una máscara del KV al formato (story: logo al 130 %, (lb.x, lb.y) → (lb.x, 270)).
async function aFmt(buf, mk, fmt, W, H) {
  if (fmt !== 'story') return raw1(buf, mk.W, mk.H).extract({ left: 0, top: 0, width: W, height: H }).extractChannel(0).raw().toBuffer();
  const { lb } = mk, s = 1.3, cw = Math.round(lb.w * s), ch = Math.round(lb.h * s);
  const c = await raw1(buf, mk.W, mk.H).extract({ left: lb.x, top: lb.y, width: lb.w, height: lb.h }).resize(cw, ch, { kernel: 'lanczos3' }).extractChannel(0).raw().toBuffer();
  const o = Buffer.alloc(W * H); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const X = lb.x + x, Y = 270 + y; if (X < W && Y < H) o[Y * W + X] = c[y * cw + x]; } return o;
}
// Devuelve una función que pinta la pieza con una opción e intensidad (0–1) dadas.
async function preparar(src, mk, fmt) {
  const { data: px, info } = await sharp(src).flatten({ background: '#000' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, sc = fmt === 'story' ? 1.3 : 1;
  const [ac, mc, le] = [await aFmt(mk.acento, mk, fmt, W, H), await aFmt(mk.marco, mk, fmt, W, H), await aFmt(mk.letra, mk, fmt, W, H)];
  const a1 = gauss(ac, W, H, 1.1 * sc, true), a3 = gauss(ac, W, H, 3 * sc, true), a9 = gauss(ac, W, H, 9 * sc, true);
  const m2 = gauss(mc, W, H, 2.2 * sc, true), l3 = gauss(le, W, H, 3 * sc, true), l9 = gauss(le, W, H, 9 * sc, true);
  return (op, k = 1, extra = null) => {
    const o = Buffer.alloc(px.length);
    for (let j = 0; j < W * H; j++) {
      let L = 0, core = 0;
      if (op.acento) { L += k * (1.1 * a3[j] + 0.45 * a9[j]); core = Math.max(core, k * Math.min(1, a1[j] * 1.4) * 0.9); }
      if (op.marco) { L += k * 0.5 * m2[j]; core = Math.max(core, k * Math.min(1, (mc[j] / 255)) * 0.22); }
      if (op.letras) L += k * (0.75 * l3[j] + 0.3 * l9[j]);
      if (extra) { const e = extra(j); L += e.L; core = Math.max(core, e.core); }
      L = 1 - Math.exp(-L);
      const cov = Math.min(1, (le[j] / 255) * 1.2);
      for (let c = 0; c < 3; c++) {
        let v = px[j * 3 + c] / 255;
        v = v + (HALO[c] / 255) * L * (1 - v * 0.55);
        v = v + (CORE[c] / 255 - v) * core;
        if (op.letras && cov) v = v * (1 - cov) + (LETRA[c] / 255) * cov;
        o[j * 3 + c] = Math.round(Math.max(0, Math.min(1, v)) * 255);
      }
    }
    return { buf: o, W, H };
  };
}
const guardar = (r, f) => sharp(r.buf, { raw: { width: r.W, height: r.H, channels: 3 } }).png().toFile(f);
module.exports = { mascarasKV, preparar, guardar, aFmt, gauss, OPCIONES, K, OUTD };
if (require.main === module) (async () => {
  const [n, fmt] = process.argv.slice(2);
  const mk = await mascarasKV(n);
  const src = fmt === 'kv' ? `${K}/png/${n}.png` : `${K}/formatos/${n}__${fmt}.png`;
  const pinta = await preparar(src, mk, fmt);
  for (const [nom, op] of Object.entries(OPCIONES)) await guardar(pinta(op), `${OUTD}/${n}__${fmt}__${nom}.png`);
  console.log(n, fmt, 'ok');
})();
