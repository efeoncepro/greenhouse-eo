import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
const [dir, out] = process.argv.slice(2)
const files = fs.readdirSync(dir).filter(f => /\.(jpg|png)$/.test(f)).sort()
const W = 800, H = 450, COLS = 3, PER = 9
for (let s = 0; s * PER < files.length; s++) {
  const chunk = files.slice(s * PER, s * PER + PER)
  const comps = await Promise.all(chunk.map(async (f, i) => ({ input: await sharp(path.join(dir, f)).resize(W, H).jpeg({ quality: 82 }).toBuffer(), left: (i % COLS) * W, top: Math.floor(i / COLS) * H })))
  await sharp({ create: { width: W * COLS, height: H * Math.ceil(chunk.length / COLS), channels: 3, background: '#000' } }).composite(comps).jpeg({ quality: 80 }).toFile(`${out}-${s + 1}.jpg`)
  console.log(`${out}-${s + 1}.jpg`, chunk.join(' | '))
}
