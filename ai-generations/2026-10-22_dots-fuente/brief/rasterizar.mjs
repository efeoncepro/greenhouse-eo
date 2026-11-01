// Rasteriza cada SVG grande (56×56) a PNG transparente 1024×1024 con sharp.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const [svgDir, outDir, size = '1024'] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
let ok = 0, bad = []
for (const f of fs.readdirSync(svgDir).filter(f => f.endsWith('-large.svg'))) {
  try {
    const svg = fs.readFileSync(path.join(svgDir, f))
    await sharp(svg, { density: 72 * Number(size) / 56 }).resize(Number(size), Number(size)).png().toFile(path.join(outDir, f.replace('-large.svg', `-${size}.png`)))
    ok++
  } catch (e) { bad.push(f + ': ' + e.message) }
}
console.log('ok', ok, 'fallas', bad.length); bad.forEach(b => console.log(b))
