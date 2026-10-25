// Mide alfa, caja del personaje y colores dominantes de cada PNG (cuantización simple). Uso: node muestrear.mjs <png...>
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  let minX = W, minY = H, maxX = -1, maxY = -1, opaque = 0, transp = 0
  const bins = new Map()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, a = data[i + 3]
    if (a === 0) { transp++; continue }
    if (a > 200) {
      opaque++
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y
      const k = (data[i] >> 4) << 8 | (data[i + 1] >> 4) << 4 | (data[i + 2] >> 4)
      const b = bins.get(k) || [0, 0, 0, 0]; b[0] += data[i]; b[1] += data[i + 1]; b[2] += data[i + 2]; b[3]++; bins.set(k, b)
    }
  }
  const top = [...bins.values()].sort((a, b) => b[3] - a[3]).slice(0, 4).map(b => `${hex(Math.round(b[0] / b[3]), Math.round(b[1] / b[3]), Math.round(b[2] / b[3]))} ${(100 * b[3] / opaque).toFixed(0)}%`)
  console.log(path.basename(f), `${W}x${H}`, `transparente ${(100 * transp / (W * H)).toFixed(0)}%`, `caja ${maxX - minX + 1}x${maxY - minY + 1} @${minX},${minY}`, '|', top.join(' · '))
}
