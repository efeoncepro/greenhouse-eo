// Encendido animado del neón (para GIF/video): parpadeo y queda en una intensidad. Solo exploración.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const { aplicar, mascaraKV, NIVELES, K } = require('./neon2.cjs');
const fs = require('fs');
const [n, fmt = 'kv', fin = 'fuerte'] = process.argv.slice(2);
const F = NIVELES[fin];
const nv = t => ({ k: F.k * t, thin: F.thin * t, thick: F.thick * t, noche: F.noche * t, capas: F.capas });
// Curva a 25 fps: 0,5 s apagado, parpadeo de tubo, subida y 1,6 s encendido.
const seq = [...Array(12).fill(0), 1, 1, 0, 0, 0.35, 0, 1, 1, 1, 0.2, 0, 0, 0.6, 0.9, 1, 1, 0.55, 1,
  ...Array.from({ length: 8 }, (_, i) => 0.85 + 0.15 * (i / 7)), ...Array(40).fill(1)];
(async () => {
  const mk = await mascaraKV(n);
  const src = fmt === 'kv' ? `${K}/png/${n}.png` : `${K}/formatos/${n}__${fmt}.png`;
  const dir = `${__dirname}/fr-${n}-${fmt}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const cache = new Map();
  for (let i = 0; i < seq.length; i++) {
    const t = Math.round(seq[i] * 100) / 100, out = `${dir}/f${String(i).padStart(3, '0')}.png`;
    if (!cache.has(t)) {
      const p = `${dir}/t${t}.png`;
      if (t === 0) await sharp(src).flatten({ background: '#000' }).removeAlpha().png().toFile(p); else await aplicar(src, mk, fmt, nv(t), p);
      cache.set(t, p);
    }
    fs.copyFileSync(cache.get(t), out);
  }
  console.log(dir, seq.length);
})();
