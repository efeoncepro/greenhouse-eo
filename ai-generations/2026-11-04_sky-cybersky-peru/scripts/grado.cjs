// Grado de color común: acerca media y desvío por canal (RGB) de cada foto a los de la
// foto de referencia del KV, con una intensidad parcial para no aplanar cada escena.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [ref, intensidad, ...pares] = process.argv.slice(2);
const k = Number(intensidad);
async function stats(file) {
  const { data, info } = await sharp(file).resize(512, 512, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height; const m = [0, 0, 0], s = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) m[c] += data[i * 3 + c];
  for (let c = 0; c < 3; c++) m[c] /= n;
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) s[c] += (data[i * 3 + c] - m[c]) ** 2;
  for (let c = 0; c < 3; c++) s[c] = Math.sqrt(s[c] / n);
  return { m, s };
}
(async () => {
  const R = await stats(ref);
  for (let i = 0; i < pares.length; i += 2) {
    const [src, out] = [pares[i], pares[i + 1]];
    const S = await stats(src);
    // y = a*x + b por canal, mezclado con identidad según k
    const a = [0, 1, 2].map((c) => 1 + k * (R.s[c] / S.s[c] - 1));
    const b = [0, 1, 2].map((c) => k * (R.m[c] - S.m[c] * (R.s[c] / S.s[c])));
    await sharp(src).removeAlpha().linear(a, b).jpeg({ quality: 88 }).toFile(out);
    console.log(out, 'a', a.map((x) => x.toFixed(2)).join('/'), 'b', b.map((x) => x.toFixed(1)).join('/'));
  }
})();
