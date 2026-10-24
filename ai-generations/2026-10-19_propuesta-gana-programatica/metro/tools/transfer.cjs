// Traslada sólo la luz del acabado (brillo, reflejo, falloff) sobre la pieza exacta: dentro de la máscara,
// salida = exacta + k·(blur(acabado) − blur(exacta)); fuera, el acabado. El texto y el logo siguen siendo los exactos.
// Uso: node transfer.cjs comp.png acabado.png mask.png out.png [sigma=6] [k=1]
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [comp, fin, maskp, out, sg = '6', kk = '1'] = process.argv.slice(2);
(async () => {
  const sigma = +sg, k = +kk;
  const C = await sharp(comp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = C.info.width, H = C.info.height;
  const F = await sharp(fin).removeAlpha().resize(W, H, { fit: 'fill' }).raw().toBuffer();
  const Cb = await sharp(C.data, { raw: { width: W, height: H, channels: 3 } }).blur(sigma).raw().toBuffer();
  const Fb = await sharp(F, { raw: { width: W, height: H, channels: 3 } }).blur(sigma).raw().toBuffer();
  const M = await sharp(maskp).extractChannel(0).resize(W, H, { fit: 'fill' }).blur(1).raw().toBuffer();
  const o = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { const a = M[i] / 255;
    for (let c = 0; c < 3; c++) { const j = i * 3 + c; const inside = Math.max(0, Math.min(255, C.data[j] + k * (Fb[j] - Cb[j])));
      o[j] = Math.round(F[j] * (1 - a) + inside * a); } }
  await sharp(o, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
  console.log('ok', out);
})();
