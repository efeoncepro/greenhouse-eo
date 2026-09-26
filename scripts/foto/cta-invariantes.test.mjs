import assert from 'node:assert/strict'
import test from 'node:test'

import { fueraDeReserva, invariantesMaquetacion, recorteFinalEnPlate } from './cta-invariantes.mjs'

test('final sólo tolera el redondeo subpíxel del plate, no un cambio de ratio que recorta la escena', () => {
  assert.equal(recorteFinalEnPlate({ ancho: 1080, alto: 1920, finalAncho: 1080, finalAlto: 1920 }), 0)
  assert.ok(recorteFinalEnPlate({ ancho: 941, alto: 1672, finalAncho: 1080, finalAlto: 1920 }) < 1)
  assert.ok(recorteFinalEnPlate({ ancho: 1080, alto: 1920, finalAncho: 1080, finalAlto: 1910 }) > 9)
})

const caja = (left, top, right, bottom) => ({ left, top, right, bottom })

const base = () => [
  { id: 'dominante', tipo: 'texto', box: caja(80, 100, 900, 300) },
  { id: 'dominante-acento-0', tipo: 'acento', box: caja(500, 100, 900, 300), dentroDe: 'dominante' },
  { id: 'cta-boton', tipo: 'cta', box: caja(80, 400, 500, 480) },
  { id: 'cta', tipo: 'texto', box: caja(110, 420, 470, 460), dentroDe: 'cta-boton' },
  { id: 'descriptor', tipo: 'texto', box: caja(80, 520, 700, 560) },
  { id: 'cursor «Tú» del CTA', tipo: 'seleccion', box: caja(490, 440, 530, 490), destino: 'cta-boton' },
  { id: 'logo', tipo: 'firma', box: caja(400, 1700, 680, 1766) }
]

test('Una maquetación sana no tiene fallas', () => {
  assert.deepEqual(invariantesMaquetacion({ ancho: 1080, alto: 1920, elementos: base() }), [])
})

test('El botón bajo la firma es una falla (hallazgo 5)', () => {
  const e = base()

  e.find(x => x.id === 'logo').box = caja(80, 430, 360, 500)
  assert.ok(invariantesMaquetacion({ ancho: 1080, alto: 1920, elementos: e }).some(f => /«cta-boton» choca con «logo»/.test(f)))
})

test('Una caja degenerada es una falla y corta el resto del análisis', () => {
  const e = base()

  e[0].box = caja(80, 100, 80, 300)
  assert.deepEqual(invariantesMaquetacion({ ancho: 1080, alto: 1920, elementos: e }), ['«dominante» tiene una caja degenerada'])
})

test('Un cursor no tapa otra voz, pero sí puede tocar su destino', () => {
  const e = base()

  e.find(x => x.tipo === 'seleccion').box = caja(100, 510, 160, 570)
  assert.ok(invariantesMaquetacion({ ancho: 1080, alto: 1920, elementos: e }).some(f => /tapa «descriptor»/.test(f)))
  assert.deepEqual(invariantesMaquetacion({ ancho: 1080, alto: 1920, elementos: base() }), [])
})

test('La reserva editorial acota lo dibujado, no la firma', () => {
  const r = fueraDeReserva({ elementos: base(), reserva: { maxRight: 900, maxBottom: 520 } })

  assert.ok(r.some(f => /baja hasta y=560/.test(f)))
  assert.ok(!r.some(f => /1766/.test(f)))
})

test('Un cursor o una etiqueta no tapan el texto de su destino; el marco sí lo envuelve (tramo 12)', () => {
  const dominante = { id: 'dominante', tipo: 'texto', box: { left: 100, top: 100, right: 900, bottom: 220 } }
  const entrada = { id: 'entrada', tipo: 'texto', box: { left: 100, top: 40, right: 600, bottom: 80 } }
  const marco = { id: 'marco de la selección del titular', tipo: 'seleccion', destino: 'dominante', box: { left: 90, top: 90, right: 910, bottom: 230 } }
  const cursor = { id: 'cursor «yo»', tipo: 'seleccion', destino: 'dominante', box: { left: 95, top: 95, right: 140, bottom: 150 } }

  assert.deepEqual(invariantesMaquetacion({ ancho: 1000, alto: 1000, elementos: [dominante, entrada, marco] }), [], 'el marco envuelve a su destino')
  assert.ok(invariantesMaquetacion({ ancho: 1000, alto: 1000, elementos: [dominante, entrada, cursor] }).some(f => /cursor «yo» tapa «dominante»/.test(f)), 'el cursor no tapa las letras de su destino')
  assert.ok(invariantesMaquetacion({ ancho: 1000, alto: 1000, elementos: [dominante, { ...entrada, box: { left: 100, top: 40, right: 600, bottom: 95 } }, marco] }).some(f => /marco de la selección del titular tapa «entrada»/.test(f)), 'el marco no tapa otra voz')
})
