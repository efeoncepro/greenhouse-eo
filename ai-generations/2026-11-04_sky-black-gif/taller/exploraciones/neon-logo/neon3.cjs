// Neón v3: letras nítidas, el marco como tubo encendido, penumbra detrás y opacidad de la capa de luz.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const { mascaraKV, K } = require('./neon2.cjs');
const OUTD = __dirname + '/out4'; require('fs').mkdirSync(OUTD, { recursive: true });
const OPAC = { sutil: 0.45, medio: 0.72, fuerte: 1.0 };
const LETRA = [38, 222, 0];
const G = [60, 245, 25], CORE = [150, 255, 120]; // plano: sin núcleo blanco
const raw1 = (b, w, h) => sharp(b, { raw: { width: w, height: h, channels: 1 } });
function box(src, W, H, r) {
  const t = new Float32Array(src.length), o = new Float32Array(src.length), d = 2 * r + 1;
  for (let y = 0; y < H; y++) { let acc = 0; const row = y * W;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) { t[row + x] = acc / d; acc += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; } }
  for (let x = 0; x < W; x++) { let acc = 0;
    for (let y = -r; y <= r; y++) acc += t[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) { o[y * W + x] = acc / d; acc += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; } }
  return o;
}
function gauss(buf, W, H, s, norm) {
  let f = new Float32Array(buf.length); for (let i = 0; i < buf.length; i++) f[i] = buf[i] / 255;
  const r = Math.max(1, Math.round((Math.sqrt(4 * s * s + 1) - 1) / 2));
  f = box(box(box(f, W, H, r), W, H, r), W, H, r);
  if (norm) { let mx = 1e-6; for (const v of f) if (v > mx) mx = v; for (let i = 0; i < f.length; i++) f[i] /= mx; }
  return f;
}
const blurN0 = async (m, W, H, s) => { const b = await raw1(m, W, H).blur(s).extractChannel(0).raw().toBuffer(); let mx = 1; for (const v of b) if (v > mx) mx = v; const f = new Float32Array(b.length); for (let i = 0; i < b.length; i++) f[i] = b[i] / mx; return f; };
const blurR = async (m, W, H, s) => { const b = await raw1(m, W, H).blur(s).extractChannel(0).raw().toBuffer(); const f = new Float32Array(b.length); for (let i = 0; i < b.length; i++) f[i] = b[i] / 255; return f; };

async function mascaraFmt(mk, fmt, W, H) {
  if (fmt !== 'story') return raw1(mk.m, mk.w, mk.h).extract({ left: 0, top: 0, width: W, height: H }).extractChannel(0).raw().toBuffer();
  const { lb } = mk, s = 1.3, cw = Math.round(lb.w * s), ch = Math.round(lb.h * s);
  const c = await raw1(mk.m, mk.w, mk.h).extract({ left: lb.x, top: lb.y, width: lb.w, height: lb.h }).resize(cw, ch, { kernel: 'lanczos3' }).extractChannel(0).raw().toBuffer();
  const o = Buffer.alloc(W * H); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const X = lb.x + x, Y = 270 + y; if (X < W && Y < H) o[Y * W + X] = c[y * cw + x]; } return o;
}

