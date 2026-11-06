// Adaptar la foto en vez de oscurecer con degradado (Daniela, Teams 2026-11-06 18:03, tercer camino: «no oscurezcas más
// el gradiente, considera adaptar la foto … oscurezca un poco el cielo»). Comprime sólo las luces (cielo, nubes, el puente
// blanco) en la zona donde caen los textos de la lista, con un borde difuso; los medios tonos y las sombras no cambian,
// así que se lee como un ajuste de la foto, no como un velo encima.
// Uso: node adaptar-foto.cjs <pieza> [umbral=150] [factor=.45]
//   Lee de fotos-destino.json la foto y su encuadre por formato, junta las cajas de la lista (ZONAS) llevadas a la foto
//   y escribe fotos-destino/<foto>-adapt.png. Después, en fotos-destino.json, `src` apunta a ese archivo.
const fs = require('fs');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = __dirname, DEST = JSON.parse(fs.readFileSync(K + '/fotos-destino.json', 'utf8'));
const T = { kv: [0.74, 0.47], popup: [0.74, 0.44], story: [0.7, 0.5] }, SZ = { kv: [1080, 1350], popup: [1080, 1080], story: [1080, 1920] };
// Cajas de la lista bajo el logo en cada formato (px del formato), con aire para que el borde difuso no se note.
const ZONAS = {
  lista: { kv: [40, 320, 480, 820], popup: [30, 300, 460, 690], story: [40, 560, 520, 1080] },
  // Bloque del destino (antetítulo, nombre y píldora), donde el piso sutil ya no alcanza (Tumbes, Trujillo…).
  destino: { kv: [30, 900, 600, 1250], popup: [20, 690, 520, 900], story: [30, 1250, 640, 1530] }
};
const [n, umbral = '150', factor = '.45', zonas = 'lista'] = process.argv.slice(2); // zonas: lista, destino o «lista,destino»
(async () => {
  const d = DEST[n], src = (d.srcOriginal || d.src).replace(/-adapt\.png$/, ''), f = K + '/fotos-destino/' + src;
  const m = await sharp(f).metadata();
  const cajas = [];
  for (const zn of zonas.split(',')) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const fmt of ['kv', 'popup', 'story']) {
    const o = (d.f && d.f[fmt]) || {}, s = o.s || d.s, t = o.t || T[fmt], z = o.z || 1, [W, H] = SZ[fmt];
    const k = Math.max(W / m.width, H / m.height) * z, sw = m.width * k, sh = m.height * k;
    const left = Math.min(Math.max(s[0] * sw - t[0] * W, 0), sw - W), top = Math.min(Math.max(s[1] * sh - t[1] * H, 0), sh - H);
    const [a, b, c, e] = ZONAS[zn][fmt];
    x0 = Math.min(x0, (left + a) / k); y0 = Math.min(y0, (top + b) / k); x1 = Math.max(x1, (left + c) / k); y1 = Math.max(y1, (top + e) / k);
  }
  cajas.push([x0, y0, x1, y1].map((v, i) => Math.round(Math.max(0, Math.min(i % 2 ? m.height : m.width, v)))));
  }
  const F = Math.round(Math.min(m.width, m.height) * 0.08), box = cajas.map((b) => b.join(',')).join(' | ');
  const mask = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}"><rect width="100%" height="100%" fill="#000"/>${cajas.map((b) => `<rect x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}" rx="${F}" fill="#fff"/>`).join('')}</svg>`))
    .blur(F / 2).extractChannel(0).raw().toBuffer();
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const U = +umbral, Q = +factor;
  for (let i = 0, p = 0; i < data.length; i += 3, p++) {
    const w = mask[p] / 255; if (!w) continue;
    const L = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; if (L <= U) continue; // curva continua: sin cortes por color (dejaban manchas posterizadas)
    const k = (U + (L - U) * Q) / L, kk = 1 - w + w * k;
    data[i] = Math.round(data[i] * kk); data[i + 1] = Math.round(data[i + 1] * kk); data[i + 2] = Math.round(data[i + 2] * kk);
  }
  const out = src.replace(/\.(png|jpe?g)$/i, '') + '-adapt.png';
  await sharp(data, { raw: info }).png().toFile(K + '/fotos-destino/' + out);
  console.log(n, '→', out, 'zonas', zonas, box, 'umbral', U, 'factor', Q);
})();
