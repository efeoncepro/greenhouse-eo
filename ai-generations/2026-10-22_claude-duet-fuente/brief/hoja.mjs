// Hoja de contacto rotulada (fondo claro), 3 columnas.
import sharp from 'sharp'
const [out, ...pairs] = process.argv.slice(2)
const items = []; for (let i = 0; i < pairs.length; i += 2) items.push([pairs[i], pairs[i + 1]])
const T = 520, cols = 3, pad = 28, lab = 56, head = 90
const rows = Math.ceil(items.length / cols)
const W = pad + cols * (T + pad), H = head + rows * (T + lab + pad) + pad
const comps = []
let svg = `<text x="${pad}" y="56" font-size="30" font-family="Helvetica" font-weight="bold" fill="#141413">Claude Duet — fuente oficial (claude.com, 2026-10-22) · sin mascota oficial</text>`
for (const [i, [f, label]] of items.entries()) {
  const x = pad + (i % cols) * (T + pad), y = head + Math.floor(i / cols) * (T + lab + pad)
  comps.push({ input: await sharp(f).flatten({ background: '#ECEAE4' }).resize(T, T, { fit: 'contain', background: '#ECEAE4' }).png().toBuffer(), left: x, top: y })
  const [l1, l2 = ''] = label.split('|')
  svg += `<text x="${x}" y="${y + T + 22}" font-size="19" font-family="Helvetica" font-weight="bold" fill="#141413">${l1}</text><text x="${x}" y="${y + T + 46}" font-size="16" font-family="Helvetica" fill="#555">${l2}</text>`
}
await sharp({ create: { width: W, height: H, channels: 3, background: '#FAFAF8' } })
  .composite([...comps, { input: Buffer.from(`<svg width="${W}" height="${H}">${svg}</svg>`), left: 0, top: 0 }]).png().toFile(out)
