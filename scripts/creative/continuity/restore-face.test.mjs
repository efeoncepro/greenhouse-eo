import assert from 'node:assert/strict'
import { test } from 'node:test'

import sharp from 'sharp'

import { restoreFace } from './restore-face.mjs'

// Imagen con textura determinística (una «cara» de patrones) para que la correlación tenga dónde agarrarse.
const textured = async (w, h, seed) => {
  const buf = Buffer.alloc(w * h * 3)
  let s = seed

  for (let i = 0; i < buf.length; i++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    buf[i] = s >>> 24
  }

  return sharp(buf, { raw: { width: w, height: h, channels: 3 } }).blur(2).png().toBuffer()
}

test('encuentra la cara desplazada y escalada, y la repone con el color corregido', async () => {
  const W = 400
  const H = 400
  const approved = await textured(W, H, 7)
  // El «editado» es el aprobado escalado 1,1×, corrido y con un tinte: la cara está en otra posición y escala.
  const scaled = await sharp(approved).resize(440, 440).toBuffer()

  const edited = await sharp({ create: { width: W, height: H, channels: 3, background: '#808080' } })
    .composite([{ input: await sharp(scaled).extract({ left: 10, top: 30, width: 400, height: 370 }).toBuffer(), left: 0, top: 0 }])
    .linear(1, 12)
    .png()
    .toBuffer()

  const r = await restoreFace({ src: approved, face: [200, 200, 40, 50], dst: edited, scale: [0.9, 1.3] })

  assert.ok(r.ncc > 0.9, `correlación ${r.ncc}`)
  assert.ok(Math.abs(r.scale - 1.1) <= 0.05, `escala ${r.scale}`)
  // Centro esperado: 200*1.1 - 10 = 210, 200*1.1 - 30 = 190 → esquina = centro - media elipse escalada
  assert.ok(Math.abs(r.x + r.w / 2 - 210) <= 4, `x ${r.x + r.w / 2}`)
  assert.ok(Math.abs(r.y + r.h / 2 - 190) <= 4, `y ${r.y + r.h / 2}`)
  assert.ok(r.offset.every(o => o > 6 && o < 18), `offset ${r.offset}`)
  assert.ok(r.buffer, 'escribió la salida')
})

test('no escribe cuando la cara no está en el plano editado', async () => {
  const approved = await textured(300, 300, 3)
  const unrelated = await textured(300, 300, 99)
  const r = await restoreFace({ src: approved, face: [150, 150, 40, 50], dst: unrelated, scale: [0.9, 1.1] })

  assert.ok(r.ncc < 0.8, `correlación ${r.ncc}`)
  assert.equal(r.buffer, null)
})
