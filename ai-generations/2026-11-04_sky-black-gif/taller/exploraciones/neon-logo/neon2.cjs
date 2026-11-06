// Exploración neón v2 del logo BLACK: luz aditiva, núcleo de tubo y derrame. Taller en solo lectura.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif/taller/kvhm-canvas';
const OUTD = __dirname + '/out'; require('fs').mkdirSync(OUTD, { recursive: true });
const NIVELES = {
  sutil:  { k: 0.55, thin: 0.5, thick: 0.10, capas: [[3, 0.9], [12, 0.55], [34, 0.25]], noche: 0 },
  medio:  { k: 0.95, thin: 0.8, thick: 0.22, capas: [[3, 1.0], [12, 0.8], [34, 0.5], [80, 0.22]], noche: 0.12 },
  fuerte: { k: 1.45, thin: 1.0, thick: 0.34, capas: [[3, 1.0], [12, 0.95], [34, 0.7], [80, 0.42]], noche: 0.28 },
};
const FRAME_TOP = 134; // y del KV: sobre el marco sólo hay avión y bajada
const BLOOM = [70, 255, 35];   // verde neón (de la familia #26de00, más luminoso)
const CORE = [235, 255, 225];  // núcleo del tubo encendido

async function mascaraKV(n) {
  const { data, info } = await sharp(`${K}/parts/${n}__logo.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const m = Buffer.alloc(info.width * info.height); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    m[j] = ((j / info.width) | 0) < FRAME_TOP ? 0 : Math.round(Math.max(0, Math.min(1, (g - Math.max(r, b) - 40) / 100)) * a);
    if (a > 40) { const x = j % info.width, y = (j / info.width) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { m, w: info.width, h: info.height, lb: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
}
const raw1 = (buf, w, h) => sharp(buf, { raw: { width: w, height: h, channels: 1 } });

// Lleva la máscara del KV al lienzo del formato con la misma geometría de compose.cjs.
async function mascaraFmt(mk, fmt, W, H) {
  if (fmt !== 'story') return raw1(mk.m, mk.w, mk.h).extract({ left: 0, top: 0, width: W, height: H }).extractChannel(0).raw().toBuffer();
  const { lb } = mk, s = 1.3;
  const c = await raw1(mk.m, mk.w, mk.h).extract({ left: lb.x, top: lb.y, width: lb.w, height: lb.h })
    .resize(Math.round(lb.w * s), Math.round(lb.h * s), { kernel: 'lanczos3' }).extractChannel(0).raw().toBuffer();
  const cw = Math.round(lb.w * s), ch = Math.round(lb.h * s), o = Buffer.alloc(W * H);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const X = lb.x + x, Y = 270 + y; if (X < W && Y < H) o[Y * W + X] = c[y * cw + x];
  }
  return o;
}
const blur = async (m, W, H, s) => raw1(m, W, H).blur(s).extractChannel(0).raw().toBuffer();

async function aplicar(src, mk, fmt, nv, out) {
  const base = await sharp(src).flatten({ background: '#000' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = base.info.width, H = base.info.height, px = base.data;
  const m = await mascaraFmt(mk, fmt, W, H);
  const bl = []; for (const [s] of nv.capas) bl.push(await blur(m, W, H, s * (fmt === 'story' ? 1.3 : 1)));
  const b6 = await blur(m, W, H, 6), b60 = await blur(m, W, H, 60);
  const o = Buffer.alloc(px.length);
  for (let j = 0; j < W * H; j++) {
    let L = 0; nv.capas.forEach(([, a], i) => { L += a * bl[i][j] / 255; }); L = (1 - Math.exp(-L * nv.k * 1.6)) * (1 - 0.7 * (m[j] / 255)); // dentro del trazo, el verde de marca manda
    const mm = m[j] / 255, t6 = b6[j] / 255;
    const thick = Math.max(0, Math.min(1, (t6 - 0.62) / 0.33));          // centro de letras gruesas
    const thin = mm * (1 - Math.max(0, Math.min(1, (t6 - 0.18) / 0.3))); // trazos finos (marco)
    const core = Math.min(1, thick * nv.thick + thin * nv.thin);
    const noche = 1 - nv.noche * Math.min(1, (b60[j] / 255) * 3.2);     // sombra de escena tras el neón
    for (let c = 0; c < 3; c++) {
      let v = px[j * 3 + c] / 255 * noche;
      v = v + (BLOOM[c] / 255) * L * (1 - v * 0.35);                    // luz aditiva suavizada
      v = v + (CORE[c] / 255 - v) * core;
      o[j * 3 + c] = Math.round(Math.max(0, Math.min(1, v)) * 255);
    }
  }
  await sharp(o, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
}

module.exports = { aplicar, mascaraKV, NIVELES, K };
if (require.main === module) (async () => {
  for (const n of process.argv.slice(2)) {
    const mk = await mascaraKV(n);
    const fuentes = { kv: `${K}/png/${n}.png`, popup: `${K}/formatos/${n}__popup.png`, story: `${K}/formatos/${n}__story.png` };
    for (const [fmt, src] of Object.entries(fuentes)) {
      await sharp(src).flatten({ background: '#000' }).removeAlpha().png().toFile(`${OUTD}/${n}__${fmt}__0-actual.png`);
      let i = 1; for (const [nom, nv] of Object.entries(NIVELES)) await aplicar(src, mk, fmt, nv, `${OUTD}/${n}__${fmt}__${i++}-${nom}.png`);
    }
    console.log(n, mk.lb);
  }
})();
