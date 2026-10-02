// Mezcla del acabado del modelo SÓLO en la silueta del isotipo, con el color del parche igualado a su entorno.
// Uso: node isotipo-mezcla.cjs <plate-original> <plate-isotipo> <recorte-terminado.png> <cx,cy> <ancho> <lado> <out.png>
const sharp = require('module').createRequire('/Users/jreye/Documents/greenhouse-eo/x.js')('sharp')
const [orig, iso, fin, c, w, ladoArg, out] = process.argv.slice(2)
;(async () => {
  const m = await sharp(iso).metadata(); const lado = +ladoArg
  const [fx, fy] = c.split(',').map(Number); const cx = Math.round(fx * m.width), cy = Math.round(fy * m.height)
  const left = Math.max(0, Math.min(m.width - lado, Math.round(cx - lado / 2))), top = Math.max(0, Math.min(m.height - lado, Math.round(cy - lado / 2)))
  const get = async (f, rs) => { let s = sharp(f); if (rs) s = s.resize(lado, lado, { kernel: 'lanczos3' }); else s = s.extract({ left, top, width: lado, height: lado }); return s.removeAlpha().raw().toBuffer() }
  const O = await get(orig), I = await get(iso), F = await get(fin, true)
  const N = lado * lado, lum = (B, p) => 0.2126 * B[p * 3] + 0.7152 * B[p * 3 + 1] + 0.0722 * B[p * 3 + 2]
  // silueta: donde el compuesto difiere del original
  let mask = new Float32Array(N); for (let p = 0; p < N; p++) mask[p] = Math.abs(lum(I, p) - lum(O, p)) > 10 ? 1 : 0
  const dil = (src, r) => { const d = new Float32Array(N); for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) { if (!src[y * lado + x]) continue; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && yy < lado && xx < lado && dx * dx + dy * dy <= r * r) d[yy * lado + xx] = 1 } } return d }
  const core = dil(mask, 3), ring = dil(mask, 14)
  // igualar color: sólo el desplazamiento de la media por canal en el anillo (escalar el desvío deformaba el tono de la marca) (fuera del isotipo) entre terminado y compuesto
  const stats = (B) => { const s = [0, 0, 0], q = [0, 0, 0]; let n = 0; for (let p = 0; p < N; p++) if (ring[p] && !core[p]) { n++; for (let k = 0; k < 3; k++) { s[k] += B[p * 3 + k]; q[k] += B[p * 3 + k] ** 2 } } return s.map((v, k) => [v / n, Math.sqrt(Math.max(1, q[k] / n - (v / n) ** 2))]) }
  const sf = stats(F), si = stats(I)
  const G = Buffer.alloc(N * 3); for (let p = 0; p < N; p++) for (let k = 0; k < 3; k++) G[p * 3 + k] = Math.max(0, Math.min(255, Math.round(F[p * 3 + k] - sf[k][0] + si[k][0])))
  // alfa suave sobre la silueta dilatada
  const alpha = await sharp(Buffer.from(Array.from(core, v => v * 255)), { raw: { width: lado, height: lado, channels: 1 } }).blur(1.6).extractChannel(0).raw().toBuffer()
  const X = Buffer.alloc(N * 3); for (let p = 0; p < N; p++) { const a = alpha[p] / 255; for (let k = 0; k < 3; k++) X[p * 3 + k] = Math.round(G[p * 3 + k] * a + I[p * 3 + k] * (1 - a)) }
  await sharp(iso).composite([{ input: await sharp(X, { raw: { width: lado, height: lado, channels: 3 } }).png().toBuffer(), left, top }]).png().toFile(out)
  const z = Math.round(+w * m.width * 3.2), zl = Math.round(cx - z / 2), zt = Math.round(cy - z / 2)
  const a = await sharp(iso).extract({ left: zl, top: zt, width: z, height: z }).resize(360, 360).toBuffer(), b = await sharp(out).extract({ left: zl, top: zt, width: z, height: z }).resize(360, 360).toBuffer()
  await sharp({ create: { width: 730, height: 360, channels: 3, background: '#888' } }).composite([{ input: a, left: 0, top: 0 }, { input: b, left: 370, top: 0 }]).png().toFile(out.replace(/\.png$/, '-comparar.png'))
  console.log('ok', out)
})()
