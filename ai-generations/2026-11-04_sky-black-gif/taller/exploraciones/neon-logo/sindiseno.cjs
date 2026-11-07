// Variantes «sin diseño de pieza»: logo solo sobre negro y logo sobre la foto sola (base + logo).
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const { aplicar, mascaraKV, NIVELES, K } = require('./neon2.cjs');
const OUTD = __dirname + '/out';
(async () => {
  const etapas = [['0-actual', null], ...Object.entries(NIVELES).map(([k, v], i) => [`${i + 1}-${k}`, v])];
  for (const n of process.argv.slice(2)) {
    const mk = await mascaraKV(n);
    const logo = `${K}/parts/${n}__logo.png`;
    const negro = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#000' } })
      .composite([{ input: logo }]).png().toBuffer().then(b => sharp(b).extract({ left: 0, top: 0, width: 780, height: 400 }).png().toBuffer());
    const foto = await sharp(`${K}/parts/${n}__base.png`).flatten({ background: '#000' })
      .composite([{ input: logo }]).png().toBuffer();
    for (const [nom, nv] of etapas) {
      for (const [tipo, buf] of [['negro', negro], ['foto', foto]]) {
        const out = `${OUTD}/${n}__${tipo}__${nom}.png`;
        if (!nv) await sharp(buf).png().toFile(out); else await aplicar(buf, mk, 'kv', nv, out);
      }
    }
    console.log(n);
  }
})();
