// Logo como vinilo sobre el panel de la foto original: color del logo × sombreado real del panel, borde suave y grano.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp'); const S = process.argv[2];
(async () => {
  const B = await sharp(`${S}/base-v1.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const W = B.info.width, H = B.info.height, b = B.data;
  const c = await sharp(`${S}/comp.png`).removeAlpha().blur(0.45).raw().toBuffer();
  const m = await sharp(`${S}/logo-mask.png`).extractChannel(0).blur(0.45).raw().toBuffer();
  // referencia de blanco del panel: percentil alto de la luminancia en la caja del logo
  const vals = []; for (let i = 0; i < W * H; i++) if (m[i] > 0) vals.push((b[i * 3] + b[i * 3 + 1] + b[i * 3 + 2]) / 3); vals.sort((x, y) => x - y); const ref = vals[Math.floor(vals.length * 0.97)];
  const o = Buffer.from(b); let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < W * H; i++) { const t = m[i] / 255; if (t <= 0) continue;
    for (let k = 0; k < 3; k++) { const panel = b[i * 3 + k]; const shade = panel / Math.max(1, ref * (b[i * 3 + 0] + b[i * 3 + 1] + b[i * 3 + 2]) / 3 / ((b[i * 3 + 0] + b[i * 3 + 1] + b[i * 3 + 2]) / 3)) ;
      const logoCol = (c[i * 3 + k] - b[i * 3 + k] * (1 - t)) / Math.max(t, 1e-3); const lit = logoCol * (panel / ref) * 0.97 + panel * 0.03; const v = Math.max(0, Math.min(255, lit + (rnd() - 0.5) * 6));
      o[i * 3 + k] = Math.round(b[i * 3 + k] * (1 - t) + v * t); } }
  await sharp(o, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${S}/final.png`); console.log('ref', ref.toFixed(0));
})();
