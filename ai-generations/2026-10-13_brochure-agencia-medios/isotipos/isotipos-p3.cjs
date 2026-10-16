// Isotipos oficiales (AXIS / biblioteca de logos) sobre el rótulo de canal de cada escalón de la lámina 06 «Señal».
// Mide el rótulo en el PNG compuesto y coloca la fila de isotipos justo encima, alineada a su borde izquierdo.
// Uso: node isotipos-p3.cjs <entrada.png> <salida.png>
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const R = '/Users/jreye/Documents/greenhouse-eo/';
const PF = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/platforms/';
const PA = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/partners/';
const [src, out] = process.argv.slice(2);
const steps = [
  { xr: [790, 1045], logos: [PF + 'meta-isotype-negative.svg', PF + 'google-isotype.svg', PF + 'tiktok-isotype-negative.svg'] },
  { xr: [1050, 1315], logos: [PF + 'google-analytics-isotype.svg'] },
  { xr: [1320, 1585], logos: [PF + 'meta-isotype-negative.svg', PF + 'google-ads-isotype.svg'] },
  { xr: [1590, 1845], logos: [R + 'public/images/logos/axis/hubspot-on-orange.svg', R + 'public/images/logos/partners/salesforce.com_logo.svg'] }
];
const H = 30, GAP = 12;
(async () => {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const comps = [];
  for (const s of steps) {
    let x0 = 1e9, y0 = 1e9;
    for (let y = 820; y < 870; y++) for (let x = s.xr[0]; x < s.xr[1]; x++) {
      const i = (y * info.width + x) * 3;
      if (data[i] > 150 && data[i + 1] > 150 && data[i + 2] > 150) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); }
    }
    if (x0 === 1e9) throw new Error('No encontré el rótulo en ' + s.xr);
    let x = x0;
    for (const f of s.logos) {
      const png = await sharp(f, { density: 400 }).resize({ height: H }).png().toBuffer();
      const { width } = await sharp(png).metadata();
      comps.push({ input: png, left: Math.round(x), top: Math.round(y0 - H - 14) });
      x += width + GAP;
    }
    console.log('rótulo', s.xr, '→', x0, y0);
  }
  await sharp(src).composite(comps).png().toFile(out);
})();
