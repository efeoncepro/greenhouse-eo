// Cuerpo entero v5: la escala sale de MEDIR la cara (Vision, ojos→mentón), no del ojo [operador, 2026-10-02:
// «la foto entera de Karo se ve con la cabeza gigantesca»]. La v4 pegaba el retrato al 36 % a ojo y medía 5,9 cabezas.
// Calibración: la ancla de cuerpo aprobada de Nexa mide 7,2 cabezas con el mismo criterio (cabeza ≈ 2 × ojos→mentón).
// Objetivo: cabeza = alto de la figura / 7,5 → ojos→mentón ≈ 94 px en un lienzo de 1536.
// Uso: node expandir-cuerpos-v5.cjs  (lee medidas-elegidas.jsonl; escribe <clave>/expandir-v5/{base,mascara}.png + prompt.txt)
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const D = __dirname
const W = 1024
const H = 1536
const OJO_MENTON = Number(process.env.OJO_MENTON ?? 94)
const CORONILLA = Math.round(H * 0.03)

const FICHA = {
  hum: { src: 'hum/hum-elegida-v3.png', quien: 'a woman with a medium build and natural moderate curves', ropa: 'the same dark-wash fitted skinny jeans', alto: 'about 1.70 m' },
  karo: { src: 'karo/karo-elegida-v3.png', quien: 'a slim young woman', ropa: 'dark-wash fitted skinny jeans', alto: 'about 1.63 m' },
  sophia: { src: 'sophia/sophia-elegida-v3.png', quien: 'a slim woman', ropa: 'dark-wash fitted straight jeans', alto: 'about 1.65 m' },
  isabella: { src: 'isabella/isabella-elegida-v3-pecas.png', quien: 'a slim, tall, long-limbed young woman', ropa: 'dark-wash fitted skinny jeans', alto: 'about 1.68 m' },
  antonio: { src: 'antonio/antonio-elegida-v3.png', quien: 'an athletic man with broad shoulders', ropa: 'dark slim-fit jeans', alto: 'about 1.78 m' }
}

const medidas = Object.fromEntries(
  fs.readFileSync(path.join(D, 'medidas-elegidas.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)).map(m => [path.basename(m.archivo), m])
)

;(async () => {
  for (const [clave, f] of Object.entries(FICHA)) {
    const src = path.join(D, f.src)
    const m = medidas[path.basename(f.src)]
    const meta = await sharp(src).metadata()
    const ec = m.menton - m.ojos
    const k = OJO_MENTON / ec
    const w = Math.round(meta.width * k)
    const h = Math.round(meta.height * k)
    const left = Math.round((W - w) / 2)
    const top = Math.round(CORONILLA - (m.ojos - ec) * k)
    const out = path.join(D, clave, process.env.OJO_MENTON ? `expandir-v5-${process.env.OJO_MENTON}` : 'expandir-v5')

    fs.mkdirSync(out, { recursive: true })

    const pegado = await sharp(src).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer()
    const visible = { left: Math.max(0, -top), top: Math.max(0, top) }
    const recorte = await sharp(pegado).extract({ left: 0, top: visible.left, width: w, height: h - visible.left }).png().toBuffer()
    const hv = h - visible.left
    const pista = await sharp(recorte)
      .extend({ left, right: W - left - w, top: visible.top, bottom: H - visible.top - hv, extendWith: 'copy' })
      .blur(24)
      .png()
      .toBuffer()

    await sharp(pista).composite([{ input: recorte, left, top: visible.top }]).png().toFile(path.join(out, 'base.png'))

    const opaco = await sharp({ create: { width: w - 12, height: hv - 6 - 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer()

    await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: opaco, left: left + 6, top: visible.top + 6 }])
      .png()
      .toFile(path.join(out, 'mascara.png'))

    const prompt =
      `Outpainting. The small upper central part of the image is a finished photograph of ${f.quien} and must stay EXACTLY as it is, at EXACTLY this size: the same face, hair, expression, hand gesture and t-shirt. ` +
      `Only fill the transparent area by continuing the same photograph seamlessly into a FULL-LENGTH studio shot of a person ${f.alto} tall: continue the same plain dark navy crew-neck t-shirt down the torso, the arms in a natural relaxed position consistent with the visible hand gesture, ${f.ropa} down to the ankles and plain white low-top sneakers standing on the same plain mid-grey studio floor with a soft contact shadow near the bottom of the frame; extend the same mid-grey seamless backdrop on both sides and above. ` +
      'PROPORTIONS (critical): the head already in the photograph is SMALL relative to the full body; the whole figure, from the top of the head to the soles of the shoes, is about 7.5 head-heights tall and fills the frame down to near the bottom edge. LONG LEGS: the legs, from the hip to the sole, are about half of the total height; the waist sits a little above the middle of the figure. Never shorten the legs, never a big head on a small body. ' +
      'A natural, relaxed model stance with the weight slightly on one leg, never stiff or symmetrical like a mannequin. ' +
      'Match the perspective, light, grain, depth of field and colour exactly; no seams, no frame, no new people, no new objects, no text and no logos.'

    fs.writeFileSync(path.join(out, 'prompt.txt'), prompt)
    console.log(clave, { ec, k: k.toFixed(3), w, h, left, top })
  }
})()
