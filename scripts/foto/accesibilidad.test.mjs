import assert from 'node:assert/strict'
import test from 'node:test'

import {
  esTextoGrande,
  hexARgb,
  lcApca,
  luminanciaApca,
  medirContraColor,
  luminanciaWcag,
  medirVoz,
  razonWcag,
  simularDaltonismo,
  tamanoEnPantalla,
  textoAlternativo,
  umbralApca,
  umbralWcag
} from './accesibilidad.mjs'

const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`)
const wcag = (a, b) => razonWcag(luminanciaWcag(hexARgb(a)), luminanciaWcag(hexARgb(b)))
const apca = (txt, bg) => lcApca(luminanciaApca(hexARgb(txt)), luminanciaApca(hexARgb(bg)))

test('WCAG 2.2: razones de referencia (WebAIM)', () => {
  cerca(wcag('#000000', '#ffffff'), 21, 0.001, 'negro/blanco')
  cerca(wcag('#767676', '#ffffff'), 4.54, 0.01, '#767676 es el gris más claro que pasa 4,5:1 sobre blanco')
  assert.ok(wcag('#777777', '#ffffff') < 4.5, '#777 sobre blanco NO pasa 4,5:1')
  cerca(wcag('#ffffff', '#ffffff'), 1, 0.0001, 'mismo color')
})

test('APCA-W3 0.1.9: valores de referencia del algoritmo oficial', () => {
  cerca(apca('#888888', '#ffffff'), 63.06, 0.05, '#888 sobre #fff')
  cerca(apca('#ffffff', '#888888'), -68.54, 0.05, '#fff sobre #888')
  cerca(apca('#000000', '#ffffff'), 106.04, 0.05, 'negro sobre blanco')
  cerca(apca('#ffffff', '#000000'), -107.88, 0.05, 'blanco sobre negro')
  assert.equal(apca('#777777', '#777777'), 0, 'sin diferencia de luminancia, Lc 0')
})

test('Daltonismo (Machado 2009): blanco y negro no cambian; el rojo se oscurece en protanopía', () => {
  for (const tipo of ['protan', 'deutan', 'tritan']) {
    assert.deepEqual(simularDaltonismo([255, 255, 255], tipo), [255, 255, 255], `blanco en ${tipo}`)
    assert.deepEqual(simularDaltonismo([0, 0, 0], tipo), [0, 0, 0], `negro en ${tipo}`)
  }

  assert.ok(luminanciaWcag(simularDaltonismo([255, 0, 0], 'protan')) < luminanciaWcag([255, 0, 0]))
  assert.throws(() => simularDaltonismo([1, 2, 3], 'acromat'))
})

test('Tamaño en pantalla y texto grande (umbrales del contrato AXIS)', () => {
  cerca(tamanoEnPantalla(95, 941), 39.37, 0.01, '95 px en un lienzo de 941 a 390 CSS px')
  assert.equal(esTextoGrande(24, 400), true)
  assert.equal(esTextoGrande(23.9, 400), false)
  assert.equal(esTextoGrande(18.66, 700), true)
  assert.equal(esTextoGrande(18, 700), false)
  assert.equal(umbralWcag(12, 400), 4.5)
  assert.equal(umbralWcag(30, 400), 3)
})

test('APCA Bronze: 45 para contenido grande, 75 para texto corrido, 60 para el resto', () => {
  assert.equal(umbralApca(40), 45)
  assert.equal(umbralApca(20, 3), 75)
  assert.equal(umbralApca(20, 2), 60)
})

test('medirVoz: peor caso, área bajo umbral y daltonismo sobre un fondo sintético', () => {
  const ancho = 10
  const alto = 2
  // Mitad izquierda negra, mitad derecha #777: la tinta blanca pasa sobre el negro y queda en 4,48 sobre el gris.
  const rgb = Buffer.alloc(ancho * alto * 3)

  for (let y = 0; y < alto; y++) for (let x = 5; x < ancho; x++) rgb.fill(0x77, (y * ancho + x) * 3, (y * ancho + x) * 3 + 3)
  const caja = { left: 0, top: 0, right: ancho, bottom: alto }
  const chica = medirVoz({ rgb, ancho, alto, caja, tinta: [255, 255, 255], cssPx: 12, peso: 400 })

  cerca(chica.wcag, 4.48, 0.01, 'peor caso = el gris')
  assert.equal(chica.cumpleWcag, false, '12 px normal exige 4,5')
  assert.equal(chica.pctBajoUmbral, 50, 'la mitad del área queda bajo 4,5')
  const grande = medirVoz({ rgb, ancho, alto, caja, tinta: [255, 255, 255], cssPx: 30, peso: 400, daltonismo: true })

  assert.equal(grande.cumpleWcag, true, '30 px es texto grande: basta 3:1')
  assert.equal(grande.pctBajoUmbral, 0)
  assert.ok(grande.daltonismo.protan >= 3 && grande.cumpleDaltonismo)
  assert.equal(medirVoz({ rgb, ancho, alto, caja: { left: 20, top: 0, right: 25, bottom: 1 }, tinta: [255, 255, 255], cssPx: 12, peso: 400 }), null)
})

test('Texto alternativo: toda voz visible, sin marcas de estilo, en orden de lectura', () => {
  const alt = textoAlternativo({
    altText: 'Una mujer mira una proyección.',
    lead: 'En la respuesta de la IA,',
    dominant: 'Sé la [[referencia]].',
    after: 'Eso es lo que **operamos**.',
    cta: { text: 'Pide el diagnóstico', descriptor: 'SEO + AEO' }
  })

  assert.equal(alt, 'Una mujer mira una proyección. Texto en la imagen: «En la respuesta de la IA,» «Sé la referencia.» «Eso es lo que operamos.» Botón: «Pide el diagnóstico» SEO + AEO')
  assert.doesNotMatch(alt, /\*\*|\[\[|\]\]/)
})

test('medirContraColor: tinta sobre relleno plano y límites no textuales', () => {
  const cta = medirContraColor({ tinta: hexARgb('#000000'), fondo: hexARgb('#ffffff'), cssPx: 14, peso: 700 })

  assert.equal(cta.wcag, 21)
  assert.equal(cta.cumpleWcag, true)
  assert.equal(cta.pctBajoUmbral, 0)
  assert.ok(cta.cumpleDaltonismo)
  const flojo = medirContraColor({ tinta: hexARgb('#777777'), fondo: hexARgb('#ffffff'), cssPx: 12, peso: 400 })

  assert.equal(flojo.cumpleWcag, false)
  assert.equal(flojo.pctBajoUmbral, 100)
  const rgb = Buffer.alloc(4 * 3, 0)
  const borde = medirVoz({ rgb, ancho: 2, alto: 2, caja: { left: 0, top: 0, right: 2, bottom: 2 }, tinta: hexARgb('#444444'), umbral: 3, apca: false })

  assert.equal(borde.umbralWcag, 3)
  assert.equal(borde.apca, null)
  assert.equal(borde.cumpleApca, null)
  assert.equal(borde.cssPx, null)
})