async function alfaBlanca(n) {
  const { data, info } = await sharp(`${K}/parts/${n}__logo.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = Buffer.alloc(info.width * info.height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) { const g = Math.max(0, Math.min(1, (data[i + 1] - Math.max(data[i], data[i + 2]) - 40) / 100)); a[j] = Math.round(data[i + 3] * (1 - g)); }
  return { m: a, w: info.width, h: info.height, lb: null };
}
async function neon(src, mk, fmt, mb) {
  const { data: px, info } = await sharp(src).flatten({ background: '#000' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, sc = fmt === 'story' ? 1.3 : 1;
  const m = await mascaraFmt(mk, fmt, W, H);
  const t6 = gauss(m, W, H, 6 * sc, false);
  const frame = Buffer.alloc(W * H), letra = Buffer.alloc(W * H);
  const nucleo = Buffer.alloc(W * H);
  for (let j = 0; j < W * H; j++) nucleo[j] = t6[j] > 0.38 ? 255 : 0;
  const exp = gauss(nucleo, W, H, 7 * sc, false);                    // crece ~10 px: cubre bordes y trazos de la A
  const zona = new Uint8Array(W * H);
  for (let j = 0; j < W * H; j++) { const mm = m[j] / 255, th = exp[j] > 0.04 ? 1 : 0; zona[j] = th; letra[j] = Math.round(mm * th * 255); frame[j] = Math.round(mm * (1 - th) * 255); }
  const f2 = gauss(frame, W, H, 1.6 * sc, true), f6 = gauss(frame, W, H, 6 * sc, true), f22 = gauss(frame, W, H, 22 * sc, true), f60 = gauss(frame, W, H, 60 * sc, true), f140 = gauss(frame, W, H, 140 * sc, true);
  const l5 = gauss(letra, W, H, 5 * sc, true), l20 = gauss(letra, W, H, 20 * sc, true), l50 = gauss(letra, W, H, 50 * sc, true);
  const st = gauss(m, W, H, 90 * sc, true);
  const wb = await mascaraFmt({ ...mb, lb: mk.lb }, fmt, W, H);
  const full = new Float32Array(W * H * 3);
  for (let j = 0; j < W * H; j++) {
    const Lf = 1 - Math.exp(-(1.5 * f6[j] + 0.85 * f22[j] + 0.38 * f60[j] + 0.16 * f140[j]));
    const Ll = 1 - Math.exp(-(1.1 * l5[j] + 0.6 * l20[j] + 0.25 * l50[j]));
    const L = 1 - (1 - Lf) * (1 - Ll);
    const stage = 1 - 0.5 * Math.min(1, st[j] * 1.4);               // penumbra tras el letrero
    const core = Math.min(1, f2[j] * 1.25) * 0.55;                  // trazo del marco más claro, plano
    const lm = Math.min(1, (letra[j] / 255) * 1.0);
    for (let c = 0; c < 3; c++) {
      const o = px[j * 3 + c] / 255;
      let v = o * stage;
      v = v + (G[c] / 255) * L * (1 - v * 0.3);
      v = v + (CORE[c] / 255 - v) * core;
      if (zona[j]) { const cov = Math.min(1, lm * 1.2); v = v * (1 - cov) + (LETRA[c] / 255) * cov; } // letra = verde plano #26de00 sobre el halo
      const wm = (wb[j] / 255) * 0.8; v = v * (1 - wm) + o * wm;    // avión y textos blancos limpios
      full[j * 3 + c] = Math.max(0, Math.min(1, v));
    }
  }
  return { px, full, W, H };
}

module.exports = { neon, alfaBlanca, OPAC };
if (require.main === module) (async () => {
  for (const n of process.argv.slice(2)) {
    const mk = await mascaraKV(n), mb = await alfaBlanca(n);
    for (const [fmt, src] of Object.entries({ kv: `${K}/png/${n}.png`, popup: `${K}/formatos/${n}__popup.png`, story: `${K}/formatos/${n}__story.png` })) {
      const { px, full, W, H } = await neon(src, mk, fmt, mb);
      await sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${OUTD}/${n}__${fmt}__0-actual.png`);
      let i = 1;
      for (const [nom, op] of Object.entries(OPAC)) {
        const o = Buffer.alloc(px.length);
        for (let k = 0; k < px.length; k++) o[k] = Math.round((px[k] / 255 + (full[k] - px[k] / 255) * op) * 255);
        await sharp(o, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${OUTD}/${n}__${fmt}__${i++}-${nom}.png`);
      }
    }
    console.log(n);
  }
})();
