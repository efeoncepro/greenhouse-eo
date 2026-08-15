// Genera src/app/favicon.ico (multi-size, PNG-embedded) + src/app/apple-icon.png
// desde el SVG canónico de marca. El contenedor ICO se ensambla a mano:
// header 6B + 16B por entrada + payloads PNG (ICO admite PNG embebido desde Vista).
import { readFile, writeFile } from 'node:fs/promises'

import sharp from 'sharp'

const SRC = 'public/images/greenhouse/SVG/favicon-blue-negative.svg'
const svg = await readFile(SRC)

const SIZES = [16, 32, 48, 64]

const pngs = await Promise.all(
  SIZES.map(size =>
    sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer()
  )
)

const header = Buffer.alloc(6)

header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: 1 = icon
header.writeUInt16LE(SIZES.length, 4)

let offset = 6 + SIZES.length * 16

const entries = SIZES.map((size, i) => {
  const e = Buffer.alloc(16)

  e.writeUInt8(size >= 256 ? 0 : size, 0) // width
  e.writeUInt8(size >= 256 ? 0 : size, 1) // height
  e.writeUInt8(0, 2) // palette
  e.writeUInt8(0, 3) // reserved
  e.writeUInt16LE(1, 4) // color planes
  e.writeUInt16LE(32, 6) // bits per pixel
  e.writeUInt32LE(pngs[i].length, 8)
  e.writeUInt32LE(offset, 12)
  offset += pngs[i].length

  return e
})

await writeFile('src/app/favicon.ico', Buffer.concat([header, ...entries, ...pngs]))

// apple-touch-icon: 180x180, sin alpha (iOS pinta negro detrás del transparente)
await sharp(svg, { density: 512 })
  .resize(180, 180, { fit: 'contain', background: { r: 2, g: 60, b: 112, alpha: 1 } })
  .flatten({ background: { r: 2, g: 60, b: 112 } })
  .png({ compressionLevel: 9 })
  .toFile('src/app/apple-icon.png')

console.log('favicon.ico:', SIZES.join('/'), '·', 6 + SIZES.length * 16 + pngs.reduce((a, b) => a + b.length, 0), 'bytes')
