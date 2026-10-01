// Punto extremo de la silueta en una dirección (dx, dy). Uso: node extreme.mjs glifo.json dx dy
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire('/Users/jreye/Documents/axis-design-system/package.json')
const sharp = require('sharp')
const [f, dx, dy] = process.argv.slice(2); const g = JSON.parse(readFileSync(f, 'utf8'))
const N = 480
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="0 0 48 48"><rect width="48" height="48" fill="#000"/><path d="${g.d}" transform="${g.t}" fill="#fff"/></svg>`
const { data } = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
let best = null
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (data[(y * N + x) * 3] > 127) { const s = x * +dx + y * +dy; if (!best || s > best.s) best = { s, x, y } }
console.log(`${f} extremo (${dx},${dy}): (${(best.x / 10).toFixed(1)}, ${(best.y / 10).toFixed(1)})`)
