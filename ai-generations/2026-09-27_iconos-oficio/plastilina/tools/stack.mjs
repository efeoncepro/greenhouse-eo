import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/axis-design-system/package.json')
const sharp = require('sharp')
const [out, ...files] = process.argv.slice(2)
const H = 208, W = 812
await sharp({ create: { width: W, height: H * files.length, channels: 3, background: '#808890' } })
  .composite(files.map((f, i) => ({ input: f, top: i * H, left: 0 }))).png().toFile(out)
console.log(out)
