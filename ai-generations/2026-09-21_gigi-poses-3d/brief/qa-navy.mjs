import sharp from 'sharp'
import { readdirSync } from 'node:fs'
const dir = process.argv[2], out = process.argv[3], filter = process.argv[4] ?? ''
const files = readdirSync(dir).filter(f => f.endsWith('-transparente.png') && f.includes(filter)).sort()
const CELL = 420, COLS = 4, rows = Math.ceil(files.length / COLS)
const tiles = []
for (const [i, f] of files.entries()) {
  const buf = await sharp(`${dir}/${f}`).resize(CELL - 16, CELL - 16, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toBuffer()
  tiles.push({ input: buf, left: (i % COLS) * CELL + 8, top: Math.floor(i / COLS) * CELL + 8 })
}
await sharp({ create: { width: COLS*CELL, height: rows*CELL, channels: 4, background: { r:16,g:32,b:60,alpha:1 } } })
  .composite(tiles).png().toFile(out)
console.log(`${files.length} sobre navy → ${out}`)
