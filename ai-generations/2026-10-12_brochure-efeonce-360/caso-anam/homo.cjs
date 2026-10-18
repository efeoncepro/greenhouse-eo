// Pega una imagen RGBA sobre un cuadrilátero (homografía) y escribe la máscara de esa zona.
// Uso: node homo.cjs base.png logo.png out.png mask.png x0,y0 x1,y1 x2,y2 x3,y3   (TL TR BR BL)
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [base, logo, out, maskOut, ...pts] = process.argv.slice(2); const Q = pts.map(p => p.split(',').map(Number));
function solve(A, b) { const n = b.length; for (let i = 0; i < n; i++) { let m = i; for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
  for (let k = i + 1; k < n; k++) { const f = A[k][i] / A[i][i]; for (let j = i; j < n; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; } }
  const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x; }
(async () => {
  const L = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const lw = L.info.width, lh = L.info.height, l = L.data;
  // homografía destino -> origen
  const src = [[0, 0], [lw, 0], [lw, lh], [0, lh]]; const A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = Q[i], [u, v] = src[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  const h = solve(A, b);
  const B = await sharp(base).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const W = B.info.width, H = B.info.height; const o = Buffer.from(B.data); const m = Buffer.alloc(W * H);
  const xs = Q.map(q => q[0]), ys = Q.map(q => q[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
    // supermuestreo 3x3
    let acc = [0, 0, 0, 0];
    for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) { const X = x + (sx + 0.5) / 3 - 0.5, Y = y + (sy + 0.5) / 3 - 0.5; const d = h[6] * X + h[7] * Y + 1; const u = (h[0] * X + h[1] * Y + h[2]) / d, v = (h[3] * X + h[4] * Y + h[5]) / d;
      if (u < 0 || v < 0 || u >= lw - 1 || v >= lh - 1) continue; const iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv;
      for (let c = 0; c < 4; c++) { const p = (yy, xx) => l[(yy * lw + xx) * 4 + c]; acc[c] += (p(iv, iu) * (1 - fu) * (1 - fv) + p(iv, iu + 1) * fu * (1 - fv) + p(iv + 1, iu) * (1 - fu) * fv + p(iv + 1, iu + 1) * fu * fv) / 9; } }
    const a = acc[3] / 255; if (a <= 0) continue; const k = (y * W + x) * 3;
    for (let c = 0; c < 3; c++) o[k + c] = Math.round(o[k + c] * (1 - a) + (acc[c] / Math.max(a, 1e-6)) * a);
    m[y * W + x] = Math.round(a * 255);
  }
  await sharp(o, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
  await sharp(m, { raw: { width: W, height: H, channels: 1 } }).png().toFile(maskOut); console.log('ok');
})();
