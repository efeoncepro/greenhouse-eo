// Monta una pieza (PNG) exacta sobre una foto con homografía. Admite varias franjas para superficies curvas.
// Uso: node warp.cjs base.png ad.png spec.json out.png mask.png
// spec: [{ quad:[[x,y]x4 (TL,TR,BR,BL)], u0:0, u1:1 }]   (u = fracción del ancho de la pieza)
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const fs = require('fs');
const [base, adp, specp, out, maskOut] = process.argv.slice(2);
const solve = (src, dst) => { // homografía src->dst (8 incógnitas)
  const A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  const h = b.map((v, i) => v / A[i][i]); return [...h, 1];
};
(async () => {
  const spec = JSON.parse(fs.readFileSync(specp, 'utf8'));
  const B = await sharp(base).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = B.info.width, H = B.info.height, out3 = Buffer.from(B.data);
  const AD = await sharp(adp).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const aw = AD.info.width, ah = AD.info.height, ad = AD.data;
  const mask = Buffer.alloc(W * H);
  const SS = 3; // supersampling por píxel para bordes limpios
  for (const s of spec) {
    const u0 = s.u0 ?? 0, u1 = s.u1 ?? 1;
    const src = [[u0 * aw, 0], [u1 * aw, 0], [u1 * aw, ah], [u0 * aw, ah]];
    const Hi = solve(s.quad, src); // destino -> pieza (inversa)
    const xs = s.quad.map(p => p[0]), ys = s.quad.map(p => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 1), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 1), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let r = 0, g = 0, bb = 0, n = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        const d = Hi[6] * px + Hi[7] * py + 1, u = (Hi[0] * px + Hi[1] * py + Hi[2]) / d, v = (Hi[3] * px + Hi[4] * py + Hi[5]) / d;
        if (u < u0 * aw - 0.5 || u > u1 * aw + 0.5 || v < 0 || v > ah) continue;
        const ix = Math.min(aw - 1, Math.max(0, Math.floor(u))), iy = Math.min(ah - 1, Math.max(0, Math.floor(v))), k = (iy * aw + ix) * 3;
        r += ad[k]; g += ad[k + 1]; bb += ad[k + 2]; n++;
      }
      if (!n) continue;
      const a = n / (SS * SS), k = (y * W + x) * 3, m = y * W + x;
      out3[k] = Math.round(out3[k] * (1 - a) + (r / n) * a); out3[k + 1] = Math.round(out3[k + 1] * (1 - a) + (g / n) * a); out3[k + 2] = Math.round(out3[k + 2] * (1 - a) + (bb / n) * a);
      mask[m] = Math.max(mask[m], Math.round(a * 255));
    }
  }
  await sharp(out3, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
  await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).png().toFile(maskOut);
  console.log('ok', out);
})();
