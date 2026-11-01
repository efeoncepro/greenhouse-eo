// Mide bbox de la mancha terracota y del trazo negro en el render del ícono oficial.
import sharp from 'sharp'
const f = process.argv[2]
const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true })
const box = () => ({ x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: 0 })
const blob = box(), ink = box(), tile = box()
const add = (b, x, y) => { b.n++; b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y) }
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const i = (y * info.width + x) * info.channels
  const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], info.channels === 4 ? data[i + 3] : 255]
  if (a < 200) continue
  add(tile, x, y)
  if (Math.abs(r - 0xd9) < 12 && Math.abs(g - 0x77) < 12 && Math.abs(b - 0x57) < 12) add(blob, x, y)
  if (r < 40 && g < 40 && b < 40) add(ink, x, y)
}
const W = tile.x1 - tile.x0 + 1
const fmt = b => ({ ...b, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1, wRel: +((b.x1 - b.x0 + 1) / W).toFixed(3), hRel: +((b.y1 - b.y0 + 1) / W).toFixed(3), cx: +(((b.x0 + b.x1) / 2 - tile.x0) / W).toFixed(3), cy: +(((b.y0 + b.y1) / 2 - tile.y0) / W).toFixed(3) })
console.log(JSON.stringify({ tile: fmt(tile), blob: fmt(blob), ink: fmt(ink), inkAreaVsBlob: +(ink.n / blob.n).toFixed(3) }, null, 1))
