import sharp from 'sharp'
const [,, out, ...files] = process.argv
const W = 960, cols = 2
const tiles = await Promise.all(files.map(async f => { const b = await sharp(f).resize({ width: W }).png().toBuffer(); const m = await sharp(b).metadata(); return { b, h: m.height } }))
const rows = []
for (let i = 0; i < tiles.length; i += cols) rows.push(tiles.slice(i, i + cols))
let y = 0
const comp = []
for (const r of rows) { r.forEach((t, i) => comp.push({ input: t.b, left: i * W, top: y })); y += Math.max(...r.map(t => t.h)) }
await sharp({ create: { width: W * cols, height: y, channels: 3, background: '#222' } }).composite(comp).png().toFile(out)
