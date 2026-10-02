// Quita islas chicas (< MIN px) de una capa: restos del recorte que, al moverse la capa, se verían como motas.
const sharp = require('sharp')
const [, , file, MIN = '600'] = process.argv
;(async () => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, seen = new Int32Array(W * H).fill(-1)
  let removed = 0
  for (let s = 0; s < W * H; s++) {
    if (data[s * 4 + 3] < 20 || seen[s] !== -1) continue
    const comp = [s]; seen[s] = s
    for (let q = 0; q < comp.length; q++) {
      const p = comp[q], x = p % W, y = (p - x) / W
      for (const n of [p - 1, p + 1, p - W, p + W]) { if (n < 0 || n >= W * H) continue; const nx = n % W; if (Math.abs(nx - x) > 1) continue; if (data[n * 4 + 3] >= 20 && seen[n] === -1) { seen[n] = s; comp.push(n) } }
    }
    if (comp.length < +MIN) { for (const p of comp) data[p * 4 + 3] = 0; removed += comp.length }
  }
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(file + '.tmp.png')
  require('fs').renameSync(file + '.tmp.png', file)
  console.log(file, 'px quitados', removed)
})()
