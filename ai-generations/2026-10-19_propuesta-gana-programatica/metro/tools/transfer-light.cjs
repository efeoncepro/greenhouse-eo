// Para superficies chicas (texto de pocos px): traslada sólo la luz difusa del acabado.
// Fuera de la pieza (dentro de la zona de acabado): exacta + k·max(0, blur(acabado)−blur(exacta)) → glow y derrame de luz.
// Dentro de la pieza: exacta (suavizada como la cámara) + k·(blur(acabado)−blur(exacta)) con sigma grande → tono, nunca letras.
// Uso: node transfer-light.cjs comp.png acabado.png quadmask.png finmask.png out.png [sigma=18] [k=1] [soft=0.7]
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [comp, fin, qm, fm, out, sg = '18', kk = '1', sf = '0.7'] = process.argv.slice(2);
(async () => {
  const C = await sharp(comp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = C.info.width, H = C.info.height, raw = { raw: { width: W, height: H, channels: 3 } };
  const F = await sharp(fin).removeAlpha().resize(W, H, { fit: 'fill' }).raw().toBuffer();
  const Cs = +sf > 0.3 ? await sharp(C.data, raw).blur(+sf).raw().toBuffer() : C.data;
  const Cb = await sharp(C.data, raw).blur(+sg).raw().toBuffer(), Fb = await sharp(F, raw).blur(+sg).raw().toBuffer();
  const Q = await sharp(qm).extractChannel(0).resize(W, H, { fit: 'fill' }).raw().toBuffer();
  const Mf = await sharp(fm).extractChannel(0).resize(W, H, { fit: 'fill' }).blur(12).raw().toBuffer();
  const o = Buffer.alloc(W * H * 3), k = +kk;
  for (let i = 0; i < W * H; i++) { const q = Q[i] / 255, f = Mf[i] / 255;
    for (let c = 0; c < 3; c++) { const j = i * 3 + c, d = Fb[j] - Cb[j];
      const outside = C.data[j] + f * k * Math.max(0, d), inside = Cs[j] + k * d;
      o[j] = Math.max(0, Math.min(255, Math.round(outside * (1 - q) + inside * q))); } }
  await sharp(o, raw).png().toFile(out); console.log('ok', out);
})();
