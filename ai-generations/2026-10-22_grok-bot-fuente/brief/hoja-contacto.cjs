// Hoja de contacto: cuadrícula de 300 px con el nombre de archivo debajo.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const fs = require('fs'), path = require('path')
const dirs = ['fuente', 'fuente/formas-svg-oficial', 'fuente/estados-svg-oficial', 'cuadros']
const files = dirs.flatMap(d => fs.readdirSync(d).filter(f => f.endsWith('.png')).sort().map(f => path.join(d, f)))
const T = 300, L = 44, C = 6
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
;(async () => {
  const tiles = await Promise.all(files.map(async f => {
    const img = await sharp(f).resize(T - 16, T - 16, { fit: 'contain', background: '#E9E9E9' }).flatten({ background: '#E9E9E9' }).png().toBuffer()
    const name = path.basename(f).replace(/\.png$/, '')
    const lines = [name.slice(0, 40), name.slice(40, 80)].filter(Boolean)
    const label = Buffer.from(`<svg width="${T}" height="${L}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/>${lines.map((l, i) => `<text x="6" y="${16 + i * 16}" font-family="Helvetica" font-size="12" fill="#222">${esc(l)}</text>`).join('')}</svg>`)
    return sharp({ create: { width: T, height: T + L, channels: 3, background: '#fff' } }).composite([{ input: img, left: 8, top: 8 }, { input: label, left: 0, top: T }]).png().toBuffer()
  }))
  const rows = Math.ceil(files.length / C)
  await sharp({ create: { width: T * C, height: (T + L) * rows, channels: 3, background: '#fff' } })
    .composite(tiles.map((b, i) => ({ input: b, left: (i % C) * T, top: Math.floor(i / C) * (T + L) }))).png().toFile('hoja-de-contacto.png')
  console.log(files.length)
})()
