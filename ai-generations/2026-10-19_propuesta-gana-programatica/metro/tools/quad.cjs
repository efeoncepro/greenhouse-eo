// Detecta el cuadrilátero de una pantalla blanca: flood fill desde una semilla + recta por cada lado (tramo central).
// Uso: node quad.cjs img.png seedX seedY
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [img, sx, sy] = process.argv.slice(2);
(async () => {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const ok = (x, y) => { const i = (y * W + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2]; return Math.min(r, g, b) > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 34; };
  const seen = new Uint8Array(W * H), st = [[+sx, +sy]], pts = [];
  while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= W || y >= H) continue; const k = y * W + x; if (seen[k]) continue; seen[k] = 1; if (!ok(x, y)) continue; pts.push([x, y]); st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  const bb = pts.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1, -1]);
  const rows = new Map(), cols = new Map();
  for (const [x, y] of pts) { const r = rows.get(y) || [1e9, -1]; rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]); const c = cols.get(x) || [1e9, -1]; cols.set(x, [Math.min(c[0], y), Math.max(c[1], y)]); }
  const fit = (pairs) => { const n = pairs.length, sx = pairs.reduce((a, p) => a + p[0], 0), sy = pairs.reduce((a, p) => a + p[1], 0), sxx = pairs.reduce((a, p) => a + p[0] * p[0], 0), sxy = pairs.reduce((a, p) => a + p[0] * p[1], 0); const m = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1); return [m, (sy - m * sx) / n]; };
  const hb = bb[3] - bb[1], wb = bb[2] - bb[0];
  const mid = (map, lo, hi, k) => [...map].filter(([t]) => t > lo && t < hi).map(([t, v]) => [t, v[k]]);
  const L = fit(mid(rows, bb[1] + hb * .25, bb[3] - hb * .25, 0)), R = fit(mid(rows, bb[1] + hb * .25, bb[3] - hb * .25, 1));
  const T = fit(mid(cols, bb[0] + wb * .25, bb[2] - wb * .25, 0)), Bt = fit(mid(cols, bb[0] + wb * .25, bb[2] - wb * .25, 1));
  const meet = ([ma, ba], [mb, bbb]) => { const y = (mb * ba + bbb) / (1 - mb * ma), x = ma * y + ba; return [+x.toFixed(1), +y.toFixed(1)]; };
  const q = [meet(L, T), meet(R, T), meet(R, Bt), meet(L, Bt)];
  const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  console.log(JSON.stringify({ n: pts.length, bb, quad: q, aspect: +(((len(q[0], q[1]) + len(q[3], q[2])) / 2) / ((len(q[0], q[3]) + len(q[1], q[2])) / 2)).toFixed(3) }));
})();
