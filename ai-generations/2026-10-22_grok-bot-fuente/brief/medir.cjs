// Muestrea colores (mediana de una ventana) en imágenes oficiales.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp')
const pts = JSON.parse(process.argv[2])
;(async () => {
  for (const [f, x, y, r = 4] of pts) {
    const { data, info } = await sharp(f).extract({ left: x - r, top: y - r, width: 2 * r, height: 2 * r }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const ch = [0, 1, 2].map(c => { const v = []; for (let i = c; i < data.length; i += 3) v.push(data[i]); v.sort((a, b) => a - b); return v[v.length >> 1] })
    console.log(f.split('/').pop(), x, y, '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase())
  }
})()
