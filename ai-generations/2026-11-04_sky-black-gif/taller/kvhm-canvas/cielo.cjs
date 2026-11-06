// Cielo más azul y menos claro sin generar (Daniela, Frame 2026-11-06, Buenos Aires: «el cielo puede ser menos claro y un
// poco más azul, sin exagerar»). Máscara de cielo = píxeles claros y azulados/neutros de la mitad superior, suavizada;
// sobre ella se mezcla un azul medio (multiplicar al 40 %) y se baja la luz. No toca personas ni edificios oscuros.
// Uso: node cielo.cjs <entrada> <salida> [fuerza 0-1, defecto .45]
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [, , src, dst, f = '0.45'] = process.argv, K = +f;
(async () => {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, m = Buffer.alloc(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2];
    const L = 0.299 * r + 0.587 * g + 0.114 * b, sat = Math.max(r, g, b) - Math.min(r, g, b);
    const cielo = L > 110 && b > r + 18 && b >= g; // sólo azulados: nubes, obelisco y fachadas claras quedan como están
    const alto = Math.max(0, Math.min(1, (0.62 - y / H) / 0.22)); // se apaga entre 40 % y 62 % del alto
    m[y * W + x] = cielo ? Math.round(255 * alto) : 0;
  }
  const mask = await sharp(m, { raw: { width: W, height: H, channels: 1 } }).blur(6).toBuffer();
  const out = Buffer.from(data);
  for (let p = 0; p < W * H; p++) {
    const a = (mask[p] / 255) * K; if (!a) continue;
    const i = p * 3;
    const tr = data[i] * 0x55 / 255, tg = data[i + 1] * 0x8c / 255, tb = data[i + 2] * 0xd6 / 255; // multiplicar por azul medio
    out[i] = Math.round(data[i] * (1 - a) + tr * a); out[i + 1] = Math.round(data[i + 1] * (1 - a) + tg * a); out[i + 2] = Math.round(data[i + 2] * (1 - a) + tb * a);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(dst);
  console.log(dst);
})();
