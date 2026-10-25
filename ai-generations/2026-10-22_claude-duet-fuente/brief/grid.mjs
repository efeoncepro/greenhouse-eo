import sharp from 'sharp'
import path from 'node:path'
const [out, ...files] = process.argv.slice(2)
const T = 260, cols = 6, pad = 10
const rows = Math.ceil(files.length / cols)
const tiles = await Promise.all(files.map(async (f, i) => ({
  input: await sharp(f).flatten({ background: '#9a9a9a' }).resize(T, T, { fit: 'contain', background: '#9a9a9a' }).png().toBuffer(),
  left: pad + (i % cols) * (T + pad), top: pad + Math.floor(i / cols) * (T + pad + 20)
})))
const labels = files.map((f, i) => `<text x="${pad + (i % cols) * (T + pad)}" y="${pad + Math.floor(i / cols) * (T + pad + 20) + T + 15}" font-size="12" font-family="Helvetica">${i}: ${path.basename(f).slice(0, 34)}</text>`).join('')
const W = pad + cols * (T + pad), H = pad + rows * (T + pad + 20)
await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
  .composite([...tiles, { input: Buffer.from(`<svg width="${W}" height="${H}">${labels}</svg>`), left: 0, top: 0 }]).png().toFile(out)
