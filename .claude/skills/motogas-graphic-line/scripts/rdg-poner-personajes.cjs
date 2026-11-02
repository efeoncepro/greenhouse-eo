// Pone los personajes 2D sobre un lugar (coordenadas nativas 1600×2000) y deja sus cajas para la pieza.
// Uso: node poner.cjs <lugar.png> <layout.json> <salida.png> <cajas.json>
const sharp = require('sharp'), fs = require('fs'), path = require('path')
const A = process.env.ASSETS
;(async () => {
  const [lugar, lay, out, cajasOut] = process.argv.slice(2)
  const L = JSON.parse(fs.readFileSync(lay, 'utf8'))
  const comps = [], cajas = []
  for (const e of L) {
    const src = path.join(A, e.k + '.png'), m = await sharp(src).metadata()
    const w = Math.round(e.h * m.width / m.height), left = Math.round(e.cx - w / 2), top = Math.round(e.base - e.h)
    let img = sharp(src).resize(w, e.h); if (e.flip) img = img.flop()
    comps.push({ input: await img.png().toBuffer(), left, top })
    cajas.push({ k: e.k, left, top, w, h: e.h, flip: !!e.flip })
  }
  await sharp(lugar).composite(comps).png().toFile(out)
  fs.writeFileSync(cajasOut, JSON.stringify(cajas, null, 2))
  console.log(out, JSON.stringify(cajas))
})()
