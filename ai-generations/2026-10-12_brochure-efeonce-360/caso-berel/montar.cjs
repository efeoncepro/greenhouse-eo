// Monta la composición en la mitad derecha de S28: reemplaza sólo la foto (a la derecha de la curva del panel) y
// conserva el panel, el cursor y el chip «Búsqueda».
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [src, foto, out] = process.argv.slice(2);
(async () => {
  const O = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const W = 1920, H = 1080, o = O.data;
  const F = await sharp(foto).resize(1240, 1085).extract({ left: 0, top: 2, width: 1240, height: 1080 }).raw().toBuffer();
  const lum = (x, y) => { const i = (y * W + x) * 3; return (o[i] + o[i + 1] + o[i + 2]) / 3; };
  const bound = []; for (let y = 0; y < H; y++) { let b = 1000;
    if (y < 640 || y > 960) { for (let x = 1100; x > 600; x--) { let ok = true; for (let k = 0; k < 8; k++) if (lum(x - k, y) < 236) ok = false; if (ok) { b = x + 1; break; } } }
    bound.push(b); }
  const isChip = (x, y) => { if (x < 985 || x > 1172 || y < 884 || y > 954) return false; const i = (y * W + x) * 3; const [r, g, b] = [o[i], o[i + 1], o[i + 2]]; return (b > 190 && r < 150 && b - r > 60) || (r > 225 && g > 225 && b > 225); };
  const out_ = Buffer.from(o);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (x < bound[y] + 1 || x < 680) continue; if (isChip(x, y)) continue;
    const i = (y * W + x) * 3, j = (y * 1240 + (x - 680)) * 3; const t = Math.min(1, (x - bound[y]) / 2);
    for (let ch = 0; ch < 3; ch++) out_[i + ch] = Math.round(o[i + ch] * (1 - t) + F[j + ch] * t); }
  await sharp(out_, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(out);
  console.log('ok', bound[0], bound[200], bound[430], bound[1000]);
})();
