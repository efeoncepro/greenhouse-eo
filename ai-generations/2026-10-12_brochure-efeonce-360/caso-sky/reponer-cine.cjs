// Repone el contenido exacto de cada pieza sobre el acabado del modelo: busca el desplazamiento que el modelo le dio,
// pega el interior original en esa posición (máscara con borde suave) y corrige sólo el desplazamiento de la media de color.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp'); const S = process.argv[2];
(async () => {
  const A = await sharp(`${S}/acabado-cine.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = A.info.width, H = A.info.height, a = A.data;
  const c = await sharp(`${S}/comp-cine.png`).removeAlpha().raw().toBuffer();
  const m = await sharp(`${S}/cards-mask.png`).greyscale().raw().toBuffer();
  const soft = await sharp(`${S}/cards-mask.png`).greyscale().blur(1.2).raw().toBuffer();
  const out = Buffer.from(a); const cards = require(`${S}/cards-r.json`);
  for (const k of cards) {
    let best = [1e9, 0, 0];
    for (let dy = -14; dy <= 14; dy += 1) for (let dx = -14; dx <= 14; dx += 1) {
      let d = 0, n = 0;
      for (let y = k.y; y < k.y + k.h; y += 3) for (let x = k.x; x < k.x + k.w; x += 3) { const i = y * W + x; if (m[i] < 200) continue; const j = (y + dy) * W + (x + dx); if (y + dy < 0 || y + dy >= H || x + dx < 0 || x + dx >= W) continue;
        for (let ch = 0; ch < 3; ch++) d += Math.abs(a[j * 3 + ch] - c[i * 3 + ch]); n++; }
      if (d / n < best[0]) best = [d / n, dx, dy];
    }
    const [, dx, dy] = best; const mean = [0, 0, 0], meanC = [0, 0, 0]; let n = 0;
    for (let y = k.y; y < k.y + k.h + 40; y++) for (let x = k.x; x < k.x + k.w + 40; x++) { const i = y * W + x; if (m[i] < 200) continue; const j = (y + dy) * W + (x + dx); for (let ch = 0; ch < 3; ch++) { mean[ch] += a[j * 3 + ch]; meanC[ch] += c[i * 3 + ch]; } n++; }
    const off = mean.map((v, ch) => (v - meanC[ch]) / n * 0.6);
    for (let y = Math.max(0, k.y - 20); y < Math.min(H, k.y + k.h + 60); y++) for (let x = Math.max(0, k.x - 20); x < Math.min(W, k.x + k.w + 60); x++) {
      const i = y * W + x; const t = soft[i] / 255; if (t <= 0) continue; const j = (y + dy) * W + (x + dx); if (j < 0 || j >= W * H) continue;
      for (let ch = 0; ch < 3; ch++) out[j * 3 + ch] = Math.round(out[j * 3 + ch] * (1 - t) + Math.max(0, Math.min(255, c[i * 3 + ch] + off[ch])) * t);
    }
    console.log(k.f, 'desplazamiento', dx, dy, 'dif', (best[0] / 3).toFixed(1), 'color', off.map(v => v.toFixed(1)).join(','));
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${S}/final-cine.png`);
})();
