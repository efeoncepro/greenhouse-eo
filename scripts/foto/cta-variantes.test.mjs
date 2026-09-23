import assert from 'node:assert/strict'
import test from 'node:test'

import { axisAdvertising } from '@efeoncepro/axis-tokens'

import { coloresDe, elegirVariante, evaluarVariante } from './cta-variantes.mjs'

const C = axisAdvertising.color
const tokens = { acento: C.growthOnDark, tintaDeclarada: null, tintaSobreRelleno: C.inkOnLight }
const caja = { left: 20, top: 20, right: 80, bottom: 40 }
const ancho = 100
const alto = 60

const escena = pixel => {
  const rgb = Buffer.alloc(ancho * alto * 3)

  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) rgb.set(pixel(x, y), (y * ancho + x) * 3)

  return rgb
}

const oscura = escena(() => [8, 10, 18])
const rayada = escena(x => (x % 8 < 4 ? [8, 10, 18] : [245, 245, 245]))

test('Escena oscura y calma: la intención discreta se respeta (texto)', () => {
  const r = elegirVariante({ prominencia: 'discreta', rgb: oscura, ancho, alto, caja, cssPx: 12, tokens })

  assert.equal(r.elegida, 'text')
  assert.equal(r.escalo, false)
  assert.match(r.motivo, /discreta → text/)
})

test('Escena rayada: el texto no se sostiene solo y se ESCALA, nunca se baja', () => {
  const r = elegirVariante({ prominencia: 'discreta', rgb: rayada, ancho, alto, caja, cssPx: 12, tokens })

  assert.notEqual(r.elegida, 'text')
  assert.equal(r.escalo, true)
  assert.ok(r.evaluadas[0].viable === false && /no la sostiene/.test(r.evaluadas[0].motivo))
})

test('Intención destacada sobre fondo oscuro: relleno, con tinta legible sobre el relleno', () => {
  const r = elegirVariante({ prominencia: 'destacada', rgb: oscura, ancho, alto, caja, cssPx: 12, tokens })

  assert.equal(r.elegida, 'solid')
  assert.equal(r.evaluadas.length, 1)
  assert.ok(r.evaluadas[0].texto >= 4.5 && r.evaluadas[0].separacion >= 3)
})

test('Cada variante porta el acento donde corresponde', () => {
  assert.deepEqual(coloresDe('text', tokens), { tinta: C.growthOnDark })
  assert.deepEqual(coloresDe('outline', tokens), { tinta: C.growthOnDark, borde: C.growthOnDark })
  assert.deepEqual(coloresDe('solid', tokens), { tinta: C.inkOnLight, relleno: C.growthOnDark })
  assert.throws(() => elegirVariante({ prominencia: 'enorme', rgb: oscura, ancho, alto, caja, cssPx: 12, tokens }), /prominencia desconocida/)
})

test('El contorno exige tinta Y borde legibles', () => {
  const e = evaluarVariante('outline', { rgb: rayada, ancho, alto, caja, cssPx: 12, colores: coloresDe('outline', tokens) })

  assert.equal(e.viable, false)
  assert.ok(typeof e.borde === 'number')
})
