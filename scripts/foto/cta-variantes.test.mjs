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

test('Naranja sobre un gris oscuro de foto: con protanopía no alcanza ninguna sin degradar la tinta', () => {
  // Sobre negro casi puro el naranja SÍ se lee con protanopía (4,98:1); el caso real es el gris oscuro de las fotos,
  // donde pasa WCAG con margen en visión típica (~5,7:1) y cae bajo 4,5:1 con protanopía. Y el relleno tampoco
  // salva (corregido 2026-09-23): con protanopía el naranja se oscurece y la tinta oscura del botón cae con él. Sin
  // tinta segura declarada, queda la que más separa —no el relleno, que era la peor— y se marca sin margen.
  const grisFoto = escena(() => [28, 28, 30])
  const naranja = { acento: C.accentSurface, tintaDeclarada: null, tintaSobreRelleno: C.inkOnLight }
  const r = elegirVariante({ prominencia: 'discreta', rgb: grisFoto, ancho, alto, caja, cssPx: 12, tokens: naranja })

  assert.equal(r.sinMargen, true, r.motivo)
  assert.notEqual(r.elegida, 'solid', r.motivo)
  assert.match(r.evaluadas[0].motivo, /daltonismo/)
  assert.match(r.evaluadas.find(e => e.variante === 'solid').motivo, /tinta sobre el relleno/)
})

test('Degradación canónica: antes del relleno, el contorno con tinta blanca y el acento en el borde', () => {
  // Misma escena que la anterior, ahora con la tinta segura declarada: la tinta naranja del contorno cae con
  // protanopía, pero el borde naranja sí separa, así que se degrada la TINTA y el acento queda en su portador.
  const grisFoto = escena(() => [28, 28, 30])
  const naranja = { acento: C.accentSurface, tintaDeclarada: null, tintaSobreRelleno: C.inkOnLight, tintaSegura: C.inkOnDark }
  const r = elegirVariante({ prominencia: 'discreta', rgb: grisFoto, ancho, alto, caja, cssPx: 12, tokens: naranja })

  assert.equal(r.elegida, 'outline', r.motivo)
  assert.equal(r.degradada, true)
  assert.match(r.motivo, /tinta blanca, acento en el borde/)
})

test('La tinta del CTA de TEXTO nunca se degrada: sin acento no hay CTA', () => {
  const r = elegirVariante({ prominencia: 'discreta', rgb: rayada, ancho, alto, caja, cssPx: 12, tokens: { ...tokens, tintaSegura: C.inkOnDark } })

  assert.ok(r.evaluadas.filter(e => e.variante === 'text').every(e => !e.degradada))
})

test('APCA también decide: una tinta que pasa WCAG con margen pero no APCA no es viable', () => {
  // Tinta gris muy oscura sobre un gris medio a 12 CSS px: WCAG ~5,5:1 (pasa con el margen de 1,1) y APCA Lc ~47 (< 60).
  const grisMedio = escena(() => [160, 160, 160])
  const e = evaluarVariante('text', { rgb: grisMedio, ancho, alto, caja, cssPx: 12, colores: { tinta: '#2a2a2a' } })

  assert.equal(e.viable, false, e.motivo)
  assert.match(e.motivo, /APCA/)
})

test('Sin margen en ninguna: queda la que MÁS separa, no siempre el relleno', () => {
  // Rayas blanco/negro finas: nada alcanza con margen. La elección es la de mayor margen medido, sea cual sea.
  const r = elegirVariante({ prominencia: 'discreta', rgb: rayada, ancho, alto, caja, cssPx: 12, tokens: { ...tokens, tintaSegura: C.inkOnDark } })

  if (r.sinMargen) {
    const mejor = Math.max(...r.evaluadas.map(e => e.margen))

    assert.equal(r.evaluadas.find(e => e.variante === r.elegida && e.degradada === r.degradada).margen, mejor)
  }
})

test('El CTA grande también exige 4,5:1 (canon), aunque WCAG aceptaría 3:1 por su tamaño', () => {
  // Blanco sobre gris #838383: 3,79:1. A 40 CSS px en negrita es «texto grande» (WCAG 3:1) y antes la variante `text`
  // era viable; el canon del CTA pide 4,5:1 a cualquier tamaño (auditoría de diseño N6, tramo 7).
  const gris = escena(() => [131, 131, 131])
  const e = evaluarVariante('text', { rgb: gris, ancho, alto, caja, cssPx: 40, colores: { tinta: '#ffffff' } })

  assert.equal(e.viable, false)
  assert.match(e.motivo, /4\.5:1/)
})
