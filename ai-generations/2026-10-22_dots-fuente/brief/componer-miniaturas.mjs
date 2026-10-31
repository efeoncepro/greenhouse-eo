// Recompone las miniaturas oficiales del runtime orbit-character (capas PNG + offsets) en lienzos de 384×384.
// Uso: node componer-miniaturas.mjs <orbit-thumbnails> <salida>
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const [dir, out] = process.argv.slice(2)
const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))
fs.mkdirSync(out, { recursive: true })
let n = 0
for (const [key, layers] of Object.entries(idx.entries)) {
  if (!layers) { console.log("sin capas:", key); continue }
  const comps = layers.map(([fi, x, y]) => ({ input: path.join(dir, 'images', idx.files[fi][0] + '.png'), left: x, top: y }))
  const name = 'orbit-' + key.replaceAll('/', '--') + '.png'
  await sharp({ create: { width: 384, height: 384, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps).png().toFile(path.join(out, name))
  n++
}
console.log('compuestas', n)
