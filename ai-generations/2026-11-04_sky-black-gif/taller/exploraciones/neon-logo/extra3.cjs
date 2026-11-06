// v3: variantes sin diseño (negro, foto sola) y encendido animado por opacidad de la capa de luz.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const fs = require('fs');
const { mascaraKV, K } = require('./neon2.cjs');
const { neon, alfaBlanca, OPAC } = require('./neon3.cjs');
const OUTD = __dirname + '/out3';
const mezcla = (px, full, op) => { const o = Buffer.alloc(px.length); for (let k = 0; k < px.length; k++) o[k] = Math.round((px[k] / 255 + (full[k] - px[k] / 255) * op) * 255); return o; };
(async () => {
  for (const n of ['HM_PE_RUTA_TACNA', 'HM_PE_RUTA_IQUITOS']) {
    const mk = await mascaraKV(n), mb = await alfaBlanca(n), logo = `${K}/parts/${n}__logo.png`;
    const negro = await sharp(await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#000' } }).composite([{ input: logo }]).png().toBuffer()).extract({ left: 0, top: 0, width: 780, height: 400 }).png().toBuffer();
    const foto = await sharp(`${K}/parts/${n}__base.png`).flatten({ background: '#000' }).composite([{ input: logo }]).png().toBuffer();
    for (const [tipo, buf] of [['negro', negro], ['foto', foto]]) {
      const { px, full, W, H } = await neon(buf, mk, 'kv', mb);
      await sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${OUTD}/${n}__${tipo}__0-actual.png`);
      let i = 1; for (const [nom, op] of Object.entries(OPAC)) await sharp(mezcla(px, full, op), { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${OUTD}/${n}__${tipo}__${i++}-${nom}.png`);
    }
    // Encendido: 0,5 s apagado, parpadeo de tubo, queda en «fuerte».
    const fmt = n.includes('TACNA') ? 'kv' : 'story';
    const src = fmt === 'kv' ? `${K}/png/${n}.png` : `${K}/formatos/${n}__story.png`;
    const { px, full, W, H } = await neon(src, mk, fmt, mb);
    const seq = [...Array(12).fill(0), 1, 1, 0, 0, 0.35, 0, 1, 1, 1, 0.2, 0, 0, 0.6, 0.9, 1, 1, 0.55, 1, ...Array(48).fill(1)];
    const dir = `${__dirname}/fr3-${n}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    const cache = new Map();
    for (let i = 0; i < seq.length; i++) {
      const t = seq[i]; if (!cache.has(t)) { const p = `${dir}/t${t}.png`; await sharp(mezcla(px, full, t), { raw: { width: W, height: H, channels: 3 } }).png().toFile(p); cache.set(t, p); }
      fs.copyFileSync(cache.get(t), `${dir}/f${String(i).padStart(3, '0')}.png`);
    }
    console.log(n, fmt, seq.length);
  }
})();
