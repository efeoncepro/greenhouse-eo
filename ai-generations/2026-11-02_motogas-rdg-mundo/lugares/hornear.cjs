// Fondo final: lugar integrado + personajes originales con la luz del sol (izquierda arriba) y la sombra propia
// (derecha abajo) en soft-light, recortadas por su silueta. Deja también cada personaje iluminado suelto.
// Uso: node hornear.cjs <integrado.png> <layout.json> <salida.jpg> <prefijo-capas>
const sharp = require('sharp'), fs = require('fs'), path = require('path')
const A = process.env.ASSETS
;(async () => {
  const [base, lay, out, pref] = process.argv.slice(2)
  const L = JSON.parse(fs.readFileSync(lay, 'utf8'))
  const comps = []
  for (const [i, e] of L.entries()) {
    const src = path.join(A, e.k + '.png'), m = await sharp(src).metadata()
    const w = Math.round(e.h * m.width / m.height), h = e.h
    let img = sharp(src).resize(w, h); if (e.flip) img = img.flop()
    const fig = await img.png().toBuffer()
    const luz = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE7B8" stop-opacity=".75"/><stop offset=".45" stop-color="#808080" stop-opacity="0"/><stop offset="1" stop-color="#3A0A04" stop-opacity=".55"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`)
    const luzRecortada = await sharp(luz).composite([{ input: fig, blend: 'dest-in' }]).png().toBuffer()
    const lit = await sharp(fig).composite([{ input: luzRecortada, blend: 'soft-light' }]).png().toBuffer()
    // soft-light deja el alfa de la figura; se reaplica la silueta original
    const final = await sharp(lit).composite([{ input: fig, blend: 'dest-in' }]).png().toBuffer()
    fs.writeFileSync(`${pref}-${i}.png`, final)
    comps.push({ input: final, left: Math.round(e.cx - w / 2), top: Math.round(e.base - h) })
  }
  await sharp(base).composite(comps).jpeg({ quality: 90, mozjpeg: true }).toFile(out)
  console.log(out)
})()
