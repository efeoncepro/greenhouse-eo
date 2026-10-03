// Cuerpo entero por EXTENSIÓN hacia abajo desde la foto elegida v3 (caso Hum v4, 2026-10-02).
// La elegida va arriba en un lienzo 1024×1536 a la escala en que su cabeza mide ≈ 1/7,5 del alto final;
// el modelo rellena sólo la zona nueva (máscara) y se usa su salida SIN reponer el original (reponer deja recuadro).
// Uso: node expandir-cuerpos.cjs <clave> [<clave>…]  → escribe <clave>/expandir/{base,mascara}.png + prompt.txt
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const D = __dirname
const W = 1024
const H = 1536

// alto de la elegida pegada, como fracción del lienzo (retrato de pecho: la cabeza ocupa ≈ 1/3 de la foto)
const ESCALA = 0.36
const TOP = 0.03

const FICHA = {
  karo: { quien: 'a slim young woman', ropa: 'dark-wash fitted skinny jeans', cuerpo: 'slim build, narrow shoulders, about 1.63 m tall' },
  sophia: { quien: 'a slim woman', ropa: 'dark-wash fitted straight jeans', cuerpo: 'slim build, about 1.65 m tall' },
  isabella: { quien: 'a slim, tall young woman', ropa: 'dark-wash fitted skinny jeans', cuerpo: 'slim and long-limbed, about 1.68 m tall' },
  antonio: { quien: 'an athletic man', ropa: 'dark slim-fit jeans', cuerpo: 'athletic build with broad shoulders, about 1.78 m tall' }
}

const run = async clave => {
  const f = FICHA[clave]
  const src = path.join(D, clave, `${clave}-elegida-v3.png`)
  const out = path.join(D, clave, 'expandir')

  fs.mkdirSync(out, { recursive: true })

  const meta = await sharp(src).metadata()
  const h = Math.round(H * ESCALA)
  const w = Math.round((h * meta.width) / meta.height)
  const left = Math.round((W - w) / 2)
  const top = Math.round(H * TOP)
  const pegado = await sharp(src).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer()
  const pista = await sharp(pegado)
    .extend({ left, right: W - left - w, top, bottom: H - top - h, extendWith: 'copy' })
    .blur(24)
    .png()
    .toBuffer()

  await sharp(pista).composite([{ input: pegado, left, top }]).png().toFile(path.join(out, 'base.png'))

  // Opaco = se conserva. Borde inferior generoso (corta el torso) para que el modelo rehaga la unión.
  const opaco = await sharp({ create: { width: w - 12, height: h - 6 - 50, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .png()
    .toBuffer()

  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: opaco, left: left + 6, top: top + 6 }])
    .png()
    .toFile(path.join(out, 'mascara.png'))

  const prompt =
    `Outpainting. The upper central part of the image is a finished chest-up photograph of ${f.quien} and must stay EXACTLY as it is: the same face, hair, expression, hand gesture and t-shirt. ` +
    `Only fill the transparent area by continuing the same photograph seamlessly into a FULL-LENGTH studio shot: continue the same plain dark navy crew-neck t-shirt down the torso, the arms in a natural relaxed position consistent with the visible hand gesture, ${f.ropa} down to the ankles and plain white low-top sneakers standing on the same plain mid-grey studio floor with a soft natural contact shadow; extend the same mid-grey seamless backdrop on both sides and above. ` +
    `Body: ${f.cuerpo}. CORRECT ADULT PROPORTIONS: standing height about 7.5 times the height of the head, legs about half of the total height, shoulders proportional to the head and neck in the photograph. ` +
    'A natural, relaxed model stance with the weight slightly on one leg, never stiff or symmetrical like a mannequin. ' +
    'Match the perspective, light, grain, depth of field and colour exactly; no seams, no frame, no new people, no new objects, no text and no logos.'

  fs.writeFileSync(path.join(out, 'prompt.txt'), prompt)
  console.log(clave, { w, h, left, top })
}

;(async () => {
  for (const clave of process.argv.slice(2)) await run(clave)
})()
