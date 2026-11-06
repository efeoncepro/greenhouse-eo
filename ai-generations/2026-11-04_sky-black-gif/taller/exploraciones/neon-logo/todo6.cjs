// Rinde las 3 opciones en las piezas de prueba, con y sin diseño, más la chispa animada.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const fs = require('fs');
const { mascarasKV, preparar, guardar, aFmt, gauss, OPCIONES, K, OUTD } = require('./neon6.cjs');
const L = 25.54 + 59, R = 540.49 + 59, T = 81.56 + 53, B = 242.49 + 53, W1 = R - L, H1 = B - T;
const perim = (x, y) => { // coordenada a lo largo del marco, en sentido horario desde la esquina superior izquierda
  const d = [Math.abs(y - T), Math.abs(x - R), Math.abs(y - B), Math.abs(x - L)], k = d.indexOf(Math.min(...d));
  return k === 0 ? x - L : k === 1 ? W1 + (y - T) : k === 2 ? W1 + H1 + (R - x) : 2 * W1 + H1 + (B - y);
};
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
(async () => {
  for (const n of ['HM_PE_RUTA_TACNA', 'HM_PE_RUTA_IQUITOS']) {
    const mk = await mascarasKV(n), logo = `${K}/parts/${n}__logo.png`;
    const negro = await sharp(await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#000' } }).composite([{ input: logo }]).png().toBuffer()).extract({ left: 0, top: 0, width: 780, height: 400 }).png().toBuffer();
    const foto = await sharp(`${K}/parts/${n}__base.png`).flatten({ background: '#000' }).composite([{ input: logo }]).png().toBuffer();
    const piezas = { kv: [`${K}/png/${n}.png`, 'kv'], popup: [`${K}/formatos/${n}__popup.png`, 'popup'], story: [`${K}/formatos/${n}__story.png`, 'story'], foto: [foto, 'kv'] };
    if (n.includes('TACNA')) piezas.negro = [negro, 'kv'];
    for (const [tipo, [src, fmt]] of Object.entries(piezas)) {
      const pinta = await preparar(src, mk, fmt);
      await guardar(pinta({}, 0), `${OUTD}/${n}__${tipo}__0-actual.png`);
      for (const [nom, op] of Object.entries(OPCIONES)) await guardar(pinta(op), `${OUTD}/${n}__${tipo}__${nom}.png`);
    }
    // Chispa: sale del acento de arriba, recorre el marco en sentido horario y llega al acento de abajo; los acentos se encienden.
    const fmt = n.includes('TACNA') ? 'kv' : 'story', src = piezas[fmt][0];
    const pinta = await preparar(src, mk, fmt), sc = fmt === 'story' ? 1.3 : 1;
    const pk = new Float32Array(mk.W * mk.H).fill(-1);
    for (let j = 0; j < mk.W * mk.H; j++) if (mk.marco[j]) pk[j] = perim(j % mk.W, (j / mk.W) | 0);
    const N = 80, dir = `${__dirname}/fr6-${n}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    for (let f = 0; f < N; f++) {
      const t = f / 25, prog = Math.min(1, Math.max(0, (t - 0.4) / 0.9)), cab = ease(prog) * (W1 + H1);
      const enc = Math.min(1, Math.max(0, (t - 1.15) / 0.45));
      let extra = null;
      if (prog > 0 && prog < 1) {
        const sp = Buffer.alloc(mk.W * mk.H);
        for (let j = 0; j < sp.length; j++) if (pk[j] >= 0) { const d = cab - pk[j]; const w = d < 0 ? Math.exp(-(d * d) / (2 * 22 * 22)) : Math.exp(-d / 110); sp[j] = Math.round(mk.marco[j] * Math.min(1, w)); }
        const sf = await aFmt(sp, mk, fmt, pinta.W ?? 1080, fmt === 'story' ? 1920 : 1350);
        const s1 = gauss(sf, 1080, fmt === 'story' ? 1920 : 1350, 1.1 * sc, false), s3 = gauss(sf, 1080, fmt === 'story' ? 1920 : 1350, 3 * sc, false), s9 = gauss(sf, 1080, fmt === 'story' ? 1920 : 1350, 9 * sc, false);
        const s22 = gauss(sf, 1080, fmt === 'story' ? 1920 : 1350, 22 * sc, false);
        extra = j => ({ L: 7 * s3[j] + 4 * s9[j] + 3 * s22[j], core: Math.min(1, s1[j] * 6) });
      }
      await guardar(pinta(OPCIONES['1-acentos'], enc, extra), `${dir}/f${String(f).padStart(3, '0')}.png`);
    }
    console.log(n, 'listo');
  }
})();
