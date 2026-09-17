// Kit final: recorta cada render al logo con margen (6 %), genera versión sobre fondo de estudio neutro y hoja de revisión.
// Uso: node blender/postproceso.mjs <dir_render> <dir_kit> <hoja.png>
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
const [, , src, dst, hoja] = process.argv
fs.mkdirSync(dst, { recursive: true })
const files = fs.readdirSync(src).filter(f => f.endsWith('-transparente.png')).sort()
const tiles = []
for (const f of files) {
  const { data, info } = await sharp(path.join(src, f)).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })
  const pad = Math.round(Math.max(info.width, info.height) * 0.06)
  const trans = await sharp(data).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  await sharp(trans).toFile(path.join(dst, f))
  const estudio = f.replace('-transparente.png', '-fondo-estudio.png')
  await sharp(trans).flatten({ background: '#e8e6e1' }).png().toFile(path.join(dst, estudio))
  tiles.push({ f, buf: await sharp(trans).resize(560, 300, { fit: 'contain', background: '#e8e6e1' }).flatten({ background: '#e8e6e1' }).toBuffer() })
}
for (const j of fs.readdirSync(src).filter(f => f.endsWith('.json'))) fs.copyFileSync(path.join(src, j), path.join(dst, j))
if (hoja) {
  const cols = 4, W = 560, H = 300, L = 30
  const comps = []
  tiles.forEach((t, i) => {
    const x = (i % cols) * W, y = Math.floor(i / cols) * (H + L)
    const label = t.f.replace(/^efeonce-logo-3d-[a-z]+-[a-z]+-/, '').replace('-transparente.png', '')
    comps.push({ input: Buffer.from(`<svg width="${W}" height="${L}"><text x="10" y="21" font-family="Helvetica" font-size="16" fill="#023c70">${label}</text></svg>`), left: x, top: y })
    comps.push({ input: t.buf, left: x, top: y + L })
  })
  await sharp({ create: { width: cols * W, height: Math.ceil(tiles.length / cols) * (H + L), channels: 3, background: '#e8e6e1' } }).composite(comps).png().toFile(hoja)
}
console.log('kit', files.length)
