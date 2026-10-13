import sharp from 'sharp'

const [dir, out, ...ids] = process.argv.slice(2)
const W = 760, H = 428, cols = 2
const tiles = await Promise.all(ids.map(async (id, i) => ({ input: await sharp(`${dir}/Tec-${id}.png`).resize(W, H).toBuffer(), left: (i % cols) * (W + 8), top: Math.floor(i / cols) * (H + 8) })))

await sharp({ create: { width: cols * (W + 8), height: Math.ceil(ids.length / cols) * (H + 8), channels: 3, background: '#333' } }).composite(tiles).jpeg({ quality: 82 }).toFile(out)
